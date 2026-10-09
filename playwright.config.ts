import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build (`vite preview`), so they
// exercise the same files that GitHub Pages serves.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4174/fashion-companion/',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4174/fashion-companion/',
    reuseExistingServer: !process.env.CI,
  },
})
