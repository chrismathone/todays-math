import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export const PORT = 4322;
export const aliases = [
  { find: "next/navigation", replacement: local("./navigation.ts") },
  { find: "next/image", replacement: local("./image.tsx") },
  { find: "@", replacement: local("../../src") },
];

export default defineConfig({
  root: local("../.."),
  // `public/` 은 그림 · 음원으로 매우 크다. 통째로 복사하지 않고 serve.mjs 가 글꼴 하나만 옮긴다.
  publicDir: false,
  plugins: [react()],
  resolve: { alias: aliases },
  optimizeDeps: { entries: [local("./index.html")] },
  server: { host: "127.0.0.1", port: PORT, strictPort: true },
  envDir: false,
});
