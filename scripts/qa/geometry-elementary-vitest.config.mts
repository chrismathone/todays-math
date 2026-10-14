// Run from the checkout that owns node_modules, with this config's absolute path.
// Does not load env files, app setup, UI, registry, database or shared figure packs.
import path from "node:path";
import { fileURLToPath } from "node:url";
const workspace = fileURLToPath(new URL("../../", import.meta.url));
const config = {
  resolve: {
    alias: { vitest: path.resolve("node_modules/vitest/dist/index.js") },
  },
  test: {
    environment: "node",
    include: [
      path
        .join(workspace, "src/__tests__/unit/geometryElementary.test.ts")
        .replaceAll("\\", "/"),
    ],
    testTimeout: 30000,
  },
};
export default config;
