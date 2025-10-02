<template>
  <div class="container">
    <div v-if="!hasValidToken && !tokenChecked" class="loading">
      <h1>� Vérification en cours...</h1>
      <p>Validation du token d'accès...</p>
    </div>
    <div v-else>
      <div v-if="!hasValidToken && tokenChecked" class="token-warning">
        <p>
          ⚠️ Token expiré ou invalide - Les messages peuvent ne pas
          s'enregistrer
        </p>
      </div>
      <h1 class="modern-title">📝 Mur de Messages Public</h1>
      <p class="context-box">
        Cet espace est un mur public de témoignages concernant les violences
        faites aux femmes. Merci de partager uniquement des récits, ressentis,
        faits ou messages de soutien liés à ces violences (physiques,
        psychologiques, sexuelles, économiques, etc.). Tout message jugé
        hors-sujet est automatiquement signalé et peut être retiré.
      </p>
      <form class="modern-form" @submit.prevent="sendMessage">
        <input
          v-model="author"
          class="modern-input"
          placeholder="Votre nom"
          required
        />
        <input
          v-model="content"
          class="modern-input"
          placeholder="Votre message"
          required
        />
        <button type="submit" class="modern-btn" :disabled="!hasValidToken">
          {{ hasValidToken ? "Envoyer" : "Token invalide" }}
        </button>
      </form>
      <div class="messages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-bubble"
          :class="{ 'off-topic': msg.flagged === 'hors-sujet' }"
        >
          <div class="message-content">
            <div class="message-header">
              <span class="author">{{ msg.author }}</span>
              <template
                v-if="msg.toxicity !== null && msg.toxicity !== undefined"
              >
                <span class="toxicity"
                  >Toxicité : {{ (msg.toxicity * 100).toFixed(1) }}%</span
                >
              </template>
              <template v-if="msg.flagged === 'hors-sujet'">
                <span class="flag-tag">Hors-sujet</span>
              </template>
            </div>
            <div class="content">{{ msg.content }}</div>
            <div v-if="msg.flagged === 'hors-sujet'" class="flag-explainer">
              Ce message ne semble pas être un témoignage lié aux violences
              faites aux femmes.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "http://localhost:3001";
const socket = io(API_URL);

const messages = ref([]);
const author = ref("");
const content = ref("");
const hasValidToken = ref(false);
const tokenChecked = ref(false);

// Get token from URL parameters
function getTokenFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("token");
}

// Validate token with server
async function validateToken() {
  const token = getTokenFromUrl();
  if (!token) {
    hasValidToken.value = false;
    tokenChecked.value = true;
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/api/validate-token/${token}`);
    hasValidToken.value = response.data.valid;
  } catch (error) {
    console.error("Error validating token:", error);
    hasValidToken.value = false;
  } finally {
    tokenChecked.value = true;
  }
}

onMounted(async () => {
  // Load messages immediately (they'll be visible once token is validated)
  try {
    const res = await axios.get(`${API_URL}/messages`);
    messages.value = res.data;
  } catch (error) {
    console.error("Error loading messages:", error);
  }

  // Set up socket listener for new messages
  socket.on("new-message", (msg) => {
    messages.value.push(msg);
  });

  // Validate token
  await validateToken();

  // Check token validity every 10 seconds
  setInterval(() => {
    validateToken();
  }, 10000);
});

async function sendMessage() {
  if (!author.value || !content.value) return;

  if (!hasValidToken.value) {
    alert("Token invalide ou expiré. Impossible d'envoyer le message.");
    return;
  }

  try {
    await axios.post(`${API_URL}/messages`, {
      author: author.value,
      content: content.value,
    });
    content.value = "";
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
  }
}
</script>

<style scoped>
.container {
  max-width: 540px;
  margin: 2.5rem auto;
  padding: 2.5rem 2rem 2rem 2rem;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 4px 24px #0002;
  border: 1px solid #f0f0f0;
}

.access-denied {
  text-align: center;
  padding: 3rem 2rem;
}

.access-denied h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #dc2626;
}

.access-denied p {
  font-size: 1.1rem;
  color: #4b5563;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.loading {
  text-align: center;
  padding: 3rem 2rem;
}

.loading h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #2563eb;
}

.loading p {
  font-size: 1.1rem;
  color: #4b5563;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.token-warning {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.token-warning p {
  color: #92400e;
  font-weight: 500;
  margin: 0;
  font-size: 0.95rem;
}

.modern-title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #2d3748;
  letter-spacing: 1px;
}
.context-box {
  background: #f0f4ff;
  padding: 0.9rem 1rem 1rem 1rem;
  border-left: 4px solid #2563eb;
  border-radius: 10px;
  font-size: 0.95rem;
  line-height: 1.35rem;
  color: #1e293b;
  margin-top: -0.5rem;
  margin-bottom: 1.2rem;
}
.modern-form {
  display: flex;
  gap: 0.7rem;
  margin-bottom: 1.5rem;
  background: #f5f7fa;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  box-shadow: 0 1px 4px #0001;
}
.modern-input {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  background: #fff;
  transition: border 0.2s;
}
.modern-input:focus {
  border: 1.5px solid #3182ce;
  outline: none;
}
.modern-btn {
  background: linear-gradient(90deg, #3182ce 60%, #63b3ed 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 2px 8px #3182ce22;
  transition: background 0.2s, box-shadow 0.2s;
}
.modern-btn:hover:not(:disabled) {
  background: linear-gradient(90deg, #2563eb 60%, #4299e1 100%);
  box-shadow: 0 4px 16px #3182ce33;
}
.modern-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}
.messages {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}
.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  background: linear-gradient(90deg, #f5f7fa 80%, #e3eafc 100%);
  border-radius: 14px;
  box-shadow: 0 1px 6px #0001;
  padding: 0.9rem 1.1rem;
  position: relative;
  border-left: 4px solid #3182ce33;
}
.message-bubble.off-topic {
  opacity: 0.75;
  border-left-color: #d97706;
  background: linear-gradient(90deg, #fff7ed 80%, #ffedd5 100%);
}
.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.2rem;
}
.author {
  font-weight: 600;
  color: #2563eb;
  font-size: 1.05rem;
}
.toxicity {
  color: #e53e3e;
  font-size: 0.92em;
  font-weight: 500;
  background: #fff5f5;
  border-radius: 6px;
  padding: 0.1em 0.5em;
  margin-left: 0.7em;
}
.flag-tag {
  color: #b45309;
  font-size: 0.82em;
  font-weight: 600;
  background: #fff7ed;
  border: 1px solid #fcd9b6;
  border-radius: 6px;
  padding: 0.15em 0.5em 0.2em;
  margin-left: 0.5em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.flag-explainer {
  margin-top: 0.4rem;
  font-size: 0.78rem;
  color: #92400e;
  background: #fff7ed;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid #fcd9b6;
}
.content {
  color: #2d3748;
  font-size: 1.08rem;
  line-height: 1.5;
  word-break: break-word;
}
</style>
