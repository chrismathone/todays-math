import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  envDir: false,
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/components/exam-builder/ExamBuilder.test.tsx",
      "src/components/exam-builder/SavedConditions.test.tsx",
      "src/components/exam-builder/ExamBuilder.h2.test.tsx",
      "src/components/exam-builder/ExamBuilder.demand.test.tsx",
      "src/components/exam-builder/PickerDemand.test.tsx",
      "src/__tests__/components/QuestionFormatsUI.test.tsx",
      "src/__tests__/components/WorkspaceBankMetadata.test.tsx",
      "src/__tests__/components/ExamAnswerPanel.test.tsx",
      "src/__tests__/components/ArithmeticWorkbench.test.tsx",
      "src/__tests__/components/ArithmeticWorkbenchRouting.test.tsx",
      "src/__tests__/unit/mathExamBuilderSource.test.ts",
      "src/__tests__/unit/examReviewSort.test.ts",
      "src/__tests__/unit/examComposeConditions.test.ts",
      "src/__tests__/unit/examConditionContract.test.ts",
      "src/__tests__/unit/exportPerMenu.test.ts",
      "src/__tests__/unit/englishExamBuilder.test.ts",
      "src/__tests__/api/examBuilderConditions.test.ts",
      "src/__tests__/api/examBuilderFamilyRule.test.ts",
      "src/__tests__/api/examBuilderReplace.test.ts",
      "src/__tests__/api/examConditions.test.ts",
    ],
    testTimeout: 20000,
  },
});
