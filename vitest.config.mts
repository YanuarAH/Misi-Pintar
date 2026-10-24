import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DB = "postgres://misi_app:misi_app_dev@127.0.0.1:5433/misi_pintar_test";
const TEST_ADMIN_DB = "postgres://postgres@127.0.0.1:5433/misi_pintar_test";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? TEST_DB,
      ADMIN_DATABASE_URL: process.env.TEST_ADMIN_DATABASE_URL ?? TEST_ADMIN_DB,
      NODE_ENV: "test",
    },
  },
});
