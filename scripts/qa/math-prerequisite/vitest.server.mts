import { defineConfig } from "vitest/config";

// Deliberately opt-in: this persistent, isolated fixture never runs with npm test.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["scripts/qa/math-prerequisite/server.test.ts"],
    testTimeout: 3_600_000,
    server: { deps: { inline: ["next-auth"] } },
  },
});
