<template>
  <div
    class="message-display"
    :style="{ background: currentTemplate.gradient }"
  >
    <div class="page-title">Message</div>
    <div class="svg-container">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
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
        />

        <!-- Animated text following the path -->
        <text
          font-family="Arial, sans-serif"
          font-size="40"
          :fill="currentTemplate.primaryColor"
          font-weight="600"
          class="animated-text"
        >
          <textPath :href="`#textPath${templateId}`" startOffset="-30%">
            {{ currentMessage?.content || "Chargement du message..." }}
            <animate
              attributeName="startOffset"
              values="-30%;130%"
              :dur="`${animationDuration}s`"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.9;0.9;0"
              keyTimes="0;0.05;0.85;1"
              :dur="`${animationDuration}s`"
              repeatCount="indefinite"
            />
          </textPath>
        </text>

        <!-- Second animated text (following behind) -->
        <text
          v-if="nextMessage"
          font-family="Arial, sans-serif"
          font-size="40"
          :fill="currentTemplate.secondaryColor"
          font-weight="600"
          class="animated-text-2"
        >
          <textPath :href="`#textPath${templateId}`" startOffset="-30%">
            {{ nextMessage.content }}
            <animate
              attributeName="startOffset"
              values="-30%;130%"
              :dur="`${animationDuration}s`"
              :begin="`${animationDuration / 2}s`"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.7;0.7;0"
              keyTimes="0;0.05;0.85;1"
              :dur="`${animationDuration}s`"
              :begin="`${animationDuration / 2}s`"
              repeatCount="indefinite"
            />
          </textPath>
        </text>
      </svg>
    </div>

    <div class="message-info">
      <div v-if="currentMessage" class="author-info">
        <span class="author-name">{{ currentMessage.author }}</span>
        <span class="message-date">{{
          formatDate(currentMessage.createdAt)
        }}</span>
      </div>
      <div class="timer">Prochain message dans : {{ countdown }}s</div>
      <div class="animation-info">
        Animation: {{ animationDuration }}s par message
      </div>
    </div>

    <div class="navigation">
      <div class="template-switcher">
        <router-link
          v-for="template in templates"
          :key="template.id"
          :to="`/message/${template.id}`"
          class="template-btn"
          :class="{ active: templateId === template.id }"
        >
          {{ template.name }}
        </router-link>
      </div>
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
const socket = io(API_URL);

const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const countdown = ref(60);
const animationDuration = 10; // seconds for text to travel across path
let intervalId = null;
let countdownId = null;

// Set page title
document.title = "Zonta - Message";

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

// Update current message and setup next one
function updateMessage() {
  currentMessage.value = getRandomMessage();
  nextMessage.value = getRandomMessage();
  countdown.value = animationDuration;

  // Ensure next message is different from current
  let attempts = 0;
  while (
    nextMessage.value &&
    currentMessage.value &&
    nextMessage.value.id === currentMessage.value.id &&
    attempts < 10
  ) {
    nextMessage.value = getRandomMessage();
    attempts++;
  }
}

// Start continuous animation cycle
function startAnimationCycle() {
  // Clear existing intervals
  if (intervalId) clearInterval(intervalId);
  if (countdownId) clearInterval(countdownId);

  // Update messages every animation duration
  intervalId = setInterval(() => {
    // Swap messages - next becomes current
    currentMessage.value = nextMessage.value;
    nextMessage.value = getRandomMessage();

    // Ensure next message is different
    let attempts = 0;
    while (
      nextMessage.value &&
      currentMessage.value &&
      nextMessage.value.id === currentMessage.value.id &&
      attempts < 10
    ) {
      nextMessage.value = getRandomMessage();
      attempts++;
    }
  }, animationDuration * 1000);

  // Countdown for next message
  countdownId = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      countdown.value = animationDuration;
    }
  }, 1000);
}

// Format date
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
    // Restart animation cycle when template changes
    updateMessage();
    startAnimationCycle();
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
      nextMessage.value = getRandomMessage();
    }
  });

  // Start the animation cycle
  updateMessage();
  startAnimationCycle();
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  if (countdownId) clearInterval(countdownId);
  if (socket) socket.disconnect();
});
</script>

<style scoped>
.message-display {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
  transition: background 0.5s ease;
}

.svg-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  margin-bottom: 20px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}

.svg-container svg {
  max-width: 100%;
  max-height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.message-info {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.author-info {
  margin-bottom: 15px;
}

.author-name {
  font-size: 1.3em;
  font-weight: bold;
  color: #333;
  margin-right: 15px;
}

.message-date {
  color: #666;
  font-size: 1em;
}

.timer {
  font-size: 1.1em;
  color: #764ba2;
  font-weight: 600;
}

.animation-info {
  font-size: 0.9em;
  color: #999;
  font-style: italic;
  margin-top: 5px;
}

.animated-text {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.animated-text-2 {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.navigation {
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  text-decoration: none;
  padding: 15px 25px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
}

.nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background: white;
}

.template-switcher {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.template-btn {
  background: rgba(255, 255, 255, 0.7);
  color: #333;
  text-decoration: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.9);
}

.template-btn.active {
  background: white;
  color: #764ba2;
  box-shadow: 0 5px 20px rgba(118, 75, 162, 0.3);
  font-weight: 700;
}

@media (max-width: 768px) {
  .message-display {
    padding: 10px;
  }

  .svg-container {
    padding: 20px;
    min-height: 300px;
  }

  .navigation {
    flex-direction: column;
  }

  .nav-btn {
    min-width: unset;
    width: 100%;
  }

  .template-switcher {
    width: 100%;
    justify-content: center;
  }

  .svg-container svg text {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .svg-container svg text {
    font-size: 14px;
  }

  .template-btn {
    font-size: 0.8em;
    padding: 8px 12px;
  }
}

.page-title {
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  backdrop-filter: blur(10px);
}
</style>
