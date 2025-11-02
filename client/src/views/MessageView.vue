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
          font-size="40"
          :fill="currentTemplate.primaryColor"
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
import { messageTemplates, getTemplateById } from "../config/messageTemplates";

const route = useRoute();
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
// Force websocket-only to reduce polling overhead on kiosk Chromium
const socket = io(API_URL, { transports: ["websocket"] });

const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const animationDuration = 10; // seconds for text to travel across path

// rAF-driven startOffset animation (percent along the path), DOM-driven to avoid Vue reactivity per frame
const START_OFFSET_START = 130; // off-screen right
const START_OFFSET_END = -30; // off-screen left
const textPathEl = ref(null);
let startOffsetValue = START_OFFSET_START;
let rafId = null;
let lastTimestamp = 0;

// Throttle rAF to reduce CPU load on Raspberry Pi (30fps by default)
const TARGET_FPS = 25;
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

// Initialize messages
function updateMessage() {
  currentMessage.value = getRandomMessage();
  nextMessage.value = pickNextDifferent();
  // reset scroll position when message changes
  startOffsetValue = START_OFFSET_START;
  if (textPathEl.value) {
    textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
  }
}

// rAF animation loop: scrolls text and advances messages at loop boundary (throttled)
function animationLoop(ts) {
  if (!lastTimestamp) lastTimestamp = ts;
  const dt = ts - lastTimestamp;
  lastTimestamp = ts;

  accumulator += dt;
  if (accumulator >= FRAME_INTERVAL) {
    // move from 130% to -30% in 'animationDuration' seconds (total travel = 160%)
    const totalTravel = START_OFFSET_START - START_OFFSET_END; // 160
    const steps = Math.floor(accumulator / FRAME_INTERVAL);
    const stepTime = steps * FRAME_INTERVAL;
    const speedPerMs = totalTravel / (animationDuration * 1000);
    startOffsetValue -= speedPerMs * stepTime;

    if (startOffsetValue <= START_OFFSET_END) {
      // advance messages when one pass completes
      currentMessage.value = nextMessage.value;
      nextMessage.value = pickNextDifferent();
      startOffsetValue = START_OFFSET_START;
    }

    // Imperatively update the attribute (no Vue re-render)
    if (textPathEl.value) {
      textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
    }

    accumulator -= steps * FRAME_INTERVAL;
  }

  rafId = requestAnimationFrame(animationLoop);
}

function startAnimation() {
  stopAnimation();
  lastTimestamp = 0;
  accumulator = 0;
  // Ensure attribute is initialized even if rAF is delayed
  if (textPathEl.value) {
    textPathEl.value.setAttribute("startOffset", `${startOffsetValue}%`);
  }
  rafId = requestAnimationFrame(animationLoop);
}

function stopAnimation() {
  if (rafId) {
    cancelAnimationFrame(rafId);
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
  /* Hint to the browser to isolate layout/paint of this subtree */
  contain: strict;
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
}

@media (max-width: 768px) {
  .svg-container svg text {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .svg-container svg text {
    font-size: 14px;
  }
}
</style>
