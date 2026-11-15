import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.browser.spec.ts',
  workers: 1,
  timeout: 45000,
  use: { baseURL: process.env.TEST_APP_URL ?? 'http://localhost:3105', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
