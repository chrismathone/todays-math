import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/app/dev/exam-builder-output/*.test.{ts,tsx}"],
    testTimeout: 20_000,
  },
});
