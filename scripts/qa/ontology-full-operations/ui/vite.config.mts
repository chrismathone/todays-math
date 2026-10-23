import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/postcss";
export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.resolve("public"),
  resolve: { alias: { "@": path.resolve("src") } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: "127.0.0.1", port: 4318, strictPort: true, fs: { allow: [process.cwd()] } },
});
