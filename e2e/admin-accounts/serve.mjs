import { build, preview } from "vite";
import { fileURLToPath } from "node:url";

const configFile = fileURLToPath(new URL("./vite.config.mts", import.meta.url));
const buildOptions = {
  outDir: ".tmp-admin-ui/browser-build",
  emptyOutDir: false,
  rolldownOptions: {
    input: fileURLToPath(new URL("./index.html", import.meta.url)),
  },
};
// Finish compilation before Playwright's readiness probe succeeds. Dev dependency
// optimization can otherwise reload the first document preview during a test.
await build({ configFile, build: buildOptions });
await preview({
  configFile,
  build: buildOptions,
  preview: { host: "127.0.0.1", port: 4318, strictPort: true },
});
