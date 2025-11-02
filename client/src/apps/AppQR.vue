<template>
  <div class="container">
    <div class="page-title">QR Code</div>
    <div class="header">
      <p class="description">
        Scannez ce QR code pour accéder au mur de messages public. Le code se
        renouvelle automatiquement toutes les 2 minutes pour la sécurité.
      </p>
    </div>

    <div class="qr-section">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Génération du QR code...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>❌ Erreur lors de la génération du QR code</p>
        <p>{{ error }}</p>
        <button @click="fetchToken" class="retry-btn">Réessayer</button>
      </div>

      <div v-else class="qr-content">
        <div class="qr-code-container">
          <img :src="qrCodeDataUrl" alt="QR Code d'accès" class="qr-code" />
        </div>

        <div class="token-info">
          <p class="current-url">
            <strong>URL d'accès :</strong><br />
            <code>{{ currentUrl }}</code>
          </p>
          <p class="token-display">
            <strong>Token actuel :</strong> <code>{{ currentToken }}</code>
          </p>
          <p class="expires-info">
            ⏰ Expire dans :
            <span class="countdown">{{ timeUntilExpiry }}</span>
          </p>
        </div>
      </div>
    </div>

    <div class="instructions">
      <h3>📱 Instructions</h3>
      <ol>
        <li>Scannez le QR code avec votre téléphone</li>
        <li>Vous serez redirigé vers le mur de messages</li>
        <li>Le QR code se renouvelle automatiquement toutes les 2 minutes</li>
      </ol>
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
const expiresAt = ref(null);
const timeUntilExpiry = ref("");

let intervalId = null;
let countdownIntervalId = null;

// Set page title
document.title = "Zonta - QR Code";

async function fetchToken() {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(`${API_URL}/api/current-token`);
    currentToken.value = response.data.token;
    expiresAt.value = new Date(response.data.expiresAt);

    // Generate URL with token
    currentUrl.value = `${CLIENT_URL}?token=${currentToken.value}`;

    // Generate QR code
    qrCodeDataUrl.value = await QRCode.toDataURL(currentUrl.value, {
      width: 256,
      margin: 2,
      color: {
        dark: "#2563eb",
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

  // Refresh token every 2 minutes
  intervalId = setInterval(fetchToken, 120000);

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
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.description {
  font-size: 1.1rem;
  color: #6b7280;
  line-height: 1.6;
  max-width: 500px;
  margin: 0 auto;
}

.qr-section {
  background: #f8fafc;
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #2563eb;
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
  color: #dc2626;
  font-weight: 500;
}

.retry-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #1d4ed8;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.qr-code-container {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.qr-code {
  display: block;
  max-width: 100%;
  height: auto;
}

.token-info {
  text-align: left;
  width: 100%;
  max-width: 500px;
}

.current-url {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.9rem;
}

.token-display {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  font-size: 0.9rem;
}

.expires-info {
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}

.countdown {
  font-family: monospace;
  font-weight: 700;
  color: #dc2626;
  background: #fef2f2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

code {
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
  color: #1e293b;
  word-break: break-all;
}

.instructions {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 1.5rem;
}

.instructions h3 {
  color: #0c4a6e;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.instructions ol {
  color: #0c4a6e;
  line-height: 1.6;
  padding-left: 1.5rem;
}

.instructions li {
  margin-bottom: 0.5rem;
}

.page-title {
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

@media (max-width: 640px) {
  .container {
    margin: 1rem;
    padding: 1.5rem;
  }

  .header h1 {
    font-size: 2rem;
  }

  .qr-content {
    gap: 1.5rem;
  }

  .current-url,
  .token-display {
    font-size: 0.8rem;
  }
}
</style>
