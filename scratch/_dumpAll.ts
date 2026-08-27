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

/**
 * 씨앗을 **멀리 떨어뜨린다.**
 *
 * `seeded` 는 선형 합동이라 씨앗을 $1$씩 올리면 첫 뽑기가 $0.0004$ 밖에 안
 * 움직인다. `[17, 203, 991]` 처럼 붙은 씨앗으로 지문을 만들면 **갈래를 첫
 * 뽑기로 고르는 유형은 늘 같은 갈래만** 찍혀, 변이 시험 ⑵ 단계가
 * 「산출물 그대로」라는 거짓 판정을 낸다(실측: 삼각기둥 무리 변이).
 */
function spread(i: number): number {
  return Math.imul(i, 104729) >>> 0;
}

const SEEDS = Array.from({ length: 12 }, (_v, i) => spread(i + 1));

for (const [name, list] of MODULES) {
  for (const entry of list) {
    for (const seed of SEEDS) {
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
