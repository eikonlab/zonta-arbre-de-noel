import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Always use router for all modes
app.use(router)

app.mount('#app')

// Register service worker for PWA and push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}
