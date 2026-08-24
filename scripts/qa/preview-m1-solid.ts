/**
 * 5E 35유형 미리보기 — **지면에 무엇이 나가는지 눈으로 보는 자리**.
 *
 *   npx tsx scripts/qa/preview-m1-solid.ts
 *     → docs/planning/tracks/5e-solid-sheet/index.html   (KaTeX + 실렌더 그림)
 *     → docs/planning/tracks/preview-m1-solid.md         (글자 원문)
 *
 * 왜 둘 다 남기나 — 물결 계약 §9:
 *  · **값 검사가 다 초록이어도 지면은 흉할 수 있다.** `1y^2` · `×(4)^2` · 군더더기
 *    괄호는 KaTeX·`bareNumbers` 가드를 **전부 통과한다**. 그래서 제품과 같은
 *    `renderMathHtml` 로 실제로 그려 놓고 본다.
 *  · 스크롤백은 창이 닫히면 사라진다 — **파일로** 남긴다.
 *
 * 그림은 제품 경로(`renderFigureSpec` → `render_spec.py`)로 그리고, 폭은
 * `figureSvgFrame.ts` 등급을 **그대로 먹인다**(09 §4-25). 지면에서 글자가
 * 본문(12.5px)보다 작아지는 그림이 있으면 이 시트에서 바로 보인다 — 그래서
 * 카드마다 «그 폭에서 가장 작은 글자 몇 px 인가»를 같이 적는다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import {
  figureSvgSize,
  figureSvgViewBoxWidth,
  FIGURE_SVG_COMPACT_MAX_PX,
  FIGURE_SVG_MID_MAX_PX,
  FIGURE_SVG_PAIR_MAX_PX,
  FIGURE_SVG_WIDE_MAX_PX,
} from "../../src/lib/figure/figureSvgFrame";
import { renderMathHtml } from "../../src/lib/math/renderMathHtml";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_SOLID_TYPES } from "../../src/lib/middle/m1Solid";
import type { MidProblem } from "../../src/lib/middle/types";

const SEEDS = [20260824, 7, 4242];
/**
 * ⚠️ 시트는 `docs/planning/tracks/5e-solid-sheet/` 에 놓인다 — 저장소 뿌리까지 **네 단**이다.
 * 세 단으로 적으면 KaTeX CSS 가 조용히 404 나고, 그러면 인라인 style 로 그리는 `\,` 는
 * 살아 있는데 **위첨자만 무너져** 지면에 「$9^{2}$ → 92」·「cm² → cm2」로 나간다.
 * 실제로 처음에 그렇게 났고 **눈으로 보고서야** 나왔다(변이도 시험도 못 잡는 부류다).
 */
const OUT_DIR = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "5e-solid-sheet",
);
const MD_PATH = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "preview-m1-solid.md",
);

/** 본문 글자 — `printGeometry` 의 문항 본문과 같은 값. */
const BODY_PX = 12.5;

const FRAME_PX: Record<string, number> = {
  compact: FIGURE_SVG_COMPACT_MAX_PX,
  mid: FIGURE_SVG_MID_MAX_PX,
  wide: FIGURE_SVG_WIDE_MAX_PX,
  pair: FIGURE_SVG_PAIR_MAX_PX,
};

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 그 폭에서 지면에 실제로 찍히는 가장 작은 글자 크기(px). 글자가 없으면 `null`. */
function smallestTextPx(svg: string, framePx: number): number | null {
  const vb = figureSvgViewBoxWidth(svg);
  if (vb === null) return null;
  const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) =>
    Number(m[1]),
  );
  if (sizes.length === 0) return null;
  return Math.min(...sizes) * (framePx / vb);
}

type Card = {
  entry: (typeof M1_SOLID_TYPES)[number];
  problem: MidProblem;
  svg: string | null;
  error: string | null;
  size: string | null;
  smallest: number | null;
};

async function build(): Promise<Card[]> {
  const cards: Card[] = [];
  for (const e of M1_SOLID_TYPES) {
    for (const seed of SEEDS) {
      const p = generateMiddleProblem(e.key, seed);
      let svg: string | null = null;
      let error: string | null = null;
      let size: string | null = null;
      let smallest: number | null = null;
      if (p.figureSpec) {
        const r = await renderFigureSpec(p.figureSpec);
        if (r.ok) {
          svg = r.svg;
          size = figureSvgSize(r.svg);
          smallest = smallestTextPx(r.svg, FRAME_PX[size]!);
        } else {
          error = r.error;
        }
      }
      cards.push({ entry: e, problem: p, svg, error, size, smallest });
    }
  }
  return cards;
}

function html(cards: Card[]): string {
  const bad = cards.filter((c) => c.error !== null).length;
  const tiny = cards.filter(
    (c) => c.smallest !== null && c.smallest < BODY_PX,
  ).length;
  const blocks: string[] = [];
  let minor = "";
  for (const c of cards) {
    if (c.entry.rpmMinor !== minor) {
      minor = c.entry.rpmMinor;
      blocks.push(`<h2>${esc(minor)}</h2><div class="grid">`);
    }
    const framePx = c.size ? FRAME_PX[c.size]! : 0;
    // ⚠️ 폭을 **박아서** 준다. `max-width` 만 주면 SVG 에 width 속성이 없어
    //    (sanitize_svg 가 지운다) flex 항목의 기준 폭이 정해지지 않아 글과 겹친다.
    const fig = c.svg
      ? `<div class="fig" style="flex:0 0 ${framePx}px;width:${framePx}px">${c.svg}</div>`
      : c.error
        ? `<pre class="err">그림 실패: ${esc(c.error)}</pre>`
        : "";
    const note = c.svg
      ? `<span class="tag">${c.size} · ${framePx}px · 가장 작은 글자 ${
          c.smallest === null ? "없음" : `${c.smallest.toFixed(2)}px`
        }</span>`
      : "";
    blocks.push(`
<section class="card${c.error ? " bad" : ""}${
      c.smallest !== null && c.smallest < BODY_PX ? " tiny" : ""
    }">
  <h3>${esc(c.entry.rpmType)} ${esc(c.entry.rpmTitle)} <span>${esc(c.entry.unitSection)} · ${c.problem.difficulty}</span></h3>
  <div class="row">
    <div class="body">${renderMathHtml(c.problem.content)}</div>
    ${fig}
  </div>
  ${note}
  <div class="ans">정답 ${renderMathHtml(c.problem.answer)}</div>
  <div class="sol">${c.problem.solution
    .split("\n")
    .map((line) => renderMathHtml(line))
    .join("<br/>")}</div>
  <pre class="raw">${esc(c.problem.content)}\n${esc(c.problem.answer)}</pre>
</section>`);
  }
  blocks.push("</div>");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>물결 5E — 중1 다면체와 회전체 · 겉넓이와 부피 실렌더</title>
<link rel="stylesheet" href="../../../../node_modules/katex/dist/katex.min.css">
<style>
body{font-family:"Malgun Gothic",sans-serif;margin:20px;color:#1a2028;background:#fff}
h1{font-size:18px}h2{font-size:14px;margin:22px 0 8px;color:#41525f}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.card{border:1px solid #d7dee5;border-radius:6px;padding:10px}
.card.bad{background:#fff6f5;border-color:#f0cfc9}
.card.tiny{background:#fffaf0;border-color:#e8d3a8}
.card h3{font-size:12px;margin:0 0 8px}
.card h3 span{display:block;font-weight:400;color:#7a8794;font-size:10px}
.row{display:flex;gap:12px;align-items:flex-start}
.body{font-size:12.5px;line-height:1.625;flex:1 1 0;min-width:140px;font-family:"Batang",serif}
.fig{flex:0 0 auto}.fig svg{width:100%;height:auto}
.tag{font-size:10px;color:#7a8794}
.ans{margin-top:8px;font-size:12.5px;color:#1a56db;font-family:"Batang",serif}
.sol{margin-top:6px;font-size:11.5px;color:#55636e;line-height:1.7;border-top:1px dashed #e7edf2;padding-top:6px;font-family:"Batang",serif}
.raw{font-size:9.5px;color:#9aa6b1;white-space:pre-wrap;margin:6px 0 0}
.err{font-size:10px;color:#a3382c;white-space:pre-wrap}
</style></head><body>
<h1>물결 5E — 중1 「다면체와 회전체」 20 + 「입체도형의 겉넓이와 부피」 15</h1>
<p>카드 ${cards.length}장(유형 ${M1_SOLID_TYPES.length} × 씨앗 ${SEEDS.length}).
그림 실패 <b>${bad}</b> · 지면 글자가 본문(${BODY_PX}px)보다 작은 카드 <b>${tiny}</b>.
그림은 제품 경로(<code>render_spec.py</code>)로 그렸고 폭은 <code>figureSvgFrame.ts</code>
등급을 그대로 먹였다. 왼쪽 글은 문항 본문과 같은 ${BODY_PX}px 이다.</p>
${blocks.join("\n")}
</body></html>`;
}

function markdown(cards: Card[]): string {
  const out: string[] = [
    "# 물결 5E — RPM 1-2 다면체와 회전체 20 + 입체도형의 겉넓이와 부피 15 미리보기",
    "",
    `생성 유형 ${M1_SOLID_TYPES.length}개 · 유형마다 씨앗 ${SEEDS.length}개.`,
    "실렌더 시트는 `5e-solid-sheet/index.html` 에 있다(KaTeX + 그림).",
    "",
  ];
  let minor = "";
  let key = "";
  for (const c of cards) {
    if (c.entry.rpmMinor !== minor) {
      minor = c.entry.rpmMinor;
      out.push(`\n## ${minor}\n`);
    }
    if (c.entry.key !== key) {
      key = c.entry.key;
      out.push(
        `### ${c.entry.rpmType} ${c.entry.rpmTitle}  \`${c.entry.unitSection}\`\n`,
      );
    }
    out.push(
      `- **문제** (${c.problem.difficulty}) ${c.problem.content.replace(/\n/g, "  \n  ")}`,
    );
    out.push(`  - **답** ${c.problem.answer}`);
    out.push(`  - **풀이** ${c.problem.solution.replace(/\n/g, "  \n    ")}`);
    if (c.problem.figureSpec) {
      out.push(
        `  - **그림** \`${JSON.stringify(c.problem.figureSpec)}\`${
          c.error
            ? ` — ❌ ${c.error}`
            : ` — ${c.size} · 가장 작은 글자 ${c.smallest === null ? "없음" : `${c.smallest.toFixed(2)}px`}`
        }`,
      );
    }
  }
  return out.join("\n") + "\n";
}

async function main(): Promise<void> {
  const cards = await build();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "index.html"), html(cards), "utf8");
  writeFileSync(MD_PATH, markdown(cards), "utf8");
  const bad = cards.filter((c) => c.error !== null);
  const tiny = cards.filter((c) => c.smallest !== null && c.smallest < BODY_PX);
  console.log(`→ ${path.join(OUT_DIR, "index.html")}`);
  console.log(`→ ${MD_PATH}`);
  console.log(
    `카드 ${cards.length} · 그림 실패 ${bad.length} · 본문보다 작은 글자 ${tiny.length}`,
  );
  for (const c of tiny) {
    console.log(
      `  작음 ${c.entry.key} ${c.size} ${c.smallest?.toFixed(2)}px ${JSON.stringify(c.problem.figureSpec)}`,
    );
  }
  for (const c of bad) console.log(`  실패 ${c.entry.key} ${c.error}`);
}

void main();
