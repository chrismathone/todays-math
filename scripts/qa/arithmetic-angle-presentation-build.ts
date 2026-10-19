/** node --import <tools>/node_modules/tsx/dist/loader.mjs --import ./scripts/qa/arithmetic-angle-presentation-deps.mjs scripts/qa/arithmetic-angle-presentation-build.ts <tools> [--sample] */
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { deflateSync, strToU8, inflateSync, strFromU8 } from "fflate";
import { chromium } from "@playwright/test";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import {
  angleEntries,
  createAnglePresentationSpec,
} from "./arithmetic-angle-presentation-specs";

async function main() {
  assert.ok(
    !process.env.STUDIO_ENGINE_URL && process.env.VERCEL !== "1",
    "Use local engine tooling only",
  );
  const out = path.resolve("tmp/arithmetic-angle-presentation");
  await mkdir(out, { recursive: true });
  const all = angleEntries(),
    sample = process.argv.includes("--sample");
  const only = process.argv.find((s) => s.startsWith("--id="))?.slice(5);
  const updateFamily = process.argv
    .find((s) => s.startsWith("--update-family="))
    ?.slice(16);
  const entries = updateFamily
    ? all.filter((e) => e.family.endsWith(updateFamily))
    : only
      ? all.filter((e) => e.id === only)
      : sample
        ? all.filter(
            (e, i) =>
              i === 0 ||
              e.family !== all[i - 1]?.family ||
              e.family !== all[i + 1]?.family ||
              e.params.join("-") === "90-90-90" ||
              e.params.join("-") === "120-60" ||
              e.params.join("-") === "45",
          )
        : all;
  const file = "src/lib/arithmetic-v2/presentation/angles.assets.json";
  const svgs: Record<string, string> = updateFamily
    ? JSON.parse(
        strFromU8(
          inflateSync(
            Buffer.from(
              JSON.parse(await readFile(file, "utf8")).svgPack,
              "base64",
            ),
          ),
        ),
      )
    : {};
  const proofs: unknown[] = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
  });
  await page.route("**/*", (route) => route.abort());
  try {
    for (const [i, entry] of entries.entries()) {
      let recipe = createAnglePresentationSpec(entry);
      let rendered = await renderFigureSpec(recipe.spec, { strict: true });
      if (!rendered.ok && entry.family.endsWith("difference")) {
        for (const offset of [12, -12, 24, -24, 36, -36]) {
          if (entry.params[0] / 2 - Math.abs(offset) < 15) continue;
          recipe = createAnglePresentationSpec(entry, offset);
          rendered = await renderFigureSpec(recipe.spec, { strict: true });
          if (rendered.ok) break;
        }
      }
      assert.ok(
        rendered.ok,
        `${entry.id}: ${rendered.ok ? "" : rendered.error}`,
      );
      await page.setContent(rendered.svg);
      const bounds = await page.evaluate(() => {
        const svg = document.querySelector("svg")!;
        const items = [
          ...svg.querySelectorAll<SVGGraphicsElement>(
            "line,path,text,[data-label]",
          ),
        ].filter((n) => !n.parentElement?.closest("[data-label]"));
        const inverse = svg.getScreenCTM()!.inverse();
        const boxes = items.map((n) => {
          const b = n.getBoundingClientRect();
          const a = new DOMPoint(b.left, b.top).matrixTransform(inverse),
            z = new DOMPoint(b.right, b.bottom).matrixTransform(inverse);
          return { x: a.x, y: a.y, width: z.x - a.x, height: z.y - a.y };
        });
        return {
          minX: Math.min(...boxes.map((b) => b.x)),
          minY: Math.min(...boxes.map((b) => b.y)),
          maxX: Math.max(...boxes.map((b) => b.x + b.width)),
          maxY: Math.max(...boxes.map((b) => b.y + b.height)),
        };
      });
      const w = bounds.maxX - bounds.minX,
        h = bounds.maxY - bounds.minY;
      if (Math.max(w, h) > 270)
        await writeFile(path.join(out, "oversize.svg"), rendered.svg);
      assert.ok(
        Math.max(w, h) <= 270,
        `${entry.id}: content too large ${w},${h}`,
      );
      const x = (bounds.minX + bounds.maxX - 280) / 2,
        y = (bounds.minY + bounds.maxY - 280) / 2;
      const svg = rendered.svg
        .replace(
          /viewBox="[^"]*"/,
          `viewBox="${x.toFixed(4)} ${y.toFixed(4)} 280 280"`,
        )
        .replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, '$1 width="280"')
        .replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, '$1 height="280"')
        .replace(
          /(<svg[^>]*>)/,
          "$1<desc>arithmetic-geometry-drill-v1 arithmetic-angle-presentation-v1</desc>",
        )
        .replace(/>\s+</g, "><")
        .trim();
      assert.ok(!svg.includes("?"));
      svgs[entry.id] = svg;
      proofs.push({ id: entry.id, ...recipe, bounds });
      if (i % 100 === 0) console.log(`${i + 1}/${entries.length}: ${entry.id}`);
    }
    await writeFile(path.join(out, "rendered.json"), JSON.stringify(svgs));
    await writeFile(path.join(out, "recipes.json"), JSON.stringify(proofs));
    for (const width of [280, 320]) {
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:20px;font:12px Arial}main{display:grid;grid-template-columns:repeat(3,${width + 16}px);gap:12px}article{border:1px solid #ccc;padding:8px}svg{display:block;width:${width}px;height:${width}px}small{display:block;height:30px;overflow-wrap:anywhere}</style><main>${entries
        .filter(
          (e, i) =>
            sample || i % Math.max(1, Math.floor(entries.length / 24)) === 0,
        )
        .map((e) => `<article><small>${e.id}</small>${svgs[e.id]}</article>`)
        .join("")}</main>`;
      await writeFile(path.join(out, `gallery-${width}.html`), html);
      await page.setContent(html);
      await page.screenshot({
        path: path.join(out, `gallery-${width}.png`),
        fullPage: true,
      });
    }
    if (!sample && !only) {
      const json = JSON.stringify(svgs),
        compressed = deflateSync(strToU8(json), { level: 9 });
      const pack = {
        version: 1,
        codec: "deflate-base64",
        count: Object.keys(svgs).length,
        rawBytes: Buffer.byteLength(json),
        compressedBytes: compressed.length,
        sha256: createHash("sha256").update(json).digest("hex"),
        svgPack: Buffer.from(compressed).toString("base64"),
      };
      await mkdir("src/lib/arithmetic-v2/presentation", { recursive: true });
      await writeFile(
        "src/lib/arithmetic-v2/presentation/angles.assets.json",
        JSON.stringify(pack) + "\n",
      );
      console.log(JSON.stringify({ ...pack, svgPack: undefined }));
    }
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
