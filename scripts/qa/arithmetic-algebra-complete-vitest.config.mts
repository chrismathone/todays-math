import path from "node:path";
import { fileURLToPath } from "node:url";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const config = {
  resolve: {
    alias: {
      "@": path.join(workspace, "src"),
      vitest: path.resolve("node_modules/vitest/dist/index.js"),
      fflate: path.resolve("node_modules/fflate/esm/index.mjs"),
      zod: path.resolve("node_modules/zod/index.js"),
    },
  },
  test: {
    environment: "node",
    include: [
      path
        .join(workspace, "src/__tests__/unit/arithmeticAlgebraComplete.test.ts")
        .replaceAll("\\", "/"),
    ],
    testTimeout: 60000,
  },
};
export default config;
