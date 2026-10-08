/**
 * 교과서 이관 — 지면 검토가 본 글의 지문.
 *
 * 🔴 아래 값은 파이썬 쪽 시험(`scripts/import/textbook/final-check/test_check_collect.py`)이 쥔 값과 같다.
 *    한쪽 셈만 바꾸면 모든 판정이 «다른 글»로 읽힌다 — 값이 바뀌면 두 시험을 같이 고친다.
 */
import { describe, expect, it } from "vitest";

import { checkKeyOf } from "@/lib/import/schoolTextbook/checkKey";

const r = String.raw;

describe("checkKeyOf", () => {
  it("파이썬 쪽과 같은 값을 낸다", () => {
    expect(
      checkKeyOf(
        "두 점 사이의 거 리는 $12$이다.\n① $1$\n② $" + r`\frac{1}{2}` + "$",
        "②",
        null,
      ),
    ).toBe("03d5c45174dfe3f6");
    expect(
      checkKeyOf(
        "다음을 계산하시오.",
        "$3$",
        "$1+2=3$이다.\n따라서 답은 $3$이다.",
      ),
    ).toBe("fa5c672c3ea86ef3");
  });

  it("빈칸 · 줄바꿈은 지문에 넣지 않는다 — 끊긴 낱말을 붙여도 같은 글이다", () => {
    expect(
      checkKeyOf(
        "두 점 사이의 거리는 $12$이다. ① $1$ ② $" + r`\frac{1}{2}` + "$",
        " ② ",
        "",
      ),
    ).toBe("03d5c45174dfe3f6");
  });

  it("글자가 바뀌면 다른 글이다", () => {
    const base = checkKeyOf("$x=1$일 때", "$2$", "풀이");
    expect(checkKeyOf("$x=2$일 때", "$2$", "풀이")).not.toBe(base);
    expect(checkKeyOf("$x=1$일 때", "$3$", "풀이")).not.toBe(base);
    expect(checkKeyOf("$x=1$일 때", "$2$", "다른 풀이")).not.toBe(base);
    // 칸의 경계도 지문의 일부다 — 본문 끝 글자가 정답 칸으로 넘어가면 다른 글
    expect(checkKeyOf("$x=1$일", "때$2$", "풀이")).not.toBe(base);
  });
});
