import path from "node:path";
import { defineConfig } from "vitest/config";

const testDb = process.env.TEST_DATABASE_URL ?? "postgres://stayly:stayly@localhost:5432/stayly_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside React Server bundles; tests run services directly.
      "server-only": path.resolve(import.meta.dirname, "test/empty.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDb,
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-1234",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      UPLOAD_DIR: "./data/test-uploads",
      TAX_RATE: "0.12",
      APP_TIMEZONE: "UTC",
      // Fake credentials: tests only build the Google authorization URL, nothing calls Google.
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    },
  },
});
