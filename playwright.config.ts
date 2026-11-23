import { defineConfig } from "@playwright/test";
import path from "node:path";
import { randomBytes } from "node:crypto";
const databasePath = (process.env.E2E_DATABASE_PATH ||= path.join(
  process.cwd(),
  "data",
  `e2e-${Date.now()}.db`,
));
process.env.DATABASE_PATH = databasePath;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx tsx scripts/e2e-server.ts",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PATH: databasePath,
      UPLOADS_PATH: databasePath.replace(/\.db$/, "-uploads"),
      APP_ORIGIN: "http://localhost:3100",
      SESSION_SECRET: randomBytes(48).toString("base64url"),
      SECURE_COOKIES: "false",
      DEMO_MODE: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
