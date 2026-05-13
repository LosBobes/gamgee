import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;
const HOST = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: HOST,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // PLAYWRIGHT_CHROMIUM_EXECUTABLE lets CI reuse a pre-installed chromium
        // binary instead of having Playwright try to download a perfectly-matching
        // headless shell at test time.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
          : undefined,
      },
    },
  ],
  webServer: {
    // Vite proxies /api/* to BACKEND_URL — point it at a port no one is on
    // so we can intercept every request from inside the tests with page.route.
    command: "pnpm run dev -- --host 127.0.0.1 --port " + PORT + " --strictPort",
    url: HOST,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { BACKEND_URL: "http://127.0.0.1:1" },
  },
});
