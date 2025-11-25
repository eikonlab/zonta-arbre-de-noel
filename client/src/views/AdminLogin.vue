<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Administration Zonta</h1>
        <p>Connexion à l'interface d'administration</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div class="form-group">
          <label for="username">Identifiant</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            required
            autofocus
            placeholder="Entrez votre identifiant"
          />
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Entrez votre mot de passe"
          />
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input v-model="rememberMe" type="checkbox" />
            <span>Rester connecté (30 jours)</span>
          </label>
        </div>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? "Connexion..." : "Se connecter" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuth } from "../composables/useAuth";

export default {
  name: "AdminLogin",
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { login } = useAuth();

    const username = ref("");
    const password = ref("");
    const rememberMe = ref(false);
    const error = ref("");
    const loading = ref(false);

    const handleLogin = async () => {
      error.value = "";
      loading.value = true;

      try {
        const success = login(username.value, password.value, rememberMe.value);

        if (success) {
          // Redirect to the original page or admin dashboard
          const redirect = route.query.redirect || "/admin";
          router.push(redirect);
        } else {
          error.value = "Identifiant ou mot de passe incorrect";
          password.value = "";
        }
      } catch (e) {
        error.value = "Une erreur est survenue lors de la connexion";
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      password,
      rememberMe,
      error,
      loading,
      handleLogin,
    };
  },
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url("/bg.png") #fdbc2e;
  background-size: cover;
  background-position: center;
  padding: 20px;
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(92, 51, 23, 0.3);
  width: 100%;
  max-width: 450px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  color: #5c3317;
  font-size: 2em;
  margin: 0 0 10px 0;
  font-weight: 700;
}

.login-header p {
  color: rgba(92, 51, 23, 0.7);
  margin: 0;
  font-size: 1.1em;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-message {
  background: #ffe6e6;
  color: #dc3545;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #dc3545;
  font-weight: 600;
  text-align: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: #5c3317;
  font-weight: 600;
  font-size: 1.05em;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  padding: 12px 16px;
  border: 2px solid rgba(92, 51, 23, 0.2);
  border-radius: 4px;
  font-size: 1.05em;
  transition: all 0.3s ease;
}

.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus {
  outline: none;
  border-color: #5c3317;
  box-shadow: 0 0 0 3px rgba(92, 51, 23, 0.1);
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 600;
  color: #5c3317;
  font-size: 1em;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1.2);
  cursor: pointer;
  accent-color: #5c3317;
}

.btn-login {
  padding: 14px 24px;
  background: #5c3317;
  color: #fdbc2e;
  border: none;
  border-radius: 4px;
  font-size: 1.1em;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(92, 51, 23, 0.4);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .login-card {
    padding: 30px 20px;
  }

  .login-header h1 {
    font-size: 1.75em;
  }
}
</style>
