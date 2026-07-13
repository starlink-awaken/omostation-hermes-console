/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const cockpitApiTarget = process.env.VITE_COCKPIT_API_TARGET || 'http://localhost:8090'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: cockpitApiTarget,
        changeOrigin: true,
        headers: {
          'X-API-Key': '38333c9a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2'
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/hermes_console/bus_adapter.test.ts',
    ],
  },
})
