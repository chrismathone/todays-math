/**
 * **이 그림을 이 문항에 붙여도 되는가** — `refresh-engine-figures.ts` 의 가드.
 *
 * 이 판정이 틀리면 **남의 문항에 남의 그림**이 붙는다. 그리고 그 결함은 스스로
 * 신고하지 않는다 — tsc 초록, KaTeX 초록, 지면도 그럴듯하게 그려진다. 원장님이
 * 종이에서 「그림이 문제와 안 맞는다」를 찾아 주실 때까지 아무도 모른다.
 *
 * 🔴 **양방향이다.** 「같은 것을 같다고 하는가」만 재면 「다른 것도 같다고 한다」를
 *    구조적으로 못 본다 — 그쪽이 훨씬 나쁘다.
 */
import { describe, expect, it } from "vitest";

import { sameProblem } from "../../../scripts/qa/refresh-engine-figures";

/** 실제로 걸렸던 짝(2026-08-28, `E30101-A05-003`) — 보기 순서만 다르다. */
const DB_SHUFFLED = {
  content:
    "$531+178$ 의 합에서 백의 자리 숫자를 쓰시오.\n① $7$\n② $9$\n③ $8$\n④ $5$\n⑤ $14$",
  answer: "①",
};
const MADE_SHUFFLED = {
  content:
    "$531+178$ 의 합에서 백의 자리 숫자를 쓰시오.\n① $14$\n② $7$\n③ $5$\n④ $6$\n⑤ $9$",
  answer: "②",
};

describe("[그림 갱신] sameProblem — 이 그림을 이 문항에 붙여도 되는가", () => {
  it("발문이 같고 보기만 섞였으면 **같은 문항**이다 — 그림은 발문의 것이다", () => {
    // 이걸 막으면 초등 그림 절반이 옛 판으로 남는다(실측 77건 중 37건).
    expect(sameProblem(DB_SHUFFLED, MADE_SHUFFLED)).toBe(true);
  });

  it("🔴 **발문이 한 글자라도 다르면 다른 문항이다**", () => {
    expect(
      sameProblem(DB_SHUFFLED, {
        ...MADE_SHUFFLED,
        content: MADE_SHUFFLED.content.replace("531+178", "531+179"),
      }),
    ).toBe(false);
  });

  it("🔴 **숫자만 다른 형제도 갈라낸다** — 그림이 그 숫자를 그린다", () => {
    const a = { content: "한 변이 $7$ cm 인 정사각형의 넓이는?", answer: "49" };
    const b = { content: "한 변이 $8$ cm 인 정사각형의 넓이는?", answer: "64" };
    expect(sameProblem(a, b)).toBe(false);
  });

  it("🔴 **보기가 양쪽 다 없으면 정답까지 같아야 한다** — 거기선 흔들릴 까닭이 없다", () => {
    const stem = "다음 도형의 넓이를 구하시오.";
    expect(
      sameProblem(
        { content: stem, answer: "12" },
        { content: stem, answer: "12" },
      ),
    ).toBe(true);
    expect(
      sameProblem(
        { content: stem, answer: "12" },
        { content: stem, answer: "15" },
      ),
    ).toBe(false);
  });

  it("공백·줄바꿈만 다른 것은 같은 것으로 본다", () => {
    expect(
      sameProblem(
        { content: "다음  도형의\n넓이를 구하시오.", answer: "12" },
        { content: "다음 도형의 넓이를 구하시오.", answer: "12" },
      ),
    ).toBe(true);
  });

  it("한쪽만 보기가 있으면 발문으로 가른다 — 발문이 같으면 통과", () => {
    // 형식(객관식↔단답형)이 바뀌어도 발문이 같으면 그림은 그대로 쓸 수 있다.
    const stem = "다음 삼각형의 넓이를 구하시오.";
    expect(
      sameProblem(
        { content: stem, answer: "12" },
        { content: `${stem}\n① $12$\n② $14$`, answer: "①" },
      ),
    ).toBe(true);
  });
});
