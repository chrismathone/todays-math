import {
  DIFFICULTY_LADDER,
  type CoreDifficulty,
  type Difficulty,
  type ExtendingDifficulty,
} from "@/contracts/common.contract";

import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ChapterHandler } from "./types";

/**
 * 초등 난이도 4단 (D-71, 원장님 확정 2026-08-22).
 *
 * 이름이 곧 값이다 — 지면·반 프리셋·상담에서 같은 말을 쓰므로 매핑이 없다.
 *
 * 🔴 **2026-08-25(D-106)부터 이것이 제품의 유일한 난이도 축이다.** 예전 주석은
 *    「중·고등 `easy/mid/hard` 와는 다른 축이다. 억지로 잇지 말 것」이라고 적어
 *    두었는데, 축이 둘이라 적재기가 `연산`과 `기본`을 **둘 다 `easy` 로 접었고**
 *    화면에서는 그 둘을 되물을 방법이 없었다. 원장님이 문제은행에서 그것을 보시고
 *    「우리 엔진의 난이도와 통일시켜」라고 하셔서 DB·화면을 이 넷으로 옮겼다.
 *
 * ⚠️ 그래서 이제 `ElemTier` 는 계약의 `Difficulty` **바로 그것**이다 — 별칭만 남긴다.
 *    두 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
 */
export type ElemTier = Difficulty;
export const ELEM_TIERS = DIFFICULTY_LADDER;

/**
 * 반 프리셋 안A (%, D-71). 원장님이 언제든 숫자를 조정한다 —
 * 여기 값과 07 문서 D-71 행이 서로의 참이다. 합 100 은 시험이 잠근다.
 */
export type ClassPreset = "하위반" | "중위반" | "상위반";
export const TIER_PRESETS: Record<ClassPreset, Record<ElemTier, number>> = {
  하위반: { 연산: 40, 기본: 40, 응용: 20, 심화하: 0, 심화중: 0, 심화상: 0 },
  중위반: { 연산: 15, 기본: 40, 응용: 30, 심화하: 15, 심화중: 0, 심화상: 0 },
  상위반: { 연산: 0, 기본: 25, 응용: 40, 심화하: 35, 심화중: 0, 심화상: 0 },
};

/**
 * 소단원 하나의 난이도 갈래 묶음.
 *
 * **핵심 넷(`연산·기본·응용·심화하`)은 전부** 채워야 등록된다 — `Record` 라 일부만
 * 채우면 컴파일이 막는다. 일부 갈래만 있으면 프리셋 비율이 그 소단원에서 조용히
 * 못 서기 때문이다.
 *
 * 🔴 **`심화중`·`심화상` 은 선택이다 (D-113, 2026-08-30).** 둘을 필수로 두면
 *    230개 소단원이 **전부 컴파일 오류**가 되어 「축을 세우는 일」과 「내용을 채우는
 *    일」을 나눌 수 없다. 안 채운 소단원에서는 `supportedTiers` 가 그 갈래를 **안
 *    돌려주고**, 출제는 애초에 안 뽑는다 — 「심화중을 냈다」가 거짓말이 되지 않는다.
 *
 * ⚠️ 다 차면 이 타입을 `Record<ElemTier, ChapterHandler>` 로 되돌리고
 *    `EXTENDING_DIFFICULTIES` 를 지운다. **몇 개가 남았는지는 세어서 찍는다** —
 *    `scripts/qa/probe-elem-extending-tiers.ts`. 0 이 「깨끗」인지 「못 셈」인지
 *    갈리지 않으면 이 확대는 조용히 멈춘 채 끝난 것처럼 보인다.
 */
export type TierVariants = Record<CoreDifficulty, ChapterHandler> &
  Partial<Record<ExtendingDifficulty, ChapterHandler>>;

/** 키는 `학년|소단원 코드` (예: `"초3|1-1-2"`) — `tierKey()` 가 만든다. */
export type ElemTierMap = Record<string, TierVariants>;

/** `"1-1-2 받아올림이 …"` → `"1-1-2"`. 코드가 키다 — 소단원 이름은 바뀔 수 있다. */
export function sectionCode(unit: Pick<UnitSeed, "section">): string {
  return unit.section.split(" ")[0]!;
}

export function tierKey(unit: Pick<UnitSeed, "grade" | "section">): string {
  return `${unit.grade}|${sectionCode(unit)}`;
}

/**
 * 같은 씨앗에서 갈래마다 다른 수가 나오게 하는 소금.
 * 값이 겹치면 두 갈래가 같은 rng 흐름을 타서 숫자가 같이 움직인다 — 시험이 잠근다.
 */
export const TIER_SALT: Record<ElemTier, number> = {
  연산: 0x1_0001,
  기본: 0x2_0002,
  응용: 0x3_0003,
  심화하: 0x4_0004,
  심화중: 0x5_0005,
  심화상: 0x6_0006,
};
