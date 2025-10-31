import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const appMode = process.env.VITE_APP_MODE || 'public'

  const portMap = {
    public: 3000,
    admin: 3001,
    qr: 3002
  }

  return {
    plugins: [vue()],
    server: {
      port: portMap[appMode] || 3000,
      host: true
    },
    define: {
      __APP_MODE__: JSON.stringify(appMode)
    },
    envPrefix: 'VITE_'
  }
})
