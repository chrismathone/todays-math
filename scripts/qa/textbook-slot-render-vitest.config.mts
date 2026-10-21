import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 교과서 그림 행 전수 렌더 점검(`textbookSlotRender.sweep.test.tsx`) 전용 — 행은 저장소 밖 파일에서 읽는다.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "node",
    include: ["scripts/qa/textbookSlotRender.sweep.test.tsx"],
    exclude: ["**/._*"],
    css: false,
    testTimeout: 600_000,
  },
});
