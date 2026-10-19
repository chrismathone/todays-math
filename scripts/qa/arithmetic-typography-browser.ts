/** Static browser/print proof. No app server, network, env files, or DB. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { build, normalizePath } from "vite";
import { EXTRA_GEOMETRY_FIGURE_MAPS } from "../../src/lib/arithmetic-v2/extraGeometry";
import { escapeTypographyXml as esc } from "../../src/lib/arithmetic-v2/presentation/typographyLabel";

async function main() {
  const out = path.resolve("tmp/arithmetic-typography");
  await mkdir(out, { recursive: true });
  const require = createRequire(path.resolve("package.json"));
  const fflateBrowser = normalizePath(
    path.resolve(require.resolve("fflate"), "../../esm/browser.js"),
  );
  const bundled = await build({
    configFile: false,
    logLevel: "error",
    plugins: [
      {
        name: "local-browser-dependency",
        enforce: "pre",
        resolveId: (id) => (id === "fflate" ? fflateBrowser : undefined),
      },
    ],
    build: {
      write: false,
      minify: true,
      lib: {
        entry: path.resolve("src/lib/arithmetic-v2/presentation/typography.ts"),
        name: "ArithmeticTypography",
        formats: ["iife"],
      },
    },
  });
  const outputs = Array.isArray(bundled)
    ? bundled.flatMap((r) => r.output)
    : "output" in bundled
      ? bundled.output
      : [];
  const code = outputs.find((output) => output.type === "chunk")?.code;
  assert.ok(code);
  assert.doesNotMatch(code, /mathjax-full|node:|require\(/);
  await writeFile(path.join(out, "browser.js"), code);

  const all = EXTRA_GEOMETRY_FIGURE_MAPS.flatMap((map) => Object.entries(map));
  const examples = [
    [
      "Unit conversion",
      (id: string, svg: string) =>
        svg.includes(">2 m<") && svg.includes("cm로 나타내기"),
    ],
    ["Area powers", (id: string, svg: string) => svg.includes(">20000 cm²<")],
    ["Midpoint triangle", (id: string) => /midpoint-triangle/.test(id)],
    [
      "Rotated dimensions",
      (id: string, svg: string) =>
        svg.includes("rotate(-90") && svg.includes("가로"),
    ],
    [
      "Volume fractions",
      (id: string, svg: string) => svg.includes("부피 8π/3 cm³"),
    ],
    ["Degree labels", (id: string, svg: string) => svg.includes("중심각 60°")],
  ] as const;
  const selected: { name: string; id: string; svg: string }[] = examples.map(
    ([name, choose]) => {
      const match = all.find(([id, svg]) => choose(id, svg));
      assert.ok(match, name);
      return { name, id: match[0], svg: match[1] };
    },
  );
  const synthetic =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><g font-family="Arial" font-size="20" text-anchor="middle" dominant-baseline="central" fill="black" stroke="none"><text x="120" y="35">ABC</text><text x="120" y="80">r</text><text x="120" y="125">2m</text><text x="120" y="175">1/2</text><text x="120" y="215">cm³로 나타내기</text></g></svg>';
  selected.push({
    name: "Points, variable, no-space unit, fraction",
    id: "synthetic",
    svg: synthetic,
  });
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Arithmetic typography proof</title><style>body{font:14px Arial;margin:20px}main{display:grid;grid-template-columns:repeat(3,300px);gap:16px}article{border:1px solid #bbb;padding:8px}h2{font-size:15px}svg{display:block;width:280px;max-width:100%;height:auto}@media print{body{margin:0}main{grid-template-columns:repeat(2,80mm)}article{break-inside:avoid}svg{width:74.083333mm}}</style><h1>Editor typography: 280 px / print</h1><main>${selected.map((item) => `<article data-id="${esc(item.id)}"><h2>${esc(item.name)}</h2><div class="figure">${item.svg}</div></article>`).join("")}</main><script>${code}</script><script>for(const el of document.querySelectorAll('.figure'))el.innerHTML=ArithmeticTypography.typesetArithmeticGeometrySvg(el.innerHTML);</script></html>`;
  await writeFile(path.join(out, "gallery.html"), html);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1020, height: 1150 },
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setContent(html);
    const measurements: Record<string, unknown> = {};
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const measured = await page.evaluate(() =>
        [...document.querySelectorAll("article")].map((article) => {
          const svg = article.querySelector("svg")!;
          const box = svg.getBoundingClientRect();
          const labels = [
            ...svg.querySelectorAll<SVGGElement>("[data-label]"),
          ].map((label) => {
            const ink = label.getBoundingClientRect();
            return {
              text: label.getAttribute("data-label"),
              visible: ink.width > 0 && ink.height > 0,
              within:
                ink.left >= box.left - 1 &&
                ink.right <= box.right + 1 &&
                ink.top >= box.top - 1 &&
                ink.bottom <= box.bottom + 1,
              width: ink.width,
              height: ink.height,
            };
          });
          return {
            id: article.getAttribute("data-id"),
            width: box.width,
            height: box.height,
            labels,
          };
        }),
      );
      measurements[media] = measured;
      await writeFile(
        path.join(out, `${media}-measurements.json`),
        JSON.stringify(measured, null, 2),
      );
      await page.screenshot({
        path: path.join(out, `${media}.png`),
        fullPage: true,
      });
      for (const figure of measured) {
        assert.ok(
          Math.abs(Math.max(figure.width, figure.height) - 280) < 0.1,
          figure.id ?? "size",
        );
        assert.ok(figure.labels.length, figure.id ?? "labels");
        for (const label of figure.labels) {
          assert.ok(label.visible, `${figure.id}: invisible ${label.text}`);
          assert.ok(label.within, `${figure.id}: clipped ${label.text}`);
        }
      }
    }
    await page.pdf({
      path: path.join(out, "print.pdf"),
      format: "A4",
      printBackground: true,
    });
    assert.deepEqual(errors, []);
    const report = {
      bundleBytes: Buffer.byteLength(code),
      gzipBytes: gzipSync(code).length,
      errors,
      measurements,
    };
    await writeFile(
      path.join(out, "browser.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          ...report,
          measurements: selected.map((item) => ({
            name: item.name,
            id: item.id,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
