<template>
  <div
    class="message-display"
    :style="{ backgroundColor: currentMessageColor }"
  >
    <!-- Simple mode: just centered text -->
    <div v-if="SIMPLE_MODE" class="simple-container">
      <div class="simple-text">
        {{ currentMessage?.content || "Chargement du message..." }}
      </div>
    </div>

    <!-- Normal mode: canvas animation -->
    <div v-else class="canvas-container">
      <canvas ref="canvasEl"></canvas>
    </div>

    <!-- Hidden element to force font loading -->
    <div
      style="
        font-family: 'Noto Emoji', 'Apple Color Emoji', 'Segoe UI Emoji',
          'Noto Color Emoji', 'Noto Sans';
        position: absolute;
        top: -9999px;
        left: -9999px;
        opacity: 0;
        pointer-events: none;
      "
    >
      😀 test
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { io } from "socket.io-client";
import axios from "axios";
import {
  messageTemplates,
  getTemplateById,
  getRandomColor,
} from "../config/messageTemplates";

const route = useRoute();
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const socket = io(API_URL, { transports: ["websocket"] });

// DEBUG MODE: Set to true for simple display without path animation (Raspberry Pi)
const SIMPLE_MODE = false;

// Messages/state
const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const currentMessageColor = ref("#fdbc2e");
const currentTextColor = ref("#fff");
const animationSpeed = 90; // px/s constant speed (reduced for Pi)
const isLoading = ref(true);

// Page title
document.title = "Zonta - Ecran";

// Templates
const templateId = computed(() => parseInt(route.params.id) || 1);
const currentTemplate = computed(() => getTemplateById(templateId.value));
const templates = messageTemplates;

// Urgent queue for new messages
const urgentQueue = ref([]);

const visibleMessages = computed(() =>
  messages.value.filter(
    (msg) =>
      !msg.hidden &&
      msg.content &&
      msg.content.trim().length > 0 &&
      msg.priorityNumber === templateId.value
  )
);

function getRandomMessage() {
  const available = visibleMessages.value;
  if (available.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

function pickNextDifferent() {
  // 1. Check urgent queue first
  if (urgentQueue.value.length > 0) {
    return urgentQueue.value.shift();
  }

  let candidate = getRandomMessage();
  let attempts = 0;
  while (
    candidate &&
    currentMessage.value &&
    candidate.id === currentMessage.value.id &&
    attempts < 10 &&
    visibleMessages.value.length > 1
  ) {
    candidate = getRandomMessage();
    attempts++;
  }
  return candidate;
}

// Canvas + rendering
const canvasEl = ref(null);
let ctx = null;

// Design space (paths are authored in this space)
// These will be updated from the current template
let DESIGN_W = 1280;
let DESIGN_H = 720;

// Viewport mapping
let view = {
  cssW: 0,
  cssH: 0,
  dpr: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

// Path samples in screen (CSS) pixels
let samples = []; // [{ s, x, y, angle }]
let pathLength = 0;

// Text layout
let glyphs = []; // [{ ch, w, offs }]
let textTotalWidth = 0;

// Animation
let offsetS = 0; // first glyph offset along path (CSS px)
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let rafId = null;
let lastTs = 0;
let accumulator = 0;

// Font settings
const FONT_SIZE = 110; // px (reduced for Pi performance)
const FONT_FAMILY =
  "'Noto Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Noto Sans', sans-serif";
const FONT_WEIGHT = 400;
const LETTER_SPACING = 2; // px additional spacing per glyph
const ROTATE_GLYPHS = true; // set false to not rotate characters (faster)

// Utils: quadratic Bezier
function qPoint(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}
function qDeriv(p0, p1, p2, t) {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

// Utils: cubic Bezier
function cPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}
function cDeriv(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x:
      3 * mt2 * (p1.x - p0.x) +
      6 * mt * t * (p2.x - p1.x) +
      3 * t2 * (p3.x - p2.x),
    y:
      3 * mt2 * (p1.y - p0.y) +
      6 * mt * t * (p2.y - p1.y) +
      3 * t2 * (p3.y - p2.y),
  };
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
function approxQuadLen(p0, p1, p2) {
  // simple 10-subdivision approximation
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    const pt = qPoint(p0, p1, p2, t);
    len += dist(prev, pt);
    prev = pt;
  }
  return len;
}
function approxCubicLen(p0, p1, p2, p3) {
  // simple 20-subdivision approximation for cubic curves
  let len = 0;
  let prev = p0;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const pt = cPoint(p0, p1, p2, p3, t);
    len += dist(prev, pt);
    prev = pt;
  }
  return len;
}

// Parse SVG path with absolute M, Q, and C commands
function parsePath(d) {
  // Match commands and numbers
  const tokens =
    d.match(/[MmQqCcLlHhVvSs]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/gi) || [];
  const segs = [];
  let i = 0;
  let cur = { x: 0, y: 0 };
  let lastCommand = null;

  while (i < tokens.length) {
    let tok = tokens[i];

    // Check if current token is a command or a number
    const isCommand = /[MmQqCcLlHhVvSs]/.test(tok);

    if (!isCommand && lastCommand) {
      // Implicit command repetition - use last command
      tok = lastCommand;
    } else if (isCommand) {
      // Consume the command token
      i++;
      lastCommand = tok;
    } else {
      // No command and no last command, skip
      i++;
      continue;
    }

    if (tok === "M" || tok === "m") {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cur = tok === "M" ? { x, y } : { x: cur.x + x, y: cur.y + y };
      // After M/m, implicit coordinates are treated as L/l
      lastCommand = tok === "M" ? "L" : "l";
    } else if (tok === "L" || tok === "l") {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const next = tok === "L" ? { x, y } : { x: cur.x + x, y: cur.y + y };
      // Convert line to cubic bezier (straight line)
      segs.push({
        type: "C",
        p0: { ...cur },
        p1: {
          x: cur.x + (next.x - cur.x) / 3,
          y: cur.y + (next.y - cur.y) / 3,
        },
        p2: {
          x: cur.x + (2 * (next.x - cur.x)) / 3,
          y: cur.y + (2 * (next.y - cur.y)) / 3,
        },
        p3: next,
      });
      cur = next;
    } else if (tok === "Q" || tok === "q") {
      const cx = parseFloat(tokens[i++]);
      const cy = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const ctrl =
        tok === "Q" ? { x: cx, y: cy } : { x: cur.x + cx, y: cur.y + cy };
      const next = tok === "Q" ? { x, y } : { x: cur.x + x, y: cur.y + y };
      segs.push({ type: "Q", p0: { ...cur }, p1: ctrl, p2: next });
      cur = next;
    } else if (tok === "C" || tok === "c") {
      const cx1 = parseFloat(tokens[i++]);
      const cy1 = parseFloat(tokens[i++]);
      const cx2 = parseFloat(tokens[i++]);
      const cy2 = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      const ctrl1 =
        tok === "C" ? { x: cx1, y: cy1 } : { x: cur.x + cx1, y: cur.y + cy1 };
      const ctrl2 =
        tok === "C" ? { x: cx2, y: cy2 } : { x: cur.x + cx2, y: cur.y + cy2 };
      const next = tok === "C" ? { x, y } : { x: cur.x + x, y: cur.y + y };
      segs.push({ type: "C", p0: { ...cur }, p1: ctrl1, p2: ctrl2, p3: next });
      cur = next;
    } else {
      // Unknown command, skip it
      i++;
    }
  }
  return segs;
}

function computeViewport() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const rect = canvas.parentElement.getBoundingClientRect();
  view.cssW = Math.max(1, Math.floor(rect.width));
  view.cssH = Math.max(1, Math.floor(rect.height));
  // Cap DPR at 1 on low-powered devices for better performance
  view.dpr = Math.min(window.devicePixelRatio || 1, 1);

  // Resize backing store
  canvas.width = Math.floor(view.cssW * view.dpr);
  canvas.height = Math.floor(view.cssH * view.dpr);
  canvas.style.width = view.cssW + "px";
  canvas.style.height = view.cssH + "px";

  // Context
  ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  ctx.imageSmoothingEnabled = false; // Faster rendering on Pi
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(view.dpr, view.dpr); // draw in CSS pixels

  // Compute "meet" aspect ratio mapping from design (1280x720) to CSS viewport
  view.scale = Math.min(view.cssW / DESIGN_W, view.cssH / DESIGN_H);
  view.offsetX = (view.cssW - DESIGN_W * view.scale) / 2;
  view.offsetY = (view.cssH - DESIGN_H * view.scale) / 2;
}

function buildSamples() {
  // Update design dimensions from current template
  DESIGN_W = currentTemplate.value.width || 1280;
  DESIGN_H = currentTemplate.value.height || 720;

  samples = [];
  pathLength = 0;

  const segments = parsePath(currentTemplate.value.path);
  let lastPt = null;

  for (const seg of segments) {
    if (seg.type === "Q") {
      // Quadratic Bezier
      const p0 = seg.p0;
      const p1 = seg.p1;
      const p2 = seg.p2;

      // Estimate segment length in design space
      const L = approxQuadLen(p0, p1, p2);

      // Decide sample count for ~16px resolution in CSS pixels after scaling
      const targetStepCss = 16;
      const targetStepDesign = targetStepCss / Math.max(view.scale, 1e-6);
      const steps = Math.max(8, Math.ceil(L / targetStepDesign));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = qPoint(p0, p1, p2, t);
        const dpt = qDeriv(p0, p1, p2, t);

        // Map to CSS pixel space
        const x = view.offsetX + pt.x * view.scale;
        const y = view.offsetY + pt.y * view.scale;
        const angle = Math.atan2(dpt.y, dpt.x);

        if (lastPt) {
          pathLength += Math.hypot(x - lastPt.x, y - lastPt.y);
        }
        samples.push({ s: pathLength, x, y, angle });
        lastPt = { x, y };
      }
    } else if (seg.type === "C") {
      // Cubic Bezier
      const p0 = seg.p0;
      const p1 = seg.p1;
      const p2 = seg.p2;
      const p3 = seg.p3;

      // Estimate segment length in design space
      const L = approxCubicLen(p0, p1, p2, p3);

      // Decide sample count for ~16px resolution in CSS pixels after scaling
      const targetStepCss = 16;
      const targetStepDesign = targetStepCss / Math.max(view.scale, 1e-6);
      const steps = Math.max(8, Math.ceil(L / targetStepDesign));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = cPoint(p0, p1, p2, p3, t);
        const dpt = cDeriv(p0, p1, p2, p3, t);

        // Map to CSS pixel space
        const x = view.offsetX + pt.x * view.scale;
        const y = view.offsetY + pt.y * view.scale;
        const angle = Math.atan2(dpt.y, dpt.x);

        if (lastPt) {
          pathLength += Math.hypot(x - lastPt.x, y - lastPt.y);
        }
        samples.push({ s: pathLength, x, y, angle });
        lastPt = { x, y };
      }
    }
  }
}

function layoutText(str) {
  glyphs = [];
  textTotalWidth = 0;

  // Configure font in CSS pixel space
  ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let content = str;
  if (!content || content.length === 0) {
    if (isLoading.value) {
      content = "Chargement...";
    } else if (visibleMessages.value.length === 0) {
      content = "Aucun message pour le moment";
    } else {
      content = "Chargement du message...";
    }
  }

  // Use Array.from to correctly handle surrogate pairs (emojis)
  const chars = Array.from(content);
  for (const ch of chars) {
    let w = ctx.measureText(ch).width;
    // Reduce space width to make words closer
    if (ch === " ") {
      w *= 0.6;
    }
    glyphs.push({ ch, w });
  }

  // Precompute cumulative offset for each glyph (center)
  let pos = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const half = glyphs[i].w / 2;
    const center = pos + half;
    glyphs[i].offs = center;
    pos += glyphs[i].w + LETTER_SPACING;
  }
  textTotalWidth = pos - LETTER_SPACING; // last char doesn't add spacing
}

function drawPathLine() {
  if (samples.length < 2) return;
  ctx.save();
  // 50% opacity line
  ctx.strokeStyle = "rgba(51, 51, 51, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) {
    ctx.lineTo(samples[i].x, samples[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

// Find interpolated point given arc-length s (binary search)
function sampleAtS(s) {
  if (samples.length === 0) return null;
  if (s <= 0) return samples[0];
  if (s >= pathLength) return samples[samples.length - 1];

  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s < s) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const t = (s - a.s) / Math.max(b.s - a.s, 1e-6);
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  // Angle: simple lerp is fine for small steps
  let angle = a.angle + (b.angle - a.angle) * t;
  return { x, y, angle };
}

function clearCanvas() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  // Clear using identity transform to cover the full backing store
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function renderFrame(dtMs) {
  clearCanvas();

  // Optional: draw path line (disabled for performance)
  // drawPathLine();

  // Draw text glyphs along path
  ctx.save();
  // Text color is dynamic; background color is bound to currentMessageColor with CSS transition
  ctx.fillStyle = currentTextColor.value;
  ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Early out if nothing to draw
  if (glyphs.length === 0 || samples.length === 0) {
    ctx.restore();
    return;
  }

  // Move offset
  const pixelsToMove = (animationSpeed * dtMs) / 1000;
  offsetS -= pixelsToMove;

  // Render glyphs
  for (let i = 0; i < glyphs.length; i++) {
    const posS = offsetS + glyphs[i].offs;
    if (posS < 0 || posS > pathLength) continue;
    const pt = sampleAtS(posS);
    if (!pt) continue;

    ctx.save();
    if (ROTATE_GLYPHS) {
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);
      ctx.fillText(glyphs[i].ch, 0, 0);
    } else {
      ctx.fillText(glyphs[i].ch, pt.x, pt.y);
    }
    ctx.restore();
  }

  ctx.restore();

  // If fully out to the left, switch to next
  if (offsetS + textTotalWidth <= 0) {
    // brief pause
    setTimeout(() => {
      currentMessage.value = nextMessage.value;
      nextMessage.value = pickNextDifferent();
      currentMessageColor.value = getRandomColor();
      currentTextColor.value = "#fff";
      // relayout for new message
      layoutText(currentMessage.value?.content || "");
      // restart from right outside
      offsetS = pathLength + 50;
    }, 50);
  }
}

function animationLoop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = ts - lastTs;
  lastTs = ts;

  accumulator += dt;
  if (accumulator >= FRAME_INTERVAL) {
    const steps = Math.floor(accumulator / FRAME_INTERVAL);
    const stepTime = steps * FRAME_INTERVAL;
    renderFrame(stepTime);
    accumulator -= steps * FRAME_INTERVAL;
  }

  rafId = requestAnimationFrame(animationLoop);
}

function startAnimation() {
  stopAnimation();
  lastTs = 0;
  accumulator = 0;
  rafId = requestAnimationFrame(animationLoop);
}
function stopAnimation() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTs = 0;
  accumulator = 0;
}

// Setup everything for current template/message
function prepareScene() {
  if (SIMPLE_MODE) return; // Skip canvas setup in simple mode
  if (!canvasEl.value) return;
  computeViewport();
  buildSamples();
  layoutText(currentMessage.value?.content || "");
  offsetS = pathLength + 50; // start off right side
}

// Messages lifecycle
async function loadMessages() {
  // Special view for ID 6: Emoji test
  if (templateId.value === 6) {
    messages.value = [
      {
        id: 999999,
        content: "😀 😃 😄 😁 😆 😅 😂 🤣 🎄 🎅 🤶 🦌 🎁 🔔 ❄️ ⛄",
        author: "System",
        priorityNumber: 6,
        hidden: false,
        createdAt: new Date().toISOString(),
      },
    ];
    // Force update immediately
    currentMessage.value = messages.value[0];
    nextMessage.value = messages.value[0];
    isLoading.value = false;
    prepareScene();
    return;
  }

  isLoading.value = true;
  try {
    const response = await axios.get(`${API_URL}/messages`);
    messages.value = response.data;
    updateMessage();
  } catch (error) {
    console.error("Error loading messages:", error);
  } finally {
    isLoading.value = false;
    if (!currentMessage.value) prepareScene();
  }
}

function updateMessage() {
  currentMessage.value = getRandomMessage();
  nextMessage.value = pickNextDifferent();
  if (currentMessage.value) {
    currentMessageColor.value = getRandomColor();
    currentTextColor.value = "#fff";
  } else {
    // No message available
    currentMessageColor.value = "#fdbc2e";
    currentTextColor.value = "#fff";
  }
  // prepare canvas for new message and template
  prepareScene();
}

// Watch for template change
watch(
  () => route.params.id,
  async () => {
    await loadMessages();
    prepareScene();
    startAnimation();
  }
);

// Handle resize
function onResize() {
  prepareScene();
}
window.addEventListener("resize", onResize);

onMounted(async () => {
  // Wait for fonts to load to ensure emojis render correctly on canvas
  try {
    // Load fonts with the specific weight/size we use
    const fontSpec = `${FONT_WEIGHT} ${FONT_SIZE}px`;
    // Force load both fonts
    await Promise.all([
      document.fonts.load(`${fontSpec} 'Noto Color Emoji'`),
      document.fonts.load(`${fontSpec} 'Noto Emoji'`),
      document.fonts.load(`${fontSpec} 'Noto Sans'`),
    ]);
    // Wait for everything to be ready
    await document.fonts.ready;

    console.log("Fonts loaded status:");
    console.log(
      "Noto Color Emoji:",
      document.fonts.check(`${fontSpec} 'Noto Color Emoji'`)
    );
    console.log(
      "Noto Emoji:",
      document.fonts.check(`${fontSpec} 'Noto Emoji'`)
    );

    // Extra safety delay for Canvas font availability
    await new Promise((resolve) => setTimeout(resolve, 100));
  } catch (e) {
    console.warn("Font loading issue:", e);
  }

  await loadMessages();

  // Set up socket listeners
  socket.on("new-message", (msg) => {
    messages.value.push(msg);
    if (msg.priorityNumber === templateId.value) {
      urgentQueue.value.push(msg);
    }
  });

  socket.on("message-updated", (updatedMsg) => {
    const index = messages.value.findIndex((m) => m.id === updatedMsg.id);
    if (index !== -1) {
      messages.value[index] = updatedMsg;
    }
  });

  socket.on("message-deleted", (messageId) => {
    messages.value = messages.value.filter((m) => m.id !== messageId);
    if (currentMessage.value && currentMessage.value.id === messageId) {
      updateMessage();
    }
    if (nextMessage.value && nextMessage.value.id === messageId) {
      nextMessage.value = pickNextDifferent();
    }
  });

  // Simple mode: rotate messages every 5 seconds
  if (SIMPLE_MODE) {
    setInterval(() => {
      currentMessage.value = nextMessage.value;
      nextMessage.value = pickNextDifferent();
      currentMessageColor.value = getRandomColor();
      currentTextColor.value = "#fff";
    }, 5000);
  } else {
    // Normal mode: prepare canvas and start animation
    prepareScene();
    startAnimation();
  }
});

onUnmounted(() => {
  stopAnimation();
  if (socket) socket.disconnect();
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.message-display {
  min-height: 100vh;
  /* background color is now bound dynamically; keep a smooth transition */
  transition: background-color 400ms ease;
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
  touch-action: none;
}

.simple-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  padding: 2rem;
}

.simple-text {
  color: white;
  font-size: 3rem;
  font-weight: 600;
  text-align: center;
  max-width: 90%;
  line-height: 1.3;
  transition: opacity 400ms ease;
}

.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  will-change: transform;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  pointer-events: none;
}
</style>
