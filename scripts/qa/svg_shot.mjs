/**
 * **SVG 를 실제 렌더러(브라우저)로 찍는다** — 눈으로 견줄 때 쓰는 그림.
 *
 *   node scripts/qa/svg_shot.mjs <in.svg> <out.png> [높이px]
 *
 * ⚠️ `svg_to_png.py`(PyMuPDF)는 **글꼴을 대체한다** — `40°` 를 36.6단위로 그려서
 *    halo 가 실선을 지운 것처럼 보이는 **가짜 끊김**을 만든다(실측 2026-08-28,
 *    `1-2-p16-0080` 복제에서 또 밟았다). 지면은 브라우저가 그린다. 눈으로 판정할
 *    그림은 여기서 찍어라.
 */
import { readFileSync } from "node:fs";

import { chromium } from "playwright";

const [, , src, out, heightArg] = process.argv;
if (!src || !out) {
  console.log("사용법: svg_shot.mjs <in.svg> <out.png> [높이px]");
  process.exit(2);
}
const height = Number(heightArg ?? 420);
const svg = readFileSync(src, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 3 });
await page.setContent(
  `<!doctype html><meta charset="utf-8">` +
    `<style>html,body{margin:0;background:#fff}` +
    `#w{display:inline-block;padding:6px}` +
    `#w svg{height:${height}px;width:auto;display:block}</style>` +
    `<div id="w">${svg}</div>`,
);
const box = await page.locator("#w").boundingBox();
await page.screenshot({ path: out, clip: box });
await browser.close();
console.log(`${out}  ${Math.round(box.width)}x${Math.round(box.height)}`);
