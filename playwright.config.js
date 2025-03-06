import { defineConfig } from '@playwright/test';

// Base configuration to share between projects
const baseConfig = {
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    baseURL: process.env.TEST_ENV === 'local'
      ? 'http://localhost:3000'
      : 'https://staging-turbo-eureka.surge.sh',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Add viewport config for consistent testing
    viewport: { width: 1280, height: 720 }
  }
};

// Dev server config for local testing
const localDevServer = process.env.TEST_ENV === 'local'
  ? {
      command: 'npm run serve:parcel',
      port: 3000,
      reuseExistingServer: true,
      timeout: 60000 // Longer timeout for initial server startup
    }
  : undefined;

// Configuration for Playwright
export default defineConfig({
  ...baseConfig,
  testDir: './tests',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' }
    }
  ],
  webServer: localDevServer
});
