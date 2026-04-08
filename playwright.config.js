// @ts-check
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 120 * 1000,

  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.05 },
  },

  reporter: "html",

  use: {
    baseURL: process.env.BASE_URL,
    testIdAttribute: "data-id",
    screenshot: "on",
    trace: "on-first-retry",
    video: "on-first-retry",
    ignoreHTTPSErrors: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.js/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
