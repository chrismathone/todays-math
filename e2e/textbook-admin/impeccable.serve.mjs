import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

const here = (name) => fileURLToPath(new URL(name, import.meta.url));
const configFile = here("./impeccable.vite.config.mts");
const buildOptions = {
  outDir: "test-results/impeccable-textbook-build",
  emptyOutDir: true,
  rolldownOptions: { input: here("./index.html") },
};
// Readiness follows compilation; the first test does not pay a dev transform waterfall.
await build({ configFile, build: buildOptions });
await mkdir(here("../../test-results/impeccable-textbook-build/fonts"), {
  recursive: true,
});
await copyFile(
  here("../../public/fonts/PretendardVariable.woff2"),
  here(
    "../../test-results/impeccable-textbook-build/fonts/PretendardVariable.woff2",
  ),
);
await preview({
  configFile,
  build: buildOptions,
  preview: { host: "127.0.0.1", port: 4335, strictPort: true },
});
