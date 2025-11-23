<template>
  <div class="container">
    <div class="lang-switcher">
      <button
        @click="setLanguage('fr')"
        :class="{ active: currentLanguage === 'fr' }"
        class="lang-btn"
      >
        FR
      </button>
      <span class="separator">|</span>
      <button
        @click="setLanguage('de')"
        :class="{ active: currentLanguage === 'de' }"
        class="lang-btn"
      >
        DE
      </button>
    </div>

    <div v-if="!hasValidToken && !tokenChecked" class="loading">
      <h1>{{ t.verifying }}</h1>
      <p>{{ t.validatingToken }}</p>
    </div>

    <div v-else-if="messageSent" class="confirmation">
      <h1>{{ t.messageSent }}</h1>
      <p>{{ t.messagePublished }}</p>
      <p class="thank-you">{{ t.thankYou }}</p>
    </div>

    <div v-else class="form-container">
      <div v-if="!hasValidToken && tokenChecked" class="token-warning">
        <p>{{ t.tokenExpired }}</p>
      </div>

      <p class="context-box">
        {{ t.context }}
        <a href="https://www.victimepasseule.ch/">{{ t.associationName }}</a>
      </p>
      <form class="modern-form" @submit.prevent="sendMessage">
        <input
          v-model="author"
          class="modern-input"
          :placeholder="t.yourName"
          required
        />
        <div class="textarea-wrapper">
          <textarea
            v-model.trim="content"
            class="modern-input modern-textarea"
            :placeholder="t.yourMessage"
            rows="4"
            maxlength="140"
            required
          ></textarea>
          <div
            class="char-counter"
            :class="{
              warning: remainingChars < 20,
              danger: remainingChars < 10,
            }"
          >
            {{ remainingChars }} / {{ maxLength }}
          </div>
        </div>
        <button
          type="submit"
          class="modern-btn"
          :disabled="!hasValidToken || sending"
        >
          <span v-if="sending">{{ t.sending }}</span>
          <span v-else>{{ hasValidToken ? t.send : t.rescanQR }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";
import { useLanguage } from "../composables/useLanguage";

const { t, currentLanguage, setLanguage, initLanguage } = useLanguage();

const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const author = ref("");
const content = ref("");
const hasValidToken = ref(false);
const tokenChecked = ref(false);
const messageSent = ref(false);
const sending = ref(false);

// Character counter
const maxLength = 140;
const remainingChars = computed(() => maxLength - content.value.length);

// Initialize language
initLanguage();

// Set page title
watch(
  t,
  () => {
    document.title = t.value.pageTitle;
  },
  { immediate: true }
);

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
    alert(t.value.alertTokenInvalid);
    return;
  }

  if (content.value.length > maxLength) {
    alert(t.value.alertLengthExceeded.replace("{maxLength}", maxLength));
    return;
  }

  if (sending.value) return;
  sending.value = true;

  try {
    const { data } = await axios.post(`${API_URL}/messages`, {
      author: author.value,
      content: content.value,
    });
    messageSent.value = true;
  } catch (error) {
    console.error("Error sending message:", error);
    if (error.response?.status === 429) {
      alert(error.response.data.error || t.value.alertAlreadyPosted);
    } else if (
      error.response?.status === 400 &&
      error.response.data.error?.includes("140")
    ) {
      alert(error.response.data.error);
    } else {
      alert(t.value.alertError);
    }
  } finally {
    sending.value = false;
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: url("/bg.jpg") #fdbc2e;
  background-size: cover;
  background-position: center;
  padding: 2rem;
  overscroll-behavior: none;
  touch-action: pan-y;
  position: relative;
}

.lang-switcher {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(92, 51, 23, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 10;
}

.lang-btn {
  background: none;
  border: none;
  font-weight: 600;
  color: #5c3317;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.2s;
}

.lang-btn:hover {
  opacity: 1;
  background: rgba(92, 51, 23, 0.1);
}

.lang-btn.active {
  opacity: 1;
  background: #5c3317;
  color: #fdbc2e;
}

.separator {
  color: #5c3317;
  opacity: 0.3;
}

a {
  color: inherit;
}

.form-container {
  max-width: 600px;
  width: 100%;
  background: white;
  padding: 2.5rem;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.access-denied {
  text-align: center;
  padding: 3rem 2rem;
  background: white;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.access-denied h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #5c3317;
}

.access-denied p {
  font-size: 1.1rem;
  color: #5c3317;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.loading {
  text-align: center;
  padding: 3rem 2rem;
  background: white;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
}

.loading h1 {
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #5c3317;
}

.loading p {
  font-size: 1.1rem;
  color: #5c3317;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.confirmation {
  text-align: center;
  padding: 4rem 3rem;
  background: #ffffff55;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  max-width: 600px;
}

.confirmation h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #5c3317;
}

.confirmation p {
  font-size: 1.2rem;
  color: #5c3317;
  margin-bottom: 1rem;
  line-height: 1.8;
}

.confirmation .thank-you {
  font-size: 1.4rem;
  font-weight: 600;
  margin-top: 2rem;
  color: #5c3317;
}

.token-warning {
  background: #fff3cd;
  border: 2px solid #5c3317;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.2);
}

.token-warning p {
  color: #5c3317;
  font-weight: 600;
  margin: 0;
  font-size: 1rem;
}

.modern-title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: #5c3317;
  letter-spacing: 1px;
}

.context-box {
  background: rgba(92, 51, 23, 0.05);
  padding: 1.5rem;
  border-left: 4px solid #5c3317;
  font-size: 1rem;
  line-height: 1.6rem;
  color: #5c3317;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(92, 51, 23, 0.1);
}

.modern-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modern-input {
  flex: 1;
  padding: 1rem 1.25rem;
  border: 2px solid rgba(92, 51, 23, 0.2);
  font-size: 1rem;
  background: #fff;
  transition: border 0.2s, box-shadow 0.2s;
  color: #5c3317;
  border-radius: 12px;
}

.modern-input::placeholder {
  color: rgba(92, 51, 23, 0.5);
}

.modern-input:focus {
  border: 2px solid #5c3317;
  outline: none;
  box-shadow: 0 0 0 3px rgba(92, 51, 23, 0.1);
}

.modern-textarea {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.textarea-wrapper {
  position: relative;
}

.char-counter {
  text-align: right;
  font-size: 0.875rem;
  color: rgba(92, 51, 23, 0.6);
  margin-top: 0.25rem;
  font-weight: 500;
}

.char-counter.warning {
  color: #d97706;
}

.char-counter.danger {
  color: #dc2626;
  font-weight: 600;
}

.modern-btn {
  border-radius: 12px;
  background: #5c3317;
  color: #fdbc2e;
  border: none;
  padding: 1rem 2rem;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(92, 51, 23, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.modern-btn:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.4);
}

.modern-btn:disabled {
  background: rgba(92, 51, 23, 0.4);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.page-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #5c3317;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid #5c3317;
}

@media (max-width: 640px) {
  .container {
    padding: 0;
    background-color: transparente;
  }

  .context-box {
    background: white;
  }

  .form-container {
    background: none;
  }

  .form-container,
  .loading,
  .confirmation,
  .access-denied {
    padding: 5rem 1.5rem 2rem;
    box-shadow: none;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    border-radius: 0;
  }

  .context-box {
    padding: 1rem;
    font-size: 0.95rem;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .modern-btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .lang-switcher {
    top: 1.5rem;
    right: 1.5rem;
    background: white; /* Use brand color for visibility on white */
  }

  .lang-btn.active {
    background: #5c3317;
    color: #fdbc2e;
  }
}
</style>
