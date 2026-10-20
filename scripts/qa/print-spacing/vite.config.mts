import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));
export default defineConfig({
  root: local("."),
  publicDir: local("../../../public"),
  plugins: [react()],
  resolve: { alias: { "@": local("../../../src") } },
  server: {
    host: "127.0.0.1",
    port: 3124,
    strictPort: true,
    fs: {
      allow: [local("../../.."), realpathSync(local("../../../node_modules"))],
    },
  },
});
