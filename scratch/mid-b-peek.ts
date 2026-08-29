import { generateMiddleProblem } from "../src/lib/middle/generate";
const keys = process.argv.slice(2);
for (const k of keys) {
  for (let v = 0; v < 2; v += 1) {
    const p = generateMiddleProblem(k, 20260827, v);
    console.log(`--- ${k} v${v} [${p.difficulty}]`);
    console.log("Q:", p.content);
    console.log("A:", p.answer);
    console.log("S:", p.solution);
  }
}
