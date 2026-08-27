/**
 * 지면 판정 — **제품 렌더러로** 전량을 그려 붉은 글씨·날 글자가 남나 본다. (내 파일)
 *
 * 규칙을 옮겨 적지 않는다: 화면이 쓰는 `renderMathHtml` 을 그대로 부른다.
 * 실패 판정은 `.katex-error` 와 **`#cc0000`** 둘 다 본다 —
 * KaTeX 0.16 은 모르는 명령을 클래스가 아니라 색으로 그린다(CLAUDE.md 2026-08-14).
 */
import { renderMathHtml } from "../src/lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260827;
const V = 4;
type E = { key: string; grade: string; unitSection: string };

let rows = 0;
let bad = 0;
const perKey = new Map<string, number>();
for (const e of registeredTypes() as unknown as E[]) {
  for (let v = 0; v < V; v += 1) {
    let p;
    try {
      p = generateMiddleProblem(e.key, SEED, v);
    } catch {
      continue;
    }
    for (const f of ["content", "answer", "solution"] as const) {
      const text = String(p[f] ?? "");
      if (!text) continue;
      rows += 1;
      let html = "";
      try {
        html = renderMathHtml(text);
      } catch (err) {
        html = `katex-error ${err instanceof Error ? err.message : err}`;
      }
      // ⚠️ 열쇠가 셋이다. `.math-raw` 는 **2차 수리까지 실패한 중립 폴백**이라
      //    붉지도 katex-error 도 아니면서 **날 LaTeX 가 그대로 지면에 나간다**
      //    (2026-08-27 `\begin{cases}` 줄바꿈이 `\x` 로 죽어 그렇게 나갔다).
      if (
        html.includes("katex-error") ||
        html.includes("#cc0000") ||
        html.includes("math-raw")
      ) {
        bad += 1;
        perKey.set(e.key, (perKey.get(e.key) ?? 0) + 1);
        if (bad <= 12)
          console.log(`🔴 ${e.key} v${v} ${f}: ${text.slice(0, 160)}`);
      }
    }
  }
}
console.log(`\n렌더 ${rows}자리 · 붉은 자리 ${bad} · 걸린 유형 ${perKey.size}`);
for (const [k, n] of [...perKey].sort((a, b) => b[1] - a[1]).slice(0, 20))
  console.log(`  ${n}  ${k}`);
