import { build, preview } from "vite";
import { fileURLToPath } from "node:url";
const configFile = fileURLToPath(new URL("./vite.config.mts", import.meta.url));
const buildOptions = {
  outDir: ".tmp-admin-srs/browser-build",
  emptyOutDir: false,
  rolldownOptions: {
    input: fileURLToPath(new URL("./index.html", import.meta.url)),
  },
};
await build({ configFile, build: buildOptions });
await preview({
  configFile,
  build: buildOptions,
  preview: { host: "127.0.0.1", port: 4326, strictPort: true },
});
