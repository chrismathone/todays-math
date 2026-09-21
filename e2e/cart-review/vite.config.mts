import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));

/*
 * 담은 문항 화면(트랙 41 조사 · 트랙 44 구현). studio-ai 하네스와 같은 짜임이지만 포트를 따로 쓴다 —
 * 4187 은 작업실 e2e 가 strictPort 로 잡는다. 다른 세션이 그 시험을 돌리는 중에도
 * 이 화면을 띄울 수 있게 4193 으로 둔다.
 *
 * `index.html` 은 **진짜 `UnifiedWorkspace`** 를 띄운다(트랙 44) — `next/*` 셋과 로그인 모듈 둘
 * (`next-auth/react`·`@/app/actions/auth`)만 대역으로 바꾼다.
 */
export default defineConfig({
  root: local("."),
  plugins: [react()],
  resolve: {
    alias: [
      { find: "next/dynamic", replacement: local("./next-dynamic.tsx") },
      { find: "next/navigation", replacement: local("./next-navigation.ts") },
      { find: "next/link", replacement: local("./next-link.tsx") },
      { find: "next-auth/react", replacement: local("./next-auth-react.ts") },
      { find: "@/app/actions/auth", replacement: local("./auth-action.ts") },
      { find: "@", replacement: local("../../src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 4193,
    strictPort: true,
    fs: {
      allow: [
        local("../.."),
        realpathSync(local("../../node_modules")),
      ],
    },
  },
});
