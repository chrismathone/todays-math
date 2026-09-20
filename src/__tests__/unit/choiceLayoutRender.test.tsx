/**
 * 보기 번호 배치 — 배선(화면·지면 **양쪽**) 잠금.
 *
 * 원장님 2026-09-20 요청: 시험지 설정에서 「5행 · 3열 2행 · 2열 3행 · 자동」을 고른다.
 *
 * 🔴 이 저장소에서 시험지의 **화면 미리보기와 인쇄·PDF·HWPX 는 같은 DOM** 이다
 * (`WorksheetPrint` 가 그린 `[data-mathgen-document]` 를 `@media print` 가 찍고,
 * PDF·HWPX 내보내기도 그 DOM 을 읽는다 — `WorksheetEditor.exportDocument`).
 * 그래서 배선은 한 군데(`print/templates/ProblemBody` → `UnifiedProblem`)지만,
 * 문항 렌더러는 **둘**이다 — 마크다운 문항은 `ProblemContent`, OCR·오려낸 문항은
 * `NativeProblem`. 한쪽만 걸면 지면이 조용히 갈린다.
 */
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import { DEFAULT_PRINT_OPTIONS } from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import type { ContentBlock } from "@/lib/mathgen/contracts";

const build = (choices: string[]) =>
  `다음 중 옳은 것은?\n${choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
const FIVE = ["$1$", "$2$", "$3$", "$4$", "$5$"];
const LONG = "서로 다른 두 소수는 항상 서로소이다.";

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const nativeProblem = (
  choicesLayout: "auto" | "1x5" | "2x3",
): StudioProblem => ({
  id: "native",
  content: build(FIVE),
  answer: "2",
  solution: "",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  ocr: {
    number: 1,
    blocks: [text("다음 중 옳은 것은?")],
    choiceGroups: [1, 2, 3, 4, 5].map((number) => ({
      number,
      contents: [text(String(number))],
    })),
    subQuestions: [],
    confidence: "high",
    choicesLayout,
    bodyMissing: false,
    choicesMissing: false,
  },
});
const markdownProblem = (choices: string[]): StudioProblem => ({
  ...nativeProblem("auto"),
  id: "markdown",
  content: build(choices),
  ocr: undefined,
});

describe("[보기 배치] 기본값 «자동» 은 지면을 한 글자도 안 바꾼다", () => {
  it("ProblemContent — 값을 안 주면 오늘의 클래스 그대로", () => {
    const today = renderToStaticMarkup(
      <ProblemContent content={build(FIVE)} />,
    );
    const auto = renderToStaticMarkup(
      <ProblemContent content={build(FIVE)} choiceLayout="auto" />,
    );
    expect(auto).toBe(today);
    expect(today).toContain("md:grid-cols-2");
    expect(today).toContain("print:grid-cols-2");
    // 고르지 않았으면 표식도 안 붙는다 — 마크업이 오늘 그대로다.
    expect(today).not.toContain("data-choice-layout");
  });

  it("ProblemContent — 긴 보기는 «자동»에서 여전히 1열", () => {
    const out = renderToStaticMarkup(
      <ProblemContent content={build([LONG, ...FIVE])} choiceLayout="auto" />,
    );
    expect(out).toContain("grid grid-cols-1");
    expect(out).not.toContain("md:grid-cols-2");
  });

  it("NativeProblem — «자동» 이면 OCR 원본 힌트가 그대로 이긴다", () => {
    const { container } = render(
      <UnifiedProblem
        problem={nativeProblem("1x5")}
        print
        choiceLayout="auto"
      />,
    );
    expect(container.querySelector("[data-native-choices]")).toHaveStyle({
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    });
  });

  it("기본 시험지 설정의 값이 «자동» 이다", () => {
    expect(DEFAULT_PRINT_OPTIONS.choiceLayout).toBe("auto");
  });
});

describe("[보기 배치] 값 넷이 각각 그 배치를 낸다 — 마크다운 문항", () => {
  it.each([
    ["5x1", "grid-cols-1"],
    ["3x2", "grid-cols-2"],
    ["2x3", "grid-cols-3"],
  ] as const)("%s → %s", (layout, expected) => {
    const out = renderToStaticMarkup(
      <ProblemContent content={build(FIVE)} choiceLayout={layout} />,
    );
    expect(out).toContain(`data-choice-layout="${layout}"`);
    expect(out).toContain(expected);
    // 고른 값은 화면 폭에 따라 흔들리지 않는다 — `md:` 조건부를 쓰지 않는다.
    expect(out).not.toContain("md:grid-cols-2");
  });

  it("긴 보기 — 「2열 3행」은 지키고 「3열 2행」만 내려간다", () => {
    const two = renderToStaticMarkup(
      <ProblemContent content={build([LONG, ...FIVE])} choiceLayout="3x2" />,
    );
    expect(two).toContain("grid-cols-2");
    const three = renderToStaticMarkup(
      <ProblemContent content={build([LONG, ...FIVE])} choiceLayout="2x3" />,
    );
    // 3열 칸에도 2열 칸에도 안 들어가 1열까지 내려간다. 고른 값 표식은 남는다.
    expect(three).toContain("grid-cols-1");
    expect(three).toContain('data-choice-layout="2x3"');
  });

  it("보기가 둘이면 3열을 만들지 않는다", () => {
    const out = renderToStaticMarkup(
      <ProblemContent content={build(["$1$", "$2$"])} choiceLayout="2x3" />,
    );
    expect(out).toContain("grid-cols-2");
    expect(out).not.toContain("grid-cols-3");
  });
});

describe("[보기 배치] 값 넷이 각각 그 배치를 낸다 — OCR 문항", () => {
  it.each([
    ["5x1", 1],
    ["3x2", 2],
    ["2x3", 3],
  ] as const)("고른 값 %s 는 원본 힌트(1x5)를 이긴다", (layout, columns) => {
    const { container } = render(
      <UnifiedProblem
        problem={nativeProblem("1x5")}
        print
        choiceLayout={layout}
      />,
    );
    const grid = container.querySelector("[data-native-choices]");
    expect(grid).toHaveStyle({
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    });
    expect(grid).toHaveAttribute("data-native-choices", layout);
  });
});

describe("[보기 배치] 지면 배선 — 템플릿이 설정을 문항까지 나른다", () => {
  it("마크다운 문항", () => {
    const { container } = render(
      <ProblemBody
        problem={{ ...markdownProblem(FIVE), topic: "" }}
        options={{ ...DEFAULT_PRINT_OPTIONS, choiceLayout: "2x3" }}
      />,
    );
    expect(container.querySelector("[data-choice-layout]")).toHaveAttribute(
      "data-choice-layout",
      "2x3",
    );
    expect(container.querySelector("[data-choice-layout]")).toHaveClass(
      "grid-cols-3",
    );
  });

  it("OCR 문항", () => {
    const { container } = render(
      <ProblemBody
        problem={{ ...nativeProblem("1x5"), topic: "" }}
        options={{ ...DEFAULT_PRINT_OPTIONS, choiceLayout: "5x1" }}
      />,
    );
    expect(container.querySelector("[data-native-choices]")).toHaveStyle({
      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    });
  });
});
