import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 개념 백지 지면 하네스 — 다른 하네스와 같은 꾸밈. 포트만 다르다(다른 세션의 하네스와 겹치지 않게).
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../src", import.meta.url)),
      // The builder also imports Next links; this print harness has no Next router.
      "next/link": fileURLToPath(
        new URL("../admin-accounts/link.tsx", import.meta.url),
      ),
    },
    // 워크트리의 `node_modules` 는 흔히 main 으로 가는 정션이다. 정션을 풀어 읽으면 KaTeX 글꼴의 주소가 `/@fs/D:/…` 가 되는데,
    // Vite 는 윈도우에서 `/@fs/` 의 드라이브 글자를 떼고 **서버가 선 드라이브**에서 찾는다 — 워크트리가 C: 면 글꼴 대신 index.html 이
    // 200 으로 온다(대체 글꼴로 재게 된다 · `measure.ts` 의 수식 글꼴 가드가 운다). 정션을 풀지 않으면 주소가 워크트리 안에 머문다.
    preserveSymlinks: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4233,
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
