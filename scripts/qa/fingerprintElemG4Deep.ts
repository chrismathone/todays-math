/** 초4 1-3 확대 갈래 열넷의 지문 — 「파일이 바뀌었다」와 「동작이 바뀌었다」를 가른다. */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";

const CODES = ["1-3-1", "1-3-2", "1-3-3", "1-3-4", "1-3-5", "1-3-6", "1-3-7"];
const out: string[] = [];
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  )!;
  for (const tier of ["심화중", "심화상"] as const) {
    for (let i = 0; i < 6; i += 1) {
      const p = generateElementaryProblem(u, 20260830 + i * 7919, tier);
      out.push(`${code}|${tier}|${p.content}|${p.answer}|${p.solution}`);
    }
  }
}
console.log(out.join("\n"));
