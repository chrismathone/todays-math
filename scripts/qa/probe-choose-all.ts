/**
 * 「모두 고르시오」 규칙의 **산출물 지문** — 변이 하네스가 「뜻이 바뀌었나」를 묻는 자리.
 *
 *   npx tsx scripts/qa/probe-choose-all.ts
 *   npx tsx scripts/qa/probe-choose-all.ts --verbose   # 무엇을 쟀는지 눈으로
 *
 * 변이 판정은 **3단**이다(CLAUDE.md 2026-08-21):
 *   ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나.
 * ⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다»로 찍혀
 * **멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.
 *
 * 지문에 무엇을 넣나:
 *   ㉠ 「모두 고르시오」를 내는 유형의 **발문·정답** 그대로
 *   ㉡ 판정기의 답(`isChooseAll`)과 **정답 개수** — 판정을 고치면 여기가 달라진다
 *   ㉢ 판정 **밖**인데 「고르」가 든 문항 수 — 판정을 넓히면 이 수가 준다
 *   ㉣ 생성기가 **던지면** 그 사유도 넣는다 (던지는 것도 «달라진 산출물»이다)
 */
import { createHash } from "node:crypto";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  chooseAllAnswerCount,
  isChooseAll,
} from "../../src/lib/problem/chooseAllRule";

const VERBOSE = process.argv.includes("--verbose");
const SEEDS = 24;
const SEED0 = 20260825;
const STEP = 7919;

function main(): void {
  const h = createHash("sha256");
  let judged = 0;
  let nearMiss = 0;
  let thrown = 0;

  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      const seed = SEED0 + s * STEP;
      try {
        const p = generateMiddleProblem(t.key, seed);
        const hit = isChooseAll(p.content);
        if (hit) {
          judged += 1;
          h.update(
            JSON.stringify([
              t.key,
              seed,
              p.content,
              p.answer,
              chooseAllAnswerCount(p.answer),
            ]),
          );
          if (VERBOSE) {
            console.log(
              `  ${t.key} #${s} → ${chooseAllAnswerCount(p.answer)}개 «${p.answer}»`,
            );
          }
        } else if (/고르/.test(p.content)) {
          nearMiss += 1;
          h.update(JSON.stringify(["near", t.key, seed, p.content]));
        }
      } catch (err) {
        thrown += 1;
        h.update(`THROW ${t.key} ${seed} ${String(err)}`);
      }
    }
  }

  // 초등은 오늘 0건이다 — 그래도 지문에 **분모와 0** 을 같이 넣는다.
  // 0 만 넣으면 훑기가 조용히 줄어도 지문이 그대로다(「깨끗」과 「못 셈」이 안 갈린다).
  let elemSeen = 0;
  let elemHit = 0;
  for (const unit of elementaryUnits()) {
    const tiers = supportedTiers(unit);
    const asks = tiers.length > 0 ? [...tiers] : [undefined];
    for (const tier of asks) {
      for (let s = 0; s < 4; s += 1) {
        try {
          const p = generateElementaryProblem(unit, SEED0 + s * STEP, tier);
          elemSeen += 1;
          if (isChooseAll(p.content)) {
            elemHit += 1;
            h.update(
              JSON.stringify(["elem", unit.section, p.content, p.answer]),
            );
          }
        } catch (err) {
          h.update(`ELEM-THROW ${unit.section} ${s} ${String(err)}`);
        }
      }
    }
  }
  h.update(
    JSON.stringify({ judged, nearMiss, thrown, elemSeen, elemHit, SEEDS }),
  );

  console.log(
    `중등 판정 ${judged} · 판정밖「고르」 ${nearMiss} · 던짐 ${thrown} · 초등 ${elemHit}/${elemSeen}`,
  );
  console.log(h.digest("hex"));
}

main();
