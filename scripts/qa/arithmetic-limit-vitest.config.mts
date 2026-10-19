import path from "node:path";
import { fileURLToPath } from "node:url";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const config = {
  resolve: {
    alias: {
      "@": path.join(workspace, "src"),
      vitest: path.resolve("node_modules/vitest/dist/index.js"),
      fflate: path.resolve("node_modules/fflate/esm/index.mjs"),
      "@prisma/client": path.resolve("node_modules/@prisma/client/default.js"),
      zod: path.resolve("node_modules/zod/index.js"),
      "server-only": path.resolve("node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: [
      ...[
        "arithmeticRoundSelection",
        "arithmeticRoundLimits",
        "arithmeticByteBudget",
        "arithmeticQuantity",
        "arithmeticRegeneration",
        "arithmeticGeometryPack",
        "arithmeticEngine",
        "arithmeticV2Core",
        "arithmeticV2Compatibility",
      ].map((name) =>
        path
          .join(workspace, `src/__tests__/unit/${name}.test.ts`)
          .replaceAll("\\", "/"),
      ),
      ...[
        "workspaceArithmetic",
        "workspaceArithmeticV2",
        "workspaceArithmeticRegeneration",
        "branchLibrary",
      ].map((name) =>
        path
          .join(workspace, `src/__tests__/api/${name}.test.ts`)
          .replaceAll("\\", "/"),
      ),
    ],
    testTimeout: 60000,
  },
};
export default config;
