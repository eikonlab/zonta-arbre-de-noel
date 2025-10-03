<template>
  <div class="message-display">
    <div class="svg-container">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1280 720"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path
            id="textPath2"
            d="M0 375.7C327.988 348.675 317.005 196.036 620.031 214.553C923.058 233.07 1026.4 622.425 1280 615.919"
          />
        </defs>

        <!-- The path line (visible) -->
        <path
          d="M0 375.7C327.988 348.675 317.005 196.036 620.031 214.553C923.058 233.07 1026.4 622.425 1280 615.919"
          stroke="#333"
          stroke-width="2"
          fill="none"
        />

        <!-- Animated text following the path -->
        <text
          font-family="Arial, sans-serif"
          font-size="24"
          fill="#764ba2"
          font-weight="600"
          opacity="0.9"
          class="animated-text"
        >
          <textPath href="#textPath2" startOffset="0%">
            {{ currentMessage?.content || "Chargement du message..." }}
            <animate
              attributeName="startOffset"
              values="-30%;130%"
              :dur="`${animationDuration}s`"
              repeatCount="indefinite"
            />
          </textPath>
        </text>

        <!-- Second animated text (following behind) -->
        <text
          v-if="nextMessage"
          font-family="Arial, sans-serif"
          font-size="24"
          fill="#667eea"
          font-weight="600"
          opacity="0.7"
          class="animated-text-2"
        >
          <textPath href="#textPath2" startOffset="0%">
            {{ nextMessage.content }}
            <animate
              attributeName="startOffset"
              values="-30%;130%"
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
      <router-link to="/message/1" class="nav-btn"> ← Template 1 </router-link>
      <router-link to="/" class="nav-btn nav-btn-alt">
        Retour au mur →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "http://localhost:3001";
const socket = io(API_URL);

const messages = ref([]);
const currentMessage = ref(null);
const nextMessage = ref(null);
const countdown = ref(60);
const textOffset = ref(-20);
const textOffset2 = ref(-20);
const animationDuration = 10; // seconds for text to travel across path
let intervalId = null;
let countdownId = null;
let animationId = null;

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
  if (animationId) clearInterval(animationId);
  if (socket) socket.disconnect();
});
</script>

<style scoped>
.message-display {
  min-height: 100vh;
  background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  display: flex;
  flex-direction: column;
  padding: 20px;
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
  color: #667eea;
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
  justify-content: space-between;
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

.nav-btn-alt {
  background: linear-gradient(135deg, #764ba2, #667eea);
  color: white;
}

.nav-btn-alt:hover {
  background: linear-gradient(135deg, #6b46c1, #5a67d8);
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
  }

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
