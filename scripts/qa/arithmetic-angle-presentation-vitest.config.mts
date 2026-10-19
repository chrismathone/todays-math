import path from "node:path";
import { fileURLToPath } from "node:url";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
export default {
  resolve: {
    alias: {
      "@": path.join(workspace, "src"),
      vitest: path.resolve("node_modules/vitest/dist/index.js"),
      fflate: path.resolve("node_modules/fflate/esm/index.mjs"),
    },
  },
  test: {
    environment: "node",
    include: [
      path
        .join(
          workspace,
          "src/__tests__/unit/arithmeticAnglePresentation.test.ts",
        )
        .replaceAll("\\", "/"),
    ],
    testTimeout: 30000,
  },
};
