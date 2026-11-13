/** Compare the same browser facade against HEAD without a production build. */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const { build } = require(
  require.resolve("esbuild", { paths: [require.resolve("tsx")] }),
);
const changed = new Set([
  "src/lib/arithmetic-v2/presentation/index.ts",
  "src/lib/arithmetic-v2/presentation/typography.ts",
  "src/lib/arithmetic-v2/presentation/figureFirst.ts",
  "src/lib/arithmetic-v2/presentation/figureFirstTriangles.ts",
]);
const summary = {};
for (const baseline of [true, false]) {
  const name = baseline ? "baseline" : "current";
  const outfile = `scripts/qa/arithmetic-figure-quality/performance-${name}.mjs`;
  const result = await build({
    stdin: {
      contents: `import {figureFirstSvg} from './src/lib/arithmetic-v2/presentation/figureFirst';import {arithmeticGeometryDisplaySize} from './src/lib/arithmetic-v2/presentation';export {figureFirstSvg,arithmeticGeometryDisplaySize};`,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    minify: true,
    alias: { "@": resolve("src") },
    metafile: true,
    plugins: baseline
      ? [
          {
            name: "unchanged-head-baseline",
            setup(b) {
              b.onLoad({ filter: /\.ts$/ }, (args) => {
                const relative = args.path.slice(process.cwd().length + 1);
                if (changed.has(relative))
                  return {
                    contents: execFileSync(
                      "git",
                      [
                        "show",
                        `bd759237b84070b51fa444caf69e955bc574d026:${relative}`,
                      ],
                      { encoding: "utf8" },
                    ),
                    loader: "ts",
                  };
              });
            },
          },
        ]
      : [],
  });
  const bytes = readFileSync(outfile);
  summary[name] = {
    bytes: bytes.length,
    gzip: gzipSync(bytes).length,
    brotli: brotliCompressSync(bytes).length,
    topInputs: Object.entries(result.metafile.inputs)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, 8)
      .map(([path, m]) => ({ path, bytes: m.bytes })),
  };
}
writeFileSync(
  "docs/planning/tracks/reports/arithmetic-figure-quality-20261112/bundle-comparison.json",
  JSON.stringify(summary, null, 2),
);
console.log(summary);
