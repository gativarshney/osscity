import { defineConfig, devices } from "@playwright/test";

/**
 * One end-to-end run against a production build. The city feed comes from a local
 * fixture server so the test does not depend on the network.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/fixture-server.mjs",
      url: "http://127.0.0.1:3101/index.json",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "npm run build && npx next start -p 3100",
      url: "http://127.0.0.1:3100/api/city",
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        CONTRIBUTABLE_DATA_URL: "http://127.0.0.1:3101",
        CONTRIBUTABLE_API_URL: "http://127.0.0.1:3101/api/v1",
      },
    },
  ],
});
