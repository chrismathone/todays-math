import { resolve } from "node:path";

// A checkout without dependencies can use the coordinator's installed binaries.
// This changes neither package metadata nor node_modules; no .env is loaded.
const deps = process.env.GEOMETRY_TRIANGLES_DEPS ?? process.cwd();
const config = {
  resolve: {
    alias: {
      "@": resolve("src"),
      vitest: resolve(deps, "node_modules/vitest/dist/index.js"),
      zod: resolve(deps, "node_modules/zod/index.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/unit/geometryTriangles.test.ts"],
    testTimeout: 60000,
  },
};
export default config;
