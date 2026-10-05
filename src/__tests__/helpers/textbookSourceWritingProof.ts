import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type RenderSection,
} from "@/lib/textbook/render/model";
import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import type {
  SourceWritingPageMeasurement,
  SourceWritingSpaceMeasurement,
} from "@/lib/textbook/layout/sourceWritingSpace";

type Problem = Extract<RenderBlock, { kind: "problem" }>;
export interface WritingCase {
  sections: RenderSection[];
  pages: TextbookPage[];
  measurements: SourceWritingSpaceMeasurement[];
  pageMeasurements: SourceWritingPageMeasurement[];
}
/** Stated geometry, not a DOM or original-source measurement. */
export function syntheticWritingCase(
  options: {
    page?: number;
    kind?: string;
    count?: number;
    lines?: number;
    capReason?: boolean;
    offset?: number;
    height?: number;
    top?: number;
    contentBottom?: number;
    sectionName?: string;
    gridKind?: SourceWritingPageMeasurement["gridKind"];
    daily?: boolean;
  } = {},
): WritingCase {
  const pageIndex = options.page ?? 2,
    sourceKind = options.kind ?? "exercise";
  const count = options.count ?? 4,
    lines = options.lines ?? 2;
  const height = options.height ?? 14 + lines * 7,
    offset = options.offset ?? 10;
  const top = options.top ?? 50;
  const cols = options.gridKind === "reason-grid" ? 1 : 2;
  const sectionKey = `synthetic-writing-${pageIndex}`;
  const problems: Problem[] = Array.from({ length: count }, (_, index) => ({
    id: `${sectionKey}-q${index}`,
    sourceBlockId: `${sectionKey}-q${index}`,
    unitKey: "U01",
    sectionKey,
    kind: "problem",
    itemId: `${sectionKey}-item${index}`,
    displayNumber: String(index + 1),
    content: "합성 $1+2$ 문항",
    figures: [],
    questionType: options.capReason ? "reason" : "calc",
    qr: null,
    sourcePageLabel: null,
    layout: {
      columnSpan: cols === 1 ? 2 : 1,
      minWorkLines: lines,
      preferredWorkLines: lines,
      maxWorkLines: Math.max(lines, 8),
      keepTogether: true,
    },
    semantic: {
      activity: "practice",
      source: {
        unit: "U01",
        page: pageIndex,
        kind: sourceKind,
        sectionName: options.sectionName ?? "합성 유형",
        path: `pages[${pageIndex}].qs[${index}]`,
      },
    },
  }));
  const lastBottom =
    top + (Math.ceil(count / cols) - 1) * (height + 5) + height;
  const trailing: RenderBlock = {
    id: `${sectionKey}-trailing`,
    sourceBlockId: `${sectionKey}-trailing`,
    unitKey: "U01",
    sectionKey,
    kind: "text",
    markdown: "합성 고정 본문",
  };
  const blocks = problems.map((block, index) => ({
    blockId: block.id,
    itemId: block.itemId,
    column: ((index % cols) + 1) as 1 | 2,
    xMm: index % cols ? 111 : 18,
    yMm: top + Math.floor(index / cols) * (height + 5),
    widthMm: cols === 1 ? 179 : 86,
    heightMm: height,
  }));
  return {
    sections: [
      {
        unitKey: "U01",
        sectionKey,
        unitTitle: "합성 단원",
        title: "합성 풀이",
        templateKey: `reference-${sourceKind}`,
        startPolicy: "continue",
        blocks: [...problems, trailing],
      },
    ],
    pages: [
      {
        physicalPageIndex: pageIndex,
        printedPageLabel: String(pageIndex),
        unitKey: "U01",
        sectionKey,
        unitTitle: "합성 단원",
        sectionTitle: "합성 풀이",
        kind: "content",
        blocks: [
          ...blocks,
          {
            blockId: trailing.id,
            column: 1,
            xMm: 18,
            yMm: lastBottom + 7,
            widthMm: 179,
            heightMm: 5,
          },
        ],
      },
    ],
    measurements: problems.map((block) => ({
      blockId: block.id,
      questionHeightMm: height,
      workOffsetMm: offset,
      paddingBottomMm: 3,
      borderBottomMm: 1,
      workMarginTopMm: 1.2,
      baseLines: lines,
    })),
    pageMeasurements: [
      {
        physicalPageIndex: pageIndex,
        contentBottomMm: options.contentBottom ?? lastBottom + 12,
        stopTopMm: 270,
        gridKind:
          options.gridKind === undefined ? "question-grid" : options.gridKind,
        gridBlockIds:
          options.gridKind === null ? [] : problems.map((block) => block.id),
        gridChildCount: options.gridKind === null ? 0 : count,
        hasDailyBanner: options.daily ?? false,
      },
    ],
  };
}
export function combineWritingCases(...cases: WritingCase[]): WritingCase {
  return {
    sections: cases.flatMap((entry) => entry.sections),
    pages: cases.flatMap((entry) => entry.pages),
    measurements: cases.flatMap((entry) => entry.measurements),
    pageMeasurements: cases.flatMap((entry) => entry.pageMeasurements),
  };
}

export const NATIVE_WRITING_ORACLE_SHA256 =
  "e55363ff1ca288a25b3e11b7d7ca12798ba0b7eab611c54e156f1089881dd7dc";
interface NativeQuestion {
  questionId: string;
  observedLines: number;
  capLines: number;
  questionBoxMm: number[];
  questionHeightMm: number;
  workTopOffsetMm: number;
  workMarginTopMm: number;
  paddingBottomMm: number;
  borderBottomMm: number;
}
interface NativePage {
  sourcePage: number;
  unit: string;
  section: string;
  dailyBanner: boolean;
  contentBottomMm: number;
  stopTopMm: number;
  grid: {
    className: string;
    directChildCount: number;
    directChildOrder: string[];
    columns: number;
  };
  questions: NativeQuestion[];
}
/** Read-only original measurements + strict converted exchange; no native script is loaded. */
export function frozenSourceWritingCase(pageNumbers: readonly number[]) {
  const directory = process.env.TEXTBOOK_SOURCE_WRITING_FIXTURE;
  if (!directory)
    throw new Error(
      "Set TEXTBOOK_SOURCE_WRITING_FIXTURE to the external reference directory",
    );
  const oracleBytes = readFileSync(
    path.join(
      directory,
      "source-native-writing-allocation-v4/source-writing-allocation.json",
    ),
  );
  const digest = createHash("sha256").update(oracleBytes).digest("hex");
  if (digest !== NATIVE_WRITING_ORACLE_SHA256)
    throw new Error(
      "Native writing oracle is not the independently pinned capture",
    );
  const oracle = JSON.parse(oracleBytes.toString("utf8")) as {
    before: NativePage[];
    after: NativePage[];
    manuscriptSha256: string;
  };
  const exchangeBytes = readFileSync(
    path.join(directory, "exchange-semantic.json"),
  );
  const exchange = textbookExchangeSchema.parse(
    JSON.parse(exchangeBytes.toString("utf8")),
  );
  const whole = createTextbookRenderModel(exchange, "student");
  const wanted = new Set(pageNumbers);
  const sections = whole.sections.filter((section) =>
    section.blocks.some((block) =>
      wanted.has(block.semantic?.source?.page ?? -1),
    ),
  );
  const byQuestion = new Map(
    sections.flatMap((section) =>
      section.blocks
        .filter((block): block is Problem => block.kind === "problem")
        .map((block) => [block.semantic!.source!.questionId!, block] as const),
    ),
  );
  const before = oracle.before.filter((page) => wanted.has(page.sourcePage));
  if (before.length !== wanted.size || sections.length !== wanted.size)
    throw new Error("Frozen native or converted source page is missing");
  const pages: TextbookPage[] = before.map((page) => {
    const section = sections.find((entry) =>
      entry.blocks.some(
        (block) => block.semantic?.source?.page === page.sourcePage,
      ),
    )!;
    return {
      physicalPageIndex: page.sourcePage,
      printedPageLabel: String(page.sourcePage),
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      unitTitle: section.unitTitle,
      sectionTitle: section.title,
      kind: "content",
      blocks: page.questions.map((q, index) => {
        const block = byQuestion.get(q.questionId);
        if (!block) throw new Error(`No converted question ${q.questionId}`);
        if ((block.questionType === "reason" ? 8 : 6) !== q.capLines)
          throw new Error(`Native reason class lost for ${q.questionId}`);
        return {
          blockId: block.id,
          itemId: block.itemId,
          column: ((index % page.grid.columns) + 1) as 1 | 2,
          xMm: q.questionBoxMm[0],
          yMm: q.questionBoxMm[1],
          widthMm: q.questionBoxMm[2] - q.questionBoxMm[0],
          heightMm: q.questionHeightMm,
        };
      }),
    };
  });
  const measurements = before.flatMap((page) =>
    page.questions.map((q): SourceWritingSpaceMeasurement => ({
      blockId: byQuestion.get(q.questionId)!.id,
      questionHeightMm: q.questionHeightMm,
      workOffsetMm: q.workTopOffsetMm,
      paddingBottomMm: q.paddingBottomMm,
      borderBottomMm: q.borderBottomMm,
      workMarginTopMm: q.workMarginTopMm,
      baseLines: q.observedLines,
    })),
  );
  const pageMeasurements = before.map((page): SourceWritingPageMeasurement => ({
    physicalPageIndex: page.sourcePage,
    contentBottomMm: page.contentBottomMm,
    stopTopMm: page.stopTopMm,
    gridKind: page.grid.className.includes("reason-grid")
      ? "reason-grid"
      : "question-grid",
    gridBlockIds: page.grid.directChildOrder.map(
      (id) => byQuestion.get(id)!.id,
    ),
    gridChildCount: page.grid.directChildCount,
    hasDailyBanner: page.dailyBanner,
  }));
  return {
    sections,
    pages,
    measurements,
    pageMeasurements,
    before,
    after: oracle.after.filter((page) => wanted.has(page.sourcePage)),
    byQuestion,
    exchangeSha256: createHash("sha256").update(exchangeBytes).digest("hex"),
  };
}
