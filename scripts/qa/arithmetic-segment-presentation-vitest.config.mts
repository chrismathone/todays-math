import { resolve } from "node:path";
const deps = process.env.GEOMETRY_TRIANGLES_DEPS ?? process.cwd();
const config = {
  resolve: {
    alias: {
      "@": resolve("src"),
      vitest: resolve(deps, "node_modules/vitest/dist/index.js"),
      fflate: resolve(deps, "node_modules/fflate/lib/index.cjs"),
      zod: resolve(deps, "node_modules/zod/index.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/unit/arithmeticSegmentPresentation.test.ts"],
    testTimeout: 60000,
  },
};

export default config;
