/**
 * 교과서 이관 — 본문의 `[그림]` 표지와 그림 파일의 짝.
 *
 * 그림 문항의 본문에는 그림이 놓이는 자리가 `[그림]` 으로 적혀 있다(문제은행의 표지). 표지의 차례가 곧 그림 파일의 차례고,
 * 보기 줄(`① [그림]`)에 선 표지가 그 보기의 그림이다(`Problem.choiceFigureIndex`).
 */
import { describe, expect, it } from "vitest";

import {
  choiceIndexOf,
  countMarkers,
  dropFigureMarkers,
} from "@/lib/import/schoolTextbook/figurePlacement";

describe("countMarkers · dropFigureMarkers", () => {
  const content =
    "[그림] 오른쪽 그림에서 $x$의 값은? [그림]\n① $30^\\circ$\n② $40^\\circ$";

  it("표지를 센다", () => {
    expect(countMarkers(content)).toBe(2);
    expect(countMarkers("그림이 없는 문항")).toBe(0);
  });

  it("몇 번째 표지를 걷고 남은 빈칸 · 빈 줄을 다듬는다", () => {
    expect(dropFigureMarkers(content, new Set([1]))).toBe(
      "오른쪽 그림에서 $x$의 값은? [그림]\n① $30^\\circ$\n② $40^\\circ$",
    );
    expect(
      dropFigureMarkers(
        "서술형\n[그림]\n다음을 구하시오. [그림]",
        new Set([1]),
      ),
    ).toBe("서술형\n다음을 구하시오. [그림]");
    expect(dropFigureMarkers(content, new Set())).toBe(content);
  });
});

describe("choiceIndexOf — 표지의 차례대로 «몇 번 보기의 그림인가»", () => {
  it("발문의 그림은 0 이다", () => {
    expect(
      choiceIndexOf("오른쪽 그림에서 $x$의 값은? [그림]\n① $1$\n② $2$"),
    ).toEqual([0]);
    expect(choiceIndexOf("다음을 구하시오.\n⑴ [그림]\n⑵")).toEqual([0]);
  });

  it("보기 줄의 그림은 그 보기의 번호다", () => {
    expect(
      choiceIndexOf(
        "다음 중 정비례 관계의 그래프는? [그림]\n① [그림]\n② [그림]\n③ [그림]\n④ [그림]\n⑤ [그림]",
      ),
    ).toEqual([0, 1, 2, 3, 4, 5]);
    // 보기 가운데 일부만 그림이어도 된다
    expect(choiceIndexOf("옳은 것은?\n① $y=x$\n② [그림]\n③ [그림]")).toEqual([
      2, 3,
    ]);
  });

  it("짝을 알 수 없으면 null — 아무 그림이나 ① 에 붙이지 않는다", () => {
    // 한 보기에 그림이 둘
    expect(choiceIndexOf("옳은 것은?\n① [그림] [그림]\n② [그림]")).toBeNull();
    // 같은 번호의 보기 줄이 둘
    expect(choiceIndexOf("옳은 것은?\n① [그림]\n① [그림]")).toBeNull();
  });

  it("그림이 없으면 빈 배열이다", () => {
    expect(choiceIndexOf("다음을 계산하시오.\n① $1$")).toEqual([]);
  });
});
