<template>
  <div class="message-display">
    <div class="canvas-container">
      <canvas ref="canvasEl"></canvas>
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

// Messages/state
const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const currentMessageColor = ref("#2563eb");
const animationSpeed = 120; // px/s constant speed

// Page title
document.title = "Zonta - Ecran";

// Templates
const templateId = computed(() => parseInt(route.params.id) || 1);
const currentTemplate = computed(() => getTemplateById(templateId.value));
const templates = messageTemplates;

const visibleMessages = computed(() =>
  messages.value.filter(
    (msg) => !msg.hidden && msg.content && msg.content.trim().length > 0
  )
);

function getRandomMessage() {
  const available = visibleMessages.value;
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

function pickNextDifferent() {
  let candidate = getRandomMessage();
  let attempts = 0;
  while (
    candidate &&
    currentMessage.value &&
    candidate.id === currentMessage.value.id &&
    attempts < 10
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
const DESIGN_W = 1280;
const DESIGN_H = 720;

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
const TARGET_FPS = 50;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let rafId = null;
let lastTs = 0;
let accumulator = 0;

// Font settings
const FONT_SIZE = 60; // px
const FONT_FAMILY = "Arial, sans-serif";
const FONT_WEIGHT = 600;
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

// Parse minimal SVG path with absolute M and Q only
function parseMQPath(d) {
  const tokens = d.match(/[MQ]|-?\d*\.?\d+/gi) || [];
  const segs = [];
  let i = 0;
  let cur = { x: 0, y: 0 };
  while (i < tokens.length) {
    const tok = tokens[i++];
    if (tok === "M" || tok === "m") {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cur = { x, y };
    } else if (tok === "Q" || tok === "q") {
      const cx = parseFloat(tokens[i++]);
      const cy = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      segs.push({ p0: { ...cur }, p1: { x: cx, y: cy }, p2: { x, y } });
      cur = { x, y };
    } else {
      // ignore unknown tokens
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
  view.dpr = window.devicePixelRatio || 1;

  // Resize backing store
  canvas.width = Math.floor(view.cssW * view.dpr);
  canvas.height = Math.floor(view.cssH * view.dpr);
  canvas.style.width = view.cssW + "px";
  canvas.style.height = view.cssH + "px";

  // Context
  ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(view.dpr, view.dpr); // draw in CSS pixels

  // Compute "meet" aspect ratio mapping from design (1280x720) to CSS viewport
  view.scale = Math.min(view.cssW / DESIGN_W, view.cssH / DESIGN_H);
  view.offsetX = (view.cssW - DESIGN_W * view.scale) / 2;
  view.offsetY = (view.cssH - DESIGN_H * view.scale) / 2;
}

function buildSamples() {
  samples = [];
  pathLength = 0;

  const segments = parseMQPath(currentTemplate.value.path);
  let lastPt = null;

  for (const seg of segments) {
    const p0 = seg.p0;
    const p1 = seg.p1;
    const p2 = seg.p2;

    // Estimate segment length in design space
    const L = approxQuadLen(p0, p1, p2);

    // Decide sample count for ~8px resolution in CSS pixels after scaling
    const targetStepCss = 8;
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
  }
}

function layoutText(str) {
  glyphs = [];
  textTotalWidth = 0;

  // Configure font in CSS pixel space
  ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const content = str && str.length ? str : "Chargement du message...";
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const w = ctx.measureText(ch).width;
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
  ctx.strokeStyle = "#333";
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

  // Optional: draw path line
  drawPathLine();

  // Draw text glyphs along path
  ctx.save();
  ctx.fillStyle = currentMessageColor.value;
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

  rafId = setTimeout(() => animationLoop(performance.now()), FRAME_INTERVAL);
}

function startAnimation() {
  stopAnimation();
  lastTs = 0;
  accumulator = 0;
  rafId = setTimeout(() => animationLoop(performance.now()), FRAME_INTERVAL);
}
function stopAnimation() {
  if (rafId) {
    clearTimeout(rafId);
    rafId = null;
  }
  lastTs = 0;
  accumulator = 0;
}

// Setup everything for current template/message
function prepareScene() {
  if (!canvasEl.value) return;
  computeViewport();
  buildSamples();
  layoutText(currentMessage.value?.content || "");
  offsetS = pathLength + 50; // start off right side
}

// Messages lifecycle
async function loadMessages() {
  try {
    const response = await axios.get(`${API_URL}/messages`);
    messages.value = response.data;
    updateMessage();
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

function updateMessage() {
  currentMessage.value = getRandomMessage();
  nextMessage.value = pickNextDifferent();
  currentMessageColor.value = getRandomColor();
  // prepare canvas for new message and template
  prepareScene();
}

// Watch for template change
watch(
  () => route.params.id,
  () => {
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
  await loadMessages();

  // Set up socket listeners
  socket.on("new-message", (msg) => {
    messages.value.push(msg);
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

  // Prepare and start
  prepareScene();
  startAnimation();
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
  background: white;
  display: flex;
  flex-direction: column;
  transition: background 0.5s ease;
  padding: 0;
  margin: 0;
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
