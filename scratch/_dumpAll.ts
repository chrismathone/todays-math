/**
 * 갈래 A 소유 7모듈 전량의 산출물 지문 — 변이 시험 ⑵ 단계(«산출물이 바뀌었나»)용.
 * 가드와 **다른 도구**여야 ⑵ 가 ⑶ 의 되풀이가 안 된다.
 */
import { M1_BOOK2 } from "../src/lib/middle/m1Book2";
import { M1EXTRA_TYPES } from "../src/lib/middle/m1Extra";
import { M2_PROB } from "../src/lib/middle/m2Prob";
import { M2_QUAD } from "../src/lib/middle/m2Quad";
import { M2_SYSTEM } from "../src/lib/middle/m2System";
import { M2_SYSTEM_APPLY } from "../src/lib/middle/m2SystemApply";
import { M3_TYPES } from "../src/lib/middle/m3";
import type { TypeEntry } from "../src/lib/middle/types";

const MODULES: [string, TypeEntry[]][] = [
  ["m1Book2", M1_BOOK2],
  ["m1Extra", M1EXTRA_TYPES],
  ["m2Prob", M2_PROB],
  ["m2Quad", M2_QUAD],
  ["m2System", M2_SYSTEM],
  ["m2SystemApply", M2_SYSTEM_APPLY],
  ["m3", M3_TYPES],
];

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

for (const [name, list] of MODULES) {
  for (const entry of list) {
    for (const seed of [17, 203, 991]) {
      let p;
      try {
        p = entry.handler(seeded(seed));
      } catch (err) {
        console.log(`${name}|${entry.key}|${seed} THROW ${String(err)}`);
        continue;
      }
      console.log(
        `${name}|${entry.key}|${seed} ` +
          JSON.stringify([p.content, p.answer, p.solution]),
      );
    }
  }
}
