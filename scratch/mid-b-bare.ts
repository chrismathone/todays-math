/** 숫자가 KaTeX 밖에 있나 — 제품 규칙 `bareNumbers` 로. (내 파일) */
import { bareNumbers } from "../src/lib/elementary/rules";
import { generateMiddleProblem } from "../src/lib/middle/generate";
import { MID_SUP_B } from "../src/lib/middle/midSupB";
const seen = new Set<string>();
for (const e of MID_SUP_B)
  for (let v = 0; v < 8; v += 1) {
    const p = generateMiddleProblem(e.key, 20260827, v);
    for (const f of ["content", "answer", "solution"] as const) {
      const t = String(p[f] ?? "");
      const hits = bareNumbers(t);
      if (hits.length)
        seen.add(`${e.key} ${f}: [${hits.join(",")}]  ${t.slice(0, 90)}`);
    }
  }
for (const s of seen) console.log("🔴", s);
console.log("합계", seen.size);
