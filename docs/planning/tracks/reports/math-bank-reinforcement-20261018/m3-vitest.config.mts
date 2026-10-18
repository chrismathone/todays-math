/**
 * Pure local Vitest: do not import repository vitest.config/setup, loadEnv,
 * dotenv, DB, auth, paid API, or Next's environment loader.
 * envDir:false stops Vite's automatic .env discovery too.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  resolve: {
    alias: {
      "@": path.resolve("src"),
      vitest: path.resolve("node_modules/vitest/dist/index.js"),
    },
  },
  test: {
    environment: "node",
    setupFiles: [],
    include: ["src/__tests__/unit/m3Reinforcement20261018.test.tsx"],
    testTimeout: 60000,
    css: false,
  },
});
