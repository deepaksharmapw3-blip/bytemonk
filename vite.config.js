import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import socialMeta from './vite-plugins/social-meta.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), socialMeta(env.VITE_SITE_URL)],
  }
})
