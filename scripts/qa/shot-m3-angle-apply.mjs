/**
 * 4D 「원주각의 활용」 그림을 **눈으로 보기 위한** 접촉 시트 PNG.
 *
 *   node scripts/qa/shot-m3-angle-apply.mjs [--html qa/4d-angle-apply-figures.html]
 *       [--out qa/4d-angle-apply-sheet] [--per 14]
 *
 * 렌더가 성공한 것과 **읽히는 것**은 다른 질문이다(라벨 겹침·선 뭉침은 렌더 성공으로
 * 남는다). 그래서 실제 SVG 를 브라우저에 띄워 장으로 나눠 찍는다.
 * 스크롤백은 창이 닫히면 사라지므로 파일로 남긴다(CLAUDE.md 2026-08-21).
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

const HTML = path.resolve(process.cwd(), arg("html", "qa/4d-angle-apply-figures.html"));
const OUT = path.resolve(process.cwd(), arg("out", "qa/4d-angle-apply-sheet"));
const PER = Number(arg("per", "14"));

const src = readFileSync(HTML, "utf8");
const figures = src.match(/<figure>[\s\S]*?<\/figure>/g) ?? [];
if (figures.length === 0) throw new Error(`${HTML} 에 <figure> 가 없다`);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
let sheet = 0;
for (let i = 0; i < figures.length; i += PER) {
  const chunk = figures.slice(i, i + PER).join("\n");
  await page.setContent(
    `<!doctype html><meta charset="utf-8">` +
      `<style>body{font-family:system-ui;margin:12px;background:#fff}` +
      `figure{display:inline-block;width:300px;margin:0 8px 16px 0;vertical-align:top}` +
      `figcaption{font-size:11px;color:#555}` +
      `.fig svg{width:250px;height:auto;border:1px solid #eee}` +
      `.q{font-size:11px;line-height:1.45}.a{font-size:11px;color:#036}</style>` +
      chunk,
  );
  const file = path.join(OUT, `sheet-${String(sheet).padStart(2, "0")}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  sheet += 1;
}
await browser.close();
