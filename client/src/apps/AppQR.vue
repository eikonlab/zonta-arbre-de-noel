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

      <!-- Timer removed: only QR code remains -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import QRCode from "qrcode";
import axios from "axios";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || window.location.origin;

const loading = ref(true);
const error = ref("");
const currentToken = ref("");
const qrCodeDataUrl = ref("");
const currentUrl = ref("");

let intervalId = null;

// Set page title
document.title = "Zonta - QR Code";

async function fetchToken() {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(`${API_URL}/api/current-token`);
    currentToken.value = response.data.token;

    // No need to handle expiry or countdown, just generate QR code

    // Generate URL with token
    currentUrl.value = `${CLIENT_URL}?token=${currentToken.value}`;

    // Generate QR code with dark brown color
    qrCodeDataUrl.value = await QRCode.toDataURL(currentUrl.value, {
      width: 2048,
      margin: 2,
      color: {
        dark: "#5C3317", // Dark brown
        light: "#ffffff",
      },
    });

    loading.value = false;
  } catch (err) {
    console.error("Error fetching token:", err);
    error.value = err.message || "Erreur de connexion au serveur";
    loading.value = false;
  }
}

onMounted(() => {
  fetchToken();
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
.container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: #fdbc2e;
  padding: 0;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
  touch-action: none;
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
  justify-content: center;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
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
  padding: 0;
  border-radius: 0;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  transition: box-shadow 0.2s;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: calc(100vh - 12rem);
  max-width: 100%;
}

.qr-code-link:hover .qr-code-container {
  box-shadow: 0 16px 50px rgba(92, 51, 23, 0.4);
}

.qr-code {
  display: block;
  width: 100%;
  height: 100%;
  max-width: calc(100vh - 16rem);
  max-height: calc(100vh - 16rem);
  object-fit: contain;
}

.countdown {
  font-family: "Courier New", monospace;
  font-size: 4rem;
  font-weight: 700;
  color: #5c3317;
  padding: 1rem;
  min-width: 200px;
  text-align: center;
  flex-shrink: 0;
}
</style>
