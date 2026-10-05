import type { RenderBlock, RenderSection } from "../render/model";
import type { BlockPlacement, TextbookPage } from "./paginate";

/** All lengths are unrounded millimetres measured at the native base line count. */
export interface SourceWritingSpaceMeasurement {
  blockId: string;
  questionHeightMm: number;
  /** Work top minus question top, including the original work margin. */
  workOffsetMm: number;
  paddingBottomMm: number;
  borderBottomMm: number;
  workMarginTopMm: number;
  /** Actual DOM line count; never a layout default or inferred height. */
  baseLines: number;
}

export interface SourceWritingPageMeasurement {
  physicalPageIndex: number;
  /** Bottom of the authored content, including trailing body after the grid. */
  contentBottomMm: number;
  /** Top of .page-end-note, or .foot when absent; normally 270mm. */
  stopTopMm?: number;
  /** First direct .content > :is(.question-grid,.reason-grid); null means none. */
  gridKind: "question-grid" | "reason-grid" | null;
  /** Direct question children with work, in native DOM order, from that grid only. */
  gridBlockIds: readonly string[];
  /** All grid children, including children without work; native spread matching uses this. */
  gridChildCount: number;
  hasDailyBanner: boolean;
}

export interface SourceWritingSpaceAssignment {
  blockId: string;
  physicalPageIndex: number;
  lines: number;
  slackMm: number;
  /** Original work margin plus slack; set on the work area, not on each line. */
  marginTopMm: number;
  yMm: number;
  heightMm: number;
}
export interface SourceWritingPlacementAssignment {
  blockId: string;
  physicalPageIndex: number;
  yMm: number;
  heightMm: number;
}
export interface SourceWritingSpacePlan {
  work: SourceWritingSpaceAssignment[];
  /** Grid questions and any following authored placements whose row moved. */
  placements: SourceWritingPlacementAssignment[];
}

export const SOURCE_WRITING_PITCH_MM = 7;
export const SOURCE_WRITING_STOP_GAP_MM = (8 * 25.4) / 96;
// Native cap and line-floor tolerance is .1 CSS px, not .1mm.
const NATIVE_TOLERANCE_MM = (0.1 * 25.4) / 96;
const GEOMETRY_EPSILON_MM = 1e-7;
const SOURCE_KINDS = new Set(["exercise", "typepage", "reasoning", "practice"]);
type Problem = Extract<RenderBlock, { kind: "problem" }>;
interface Grid {
  page: TextbookPage;
  measurement: SourceWritingPageMeasurement;
  source: NonNullable<NonNullable<Problem["semantic"]>["source"]>;
  items: Array<{
    block: Problem;
    placement: BlockPlacement;
    metric: SourceWritingSpaceMeasurement;
  }>;
}
interface Row {
  items: Array<Grid["items"][number] & { pageIndex: number }>;
  localTop: number[];
  localHeight: number[];
  height: number;
  cap: number;
  extra: number;
}

function fail(message: string): never {
  throw new Error(`SOURCE_WRITING_SPACE: ${message}`);
}
function eligible(block: RenderBlock | undefined): block is Problem {
  return Boolean(
    block?.kind === "problem" &&
    block.semantic?.source &&
    SOURCE_KINDS.has(block.semantic.source.kind) &&
    block.semantic.node?.kind !== "exampleGroup" &&
    block.answer === undefined &&
    !block.publicWorkedExample &&
    block.learningStage !== "worked-example",
  );
}
function fixed(metric: SourceWritingSpaceMeasurement): number {
  return metric.workOffsetMm + metric.paddingBottomMm + metric.borderBottomMm;
}
function matches(left: Grid, right: Grid | undefined): right is Grid {
  return Boolean(
    right &&
    left.page.physicalPageIndex % 2 === 0 &&
    right.page.physicalPageIndex === left.page.physicalPageIndex + 1 &&
    left.source.kind === "exercise" &&
    right.source.kind === "exercise" &&
    left.source.unit === right.source.unit &&
    (left.source.sectionName ?? "") === (right.source.sectionName ?? "") &&
    left.measurement.gridChildCount === right.measurement.gridChildCount &&
    left.measurement.gridChildCount % 2 === 0 &&
    left.measurement.hasDailyBanner === right.measurement.hasDailyBanner,
  );
}

/**
 * Pure native v15 writing allocation over a bounded, already measured page layout.
 * The caller supplies the first native direct grid explicitly; paired/types/drill
 * grids, answers, public examples and source-absent bank problems are never inferred.
 * Measure after heading/prompt alignment. Apply returned transient assignments to
 * a render copy only; stored layouts, IDs, content, page membership and widths stay intact.
 * Explicit zero-base work is preserved, a deliberate legacy compatibility boundary.
 */
export function allocateSourceWritingSpace(
  sections: readonly RenderSection[],
  pages: readonly TextbookPage[],
  measurements: readonly SourceWritingSpaceMeasurement[],
  pageMeasurements: readonly SourceWritingPageMeasurement[] = [],
): SourceWritingSpacePlan {
  const blocks = sections.flatMap((section) => section.blocks);
  if (
    sections.length > 8 ||
    blocks.length > 600 ||
    pages.length > 32 ||
    measurements.length > 600 ||
    pageMeasurements.length > 32
  )
    fail("exceeds 8 sections, 600 blocks or 32 pages");
  const byId = new Map(blocks.map((block) => [block.id, block]));
  const metrics = new Map(
    measurements.map((metric) => [metric.blockId, metric]),
  );
  const pageMetrics = new Map(
    pageMeasurements.map((metric) => [metric.physicalPageIndex, metric]),
  );
  if (
    byId.size !== blocks.length ||
    metrics.size !== measurements.length ||
    pageMetrics.size !== pageMeasurements.length
  )
    fail("duplicate block or measurement identity");
  const grids: Array<Grid | undefined> = pages.map((page) => {
    if (
      page.kind !== "content" ||
      !page.blocks.some((placement) => eligible(byId.get(placement.blockId)))
    )
      return undefined;
    const measurement = pageMetrics.get(page.physicalPageIndex);
    if (!measurement)
      fail(`missing first-grid measurement for page ${page.physicalPageIndex}`);
    if (
      !Number.isSafeInteger(page.physicalPageIndex) ||
      page.physicalPageIndex < 1 ||
      !Number.isFinite(measurement.contentBottomMm) ||
      !Number.isFinite(measurement.stopTopMm ?? 270)
    )
      fail(`invalid page geometry for page ${page.physicalPageIndex}`);
    if (
      !["question-grid", "reason-grid", null].includes(measurement.gridKind) ||
      !Number.isSafeInteger(measurement.gridChildCount) ||
      measurement.gridChildCount < measurement.gridBlockIds.length ||
      measurement.gridChildCount > 600 ||
      typeof measurement.hasDailyBanner !== "boolean" ||
      new Set(measurement.gridBlockIds).size !== measurement.gridBlockIds.length
    )
      fail(`invalid first-grid membership for page ${page.physicalPageIndex}`);
    if (measurement.gridKind === null) {
      if (measurement.gridBlockIds.length || measurement.gridChildCount)
        fail("absent grid has children");
      return undefined;
    }
    if (!measurement.gridBlockIds.length) return undefined;
    const placements = new Map(
      page.blocks.map((placement) => [placement.blockId, placement]),
    );
    const members = measurement.gridBlockIds.map((id) => {
      const block = byId.get(id),
        placement = placements.get(id);
      if (!block || !placement)
        fail(`grid block ${id} is missing from its actual page`);
      return { block, placement };
    });
    // An explicitly excluded group is kept intact, even if a malformed plan names it.
    if (members.some(({ block }) => !eligible(block))) return undefined;
    const source = members[0].block.semantic!.source!;
    if (
      members.some(
        ({ block }) =>
          block.semantic!.source!.kind !== source.kind ||
          block.semantic!.source!.unit !== source.unit ||
          (block.semantic!.source!.sectionName ?? "") !==
            (source.sectionName ?? ""),
      )
    )
      fail("first grid mixes native source identities");
    const items = members.map(({ block, placement }) => {
      const metric = metrics.get(block.id);
      if (!metric) fail(`missing base work measurement for ${block.id}`);
      if (
        ![
          metric.questionHeightMm,
          metric.workOffsetMm,
          metric.paddingBottomMm,
          metric.borderBottomMm,
          metric.workMarginTopMm,
          placement.yMm,
          placement.heightMm,
        ].every(Number.isFinite) ||
        metric.questionHeightMm <= 0 ||
        placement.heightMm <= 0 ||
        metric.workOffsetMm < 0 ||
        metric.paddingBottomMm < 0 ||
        metric.borderBottomMm < 0 ||
        !Number.isSafeInteger(metric.baseLines) ||
        metric.baseLines < 0
      )
        fail(`invalid base work geometry for ${block.id}`);
      if (
        fixed(metric) + metric.baseLines * SOURCE_WRITING_PITCH_MM >
        Math.max(metric.questionHeightMm, placement.heightMm) +
          NATIVE_TOLERANCE_MM
      )
        fail(`base work exceeds measured question ${block.id}`);
      return { block: block as Problem, placement, metric };
    });
    // Never manufacture work for explicit zero-line questions or stretch their slots.
    if (items.some((item) => item.metric.baseLines === 0)) return undefined;
    return { page, measurement, source, items };
  });
  const result: SourceWritingSpacePlan = { work: [], placements: [] };
  for (let index = 0; index < grids.length; index++) {
    const first = grids[index];
    if (!first) continue;
    const next = grids[index + 1];
    const group = matches(first, next) ? [first, next] : [first];
    if (group.length === 2) index++;
    // Native filters children with work before slicing rows. Unequal filtered sets
    // have no finite spread equalization; make the missing contract visible.
    if (group.some((grid) => grid.items.length !== first.items.length))
      fail("matching spread has unequal measured work sets");
    const cols = first.measurement.gridKind === "reason-grid" ? 1 : 2;
    const rows: Row[] = [];
    for (let itemIndex = 0; itemIndex < first.items.length; itemIndex += cols) {
      const local = group.map((grid) =>
        grid.items.slice(itemIndex, itemIndex + cols),
      );
      const localHeight = local.map((items) =>
        Math.max(
          ...items.flatMap((item) => [
            item.metric.questionHeightMm,
            item.placement.heightMm,
          ]),
        ),
      );
      const localTop = local.map((items) =>
        Math.min(...items.map((item) => item.placement.yMm)),
      );
      if (
        local.some((items, pageIndex) =>
          items.some(
            (item) =>
              Math.abs(item.placement.yMm - localTop[pageIndex]) >
              NATIVE_TOLERANCE_MM,
          ),
        )
      )
        fail("native grid row occupies different placement tops");
      const items = local.flatMap((members, pageIndex) =>
        members.map((item) => ({ ...item, pageIndex })),
      );
      const height = Math.max(...localHeight);
      const cap = Math.max(
        height,
        ...items.map(
          (item) =>
            fixed(item.metric) +
            Math.max(
              item.metric.baseLines,
              item.block.questionType === "reason" ? 8 : 6,
            ) *
              SOURCE_WRITING_PITCH_MM,
        ),
      );
      rows.push({ items, localTop, localHeight, height, cap, extra: 0 });
    }
    const commonTop = Math.max(...rows[0].localTop);
    const topShift = group.map(
      (_, pageIndex) => commonTop - rows[0].localTop[pageIndex],
    );
    const equalization = group.map((_, pageIndex) =>
      rows.reduce(
        (sum, row) => sum + row.height - row.localHeight[pageIndex],
        topShift[pageIndex],
      ),
    );
    const stops = group.map(
      (grid) =>
        (grid.measurement.stopTopMm ?? 270) - SOURCE_WRITING_STOP_GAP_MM,
    );
    let budget = Math.min(
      ...group.map((grid, pageIndex) =>
        Math.max(
          0,
          stops[pageIndex] -
            grid.measurement.contentBottomMm -
            equalization[pageIndex],
        ),
      ),
    );
    // Stable ties give native round-robin row order; no fractional added line.
    while (budget >= SOURCE_WRITING_PITCH_MM) {
      let chosen: Row | undefined;
      for (const row of rows)
        if (
          row.height + SOURCE_WRITING_PITCH_MM <=
            row.cap + NATIVE_TOLERANCE_MM &&
          (!chosen || row.extra < chosen.extra)
        )
          chosen = row;
      if (!chosen) break;
      chosen.height += SOURCE_WRITING_PITCH_MM;
      chosen.extra++;
      budget -= SOURCE_WRITING_PITCH_MM;
    }
    const totalShift = group.map((_, pageIndex) =>
      rows.reduce(
        (sum, row) => sum + row.height - row.localHeight[pageIndex],
        topShift[pageIndex],
      ),
    );
    group.forEach((grid, pageIndex) => {
      // A negative native budget adds no lines. Equalization must still fit; it
      // never licenses clipping, content removal, smaller fonts or a new page.
      if (
        equalization[pageIndex] > GEOMETRY_EPSILON_MM &&
        grid.measurement.contentBottomMm + totalShift[pageIndex] >
          stops[pageIndex] + NATIVE_TOLERANCE_MM
      )
        fail(
          `row equalization exceeds native stop on page ${grid.page.physicalPageIndex}`,
        );
      if (
        totalShift[pageIndex] > equalization[pageIndex] + GEOMETRY_EPSILON_MM &&
        grid.measurement.contentBottomMm + totalShift[pageIndex] >
          stops[pageIndex] + NATIVE_TOLERANCE_MM
      )
        fail(
          `writing allocation exceeds native stop on page ${grid.page.physicalPageIndex}`,
        );
      const gridIds = new Set(grid.items.map((item) => item.block.id));
      let shift = topShift[pageIndex];
      for (const row of rows) {
        for (const item of row.items.filter(
          (candidate) => candidate.pageIndex === pageIndex,
        )) {
          const offset = fixed(item.metric);
          const lines = Math.max(
            item.metric.baseLines,
            Math.floor(
              (row.height - offset + NATIVE_TOLERANCE_MM) /
                SOURCE_WRITING_PITCH_MM,
            ),
          );
          const slackMm = Math.max(
            0,
            row.height - offset - lines * SOURCE_WRITING_PITCH_MM,
          );
          const yMm = row.localTop[pageIndex] + shift;
          result.work.push({
            blockId: item.block.id,
            physicalPageIndex: grid.page.physicalPageIndex,
            lines,
            slackMm,
            marginTopMm: item.metric.workMarginTopMm + slackMm,
            yMm,
            heightMm: row.height,
          });
          result.placements.push({
            blockId: item.block.id,
            physicalPageIndex: grid.page.physicalPageIndex,
            yMm,
            heightMm: row.height,
          });
        }
        shift += row.height - row.localHeight[pageIndex];
      }
      const last = rows[rows.length - 1];
      const gridBottom = last.localTop[pageIndex] + last.localHeight[pageIndex];
      for (const placement of grid.page.blocks)
        if (
          !gridIds.has(placement.blockId) &&
          placement.yMm >= gridBottom - GEOMETRY_EPSILON_MM &&
          totalShift[pageIndex] > GEOMETRY_EPSILON_MM
        )
          result.placements.push({
            blockId: placement.blockId,
            physicalPageIndex: grid.page.physicalPageIndex,
            yMm: placement.yMm + totalShift[pageIndex],
            heightMm: placement.heightMm,
          });
    });
  }
  return result;
}
