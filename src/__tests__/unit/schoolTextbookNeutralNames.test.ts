/**
 * 교과서 이관 — 문항 글에서 출판사를 드러내는 이름을 다른 이름으로 바꾼다.
 *
 * 원장님 2026-10-08: «문제에 출판사 이름이나 학교 이름 등 노골적인 용어들은 다른 이름으로 대체».
 * 예는 문제은행에 실린 글에서 찾은 것이다 — 천재교육 자료는 등장인물의 이름이 «천재»다.
 */
import { describe, expect, it } from "vitest";

import {
  blatantWords,
  neutralizeNames,
} from "@/lib/import/schoolTextbook/neutralNames";

const texts = (content: string, solution: string | null = null) => ({
  content,
  answer: "$8$",
  solution,
});

describe("neutralizeNames", () => {
  it("출판사 이름을 딴 등장인물은 다른 이름으로 — 본문 · 해설에 같은 이름을 쓴다", () => {
    const result = neutralizeNames(
      texts(
        "천재와 원영이가 계단에서 게임을 하는데, 게임을 $10$번 하여 천재가 $6$번 이겼다고 할 때, 천재의 위치를 구하시오.",
        "게임을 $10$번 하여 천재가 $6$번 이겼으므로 진 경우는 $4$번이다.",
      ),
      "천재교육",
    );
    expect(result.content).toBe(
      "지우와 원영이가 계단에서 게임을 하는데, 게임을 $10$번 하여 지우가 $6$번 이겼다고 할 때, 지우의 위치를 구하시오.",
    );
    expect(result.solution).toBe(
      "게임을 $10$번 하여 지우가 $6$번 이겼으므로 진 경우는 $4$번이다.",
    );
    expect(result.renamed).toEqual(["천재 → 지우"]);
  });

  it("«천재네 가족» · «천재는»도 같다", () => {
    expect(
      neutralizeNames(
        texts(
          "천재네 가족이 오렌지 $4$개를 먹을 때\n천재는 간식으로 음료수를 샀다.",
        ),
        "천재교육",
      ).content,
    ).toBe(
      "지우네 가족이 오렌지 $4$개를 먹을 때\n지우는 간식으로 음료수를 샀다.",
    );
  });

  it("바꿀 이름이 이미 글에 있으면 다음 이름을 쓴다", () => {
    const result = neutralizeNames(
      texts("천재와 지우가 사탕을 나누어 가졌다. 천재가 가진 사탕은?"),
      "천재교육",
    );
    expect(result.content).toBe(
      "서아와 지우가 사탕을 나누어 가졌다. 서아가 가진 사탕은?",
    );
  });

  it("출판사 이름을 딴 학교는 어느 출판사의 문항이든 바꾼다", () => {
    expect(
      neutralizeNames(
        texts(
          "천재중학교 $1$학년 학생 $240$명과 비상고등학교 학생, 동아초등학교 학생을 조사하였다.",
        ),
        "미래엔",
      ).content,
    ).toBe(
      "한빛중학교 $1$학년 학생 $240$명과 한빛고등학교 학생, 한빛초등학교 학생을 조사하였다.",
    );
  });

  it.each([
    // 낱말로 쓰인 것 · 다른 출판사의 문항은 그대로
    ["어느 동아리의 회원 $20$명 가운데", "동아출판"],
    ["수학 천재 가우스는 $1$부터 $100$까지의 합을", "천재교육"],
    ["천재적인 풀이를 찾아보자.", "천재교육"],
    ["천재와 원영이가 게임을 한다.", "미래엔"], // 그 출판사의 등장인물이 아니다
    ["미래에 인구가 $2$배가 된다면", "미래엔"],
    ["비상구는 $2$개이다.", "비상교육"],
    ["교과서 $3$권을 책꽂이에 꽂을 때", "미래엔"],
    ["(출처: Kippenhahn, R.(김시형 역), “암호의 세계”)", "천재교육"], // 인용한 글의 출처는 지우지 않는다
  ])("그대로: %s", (content, publisher) => {
    const result = neutralizeNames(texts(content), publisher);
    expect(result.content).toBe(content);
    expect(result.renamed).toEqual([]);
  });

  it("수식 안은 건드리지 않는다", () => {
    expect(
      neutralizeNames(texts("$천재가$ 천재가 이겼다."), "천재교육").content,
    ).toBe("$천재가$ 지우가 이겼다.");
  });
});

describe("blatantWords — 바꾸지 못하고 남은 «출판사를 드러내는 말»", () => {
  it("출판사의 온 이름 · 교과서 쪽수를 댄다", () => {
    expect(blatantWords("천재교육 교과서 $87$쪽의 문제를 풀어 보자.")).toEqual([
      "천재교육",
    ]);
    expect(blatantWords("(비상교육 수학 익힘책)")).toEqual(["비상교육"]);
    expect(blatantWords("YBM 교과서의 예제")).toEqual(["YBM"]);
  });

  it("깨끗한 글에서는 비어 있다", () => {
    for (const text of [
      "지우와 원영이가 게임을 한다.",
      "어느 동아리의 회원",
      "미래에 인구가 늘어난다.",
      "교과서 $3$권",
      "한빛중학교 학생",
    ])
      expect(blatantWords(text)).toEqual([]);
  });
});
