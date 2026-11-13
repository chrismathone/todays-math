import { createRequire } from "node:module";
import { resolve } from "node:path";
const { build } = createRequire(import.meta.url)(
  createRequire(import.meta.url).resolve("esbuild", {
    paths: [createRequire(import.meta.url).resolve("tsx")],
  }),
);
await build({
  entryPoints: ["scripts/qa/arithmetic-figure-quality/production.tsx"],
  outfile: "scripts/qa/arithmetic-figure-quality/production-runtime.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  alias: { "@": resolve("src") },
  loader: { ".css": "local-css" },
  logLevel: "warning",
});
