import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 8080);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "bun run build && bunx vite preview --port " + PORT,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});