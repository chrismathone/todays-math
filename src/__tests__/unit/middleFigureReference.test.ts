/**
 * **중등 엔진 문항이 «없는 그림»을 가리키지 않는가.**
 *
 * ## 왜 생겼나 (2026-08-29)
 *
 * 공유 DB 적재본에서 그림이 하나도 안 붙는데 발문이 그림을 가리키는 중등 문항이
 * 있었다. 종이에서 학생이 없는 그림을 찾는다. 초등 쪽은
 * `elemFigureReference.test.ts` 가 같은 축을 이미 지킨다 — 중등판이다.
 *
 * ## 🔴 왜 아무 자도 못 봤나
 *
 * - 값 검산은 답이 맞는지만 본다. 이 문항들은 **답이 맞다.**
 * - KaTeX·tsc 는 당연히 초록이다.
 * - `middleFigureRenderable.test.ts` 는 **스펙을 실은 유형**만 그린다.
 *   스펙을 안 실은 유형은 그 자의 분모 밖이다.
 *
 * 그래서 **발문이 그림을 가리키는데 figureSpec 이 없는가**를 직접 묻는다.
 * 렌더를 안 하므로 싸고, 관문에서 전 유형을 훑을 수 있다.
 *
 * ## ⚠️ 이 자가 못 보는 것
 *
 * 「스펙은 붙었는데 엔진이 못 그린다」는 **여기서 안 잡힌다.** 그건 실제로
 * 그려 봐야 안다(`middleFigureRenderable.test.ts`). 둘은 다른 축이고 둘 다
 * 있어야 한다.
 */
import { describe, expect, it } from "vitest";

import { pointsAtFigure } from "@/lib/middle/figureReference";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";

describe("[중등 엔진] 발문이 없는 그림을 가리키지 않는다", () => {
  it("**검출기가 살아 있다** — 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다", () => {
    expect(
      pointsAtFigure(
        "그림과 같이 $l\\parallel m$이고, 두 직선 사이에 꺾인 점이 세 개 있는 선이 있다.",
      ),
    ).not.toBeNull();
    expect(
      pointsAtFigure(
        "그림과 같이 한 점 $O$에서 세 반직선 $OA$, $OB$, $OC$를 그었더니",
      ),
    ).not.toBeNull();
    expect(
      pointsAtFigure("그림에서 세 직선이 한 점 $O$에서 만난다."),
    ).not.toBeNull();
    expect(
      pointsAtFigure("다음 그림에서 각의 크기를 구하시오."),
    ).not.toBeNull();
    expect(
      pointsAtFigure("$5$번 그림처럼 두 직선이 직각으로 만날 때"),
    ).not.toBeNull();
    // 🔴 「산점도·상자그림」은 낱말 「그림」 없이 지면을 가리킨다 (2026-08-29).
    expect(
      pointsAtFigure(
        "다음은 학생 $7$명의 수학 점수(x)와 과학 점수(y)를 조사하여 나타낸 산점도이다. (x, y): $(50, 60)$",
      ),
    ).not.toBeNull();
    expect(
      pointsAtFigure(
        "다음 산점도에서 국어 점수가 영어 점수보다 높은 학생 수를",
      ),
    ).not.toBeNull();
    expect(
      pointsAtFigure("다음은 어느 반 학생들의 키를 나타낸 상자그림이다."),
    ).not.toBeNull();
    expect(
      pointsAtFigure("위 상자그림에서 사분범위를 구하시오."),
    ).not.toBeNull();
    // 반대쪽 — 멀쩡한 발문을 물면 거짓 경보가 되고, 거짓 경보는 가드를 끈다.
    // 🔴 「학생이 **직접 그리는**」 문형은 지면에 그림이 없는 것이 정상이다.
    //    낱말 「상자그림」으로 세면 이것까지 문다 — 그래서 어형으로 좁혔다.
    expect(
      pointsAtFigure(
        "다음은 어느 자료를 작은 값부터 크기순으로 나열한 것이다. 이 자료를 상자그림으로 나타낼 때 제$1$사분위수를 구하시오.",
      ),
    ).toBeNull();
    expect(pointsAtFigure("다음 자료를 산점도로 나타내시오.")).toBeNull();
    expect(pointsAtFigure("직선 가에 수선을 $8$개 그었습니다.")).toBeNull();
    expect(pointsAtFigure("그림그래프로 나타내시오.")).toBeNull();
    expect(pointsAtFigure("나무의 그림자 길이를 구하시오.")).toBeNull();
    // 🔴 「줄기와 잎 그림」은 표 이름이다. 이 저장소가 2026-08-18 에 같은
    //    낱말로 1,499건을 잘못 셌다. 유형 20·22·26·27·28 이 이 문장이다.
    expect(
      pointsAtFigure(
        "다음 줄기와 잎 그림에서 십의 자리 숫자가 $3$인 자료의 개수를 구하시오.\n(줄기 | 잎)\n$3$ | $1$ $2$ $3$",
      ),
    ).toBeNull();
    expect(
      pointsAtFigure(
        "다음 줄기와 잎 그림에 나타난 자료의 평균을 구하시오.\n(줄기 | 잎) $2$ | $0$ $1$",
      ),
    ).toBeNull();
  });

  it("🔴 **그림이 없는 문항은 그림을 가리키지 않는다** — 전 유형", () => {
    const types = registeredTypes();
    const bad: string[] = [];
    let checked = 0;
    let withoutFigure = 0;

    for (const entry of types) {
      for (const seed of [20260827, 20260824, 7, 12345]) {
        for (const variant of [0, 1, 2]) {
          let problem;
          try {
            problem = generateMiddleProblem(entry.key, seed, variant);
          } catch {
            continue;
          }
          checked += 1;
          if (problem.figureSpec) continue;
          withoutFigure += 1;
          const hit = pointsAtFigure(problem.content);
          if (hit) {
            bad.push(
              `${entry.key} s${seed}v${variant} «${hit}» — ${problem.content.replace(/\s+/g, " ").slice(0, 80)}`,
            );
          }
        }
      }
    }

    expect(checked).toBeGreaterThan(2000);
    expect(withoutFigure).toBeGreaterThan(500);
    expect(
      [...new Set(bad)].slice(0, 16),
      bad.length
        ? `\n그림 없이 나가는데 발문이 그림을 가리킨다 (${bad.length}건):\n` +
            [...new Set(bad)].slice(0, 16).join("\n")
        : undefined,
    ).toEqual([]);
  });

  it("🔴 **등록 유형을 다 돌았다** — 갈래 하나가 빠지면 그 갈래는 영영 0이다", () => {
    expect(registeredTypes().length).toBeGreaterThanOrEqual(800);
  });
});
