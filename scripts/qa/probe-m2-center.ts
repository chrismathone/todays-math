/**
 * 6D 28유형(외심과 내심 13 + 무게중심 15)의 **산출물 지문** —
 * 변이 하네스가 「뜻이 바뀌었나」를 묻는 자리.
 *
 *   npx tsx scripts/qa/probe-m2-center.ts
 *
 * 왜 필요한가: 변이 시험은 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나**
 * ⑶ 그제서야 시험이 빨개지나 — 세 단으로 판정해야 한다(CLAUDE.md 2026-08-21).
 * 생성기가 던지면 그 사유도 지문에 넣는다 — 던지는 것도 «달라진 산출물»이다.
 */
import { createHash } from "node:crypto";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_CENTER } from "../../src/lib/middle/m2Center";

const SEEDS = [20260824, 1, 7777, 424242];

function main(): void {
  const h = createHash("sha256");
  for (const e of M2_CENTER) {
    for (const seed of SEEDS) {
      for (let v = 0; v < 4; v += 1) {
        try {
          const p = generateMiddleProblem(e.key, seed, v);
          h.update(
            JSON.stringify([
              e.key,
              e.rpmTitle,
              e.unitSection,
              p.content,
              p.answer,
              p.solution,
              p.facts,
              p.figureSpec ?? null,
            ]),
          );
        } catch (err) {
          h.update(`THROW ${e.key} ${seed} ${v} ${String(err)}`);
        }
      }
    }
  }
  console.log(h.digest("hex"));
}

main();
