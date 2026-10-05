import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // Other Orca workers share the dependency junction, but not this Vite cache.
  cacheDir: fileURLToPath(
    new URL("../../.tmp-source-math-vite", import.meta.url),
  ),
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) },
  },
  server: {
    host: "127.0.0.1",
    port: 4249,
    strictPort: true,
    fs: {
      allow: [
        fileURLToPath(new URL("../..", import.meta.url)),
        realpathSync(
          fileURLToPath(new URL("../../node_modules", import.meta.url)),
        ),
      ],
    },
  },
});
