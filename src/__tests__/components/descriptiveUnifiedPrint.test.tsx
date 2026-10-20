import { render, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
  type ProblemReview,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";
import type { NativeDescriptiveProblemR2 } from "@/contracts/nativeDescriptive.contract";

const geometry = vi.hoisted(() => ({ scale: 1 }));
// Geometry is covered by the measured-layout suite and browser print checks.
// Keep the actual six templates, answer renderer and descriptive components here.
vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: (_template: unknown, problems: ProblemReview[]) => ({
    pages: problems.map((_, index) => ({
      indices: [index],
      scales: [geometry.scale],
    })),
    ready: true,
    layoutError: false,
    fontError: false,
    fontStyle: {},
    measureNode: null,
  }),
}));
vi.mock("@/components/unified/print/useMeasuredAnswerPages", () => ({
  useMeasuredAnswerPages: (problems: ProblemReview[]) => ({
    pages: problems.length
      ? [
          {
            keyRows: [
              {
                cells: problems.map((_, index) => ({ index, span: 1 })),
                height: 40,
              },
            ],
            solutionIndices: problems.map((_, index) => index),
            indices: problems.map((_, index) => index),
            scales: problems.map(() => 1),
            splitIndex: problems.length,
            groupStart: 0,
          },
        ]
      : [],
    ready: true,
    layoutError: false,
    layoutMessage: "",
    fontError: false,
    fontStyle: {},
    measureNode: null,
  }),
}));

const nativeData: Pick<
  NativeDescriptiveProblemR2,
  "rubric" | "requirements" | "modelAnswer"
> = {
  modelAnswer: "교사용 모범답안 전용 문장",
  requirements: [
    {
      requirementId: "reason",
      text: "식을 세운 이유를 쓰시오.",
      criterionIds: ["model"],
    },
  ],
  rubric: {
    revision: 2,
    totalPoints: 3,
    criteria: [
      {
        criterionId: "model",
        requirementId: "reason",
        factKey: "model",
        role: "method",
        expected: "교사용 기대 근거",
        evidence: "교사용 평가 증거",
        points: 3,
        alternatives: ["교사용 대안"],
        errors: ["교사용 오류"],
        scoring: {
          full: "교사용 만점 조건",
          partial: [{ points: 1, condition: "교사용 부분점수 조건" }],
          zero: "교사용 영점 조건",
        },
        carryForward: {
          fromFactKeys: [],
          rule: "preserve-method-points",
          condition: "교사용 선행 오류 조건",
        },
      },
    ],
  },
};

function ordinary(id: string): StudioProblem {
  return {
    id,
    content: `일반 문제 ${id}`,
    answer: `일반 정답 ${id}`,
    solution: `일반 해설 ${id}`,
    grade: "중2",
    chapter: "방정식",
    section: "",
    difficulty: "기본",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  };
}
function native(id: string): StudioProblem {
  return {
    ...ordinary(id),
    content: "식을 세운 이유를 쓰시오. [3점]",
    questionType: "descriptive",
    nativeDescriptive: nativeData,
    answer: "교사용 단답",
    solution: "중복되면 안 되는 직렬화 해설",
  };
}

const dailyTemplates: PrintTemplate[] = [
  "jeongtong",
  "modern",
  "workbook",
  "jaseup",
  "yuhyung",
];

function renderWorksheet(
  selected: StudioProblem[],
  template: PrintTemplate,
  showAnswers = false,
  quickAnswerOnly = false,
) {
  const view = render(
    <WorksheetPrint
      selected={selected}
      title="서술형 시험"
      options={{
        ...DEFAULT_PRINT_OPTIONS,
        template,
        showAnswers,
        quickAnswerOnly,
      }}
      printMeta={DEFAULT_PRINT_META}
      onReady={vi.fn()}
    />,
  );
  return view.container.querySelector<HTMLElement>("[data-mathgen-document]")!;
}

describe("native r2 unified print", () => {
  it.each(dailyTemplates)(
    "%s puts a native answer area under the question, including its measurement",
    (template) => {
      for (const columns of [1, 2] as const) {
        const Template = TEMPLATE_COMPONENTS[template];
        const problem = native("native");
        const props = {
          page: 1,
          totalPages: 1,
          columns,
          meta: DEFAULT_PRINT_META,
          options: {
            ...DEFAULT_PRINT_OPTIONS,
            template,
            columns,
            hideScores: false,
          },
          problems: [{ id: problem.id, variant: { ...problem, topic: "" } }],
          startingNumber: 7,
        };
        for (const measure of [undefined, { columnWidthPx: 320 }]) {
          const { container, unmount } = render(
            <Template {...props} measure={measure} />,
          );
          const item = container.querySelector("[data-measure-idx='0']")!;
          expect(
            item.querySelector("[data-descriptive-answer]"),
          ).not.toBeNull();
          expect(item.querySelector("[data-writing-space]")).toBeNull();
          expect(item).not.toHaveTextContent("내 정답");
          const header = item.querySelector("[data-problem-header]")!;
          expect(header).toHaveTextContent("07");
          expect(header).toHaveTextContent("3점");
          expect(
            item.querySelector("[data-problem-body]"),
          ).not.toHaveTextContent("[3점]");
          expect(item).not.toHaveTextContent("교사용");
          unmount();
        }
      }
    },
  );

  it.each(["workbook", "jaseup"] as const)(
    "%s preserves the ordinary embedded scratch area",
    (template) => {
      const source = renderWorksheet([ordinary("a"), native("b")], template);
      expect(source.querySelectorAll("[data-writing-space]")).toHaveLength(1);
      expect(source.querySelectorAll("[data-descriptive-answer]")).toHaveLength(
        1,
      );
      const headers = source.querySelectorAll("[data-problem-header]");
      expect(headers[0]).not.toHaveTextContent("점");
      expect(headers[1]).toHaveTextContent("3점");
    },
  );

  it.each([...dailyTemplates, "pyeongga"] as const)(
    "%s omits an extra right-hand scratch area beside native questions",
    (template) => {
      const Template = TEMPLATE_COMPONENTS[template];
      const problems = [ordinary("a"), native("b")];
      const { container } = render(
        <Template
          page={1}
          totalPages={1}
          startingNumber={1}
          columns={1}
          meta={DEFAULT_PRINT_META}
          options={{ ...DEFAULT_PRINT_OPTIONS, template, solvingArea: "ruled" }}
          problems={problems.map((p) => ({
            id: p.id,
            variant: { ...p, topic: "" },
          }))}
        />,
      );
      expect(container.querySelectorAll("[data-solving-area]")).toHaveLength(1);
      expect(
        container.querySelector("[data-solving-for='0'] [data-solving-area]"),
      ).not.toBeNull();
      expect(
        container.querySelector("[data-solving-for='1'] [data-solving-area]"),
      ).toBeNull();
    },
  );

  it("blocks a native answer area that would have to shrink to fit", () => {
    geometry.scale = 0.6;
    const onReady = vi.fn();
    try {
      const { container } = render(
        <WorksheetPrint
          selected={[native("a")]}
          title="큰 서술형"
          options={DEFAULT_PRINT_OPTIONS}
          printMeta={DEFAULT_PRINT_META}
          onReady={onReady}
        />,
      );
      expect(onReady).toHaveBeenCalledWith(false);
      expect(within(container).getByRole("alert")).toHaveTextContent("서술형");
      const card = container.querySelector<HTMLElement>(
        "[data-mathgen-document] [data-measure-idx='0']",
      )!;
      expect(card.style.zoom).not.toBe("0.6");
    } finally {
      geometry.scale = 1;
    }
  });

  it("pyeongga puts native writing on separate answer sheets without student leaks", () => {
    const source = renderWorksheet(
      [ordinary("a"), native("b"), native("c")],
      "pyeongga",
    );
    const questions = source.querySelectorAll(
      "[data-unified-paper][data-page-kind='questions']",
    );
    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question.querySelector("[data-descriptive-answer]")).toBeNull();
    }
    const sheets = source.querySelectorAll(
      "[data-unified-paper][data-page-kind='descriptive-answers']",
    );
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toHaveTextContent("2");
    expect(sheets[1]).toHaveTextContent("3");
    expect(source.querySelectorAll("[data-descriptive-answer]")).toHaveLength(
      2,
    );
    expect(source).not.toHaveTextContent("교사용");
    expect(source).not.toHaveTextContent("중복되면");
    expect(source.querySelector("[data-answer-page]")).toBeNull();
  });

  it.each([false, true])(
    "teacher pages preserve mixed numbering and avoid native answer duplication (quick=%s)",
    (quick) => {
      const source = renderWorksheet(
        [ordinary("a"), native("b"), ordinary("c"), native("d")],
        "jeongtong",
        true,
        quick,
      );
      const answers = source.querySelector<HTMLElement>("[data-answer-page]")!;
      expect(
        [...answers.querySelectorAll("[data-answer-number]")].map((cell) =>
          cell.getAttribute("data-answer-number"),
        ),
      ).toEqual(["1", "3"]);
      expect(answers).not.toHaveTextContent("교사용");
      expect(answers).not.toHaveTextContent("중복되면");
      if (!quick) {
        expect(
          [...answers.querySelectorAll("[data-answer-solution]")].map((cell) =>
            cell.getAttribute("data-answer-solution"),
          ),
        ).toEqual(["1", "3"]);
      }
      const rubrics = source.querySelectorAll<HTMLElement>(
        "[data-unified-paper][data-page-kind='descriptive-rubric']",
      );
      expect(rubrics).toHaveLength(2);
      for (const rubric of rubrics) {
        expect(
          within(rubric).getAllByText(nativeData.modelAnswer),
        ).toHaveLength(1);
        expect(rubric).toHaveTextContent("교사용 만점 조건");
        expect(rubric).not.toHaveTextContent("중복되면");
        expect(rubric.querySelector("[data-descriptive-answer]")).toBeNull();
      }
      expect(
        source.querySelectorAll(
          "[data-unified-paper][data-page-kind='questions']",
        ),
      ).toHaveLength(4);
    },
  );

  it("native-only teacher output has no empty ordinary answer page", () => {
    const source = renderWorksheet([native("a")], "pyeongga", true);
    expect(source.querySelector("[data-answer-page]")).toBeNull();
    expect(
      [...source.querySelectorAll("[data-unified-paper]")].map((page) =>
        page.getAttribute("data-page-kind"),
      ),
    ).toEqual(["questions", "descriptive-answers", "descriptive-rubric"]);
  });

  it.each([false, true])(
    "checks the actual dedicated page before allowing export (overflow=%s)",
    async (overflow) => {
      const rect = vi
        .spyOn(HTMLElement.prototype, "getBoundingClientRect")
        .mockImplementation(function (this: HTMLElement) {
          const bottom = this.closest(".katex-mathml")
            ? 2000 // Visually clipped accessibility text is not printed ink.
            : this.matches("[data-print-page]")
              ? 1123
              : this.matches("footer")
                ? 1100
                : overflow && this.matches("[data-descriptive-rubrics]")
                  ? 1200
                  : 500;
          const top = this.matches("footer") ? 1080 : 0;
          return {
            x: 0,
            y: top,
            top,
            bottom,
            left: 0,
            right: 794,
            width: 794,
            height: bottom - top,
            toJSON: () => ({}),
          };
        });
      const onReady = vi.fn();
      try {
        const { container } = render(
          <WorksheetPrint
            selected={[
              {
                ...native("a"),
                nativeDescriptive: { ...nativeData, modelAnswer: "$x=20$" },
              },
            ]}
            title="채점표 높이 확인"
            options={{ ...DEFAULT_PRINT_OPTIONS, showAnswers: true }}
            printMeta={DEFAULT_PRINT_META}
            onReady={onReady}
          />,
        );
        if (overflow) {
          await waitFor(() =>
            expect(within(container).getByRole("alert")).toHaveTextContent(
              "서술형",
            ),
          );
          expect(onReady).not.toHaveBeenCalledWith(true);
        } else {
          await waitFor(() => expect(onReady).toHaveBeenCalledWith(true));
        }
      } finally {
        rect.mockRestore();
      }
    },
  );

  it("does not reinterpret a legacy descriptive label as native r2", () => {
    const source = renderWorksheet(
      [{ ...ordinary("legacy"), questionType: "descriptive" }],
      "workbook",
      true,
    );
    expect(source.querySelector("[data-descriptive-answer]")).toBeNull();
    expect(source.querySelector("[data-writing-space]")).not.toBeNull();
    expect(source.querySelector("[data-answer-page]")).toHaveTextContent(
      "일반 정답 legacy",
    );
  });
});
