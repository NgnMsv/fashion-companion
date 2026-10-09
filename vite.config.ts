import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { staticPages } from './build/static-pages.ts'

export default defineConfig({
  // The app is a "project site": GitHub Pages serves a repository named
  // fashion-companion at https://<user>.github.io/fashion-companion/, so every
  // asset URL and route needs that prefix.
  base: '/fashion-companion/',
  plugins: [react(), tailwindcss(), staticPages(['wardrobe', 'style', 'about'])],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
