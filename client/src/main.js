import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Only use router for public mode
const mode = import.meta.env.VITE_APP_MODE || new URLSearchParams(window.location.search).get('mode') || 'public'
if (mode === 'public') {
  app.use(router)
}

app.mount('#app')
