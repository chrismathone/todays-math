import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Offline UI checks: do not load project environment files or contact services.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  resolve: { alias: { "@": path.resolve("src") } },
  cacheDir: ".qa-artifacts/math-insight-ui-tests",
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/__tests__/components/LearningInsightPanel*.test.tsx",
      "src/__tests__/components/CourseDashboard.test.tsx",
      "src/__tests__/components/AutoGrowTextarea.test.tsx",
      "src/__tests__/components/EnglishEditor*.test.tsx",
      "src/__tests__/components/EnglishMakerView.test.tsx",
      "src/__tests__/components/ExamReportWorkspace.test.tsx",
      "src/__tests__/components/learningInsightApi*.test.ts",
    ],
    maxWorkers: 1,
    testTimeout: 20_000,
    css: false,
  },
});
