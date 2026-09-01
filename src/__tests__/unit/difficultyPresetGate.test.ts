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

/**
 * 🔴 **㉠ 이 못 보는 것 — 「하나 이상」과 「전부」는 다른 말이다.**
 *
 * ㉠ 은 「그 갈래를 내는 소단원이 **하나 이상**」만 묻는다. 그런데 `/elem-gen --preset`
 * 은 **고른 소단원 하나**에서 배분대로 낸다 — 그 소단원에 그 갈래가 없으면
 * `generateElementaryProblem` 이 **던진다**(「아직 채우지 않은 갈래입니다」).
 * 그래서 ㉠ 만 있으면 «84/230 만 찬 상태에서 프리셋을 옮기는» 변경이 **초록으로
 * 통과하고**, 원장님 도구가 146개 소단원에서 죽는다. 2026-09-01 에 실제로 재서
 * 드러났다 — 제안값 `0/25/40/13/12/10` 을 230소단원에 대니 8문항에서 **328번**,
 * 30문항에서 **1,130번** 던졌다.
 *
 * ⚠️ **`supportedTiers`(갈래)로 센다 — `listedForms`(문형)가 아니다.** 던지는 쪽이
 *    갈래를 보기 때문이다(㉡ 은 반대로 문형을 본다 — 적재기가 문형을 돌므로).
 *    오늘은 둘이 같은 수지만, 한쪽만 채우는 날 이 구분이 답을 가른다(D-114 ⑴).
 */
export function presetGaps(
  presets: Record<string, Record<string, number>>,
  rows: readonly { key: string; varTiers: readonly string[] }[],
): { preset: string; tier: string; missing: number }[] {
  const out: { preset: string; tier: string; missing: number }[] = [];
  for (const [name, pct] of Object.entries(presets)) {
    for (const tier of DIFFICULTY_LADDER) {
      if ((pct[tier] ?? 0) <= 0) continue;
      const missing = rows.filter((r) => !r.varTiers.includes(tier)).length;
      if (missing > 0) out.push({ preset: name, tier, missing });
    }
  }
  return out;
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

  it("㉠′ 프리셋이 요구하는 갈래는 **모든** 소단원이 내야 한다 — /elem-gen 이 거기서 던진다", () => {
    const rows = elementaryUnits().map((u) => ({
      key: `${u.grade}|${u.section.split(" ")[0]}`,
      varTiers: supportedTiers(u) as readonly string[],
    }));
    const gaps = presetGaps(TIER_PRESETS, rows);
    expect(
      gaps,
      "프리셋이 요구하는 갈래를 못 내는 소단원이 있다 — `/elem-gen --preset` 이 거기서 던진다." +
        gaps
          .map(
            (g) =>
              `\n   · ${g.preset} «${g.tier}» — ${g.missing}개 소단원에 없다`,
          )
          .join("") +
        "\n   콘텐츠를 먼저 채워라. 세는 법: supportedTiers 가 그 갈래를 돌려주는 소단원 수 (D-115 ⑻).",
    ).toEqual([]);
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

    // ── ㉠′ 의 눈금 — 이 자는 **오늘 살아 있는 프리셋에서는 늘 초록**이다
    //    (심화중·심화상 비율이 0이라 요구가 없다). 그러니 지어낸 표로 직접 댄다.
    const v = (key: string, varTiers: string[]) => ({ key, varTiers });
    const CORE4 = ["연산", "기본", "응용", "심화하"];
    const 제안상위반 = {
      상위반: {
        연산: 0,
        기본: 25,
        응용: 40,
        심화하: 13,
        심화중: 12,
        심화상: 10,
      },
    };

    it("🔴 양성 — 84/230 만 찬 상태에서 제안값을 옮기면 **구멍이 잡힌다**", () => {
      // 실제 2026-09-01 모양: 넷은 전부, 심화중은 일부, 심화상은 더 적다.
      const rows = [
        v("초X|1-1-1", [...CORE4, "심화중", "심화상"]),
        v("초X|1-1-2", [...CORE4, "심화중"]),
        v("초X|1-1-3", CORE4),
      ];
      expect(presetGaps(제안상위반, rows)).toEqual([
        { preset: "상위반", tier: "심화중", missing: 1 },
        { preset: "상위반", tier: "심화상", missing: 2 },
      ]);
    });

    // 🔴 이 음성 대조는 **리터럴**이다 — 살아 있는 `TIER_PRESETS` 를 넣었더니
    //    제품을 옮기는 변이에서 눈금까지 같이 빨개졌다(2026-09-01, 변이로 확인).
    //    눈금의 참이 제품에서 오면 그 눈금은 제품이 바뀔 때 뜻을 잃는다.
    it("음성 — 확대 갈래에 비율을 안 주면 핵심 넷만 있는 표에서도 구멍이 없다", () => {
      const 현행상위반 = {
        상위반: {
          연산: 0,
          기본: 25,
          응용: 40,
          심화하: 35,
          심화중: 0,
          심화상: 0,
        },
      };
      const rows = [v("초X|1-1-1", CORE4), v("초X|1-1-2", CORE4)];
      expect(presetGaps(현행상위반, rows)).toEqual([]);
    });

    it("음성 — 다 채우면 제안값을 옮겨도 구멍이 없다 (옮겨도 되는 날의 모양)", () => {
      const full = [...CORE4, "심화중", "심화상"];
      const rows = [v("초X|1-1-1", full), v("초X|1-1-2", full)];
      expect(presetGaps(제안상위반, rows)).toEqual([]);
    });

    it("🔴 **한 소단원만 빠져도 구멍이다** — 「거의 다 찼다」로 옮기면 그 하나에서 던진다", () => {
      const full = [...CORE4, "심화중", "심화상"];
      const rows = [
        v("초X|1-1-1", full),
        v("초X|1-1-2", full),
        v("초X|1-1-3", [...CORE4, "심화상"]),
      ];
      expect(presetGaps(제안상위반, rows)).toEqual([
        { preset: "상위반", tier: "심화중", missing: 1 },
      ]);
    });
  });
});
