/**
 * 초등 갈래 시험의 **공통 자** (D-113, 2026-08-30).
 *
 * ## 왜 생겼나 — 「축이 여섯」과 「이 소단원이 내는 갈래」는 다른 목록이다
 *
 * 2026-08-30 에 난이도 축을 여섯으로 넓혔다(`연산·기본·응용·심화하·심화중·심화상`).
 * 그런데 초등 콘텐츠는 아직 **핵심 넷**만 채워져 있다. 그래서 시험이
 * `for (const tier of ELEM_TIERS)` 로 **축 전체**를 돌면 안 채운 갈래를 만들려다
 * 던진다 — 실제로 관문 419건이 그렇게 빨개졌다.
 *
 * 여기서 **손으로 넷을 적으면 목록이 두 벌이 된다.** 그러면 채우는 회차마다
 * 「그 파일도 고쳤나」를 사람이 기억해야 하고, 그 사람이 잊는 날 새 갈래는
 * **아무 검사도 안 받은 채** 지면으로 나간다(이 저장소가 여러 번 적은
 * 「규칙이 옳아도 배선이 한쪽만 되면 그쪽 지표만 좋아진다」의 자리다).
 *
 * 그래서 시험은 **소단원에 실제로 등록된 갈래**를 돌린다. 그러면
 * `심화중` 을 채우는 순간 그 소단원의 **품질 검사 전부가 저절로** 새 갈래를 덮는다.
 */
import { expect } from "vitest";

import { CORE_DIFFICULTIES, DIFFICULTY_LADDER } from "@/contracts/difficulty";
import type { ElemTier } from "@/lib/elementary/difficulty";
import { supportedTiers } from "@/lib/elementary/generate";

import type { UnitSeed } from "../../../prisma/seed-data/units";

/**
 * **이 소단원이 지금 내는 갈래.** 시험의 갈래 루프는 전부 이것을 돌아야 한다.
 *
 * ⚠️ `ELEM_TIERS`(=축 전체)를 돌면 안 채운 갈래에서 던진다. 반대로 핵심 넷을
 *    손으로 적으면 채운 뒤에도 검사가 안 따라온다. 둘 다 아니어야 한다.
 */
/**
 * ⚠️ **형제 소단원을 한 루프에 넣은 자리가 17곳 있다** (초5 10 · 초6 3 · 초3 4,
 *    2026-08-30 수술에서 세 세션이 각각 보고). 그 루프는 **대표 소단원 하나**의
 *    `tiersOf` 로 도는데, 형제 중 **하나만 먼저 심화중을 채우면** 대표가 그 형제일 때
 *    다른 형제에서 `generateElementaryProblem` 이 **던진다.**
 *
 *    🔴 **이건 결함이 아니라 설계다.** 교집합을 돌게 하면 조용히 넘어가지만
 *    그러면 새로 채운 갈래가 **아무 검사도 안 받는다** — 「0 이 «깨끗»인지 «못 셈»인지」
 *    그 자리다. 그래서 **일부러 시끄럽게** 두었다.
 *    던지면 **그 시험의 루프를 소단원마다 쪼개라**(대표를 바꿔 때우면 다음 형제에서 또 던진다).
 *
 * ⚠️ **전 학년 쓸기에는 이것을 쓰지 마라.** 아래는 「갈래가 0이면 실패」라서,
 *    아직 4단으로 안 넓힌 소단원까지 훑는 스윕에서는 **멀쩡한 시험을 깨뜨린다.**
 *    그런 자리는 `supportedTiers(u)` 를 직접 쓰고 `[undefined, ...supportedTiers(u)]`
 *    로 돈다(빈 배열이면 표준 하나만 도는 옛 동작과 **정확히** 같다).
 *    2026-08-30 초4 스윕 둘이 그 자리였다.
 */
export function tiersOf(unit: UnitSeed): readonly ElemTier[] {
  const tiers = supportedTiers(unit);
  // 하나도 없으면 그 루프는 **아무것도 안 돈다** — 시험이 통째로 초록이 되어
  // 「검사했다」가 거짓말이 된다. 0 은 「깨끗」이 아니라 「못 셈」이다.
  expect(
    tiers.length,
    `${unit.grade} ${unit.section}: 등록된 갈래가 하나도 없다 — 이 시험은 아무것도 재지 못한다`,
  ).toBeGreaterThan(0);
  return tiers;
}

/**
 * **핵심 넷은 반드시 있다.** 확대 둘(`심화중`·`심화상`)은 채우는 중이라 있어도 없어도 된다.
 *
 * 종전에는 `expect(supportedTiers(u)).toEqual(ELEM_TIERS)` 였다. 그것은 축이 넷일 때만
 * 맞는 말이고, 축을 넓히는 순간 **「덜 찼다」와 「축이 넓어졌다」를 구분 못 한다.**
 * 여기서는 둘을 갈라서 본다 — 핵심이 빠지면 빨강, 확대가 붙으면 통과.
 */
export function expectCoreTiers(unit: UnitSeed, label?: string): void {
  const tiers = supportedTiers(unit);
  const at = label ?? `${unit.grade} ${unit.section}`;
  // ⑴ 핵심 넷이 **사다리 순서 그대로** 다 있다.
  expect(
    tiers.filter((t) => (CORE_DIFFICULTIES as readonly string[]).includes(t)),
    `${at}: 핵심 갈래`,
  ).toEqual([...CORE_DIFFICULTIES]);
  // ⑵ 사다리에 없는 값이 새어 들어오지 않는다(오타 갈래·옛 이름).
  for (const t of tiers) {
    expect(
      (DIFFICULTY_LADDER as readonly string[]).includes(t),
      `${at}: 사다리에 없는 갈래 «${t}»`,
    ).toBe(true);
  }
}
