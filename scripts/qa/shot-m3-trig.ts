/**
 * 3E 「삼각비」 32유형의 근거 미리보기 — **실제로 그리고 실제로 렌더한다.**
 *
 *   npx tsx scripts/qa/shot-m3-trig.ts [--seeds 3] [--out C:/tmp/m3-trig]
 *
 * 왜 파일로 남기나: 스크롤백은 창이 닫히면 사라진다(CLAUDE.md 2026-08-21).
 * 무엇을 보나:
 *  ⑴ 그림은 제품 실경로(`renderFigureSpec` → `render_spec.py`)로 그린다 —
 *     엔진이 스펙 검증의 정본이므로 여기서 실패하면 **지면에 빨갛게 남긴다**.
 *  ⑵ 발문·정답·해설은 제품 렌더러(`renderMathHtml`)로 그린다 — 그 경로에
 *     **가분수를 대분수로 고쳐 쓰는 전처리**가 들어 있다. 지면에서 수가 바뀌면
 *     여기서 눈에 보인다(docs/planning/tracks/mixed-number-preprocess-20260823.md).
 *  ⑶ 전처리 전·후의 수식이 달라진 문항은 별도로 세어 마지막 줄에 찍는다.
 *     조용히 지나가면 「0건」이 «깨끗»인지 «못 셈»인지 안 갈린다.
 *
 * 종료 코드는 그림 실패 또는 전처리 변형이 있으면 1 이다.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_TRIG } from "../../src/lib/middle/m3Trig";
import type { MidProblem } from "../../src/lib/middle/types";
import { renderMathHtml } from "../../src/lib/math/renderMathHtml";
import { preprocessMathText } from "../../src/lib/math/textPreprocess";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 대분수 모양 — 숫자 바로 뒤에 분수가 붙은 것. 순정수 분수 — `\frac`·`\dfrac` 둘 다.
 * (계량기 `scripts/qa/census-mixed-number.ts` 와 같은 열쇠. 「아무 데나 달라졌나」로
 * 보면 `\displaystyle` 주입·점 라벨 직립까지 걸려 지표가 아무것도 안 가른다.)
 */
const MIXED = /(?:^|[^\d.])(\d{1,4})\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
const FRAC = /\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;

const countMixed = (s: string): number => [...s.matchAll(MIXED)].length;
const countFrac = (s: string): number => [...s.matchAll(FRAC)].length;

/** 자체 시험 — 이게 안 걸리면 아래 「0건」은 «깨끗»이 아니라 «못 셈»이다. */
function selfTest(): void {
  const bad = String.raw`$x-\dfrac{3}{2}y$`;
  const fold = String.raw`$\dfrac{6}{3}=2$`;
  const good = String.raw`$\dfrac{1}{2}+\dfrac{\sqrt{3}}{2}$`;
  const hits = [
    rewrites(bad).length,
    rewrites(fold).length,
    rewrites(good).length,
  ];
  if (hits[0] !== 1 || hits[1] !== 1 || hits[2] !== 0) {
    throw new Error(`판정기가 죽었다 (가분수/접힘/정상 = ${hits.join(",")})`);
  }
}

/** 이 문자열에서 전처리가 «수를 고쳐 쓴» 자리. */
function rewrites(text: string): string[] {
  const after = preprocessMathText(text);
  const out: string[] = [];
  const mixed = countMixed(after) - countMixed(text);
  if (mixed > 0) out.push(`가분수→대분수 ${mixed}`);
  const fold = countFrac(text) - countFrac(after);
  if (fold > 0) out.push(`분수 접힘 ${fold}`);
  return out;
}

function rewritten(p: MidProblem): string[] {
  const out: string[] = [];
  for (const [name, text] of [
    ["발문", p.content],
    ["정답", p.answer],
    ["해설", p.solution],
  ] as const) {
    const hit = rewrites(text);
    if (hit.length > 0) out.push(`${name}: ${hit.join(", ")} — ${text}`);
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const seedCount = Number(
    argv[argv.indexOf("--seeds") + 1] ?? (argv.includes("--seeds") ? 3 : 3),
  );
  const outDir = argv.includes("--out")
    ? String(argv[argv.indexOf("--out") + 1])
    : "C:/tmp/m3-trig";
  const seeds = Array.from(
    { length: seedCount },
    (_, i) => 20260823 + i * 7919,
  );

  selfTest();
  mkdirSync(outDir, { recursive: true });
  const blocks: string[] = [];
  const figureErrors: string[] = [];
  const rewriteHits: string[] = [];
  let total = 0;
  let withFigure = 0;

  for (const e of M3_TRIG) {
    for (let s = 0; s < seeds.length; s += 1) {
      const p = generateMiddleProblem(e.key, seeds[s]!);
      total += 1;
      let figure = "";
      if (p.figureSpec) {
        withFigure += 1;
        const r = await renderFigureSpec(p.figureSpec);
        if (r.ok) {
          figure = `<div class="fig">${r.svg}</div>`;
        } else {
          figureErrors.push(`${e.key} seed${s}: ${r.error}`);
          figure = `<div class="fig err">그림 실패: ${esc(r.error)}</div>`;
        }
      }
      const bad = rewritten(p);
      if (bad.length > 0) {
        rewriteHits.push(`${e.key} seed${s}: ${bad.join(" | ")}`);
      }
      blocks.push(`
<section class="item${bad.length ? " rw" : ""}">
<div class="meta">${e.rpmMinor} ${e.rpmType} ${esc(e.rpmTitle)} · ${e.unitSection} · ${p.difficulty} · seed ${seeds[s]}</div>
<div class="content">${renderMathHtml(p.content)}</div>
${figure}
<div class="ans">정답: ${renderMathHtml(p.answer)}</div>
<div class="sol">${p.solution
        .split("\n")
        .map((line) => renderMathHtml(line))
        .join("<br/>")}</div>
${bad.length ? `<div class="warn">전처리가 수식을 고쳐 씀: ${esc(bad.join(" | "))}</div>` : ""}
</section>`);
    }
  }

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>3E 삼각비 32유형 미리보기</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1a1a1a}
.item{border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin:14px 0}
.item.rw{border-color:#b00020}
.meta{font-size:12px;color:#888;margin-bottom:8px}
.content{font-size:15px;line-height:1.8}
.fig{margin:10px 0}
.fig svg{max-width:340px;height:auto}
.fig.err{color:#b00020;font-weight:600}
.ans{margin-top:8px;font-size:14px;color:#1a56db;font-weight:600}
.sol{margin-top:6px;font-size:13px;color:#555;line-height:1.8;border-top:1px dashed #eee;padding-top:6px}
.warn{margin-top:8px;font-size:12px;color:#b00020}
</style></head><body>
<h1 style="font-size:18px">3E 삼각비 — ${M3_TRIG.length}유형 × 씨앗 ${seeds.length} = ${total}문항</h1>
<p style="font-size:13px;color:#555">그림 ${withFigure}건 · 그림 실패 ${figureErrors.length}건 · 전처리 변형 ${rewriteHits.length}건</p>
${blocks.join("\n")}
</body></html>`;

  writeFileSync(`${outDir}/index.html`, html, "utf-8");
  console.log(
    `${total}문항 (유형 ${M3_TRIG.length} × 씨앗 ${seeds.length}) → ${outDir}/index.html`,
  );
  console.log(
    `그림 있는 문항 ${withFigure} · 그림 실패 ${figureErrors.length}`,
  );
  for (const line of figureErrors.slice(0, 20)) console.log(`  ✗ ${line}`);
  console.log(`전처리가 수식을 고쳐 쓴 문항 ${rewriteHits.length}`);
  for (const line of rewriteHits.slice(0, 20)) console.log(`  ! ${line}`);
  if (figureErrors.length > 0 || rewriteHits.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
});
