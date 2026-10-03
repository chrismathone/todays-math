import type {
  PagePlacement,
  TextbookConfig,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import type { RenderBlock, RenderSection } from "../render/model";

export const A4 = Object.freeze({
  widthMm: 210,
  heightMm: 297,
  bodyTopMm: 40,
  bodyBottomMm: 277,
  gapMm: 4,
  columnGapMm: 7,
  workLineMm: 7,
  toleranceMm: 0.5,
});
export interface BlockMeasurement {
  blockId: string;
  heightMm: number;
  widthMm: number;
}
export interface BlockPlacement {
  blockId: string;
  itemId?: string;
  column: 1 | 2;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}
export interface TextbookPage {
  physicalPageIndex: number;
  printedPageLabel: string;
  unitKey: string;
  sectionKey: string;
  unitTitle: string;
  sectionTitle: string;
  kind: "content" | "cover";
  blocks: BlockPlacement[];
}
export interface TextbookLayout {
  pages: TextbookPage[];
  pageMap: PagePlacement[];
  issues: TextbookIssue[];
  nextPhysicalPageIndex: number;
}
export class TextbookLayoutError extends Error {
  constructor(readonly issues: TextbookIssue[]) {
    super(issues.map((i) => `${i.code}: ${i.message}`).join("\n"));
    this.name = "TextbookLayoutError";
  }
}
export const blockColumnSpan = (block: RenderBlock): 1 | 2 =>
  block.kind === "problem" ? block.layout.columnSpan : 2;
export function blockWidthMm(
  config: TextbookConfig,
  block: RenderBlock,
): number {
  const width =
    A4.widthMm - config.print.innerMarginMm - config.print.outerMarginMm;
  return blockColumnSpan(block) === 1 ? (width - A4.columnGapMm) / 2 : width;
}

/** Deterministic rows from measured DOM sizes. No guessed heights, blank filler or deleted content. */
export function paginateTextbookSections(
  sections: readonly RenderSection[],
  measurements: readonly BlockMeasurement[],
  config: TextbookConfig,
  options: {
    firstPhysicalPageIndex?: number;
    includeCover?: boolean;
    previousSectionKey?: string;
    maxPages?: number;
  } = {},
): TextbookLayout {
  let next =
    options.firstPhysicalPageIndex ?? config.print.firstPhysicalPageIndex;
  const pages: TextbookPage[] = [],
    pageMap: PagePlacement[] = [],
    issues: TextbookIssue[] = [];
  const measure = new Map(measurements.map((m) => [m.blockId, m]));
  if (measure.size !== measurements.length)
    throw new TextbookLayoutError([
      {
        code: "DUPLICATE_MEASUREMENT",
        severity: "error",
        path: [],
        message: "블록 측정 ID가 중복됩니다.",
      },
    ]);
  const fail = (
    code: string,
    message: string,
    section: RenderSection,
    block?: RenderBlock,
  ): never => {
    throw new TextbookLayoutError([
      {
        code,
        message,
        severity: "error",
        path: [
          "units",
          section.unitKey,
          "sections",
          section.sectionKey,
          ...(block ? ["blocks", block.sourceBlockId] : []),
        ],
        physicalPageIndex: next,
      },
    ]);
  };
  if (options.includeCover) {
    if (config.print.coverMode !== "included")
      throw new Error("Cover requested for separate cover configuration");
    pages.push({
      physicalPageIndex: next++,
      printedPageLabel: "",
      unitKey: "",
      sectionKey: "",
      unitTitle: config.title,
      sectionTitle: config.displayCode,
      kind: "cover",
      blocks: [],
    });
  }
  let previousSection = options.previousSectionKey;
  for (const section of sections) {
    const sectionPageStart = pages.length;
    if (!section.blocks.length)
      fail(
        "EMPTY_SECTION",
        "원고가 없는 구획입니다. 원고를 입력하거나 구획을 명시적으로 삭제하세요.",
        section,
      );
    if (section.startPolicy === "even-left" && next % 2 !== 0)
      fail(
        "SECTION_PARITY",
        `주요 구획 ${section.sectionKey}이 홀수 ${next}쪽에서 시작합니다. 이전 구획 ${previousSection ?? "표지·본문 시작 면"}의 실제 원고 배치 또는 설정을 수정하세요. 빈 쪽은 자동 삽입하지 않습니다.`,
        section,
      );
    let page: TextbookPage | undefined,
      cursor = A4.bodyTopMm;
    const previousPage = pages[pages.length - 1];
    if (
      section.startPolicy === "continue" &&
      previousPage?.kind === "content" &&
      previousPage.unitKey === section.unitKey
    ) {
      page = previousPage;
      cursor =
        Math.max(...page.blocks.map((b) => b.yMm + b.heightMm)) + A4.gapMm;
    }
    const newPage = () => {
      if (pages.length >= (options.maxPages ?? 5000))
        fail(
          "PAGE_LIMIT",
          "쪽 수 상한을 넘었습니다. 구획을 나눠 주세요.",
          section,
        );
      page = {
        physicalPageIndex: next,
        printedPageLabel: String(next),
        unitKey: section.unitKey,
        sectionKey: section.sectionKey,
        unitTitle: section.unitTitle,
        sectionTitle: section.title,
        kind: "content",
        blocks: [],
      };
      next++;
      pages.push(page);
      cursor = A4.bodyTopMm;
    };
    let row: { block: RenderBlock; measurement: BlockMeasurement }[] = [];
    const flush = () => {
      if (!row.length) return;
      const height = Math.max(...row.map((r) => r.measurement.heightMm));
      if (height > A4.bodyBottomMm - A4.bodyTopMm)
        fail(
          "BLOCK_OVERFLOW",
          `블록 높이 ${height.toFixed(1)}mm가 본문 영역보다 큽니다. 이 블록의 원고·그림·풀이선 수를 나누거나 줄여 주세요.`,
          section,
          row[0].block,
        );
      if (!page || cursor + height > A4.bodyBottomMm) newPage();
      const left =
        page!.physicalPageIndex % 2 === 0
          ? config.print.outerMarginMm
          : config.print.innerMarginMm;
      row.forEach(({ block, measurement }, i) => {
        const width = blockWidthMm(config, block);
        const column = (i + 1) as 1 | 2;
        const placement: BlockPlacement = {
          blockId: block.id,
          column,
          xMm: left + i * (width + A4.columnGapMm),
          yMm: cursor,
          widthMm: width,
          heightMm: height,
          ...(block.kind === "problem" ? { itemId: block.itemId } : {}),
        };
        if (Math.abs(measurement.widthMm - width) > A4.toleranceMm)
          fail(
            "MEASUREMENT_WIDTH",
            "미리보기와 조판 측정 폭이 다릅니다. 같은 글꼴·치수로 다시 측정하세요.",
            section,
            block,
          );
        page!.blocks.push(placement);
        if (block.kind === "problem")
          pageMap.push({
            itemId: block.itemId,
            physicalPageIndex: page!.physicalPageIndex,
            printedPageLabel: page!.printedPageLabel,
            column,
          });
      });
      cursor += height + A4.gapMm;
      row = [];
    };
    for (const [blockIndex, block] of section.blocks.entries()) {
      const m = measure.get(block.id);
      if (
        !m ||
        !Number.isFinite(m.heightMm) ||
        m.heightMm <= 0 ||
        !Number.isFinite(m.widthMm) ||
        m.widthMm <= 0
      )
        fail(
          "MISSING_MEASUREMENT",
          "블록을 실제 글꼴·이미지로 측정하지 못했습니다.",
          section,
          block,
        );
      if (block.kind === "unit-intro") {
        if (
          blockIndex !== 0 ||
          section.startPolicy !== "even-left" ||
          !block.goals.length ||
          section.blocks.length <= 2
        )
          fail(
            "UNIT_INTRO_CONTENT",
            "단원 도입은 짝수 왼쪽의 학습 목표와 오른쪽의 실제 원고가 필요합니다.",
            section,
            block,
          );
        if (m!.heightMm > A4.bodyBottomMm - A4.bodyTopMm)
          fail(
            "BLOCK_OVERFLOW",
            "단원 목표·선수 원고가 도입 왼쪽을 넘습니다. 원고를 나눠 주세요.",
            section,
            block,
          );
        flush();
        row.push({
          block,
          measurement: { ...m!, heightMm: A4.bodyBottomMm - A4.bodyTopMm },
        });
        flush();
        page = undefined;
        cursor = A4.bodyTopMm;
        continue;
      }
      if (blockColumnSpan(block) === 2) {
        flush();
        if (block.kind === "heading" && page) {
          const following = section.blocks[blockIndex + 1];
          const nextHeight = following
            ? (measure.get(following.id)?.heightMm ?? 0)
            : 0;
          if (cursor + m!.heightMm + A4.gapMm + nextHeight > A4.bodyBottomMm)
            newPage();
        }
        row.push({ block, measurement: m! });
        flush();
      } else {
        row.push({ block, measurement: m! });
        if (row.length === 2) flush();
      }
    }
    flush();
    if (
      section.templateKey === "unit-intro" &&
      pages.length - sectionPageStart !== 2
    )
      fail(
        "UNIT_INTRO_SPREAD",
        "단원 도입은 정확히 왼쪽·오른쪽 두 쪽이어야 합니다. 오른쪽 원고의 분량을 조정하세요.",
        section,
      );
    previousSection = section.sectionKey;
  }
  const itemIds = pageMap.map((p) => p.itemId);
  if (new Set(itemIds).size !== itemIds.length)
    throw new TextbookLayoutError([
      {
        code: "DUPLICATE_PAGE_ITEM",
        severity: "error",
        path: ["pageMap"],
        message: "같은 문항 배치가 여러 쪽에 반복되었습니다.",
      },
    ]);
  return { pages, pageMap, issues, nextPhysicalPageIndex: next };
}

/** Align corresponding spread rows by adding actual writing space. Overflow remains an explicit editing failure. */
export function alignTextbookSpreads(pages: TextbookPage[]): void {
  const rows = (page: TextbookPage) => {
    const result: BlockPlacement[][] = [];
    for (const block of page.blocks) {
      const last = result[result.length - 1];
      if (last && Math.abs(last[0].yMm - block.yMm) < 0.01) last.push(block);
      else result.push([block]);
    }
    return result;
  };
  for (let i = 0; i < pages.length - 1; i++) {
    const left = pages[i],
      right = pages[i + 1];
    if (
      left.kind !== "content" ||
      right.kind !== "content" ||
      left.physicalPageIndex % 2 !== 0 ||
      right.physicalPageIndex !== left.physicalPageIndex + 1
    )
      continue;
    if (left.blocks.some((b) => b.blockId.startsWith("generated-intro:"))) {
      i++;
      continue;
    }
    // Only corresponding exercise rows gain writing space. Introductory prose and
    // section headings have their own semantic order and must not become exercises.
    const lr = rows(left).filter((row) => row.every((b) => b.itemId)),
      rr = rows(right).filter((row) => row.every((b) => b.itemId));
    if (!lr.length || !rr.length) continue;
    // Mixed prose between exercises needs a fresh measured layout, not row shifting.
    if (
      [left, right].some((p) => {
        const first = p.blocks.findIndex((b) => b.itemId);
        return p.blocks.slice(first).some((b) => !b.itemId);
      })
    )
      continue;
    let cursor = Math.max(lr[0][0].yMm, rr[0][0].yMm);
    for (let r = 0; r < Math.max(lr.length, rr.length); r++) {
      const matching = [...(lr[r] ?? []), ...(rr[r] ?? [])];
      const height = Math.max(...matching.map((b) => b.heightMm));
      if (cursor + height > A4.bodyBottomMm + 0.01)
        throw new TextbookLayoutError([
          {
            code: "SPREAD_ALIGNMENT_OVERFLOW",
            severity: "error",
            path: ["pages", left.physicalPageIndex],
            physicalPageIndex: left.physicalPageIndex,
            message: `펼침면 ${left.physicalPageIndex}–${right.physicalPageIndex}쪽의 대응 행 정렬이 본문 영역을 넘습니다. 두 쪽의 원고·풀이선·구획 배치를 수정하세요.`,
          },
        ]);
      matching.forEach((b) => {
        b.yMm = cursor;
        b.heightMm = height;
      });
      cursor += height + A4.gapMm;
    }
    i++;
  }
}

/** Final whole-edition budget check, kept out of individual resumable chunks. */
export function pageBudgetIssues(
  pageCount: number,
  config: TextbookConfig,
): TextbookIssue[] {
  const { target, tolerance, strict } = config.pageBudget;
  return Math.abs(pageCount - target) <= tolerance
    ? []
    : [
        {
          code: "PAGE_BUDGET",
          severity: strict ? "error" : "warning",
          path: ["config", "pageBudget"],
          message: `실제 ${pageCount}쪽은 목표 ${target}±${tolerance}쪽을 벗어납니다. 내용을 자동 삭제하거나 빈 쪽을 넣지 않습니다.`,
        },
      ];
}

/** Read source-page labels from server-owned student placements, never answer footprints. */
export function studentPageMapFromPages(
  sections: readonly RenderSection[],
  pages: readonly TextbookPage[],
  config: TextbookConfig,
): PagePlacement[] {
  const pageMap: PagePlacement[] = [],
    blocks = new Map(sections.flatMap((s) => s.blocks).map((b) => [b.id, b])),
    seen = new Set<string>(),
    firstPhysicalPageIndex = pages[0]?.physicalPageIndex ?? Number.NaN;
  const fail = (
    code: string,
    message: string,
    page?: TextbookPage,
    blockId?: string,
  ): never => {
    throw new TextbookLayoutError([
      {
        code,
        message,
        severity: "error",
        path: [
          "studentPages",
          page?.physicalPageIndex ?? firstPhysicalPageIndex,
          ...(blockId ? ["blocks", blockId] : []),
        ],
        ...(page ? { physicalPageIndex: page.physicalPageIndex } : {}),
      },
    ]);
  };
  if (
    !pages.length ||
    pages.length > 32 ||
    !Number.isSafeInteger(firstPhysicalPageIndex) ||
    firstPhysicalPageIndex < config.print.firstPhysicalPageIndex
  )
    fail("STUDENT_PAGE_COUNT", "검증한 학생용 묶음 쪽 참조가 필요합니다.");
  pages.forEach((page, i) => {
    if (
      !Array.isArray(page.blocks) ||
      page.physicalPageIndex !== firstPhysicalPageIndex + i
    )
      fail("STUDENT_PAGE_ORDER", "검증한 학생용 쪽 순서를 확인하세요.", page);
    if (page.kind === "cover") {
      if (
        i ||
        page.blocks.length ||
        page.printedPageLabel !== "" ||
        firstPhysicalPageIndex !== config.print.firstPhysicalPageIndex ||
        config.print.coverMode !== "included"
      )
        fail("STUDENT_COVER", "학생용 표지 참조를 확인하세요.", page);
      return;
    }
    if (
      page.kind !== "content" ||
      !page.blocks.length ||
      page.printedPageLabel !== String(page.physicalPageIndex)
    )
      fail("STUDENT_PAGE_LABEL", "학생용 본문 쪽 참조를 확인하세요.", page);
    for (const p of page.blocks) {
      const b = blocks.get(p.blockId);
      if (!b || seen.has(p.blockId))
        fail(
          "STUDENT_BLOCK_REF",
          "정답지와 학생용 블록의 일치 여부를 확인하세요.",
          page,
          p.blockId,
        );
      seen.add(p.blockId);
      if (
        ![p.xMm, p.yMm, p.widthMm, p.heightMm].every(Number.isFinite) ||
        ![1, 2].includes(p.column) ||
        p.xMm < 0 ||
        p.xMm + p.widthMm > A4.widthMm ||
        p.heightMm <= 0 ||
        Math.abs(p.widthMm - blockWidthMm(config, b!)) > A4.toleranceMm ||
        p.yMm < A4.bodyTopMm ||
        p.yMm + p.heightMm > A4.bodyBottomMm + A4.toleranceMm
      )
        fail(
          "STUDENT_PLACEMENT",
          "검증한 학생용 블록 배치가 필요합니다. 학생용 조판 결과를 확인하세요.",
          page,
          p.blockId,
        );
      if (b!.kind === "problem") {
        const item = b as Extract<RenderBlock, { kind: "problem" }>;
        if (p.itemId !== item.itemId)
          fail(
            "STUDENT_ITEM_REF",
            "학생용 문항 참조가 다릅니다.",
            page,
            p.blockId,
          );
        pageMap.push({
          itemId: item.itemId,
          physicalPageIndex: page.physicalPageIndex,
          printedPageLabel: page.printedPageLabel,
          column: p.column,
        });
      } else if (p.itemId !== undefined)
        fail(
          "STUDENT_ITEM_REF",
          "학생용 문항 참조가 다릅니다.",
          page,
          p.blockId,
        );
    }
  });
  if (seen.size !== blocks.size)
    fail(
      "STUDENT_MISSING_BLOCK",
      "학생용 배치에서 누락된 원고 블록이 있습니다.",
    );
  return pageMap;
}
