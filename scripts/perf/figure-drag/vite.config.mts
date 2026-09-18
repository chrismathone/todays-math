import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 도형 편집기만 따로 띄우는 픽스처 — Next·DB·로그인 없이 편집기 컴포넌트를 브라우저에 올린다.
// `node scripts/perf/figure-drag/run.mjs` 가 이 설정으로 빌드(배포 React)하거나 dev 서버(--dev)를 연다.
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");

export default defineConfig({
  root: here,
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": path.join(repo, "src") } },
  css: { postcss: repo },
  build: {
    outDir: path.join(repo, "node_modules/.cache/figure-drag-dist"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
  },
  preview: { host: "127.0.0.1", port: 4179, strictPort: false },
  server: { host: "127.0.0.1", port: 4178, strictPort: false },
  logLevel: "warn",
});
