import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Pure, offline suite: do not import the project's loadEnv/setup configuration.
// envDir:false also prevents Vite's automatic .env loading. Run with env -i.
// No DB/auth/provider modules or paid APIs belong in this test process.
const root = fileURLToPath(new URL("../../../../../", import.meta.url));

export default defineConfig({
  root,
  envDir: false,
  resolve: { alias: { "@": `${root}src` } },
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/__tests__/unit/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: [],
    globals: false,
    css: false,
    testTimeout: 30000,
    maxWorkers: 1,
  },
});
