import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const appMode = process.env.VITE_APP_MODE || 'public'

  const portMap = {
    public: 5173,
    admin: 5174,
    qr: 5175
  }

  return {
    plugins: [vue()],
    server: {
      port: portMap[appMode] || 3000,
      host: true
    },
    define: {
      __APP_MODE__: JSON.stringify(appMode)
    }
  }
})
