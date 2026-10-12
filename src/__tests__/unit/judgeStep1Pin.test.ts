/**
 * **1단계 판정형의 산출물을 얼린다** — 이미 공유 DB 에 실린 36행(2026-10-08 적재 · 씨앗 20261008 · v0~v11)의 글자.
 *
 * 2단계가 등록부 · 생성기의 틀을 넓힌다(`calcJudge.ts` 로 뽑아낸 공용 짓기 · 비교 문형 관문). 그 손질이
 * 1단계의 **난수 소비 차례**를 하나라도 건드리면 같은 씨앗이 다른 문제를 낸다 — 규칙판(`r1`)은 그대로인데
 * 문제만 바뀌는, 제자리 갱신이 «같은 문항 코드 · 다른 문제»를 만드는 바로 그 사고다(2026-10-03 «298행»).
 * 제자리 갱신 드라이런(`refresh-engine-content`)이 같은 것을 DB 에 대어 재지만, 그것은 느리고 `.env` 가 든다.
 * 여기서 먼저 운다.
 *
 * 🔴 이 지문이 바뀌었다면 **지문을 고치지 말고** 생성기를 되돌린다. 정말 바꿔야 하면 규칙판을 올리고
 *    (`ruleVersion`) 리드에게 묻는다 — 옛 판의 열쇠를 다시 쓰지 않는다(`contract.ts` 머리말).
 */
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { generateJudgeProblem } from "@/lib/middle/judge/registry";

const SECTION = "유리수의 덧셈과 뺄셈";
/** 적재 계획 `scripts/import/plans/2026-10-08-중1-계산판정.json` 의 씨앗 · 벌 수 그대로. */
const SEED = 20261008;
const VARIANTS = 12;

/** 2단계 착수 전(`ff3ca6a4e`)의 생성기로 뗀 값. */
const PINNED: Record<string, string> = {
  "calc-add2":
    "b624ccd3b95063e4e50e6e3d3528d9d5c93467277b205f5981a98fee4a10f911",
  "calc-sub2":
    "390f23ccd81dad2b3ec79ab85e074ce841fa6dc77f1d21f28352b0ee585c92a8",
  "calc-mix4":
    "8e2ba4814e7f153acdc84860560ef1154b873b94eda1feb2f7219f1eaf2f7bc1",
};

describe("1단계 판정형 36행 — 본문 · 정답 · 해설 · 난이도의 지문이 그대로다", () => {
  for (const [familyId, want] of Object.entries(PINNED)) {
    it(familyId, () => {
      const key = `중1|${SECTION}|${familyId}`;
      const parts: string[] = [];
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateJudgeProblem(key, SEED, v);
        parts.push(
          [v, p.content, p.answer, p.solution, p.difficulty].join("|"),
        );
      }
      expect(createHash("sha256").update(parts.join("\n")).digest("hex")).toBe(
        want,
      );
    });
  }
});
