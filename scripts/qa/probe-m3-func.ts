/**
 * 5A 42유형(이차함수의 그래프 ⑴ 21 + ⑵ 21)의 **산출물 지문** —
 * 변이 하네스가 「뜻이 바뀌었나」를 묻는 자리.
 *
 *   npx tsx scripts/qa/probe-m3-func.ts
 *
 * 왜 필요한가: 변이 시험은 ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나**
 * ⑶ 그제서야 시험이 빨개지나 — 세 단으로 판정해야 한다. ⑵ 를 건너뛰면
 * 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다» 로 찍혀 **멀쩡한 가드를 의심하고
 * 고치러 간다**(CLAUDE.md 2026-08-21). 파일이 바뀌는 것과 동작이 바뀌는 것은 다르다.
 *
 * 생성기가 던지면 그 사유도 지문에 넣는다 — 던지는 것도 «달라진 산출물»이다.
 * `figureSpec` 도 넣는다 — 그림만 달라지는 변이(표식이 곡선 밖으로 나감)가 있다.
 */
import { createHash } from "node:crypto";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_FUNC } from "../../src/lib/middle/m3Func";

const SEEDS = [20260824, 1, 7777, 424242];

function main(): void {
  const h = createHash("sha256");
  for (const e of M3_FUNC) {
    for (const seed of SEEDS) {
      for (let v = 0; v < 5; v += 1) {
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
