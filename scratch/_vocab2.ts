import { M1_BOOK2 } from "../src/lib/middle/m1Book2";
import { M1EXTRA_TYPES } from "../src/lib/middle/m1Extra";
import { M2_PROB } from "../src/lib/middle/m2Prob";
import { M2_QUAD } from "../src/lib/middle/m2Quad";
import { M2_SYSTEM } from "../src/lib/middle/m2System";
import { M2_SYSTEM_APPLY } from "../src/lib/middle/m2SystemApply";
import { M3_TYPES } from "../src/lib/middle/m3";

const ALL = [
  M1_BOOK2,
  M1EXTRA_TYPES,
  M2_PROB,
  M2_QUAD,
  M2_SYSTEM,
  M2_SYSTEM_APPLY,
  M3_TYPES,
].flat();

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const vocab = new Map<string, string[]>();
for (const e of ALL) {
  for (const s of [7, 17, 91, 203, 404, 991]) {
    let p;
    try {
      p = e.handler(seeded(s));
    } catch {
      continue;
    }
    for (const t of [p.content, p.answer, p.solution]) {
      if (typeof t !== "string") continue;
      for (const m of t.matchAll(/\\([A-Za-z]+)/g)) {
        const k = m[1]!;
        if (!vocab.has(k)) vocab.set(k, []);
        if (vocab.get(k)!.length < 2) vocab.get(k)!.push(e.key);
      }
    }
  }
}
for (const [k, v] of [...vocab.entries()].sort()) {
  console.log(k.padEnd(14), v.join(" , "));
}
