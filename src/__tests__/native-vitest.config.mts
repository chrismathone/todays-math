// Pure wave-C run: do not read .env, use the application test setup, connect to DB or call paid APIs.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  envDir: false,
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["src/__tests__/native-pure.setup.ts"],
    css: false,
    testTimeout: 30_000,
    include: [
      "src/__tests__/unit/nativeDescriptive20261018*.test.{ts,tsx}",
      "src/__tests__/unit/verifiedEngineBatch.test.ts",
      "src/__tests__/unit/nativeMultipleChoicePolicy20261018.test.ts",
      "src/__tests__/unit/{loadComboRows,loadJudgeRows,unloadedTypes,engineVariants}.test.ts",
    ],
  },
});
