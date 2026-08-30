import {
  elementaryUnits,
  generateElementaryProblem,
} from "../src/lib/elementary/generate";
import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "../scripts/qa/probe-elem-tier-backsolve";

const SEEDS = [20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242];
const CODES = ["2-4-1", "2-4-2", "2-4-3", "2-4-4", "2-4-5", "2-4-6", "2-4-7"];

console.log("=== ⑥ 중·상인데 순방향으로 닿는 것 ===");
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초5" && x.section.startsWith(code),
  )!;
  for (const tier of ["심화중", "심화상"] as const) {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, tier as never);
      const a = readRat(p.answer.replace(/\$/g, "").trim());
      if (!a || !forwardReachable(pageNumbers(p.content), a)) continue;
      console.log(`${code} ${tier} @${seed} 답 ${p.answer}`);
      console.log(`   ${p.content.slice(0, 150)}`);
    }
  }
}

console.log("\n=== ④ 연산·기본·응용인데 순방향으로 안 닿는 것 ===");
for (const code of CODES) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초5" && x.section.startsWith(code),
  )!;
  for (const tier of ["연산", "기본", "응용"] as const) {
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, tier as never);
      const a = readRat(p.answer.replace(/\$/g, "").trim());
      if (!a || forwardReachable(pageNumbers(p.content), a)) continue;
      console.log(`${code} ${tier} @${seed} 답 ${p.answer}`);
      console.log(`   ${p.content.slice(0, 150)}`);
    }
  }
}
