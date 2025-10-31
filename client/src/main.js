import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Always use router for all modes
app.use(router)

app.mount('#app')
