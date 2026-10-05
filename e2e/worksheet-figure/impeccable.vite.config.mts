import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import base from "./vite.config.mts";

export default defineConfig({
  ...base,
  cacheDir: fileURLToPath(
    new URL("../../test-results/vite-impeccable-paper", import.meta.url),
  ),
});
