/** 갈래 B 보강 유형 전량을 **눈으로** 훑는다 — 값·렌더 검사가 못 보는 지면. (내 파일) */
import { registeredTypes } from "../src/lib/middle/generate";
import { MID_SUP_B } from "../src/lib/middle/midSupB";
import { generateMiddleProblem } from "../src/lib/middle/generate";
void registeredTypes;
const only = process.argv.slice(2);
for (const e of MID_SUP_B) {
  if (
    only.length &&
    !only.some((o) => e.key.includes(o) || e.unitSection.includes(o))
  )
    continue;
  const p = generateMiddleProblem(e.key, 20260827, 0);
  console.log(
    `\n[${e.unitSection}] ${e.key} «${e.rpmTitle}» (${p.difficulty})`,
  );
  console.log(`  Q ${p.content}`);
  console.log(`  A ${p.answer}`);
  console.log(`  S ${p.solution.split("\n").join("\n    ")}`);
}
