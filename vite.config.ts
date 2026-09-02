/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        headers: {
          'X-API-Key': process.env.VITE_API_KEY || ''
        }
      }
    }
  },
    test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/hermes_console/bus_adapter.test.ts',
    ],
  },
})
