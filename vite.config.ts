/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/hermes_console/bus_adapter.test.ts',
    ],
  },
})
