<template>
  <div class="message-display">
    <div class="svg-container">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        pointer-events="none"
      >
        <defs>
          <path :id="`textPath${templateId}`" :d="currentTemplate.path" />
        </defs>

        <!-- The path line (visible) -->
        <path
          :d="currentTemplate.path"
          stroke="#333"
          stroke-width="2"
          fill="none"
          shape-rendering="optimizeSpeed"
          pointer-events="none"
        />

        <!-- JS-driven animated text (uses startOffset via rAF, no Vue reactivity per frame) -->
        <text
          font-family="Arial, sans-serif"
          font-size="60"
          :fill="currentMessageColor"
          font-weight="600"
          class="animated-text"
          text-rendering="optimizeSpeed"
          pointer-events="none"
        >
          <!-- remove reactive :startOffset, use a ref and setAttribute in rAF -->
          <textPath :href="`#textPath${templateId}`" ref="textPathEl">
            {{ currentMessage?.content || "Chargement du message..." }}
          </textPath>
        </text>
      </svg>
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
// Force websocket-only to reduce polling overhead on kiosk Chromium
const socket = io(API_URL, { transports: ["websocket"] });

const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const currentMessageColor = ref("#2563eb"); // Default color
const animationSpeed = 120; // px per second (was 180, now slower)

// Set page title
document.title = "Zonta - Ecran";

// rAF-driven startOffset animation (percent along the path), DOM-driven to avoid Vue reactivity per frame
const START_OFFSET_START = 100; // off-screen right
const START_OFFSET_END = 0; // off-screen left
const textPathEl = ref(null);
let startOffsetValue = START_OFFSET_START;
let rafId = null;
let lastTimestamp = 0;

// Throttle rAF to reduce CPU load on Raspberry Pi (lower FPS for smoother pacing)
const TARGET_FPS = 50;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let accumulator = 0;

// Get template ID from route params
const templateId = computed(() => {
  return parseInt(route.params.id) || 1;
});

// Get current template configuration
const currentTemplate = computed(() => {
  return getTemplateById(templateId.value);
});

// All available templates for switcher
const templates = messageTemplates;

// Get visible messages only
const visibleMessages = computed(() => {
  return messages.value.filter(
    (msg) => !msg.hidden && msg.content && msg.content.trim().length > 0
  );
});

// Get random message
function getRandomMessage() {
  const available = visibleMessages.value;
  if (available.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

// Ensure next != current (best-effort)
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

let textLengthPx = 0; // store measured text length

// Calculate percent-per-pixel for the path, independent of text length
function computeAnimationDuration() {
  if (!textPathEl.value) return;
  const svg = textPathEl.value.ownerSVGElement;
  const pathEl = svg.querySelector(`#textPath${templateId.value}`);
  const pathLength = pathEl ? pathEl.getTotalLength() : 1280;

  // The percent range the animation covers
  const percentRange = START_OFFSET_START - START_OFFSET_END; // 160%
  // Only use pathLength for pixel range to keep speed constant
  textLengthPx = textPathEl.value.getComputedTextLength();
  const pixelRange = pathLength;
  // How many percent per pixel
  const percentPerPixel = percentRange / pixelRange;
  // Store for use in animationLoop
  computeAnimationDuration.percentPerPixel = percentPerPixel;
  // For threshold, still use textLengthPx to know when text is fully out
  computeAnimationDuration.textLengthPercent = textLengthPx * percentPerPixel;
}

// Initialize messages
function updateMessage() {
  currentMessage.value = getRandomMessage();
  nextMessage.value = pickNextDifferent();
  currentMessageColor.value = getRandomColor(); // Assign random color
  startOffsetValue = START_OFFSET_START;
  if (textPathEl.value) {
    textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
    // Wait for next tick to ensure DOM is updated before measuring
    setTimeout(() => {
      computeAnimationDuration();
    }, 0);
  }
}

// Optionally, use setTimeout instead of rAF for more predictable pacing
function animationLoop(ts) {
  if (!lastTimestamp) lastTimestamp = ts;
  const dt = ts - lastTimestamp;
  lastTimestamp = ts;

  accumulator += dt;
  if (accumulator >= FRAME_INTERVAL) {
    // Use percentPerPixel to move the text at a constant pixel speed
    const steps = Math.floor(accumulator / FRAME_INTERVAL);
    const stepTime = steps * FRAME_INTERVAL;
    // Pixels to move in this frame (always constant speed)
    const pixelsToMove = (animationSpeed * stepTime) / 1000;
    // Convert to percent
    const percentToMove =
      pixelsToMove * (computeAnimationDuration.percentPerPixel || 1);
    startOffsetValue -= percentToMove;

    // Only switch when the entire text is out of view (left edge)
    const textFullyOutThreshold =
      START_OFFSET_END - (computeAnimationDuration.textLengthPercent || 0);

    if (startOffsetValue <= textFullyOutThreshold) {
      // Add a minimal pause before switching to the next message
      setTimeout(() => {
        currentMessage.value = nextMessage.value;
        nextMessage.value = pickNextDifferent();
        currentMessageColor.value = getRandomColor(); // Assign new random color
        startOffsetValue = START_OFFSET_START;
        if (textPathEl.value) {
          textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
          setTimeout(() => {
            computeAnimationDuration();
          }, 0);
        }
      }, 50); // minimal pause between messages
      // Do not return, let the animation loop continue
    }

    if (textPathEl.value) {
      textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
    }

    accumulator -= steps * FRAME_INTERVAL;
  }

  rafId = setTimeout(() => animationLoop(performance.now()), FRAME_INTERVAL);
}

function startAnimation() {
  stopAnimation();
  lastTimestamp = 0;
  accumulator = 0;
  // Ensure attribute is initialized even if rAF is delayed
  if (textPathEl.value) {
    textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
  }
  rafId = setTimeout(() => animationLoop(performance.now()), FRAME_INTERVAL);
}

function stopAnimation() {
  if (rafId) {
    clearTimeout(rafId);
    rafId = null;
  }
  lastTimestamp = 0;
  accumulator = 0;
}

// Format date (kept for potential future use)
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Load messages
async function loadMessages() {
  try {
    const response = await axios.get(`${API_URL}/messages`);
    messages.value = response.data;
    updateMessage();
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

// Watch for route changes to restart animation
watch(
  () => route.params.id,
  () => {
    updateMessage();
    startAnimation();
  }
);

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
    // If current message was deleted, get a new one
    if (currentMessage.value && currentMessage.value.id === messageId) {
      updateMessage();
    }
    if (nextMessage.value && nextMessage.value.id === messageId) {
      nextMessage.value = pickNextDifferent();
    }
  });

  // Start the animation loop
  startAnimation();
  // Compute initial duration after DOM is ready
  setTimeout(() => {
    computeAnimationDuration();
  }, 0);
});

onUnmounted(() => {
  stopAnimation();
  if (socket) socket.disconnect();
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

.svg-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  /* Hint to browser for hardware acceleration */
  will-change: transform;
}

.svg-container svg {
  max-width: 100%;
  max-height: 100%;
  /* removed drop-shadow filter for performance on low-powered devices */
  /* filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)); */
  pointer-events: none;
}

.animated-text {
  /* removed text drop-shadow for performance */
  /* filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)); */
  text-rendering: optimizeSpeed;
  /* Hint for hardware acceleration */
  will-change: transform;
}
</style>
