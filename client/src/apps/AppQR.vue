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
      <div class="qr-instruction">
        <span
          >Scannez ce code pour envoyer un message sur le sapin
          porte-paroles</span
        >
      </div>
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
      <div class="message-count" v-if="messageCount !== null">
        <span>{{ messageCount }} messages envoyés</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import QRCode from "qrcode";
import axios from "axios";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || window.location.origin;

const loading = ref(true);
const error = ref("");
const currentToken = ref("");
const qrCodeDataUrl = ref("");
const currentUrl = ref("");
const messageCount = ref(null);

let intervalId = null;
let socket = null;

// Set page title
document.title = "Zonta - QR Code";

async function fetchMessageCount() {
  try {
    const response = await axios.get(`${API_URL}/messages/count`);
    messageCount.value = response.data.count;
  } catch (err) {
    console.error("Error fetching message count:", err);
  }
}

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
    if (err.response && err.response.status === 403) {
      error.value = "Accès refusé : Votre adresse IP n'est pas autorisée.";
    } else {
      error.value = err.message || "Erreur de connexion au serveur";
    }
    loading.value = false;
  }
}

onMounted(() => {
  fetchToken();
  fetchMessageCount();

  // Initialize socket
  socket = io(API_URL);
  socket.on("message-count-update", (count) => {
    messageCount.value = count;
  });

  // Refresh count every 30 seconds (fallback)
  intervalId = setInterval(fetchMessageCount, 30000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
  if (socket) socket.disconnect();
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
  padding: 4vh 0 4vh 0;
  box-sizing: border-box;
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
  justify-content: space-around;
  gap: 2rem;
  width: 100%;
  height: 100%;
  padding: 0;
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
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  transition: box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Make the square as big as possible but always square, but leave space for text above */
  width: min(90vw, 70vh);
  height: min(90vw, 70vh);
  max-width: 90vw;
  max-height: 70vh;
  box-sizing: border-box;
  border-radius: 1.5rem;
  padding: 2vw;
}

.qr-code-link:hover .qr-code-container {
  box-shadow: 0 16px 50px rgba(92, 51, 23, 0.4);
}

.qr-code {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
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

.qr-instruction {
  font-size: 4rem;
  font-weight: 600;
  color: #5c3317;
  text-align: center;
  margin-bottom: 2rem;
  max-width: 90vw;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  box-sizing: border-box;
  padding-left: 2vw;
  padding-right: 2vw;
}

.message-count {
  font-size: 2.5rem;
  font-weight: 700;
  color: #5c3317;
  text-align: center;
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.5);
  padding: 1rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(92, 51, 23, 0.1);
}
</style>
