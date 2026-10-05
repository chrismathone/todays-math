// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  allocateSourceWritingSpace,
  SOURCE_WRITING_STOP_GAP_MM,
} from "@/lib/textbook/layout/sourceWritingSpace";
import {
  combineWritingCases,
  frozenSourceWritingCase,
  syntheticWritingCase,
  type WritingCase,
} from "../helpers/textbookSourceWritingProof";
const allocate = (input: WritingCase) =>
  allocateSourceWritingSpace(
    input.sections,
    input.pages,
    input.measurements,
    input.pageMeasurements,
  );
const problem = (input: WritingCase, index = 0) => {
  const block = input.sections[0].blocks[index];
  if (block.kind !== "problem") throw new Error("Missing synthetic problem");
  return block;
};

describe("measured source-only writing allocation", () => {
  it("uses round-robin integral 7mm increments and moves authored trailing body without mutating inputs", () => {
    const input = syntheticWritingCase({
      contentBottom: 270 - SOURCE_WRITING_STOP_GAP_MM - 35,
    });
    const frozen = JSON.stringify(input);
    const plan = allocate(input);
    expect(plan.work.map((entry) => entry.lines)).toEqual([5, 5, 4, 4]);
    expect(plan.work.map((entry) => entry.heightMm)).toEqual([49, 49, 42, 42]);
    expect(plan.work.map((entry) => entry.slackMm)).toEqual([0, 0, 0, 0]);
    expect(plan.placements.at(-1)!.yMm).toBe(
      input.pages[0].blocks.at(-1)!.yMm + 35,
    );
    expect(plan.placements.at(-1)!.heightMm).toBe(5);
    expect(JSON.stringify(input)).toBe(frozen);
  });

  it("equalizes four matching exercises and uses the minimum actual page budget", () => {
    const left = syntheticWritingCase({
      page: 2,
      height: 28,
      contentBottom: 220,
    });
    const right = syntheticWritingCase({
      page: 3,
      height: 35,
      contentBottom: 246,
    });
    const input = combineWritingCases(left, right);
    const plan = allocate(input);
    expect(plan.work.map((entry) => entry.lines)).toEqual([
      5, 5, 4, 4, 5, 5, 4, 4,
    ]);
    expect(plan.work.map((entry) => entry.heightMm)).toEqual([
      49, 49, 42, 42, 49, 49, 42, 42,
    ]);
    expect(plan.work[2].yMm).toBe(plan.work[6].yMm);
    expect(plan.work[0].yMm + plan.work[0].heightMm + 5).toBe(plan.work[2].yMm);
  });

  it.each([
    ["odd start", { page: 3 }, { page: 4 }],
    ["physical page gap", { page: 2 }, { page: 4 }],
    [
      "different native section",
      { page: 2 },
      { page: 3, sectionName: "다른 유형" },
    ],
    ["daily-banner mismatch", { page: 2 }, { page: 3, daily: true }],
    [
      "practice pages",
      { page: 2, kind: "practice" },
      { page: 3, kind: "practice" },
    ],
    ["odd raw child count", { page: 2, count: 3 }, { page: 3, count: 3 }],
    ["unequal child count", { page: 2, count: 4 }, { page: 3, count: 2 }],
  ])("does not match %s", (_, a, b) => {
    const left = syntheticWritingCase({ ...a, contentBottom: 260 });
    const right = syntheticWritingCase({ ...b, contentBottom: 210 });
    const plan = allocate(combineWritingCases(left, right));
    const firstPage = left.pages[0].physicalPageIndex;
    const leftLines = plan.work
      .filter((entry) => entry.physicalPageIndex === firstPage)
      .map((entry) => entry.lines);
    const rightLines = plan.work
      .filter((entry) => entry.physicalPageIndex !== firstPage)
      .map((entry) => entry.lines);
    expect(Math.max(...rightLines)).toBeGreaterThan(Math.max(...leftLines));
  });

  it("uses source unit and empty native section names instead of converted section keys", () => {
    const input = combineWritingCases(
      syntheticWritingCase({ page: 2, contentBottom: 260 }),
      syntheticWritingCase({ page: 3, contentBottom: 210 }),
    );
    input.sections.forEach((section) =>
      section.blocks.forEach((block) => {
        if (block.semantic?.source) delete block.semantic.source.sectionName;
      }),
    );
    const matched = allocate(input).work;
    expect(
      new Set(matched.map((entry) => entry.lines)).size,
    ).toBeLessThanOrEqual(2);
    input.sections[1].blocks.forEach((block) => {
      if (block.semantic?.source) block.semantic.source.unit = "U02";
    });
    const separated = allocate(input).work;
    expect(
      Math.max(
        ...separated
          .filter((entry) => entry.physicalPageIndex === 3)
          .map((entry) => entry.lines),
      ),
    ).toBe(6);
  });

  it.each(["typepage", "reasoning", "practice"])(
    "accepts the actual direct grid on %s",
    (kind) => {
      const input = syntheticWritingCase({
        kind,
        gridKind: kind === "reasoning" ? "reason-grid" : "question-grid",
        count: 2,
        capReason: kind === "reasoning",
      });
      expect(allocate(input).work.every((entry) => entry.lines > 2)).toBe(true);
    },
  );

  it.each([
    "types",
    "paired",
    "basic",
    "drill",
    "lesson",
    "scriptcheck",
    "errors",
    "oral",
    "checkpoint",
  ])("preserves excluded native %s pages", (kind) => {
    const input = syntheticWritingCase({ kind });
    expect(allocateSourceWritingSpace(input.sections, input.pages, [])).toEqual(
      { work: [], placements: [] },
    );
  });

  it("preserves semantic-absent bank problems, answers and public/group examples", () => {
    for (const mode of ["bank", "answers", "worked", "group"] as const) {
      const input = syntheticWritingCase();
      input.sections[0].blocks.forEach((block) => {
        if (block.kind !== "problem") return;
        if (mode === "bank") delete block.semantic;
        if (mode === "answers") block.answer = "3";
        if (mode === "worked")
          block.publicWorkedExample = { answer: "3", solution: "합성 풀이" };
        if (mode === "group")
          block.semantic!.node = {
            kind: "exampleGroup",
            groupId: "synthetic-group",
            title: "합성 예제",
            strategy: "",
            exampleItemId: block.itemId,
            confirmItemIds: [],
          };
      });
      expect(
        allocateSourceWritingSpace(input.sections, input.pages, []),
      ).toEqual({ work: [], placements: [] });
    }
  });

  it("preserves zero-base writing and an explicitly absent direct grid", () => {
    expect(allocate(syntheticWritingCase({ lines: 0 }))).toEqual({
      work: [],
      placements: [],
    });
    expect(allocate(syntheticWritingCase({ gridKind: null }))).toEqual({
      work: [],
      placements: [],
    });
  });

  it("allocates only the explicitly supplied first direct grid", () => {
    const input = syntheticWritingCase({ count: 4 });
    input.pageMeasurements[0].gridBlockIds =
      input.pageMeasurements[0].gridBlockIds.slice(0, 2);
    input.pageMeasurements[0].gridChildCount = 2;
    const plan = allocate(input);
    expect(plan.work.map((entry) => entry.blockId)).toEqual(
      input.pageMeasurements[0].gridBlockIds,
    );
    expect(plan.work.map((entry) => entry.lines)).toEqual([6, 6]);
  });

  it("keeps residual slack in the original work margin and honors reason8 versus calc6", () => {
    const input = syntheticWritingCase({
      count: 2,
      height: 43.5,
      capReason: true,
    });
    input.measurements[1].workOffsetMm = 11.5;
    const plan = allocate(input);
    expect(plan.work.map((entry) => entry.lines)).toEqual([8, 8]);
    expect(plan.work.map((entry) => entry.slackMm)).toEqual([1.5, 0]);
    expect(plan.work[0].marginTopMm).toBeCloseTo(2.7, 8);
    expect(
      allocate(syntheticWritingCase({ count: 2 })).work.map(
        (entry) => entry.lines,
      ),
    ).toEqual([6, 6]);
  });

  it("retains authored bases above caps and follows the native maximum row cap without clamping shorter peers", () => {
    expect(
      allocate(syntheticWritingCase({ lines: 9 })).work.every(
        (entry) => entry.lines === 9,
      ),
    ).toBe(true);
    const input = syntheticWritingCase({ count: 2, height: 35 });
    input.measurements[1].workOffsetMm = 17;
    expect(allocate(input).work.map((entry) => entry.lines)).toEqual([7, 6]);
  });

  it("adds no 7mm increment below the budget threshold, including a negative budget", () => {
    for (const budget of [6.999, 0, -1]) {
      const plan = allocate(
        syntheticWritingCase({
          contentBottom: 270 - SOURCE_WRITING_STOP_GAP_MM - budget,
        }),
      );
      expect(
        plan.work.every((entry) => entry.lines === 2 && entry.heightMm === 28),
      ).toBe(true);
    }
  });

  it("uses .1px native tolerance rather than .1mm and consumes top alignment", () => {
    const input = syntheticWritingCase({ count: 2, height: 28.05 });
    const plan = allocate(input);
    expect(plan.work.every((entry) => entry.lines === 5)).toBe(true);
    const pair = combineWritingCases(
      syntheticWritingCase({ page: 2, top: 50, contentBottom: 260 }),
      syntheticWritingCase({ page: 3, top: 53, contentBottom: 260 }),
    );
    expect(allocate(pair).work.every((entry) => entry.yMm >= 53)).toBe(true);
  });

  it("fails visibly for missing, duplicate, negative or non-finite measurements", () => {
    const missing = syntheticWritingCase();
    expect(() =>
      allocateSourceWritingSpace(
        missing.sections,
        missing.pages,
        missing.measurements,
      ),
    ).toThrow(/missing first-grid/);
    missing.measurements.pop();
    expect(() => allocate(missing)).toThrow(/missing base work/);
    for (const field of [
      "questionHeightMm",
      "workOffsetMm",
      "paddingBottomMm",
      "borderBottomMm",
      "baseLines",
    ] as const) {
      const input = syntheticWritingCase();
      input.measurements[0][field] = -1;
      expect(() => allocate(input)).toThrow(/invalid base/);
    }
    const nan = syntheticWritingCase();
    nan.measurements[0].workMarginTopMm = NaN;
    expect(() => allocate(nan)).toThrow(/invalid base/);
    const duplicate = syntheticWritingCase();
    duplicate.measurements.push(duplicate.measurements[0]);
    expect(() => allocate(duplicate)).toThrow(/duplicate/);
    const unknown = syntheticWritingCase();
    unknown.pageMeasurements[0].gridBlockIds = ["missing"];
    expect(() => allocate(unknown)).toThrow(/missing from its actual page/);
  });

  it("rejects row equalization that exceeds the native stop instead of clipping or changing pages", () => {
    const input = combineWritingCases(
      syntheticWritingCase({ page: 2, height: 28, contentBottom: 260 }),
      syntheticWritingCase({ page: 3, height: 42, contentBottom: 265 }),
    );
    expect(() => allocate(input)).toThrow(
      /row equalization exceeds native stop/,
    );
  });

  it("enforces 8 sections, 600 projected blocks and 32 pages", () => {
    const input = syntheticWritingCase();
    expect(() =>
      allocateSourceWritingSpace(Array(9).fill(input.sections[0]), [], []),
    ).toThrow(/8 sections/);
    expect(() =>
      allocateSourceWritingSpace(
        [{ ...input.sections[0], blocks: Array(601).fill(problem(input)) }],
        [],
        [],
      ),
    ).toThrow(/600 blocks/);
    expect(() =>
      allocateSourceWritingSpace([], Array(33).fill(input.pages[0]), []),
    ).toThrow(/32 pages/);
    const bounded = Array.from({ length: 8 }, (_, sectionIndex) => ({
      ...input.sections[0],
      sectionKey: `bounded-${sectionIndex}`,
      blocks: Array.from({ length: 75 }, (_, blockIndex) => ({
        ...input.sections[0].blocks.at(-1)!,
        id: `bounded-${sectionIndex}-${blockIndex}`,
      })),
    }));
    const boundedPages = Array.from({ length: 32 }, (_, pageIndex) => ({
      ...input.pages[0],
      physicalPageIndex: pageIndex + 1,
      blocks: [],
    }));
    expect(allocateSourceWritingSpace(bounded, boundedPages, [])).toEqual({
      work: [],
      placements: [],
    });
  });
});

describe.skipIf(!process.env.TEXTBOOK_SOURCE_WRITING_FIXTURE)(
  "independent frozen original native writing geometry with converted RenderSections",
  () => {
    it.each([
      [29, 31],
      [32, 33],
      [34, 35],
      [36, 37],
      [38, 39],
      [42, 43],
    ])(
      "matches original before/after on bounded cohort %j",
      (...pageNumbers) => {
        const input = frozenSourceWritingCase(pageNumbers);
        const before = JSON.stringify([
          input.sections,
          input.pages,
          input.measurements,
          input.pageMeasurements,
        ]);
        const plan = allocate(input);
        expect(plan.work).toHaveLength(input.measurements.length);
        for (const page of input.after) {
          for (const q of page.questions) {
            const id = input.byQuestion.get(q.questionId)!.id;
            const assigned = plan.work.find((entry) => entry.blockId === id)!;
            expect(assigned.lines, `${page.sourcePage}/${q.questionId}`).toBe(
              q.observedLines,
            );
            expect(
              Math.abs(assigned.heightMm - q.questionHeightMm),
              `height ${q.questionId}`,
            ).toBeLessThan(0.02);
            expect(
              Math.abs(assigned.yMm - q.questionBoxMm[1]),
              `top ${q.questionId}`,
            ).toBeLessThan(0.025);
            expect(
              Math.abs(assigned.marginTopMm - q.workMarginTopMm),
              `margin ${q.questionId}`,
            ).toBeLessThan(0.02);
          }
          const original = input.before.find(
            (entry) => entry.sourcePage === page.sourcePage,
          )!;
          const baseLast = original.questions.at(-1)!,
            finalLast = page.questions.at(-1)!;
          const assignedLast = plan.work.find(
            (entry) =>
              entry.blockId === input.byQuestion.get(baseLast.questionId)!.id,
          )!;
          const bottomShift =
            assignedLast.yMm +
            assignedLast.heightMm -
            baseLast.questionBoxMm[3];
          expect(
            Math.abs(
              original.contentBottomMm + bottomShift - page.contentBottomMm,
            ),
          ).toBeLessThan(0.025);
          expect(assignedLast.lines).toBe(finalLast.observedLines);
          expect(page.contentBottomMm).toBeLessThanOrEqual(
            page.stopTopMm - SOURCE_WRITING_STOP_GAP_MM + 0.025,
          );
        }
        expect(
          JSON.stringify([
            input.sections,
            input.pages,
            input.measurements,
            input.pageMeasurements,
          ]),
        ).toBe(before);
      },
    );
  },
);
