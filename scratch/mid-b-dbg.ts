import { generateMiddleProblem } from "../src/lib/middle/generate";
for (const seed of [20260827, 7, 4242, 99991])
  for (let v = 0; v < 6; v += 1) {
    const p = generateMiddleProblem("2-1|일차부등식|61", seed, v);
    console.log(JSON.stringify(p.content), "|", JSON.stringify(p.answer));
  }
