import type {
  ClassExamReport,
  StudentExamReport,
} from "@/contracts/examReport.contract";
import { recentExamHistory } from "./trend";

export const BLOCK_IDS = [
  "score",
  "correctCount",
  "markGrid",
  "wrongTable",
  "trend",
  "classAverage",
  "retries",
  "reviewUnits",
  "teacherNote",
  "academyHeader",
  "footer",
] as const;
export type BlockId = (typeof BLOCK_IDS)[number];

export const REPORT_BLOCK_PRESETS = {
  summary: [
    "academyHeader",
    "teacherNote",
    "score",
    "correctCount",
    "wrongTable",
    "trend",
    "classAverage",
    "retries",
    "footer",
  ],
  numbers: ["academyHeader", "score", "correctCount", "classAverage", "footer"],
} as const satisfies Record<string, readonly BlockId[]>;

export interface ReportBlockOptions {
  blocks?: readonly BlockId[];
  header?: { name: string; line?: string };
  footer?: string;
  wrong?: boolean;
  retry?: boolean;
  note?: boolean;
  trend?: boolean;
  average?: Pick<
    ClassExamReport["rollup"],
    "averageScore" | "gradedCount"
  > | null;
}
export interface BlockMeasure {
  /** 단독 블록의 전체 높이. 표는 반복할 표제·열 머리의 높이(mm). */
  heightMm: number;
  /** 표만 행 경계에서 이어진다. */
  rowsMm?: readonly number[];
}
export interface PlannedBlock {
  id: BlockId;
  instance: number;
  from: number;
  to: number;
  continued: boolean;
  heightMm: number;
}
export interface PlannedReportPage {
  blocks: PlannedBlock[];
  usedMm: number;
}

/** 한 회차의 단원별 그래프·백분율은 만들지 않고 단원 이름만 고른다. 동률은 출제 순서다. */
export function reviewUnits(report: StudentExamReport): string[] {
  if (report.status !== "graded") return [];
  const units = new Map<
    string,
    { right: number; total: number; order: number }
  >();
  for (const q of report.questions) {
    if (q.isCorrect === null) continue;
    const value = units.get(q.unitName) ?? {
      right: 0,
      total: 0,
      order: units.size,
    };
    value.total++;
    if (q.isCorrect) value.right++;
    units.set(q.unitName, value);
  }
  return [...units]
    .filter(([, v]) => v.right < v.total)
    .sort(
      ([, a], [, b]) =>
        a.right * b.total - b.right * a.total || a.order - b.order,
    )
    .slice(0, 3)
    .map(([name]) => name);
}

/**
 * 모든 스타일에 같은 선택·순서·쪽 나누기를 적용한다. 치수만 스타일이 낸다.
 * 표 이외는 나누지 않는다. 표의 다음 쪽에도 표제·열 머리 높이를 확보한다.
 * 한 쪽보다 큰 블록·한 행은 내용을 생략하지 않고 사유를 담아 실패한다.
 */
export function planReportBlocks(
  report: StudentExamReport,
  options: ReportBlockOptions,
  measure: (id: BlockId) => BlockMeasure,
  { capacityMm = 225, gapMm = 3 }: { capacityMm?: number; gapMm?: number } = {},
): PlannedReportPage[] {
  if (
    !Number.isFinite(capacityMm) ||
    capacityMm <= 0 ||
    !Number.isFinite(gapMm) ||
    gapMm < 0
  )
    throw new Error("지면 치수가 올바르지 않습니다.");
  const visible = (id: BlockId) => {
    if (id === "wrongTable" && options.wrong === false) return false;
    if (
      id === "teacherNote" &&
      (options.note === false || !report.teacherNote.trim())
    )
      return false;
    if (id === "retries" && (options.retry === false || !report.retries.length))
      return false;
    if (
      id === "trend" &&
      (options.trend === false || !recentExamHistory(report.history).length)
    )
      return false;
    if (
      id === "classAverage" &&
      (options.average?.averageScore == null || options.average.gradedCount < 1)
    )
      return false;
    if (id === "reviewUnits" && !reviewUnits(report).length) return false;
    if (id === "footer" && !options.footer?.trim()) return false;
    if (
      id === "academyHeader" &&
      !options.header?.name.trim() &&
      !options.header?.line?.trim()
    )
      return false;
    return true;
  };
  const pages: PlannedReportPage[] = [];
  let page: PlannedReportPage = { blocks: [], usedMm: 0 };
  const next = () => {
    if (page.blocks.length) pages.push(page);
    page = { blocks: [], usedMm: 0 };
  };
  const remaining = () =>
    capacityMm - page.usedMm - (page.blocks.length ? gapMm : 0);
  const append = (block: PlannedBlock) => {
    page.usedMm += (page.blocks.length ? gapMm : 0) + block.heightMm;
    page.blocks.push(block);
  };
  for (const [instance, id] of (
    options.blocks ?? REPORT_BLOCK_PRESETS.summary
  ).entries()) {
    if (!visible(id)) continue;
    const { heightMm, rowsMm } = measure(id);
    if (rowsMm && id !== "wrongTable")
      throw new Error(`${id}: 표 이외의 블록은 쪼갤 수 없습니다.`);
    if (
      ![heightMm, ...(rowsMm ?? [])].every((n) => Number.isFinite(n) && n > 0)
    )
      throw new Error(`${id}: 블록 치수가 올바르지 않습니다.`);
    if (
      heightMm > capacityMm ||
      rowsMm?.some((row) => row + heightMm > capacityMm)
    )
      throw new Error(`${id}: 블록 또는 표의 한 행이 한 쪽보다 깁니다.`);
    if (rowsMm?.length) {
      let from = 0;
      while (from < rowsMm.length) {
        if (heightMm + rowsMm[from] > remaining()) next();
        let to = from;
        let used = heightMm;
        while (to < rowsMm.length && used + rowsMm[to] <= remaining())
          used += rowsMm[to++];
        append({ id, instance, from, to, continued: from > 0, heightMm: used });
        from = to;
        if (from < rowsMm.length) next();
      }
    } else {
      if (heightMm > remaining()) next();
      append({ id, instance, from: 0, to: 1, continued: false, heightMm });
    }
  }
  next();
  return pages;
}
