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
  figureChoiceNote,
  figuresSeen,
} from "@/lib/import/schoolTextbook/figurePlacement";

describe("figuresSeen — 검토자가 본 그림이 지금 싣는 그림인가", () => {
  // 추출을 고치면 같은 문항 번호에 다른 그림이 붙을 수 있다(그림이 한 문항씩 밀렸던 것을 바로잡은 2026-10-08).
  // 본문이 같아도 그림이 바뀌었으면 그 검토는 다른 문항에 대한 것이다.
  it("지문이 차례까지 같으면 same", () => {
    expect(figuresSeen(["a", "b"], ["a", "b"])).toBe("same");
    expect(figuresSeen([], [])).toBe("same");
  });

  it("하나라도 다르거나 차례가 바뀌었으면 changed", () => {
    expect(figuresSeen(["a", "b"], ["b", "a"])).toBe("changed");
    expect(figuresSeen(["a"], ["a", "b"])).toBe("changed");
    expect(figuresSeen(["a", "b"], ["a"])).toBe("changed");
  });

  it("그림을 본 기록이 없는 검토를 그림 문항에 쓰지 않는다 — unseen", () => {
    expect(figuresSeen(undefined, ["a"])).toBe("unseen");
    // 그림 없는 문항이면 기록이 없어도 된다
    expect(figuresSeen(undefined, [])).toBe("same");
  });
});

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

describe("figureChoiceNote — 보기가 그림뿐인데 짝을 모르는 문항은 잠근다(푸시 관문 check:figure-choices 와 같은 판정)", () => {
  // 2026-10-08: 그림 문항 3,911 을 실은 뒤 관문이 21문항을 막았다 — «[그림] ①»(그림이 번호 앞) 줄을 발문 그림(0)으로 읽었고,
  // 다섯 보기를 그림 한 장에 담은 문항은 짝이 없다. 적재기는 관문과 **같은 함수**로 가려 잠근다(규칙을 옮겨 적지 않는다).
  const LOCK = "보기 그림의 짝을 알 수 없다";
  const lines = (...rows: string[]) => rows.join("\n");

  it("그림이 번호 앞에 선 보기 줄 — 짝이 모두 0 이면 잠근다", () => {
    const content = lines(
      "[그림] 오른쪽 그림과 같은 그릇에 물을 넣을 때 알맞은 그래프는?",
      "[그림] ①",
      "[그림] ②",
      "[그림] ③",
      "[그림] ④",
      "[그림] ⑤",
    );
    expect(choiceIndexOf(content)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(figureChoiceNote(content, 6, choiceIndexOf(content))).toBe(LOCK);
  });

  it("보기 다섯이 그림 한 장에 담겼다 — 잠근다", () => {
    const content = lines(
      "다음 중 회전시켰을 때 원뿔이 되는 것은?",
      "①",
      "②",
      "③",
      "[그림]",
      "④",
      "⑤",
    );
    expect(figureChoiceNote(content, 1, choiceIndexOf(content))).toBe(LOCK);
  });

  it("짝이 온전하면 잠그지 않는다", () => {
    const content = lines(
      "다음 중 정비례 관계의 그래프는? [그림]",
      "① [그림]",
      "② [그림]",
      "③ [그림]",
      "④ [그림]",
      "⑤ [그림]",
    );
    expect(figureChoiceNote(content, 6, choiceIndexOf(content))).toBeNull();
  });

  it("보기가 그림이 아니면 잠그지 않는다", () => {
    const content = lines(
      "오른쪽 그림에서 $x$의 값은? [그림]",
      "① $1$",
      "② $2$",
      "③ $3$",
      "④ $4$",
      "⑤ $5$",
    );
    expect(figureChoiceNote(content, 1, choiceIndexOf(content))).toBeNull();
  });

  it("짝 계산이 null 이면(한 보기에 그림 둘) 잠근다", () => {
    const content = lines("옳은 것은?", "① [그림] [그림]", "② [그림]");
    expect(figureChoiceNote(content, 3, choiceIndexOf(content))).toBe(LOCK);
  });
});
