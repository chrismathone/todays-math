/** Shared CLI review preview. Uses the existing math/figure renderers, not a new print layout. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import type { MidProblem } from "../../src/lib/middle/types";
import { renderMathHtml } from "../../src/lib/math/renderMathHtml";

/**
 * 검수 화면에도 **제품과 같은** 순환점 규칙을 넣는다.
 * 손으로 베껴 두면 제품만 고쳐질 때 검수 화면이 조용히 달라진다 —
 * 실제로 2026-08-23 에 검수 화면에서만 순환소수 점이 안 보였다.
 * 규칙을 못 찾으면 **던진다**(조용히 점 없는 화면을 내지 않는다).
 */
function repeatDotCss(): string {
  const css = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const start = css.indexOf(".repeat-dot {");
  const endMark = css.indexOf("}", css.indexOf(".repeat-dot::before {"));
  if (start < 0 || endMark < 0) {
    throw new Error(
      "globals.css 에서 .repeat-dot 규칙을 못 찾았습니다 — 이름이 바뀌었으면 여기도 고치십시오",
    );
  }
  return css.slice(start, endMark + 1);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Generated questions use authored line boundaries, including (1) subquestions.
// renderMathHtml alone collapses OCR-style newlines; keep these as the solution
// preview already does, so the review sheet does not merge adjacent questions.
function renderLines(text: string): string {
  return text
    .split("\n")
    .map((line) => renderMathHtml(line))
    .join("<br/>");
}

/**
 * 검수용 HTML — figureSpec 이 있는 문항은 엔진으로 실제 렌더한다
 * (scripts/elem/gen-cli.ts 의 renderFigureSpec 패턴). 그림 실패는 조용히
 * 빼지 않고 사유를 지면에 적고, 호출자가 종료 코드 1 로 알린다.
 */
export async function middlePreviewHtml(
  items: MidProblem[],
  seed: number,
): Promise<{ html: string; figureErrors: string[] }> {
  const figureErrors: string[] = [];
  const blocks: string[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const p = items[i]!;
    let figure = "";
    if (p.figureSpec) {
      const r = await renderFigureSpec(p.figureSpec);
      if (r.ok) {
        figure = `<div class="fig">${r.svg}</div>`;
      } else {
        figureErrors.push(
          `${i + 1}번 (${p.rpmType} ${p.rpmTitle}): ${r.error}`,
        );
        figure = `<div class="fig err">그림 실패: ${esc(r.error)}</div>`;
      }
    }
    blocks.push(`
<section class="item">
<div class="meta">#${i + 1} · ${p.grade} · ${p.unitSection} · 출처 ${p.rpmBook} ${p.rpmMinor} ${p.rpmType} ${p.rpmTitle} · ${p.difficulty}</div>
<div class="content">${renderLines(p.content)}</div>
${figure}
<div class="ans">정답: ${renderLines(p.answer)}</div>
<div class="sol">${renderLines(p.solution)}</div>
</section>`);
  }
  const rows = blocks.join("\n");
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<title>중학 유형 미리보기 (seed ${seed})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"/>
<style>
body{font-family:'Malgun Gothic',sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1a1a1a}
.item{border:1px solid #ddd;border-radius:8px;padding:14px 16px;margin:14px 0}
.meta{font-size:12px;color:#888;margin-bottom:8px}
.content{font-size:15px;line-height:1.7}
.fig{margin:8px 0}
.fig svg{max-width:340px;height:auto}
.fig.err{color:#b00020;font-weight:600}
.ans{margin-top:8px;font-size:14px;color:#1a56db;font-weight:600}
.sol{margin-top:6px;font-size:13px;color:#555;line-height:1.7;border-top:1px dashed #eee;padding-top:6px}
${repeatDotCss()}
</style></head><body>
<h1 style="font-size:18px">중학 유형 미리보기 — ${items.length}문항 (seed ${seed})</h1>
${rows}
</body></html>`;
  return { html, figureErrors };
}
