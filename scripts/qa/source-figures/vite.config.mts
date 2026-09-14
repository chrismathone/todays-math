import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: fileURLToPath(
    new URL("../../../.tmp-source-figures/vite", import.meta.url),
  ),
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  server: {
    host: "127.0.0.1",
    port: 4327,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] },
  },
});
