import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Resolve the installed runner at its own location; no worktree node_modules link.
const require = createRequire(process.argv[1]);
const config = {
  resolve: {
    alias: {
      "@": join(process.cwd(), "src"),
      zod: require.resolve("zod"),
      vitest: join(dirname(require.resolve("vitest")), "dist/index.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/unit/geometryMeasure*.test.ts"],
    testTimeout: 30000,
  },
};
export default config;
