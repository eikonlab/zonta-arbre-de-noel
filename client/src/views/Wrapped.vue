<template>
  <div class="wrapped-container" :class="{ transitioning: isTransitioning }">
    <!-- Slide 1: Welcome -->
    <div v-if="currentSlide === 0" class="slide slide-welcome">
      <div class="slide-content">
        <h1 class="wrapped-title explode-in">Zonta</h1>
        <h2 class="wrapped-subtitle slide-in-delay-1">Sapin porte-paroles</h2>
        <p class="wrapped-text slide-in-delay-2">Découvrez tous vos messages d'amour</p>
        <button @click="nextSlide" class="btn-next pulse-button">Commencer</button>
      </div>
    </div>

    <!-- Slide 2: Total Messages with Flying Hearts -->
    <div v-if="currentSlide === 1" class="slide slide-stat">
      <div class="slide-content">
        <div class="floating-hearts">
          <span
            v-for="i in 15"
            :key="i"
            class="heart"
            :style="{ animationDelay: `${i * 0.2}s` }"
            >💛</span
          >
        </div>
        <div class="stat-number animate-count bounce-in">
          {{ animatedTotalMessages }}
        </div>
        <div class="stat-label slide-up">Messages partagés</div>
        <p class="stat-description fade-in-slow">
          Tant de messages d'amour et de soutien partagés cette année
        </p>
      </div>
    </div>

    <!-- Slide 3: First Message Showcase -->
    <div v-if="currentSlide === 2" class="slide slide-message">
      <div class="slide-content">
        <div class="message-showcase flip-in">
          <div class="message-quote">"</div>
          <div class="message-text">{{ randomMessages[0]?.content }}</div>
          <div class="message-author">{{ randomMessages[0]?.author }}</div>
          <div class="message-date">
            {{ formatDate(randomMessages[0]?.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 4: Authors Count with Confetti -->
    <div v-if="currentSlide === 3" class="slide slide-stat">
      <div class="slide-content">
        <div class="confetti-container">
          <span
            v-for="i in 30"
            :key="i"
            class="confetti"
            :style="getConfettiStyle(i)"
          ></span>
        </div>
        <div class="stat-number animate-count rotate-in">
          {{ animatedAuthorsCount }}
        </div>
        <div class="stat-label zoom-in">Personnes ont contribué</div>
        <p class="stat-description fade-in-slow">Une communauté incroyable</p>
      </div>
    </div>

    <!-- Slide 5: Split Screen - Message + Most Active Day -->
    <div v-if="currentSlide === 4" class="slide slide-split">
      <div class="split-container">
        <div class="split-left slide-from-left">
          <div class="stat-icon">📅</div>
          <div class="stat-date">{{ mostActiveDay }}</div>
          <div class="stat-label">Le jour le plus actif</div>
          <p class="stat-description">{{ mostActiveDayCount }} messages</p>
        </div>
        <div class="split-right slide-from-right">
          <div class="message-carousel">
            <div
              class="carousel-track"
              :style="{
                animationDuration: `${Math.max(6, mostActiveDayMessages.length * 2)}s`,
              }"
            >
              <div
                v-for="(msg, i) in mostActiveDayMessagesLoop"
                :key="`${msg.id || i}-loop-${i}`"
                class="carousel-item"
                :style="{ animationDelay: `${i * 0.1}s` }"
              >
                <div class="carousel-text">{{ msg.content }}</div>
                <div class="carousel-meta">
                  {{ msg.author }} • {{ formatDate(msg.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 6: Average Length with Animated Bars -->
    <div v-if="currentSlide === 5" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-bars">
          <div
            v-for="i in 8"
            :key="i"
            class="stat-bar"
            :style="{
              height: `${Math.random() * 60 + 20}%`,
              animationDelay: `${i * 0.1}s`,
            }"
          ></div>
        </div>
        <div class="stat-number animate-count scale-in">
          {{ animatedAvgLength }}
        </div>
        <div class="stat-label slide-up">Caractères par message (en moyenne)</div>
        <p class="stat-description fade-in-slow">Des messages qui viennent du cœur</p>
      </div>
    </div>

    <!-- Slide 7: Third Message Showcase -->
    <div v-if="currentSlide === 6" class="slide slide-message">
      <div class="slide-content">
        <div class="message-showcase flip-in">
          <div class="message-quote">"</div>
          <div class="message-text large-text">
            {{ randomMessages[2]?.content }}
          </div>
          <div class="message-author">{{ randomMessages[2]?.author }}</div>
          <div class="message-date">
            {{ formatDate(randomMessages[2]?.createdAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 8: Emoji Stats with Bounce -->
    <div v-if="currentSlide === 7" class="slide slide-stat">
      <div class="slide-content">
        <div class="stat-label bounce-in">Les emojis les plus utilisés</div>
        <div class="emoji-grid">
          <div
            v-for="(emoji, index) in topEmojis"
            :key="index"
            class="emoji-item bounce-in"
            :style="{ animationDelay: `${index * 0.15}s` }"
          >
            <div class="emoji-icon spin-in">{{ emoji.emoji }}</div>
            <div class="emoji-count">{{ emoji.count }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 9: Messages Mosaic -->
    <div v-if="currentSlide === 8" class="slide slide-mosaic">
      <div class="mosaic-grid">
        <div
          v-for="(msg, i) in visibleMessages.slice(0, 12)"
          :key="i"
          class="mosaic-item"
          :style="{ animationDelay: `${i * 0.05}s` }"
        >
          <div class="mosaic-content">
            <div class="mosaic-text">{{ msg.content }}</div>
            <div class="mosaic-author">{{ msg.author }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide 10: Final - All Messages Table -->
    <div v-if="currentSlide === 9" class="slide slide-final">
      <div class="slide-content slide-content-table">
        <h2 class="final-title">Tous les Messages 💛</h2>
        <p class="final-subtitle">Merci à toutes et tous pour votre participation</p>

        <div class="messages-table-container">
          <table class="messages-table">
            <tbody>
              <tr
                v-for="(message, index) in visibleMessages"
                :key="message.id"
                class="message-row"
                :style="{ animationDelay: `${index * 0.05}s` }"
              >
                <td class="meta-cell">
                  <div class="meta-author">{{ message.author }}</div>
                  <div class="meta-date">
                    {{ formatDate(message.createdAt) }}
                  </div>
                </td>
                <td class="content-cell">{{ message.content }}</td>
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
      <button @click="prevSlide" class="nav-btn nav-prev" :disabled="currentSlide === 0">
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

    <!-- Independent Canvas Animation Container -->
    <div id="animation-container"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
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

// Animation state
let activeAnimations = [];
let animationStoppers = [];
let playNextTransition = true;

// Canvas animation settings
const FONT_SIZE = 100;
const FONT_FAMILY =
  "'Noto Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', 'Noto Sans', sans-serif";
const TRANSITION_SPEED = 800; // px/s - fast for quick transitions
const TRANSITION_DURATION = 4500; // ms - allows fade-out after 3s
const TRANSITION_FADE_START = 3000; // ms - begin fading text

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
  const total = visibleMessages.value.reduce((sum, msg) => sum + msg.content.length, 0);
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

const mostActiveDayMessages = computed(() => {
  if (!mostActiveDay.value) return [];
  return visibleMessages.value.filter((msg) => {
    const date = new Date(msg.createdAt);
    const dateStr = date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return dateStr === mostActiveDay.value;
  });
});

const mostActiveDayMessagesLoop = computed(() => {
  // Duplicate list to allow smooth looping
  return [...mostActiveDayMessages.value, ...mostActiveDayMessages.value];
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
function getConfettiStyle(index) {
  const colors = ["#5c3317", "#fdbc2e", "#fff", "#7a4420"];
  return {
    left: `${Math.random() * 100}%`,
    backgroundColor: colors[index % colors.length],
    animationDelay: `${index * 0.1}s`,
    animationDuration: `${2 + Math.random() * 2}s`,
  };
}

function animateCounter(target, duration = 1500) {
  const start = 0;
  const end = target;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(start + (end - start) * easeOutQuart(progress));

    if (currentSlide.value === 1) animatedTotalMessages.value = value;
    else if (currentSlide.value === 3) animatedAuthorsCount.value = value;
    else if (currentSlide.value === 5) animatedAvgLength.value = value;

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
    currentSlide.value++;
    triggerTransitionAnimation();
  }
}

function prevSlide() {
  if (currentSlide.value > 0) {
    currentSlide.value--;
    triggerTransitionAnimation();
  }
}

function restart() {
  currentSlide.value = 0;
  triggerTransitionAnimation();
}

function triggerTransitionAnimation() {
  // Alternate: play once, skip once
  if (!playNextTransition) {
    playNextTransition = true;
    return;
  }
  playNextTransition = false;

  // Create an independent canvas for the animation
  const container = document.getElementById("animation-container");
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9999;
  `;

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `
    display: block;
    width: 100%;
    height: 100%;
  `;

  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  // Get 2-3 random messages for transition
  const transitionMessages = [];
  const available = [...visibleMessages.value];
  const count = Math.min(2 + Math.floor(Math.random() * 2), available.length);

  for (let i = 0; i < count; i++) {
    if (available.length === 0) break;
    const randomIndex = Math.floor(Math.random() * available.length);
    transitionMessages.push(available[randomIndex].content);
    available.splice(randomIndex, 1);
  }

  // Create and start the animation
  const stopAnimation = createIndependentAnimation(canvas, transitionMessages);
  activeAnimations.push({ canvas, wrapper, stopAnimation });
  animationStoppers.push(stopAnimation);

  // Remove canvas after animation completes - extended timeout to be safe
  setTimeout(() => {
    const idx = animationStoppers.indexOf(stopAnimation);
    if (idx > -1) {
      animationStoppers.splice(idx, 1);
      activeAnimations = activeAnimations.filter(
        (a) => a.stopAnimation !== stopAnimation
      );
    }
    stopAnimation();
    wrapper.remove();
  }, TRANSITION_DURATION + 5000);
}

function createIndependentAnimation(canvas, messages) {
  if (!canvas || messages.length === 0) return () => {};

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  // Setup canvas size
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  // Create multiple paths for different messages
  const paths = [
    "M 0 0.3 C 0.3 0.1, 0.7 0.5, 1 0.3",
    "M 0 0.5 C 0.25 0.6, 0.75 0.4, 1 0.5",
    "M 0 0.7 C 0.3 0.9, 0.7 0.5, 1 0.7",
    "M 0 0.4 C 0.4 0.2, 0.6 0.6, 1 0.4",
    "M 0 0.6 C 0.35 0.4, 0.65 0.8, 1 0.6",
  ];

  // Create animation data for each message
  const animations = messages.map((message, index) => {
    const path = parsePath(paths[index % paths.length]);
    const samples = buildPathSamples(path, width, height);
    const pathLength = samples.length > 0 ? samples[samples.length - 1].s : 0;
    const glyphs = layoutText(ctx, message);
    const textWidth = glyphs.reduce((sum, g) => sum + g.w + 2, 0);

    return {
      samples,
      pathLength,
      glyphs,
      textWidth,
      offsetS: pathLength + index * 150,
    };
  });

  let rafId = null;
  let lastTs = 0;
  let startTs = null;

  const animate = (ts) => {
    if (startTs === null) startTs = ts;
    if (!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;

    const elapsed = ts - startTs;

    // Ensure context is fresh
    if (!ctx || ctx.canvas !== canvas) {
      return; // Canvas was removed, stop animation
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw all messages
    ctx.font = `700 ${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let allFinished = true;

    animations.forEach((anim, index) => {
      // Move text
      anim.offsetS -= TRANSITION_SPEED * dt;

      // Cycle colors (brown / dark orange only, no yellow)
      const colors = ["#5c3317", "#7a4420", "#8a4b1f"];
      ctx.fillStyle = colors[index % colors.length];

      // Fade factor after threshold
      const fadeFactor =
        elapsed < TRANSITION_FADE_START
          ? 1
          : Math.max(0, 1 - (elapsed - TRANSITION_FADE_START) / 1000);

      // Draw glyphs and detect visibility
      let hasVisibleContent = false;
      for (let i = 0; i < anim.glyphs.length; i++) {
        const posS = anim.offsetS + anim.glyphs[i].offs;
        if (posS < 0 || posS > anim.pathLength) continue;

        hasVisibleContent = true;
        const pt = sampleAtS(anim.samples, posS, anim.pathLength);
        if (!pt) continue;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.angle);
        ctx.globalAlpha = fadeFactor;
        ctx.fillText(anim.glyphs[i].ch, 0, 0);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Message still has content to show if any glyph is visible or text has not fully passed left side
      if ((hasVisibleContent || anim.offsetS + anim.textWidth >= 0) && fadeFactor > 0) {
        allFinished = false;
      }
    });

    // Continue animation only if there's still content to show
    if (!allFinished) {
      rafId = requestAnimationFrame(animate);
    }
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
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

// Helper functions for path parsing
function parsePath(d) {
  const tokens = d.match(/[MmLlCc]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/gi) || [];
  const segments = [];
  let i = 0;
  let cur = { x: 0, y: 0 };

  while (i < tokens.length) {
    const cmd = tokens[i++];

    if (cmd === "M" || cmd === "m") {
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);
      cur = cmd === "M" ? { x, y } : { x: cur.x + x, y: cur.y + y };
    } else if (cmd === "C" || cmd === "c") {
      const cx1 = parseFloat(tokens[i++]);
      const cy1 = parseFloat(tokens[i++]);
      const cx2 = parseFloat(tokens[i++]);
      const cy2 = parseFloat(tokens[i++]);
      const x = parseFloat(tokens[i++]);
      const y = parseFloat(tokens[i++]);

      const ctrl1 = cmd === "C" ? { x: cx1, y: cy1 } : { x: cur.x + cx1, y: cur.y + cy1 };
      const ctrl2 = cmd === "C" ? { x: cx2, y: cy2 } : { x: cur.x + cx2, y: cur.y + cy2 };
      const next = cmd === "C" ? { x, y } : { x: cur.x + x, y: cur.y + y };

      segments.push({
        type: "C",
        p0: { ...cur },
        p1: ctrl1,
        p2: ctrl2,
        p3: next,
      });
      cur = next;
    }
  }

  return segments;
}

function buildPathSamples(segments, width, height) {
  const samples = [];
  let pathLength = 0;
  let lastPt = null;

  for (const seg of segments) {
    if (seg.type === "C") {
      const steps = 50;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = cubicBezier(seg.p0, seg.p1, seg.p2, seg.p3, t);
        const dpt = cubicDerivative(seg.p0, seg.p1, seg.p2, seg.p3, t);

        // Scale to canvas size
        const x = pt.x * width;
        const y = pt.y * height;
        const angle = Math.atan2(dpt.y, dpt.x);

        if (lastPt) {
          pathLength += Math.hypot(x - lastPt.x, y - lastPt.y);
        }

        samples.push({ s: pathLength, x, y, angle });
        lastPt = { x, y };
      }
    }
  }

  return samples;
}

function cubicBezier(p0, p1, p2, p3, t) {
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

function cubicDerivative(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

function layoutText(ctx, text) {
  ctx.font = `700 ${FONT_SIZE}px ${FONT_FAMILY}`;
  const chars = Array.from(text || "");
  const glyphs = [];

  let pos = 0;
  for (const ch of chars) {
    let w = ctx.measureText(ch).width;
    if (ch === " ") w *= 0.6;
    const center = pos + w / 2;
    glyphs.push({ ch, w, offs: center });
    pos += w + 2;
  }

  return glyphs;
}

function sampleAtS(samples, s, pathLength) {
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

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: a.angle + (b.angle - a.angle) * t,
  };
}

// Watch for slide changes to trigger animations
watch(currentSlide, (newSlide) => {
  if (newSlide === 1) {
    animateCounter(totalMessages.value);
  } else if (newSlide === 3) {
    animateCounter(uniqueAuthors.value);
  } else if (newSlide === 5) {
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

  // Load fonts
  try {
    const fontSpec = `700 ${FONT_SIZE}px`;
    await Promise.all([
      document.fonts.load(`${fontSpec} 'Noto Color Emoji'`),
      document.fonts.load(`${fontSpec} 'Noto Emoji'`),
      document.fonts.load(`${fontSpec} 'Noto Sans'`),
    ]);
    await document.fonts.ready;
  } catch (e) {
    console.warn("Font loading issue:", e);
  }
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

onUnmounted(() => {
  // Stop transition animation
  if (transitionAnimationStop) {
    transitionAnimationStop();
    transitionAnimationStop = null;
  }
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
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
    radial-gradient(circle at 80% 20%, rgba(92, 51, 23, 0.05) 0%, transparent 50%);
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

/* Transition Overlay */
.transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
  animation: transitionFadeIn 0.2s ease-out;
}

@keyframes transitionFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.transition-overlay canvas {
  display: block;
  width: 100%;
  height: 100%;
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
  animation-fill-mode: both;
  will-change: transform, opacity;
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
  animation-fill-mode: both;
  will-change: transform, opacity;
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
  text-align: left;
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

.meta-cell {
  width: 180px;
  white-space: nowrap;
}

.meta-author {
  font-weight: 700;
  color: #5c3317;
}

.meta-date {
  opacity: 0.7;
  font-size: 0.9rem;
  color: #5c3317;
}

.content-cell {
  max-width: 700px;
  line-height: 1.6;
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

  .meta-cell {
    width: 140px;
  }

  .content-cell {
    max-width: 320px;
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

  .meta-cell {
    width: 120px;
  }

  .content-cell {
    max-width: 100%;
  }
}

/* Bold New Animations */
@keyframes explodeIn {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-15deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.explode-in {
  animation: explodeIn 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(-100px);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.bounce-in {
  animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  animation-fill-mode: both;
  will-change: transform, opacity;
}

@keyframes rotateIn {
  0% {
    opacity: 0;
    transform: rotate(-360deg) scale(0);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}

.rotate-in {
  animation: rotateIn 1s ease-out;
}

@keyframes flipIn {
  0% {
    opacity: 0;
    transform: perspective(800px) rotateY(-90deg);
  }
  100% {
    opacity: 1;
    transform: perspective(800px) rotateY(0deg);
  }
}

.flip-in {
  animation: flipIn 0.8s ease-out;
}

@keyframes scaleIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.scale-in {
  animation: scaleIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideUp {
  0% {
    opacity: 0;
    transform: translateY(50px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp 0.6s ease-out 0.3s both;
}

@keyframes fadeInSlow {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.fade-in-slow {
  animation: fadeInSlow 1s ease-out 0.6s both;
}

.slide-in-delay-1 {
  animation: slideUp 0.6s ease-out 0.2s both;
}

.slide-in-delay-2 {
  animation: slideUp 0.6s ease-out 0.4s both;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.pulse-button {
  animation: pulse 2s ease-in-out infinite 0.6s;
}

@keyframes zoomIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.zoom-in {
  animation: zoomIn 0.5s ease-out 0.3s both;
}

@keyframes spinIn {
  0% {
    opacity: 0;
    transform: rotate(-180deg) scale(0);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg) scale(1);
  }
}

.spin-in {
  animation: spinIn 0.7s ease-out;
  animation-fill-mode: both;
  will-change: transform, opacity;
}

/* Floating Hearts */
.floating-hearts {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.heart {
  position: absolute;
  font-size: 2rem;
  opacity: 0;
  animation: floatUp 4s ease-in infinite;
}

@keyframes floatUp {
  0% {
    bottom: -10%;
    opacity: 0;
    transform: translateX(0) rotate(0deg);
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    bottom: 110%;
    opacity: 0;
    transform: translateX(100px) rotate(360deg);
  }
}

.heart:nth-child(odd) {
  left: 20%;
}

.heart:nth-child(even) {
  left: 70%;
}

.heart:nth-child(3n) {
  left: 50%;
}

/* Confetti */
.confetti-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10%;
  opacity: 0;
  animation: confettiFall 3s linear infinite;
}

@keyframes confettiFall {
  0% {
    top: -10%;
    opacity: 1;
    transform: translateX(0) rotate(0deg);
  }
  100% {
    top: 110%;
    opacity: 0;
    transform: translateX(100px) rotate(720deg);
  }
}

/* Split Screen */
.split-container {
  display: flex;
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
}

.split-left,
.split-right {
  flex: 1;
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

@keyframes slideFromLeft {
  0% {
    opacity: 0;
    transform: translateX(-100px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-from-left {
  animation: slideFromLeft 0.8s ease-out;
}

@keyframes slideFromRight {
  0% {
    opacity: 0;
    transform: translateX(100px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-from-right {
  animation: slideFromRight 0.8s ease-out 0.3s both;
}

.message-showcase-mini {
  text-align: left;
}

.message-text-mini {
  font-size: 1.5rem;
  line-height: 1.6;
  color: #5c3317;
  margin-bottom: 1rem;
}

.message-author-mini {
  font-size: 1.2rem;
  font-weight: 600;
  color: #5c3317;
  opacity: 0.8;
}

.message-carousel {
  position: relative;
  height: 220px;
  overflow: hidden;
  padding: 0.5rem 0;
}

.carousel-track {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: scrollUp linear infinite;
}

.carousel-item {
  background: #5c3317;
  color: #ffffff;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  animation: fadeInUp 0.4s ease-out both;
}

.carousel-text {
  font-size: 1.1rem;
  line-height: 1.5;
  color: #ffffff;
  margin-bottom: 0.35rem;
  max-height: 3.3em;
  overflow: hidden;
}

.carousel-meta {
  font-size: 0.9rem;
  color: #ffffff;
  opacity: 0.5;
}

@keyframes scrollUp {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stat Bars */
.stat-bars {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 1rem;
  padding: 0 2rem;
  opacity: 0.2;
}

.stat-bar {
  flex: 1;
  background: #5c3317;
  border-radius: 10px 10px 0 0;
  animation: growBar 1s ease-out both;
}

@keyframes growBar {
  0% {
    height: 0;
  }
  100% {
    height: var(--bar-height, 50%);
  }
}

/* Message Rain */
.rain-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  opacity: 0.3;
}

.rain-message {
  position: absolute;
  top: -10%;
  font-size: 0.9rem;
  color: #5c3317;
  white-space: nowrap;
  animation: rainFall linear infinite;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes rainFall {
  0% {
    top: -10%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    top: 110%;
    opacity: 0;
  }
}

.overlay-content {
  position: relative;
  z-index: 10;
}

.spotlight {
  box-shadow: 0 0 100px rgba(253, 188, 46, 0.8), 0 12px 40px rgba(92, 51, 23, 0.4);
}

.large-text {
  font-size: 2.5rem;
}

/* Mosaic Grid */
.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  padding: 2rem;
  max-width: 1400px;
}

.mosaic-item {
  background: white;
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.2);
  animation: mosaicPop 0.6s ease-out both;
  transition: transform 0.3s ease;
}

.mosaic-item:hover {
  transform: scale(1.05) rotate(2deg);
}

@keyframes mosaicPop {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.mosaic-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mosaic-text {
  font-size: 0.95rem;
  line-height: 1.4;
  color: #5c3317;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mosaic-author {
  font-size: 0.85rem;
  font-weight: 600;
  color: #5c3317;
  opacity: 0.7;
}

/* Responsive adjustments for new layouts */
@media (max-width: 768px) {
  .split-container {
    flex-direction: column;
  }

  .mosaic-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 1rem;
  }

  .large-text {
    font-size: 1.8rem;
  }

  .stat-bars {
    height: 150px;
  }
}

@media (max-width: 480px) {
  .mosaic-grid {
    grid-template-columns: 1fr;
  }

  .split-left,
  .split-right {
    padding: 2rem 1.5rem;
  }
}
</style>
