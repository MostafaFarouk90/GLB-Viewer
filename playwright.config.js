// Playwright runs the app straight from file:// URLs (no server), in Chromium only.
// Set PW_CHROMIUM_PATH to use a specific Chromium binary instead of Playwright's own download.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    acceptDownloads: true,
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      // WebGL in headless Chromium without a GPU
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
