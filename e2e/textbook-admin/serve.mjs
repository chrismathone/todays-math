import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";

const here = (name) => fileURLToPath(new URL(name, import.meta.url));
const configFile = here("./vite.config.mts");
const outDir = ".tmp-admin-ui/textbook-browser-build";
const buildOptions = {
  outDir,
  emptyOutDir: true,
  rolldownOptions: { input: here("./index.html") },
};

// Finish compilation before Playwright's readiness probe succeeds. Dev dependency
// optimization can otherwise reload the first document during a test.
await build({ configFile, build: buildOptions });
// The product font only — `public/` holds gigabytes of figures and audio.
await mkdir(here(`../../${outDir}/fonts`), { recursive: true });
await copyFile(
  here("../../public/fonts/PretendardVariable.woff2"),
  here(`../../${outDir}/fonts/PretendardVariable.woff2`),
);
// The paper fonts — without them the browser cannot measure a section and every
// preview page reads «A network error occurred.» instead of the paper.
await mkdir(here(`../../${outDir}/textbook/editorial/fonts`), {
  recursive: true,
});
for (const weight of [400, 700])
  await copyFile(
    here(`../../public/textbook/editorial/fonts/NotoSansKR-${weight}.ttf`),
    here(`../../${outDir}/textbook/editorial/fonts/NotoSansKR-${weight}.ttf`),
  );
await preview({
  configFile,
  build: buildOptions,
  preview: { host: "127.0.0.1", port: 4322, strictPort: true },
});
