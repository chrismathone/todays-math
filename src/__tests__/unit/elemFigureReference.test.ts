/**
 * **엔진 문항이 «없는 그림»을 가리키지 않는가.**
 *
 * ## 왜 생겼나 (2026-08-28)
 *
 * 초4 2-4-1 여섯 문형이 이렇게 나가고 있었다:
 *
 *     $5$번 그림처럼 두 직선이 직각으로 만날 때 두 직선은 서로 무엇이라고 하는가?
 *
 * **그 그림이 없다.** 생성기는 `fig("lineRelation", { relation: "perpendicular" })`
 * 를 실었는데 엔진이 그 값을 안 받아(지금은 `parallel` 뿐) 렌더가 실패했고, 33문항이
 * 전부 그림 없이 적재됐다. 종이에서는 학생이 있지도 않은 「5번 그림」을 찾게 된다.
 * 게다가 그 `$5$` 는 답을 하나도 안 바꾸는 **순수 잡음**이었다 — 변형 규칙(문형 여덟)을
 * 채우려고 넣은 것이다.
 *
 * ## 🔴 왜 아무 자도 못 봤나 — 축이 없었다
 *
 * - `probe-elem-figure-demand.ts` 는 스스로 「**이 도구는 그림을 그리지 않는다**」고
 *   적어 둔다. 스펙이 붙었는지와 `kind` 만 본다 — 「붙였는데 못 그린다」는 못 본다.
 * - 값 검산은 답이 맞는지만 본다. 이 문항들은 **답이 맞다.**
 * - KaTeX·tsc 는 당연히 초록이다.
 *
 * 그래서 **발문이 그림을 가리키는데 그림이 없는가**를 직접 묻는다. 렌더를 안 하므로
 * 싸고, 관문에서 전 학년·전 갈래를 훑을 수 있다.
 *
 * ## ⚠️ 이 자가 못 보는 것
 *
 * 「스펙은 붙었는데 엔진이 못 그린다」는 **여기서 안 잡힌다** — 그건 실제로 그려 봐야
 * 안다(중등 `J30503` 8건이 그 부류다). 이 자는 **그림 없이 나가는 문항이 그림을
 * 가리키는가**만 본다. 둘은 다른 축이고, 둘 다 있어야 한다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

/**
 * **발문이 지면의 그림을 가리키는 말.**
 *
 * ⚠️ 「그림그래프」·「그림자」처럼 **낱말 안에 든 «그림»** 은 가리키는 말이 아니다 —
 *    이 저장소가 2026-08-18 에 그걸로 1,499건을 잘못 셌다. 그래서 낱말이 아니라
 *    **지시 어형**(«N번 그림», «다음 그림», «위 그림», «그림에서/그림처럼/그림과 같이»)
 *    으로 좁힌다.
 */
const POINTS_AT_FIGURE = [
  /\$?\d+\$?\s*번\s*(그림|처럼)/, // 「$5$번 그림처럼」·「$2$번처럼」
  /(다음|아래|위|오른쪽|왼쪽)\s*그림/,
  /그림(에서|처럼|과 같이|와 같이|을 보고)/,
];

/** 「그림그래프」류 — 「그림」이 들어가도 지면의 그림을 가리키지 않는다. */
const NOT_A_POINTER = /그림그래프|그림 그래프|그림자/;

function pointsAtFigure(content: string): string | null {
  const text = content.replace(NOT_A_POINTER, "").replace(/\s+/g, " ");
  for (const re of POINTS_AT_FIGURE) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

describe("[엔진 문항] 발문이 없는 그림을 가리키지 않는다", () => {
  it("**검출기가 살아 있다** — 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다", () => {
    expect(
      pointsAtFigure("$5$번 그림처럼 두 직선이 직각으로 만날 때"),
    ).not.toBeNull();
    expect(
      pointsAtFigure("$2$번처럼 두 직선이 수직으로 만나면"),
    ).not.toBeNull();
    expect(
      pointsAtFigure("다음 그림에서 각의 크기를 구하시오."),
    ).not.toBeNull();
    expect(pointsAtFigure("그림과 같이 놓인 도형의 넓이는?")).not.toBeNull();
    // 반대쪽 — 멀쩡한 발문을 물면 거짓 경보가 되고, 거짓 경보는 가드를 끈다.
    expect(pointsAtFigure("직선 가에 수선을 $8$개 그었습니다.")).toBeNull();
    expect(pointsAtFigure("그림그래프로 나타내시오.")).toBeNull();
    expect(pointsAtFigure("나무의 그림자 길이를 구하시오.")).toBeNull();
  });

  it("🔴 **그림이 없는 문항은 그림을 가리키지 않는다** — 전 학년·전 갈래", () => {
    const units = elementaryUnits();
    const bad: string[] = [];
    let checked = 0;
    let withoutFigure = 0;

    for (const unit of units) {
      const tiers = supportedTiers(unit);
      if (tiers.length === 0) continue;
      for (const seed of [20260827, 20261836, 7, 12345]) {
        for (const tier of tiers) {
          let problem;
          try {
            problem = generateElementaryProblem(unit, seed, tier);
          } catch {
            continue; // 생성 실패는 이 자의 축이 아니다
          }
          checked += 1;
          if (problem.figureSpec) continue;
          withoutFigure += 1;
          const hit = pointsAtFigure(problem.content);
          if (hit)
            bad.push(
              `${unit.grade} ${unit.section} [${tier}] «${hit}» — ${problem.content.replace(/\s+/g, " ").slice(0, 70)}`,
            );
        }
      }
    }

    // 🔴 분모를 같이 센다 — 0건 통과가 「안 돌았다」와 구분돼야 한다.
    expect(checked).toBeGreaterThan(500);
    expect(withoutFigure).toBeGreaterThan(100);
    expect(
      [...new Set(bad)].slice(0, 12),
      bad.length
        ? `\n그림 없이 나가는데 발문이 그림을 가리킨다 (${bad.length}건):\n` +
            [...new Set(bad)].slice(0, 12).join("\n")
        : undefined,
    ).toEqual([]);
  });

  it("🔴 **`ELEM_TIERS` 를 다 돌았다** — 갈래 하나가 빠지면 그 갈래는 영영 0이다", () => {
    // 사다리를 손으로 나열하지 않는다(D-106). 여기가 비면 위 시험의 분모가 거짓이다.
    expect(ELEM_TIERS.length).toBeGreaterThanOrEqual(4);
  });
});
