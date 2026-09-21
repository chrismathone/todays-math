/**
 * 트랙 46 (2026-09-21) — 인식이 원본 〈보기〉 의 열 배치를 `<보기:cols=N>` 로 적는다(트랙 42 권장 A′).
 *
 * 원장님 문제 22: 원본 〈보기〉 는 그림 넷이 2열 2행인데 한 열로 쌓였다. 열 수를 가장 싸게 아는 것은
 * 원본 그림을 보는 인식이다 — 보기 번호 배치(`choicesLayout`)를 적게 한 것과 같은 방식이다.
 * **앞으로 인식하는 문항부터** 적용된다. 인식 블록은 `contentParser`(상자 경계)와 `blocksToMarkdown`
 * (인용 상자)를 거치므로 둘 다 열 표기를 상자 머리로 알아봐야 한다 — 못 알아보면 상자가 안 서고
 * `<보기:cols=2>` 가 발문에 날 글자로 찍힌다.
 */
import { describe, expect, it } from "vitest";

import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock } from "@/lib/mathgen/contracts";
import { buildMathgenOcrPrompt } from "@/lib/mathgen/prompts";

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const eq = (value: string): ContentBlock => ({
  type: "equation",
  value,
  rows: [],
});

describe("인식 지시문 — 보기 상자의 열 배치", () => {
  const prompt = buildMathgenOcrPrompt("");

  it("원본 상자가 여러 열이면 머리를 `<보기:cols=N>` 로 적는다", () => {
    expect(prompt).toContain("<보기:cols=2>");
    expect(prompt).toContain("한 행에 놓인 항목 수");
  });

  it("그림 항목도 같다 — 문제 22 모양의 올바른 예", () => {
    expect(prompt).toContain(
      "<보기:cols=2>\\nㄱ. [그림1]\\nㄴ. [그림2]\\nㄷ. [그림3]\\nㄹ. [그림4]",
    );
  });

  it("한 열이거나 모르면 맨 `<보기>` — 추측으로 열을 만들지 않는다", () => {
    expect(prompt).toContain("모르면 맨 `<보기>`");
  });
});

describe("인식 블록 → 인용 상자: 열 표기를 상자 머리로 안다", () => {
  it("한 블록 상자: 머리의 열 수가 인용 상자 머리로 간다", () => {
    const markdown = blocksToMarkdown([
      text("아래 보기에서 옳은 것은?"),
      text("<보기:cols=2>\nㄱ. [그림1]\nㄴ. [그림2]\nㄷ. [그림3]\nㄹ. [그림4]"),
    ]);
    expect(markdown).toBe(
      "아래 보기에서 옳은 것은?\n\n> <보기:cols=2>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]",
    );
  });

  it("여러 블록 상자(수식이 섞인 항목)도 한 상자 — 머리가 발문에 새지 않는다", () => {
    const markdown = blocksToMarkdown([
      text("다음 중 옳은 것만을 있는 대로 고른 것은?"),
      text("<보기:cols=3>\n(가) "),
      eq("y=3x^2"),
      text("\n(나) "),
      eq("y=-\\frac{2}{3}x^2"),
      text("\n(다) "),
      eq("y=-3x^2"),
    ]);
    const [question, box] = markdown.split("\n\n");
    expect(question).toBe("다음 중 옳은 것만을 있는 대로 고른 것은?");
    expect(box!.startsWith("> <보기:cols=3>")).toBe(true);
    expect(box).toContain("(나) $y=-\\frac{2}{3}x^2$");
  });

  it("〈조건〉 도 같다", () => {
    expect(blocksToMarkdown([text("<조건:cols=2>\n(가) a\n(나) b")])).toBe(
      "> <조건:cols=2>\n>\n> (가) a\n> (나) b",
    );
  });

  it("열 표기 없는 상자는 예전 그대로", () => {
    expect(blocksToMarkdown([text("<보기>\nㄱ. 참\nㄴ. 거짓")])).toBe(
      "> <보기>\n>\n> ㄱ. 참\n> ㄴ. 거짓",
    );
  });
});
