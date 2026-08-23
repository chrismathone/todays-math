/**
 * 중1 「정수와 유리수의 계산」 27유형이 **지금 무엇을 내놓는가**의 지문 한 줄.
 *
 * 변이 시험이 쓰는 물건이다. 2026-08-21 교훈: 변이의 판정 순서는
 * ⑴ 파일이 바뀌었나 ⑵ **산출물이 바뀌었나** ⑶ 그제서야 시험이 빨개지나 다.
 * ⑵ 를 건너뛰면 «뜻이 안 바뀐 변이»를 두고 「가드가 아니다」라고 오판해
 * 멀쩡한 가드를 고치러 간다.
 *
 * 씨앗이 같으면 결과가 같으므로(엔진 계약) 이 지문은 결정적이다.
 * 생성이 던지면 그것도 «달라진 산출물»이므로 사유를 지문에 적는다.
 */
import { createHash } from "node:crypto";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_CALC } from "../../src/lib/middle/m1Calc";

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31337, 5, 909090];

const parts: string[] = [];
for (const e of M1_CALC) {
  for (const seed of SEEDS) {
    try {
      const p = generateMiddleProblem(e.key, seed);
      parts.push(
        [
          e.key,
          seed,
          p.unitSection,
          p.content,
          p.answer,
          p.solution,
          JSON.stringify(p.facts),
        ].join(""),
      );
    } catch (err) {
      parts.push([e.key, seed, "THROW", (err as Error).message].join(""));
    }
  }
}

const digest = createHash("sha256").update(parts.join("")).digest("hex");
console.log(`${digest} ${M1_CALC.length}유형 ${parts.length}건`);
