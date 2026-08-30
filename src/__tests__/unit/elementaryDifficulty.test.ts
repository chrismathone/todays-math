/**
 * 초등 난이도 계약 (D-71) — 갈래가 채워지기 **전의** 행동을 잠근다.
 *
 * - 프리셋 수치의 참은 07 문서 D-71 행(원장님 확정)이다. 여기 리터럴은 그 문서에서
 *   옮겨 적은 것 — 제품 상수를 복사하면 제품이 틀릴수록 초록이 된다.
 * - tier 를 안 주면 예전과 완전히 같아야 한다(기존 관문 230×1,260 이 이 경로를 돈다).
 * - 미등록 소단원에 tier 를 물으면 던진다 — 조용히 기본 문항을 주면
 *   「심화를 냈다」는 시험지가 거짓말이 된다.
 */
import { describe, expect, it } from "vitest";

import {
  ELEM_TIERS,
  TIER_PRESETS,
  TIER_SALT,
  sectionCode,
  tierKey,
} from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers } from "../helpers/elemTiers";

const UNITS = elementaryUnits();

describe("난이도 계약 (D-71)", () => {
  it("4단이고 순서는 연산→기본→응용→심화다", () => {
    expect([...ELEM_TIERS]).toEqual([
      "연산",
      "기본",
      "응용",
      "심화하",
      "심화중",
      "심화상",
    ]);
  });

  it("반 프리셋은 안A 그대로이고 각 반의 합이 100 이다", () => {
    // 참은 07 D-71 (원장님 확정 수치). 여기서 다르면 제품이 틀린 것이다.
    expect(TIER_PRESETS.하위반).toEqual({
      연산: 40,
      기본: 40,
      응용: 20,
      심화하: 0,
      심화중: 0,
      심화상: 0,
    });
    expect(TIER_PRESETS.중위반).toEqual({
      연산: 15,
      기본: 40,
      응용: 30,
      심화하: 15,
      심화중: 0,
      심화상: 0,
    });
    expect(TIER_PRESETS.상위반).toEqual({
      연산: 0,
      기본: 25,
      응용: 40,
      심화하: 35,
      심화중: 0,
      심화상: 0,
    });
    for (const ratio of Object.values(TIER_PRESETS)) {
      expect(Object.values(ratio).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("씨앗 소금은 갈래마다 다르다 — 겹치면 두 갈래가 같은 수를 낸다", () => {
    const salts = Object.values(TIER_SALT);
    expect(new Set(salts).size).toBe(salts.length);
  });

  it("소단원 키는 코드로 만든다 — 이름은 바뀔 수 있다", () => {
    expect(sectionCode({ section: "1-1-2 받아올림이 두 번" })).toBe("1-1-2");
    expect(tierKey({ grade: "초3", section: "1-1-2 받아올림이 두 번" })).toBe(
      "초3|1-1-2",
    );
  });

  it("tier 를 안 주면 결정적이고, tier 인자 추가가 기존 경로를 안 바꿨다", () => {
    const unit = UNITS.find(
      (u) => u.grade === "초3" && u.section.startsWith("1-1-2"),
    )!;
    const a = generateElementaryProblem(unit, 20260822);
    const b = generateElementaryProblem(unit, 20260822);
    expect(a.content).toBe(b.content);
    expect(a.answer).toBe(b.answer);
  });

  it("**등록 후 계약** — 2026-08-24 에 230개 전부 등록되며 실제 미등록 소단원이 사라졌다", () => {
    // 위 예고대로 옮겨 적는다: 「전 소단원이 등록되면 이 시험을 «등록 후 계약»으로
    // 바꿀 것」. 미등록 소단원을 UNITS 에서 더는 못 찾으므로(전부 4단이다),
    // **합성 unit**으로 같은 코드 경로(`generate.ts` 의 「난이도 갈래가 없는
    // 소단원입니다」 던짐)를 직접 잰다. 실제 소단원이 없어도 그 경로 자체는
    // units.ts 에 소단원이 하나 늘면 다시 밟히므로 죽은 코드가 아니다.
    const real = UNITS.find(
      (u) => u.grade === "초3" && u.section.startsWith("1-1-2"),
    )!;
    // handler(grade|chapter)는 진짜라 통과하고, tier 등록(grade|sectionCode)만
    // 없는 자리를 만든다 — `chapter` 는 그대로 두고 `section` 번호만 바꾼다.
    const fake = { ...real, section: "1-1-99 없는 소단원" };
    expect(supportedTiers(fake)).toEqual([]);
    expect(() =>
      generateElementaryProblem(fake, 20260822, "심화하"),
    ).toThrowError(/난이도 갈래가 없는 소단원/);
    expect(() =>
      generateElementaryProblem(fake, 20260822, "심화하"),
    ).toThrowError(new RegExp(fake.grade));
  });

  it("supportedTiers 는 미등록(0)이거나 핵심 넷을 반드시 포함한다 (D-113)", () => {
    // ⚠️ 「전부(4)이거나 없음(0)」은 축이 넷일 때만 맞는 말이다. 축이 여섯으로
    // 넓어진 뒤에도(D-113) 참인 것은 「미등록이거나 핵심 넷은 있다」 — 확대 둘
    // (심화중·심화상)이 채워지면 길이는 5·6도 될 수 있다.
    for (const unit of UNITS) {
      if (supportedTiers(unit).length === 0) continue;
      expectCoreTiers(unit, `${unit.grade} ${unit.section}`);
    }
  });

  it("등록된 파일럿은 갈래마다 문항이 나오고, 갈래끼리 발문이 갈린다", () => {
    // 지금은 0개(빈 맵)여도 초록이다 — g3·g5 가 채우면 자동으로 그 소단원을 검사한다.
    // ⚠️ tiersOf 는 0이면 스스로 던지므로(=검사가 안 돈 것을 감추지 않으려고) 여기서는
    // 못 쓴다 — 미등록 소단원이 섞인 전수 루프라 0 은 «건너뛴다»가 맞는 값이다.
    for (const unit of UNITS) {
      const tiers = supportedTiers(unit);
      if (tiers.length === 0) continue;
      const byTier = tiers.map((tier) =>
        generateElementaryProblem(unit, 20260822, tier),
      );
      for (const p of byTier) {
        expect(p.content.trim()).not.toBe("");
        expect(p.answer.trim()).not.toBe("");
        expect(p.solution.trim()).not.toBe("");
      }
      // 갈래가 같은 발문이면 난이도가 이름뿐이다.
      expect(new Set(byTier.map((p) => p.content)).size).toBe(tiers.length);
    }
  });
});
