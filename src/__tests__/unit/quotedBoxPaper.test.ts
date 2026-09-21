import { describe, expect, it } from "vitest";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { estimateProblemPx } from "@/lib/printOverflow";

/**
 * 트랙 46 (2026-09-21) — **작업실에서 고친 원문**(인용 상자)은 검수 카드와 같은 격자로.
 *
 * 전에는 지면 파서가 인용 상자도 항목 표지로 다시 쪼개고 폭으로 열을 추정했다. 원장님 9번 저장본은
 * 검수 카드에서 두 줄(가나다/라마바)인데 지면에서는 여섯 항목 2열(가나/다라/마바)이었다(트랙 42 §7 ④).
 * 인용 상자는 줄이 이미 있는 원문이다 — 칸은 줄, 열 수는 머리에 적힌 것(없으면 1열).
 */
const BOX9 =
  "다음 이차함수의 그래프에 대한 설명으로 옳지 않은 것은? \\[4점\\]\n\n> <보기>\n> (가) $y = 3x^2$ (나) $y = -\\frac{2}{3}x^2$ (다) $y = -3x^2$\n> (라) $y = \\frac{4}{3}x^2$(마) $y = \\frac{3}{4}x^2$    (바) $y = -5x^2$\n\n① 모두 원점이 꼭짓점이다.\n\n② 그래프의 폭이 가장 좁은 것은 (바)이다.\n\n③ 그래프의 폭이 가장 넓은 것은 (나)이다.\n\n④ 위로 볼록한 포물선 모양은 (가), (라), (마)이다.\n\n⑤ $x$축에 대하여 서로 대칭인 것은 (가)와 (다)이다.";

/** 지면 파서가 낸 인용 상자: 머리 줄과 칸들. */
function quotedBox(question: string) {
  const box = question.slice(question.indexOf("> <"));
  const [head, ...items] = box
    .split(/\n\n(?!>)/)[0]!
    .split("\n>\n")
    .map((part) => part.replace(/^> /gm, ""));
  return { head, items };
}

describe("[parseProblemContent] 인용 상자 — 검수 카드와 같은 칸·열", () => {
  it("9번 저장본: 머리에 열 수가 없으면 1열, 칸은 줄 둘 — 검수 카드와 같다", () => {
    const { question, choices } = parseProblemContent(BOX9);
    const { head, items } = quotedBox(question);
    expect(head).toBe("<보기>");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/^\(가\).*\(나\).*\(다\)/);
    expect(items[1]).toMatch(/^\(라\).*\(마\).*\(바\)/);
    // 보기(①~⑤)는 그대로 다섯 — 상자가 보기를 삼키지 않는다.
    expect(choices).toHaveLength(5);
  });

  it("9번 저장본에 3열을 적으면 여섯 칸, 원문 차례, 머리는 정본", () => {
    const { question } = parseProblemContent(
      BOX9.replace("> <보기>", "> <보기:cols=3>"),
    );
    const { head, items } = quotedBox(question);
    expect(head).toBe("<보기:cols=3>");
    expect(items.map((item) => item.slice(0, 3))).toEqual([
      "(가)",
      "(나)",
      "(다)",
      "(라)",
      "(마)",
      "(바)",
    ]);
  });

  it("옛 표기 `<보기2>` 로 적힌 인용 상자도 2열로 읽는다", () => {
    const { question } = parseProblemContent(
      "옳은 것은?\n\n> <보기2>\n> ㄱ. 참\n> ㄴ. 거짓",
    );
    expect(question).toContain("> <보기:cols=2>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓");
  });

  it("편집기 원문의 `<조건:cols=2>` 도 읽는다 — 수식으로 안 찍힌다", () => {
    const { question } = parseProblemContent(
      "다음을 만족하는 수는?\n\n> <조건:cols=2>\n> (가) $a>0$\n> (나) $b<0$",
    );
    expect(quotedBox(question)).toEqual({
      head: "<조건:cols=2>",
      items: ["(가) $a>0$", "(나) $b<0$"],
    });
  });

  it("자(printOverflow)가 정본 머리의 열 수를 읽는다 — 렌더러와 같은 값", () => {
    // 2열 여섯 칸은 3줄, 1열이면 여섯 줄이다. 머리를 못 읽으면 1열로 세어 더 높게 잰다.
    const two = estimateProblemPx(
      "다음 중 옳은 것은?\n\n> <보기:cols=2>\n> ㄱ. 가\n> ㄴ. 나\n> ㄷ. 다\n> ㄹ. 라\n> ㅁ. 마\n> ㅂ. 바",
    );
    const one = estimateProblemPx(
      "다음 중 옳은 것은?\n\n> <보기>\n>\n> ㄱ. 가\n>\n> ㄴ. 나\n>\n> ㄷ. 다\n>\n> ㄹ. 라\n>\n> ㅁ. 마\n>\n> ㅂ. 바",
    );
    expect(two).toBeLessThan(one);
  });
});
