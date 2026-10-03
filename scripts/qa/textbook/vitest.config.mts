import { defineConfig } from "vitest/config";
// These deterministic Node and real Chromium tests intentionally have no browser-UI
// MSW setup. All PDF browser requests are intercepted by the production renderer.
export default defineConfig({ resolve: { tsconfigPaths: true }, test: { environment: "node", include: ["src/__tests__/unit/textbook*.test.ts", "src/__tests__/unit/conceptBlankExactPick.test.ts"], testTimeout: 20_000, fileParallelism: false } });
