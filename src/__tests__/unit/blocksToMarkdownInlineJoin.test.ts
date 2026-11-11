import { describe, expect, it } from "vitest";
import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock } from "@/lib/mathgen/contracts";

/**
 * 원장님 2026-11-11 «15번 문제 이상하게 됨» · «왜 일부 수식에서 이렇게 혼자 거대한 공간 차지하는지».
 * 경명여고 공수2 15번 — 인식이 준 조각 그대로.
 */
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
const block = (value: string): ContentBlock => ({
  type: "equation_block",
  value,
  rows: [],
});
const problem15 = [
  text("두 자연수 "),
  eq("s,"),
  text(" "),
  eq("t(s \\ge t)"),
  text("에 대하여 전체집합"),
  block("U=\\{x|x\\text{는 } s\\text{ 이하의 자연수}\\}"),
  text("의 두 부분집합 "),
  eq("A=\\{x|x\\text{는 } t\\text{의 약수}\\},"),
  text(" "),
  eq("B"),
  text("가 다음 조건을 만족시킨다."),
];

describe("인라인 수식 잇기", () => {
  it("맞닿은 두 인라인 수식 사이에 빈칸을 둔다 — `$a$$b$` 는 `$$` 로 읽혀 짝이 통째로 어긋난다", () => {
    const markdown = blocksToMarkdown(problem15);
    expect(markdown).not.toMatch(/[^$]\$\$[^$]/);
    expect(markdown).toContain("$s,$ $t(s \\ge t)$에 대하여");
    expect(markdown).toContain(
      "$A=\\{x|x\\text{는 } t\\text{의 약수}\\},$ $B$가",
    );
  });

  it("문장 한가운데의 equation_block 은 인라인 수식이다 — 혼자 한 줄을 차지하지 않는다", () => {
    expect(blocksToMarkdown(problem15)).toContain(
      "전체집합 $U=\\{x|x\\text{는 } s\\text{ 이하의 자연수}\\}$의 두 부분집합",
    );
  });

  it("앞 문장이 끝난 뒤 혼자 놓인 수식은 그대로 가운데 수식이다", () => {
    expect(
      blocksToMarkdown([
        text("다음 식을 간단히 하시오."),
        block("\\frac{1}{2}+\\frac{1}{3}"),
      ]),
    ).toBe("다음 식을 간단히 하시오.\n\n$$\\frac{1}{2}+\\frac{1}{3}$$");
    expect(
      blocksToMarkdown([
        text("다음 등식이 성립할 때,"),
        block("x^2-2x=3"),
        text("\n의 해를 구하시오."),
      ]),
    ).toContain("$$x^2-2x=3$$");
  });
});
