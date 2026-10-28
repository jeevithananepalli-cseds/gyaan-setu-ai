import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// The tests run against the production build, because the service worker
// (and so offline mode) only exists there. Run `npm run build` first.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Each test registers and caches the whole app (about 10 MB) in a fresh
  // browser, which can take close to a minute with three running at once.
  timeout: 120_000,
  // Each test caches the whole app in a fresh browser; more workers than this
  // starve each other on a laptop or a CI runner.
  workers: 3,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure"
  },

  // Set PW_CHANNEL=msedge (or chrome) to use a browser already installed on
  // the machine instead of the one from `npx playwright install chromium`.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined }
    }
  ],

  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI
  }
});
