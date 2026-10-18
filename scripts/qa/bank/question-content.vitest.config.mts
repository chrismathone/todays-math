import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: [
      "scripts/qa/bank/math-question-repair.test.ts",
      "scripts/qa/bank/math-question-reinforcement.test.ts",
    ],
    testTimeout: 60_000,
  },
});
