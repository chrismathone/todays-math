import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type ProblemReview,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: (_template: unknown, problems: ProblemReview[]) => ({
    pages: problems.map((_, index) => ({ indices: [index], scales: [1] })),
    ready: true,
    layoutError: false,
    fontError: false,
    fontStyle: { "--paper-font-serif": "serif" },
    measureNode: null,
  }),
}));
vi.mock("@/components/unified/print/useMeasuredAnswerPages", () => ({
  useMeasuredAnswerPages: (problems: ProblemReview[]) => ({
    pages: problems.length
      ? [
          {
            keyRows: [{ cells: [{ index: 0, span: 1 }], height: 40 }],
            solutionIndices: [0],
            scales: [1],
            splitIndex: 1,
            indices: [0],
            groupStart: 0,
          },
        ]
      : [],
    ready: true,
    layoutError: false,
    layoutMessage: "",
    fontError: false,
    fontStyle: { "--paper-font-serif": "serif" },
    measureNode: null,
  }),
}));

const selected: StudioProblem[] = [
  {
    id: "first",
    content: "첫 번째 문제",
    answer: "2",
    solution: "",
    grade: "중1",
    chapter: "수와 연산",
    section: "",
    difficulty: "기본",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  },
];

const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  for (const name of dialogMethods) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        if (name === "showModal") this.setAttribute("open", "");
        else this.removeAttribute("open");
      },
    });
  }
});
afterAll(() => {
  dialogMethods.forEach((name, index) => {
    const original = originalDialogMethods[index];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else
      delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)[name];
  });
});

describe("shared worksheet preview", () => {
  it("shows whole-page thumbnails while keeping one unscaled export document, including when enlarged", () => {
    const props = {
      selected,
      title: "시험지",
      options: { ...DEFAULT_PRINT_OPTIONS, showAnswers: true },
      printMeta: DEFAULT_PRINT_META,
      onReady: vi.fn(),
    };
    const { container, rerender } = render(<WorksheetPrint {...props} />);
    const strip = screen.getByRole("region", { name: "시험지 미리보기" });
    expect(strip).toHaveAttribute("id", "worksheet-preview");
    expect(strip).toHaveAttribute("aria-busy", "false");
    expect(strip.querySelectorAll("figure")).toHaveLength(2);
    expect(strip.querySelector("[data-mathgen-document]")).toBeNull();
    const source = container.querySelector<HTMLElement>(
      "[data-mathgen-document]",
    )!;
    const paperKinds = () =>
      [...source.querySelectorAll<HTMLElement>("[data-unified-paper]")].map(
        (paper) => paper.dataset.pageKind,
      );
    expect(paperKinds()).toEqual(["questions", "answers"]);
    expect(source.style.getPropertyValue("--paper-strip-scale")).toBe("");
    expect(source.style.getPropertyValue("--paper-font-serif")).toBe("serif");
    fireEvent.click(within(strip).getByRole("button", { name: "2쪽 확대" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("2 / 2쪽")).toBeVisible();
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "1.25" },
    });
    expect(container.querySelectorAll("[data-mathgen-document]")).toHaveLength(
      1,
    );
    expect(container.querySelectorAll("[data-unified-paper]")).toHaveLength(2);
    expect(paperKinds()).toEqual(["questions", "answers"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    rerender(
      <WorksheetPrint
        {...props}
        options={{ ...props.options, showAnswers: false }}
      />,
    );
    expect(paperKinds()).toEqual(["questions"]);
    expect(strip.querySelectorAll("figure")).toHaveLength(1);
  });
});
