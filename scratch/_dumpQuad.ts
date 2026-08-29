import { M2_QUAD } from "../src/lib/middle/m2Quad";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

for (const t of ["14A", "15A", "16A", "17A", "18A", "19A"]) {
  const e = M2_QUAD.find((x) => x.rpmType === t)!;
  const p = e.handler(seeded(17));
  console.log(`--- ${t} [${p.difficulty}]`);
  console.log(p.content);
  console.log("ANS: " + p.answer);
  console.log("SOL: " + p.solution);
}
