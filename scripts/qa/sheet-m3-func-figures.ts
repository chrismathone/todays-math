/**
 * 5A 그림 여섯 유형을 **지면 등급 그대로** 찍어 본다 — `curveGraph` 의 첫 실사용.
 *
 *   npx tsx scripts/qa/sheet-m3-func-figures.ts
 *   node scripts/qa/shot-sian.mjs \
 *     docs/planning/tracks/reports/m3-func-figures/index.html \
 *     docs/planning/tracks/reports/m3-func-figures/sheet.png 1240
 *
 * 산출물은 **커밋한다** — 스크롤백은 창이 닫히면 사라지고, 다음 사람이 「그때 무엇이
 * 어떻게 보였나」를 다시 그려 보지 않고도 알아야 한다(`probe-curve-graph.py` 와 같은 무늬).
 *
 * ## 왜 본문 글자를 옆에 찍나
 *
 * 그림이 화면에서 멀쩡한 것과 **종이에서 읽히는 것**은 다른 질문이다(2026-08-23).
 * `figureSvgFrame.ts` 가 viewBox 폭으로 지면 등급을 가르는데 `curveGraph` 는 240 에
 * 박혀 있으므로 등급이 하나다 — 그 폭을 여기서 그대로 먹이고 문항 본문(12.5px) 옆에
 * 나란히 놓는다. 그림 속 눈금 숫자가 본문보다 작으면 눈으로 바로 보인다.
 *
 * 수식은 **제품과 같은 경로**(`renderMathHtml`)로 그리고 KaTeX CSS 는 저장소 안의
 * 것을 인라인한다 — 네트워크가 없어도 같은 그림이 나와야 한다.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_FUNC, M3_FUNC_FIGURE_KEYS } from "../../src/lib/middle/m3Func";
import { renderMathHtml } from "../../src/lib/math/renderMathHtml";

const OUT = "docs/planning/tracks/reports/m3-func-figures/index.html";
const SEEDS = [20260824, 7777, 424242];

/** `curveGraph` 는 폭이 240 에 박혀 있다 — 지면에서 그려지는 px 도 240 이다. */
const FRAME_PX = 240;

function katexCss(): string {
  return readFileSync(
    resolve(process.cwd(), "node_modules/katex/dist/katex.min.css"),
    "utf8",
  );
}

async function main(): Promise<void> {
  const cards: string[] = [];
  let drawn = 0;
  let failed = 0;

  for (const key of M3_FUNC_FIGURE_KEYS) {
    const entry = M3_FUNC.find((e) => e.key === key)!;
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(key, seed);
      const r = await renderFigureSpec(p.figureSpec);
      let fig: string;
      if (r.ok) {
        drawn += 1;
        const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(r.svg);
        fig =
          `<div class="fig" style="width:${FRAME_PX}px">${r.svg}</div>` +
          `<div class="tag">viewBox ${vb ? `${vb[1]}×${vb[2]}` : "?"} → ${FRAME_PX}px</div>`;
      } else {
        failed += 1;
        fig = `<pre class="err">${r.error}</pre>`;
      }
      cards.push(`<section class="card${r.ok ? "" : " bad"}">
<h3>${entry.rpmMinor} ${entry.rpmType} · seed ${seed}</h3>
<p class="note">${entry.rpmTitle}</p>
<div class="row"><div class="body">${renderMathHtml(p.content)}</div><div class="col">${fig}</div></div>
<div class="ans">정답 ${renderMathHtml(p.answer)}</div>
</section>`);
    }
  }

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>5A 이차함수 — curveGraph 실렌더</title>
<style>${katexCss()}</style>
<style>
body{font-family:"Malgun Gothic",sans-serif;margin:20px;color:#1a2028;background:#fff}
h1{font-size:18px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.card{border:1px solid #d7dee5;border-radius:6px;padding:10px}
.card.bad{background:#fff6f5;border-color:#f0cfc9}
.card h3{font-size:12px;margin:0 0 2px}
.note{font-size:10px;color:#7a8794;margin:0 0 8px}
.row{display:flex;gap:12px;align-items:flex-start}
/* 문항 본문과 **같은 크기**다 — 그림 속 이름표가 이보다 작으면 종이에서 안 읽힌다. */
.body{font-size:12.5px;line-height:1.625;flex:1 1 0;min-width:120px;font-family:"Batang",serif}
.col{flex:0 0 auto}
.fig svg{width:100%;height:auto}
.tag{font-size:10px;color:#7a8794;margin-top:4px}
.ans{font-size:11px;color:#1a56db;margin-top:8px}
.err{font-size:10px;color:#a3382c;white-space:pre-wrap}
</style></head><body>
<h1>5A 이차함수 — <code>curveGraph</code> 실렌더 (그림 ${drawn} · 실패 ${failed})</h1>
<p style="font-size:12px;color:#54636f">제품 경로(<code>renderFigureSpec</code> → <code>render_spec.py</code>)로 실제로 그렸고,
폭은 <code>curveGraph</code> 가 박아 둔 ${FRAME_PX}px 그대로다. 왼쪽 글은 문항 본문과 같은 12.5px 이다.</p>
<div class="grid">${cards.join("\n")}</div>
</body></html>`;

  const path = resolve(process.cwd(), OUT);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, "utf-8");
  console.log(`→ ${OUT}  (그림 ${drawn} · 실패 ${failed})`);
  if (failed > 0) process.exitCode = 1;
}

void main();
