/**
 * 판정형 지면 하네스 — 제품의 지면 컴포넌트를 Next · `.env` 없이 Chromium 으로 띄운다(`measure.mjs` 머리말).
 * `next/link` 만 대역으로 바꾼다. 표본 JSON 은 저장소 밖(`.qa-artifacts/judge-paper/public/`)에서 읽는다.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  root: local("."),
  publicDir: local("../../../.qa-artifacts/judge-paper/public"),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "next/link", replacement: local("./next-link.tsx") },
      { find: "@", replacement: local("../../../src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4237,
    strictPort: true,
    // 정션으로 걸린 node_modules 도 읽게 한다 — 안 그러면 KaTeX 글꼴 대신 index.html 이 200 으로 온다(2026-10-03).
    fs: {
      allow: [local("../../.."), realpathSync(local("../../../node_modules"))],
    },
  },
});
