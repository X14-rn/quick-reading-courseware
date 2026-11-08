import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: '*.spec.js', use: { browserName: 'chromium', channel: process.env.PLAYWRIGHT_CHANNEL || undefined, headless: true }, webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30000 } });
