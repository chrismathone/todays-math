import { generateMiddleProblem } from "../../src/lib/middle/generate";

for (const n of ["18", "19", "20", "21", "22", "23"]) {
  for (let seed = 1; seed <= 40; seed += 1) {
    const p = generateMiddleProblem(`2-2|여러 가지 사각형|${n}`, seed);
    console.log(
      [
        n,
        seed,
        p.content,
        p.answer,
        p.solution,
        JSON.stringify(p.facts),
        JSON.stringify(p.figureSpec),
      ].join(" | "),
    );
  }
}
