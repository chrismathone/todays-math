/**
 * 6C-중1원 — 「원과 부채꼴」 16유형 + 「도수분포다각형」 09 실렌더 시트.
 *
 * 유형마다 한 문항을 뽑아 실제 엔진으로 그려 본다(모킹 없음). 09-figure-engine-guide
 * §0.1 — SVG 의 유일한 생산자는 서버(`renderFigureSpec`)다.
 *
 *   npx tsx scripts/qa/probe-m1geo3-circle.ts
 *
 * 산출: docs/planning/tracks/wave6-6c-circle-sheet/index.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_GEO3 } from "../../src/lib/middle/m1Geo3";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const OUT_DIR = path.resolve(
  process.cwd(),
  "docs/planning/tracks/wave6-6c-circle-sheet",
);

const SEED = 20260823;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const cards: string[] = [];
  let drawn = 0;
  let noFigure = 0;
  let failed = 0;

  for (const e of M1_GEO3) {
    const p = generateMiddleProblem(e.key, SEED);
    let body: string;
    if (!p.figureSpec) {
      noFigure += 1;
      body = `<p class="none">(그림 없음)</p>`;
    } else {
      const r = await renderFigureSpec(p.figureSpec);
      if (r.ok) {
        drawn += 1;
        body = r.svg;
      } else {
        failed += 1;
        body = `<p class="err">던짐: ${esc(r.error)}</p>`;
      }
    }
    cards.push(
      `<div class="card${failed && !p.figureSpec ? "" : ""}">` +
        `<div class="t">${esc(e.rpmType)} ${esc(e.rpmTitle)}</div>` +
        `<div class="content">${esc(p.content).replace(/\n/g, "<br/>")}</div>` +
        `<div class="fig">${body}</div>` +
        `<div class="ans">답: ${esc(p.answer)}</div>` +
        `</div>`,
    );
  }

  const html =
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>` +
    `<title>6C 원과 부채꼴 실렌더 시트</title><style>` +
    `body{font-family:'Malgun Gothic',sans-serif;max-width:1400px;margin:24px auto;padding:0 16px}` +
    `h1{font-size:19px}` +
    `.card{display:inline-block;border:1px solid #ddd;border-radius:8px;padding:10px;` +
    `margin:8px;vertical-align:top;width:320px}` +
    `.t{font-weight:bold;font-size:13px;margin-bottom:4px}` +
    `.content{font-size:12px;color:#333;margin-bottom:6px}` +
    `.ans{font-size:12px;color:#555;margin-top:6px}` +
    `.err{color:#b00020;font-size:12px}` +
    `.none{color:#999;font-size:12px}` +
    `.fig svg{max-width:300px;height:auto}` +
    `</style></head><body>` +
    `<h1>6C 원과 부채꼴 16유형 + 도수분포다각형 09 — 그려짐 ${drawn} · 그림없음 ${noFigure} · 던짐 ${failed}</h1>` +
    cards.join("") +
    `</body></html>`;

  writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf8");
  console.log(`그려짐 ${drawn} · 그림없음 ${noFigure} · 던짐 ${failed}`);
  console.log(`→ ${path.join(OUT_DIR, "index.html")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
