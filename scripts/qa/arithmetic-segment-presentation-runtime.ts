/** Prove the synchronous adapter works in a browser without Node or MathJax. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { build, normalizePath } from "vite";
import { chromium } from "playwright";
import type { SegmentPlan } from "./arithmetic-segment-presentation-model";

async function main() {
  const out = path.resolve("tmp/arithmetic-segment-presentation"),
    require = createRequire(import.meta.url);
  const browserDependency = normalizePath(
    path.resolve(require.resolve("fflate"), "../../esm/browser.js"),
  );
  const bundled = await build({
    configFile: false,
    logLevel: "error",
    plugins: [
      {
        name: "segment-existing-browser-dependency",
        enforce: "pre",
        resolveId: (id) => (id === "fflate" ? browserDependency : undefined),
      },
    ],
    build: {
      write: false,
      minify: true,
      lib: {
        entry: path.resolve("src/lib/arithmetic-v2/presentation/segments.ts"),
        name: "ArithmeticSegments",
        formats: ["iife"],
      },
    },
  });
  const outputs = Array.isArray(bundled)
      ? bundled.flatMap((r) => r.output)
      : "output" in bundled
        ? bundled.output
        : [],
    code = outputs.find((o) => o.type === "chunk")?.code;
  assert.ok(code);
  assert.doesNotMatch(
    code,
    /mathjax-full|node:|require\(|DOMParser|child_process/,
  );
  await writeFile(path.join(out, "browser.js"), code);
  const plans = JSON.parse(
    await readFile(path.join(out, "plans.json"), "utf8"),
  ) as SegmentPlan[];
  const displays = JSON.parse(
    await readFile(path.join(out, "displays.json"), "utf8"),
  ) as Record<string, string>;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setContent("<html><body></body></html>");
    await page.addScriptTag({ content: code });
    for (let i = 0; i < plans.length; i += 80) {
      const batch = plans
        .slice(i, i + 80)
        .map((p) => ({ id: p.id, source: p.source, display: displays[p.id] }));
      const result = await page.evaluate((rows) => {
        const adapter = (
          window as unknown as {
            ArithmeticSegments: {
              presentArithmeticSegmentSvg: (
                id: string,
                s: string,
              ) => string | undefined;
            };
          }
        ).ArithmeticSegments.presentArithmeticSegmentSvg;
        return rows.every(
          (r) =>
            adapter(r.id, r.source) === r.display &&
            adapter(r.id, r.source + " ") === undefined &&
            adapter(r.id, r.display) === undefined,
        );
      }, batch);
      assert.ok(result, `browser batch ${i}`);
    }
    assert.deepEqual(errors, []);
    const report = {
      figures: plans.length,
      bundleBytes: Buffer.byteLength(code),
      gzipBundleBytes: gzipSync(code).length,
      errors,
      nodeGlobals: await page.evaluate(() => ({
        require: typeof (globalThis as Record<string, unknown>).require,
        Buffer: typeof (globalThis as Record<string, unknown>).Buffer,
        process: typeof (globalThis as Record<string, unknown>).process,
      })),
    };
    await writeFile(
      path.join(out, "runtime.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
