import { generateMiddleProblem } from "../../src/lib/middle/generate";

const KEYS = (process.argv[2] ?? "24,25,26,27").split(",");
const SEEDS = (process.argv[3] ?? "1,2,3").split(",").map(Number);
for (const n of KEYS) {
  for (const seed of SEEDS) {
    const p = generateMiddleProblem(`2-2|여러 가지 사각형|${n}`, seed);
    console.log(`── ${n} seed${seed} [${p.difficulty}] ${p.rpmTitle}`);
    console.log(p.content);
    console.log("답:", p.answer);
    console.log("해설:", p.solution.split("\n").join(" / "));
    console.log("facts:", JSON.stringify(p.facts));
    console.log();
  }
}
