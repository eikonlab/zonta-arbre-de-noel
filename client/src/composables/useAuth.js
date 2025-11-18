import { ref, computed } from 'vue';

const ADMIN_LOGIN = import.meta.env.VITE_ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';

const isAuthenticated = ref(false);
const stayLoggedIn = ref(false);

// Check if user is already authenticated from localStorage
const checkStoredAuth = () => {
  const stored = localStorage.getItem('zonta_admin_auth');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.authenticated && data.expiry > Date.now()) {
        isAuthenticated.value = true;
        stayLoggedIn.value = data.stayLoggedIn || false;
        return true;
      } else {
        // Token expired
        localStorage.removeItem('zonta_admin_auth');
      }
    } catch (e) {
      localStorage.removeItem('zonta_admin_auth');
    }
  }
  return false;
};

// Initialize auth state
checkStoredAuth();

export function useAuth() {
  const login = (username, password, rememberMe = false) => {
    if (username === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      isAuthenticated.value = true;
      stayLoggedIn.value = rememberMe;

      // Store auth state
      const authData = {
        authenticated: true,
        stayLoggedIn: rememberMe,
        // 30 days for remember me, 24 hours otherwise
        expiry: Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      };
      localStorage.setItem('zonta_admin_auth', JSON.stringify(authData));

      return true;
    }
    return false;
  };

  const logout = () => {
    isAuthenticated.value = false;
    stayLoggedIn.value = false;
    localStorage.removeItem('zonta_admin_auth');
  };

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    stayLoggedIn: computed(() => stayLoggedIn.value),
    login,
    logout,
    checkStoredAuth
  };
}
