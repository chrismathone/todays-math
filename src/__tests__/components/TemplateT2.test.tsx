import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintTemplate,
  type ProblemReview,
} from "@/components/unified/print/types";

const meta: PrintMeta = {
  title: "종합 확인",
  subject: "수학",
  schoolName: "검증 학교",
  academyName: "검증 학원",
  instructorName: "담당 교사",
  grade: "중1",
  semester: "2학기",
  examDate: "2026-10-20",
  examDuration: "50분",
  examiner: "출제 교사",
  totalScore: 100,
  todayGoal: "조건을 읽고 식으로 나타내기",
  conceptNote: "분모를 같게 하여 더합니다.",
  patternName: "분수 연습",
  patternStrategy: "분모 확인 후 계산하기",
};
const problems: ProblemReview[] = [
  {
    id: "t2-question",
    variant: {
      id: "t2-question",
      content: "계산하시오. $\\frac{2}{3}+\\frac{1}{6}$",
      answer: "$\\frac{5}{6}$",
      solution: "분모를 같게 합니다.",
      grade: "중1",
      chapter: "분수",
      section: "분수",
      topic: "분수",
      difficulty: "중",
      problemCode: "T2-1",
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      figureSvg: null,
    },
  },
];

describe("selected template A T2", () => {
  it("keeps an authored assessment title containing the question count exactly once", () => {
    const Template = TEMPLATE_COMPONENTS.pyeongga;
    const view = render(
      <Template
        page={1}
        totalPages={1}
        totalProblems={25}
        columns={2}
        startingNumber={1}
        problems={problems}
        meta={{ ...meta, title: "종합 확인 · 25문항" }}
        options={{ ...DEFAULT_PRINT_OPTIONS, template: "pyeongga" }}
      />,
    );
    expect(
      view.container
        .querySelector("[data-print-header]")!
        .textContent!.match(/25문항/g),
    ).toHaveLength(1);
  });
  it("keeps missing school fields and an absent concept box omitted without filling saved values", () => {
    const empty = { ...meta, schoolName: "", conceptNote: "", todayGoal: "" };
    const before = JSON.stringify(empty);
    for (const template of ["jeongtong", "jaseup", "modern"] as const) {
      const Template = TEMPLATE_COMPONENTS[template];
      const view = render(
        <Template
          page={1}
          totalPages={1}
          totalProblems={1}
          columns={1}
          startingNumber={1}
          problems={problems}
          meta={empty}
          options={{ ...DEFAULT_PRINT_OPTIONS, template }}
        />,
      );
      expect(
        view.container.querySelector('[data-meta-field="schoolName"]'),
      ).toBeNull();
      expect(view.container.querySelector("[data-t2-concept]")).toBeNull();
      expect(view.container.querySelector("[data-t2-guide]")).toBeNull();
      view.unmount();
    }
    expect(JSON.stringify(empty)).toBe(before);
  });
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "%s uses its T2 head and outlined number with the real question renderer",
    (template) => {
      const Template = TEMPLATE_COMPONENTS[template];
      const { container } = render(
        <Template
          page={1}
          totalPages={2}
          totalProblems={25}
          columns={1}
          startingNumber={1}
          problems={problems}
          meta={meta}
          options={{ ...DEFAULT_PRINT_OPTIONS, template }}
        />,
      );
      expect(
        container.querySelector(`[data-template-t2="${template}"]`),
      ).not.toBeNull();
      const head = container.querySelector("[data-print-header]")!;
      expect(head.querySelector("[data-t2-heading]")).not.toBeNull();
      const number = container.querySelector<HTMLElement>(
        "[data-question-number]",
      )!;
      expect(number.style.background).toBe("white");
      expect(number.style.borderWidth).toBe("1.5px");
      expect(
        container.querySelector("[data-problem-body] .katex"),
      ).not.toBeNull();
      if (template === "pyeongga")
        expect(head.textContent).toContain("수학 영역");
      if (template === "jeongtong")
        expect(head.querySelector("table")?.textContent).toContain("2학기");
      if (template === "modern")
        expect(head.querySelector("[data-t2-guide]")?.textContent).toContain(
          meta.todayGoal,
        );
      if (template === "workbook")
        expect(
          container.querySelector('[data-writing-space="right"]'),
        ).not.toBeNull();
      if (template === "jaseup") {
        expect(head.querySelector("[data-t2-concept]")?.textContent).toContain(
          meta.conceptNote,
        );
        expect(
          container.querySelector('[data-writing-space="grid"]'),
        ).not.toBeNull();
      }
      if (template === "yuhyung")
        expect(head.querySelector("[data-t2-strategy]")?.textContent).toContain(
          meta.patternStrategy,
        );
    },
  );
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "%s measures the same outlined question and keeps existing continuation-head behavior",
    (template) => {
      const Template = TEMPLATE_COMPONENTS[template],
        options = { ...DEFAULT_PRINT_OPTIONS, template };
      const props = {
        page: 2,
        totalPages: 2,
        totalProblems: 25,
        columns: 1 as const,
        startingNumber: 1,
        problems,
        meta,
        options,
      };
      const { container, unmount } = render(<Template {...props} />);
      expect(container.querySelector("[data-print-header]")).toBeNull();
      const body = container.querySelector("[data-problem-body]")!.innerHTML;
      unmount();
      const measured = render(
        <Template {...props} measure={{ columnWidthPx: 680 }} />,
      );
      expect(
        measured.container.querySelector("[data-problem-body]")!.innerHTML,
      ).toBe(body);
      expect(
        measured.container
          .querySelector("[data-writing-space]")
          ?.getAttribute("data-writing-space") ?? null,
      ).toBe(
        template === "workbook"
          ? "right"
          : template === "jaseup"
            ? "grid"
            : null,
      );
    },
  );
});
