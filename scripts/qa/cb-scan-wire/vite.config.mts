import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL("../../..", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: { alias: { "@": `${root}/src` }, preserveSymlinks: true },
  server: {
    host: "127.0.0.1",
    port: 4247,
    strictPort: true,
    fs: { allow: [root, realpathSync(`${root}/node_modules`)] },
  },
});
