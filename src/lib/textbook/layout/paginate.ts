import type {
  PagePlacement,
  TextbookConfig,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import type {
  RenderBlock,
  RenderSection,
  TextbookEditorialStage,
} from "../render/model";

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
  introTextFits?: boolean;
}
export interface BlockPlacement {
  blockId: string;
  itemId?: string;
  column: 1 | 2;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  continuation?: boolean;
}
export interface TextbookPage {
  physicalPageIndex: number;
  printedPageLabel: string;
  unitKey: string;
  sectionKey: string;
  unitTitle: string;
  sectionTitle: string;
  kind: "content" | "cover";
  editorialStage?: TextbookEditorialStage;
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
export function textbookBodyTopMm(
  section: RenderSection,
  block?: RenderBlock,
): number {
  if (!section.blocks.some((candidate) => candidate.semantic))
    return A4.bodyTopMm;
  if (
    section.templateKey.startsWith("reference-unitSpread") ||
    section.templateKey === "auto-unit-intro"
  )
    return 16;
  return (block?.editorialStage ?? section.editorialStage) === "opening" ||
    section.templateKey === "reference-paired" ||
    section.templateKey === "reference-types"
    ? 21
    : 23;
}
export function blockWidthMm(
  config: TextbookConfig,
  block: RenderBlock,
): number {
  const width =
    A4.widthMm - config.print.innerMarginMm - config.print.outerMarginMm;
  return blockColumnSpan(block) === 1 ? (width - A4.columnGapMm) / 2 : width;
}

/** Reserve measured row space before breaking a new automatic exercise run into pages. */
function reserveAutomaticExerciseRows(
  section: RenderSection,
  measurements: Map<string, BlockMeasurement>,
  bodyBottom: number,
): void {
  if (!section.templateKey.startsWith("auto-lesson")) return;
  let run: Extract<RenderBlock, { kind: "problem" }>[] = [];
  let headingHeight = 0;
  const finish = () => {
    if (run.length >= 4) {
      const heights: number[] = [];
      for (let index = 0; index < run.length; index += 2) {
        const pair = run
          .slice(index, index + 2)
          .map((block) => measurements.get(block.id)?.heightMm);
        if (
          pair.some(
            (height) =>
              height === undefined || !Number.isFinite(height) || height <= 0,
          )
        ) {
          run = [];
          return;
        }
        heights.push(Math.max(...(pair as number[])));
      }
      const available =
        bodyBottom -
        textbookBodyTopMm(section, run[0]) -
        headingHeight -
        A4.gapMm;
      const naturalHeight =
        heights.reduce((sum, height) => sum + height, 0) +
        (heights.length - 1) * A4.gapMm;
      if (naturalHeight > available) {
        // Pagination must reserve the space that spread alignment will use. Uniform
        // measured rows keep arbitrary long/short questions in source order and fit
        // matching rows without moving them after the page breaks are already fixed.
        const heightMm = Math.max(...heights);
        for (const block of run) {
          const measured = measurements.get(block.id)!;
          measurements.set(block.id, { ...measured, heightMm });
        }
      }
    }
    run = [];
  };
  for (const block of section.blocks) {
    if (
      block.kind === "problem" &&
      block.semantic &&
      !block.semantic.source &&
      block.semantic.node?.kind !== "exampleGroup" &&
      block.layout.columnSpan === 1 &&
      block.answer === undefined &&
      !block.publicWorkedExample &&
      !block.startNewPage
    ) {
      run.push(block);
    } else {
      finish();
      if (block.kind === "heading")
        headingHeight = measurements.get(block.id)?.heightMm ?? 0;
    }
  }
  finish();
}

/** A continued section can share its predecessor's page only within the same unit.
 * Rest pages and auto-created lessons each occupy their own page(s).
 */
export function continuesTextbookSection(
  previous: Pick<RenderSection, "unitKey" | "templateKey"> | undefined,
  section: Pick<RenderSection, "unitKey" | "templateKey" | "startPolicy">,
): boolean {
  const isolated = (template: string) =>
    template === "rest" ||
    template.startsWith("auto-") ||
    template.startsWith("reference-");
  return Boolean(
    previous &&
    section.startPolicy === "continue" &&
    previous.unitKey === section.unitKey &&
    !isolated(previous.templateKey) &&
    !isolated(section.templateKey),
  );
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
    previousTemplateKey?: string;
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
  let previousTemplate = options.previousTemplateKey;
  for (const section of sections) {
    const sectionPageStart = pages.length;
    if (!section.blocks.length)
      fail(
        "EMPTY_SECTION",
        "원고가 없는 구획입니다. 원고를 입력하거나 구획을 명시적으로 삭제하세요.",
        section,
      );
    const introParts =
      section.templateKey === "auto-unit-intro"
        ? section.blocks.filter((block) => block.unitIntroPart)
        : [];
    if (introParts.length) {
      if (introParts.length !== 3 || section.blocks.length !== 3)
        fail(
          "AUTO_INTRO_SOURCE",
          "단원 도입의 공통 원고와 세 가지 측정 모형을 확인하세요.",
          section,
        );
      const part = (name: RenderBlock["unitIntroPart"]) =>
        introParts.find((block) => block.unitIntroPart === name)!;
      const fits = (block: RenderBlock) => {
        const size = measure.get(block.id);
        return (
          size &&
          Number.isFinite(size.heightMm) &&
          size.heightMm > 0 &&
          size.heightMm <= 254 &&
          size.introTextFits !== false &&
          Math.abs(size.widthMm - blockWidthMm(config, block)) <= A4.toleranceMm
        );
      };
      const spread =
        next % 2 === 0 && fits(part("left")) && fits(part("right"));
      if (!spread && !fits(part("single")))
        fail(
          "AUTO_INTRO_OVERFLOW",
          "선택한 단원 도입의 전체 내용이 한 쪽에 들어가지 않습니다. 선택 범위를 줄이거나 도입 원고를 편집하세요.",
          section,
          part("single"),
        );
      const chosen = spread ? [part("left"), part("right")] : [part("single")];
      if (pages.length + chosen.length > (options.maxPages ?? 5000))
        fail(
          "PAGE_LIMIT",
          "쪽 수 상한을 넘었습니다. 구획을 나눠 주세요.",
          section,
        );
      if (!spread)
        issues.push({
          code: "AUTO_INTRO_SINGLE_PAGE",
          severity: "warning",
          path: ["units", section.unitKey, "sections", section.sectionKey],
          physicalPageIndex: next,
          message:
            next % 2 !== 0
              ? "홀수 시작 쪽이므로 도입의 질문·설명·목표·학습 순서·출발점을 한 쪽에 함께 배치했습니다."
              : "두 쪽 도입의 측정 공간이 부족하여 같은 전체 내용을 한 쪽에 함께 배치했습니다.",
        });
      for (const block of chosen) {
        const size = measure.get(block.id)!;
        pages.push({
          physicalPageIndex: next,
          printedPageLabel: String(next),
          unitKey: section.unitKey,
          sectionKey: section.sectionKey,
          unitTitle: section.unitTitle,
          sectionTitle: section.title,
          kind: "content",
          editorialStage: "unit",
          blocks: [
            {
              blockId: block.id,
              column: 1,
              xMm:
                next % 2 === 0
                  ? config.print.outerMarginMm
                  : config.print.innerMarginMm,
              yMm: 16,
              widthMm: blockWidthMm(config, block),
              heightMm: spread ? 254 : size.heightMm,
            },
          ],
        });
        next++;
      }
      previousSection = section.sectionKey;
      previousTemplate = section.templateKey;
      continue;
    }
    if (section.startPolicy === "even-left" && next % 2 !== 0)
      fail(
        "SECTION_PARITY",
        `주요 구획 ${section.sectionKey}이 홀수 ${next}쪽에서 시작합니다. 이전 구획 ${previousSection ?? "표지·본문 시작 면"}의 실제 원고 배치 또는 설정을 수정하세요. 빈 쪽은 자동 삽입하지 않습니다.`,
        section,
      );
    const recovered = section.blocks.some((block) => block.semantic);
    const bodyBottom =
      recovered &&
      section.blocks.some((block) => block.editorialStage === "opening")
        ? 266
        : A4.bodyBottomMm;
    reserveAutomaticExerciseRows(section, measure, bodyBottom);
    let page: TextbookPage | undefined,
      cursor = textbookBodyTopMm(section, section.blocks[0]);
    let currentHeading: RenderBlock | undefined;
    const previousPage = pages[pages.length - 1];
    if (
      continuesTextbookSection(
        previousTemplate
          ? {
              unitKey: previousPage?.unitKey ?? "",
              templateKey: previousTemplate,
            }
          : undefined,
        section,
      ) &&
      previousPage?.kind === "content" &&
      previousPage.unitKey === section.unitKey
    ) {
      page = previousPage;
      cursor =
        Math.max(...page.blocks.map((b) => b.yMm + b.heightMm)) + A4.gapMm;
    }
    const newPage = (firstBlock = row[0]?.block ?? currentHeading) => {
      if (pages.length >= (options.maxPages ?? 5000))
        fail(
          "PAGE_LIMIT",
          "쪽 수 상한을 넘었습니다. 구획을 나눠 주세요.",
          section,
        );
      const continuing = Boolean(
        page?.blocks.length || pages.length > sectionPageStart,
      );
      page = {
        physicalPageIndex: next,
        printedPageLabel: String(next),
        unitKey: section.unitKey,
        sectionKey: section.sectionKey,
        unitTitle: section.unitTitle,
        sectionTitle: section.title,
        kind: "content",
        editorialStage: firstBlock?.editorialStage ?? section.editorialStage,
        blocks: [],
      };
      next++;
      pages.push(page);
      cursor = textbookBodyTopMm(section, firstBlock);
      if (
        recovered &&
        continuing &&
        currentHeading &&
        row[0]?.block.kind !== "heading"
      ) {
        const headingSize = measure.get(currentHeading.id)!;
        const x =
          page.physicalPageIndex % 2 === 0
            ? config.print.outerMarginMm
            : config.print.innerMarginMm;
        page.blocks.push({
          blockId: currentHeading.id,
          continuation: true,
          column: 1,
          xMm: x,
          yMm: cursor,
          widthMm: blockWidthMm(config, currentHeading),
          heightMm: headingSize.heightMm,
        });
        cursor += headingSize.heightMm + A4.gapMm;
      }
    };
    let row: { block: RenderBlock; measurement: BlockMeasurement }[] = [];
    const flush = () => {
      if (!row.length) return;
      const height = Math.max(...row.map((r) => r.measurement.heightMm));
      if (height > bodyBottom - textbookBodyTopMm(section, row[0]?.block))
        fail(
          "BLOCK_OVERFLOW",
          `블록 높이 ${height.toFixed(1)}mm가 본문 영역보다 큽니다. 이 블록의 원고·그림·풀이선 수를 나누거나 줄여 주세요.`,
          section,
          row[0].block,
        );
      if (!page || cursor + height > bodyBottom) newPage();
      if (
        row[0].block.dialogueTopMm &&
        !page!.blocks.some((placement) => {
          const placed = section.blocks.find(
            (block) => block.id === placement.blockId,
          );
          return (
            placed?.kind === "dialogue" ||
            placed?.semantic?.node?.kind === "board"
          );
        })
      )
        cursor = Math.max(cursor, row[0].block.dialogueTopMm);
      if (cursor + height > bodyBottom)
        fail(
          "BLOCK_OVERFLOW",
          "계속되는 쪽의 제목과 원고를 함께 넣을 공간이 부족합니다.",
          section,
          row[0].block,
        );
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
      // Dialogue turns and recall rows use the reference's compact vertical rhythm.
      // Exercise and prose rows keep their measured four-millimetre spacing.
      const gap = row.every(({ block }) => block.kind === "recall")
        ? row.every(
            ({ block }) => block.semantic?.source?.kind === "fullmaster",
          )
          ? 4.7
          : 1
        : row.every(
              ({ block }) =>
                block.kind === "dialogue" ||
                block.semantic?.node?.kind === "board",
            )
          ? (row[0].block.dialogueGapMm ?? 0.85)
          : row[0].block.kind === "heading" && recovered
            ? row[0].block.editorialStage === "opening"
              ? 3.5
              : 4
            : A4.gapMm;
      cursor += height + gap;
      row = [];
    };
    const grouped = new Set<string>();
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (grouped.has(block.id)) continue;
      if (block.startNewPage) {
        flush();
        if (page?.blocks.length) {
          page = undefined;
          cursor = textbookBodyTopMm(section, block);
        }
      }
      if (block.kind === "heading") currentHeading = block;
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
      const group =
        block.kind === "text" && block.semantic?.node?.kind === "exampleGroup"
          ? block.semantic.node
          : undefined;
      if (group) {
        flush();
        const itemIds = [group.exampleItemId, ...group.confirmItemIds];
        const members = section.blocks.slice(
          blockIndex + 1,
          blockIndex + 1 + itemIds.length,
        );
        if (
          members.length !== itemIds.length ||
          members.some(
            (member, index) =>
              member.kind !== "problem" ||
              member.itemId !== itemIds[index] ||
              member.semantic?.node?.kind !== "exampleGroup" ||
              member.semantic.node.groupId !== group.groupId ||
              blockColumnSpan(member) !== 1,
          )
        )
          fail(
            "EXAMPLE_GROUP_MEMBERS",
            "대표예제와 연결된 확인문제의 순서·열 배치를 확인하세요.",
            section,
            block,
          );
        const sizes = members.map((member) => {
          const size = measure.get(member.id);
          if (
            !size ||
            !Number.isFinite(size.heightMm) ||
            size.heightMm <= 0 ||
            Math.abs(size.widthMm - blockWidthMm(config, member)) >
              A4.toleranceMm
          )
            fail(
              "EXAMPLE_GROUP_MEASUREMENT",
              "예제와 확인문제를 실제 열 폭으로 측정하세요.",
              section,
              member,
            );
          return size!;
        });
        if (Math.abs(m!.widthMm - blockWidthMm(config, block)) > A4.toleranceMm)
          fail(
            "MEASUREMENT_WIDTH",
            "예제 제목의 실제 측정 폭을 확인하세요.",
            section,
            block,
          );
        const rightInset = 3;
        const columnsHeight = Math.max(
          sizes[0].heightMm,
          rightInset +
            sizes.slice(1).reduce((sum, size) => sum + size.heightMm, 0),
        );
        const groupHeight = Math.max(102, m!.heightMm + columnsHeight);
        if (!page || cursor + groupHeight > bodyBottom) newPage(block);
        if (cursor + groupHeight > bodyBottom)
          fail(
            "EXAMPLE_GROUP_OVERFLOW",
            "예제와 확인문제를 한 지면에 넣을 수 없습니다. 원고·그림·풀이 공간을 조정하세요.",
            section,
            block,
          );
        const left =
          page!.physicalPageIndex % 2 === 0
            ? config.print.outerMarginMm
            : config.print.innerMarginMm;
        page!.blocks.push({
          blockId: block.id,
          column: 1,
          xMm: left,
          yMm: cursor,
          widthMm: blockWidthMm(config, block),
          heightMm: m!.heightMm,
        });
        let rightTop = cursor + m!.heightMm + rightInset;
        members.forEach((member, index) => {
          const problem = member as Extract<RenderBlock, { kind: "problem" }>;
          const column = index === 0 ? 1 : 2;
          const width = blockWidthMm(config, member);
          page!.blocks.push({
            blockId: member.id,
            itemId: problem.itemId,
            column,
            xMm: left + (column - 1) * (width + A4.columnGapMm),
            yMm: index === 0 ? cursor + m!.heightMm : rightTop,
            widthMm: width,
            heightMm: sizes[index].heightMm,
          });
          pageMap.push({
            itemId: problem.itemId,
            physicalPageIndex: page!.physicalPageIndex,
            printedPageLabel: page!.printedPageLabel,
            column,
          });
          if (index > 0) rightTop += sizes[index].heightMm;
          grouped.add(member.id);
        });
        cursor += groupHeight + 3;
        continue;
      }
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
        if (
          (block.kind === "heading" ||
            (block.kind === "text" &&
              /^#{1,6}\s+[^\n]+\s*$/.test(block.markdown))) &&
          page
        ) {
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
    previousTemplate = section.templateKey;
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
export function alignTextbookSpreads(
  pages: TextbookPage[],
  sections?: readonly RenderSection[],
): void {
  const originals = new Map(
    sections?.flatMap((section) =>
      section.blocks.map((block) => [block.id, block] as const),
    ),
  );
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
      left.unitKey !== right.unitKey ||
      left.editorialStage !== right.editorialStage ||
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
    if (
      !lr.length ||
      lr.length !== rr.length ||
      [...lr, ...rr].some((row) => row.length !== 2)
    )
      continue;
    const sourceLeft = originals.get(lr[0][0].blockId)?.semantic?.source;
    const sourceRight = originals.get(rr[0][0].blockId)?.semantic?.source;
    if (sourceLeft || sourceRight) {
      // The native template only aligns exercise grids of the same source section.
      if (
        sourceLeft?.kind !== "exercise" ||
        sourceRight?.kind !== "exercise" ||
        !sourceLeft.sectionName ||
        sourceLeft.sectionName !== sourceRight.sectionName
      )
        continue;
    } else if (left.sectionKey !== right.sectionKey) continue;
    if (
      [...lr, ...rr]
        .flat()
        .some(
          (placement) =>
            originals.get(placement.blockId)?.semantic?.node?.kind ===
            "exampleGroup",
        )
    )
      continue;
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
    const physicalPageIndex = page?.physicalPageIndex ?? firstPhysicalPageIndex;
    throw new TextbookLayoutError([
      {
        code,
        message,
        severity: "error",
        path: [
          "studentPages",
          ...(Number.isSafeInteger(physicalPageIndex)
            ? [physicalPageIndex]
            : []),
          ...(blockId ? ["blocks", blockId] : []),
        ],
        ...(Number.isSafeInteger(physicalPageIndex)
          ? { physicalPageIndex }
          : {}),
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
    const pageSeen = new Set<string>();
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
      if (
        !b ||
        pageSeen.has(p.blockId) ||
        (seen.has(p.blockId) && b.kind !== "heading")
      )
        fail(
          "STUDENT_BLOCK_REF",
          "정답지와 학생용 블록의 일치 여부를 확인하세요.",
          page,
          p.blockId,
        );
      seen.add(p.blockId);
      pageSeen.add(p.blockId);
      if (
        ![p.xMm, p.yMm, p.widthMm, p.heightMm].every(Number.isFinite) ||
        ![1, 2].includes(p.column) ||
        p.xMm < 0 ||
        p.xMm + p.widthMm > A4.widthMm ||
        p.heightMm <= 0 ||
        Math.abs(p.widthMm - blockWidthMm(config, b!)) > A4.toleranceMm ||
        p.yMm <
          textbookBodyTopMm(
            sections.find((section) =>
              section.blocks.some((block) => block.id === p.blockId),
            )!,
            b!,
          ) ||
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
  if (
    [...blocks.values()].some(
      (block) => !block.unitIntroPart && !seen.has(block.id),
    )
  )
    fail(
      "STUDENT_MISSING_BLOCK",
      "학생용 배치에서 누락된 원고 블록이 있습니다.",
    );
  for (const section of sections) {
    const alternatives = section.blocks.filter((block) => block.unitIntroPart);
    if (!alternatives.length) continue;
    const selected = alternatives
      .filter((block) => seen.has(block.id))
      .map((block) => block.unitIntroPart);
    if (
      !(selected.length === 1 && selected[0] === "single") &&
      !(
        selected.length === 2 &&
        selected.includes("left") &&
        selected.includes("right")
      )
    )
      fail(
        "STUDENT_INTRO_SELECTION",
        "학생용 단원 도입의 전체 내용 배치를 확인하세요.",
      );
  }
  return pageMap;
}
