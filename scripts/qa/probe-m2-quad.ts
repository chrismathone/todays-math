/**
 * 6C-원+평행사변형 물결 6 — 평행사변형 13유형 실렌더 판정.
 *
 * 유형마다 한 문항을 뽑아 실제 엔진으로 그려 눈으로 확인한다(09 §0.1).
 * 산출: docs/planning/tracks/wave6-6c-parallelogram-sheet/index.html
 *
 *   PYTHONIOENCODING=utf-8 npx tsx scripts/qa/probe-m2-quad.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_QUAD } from "../../src/lib/middle/m2Quad";

const OUT = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "wave6-6c-parallelogram-sheet",
  "index.html",
);

async function main(): Promise<void> {
  let html =
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>` +
    `<title>평행사변형 13유형 실렌더</title><style>` +
    `body{font-family:'Malgun Gothic',sans-serif;max-width:1000px;margin:24px auto;padding:0 16px}` +
    `.card{display:inline-block;border:1px solid #ddd;border-radius:8px;padding:10px;` +
    `margin:8px;vertical-align:top;width:280px}` +
    `.card.bad{border-color:#b00020;background:#fff5f5}` +
    `.t{font-size:12px;color:#555;margin-bottom:6px}` +
    `.c{font-size:12px;color:#333;margin-bottom:6px}` +
    `.a{font-size:12px;color:#155724;margin-bottom:6px}` +
    `.card svg{max-width:260px;height:auto}` +
    `.err{color:#b00020;font-size:12px}</style></head><body>` +
    `<h1>평행사변형 13유형 — 실렌더 판정 (6C 물결 6)</h1>`;

  for (const e of M2_QUAD) {
    const p = generateMiddleProblem(e.key, 20260824);
    let bodyHtml = "";
    if (p.figureSpec) {
      const r = await renderFigureSpec(p.figureSpec);
      bodyHtml = r.ok
        ? r.svg
        : `<p class="err">던짐: ${r.error}</p><pre>${JSON.stringify(p.figureSpec)}</pre>`;
    } else {
      bodyHtml = `<p style="color:#888;font-size:12px">(그림 없음)</p>`;
    }
    html +=
      `<div class="card"><div class="t">${e.rpmType} ${e.rpmTitle}</div>` +
      `<div class="c">${p.content.replace(/</g, "&lt;")}</div>` +
      `<div class="a">답: ${p.answer}</div>` +
      bodyHtml +
      `</div>`;
  }
  html += `</body></html>`;
  writeFileSync(OUT, html, "utf-8");
  console.log(`wrote ${OUT}`);
}

main();
