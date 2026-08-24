/**
 * 6D 「삼각형의 외심과 내심」·「삼각형의 무게중심」 그림 23유형 미리보기 —
 * 지면에 무엇이 나가는지 **파일로** 남긴다(스크롤백은 창이 닫히면 사라진다 —
 * 물결 6 계약 「끝내는 조건」).
 *
 *   npx tsx scripts/qa/preview-m2-center-figures.ts
 *     → docs/planning/tracks/preview-m2-center-figures.html
 *     → docs/planning/tracks/preview-m2-center-figures.png  (playwright 가 있을 때)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_CENTER } from "../../src/lib/middle/m2Center";

/** 지면 실측 — figureSvgFrame.ts·printGeometry.ts 주석과 같은 수 */
const COLUMN_PX = 363.5;
const BODY_PX = 12.5;

const OUT_DIR = path.join(process.cwd(), "docs", "planning", "tracks");
const HTML = path.join(OUT_DIR, "preview-m2-center-figures.html");
const PNG = path.join(OUT_DIR, "preview-m2-center-figures.png");

const SEEDS = [20260824, 7, 4242];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Card = { label: string; text: string; answer: string; svg: string };

async function main(): Promise<void> {
  const cards: Card[] = [];
  let skipped = 0;
  for (const e of M2_CENTER) {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      if (!p.figureSpec) {
        skipped++;
        continue;
      }
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) {
        throw new Error(`${e.key} seed ${seed} 렌더 실패 — ${r.error}`);
      }
      cards.push({
        label: `${e.rpmMinor} ${e.rpmType} ${e.rpmTitle} · seed ${seed}`,
        text: p.content,
        answer: p.answer,
        svg: r.svg,
      });
    }
  }
  if (cards.length === 0) {
    throw new Error("그림이 하나도 안 나왔다 — 그림 유형 배선을 확인하라");
  }

  const card = (c: Card) =>
    `<figure class="card">` +
    `<figcaption>${esc(c.label)}</figcaption>` +
    `<p class="stem">${esc(c.text).replace(/\n/g, "<br>")}</p>` +
    `<div class="fig">${c.svg}</div>` +
    `<p class="ans">답: ${esc(c.answer)}</p>` +
    `</figure>`;

  const html =
    `<!doctype html><meta charset="utf-8">` +
    `<title>6D 외심·내심·무게중심 그림 미리보기</title>` +
    `<style>` +
    `body{margin:0;padding:16px;background:#fff;color:#111;` +
    `font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:${BODY_PX}px;line-height:1.6}` +
    `h1{font-size:16px;margin:0 0 4px}` +
    `p.note{font-size:11px;color:#555;margin:0 0 12px}` +
    `.grid{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}` +
    `.card{width:${COLUMN_PX}px;margin:0;border:1px solid #ddd;padding:8px}` +
    `figcaption{font-size:10px;color:#666;margin-bottom:4px}` +
    `p.stem{margin:0;font-size:${BODY_PX}px}` +
    `.fig{margin-top:8px;max-width:240px}` +
    `.fig svg{width:100%;height:auto;display:block}` +
    `p.ans{font-size:11px;color:#a00;margin:6px 0 0}` +
    `</style>` +
    `<h1>6D 외심과 내심·무게중심 그림 미리보기 — ${cards.length}장</h1>` +
    `<p class="note">문항 열 ${COLUMN_PX}px · 본문 ${BODY_PX}px (지면 실측치). ` +
    `그림 없는 유형 ${skipped}건은 제외(외심 넓이·접선·결합류 4 + 무게중심 사각형 1).</p>` +
    `<div class="grid">${cards.map(card).join("")}</div>`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(HTML, html, "utf8");
  console.log(`HTML → ${HTML} (${cards.length}장, 그림없음 ${skipped}건)`);

  try {
    const { chromium } =
      (await import("playwright")) as typeof import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: PNG, fullPage: true });
    await browser.close();
    console.log(`PNG  → ${PNG}`);
  } catch (err) {
    console.log(`PNG 생략 (playwright 없음/실패): ${(err as Error).message}`);
  }
}

void main();
