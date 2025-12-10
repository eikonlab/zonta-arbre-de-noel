<template>
  <div class="wrapped-container" :class="{ transitioning: isTransitioning }">
    <!-- Slide 1: Welcome -->
    <div v-if="currentSlide === 0" class="slide slide-welcome">
      <div class="slide-content">
        <h1 class="wrapped-title">Zonta 2024</h1>
        <h2 class="wrapped-subtitle">L'Année en Messages</h2>
        <p class="wrapped-text">Découvrez l'impact de vos messages d'amour</p>
        <button @click="nextSlide" class="btn-next">Commencer</button>
      </div>
    </div>

    <!-- Slide 2: Total Messages -->
    <div v-if="currentSlide === 1" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-number animate-count">{{ animatedTotalMessages }}</div>
        <div class="stat-label">Messages partagés</div>
        <p class="stat-description">
          Tant de messages d'amour et de soutien partagés cette année
        </p>
      </div>
    </div>

    <!-- Slide 3: Authors Count -->
    <div v-if="currentSlide === 2" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-number animate-count">{{ animatedAuthorsCount }}</div>
        <div class="stat-label">Personnes ont contribué</div>
        <p class="stat-description">Une communauté incroyable</p>
      </div>
    </div>

    <!-- Slide 4: Average Message Length -->
    <div v-if="currentSlide === 3" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-number animate-count">{{ animatedAvgLength }}</div>
        <div class="stat-label">Caractères par message (en moyenne)</div>
        <p class="stat-description">Des messages qui viennent du cœur</p>
      </div>
    </div>

    <!-- Slide 5: Most Active Day -->
    <div v-if="currentSlide === 4" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-icon">📅</div>
        <div class="stat-date">{{ mostActiveDay }}</div>
        <div class="stat-label">Le jour le plus actif</div>
        <p class="stat-description">
          {{ mostActiveDayCount }} messages partagés ce jour-là
        </p>
      </div>
    </div>

    <!-- Slide 6-8: Random Messages -->
    <div
      v-if="currentSlide >= 5 && currentSlide <= 7"
      class="slide slide-message"
    >
      <div class="slide-content">
        <div class="message-showcase">
          <div class="message-quote">"</div>
          <div class="message-text">{{ currentRandomMessage?.content }}</div>
          <div class="message-author">— {{ currentRandomMessage?.author }}</div>
          <div class="message-date">
            {{ formatDate(currentRandomMessage?.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 9: Emoji Stats -->
    <div v-if="currentSlide === 8" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-label">Les emojis les plus utilisés</div>
        <div class="emoji-grid">
          <div
            v-for="(emoji, index) in topEmojis"
            :key="index"
            class="emoji-item"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="emoji-icon">{{ emoji.emoji }}</div>
            <div class="emoji-count">{{ emoji.count }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 10: Final - All Messages Table -->
    <div v-if="currentSlide === 9" class="slide slide-final">
      <div class="slide-content slide-content-table">
        <h2 class="final-title">Tous les Messages 💛</h2>
        <p class="final-subtitle">
          Merci à toutes et tous pour votre participation
        </p>

        <div class="messages-table-container">
          <table class="messages-table">
            <thead>
              <tr>
                <th>Auteur</th>
                <th>Message</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(message, index) in visibleMessages"
                :key="message.id"
                class="message-row"
                :style="{ animationDelay: `${index * 0.05}s` }"
              >
                <td class="author-cell">{{ message.author }}</td>
                <td class="content-cell">{{ message.content }}</td>
                <td class="date-cell">{{ formatDate(message.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="final-footer">
          <p>Avec amour, Zonta ❤️</p>
          <button @click="restart" class="btn-restart">Revoir</button>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div v-if="currentSlide > 0" class="navigation">
      <button
        @click="prevSlide"
        class="nav-btn nav-prev"
        :disabled="currentSlide === 0"
      >
        ←
      </button>
      <div class="progress-dots">
        <span
          v-for="i in totalSlides"
          :key="i"
          class="dot"
          :class="{ active: i - 1 === currentSlide }"
        ></span>
      </div>
      <button
        @click="nextSlide"
        class="nav-btn nav-next"
        :disabled="currentSlide === totalSlides - 1"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// Page title
document.title = "Zonta - Wrapped 2024";

// Data
const messages = ref([]);
const currentSlide = ref(0);
const totalSlides = 10;
const isTransitioning = ref(false);

// Animated counters
const animatedTotalMessages = ref(0);
const animatedAuthorsCount = ref(0);
const animatedAvgLength = ref(0);

// Random messages for showcase
const randomMessages = ref([]);
const currentRandomMessageIndex = ref(0);

// Computed stats
const visibleMessages = computed(() =>
  messages.value.filter(
    (msg) => !msg.hidden && msg.content && msg.content.trim().length > 0
  )
);

const totalMessages = computed(() => visibleMessages.value.length);

const uniqueAuthors = computed(() => {
  const authors = new Set();
  visibleMessages.value.forEach((msg) => {
    if (msg.author && msg.author.trim()) {
      authors.add(msg.author.trim().toLowerCase());
    }
  });
  return authors.size;
});

const averageMessageLength = computed(() => {
  if (visibleMessages.value.length === 0) return 0;
  const total = visibleMessages.value.reduce(
    (sum, msg) => sum + msg.content.length,
    0
  );
  return Math.round(total / visibleMessages.value.length);
});

const mostActiveDay = computed(() => {
  if (visibleMessages.value.length === 0) return "";
  const dayCounts = {};
  visibleMessages.value.forEach((msg) => {
    const date = new Date(msg.createdAt);
    const dateStr = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
  });
  const entries = Object.entries(dayCounts);
  if (entries.length === 0) return "";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
});

const mostActiveDayCount = computed(() => {
  if (visibleMessages.value.length === 0) return 0;
  const dayCounts = {};
  visibleMessages.value.forEach((msg) => {
    const date = new Date(msg.createdAt);
    const dateStr = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
  });
  const counts = Object.values(dayCounts);
  return counts.length > 0 ? Math.max(...counts) : 0;
});

const topEmojis = computed(() => {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
  const emojiCounts = {};

  visibleMessages.value.forEach((msg) => {
    const matches = msg.content.match(emojiRegex);
    if (matches) {
      matches.forEach((emoji) => {
        emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(emojiCounts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return sorted.length > 0
    ? sorted
    : [
        { emoji: "❤️", count: 0 },
        { emoji: "💛", count: 0 },
        { emoji: "✨", count: 0 },
      ];
});

const currentRandomMessage = computed(() => {
  const slideIndex = currentSlide.value - 5;
  if (slideIndex >= 0 && slideIndex < randomMessages.value.length) {
    return randomMessages.value[slideIndex];
  }
  return null;
});

// Methods
function animateCounter(target, duration = 1500) {
  const start = 0;
  const end = target;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(start + (end - start) * easeOutQuart(progress));

    if (currentSlide.value === 1) animatedTotalMessages.value = value;
    else if (currentSlide.value === 2) animatedAuthorsCount.value = value;
    else if (currentSlide.value === 3) animatedAvgLength.value = value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function easeOutQuart(x) {
  return 1 - Math.pow(1 - x, 4);
}

function nextSlide() {
  if (currentSlide.value < totalSlides - 1) {
    isTransitioning.value = true;
    setTimeout(() => {
      currentSlide.value++;
      isTransitioning.value = false;
    }, 300);
  }
}

function prevSlide() {
  if (currentSlide.value > 0) {
    isTransitioning.value = true;
    setTimeout(() => {
      currentSlide.value--;
      isTransitioning.value = false;
    }, 300);
  }
}

function restart() {
  isTransitioning.value = true;
  setTimeout(() => {
    currentSlide.value = 0;
    isTransitioning.value = false;
  }, 300);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function selectRandomMessages() {
  const available = [...visibleMessages.value];
  const selected = [];
  const count = Math.min(3, available.length);

  for (let i = 0; i < count; i++) {
    if (available.length === 0) break;
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  randomMessages.value = selected;
}

// Watch for slide changes to trigger animations
watch(currentSlide, (newSlide) => {
  if (newSlide === 1) {
    animateCounter(totalMessages.value);
  } else if (newSlide === 2) {
    animateCounter(uniqueAuthors.value);
  } else if (newSlide === 3) {
    animateCounter(averageMessageLength.value);
  }
});

// Load messages on mount
async function loadMessages() {
  try {
    const response = await axios.get(`${API_URL}/messages`);
    messages.value = response.data;
    selectRandomMessages();
  } catch (error) {
    console.error("Error loading messages:", error);
  }
}

onMounted(async () => {
  await loadMessages();
});

// Keyboard navigation
onMounted(() => {
  const handleKeydown = (e) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      nextSlide();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    }
  };
  window.addEventListener("keydown", handleKeydown);
  return () => window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.wrapped-container {
  min-height: 100vh;
  background: url("/bg.png") #fdbc2e;
  background-attachment: fixed;
  background-size: cover;
  background-position: center;
  color: #5c3317;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

.wrapped-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
      circle at 20% 80%,
      rgba(92, 51, 23, 0.05) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 20%,
      rgba(92, 51, 23, 0.05) 0%,
      transparent 50%
    );
  pointer-events: none;
}

.slide {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: slideIn 0.6s ease-out;
  padding: 2rem;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.transitioning .slide {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.slide-content {
  text-align: center;
  max-width: 800px;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.slide-content-table {
  max-width: 1200px;
  width: 100%;
}

/* Welcome Slide */
.wrapped-title {
  font-size: 6rem;
  font-weight: 900;
  margin: 0;
  color: #5c3317;
  text-shadow: 2px 2px 4px rgba(253, 188, 46, 0.3);
  animation: titlePulse 2s ease-in-out infinite;
}

@keyframes titlePulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.wrapped-subtitle {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 1rem 0;
  opacity: 0.9;
}

.wrapped-text {
  font-size: 1.5rem;
  margin: 2rem 0;
  opacity: 0.8;
}

.btn-next {
  background: #5c3317;
  color: #fdbc2e;
  border: none;
  padding: 1rem 3rem;
  font-size: 1.3rem;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(92, 51, 23, 0.3);
  margin-top: 2rem;
}

.btn-next:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(92, 51, 23, 0.5);
  background: #7a4420;
}

/* Stat Slides */
.stat-number {
  font-size: 8rem;
  font-weight: 900;
  margin: 2rem 0;
  color: #5c3317;
  text-shadow: 2px 2px 8px rgba(253, 188, 46, 0.5);
}

.stat-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.stat-date {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 1rem 0;
  color: #5c3317;
}

.stat-label {
  font-size: 2rem;
  font-weight: 600;
  color: #5c3317;
  margin-bottom: 1rem;
}

.stat-description {
  font-size: 1.3rem;
  opacity: 0.7;
  margin-top: 1rem;
}

/* Message Showcase */
.message-showcase {
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  position: relative;
}

.message-quote {
  font-size: 6rem;
  color: #fdbc2e;
  opacity: 0.3;
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-family: Georgia, serif;
}

.message-text {
  font-size: 2rem;
  line-height: 1.6;
  margin: 2rem 0;
  position: relative;
  z-index: 1;
  color: #5c3317;
}

.message-author {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  color: #5c3317;
}

.message-date {
  font-size: 1rem;
  color: #5c3317;
  opacity: 0.6;
  margin-top: 0.5rem;
}

/* Emoji Grid */
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: 3rem;
}

.emoji-item {
  background: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.2);
  animation: emojiPop 0.5s ease-out both;
}

@keyframes emojiPop {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.emoji-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.emoji-count {
  font-size: 2rem;
  font-weight: 700;
  color: #5c3317;
}

/* Final Table Slide */
.final-title {
  font-size: 3.5rem;
  font-weight: 900;
  margin-bottom: 1rem;
  color: #5c3317;
}

.final-subtitle {
  font-size: 1.5rem;
  color: #5c3317;
  opacity: 0.8;
  margin-bottom: 3rem;
}

.messages-table-container {
  background: white;
  border-radius: 15px;
  padding: 2rem;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  margin-bottom: 2rem;
}

.messages-table {
  width: 100%;
  border-collapse: collapse;
  color: #5c3317;
}

.messages-table thead {
  position: sticky;
  top: 0;
  background: #5c3317;
  color: #fdbc2e;
  z-index: 10;
}

.messages-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 700;
  font-size: 1.1rem;
}

.message-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  animation: rowFadeIn 0.5s ease-out both;
}

@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.messages-table td {
  padding: 1rem;
  vertical-align: top;
}

.author-cell {
  font-weight: 600;
  color: #5c3317;
  white-space: nowrap;
}

.content-cell {
  max-width: 500px;
  line-height: 1.5;
}

.date-cell {
  opacity: 0.6;
  font-size: 0.9rem;
  white-space: nowrap;
}

.final-footer {
  margin-top: 2rem;
}

.final-footer p {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #5c3317;
}

.btn-restart {
  background: #5c3317;
  color: #fdbc2e;
  border: none;
  padding: 1rem 2.5rem;
  font-size: 1.2rem;
  font-weight: 700;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(92, 51, 23, 0.3);
}

.btn-restart:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(92, 51, 23, 0.5);
  background: #7a4420;
}

/* Navigation */
.navigation {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2rem;
  background: white;
  padding: 1rem 2rem;
  border-radius: 50px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  z-index: 100;
}

.nav-btn {
  background: #5c3317;
  border: 2px solid #5c3317;
  color: #fdbc2e;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover:not(:disabled) {
  background: #7a4420;
  border-color: #7a4420;
  transform: scale(1.1);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.progress-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(92, 51, 23, 0.3);
  transition: all 0.3s ease;
}

.dot.active {
  background: #5c3317;
  transform: scale(1.3);
}

/* Scrollbar styling */
.messages-table-container::-webkit-scrollbar {
  width: 10px;
}

.messages-table-container::-webkit-scrollbar-track {
  background: rgba(92, 51, 23, 0.1);
  border-radius: 10px;
}

.messages-table-container::-webkit-scrollbar-thumb {
  background: #5c3317;
  border-radius: 10px;
}

.messages-table-container::-webkit-scrollbar-thumb:hover {
  background: #7a4420;
}

/* Responsive Design */
@media (max-width: 768px) {
  .wrapped-title {
    font-size: 3.5rem;
  }

  .wrapped-subtitle {
    font-size: 1.8rem;
  }

  .wrapped-text {
    font-size: 1.2rem;
  }

  .stat-number {
    font-size: 5rem;
  }

  .stat-label {
    font-size: 1.5rem;
  }

  .message-text {
    font-size: 1.5rem;
  }

  .emoji-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .final-title {
    font-size: 2.5rem;
  }

  .messages-table th,
  .messages-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.9rem;
  }

  .content-cell {
    max-width: 300px;
  }

  .navigation {
    bottom: 1rem;
    padding: 0.75rem 1.5rem;
    gap: 1rem;
  }

  .nav-btn {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .slide {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .wrapped-title {
    font-size: 2.5rem;
  }

  .stat-number {
    font-size: 4rem;
  }

  .message-showcase {
    padding: 2rem 1.5rem;
  }

  .emoji-grid {
    grid-template-columns: 1fr;
  }

  .messages-table-container {
    padding: 1rem;
  }

  .author-cell,
  .date-cell {
    display: none;
  }

  .content-cell {
    max-width: 100%;
  }
}
</style>
