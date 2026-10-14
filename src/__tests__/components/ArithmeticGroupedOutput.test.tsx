import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArithmeticWorkflow } from "@/components/arithmetic/ArithmeticWorkflow";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import { bodyFontSize } from "@/components/unified/print/geometry";
import { packMeasured } from "@/components/unified/print/pack";
import type {
  PrintOptions,
  ProblemReview,
} from "@/components/unified/print/types";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
} from "@/contracts/arithmeticV2.contract";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { arithmeticGroupStarts } from "@/lib/arithmeticOutputLayout";

// Deterministic measured heights exercise the real print tree and shared packer without a browser.
vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: (
    _template: unknown,
    problems: ProblemReview[],
    options: PrintOptions,
  ) => ({
    pages: packMeasured(
      problems.map(() => 80),
      { first: 700, cont: 900 },
      options,
      problems.flatMap((problem, index) =>
        index > 0 &&
        problem.variant.arithmetic?.round !==
          problems[index - 1].variant.arithmetic?.round
          ? [index]
          : [],
      ),
    ),
    ready: true,
    layoutError: false,
    fontError: false,
    fontStyle: {},
    measureNode: null,
  }),
}));

const types = listArithmeticV2Types().slice(0, 2);
const sheet = buildArithmeticV2Sheet({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed: "grouped-shared-output",
  rounds: [
    { allocations: types.map((type) => ({ typeId: type.id, count: 2 })) },
    { allocations: [{ typeId: types[1].id, count: 2 }] },
  ],
});
const selected = arithmeticToStudioProblems(sheet);
const presentation = defaultArithmeticPresentation();

describe("arithmetic grouped shared output", () => {
  it.each(Object.entries(TEMPLATE_COMPONENTS))(
    "%s keeps round labels in sheet headers, groups types and prints one continuous number with a matching answer key",
    (template, Template) => {
      const before = structuredClone(sheet);
      for (const columns of [1, 2] as const) {
        const options = {
          ...presentation.printOptions,
          template: template as PrintOptions["template"],
          columns,
          showChapter: true, // Existing saved settings must not restore repeated per-item labels.
          showAnswers: true,
        };
        const { container, unmount } = render(
          <WorksheetPrint
            selected={selected}
            title="연산 모음"
            options={options}
            printMeta={presentation.printMeta}
            onReady={vi.fn()}
          />,
        );
        const document = container.querySelector("[data-mathgen-document]")!;
        expect(
          container.querySelectorAll("[data-mathgen-document]"),
        ).toHaveLength(1);
        const questions = [
          ...document.querySelectorAll('[data-page-kind="questions"]'),
        ];
        const answers = [
          ...document.querySelectorAll('[data-page-kind="answers"]'),
        ];
        expect(questions).toHaveLength(2);
        expect(answers).toHaveLength(2);
        for (const pages of [questions, answers]) {
          expect(
            pages.map(
              (page) =>
                page.querySelector("[data-arithmetic-round]")?.textContent,
            ),
          ).toEqual(["1회차", "2회차"]);
          for (const page of pages) {
            expect(
              page.querySelectorAll("[data-arithmetic-round]"),
            ).toHaveLength(1);
            expect(
              page.querySelector(".measure-body")?.textContent,
            ).not.toContain("회차");
          }
        }
        const headers = questions.flatMap((page) => [
          ...page.querySelectorAll("[data-problem-header]"),
        ]);
        expect(headers).toHaveLength(selected.length);
        expect(
          headers.map((header) =>
            Number(header.textContent?.replace(/\D/g, "")),
          ),
        ).toEqual([1, 2, 3, 4, 5, 6]);
        expect(
          answers
            .flatMap((page) => [
              ...page.querySelectorAll(".measure-body strong"),
            ])
            .map((number) => number.textContent),
        ).toEqual(["1.", "2.", "3.", "4.", "5.", "6."]);
        expect(
          questions
            .flatMap((page) => [
              ...page.querySelectorAll("[data-arithmetic-type-heading]"),
            ])
            .map((heading) => heading.textContent),
        ).toEqual([types[0].title, types[1].title, types[1].title]);
        expect(document.querySelector("[data-problem-metadata]")).toBeNull();
        for (const body of document.querySelectorAll("[data-problem-body]")) {
          expect(body.textContent).not.toMatch(/회차|\d+번/);
          expect(body).toHaveStyle({
            fontSize: `${bodyFontSize(options.template, columns)}px`,
          });
        }
        expect(
          answers.every((page) => !page.textContent?.includes("해설")),
        ).toBe(true);
        expect(
          answers.flatMap((page) => [
            ...page.querySelectorAll("[data-measure-idx]"),
          ]),
        ).toHaveLength(selected.length);
        unmount();

        const firstRound = selected.slice(0, 4);
        const measured = render(
          <Template
            page={1}
            round={1}
            totalPages={1}
            columns={columns}
            meta={presentation.printMeta}
            startingNumber={1}
            options={options}
            measure={{ columnWidthPx: 300 }}
            problems={firstRound.map((problem, index) => ({
              id: problem.id,
              variant: { ...problem, topic: problem.section },
              sectionHeading: arithmeticGroupStarts(
                problem,
                firstRound[index - 1],
              )
                ? problem.arithmetic?.groupTitle
                : undefined,
            }))}
          />,
        );
        expect(
          measured.container.querySelectorAll("[data-arithmetic-type-heading]"),
        ).toHaveLength(2);
        for (const heading of measured.container.querySelectorAll(
          "[data-arithmetic-type-heading]",
        )) {
          expect(
            heading
              .closest("[data-measure-idx]")
              ?.querySelector("[data-problem-body]"),
          ).not.toBeNull();
        }
        measured.unmount();
      }
      expect(sheet).toEqual(before);
    },
  );

  it("reviews by round and type while leaving saved expressions and answers unchanged", () => {
    const before = structuredClone(sheet);
    const { container } = render(
      <ArithmeticWorkflow
        step="review"
        setStep={vi.fn()}
        sheet={sheet}
        title="연산 검토"
        setTitle={vi.fn()}
        busy={false}
        canOutput
        canSave
        canRegenerate
        dirty
        onSave={vi.fn()}
        onRegenerate={vi.fn()}
        onPresentationChange={vi.fn()}
      >
        <div>범위</div>
      </ArithmeticWorkflow>,
    );
    expect(screen.getByRole("heading", { name: "1회차" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "2회차" })).toBeVisible();
    expect(
      screen.getAllByRole("heading", { name: types[1].title }),
    ).toHaveLength(2);
    expect(
      [...container.querySelectorAll("[data-arithmetic-question-number]")].map(
        (number) => number.textContent,
      ),
    ).toEqual(["1.", "2.", "3.", "4.", "5.", "6."]);
    for (const list of screen.getAllByRole("list")) {
      for (const item of within(list).getAllByRole("listitem")) {
        expect(item.textContent).not.toMatch(/회차|\d+번/);
      }
    }
    expect(screen.queryByLabelText("정답")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "정답 보기" }));
    expect(screen.getAllByLabelText("정답")).toHaveLength(selected.length);
    expect(sheet).toEqual(before);
  });
});
