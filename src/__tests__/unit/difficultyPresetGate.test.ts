/**
 * **프리셋과 콘텐츠가 서로를 앞지르지 못하게 하는 양방향 가드** (D-115, 2026-08-30).
 *
 * 축을 여섯으로 넓히며(D-113) 새 갈래 둘을 **선택**으로 두었고, 반 배분 프리셋은
 * **콘텐츠가 찬 뒤에** 옮기기로 했다. 그 「뒤에」를 사람 기억에 맡기면 그 사람이 잊는
 * 날 그대로 나간다 — 이 저장소가 여러 번 겪은 자리다. 그래서 **양쪽 다** 막는다.
 *
 * ```
 * ㉠ 너무 일찍 옮기면      → 비율 > 0 인데 그 갈래를 내는 소단원이 하나도 없다 → 빨강
 * ㉡ 다 채우고 안 옮기면   → 230/230 이 그 갈래를 «문형»으로 내는데 프리셋이 전부 0 → 빨강
 * ```
 *
 * ## ⚠️ ㉡ 은 **문형**을 본다 — 갈래가 아니다
 *
 * 적재기(`load-engine-problems.ts`)는 `generateElementaryForm` 을 돈다. 갈래만 채우면
 * `probe-elem-extending-tiers` 의 갈래 줄은 230/230 인데 **지면에는 한 건도 안 나간다**
 * (D-114 ⑴). 「채워졌다」의 뜻은 **문형이 그 갈래를 낸다**는 것이다.
 *
 * ## ⚠️ ㉡ 은 지금 **구조적으로 초록**이다 — 그래서 눈금을 같이 둔다
 *
 * 심화중·심화상이 0/230 이라 ㉡ 의 전제(`230/230`)가 참이 될 일이 없다. 살아 있는
 * 엔진만 보면 이 검사가 **세는 능력을 잃어도 답이 똑같다.** 그건 재는 게 아니라 도장이다.
 * 그래서 **지어낸 표로 두 함수를 직접 댄다**(양성·음성 둘 다).
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_DIFFICULTY_RATIO,
  DIFFICULTY_LADDER,
  type Difficulty,
} from "@/contracts/difficulty";
import { TIER_PRESETS } from "@/lib/elementary/difficulty";
import { listedForms } from "@/lib/elementary/forms";
import { elementaryUnits, supportedTiers } from "@/lib/elementary/generate";

/** 「소단원 하나가 어떤 갈래를 내는가」 — 세는 쪽이 보는 전부. */
type UnitTiers = { key: string; formTiers: readonly string[] };

/** 프리셋·공장 기본값이 **요구하는** 갈래 (비율 > 0). */
export function tiersDemanded(
  presets: Record<string, Record<string, number>>,
  fallback: Record<string, number>,
): Difficulty[] {
  return DIFFICULTY_LADDER.filter(
    (t) =>
      Object.values(presets).some((p) => (p[t] ?? 0) > 0) ||
      (fallback[t] ?? 0) > 0,
  );
}

/**
 * **모든** 등록 소단원이 «문형»으로 내는 갈래.
 *
 * ⚠️ 「하나라도 낸다」가 아니라 「전부 낸다」다. 절반만 찬 상태에서 프리셋을 옮기면
 *    나머지 절반의 시험지가 이웃 갈래로 조용히 대체된다.
 */
export function tiersFullyFilled(rows: readonly UnitTiers[]): Difficulty[] {
  const live = rows.filter((r) => r.formTiers.length > 0);
  if (live.length === 0) return [];
  return DIFFICULTY_LADDER.filter((t) =>
    live.every((r) => r.formTiers.includes(t)),
  );
}

function engineRows(): UnitTiers[] {
  return elementaryUnits().map((u) => ({
    key: `${u.grade}|${u.section.split(" ")[0]}`,
    formTiers: [...new Set(listedForms(u).map((f) => f.tier as string))],
  }));
}

describe("[D-115] 프리셋과 콘텐츠 — 양방향 가드", () => {
  it("㉠ 프리셋이 요구하는 갈래는 **그것을 내는 소단원이 하나 이상** 있어야 한다", () => {
    const demanded = tiersDemanded(TIER_PRESETS, DEFAULT_DIFFICULTY_RATIO);
    expect(
      demanded.length,
      "요구하는 갈래가 하나도 없다 — 이 검사는 아무것도 안 재고 있다",
    ).toBeGreaterThan(0);

    const units = elementaryUnits();
    for (const tier of demanded) {
      const n = units.filter((u) =>
        (supportedTiers(u) as readonly string[]).includes(tier),
      ).length;
      expect(
        n,
        `프리셋이 «${tier}» 에 비율을 주는데 그 갈래를 내는 소단원이 없다.\n` +
          `   콘텐츠보다 프리셋을 먼저 옮겼다 — 출제가 그 자리를 이웃으로 조용히 대체한다(D-115 ⑻).`,
      ).toBeGreaterThan(0);
    }
  });

  it("㉡ **230/230 이 문형으로 내는** 갈래는 프리셋 중 하나가 비율을 줘야 한다", () => {
    const filled = tiersFullyFilled(engineRows());
    for (const tier of filled) {
      const given =
        Object.values(TIER_PRESETS).some((p) => (p[tier] ?? 0) > 0) ||
        (DEFAULT_DIFFICULTY_RATIO[tier] ?? 0) > 0;
      expect(
        given,
        `«${tier}» 이 전 소단원 문형에 다 찼는데 프리셋이 전부 0 이다.\n` +
          `   이제 프리셋을 옮겨라 — D-115 ⑺ 이 정한 값: 상위반 0/25/40/13/12/10.\n` +
          `   같은 커밋에서 elementaryDifficulty.test.ts 의 리터럴 3블록도 같이 고친다.`,
      ).toBe(true);
    }
  });

  /**
   * 🔴 위 ㉡ 은 **오늘 구조적으로 초록**이다(심화중·심화상 0/230). 그러니 여기서
   * 지어낸 표로 두 함수를 직접 댄다 — 없으면 ㉡ 은 「깨끗」이 아니라 「못 셈」이다.
   */
  describe("눈금 — 이 가드가 «아니오» 를 낼 수 있나", () => {
    const CORE = ["연산", "기본", "응용", "심화하"];
    const u = (key: string, formTiers: string[]): UnitTiers => ({
      key,
      formTiers,
    });

    it("음성 — 핵심 넷뿐이면 «다 찼다» 가 나오지 않는다", () => {
      expect(
        tiersFullyFilled([u("초X|1-1-1", CORE), u("초X|1-1-2", CORE)]),
      ).toEqual(CORE);
    });

    it("양성 — 전부 채우면 그 갈래가 «다 찼다» 로 잡힌다", () => {
      expect(
        tiersFullyFilled([
          u("초X|1-1-1", [...CORE, "심화중"]),
          u("초X|1-1-2", [...CORE, "심화중"]),
        ]),
      ).toEqual([...CORE, "심화중"]);
    });

    it("🔴 **한 소단원만 빠져도 «다 찼다» 가 아니다** — 절반만 찬 채로 옮기면 안 된다", () => {
      expect(
        tiersFullyFilled([
          u("초X|1-1-1", [...CORE, "심화중"]),
          u("초X|1-1-2", CORE),
        ]),
      ).toEqual(CORE);
    });

    it("분모 — 문형이 하나도 없는 소단원은 «전부» 의 분모에서 뺀다", () => {
      expect(
        tiersFullyFilled([
          u("초X|1-1-1", [...CORE, "심화상"]),
          u("초X|9-9-9", []),
        ]),
      ).toEqual([...CORE, "심화상"]);
    });

    it("분모 — 표가 비면 아무 갈래도 «다 찼다» 가 아니다 (있는 척하지 않는다)", () => {
      expect(tiersFullyFilled([])).toEqual([]);
    });

    it("양성 — 프리셋이 비율을 주면 «요구한다» 로 잡힌다", () => {
      const p = {
        상위반: { 연산: 0, 기본: 0, 응용: 0, 심화하: 0, 심화중: 7, 심화상: 0 },
      };
      const zero = Object.fromEntries(DIFFICULTY_LADDER.map((t) => [t, 0]));
      expect(tiersDemanded(p, zero)).toEqual(["심화중"]);
    });

    it("음성 — 비율이 전부 0 이면 요구하는 갈래가 없다", () => {
      const zero = Object.fromEntries(DIFFICULTY_LADDER.map((t) => [t, 0]));
      expect(tiersDemanded({ 상위반: zero }, zero)).toEqual([]);
    });

    it("공장 기본값도 «요구» 로 센다 — 프리셋만 보면 새 반이 새어 나간다", () => {
      const zero = Object.fromEntries(DIFFICULTY_LADDER.map((t) => [t, 0]));
      expect(tiersDemanded({ 상위반: zero }, { ...zero, 응용: 3 })).toEqual([
        "응용",
      ]);
    });
  });
});
