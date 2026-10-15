import path from "node:path";
const deps = "C:/Creative/testautocreator/node_modules";
export default {
  resolve: {
    alias: {
      "@": path.resolve("src"),
      vitest: path.join(deps, "vitest/dist/index.js"),
      fflate: path.join(deps, "fflate/esm/browser.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/__tests__/unit/arithmeticDimensionPresentation.test.ts"],
    testTimeout: 60000,
  },
};
