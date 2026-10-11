import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cloudlab/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)),
      '@cloudlab/shared-auth': fileURLToPath(new URL('../../packages/shared-auth/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
