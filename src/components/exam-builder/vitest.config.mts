import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/components/exam-builder/ExamBuilder.test.tsx"],
    testTimeout: 20000,
  },
});
