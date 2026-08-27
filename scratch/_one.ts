import { M2_SYSTEM } from "../src/lib/middle/m2System";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const key = process.argv[2] ?? "2-1|연립일차방정식|09";
const e = M2_SYSTEM.find((x) => x.key === key)!;
for (const s of [7, 17, 91, 203, 404, 991]) {
  const p = e.handler(seeded(s));
  console.log("--- seed " + s);
  console.log(JSON.stringify(p.content));
  console.log(JSON.stringify(p.solution));
}
