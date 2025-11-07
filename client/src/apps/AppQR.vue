<template>
  <div class="container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Erreur</p>
      <button @click="fetchToken" class="retry-btn">Réessayer</button>
    </div>

    <div v-else class="qr-content">
      <a
        :href="currentUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="qr-code-link"
      >
        <div class="qr-code-container">
          <img :src="qrCodeDataUrl" alt="QR Code d'accès" class="qr-code" />
        </div>
      </a>

      <div class="countdown">{{ timeUntilExpiry }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import QRCode from "qrcode";
import axios from "axios";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || window.location.origin;

// Refresh 5 seconds before token expires to avoid edge cases
const REFRESH_BUFFER_MS = 5000;

const loading = ref(true);
const error = ref("");
const currentToken = ref("");
const qrCodeDataUrl = ref("");
const currentUrl = ref("");
const expiresAt = ref(null);
const timeUntilExpiry = ref("");
const tokenExpiryMs = ref(120000); // Default, will be updated from server

let intervalId = null;
let countdownIntervalId = null;

// Set page title
document.title = "Zonta - QR Code";

// Computed property for display
const tokenExpiryMinutes = computed(() => {
  return Math.floor(tokenExpiryMs.value / 60000);
});

async function fetchToken() {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(`${API_URL}/api/current-token`);
    currentToken.value = response.data.token;
    expiresAt.value = new Date(response.data.expiresAt);

    // Update token expiry duration from server
    if (response.data.expiryMs) {
      tokenExpiryMs.value = response.data.expiryMs;

      // Reset interval with new timing (refresh 5s before expiry)
      if (intervalId) clearInterval(intervalId);
      const refreshInterval = Math.max(
        tokenExpiryMs.value - REFRESH_BUFFER_MS,
        1000
      );
      intervalId = setInterval(fetchToken, refreshInterval);

      console.log(
        `Token expires in ${tokenExpiryMs.value}ms, will refresh in ${refreshInterval}ms`
      );
    }

    // Generate URL with token
    currentUrl.value = `${CLIENT_URL}?token=${currentToken.value}`;

    // Generate QR code with dark brown color
    qrCodeDataUrl.value = await QRCode.toDataURL(currentUrl.value, {
      width: 400,
      margin: 2,
      color: {
        dark: "#5C3317", // Dark brown
        light: "#ffffff",
      },
    });

    loading.value = false;
    updateCountdown();
  } catch (err) {
    console.error("Error fetching token:", err);
    error.value = err.message || "Erreur de connexion au serveur";
    loading.value = false;
  }
}

function updateCountdown() {
  if (!expiresAt.value) return;

  const now = new Date();
  const timeLeft = expiresAt.value.getTime() - now.getTime();

  if (timeLeft <= 0) {
    timeUntilExpiry.value = "Expiré";
    fetchToken(); // Refresh token
    return;
  }

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  timeUntilExpiry.value = `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

onMounted(() => {
  fetchToken();

  // Update countdown every second
  countdownIntervalId = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  if (countdownIntervalId) clearInterval(countdownIntervalId);
});
</script>

<style scoped>
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #fdbc2e;
  padding: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid rgba(92, 51, 23, 0.2);
  border-top: 6px solid #5c3317;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error {
  text-align: center;
  color: #5c3317;
  font-weight: 600;
  font-size: 1.5rem;
}

.error p {
  margin-bottom: 1rem;
}

.retry-btn {
  background: #5c3317;
  color: #fdbc2e;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.retry-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(92, 51, 23, 0.3);
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3rem;
}

.qr-code-link {
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.qr-code-link:hover {
  transform: scale(1.02);
}

.qr-code-container {
  background: white;
  padding: 2rem;
  border-radius: 24px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  transition: box-shadow 0.2s;
}

.qr-code-link:hover .qr-code-container {
  box-shadow: 0 16px 50px rgba(92, 51, 23, 0.4);
}

.qr-code {
  display: block;
  width: 400px;
  height: 400px;
  max-width: 90vw;
  max-height: 90vw;
}

.countdown {
  font-family: "Courier New", monospace;
  font-size: 4rem;
  font-weight: 700;
  color: #5c3317;
  background: white;
  padding: 1.5rem 3rem;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(92, 51, 23, 0.2);
  min-width: 200px;
  text-align: center;
}
</style>
