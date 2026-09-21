import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import NativeProblem from "@/components/unified/NativeProblem";
import type { StudioProblem } from "@/components/unified/types";

/**
 * 편집기에서 친 여러 칸(고정 공백 U+00A0 로 저장 — `visualDocument.ts`)을 검수 카드와 지면이
 * **글자 그대로** 싣는지 잠근다. 보이는 폭은 `e2e/body-typeset` 가 실제 Chromium 에서 잰다.
 *
 * 🔴 누가 렌더 경로에 `\s+` 접기를 넣으면 고정 공백도 같이 녹는다(JS 의 `\s` 는 U+00A0 을
 *    포함한다). 그러면 원장님이 친 칸이 다시 사라진다 — 이 시험이 빨개진다.
 * 그리고 지면의 공백 정리 규칙은 **그대로**다 — 보통 공백 여럿(엔진이 넣은 두 칸, 옛 변환본)은
 * 예전처럼 한 칸이다.
 */
const NBSP = "\xA0";
const TYPED = `갑${NBSP.repeat(3)} 을`;

function paper(content: string): StudioProblem {
  return {
    id: "typed-spaces",
    content,
    answer: "",
    solution: "",
    grade: "중3",
    chapter: "",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
    // 작업실에서 «내용 수정»을 거친 문항 — 지면이 저장 원문을 그대로 싣는 갈래.
    ocr: {
      number: 1,
      blocks: [],
      choiceGroups: [],
      subQuestions: [],
      confidence: "high",
      choicesLayout: "auto",
      bodyMissing: false,
      choicesMissing: false,
      contentEdited: true,
    } as unknown as StudioProblem["ocr"],
  };
}

afterEach(cleanup);

describe("친 여러 칸은 검수 카드·지면에 글자 그대로 실린다", () => {
  for (const [where, content] of [
    ["본문", TYPED],
    ["<보기> 상자", `> <보기>\n> ${TYPED}`],
  ] as const) {
    it(`${where} — 검수 카드`, () => {
      const { container } = render(<SourceEditorDisplay value={content} />);
      expect(container.textContent).toContain(TYPED);
    });
    it(`${where} — 지면`, () => {
      const { container } = render(
        <NativeProblem problem={paper(content)} print />,
      );
      expect(container.textContent).toContain(TYPED);
    });
  }

  it("보통 공백 여럿은 지면에서 예전처럼 한 칸이다 — 기존 문항이 안 움직인다", () => {
    const { container } = render(
      <NativeProblem
        problem={paper("□ 안에 알맞은 수를 구하시오.  갑")}
        print
      />,
    );
    expect(container.textContent).toContain("구하시오. 갑");
    expect(container.textContent).not.toMatch(/구하시오\.[ \xA0]{2,}갑/);
  });
});
