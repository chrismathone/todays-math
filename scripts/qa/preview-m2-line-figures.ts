/**
 * 5D 그림 유형 넷을 **기존 m2Func 그래프와 나란히** 그려 접촉 시트를 만든다.
 *
 *   npx tsx scripts/qa/preview-m2-line-figures.ts
 *     → docs/planning/tracks/preview-m2-line-figures.html
 *     → docs/planning/tracks/preview-m2-line-figures.png  (playwright 가 있을 때)
 *
 * ## 왜 나란히인가
 *
 * 5D 는 `linearGraph` 를 **쓰기만** 한다(엔진은 5E 소유). 그런데 같은 중단원에
 * m2Func 의 그래프 셋(⑴07·⑴11·관계07)이 이미 나가고 있다 — 한 시험지에 같이
 * 실린다. 축·눈금·화살촉·글자 크기가 두 벌로 보이면 지면에서 티가 난다.
 * 그래서 **같은 페이지에 같은 폭으로** 놓고 본다.
 *
 * ## 지면과 같은 치수로 그린다
 *
 * `linearGraph` 의 viewBox 폭은 **240 에 박혀 있고**(4A, `CP_VIEWBOX`), 지면에서는
 * `figureSvgFrame` 의 `mid` 등급이라 **240px** 로 그려진다. 문항 열은 363.5px,
 * 본문은 12.5px 다(`printGeometry.ts`·`figureSvgFrame.ts` 주석의 실측값).
 * 이 세 수를 그대로 써야 「눈금 글자가 본문보다 작은가」를 눈으로 판정할 수 있다 —
 * 화면에서 크게 띄워 보면 그 물음이 통째로 사라진다(2026-08-23 실측 결함).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_FUNC } from "../../src/lib/middle/m2Func";
import { M2_LINE } from "../../src/lib/middle/m2Line";
import type { TypeEntry } from "../../src/lib/middle/types";

/** 지면 실측 — `figureSvgFrame.ts`·`printGeometry.ts` 주석과 같은 수 */
const COLUMN_PX = 363.5;
const BODY_PX = 12.5;
const MID_FIGURE_PX = 240;

const OUT_DIR = path.join(process.cwd(), "docs", "planning", "tracks");
const HTML = path.join(OUT_DIR, "preview-m2-line-figures.html");
const PNG = path.join(OUT_DIR, "preview-m2-line-figures.png");

const SEEDS = [20260824, 7, 4242];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Card = { origin: string; label: string; text: string; svg: string };

async function cardsFor(entries: TypeEntry[], origin: string): Promise<Card[]> {
  const out: Card[] = [];
  for (const e of entries) {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      if (!p.figureSpec) continue;
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) {
        throw new Error(`${e.key} seed ${seed} 렌더 실패 — ${r.error}`);
      }
      out.push({
        origin,
        label: `${e.rpmMinor} ${e.rpmType} · seed ${seed}`,
        text: p.content,
        svg: r.svg,
      });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const mine = await cardsFor(M2_LINE, "5D (새로)");
  const existing = await cardsFor(M2_FUNC, "m2Func (이미 나가는 것)");
  if (mine.length === 0 || existing.length === 0) {
    throw new Error(
      "한쪽이 비면 «나란히»가 성립하지 않는다 — 대조가 무의미하다",
    );
  }

  const card = (c: Card) =>
    `<figure class="card">` +
    `<figcaption><b>${esc(c.origin)}</b> — ${esc(c.label)}</figcaption>` +
    `<p class="stem">${esc(c.text).replace(/\n/g, "<br>")}</p>` +
    `<div class="fig">${c.svg}</div>` +
    `</figure>`;

  const html =
    `<!doctype html><meta charset="utf-8">` +
    `<title>5D 일차함수 그림 — 기존 그래프와 나란히</title>` +
    `<style>` +
    `body{margin:0;padding:16px;background:#fff;color:#111;` +
    `font-family:"Malgun Gothic","맑은 고딕",sans-serif;font-size:${BODY_PX}px;line-height:1.6}` +
    `h1{font-size:16px;margin:0 0 4px}` +
    `p.note{font-size:11px;color:#555;margin:0 0 12px}` +
    `.grid{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}` +
    `.card{width:${COLUMN_PX}px;margin:0;border:1px solid #ddd;padding:8px}` +
    `figcaption{font-size:10px;color:#666;margin-bottom:4px}` +
    `p.stem{margin:0;font-size:${BODY_PX}px}` +
    `.fig{margin-top:8px;max-width:${MID_FIGURE_PX}px}` +
    `.fig svg{width:100%;height:auto;display:block}` +
    `</style>` +
    `<h1>5D 일차함수 그림 — 기존 m2Func 그래프와 나란히</h1>` +
    `<p class="note">문항 열 ${COLUMN_PX}px · 본문 ${BODY_PX}px · 그림 ${MID_FIGURE_PX}px (지면 실측치). ` +
    `발문은 KaTeX 없이 원문 그대로 — 여기서 볼 것은 <b>그래프가 한 벌로 보이는가</b>다.</p>` +
    `<div class="grid">${[...mine, ...existing].map(card).join("")}</div>`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(HTML, html, "utf8");
  console.log(
    `HTML → ${HTML} (5D ${mine.length}장 · 기존 ${existing.length}장)`,
  );

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
    // 그림을 못 찍어도 HTML 은 남는다 — 브라우저로 열어 보면 된다.
    console.log(`PNG 생략 (playwright 없음/실패): ${(err as Error).message}`);
  }
}

void main();
