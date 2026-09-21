import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * 담은 문항 시안 화면(트랙 41). studio-ai 하네스와 같은 짜임이지만 포트를 따로 쓴다 —
 * 4187 은 작업실 e2e 가 strictPort 로 잡는다. 다른 세션이 그 시험을 돌리는 중에도
 * 이 화면을 띄울 수 있게 4193 으로 둔다.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) },
  },
  server: {
    host: "127.0.0.1",
    port: 4193,
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
