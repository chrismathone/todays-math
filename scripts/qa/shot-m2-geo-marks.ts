/**
 * 2B 대기 유형(마크 문법)의 그림을 **실제로 그려** 미리보기를 만든다.
 *
 *   npx tsx scripts/qa/shot-m2-geo-marks.ts [키조각 …]
 *
 * `renderFigureSpec`(제품 실경로 = render_spec.py)으로 유형×씨앗마다 SVG 를 받아
 * `C:/tmp/m2-geo-marks/index.html` 한 장에 발문·정답과 나란히 싣는다.
 * **렌더 실패는 화면에 빨갛게 남긴다** — 조용히 건너뛰지 않는다(그러면 «그림이
 * 없는데 있다고 세는» 자리가 생긴다).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_TYPES } from "../../src/lib/middle/m2";

const OUT = "C:/tmp/m2-geo-marks";
const SEEDS = [20260823, 1, 7777];

/** 2B 물결에서 새로 낸 유형 — 마크 문법이 있어야 그려지는 것들. */
const WAVE2B = new Set([
  "2-2|삼각형의 성질|06",
  "2-2|삼각형의 성질|07",
  "2-2|삼각형의 성질|08",
  "2-2|삼각형의 성질|12",
  ...Array.from(
    { length: 12 },
    (_, i) => `2-2|여러 가지 사각형|${String(i + 1).padStart(2, "0")}`,
  ),
  "2-2|여러 가지 사각형|17",
  ...Array.from({ length: 7 }, (_, i) => `2-2|도형의 닮음|${i + 9}`),
  ...Array.from(
    { length: 4 },
    (_, i) =>
      `2-2|평행선 사이의 선분의 길이의 비|${String(i + 8).padStart(2, "0")}`,
  ),
]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main(): Promise<void> {
  const filters = process.argv.slice(2);
  const entries = M2_TYPES.filter(
    (e) =>
      WAVE2B.has(e.key) &&
      (filters.length === 0 || filters.some((f) => e.key.includes(f))),
  );
  if (entries.length === 0) throw new Error("대상 유형이 없습니다");

  mkdirSync(OUT, { recursive: true });
  const html: string[] = [
    "<meta charset='utf-8'><style>",
    "body{font-family:system-ui,sans-serif;max-width:1180px;margin:16px auto;color:#111}",
    ".t{border:1px solid #d4d4d4;border-radius:10px;margin:14px 0;padding:10px 12px}",
    ".h{font-size:13px;font-weight:600;margin:0 0 8px;color:#333}",
    ".row{display:flex;gap:14px;flex-wrap:wrap}",
    ".c{border:1px solid #eee;border-radius:8px;padding:8px;width:352px}",
    ".q{font-size:12px;line-height:1.5;margin:0 0 6px}",
    ".a{font-size:12px;color:#0a6;margin:6px 0 0}",
    ".err{color:#b00;font-size:12px;white-space:pre-wrap}",
    "svg{max-width:100%;height:auto;display:block;margin:0 auto}",
    "</style>",
  ];

  let ok = 0;
  let failed = 0;
  for (const e of entries) {
    html.push(
      `<div class='t'><p class='h'>${esc(e.key)} — ${esc(e.rpmTitle)} · ${esc(e.unitSection)}</p><div class='row'>`,
    );
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      html.push(`<div class='c'><p class='q'>${esc(p.content)}</p>`);
      if (p.figureSpec) {
        const r = await renderFigureSpec(p.figureSpec);
        if (r.ok) {
          ok += 1;
          html.push(r.svg);
          writeFileSync(
            path.join(OUT, `${e.key.replace(/[|]/g, "_")}-${seed}.svg`),
            r.svg,
            "utf-8",
          );
        } else {
          failed += 1;
          html.push(`<p class='err'>렌더 실패: ${esc(r.error)}</p>`);
        }
      } else {
        html.push("<p class='err'>그림 없음</p>");
      }
      html.push(`<p class='a'>답 ${esc(p.answer)}</p></div>`);
    }
    html.push("</div></div>");
  }
  writeFileSync(path.join(OUT, "index.html"), html.join("\n"), "utf-8");
  console.log(`유형 ${entries.length} · 그림 성공 ${ok} · 실패 ${failed}`);
  console.log(`${OUT}/index.html`);
  if (failed > 0) process.exitCode = 1;
}

void main();
