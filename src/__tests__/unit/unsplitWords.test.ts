/**
 * 교과서 이관 — 줄 끝에서 끊겼다가 빈칸으로 이어진 낱말을 다시 붙인다.
 *
 * 예는 실은 문항의 표본에서 찾은 것이다(2026-10-07 — «두 점 사이의 거 리는» · «$y$축의 방향으 로»).
 */
import { describe, expect, it } from "vitest";

import {
  buildVocabulary,
  unsplitWords,
} from "@/lib/import/schoolTextbook/unsplitWords";

// 검토자가 쓴 해설을 흉내 낸 사전 — 줄 끝에서 끊긴 적이 없는 글
const vocabulary = buildVocabulary([
  "두 점 사이의 거리는 $12$이다. 거리는 양수이다.",
  "$x$축의 방향으로 $2$만큼 평행이동한다. $y$축의 방향으로 옮긴다.",
  "$a=b$이므로 $x=1$이다. 해가 같으므로 $k=2$이다. 같으므로 답은 ②이다.",
  "$a>0$이므로 부등식의 해는 $x>1$이다. 조건에 의해 $a=1$이다. 정의에 의해 성립한다.",
  "두 수의 합은 $5$이다. 두 수의 곱은 $6$이다.",
  "경우의 수는 $6$이다. 경우의 수를 구한다.",
]);

describe("unsplitWords", () => {
  it("앞 조각이 혼자서는 낱말이 아니면 붙인다", () => {
    expect(
      unsplitWords("대응하는 두 점 사이의 거 리는 $12$이다.", vocabulary),
    ).toBe("대응하는 두 점 사이의 거리는 $12$이다.");
    expect(
      unsplitWords("$x$축의 방향으로 $2$만큼, $y$축의 방향으 로", vocabulary),
    ).toBe("$x$축의 방향으로 $2$만큼, $y$축의 방향으로");
    expect(unsplitWords("모든 경 우의 수는", vocabulary)).toBe(
      "모든 경우의 수는",
    );
  });

  it("뒤 조각이 «므로» 면 앞 조각이 낱말이어도 붙인다", () => {
    expect(unsplitWords("$x=3$이 므로 $y=1$", vocabulary)).toBe(
      "$x=3$이므로 $y=1$",
    );
    expect(unsplitWords("해가 같으 므로", vocabulary)).toBe("해가 같으므로");
  });

  it("둘 다 낱말이면 그대로 둔다", () => {
    for (const text of [
      "두 수의 합은",
      "부등식 $x>1$의 해",
      "두 점 사이의 거리는",
      "경우의 수는",
    ])
      expect(unsplitWords(text, vocabulary)).toBe(text);
  });

  it("수식 안의 빈칸 · 줄바꿈은 건드리지 않는다", () => {
    const text = "$p:x는~6의~약수이다$\n(가) 두 점 사이의 거 리는";
    expect(unsplitWords(text, vocabulary)).toBe(
      "$p:x는~6의~약수이다$\n(가) 두 점 사이의 거리는",
    );
    expect(unsplitWords("$거 리는$", vocabulary)).toBe("$거 리는$");
  });

  it("사전이 비면 아무것도 하지 않는다", () => {
    expect(unsplitWords("거 리는", new Map())).toBe("거 리는");
  });
});
