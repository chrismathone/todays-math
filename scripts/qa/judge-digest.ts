/**
 * 판정형(`src/lib/middle/judge/`)이 **지금 무엇을 내놓는가**의 지문 한 줄 — 변이 하네스(`mutate-judge.mjs`)가 쓴다.
 *
 * 변이 판정은 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나(2026-08-21 교훈).
 * ⑵ 를 건너뛰면 «뜻이 안 바뀐 변이»를 두고 «가드가 아니다»로 오판해 멀쩡한 가드를 고치러 간다.
 * 생성이 던지면 그것도 «달라진 산출물»이므로 사유를 지문에 적는다.
 *
 *   npx tsx scripts/qa/judge-digest.ts
 */
import { createHash } from "node:crypto";

import {
  generateJudgeProblem,
  judgementDefinitions,
} from "../../src/lib/middle/judge/registry";

const SEEDS = [20261008, 1, 7777, 424242, 99991, 31337, 5, 909090, 271828, 4];

const parts: string[] = [];
for (const d of judgementDefinitions()) {
  for (const seed of SEEDS) {
    for (let v = 0; v < 4; v += 1) {
      try {
        const p = generateJudgeProblem(d.key, seed, v);
        parts.push([d.key, seed, v, p.content, p.answer, p.solution].join("␟"));
      } catch (err) {
        parts.push([d.key, seed, v, "THROW", (err as Error).message].join("␟"));
      }
    }
  }
}
console.log(createHash("sha256").update(parts.join("\n")).digest("hex"));
