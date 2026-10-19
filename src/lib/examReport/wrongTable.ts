import type { StudentExamReport } from "@/contracts/examReport.contract";
import { EXAM_REPORT_WRONG_TABLE_SINGLE_LIMIT } from "./settings";
import { recentExamHistory } from "./trend";

export type WrongTableLayout = readonly number[];

/** 높이의 단위는 호출 쪽에서 맞춘다. 행을 자르지 않고 첫 쪽이 비어도 순서를 보존한다. */
export function paginateWrongTableRows(
  heights: readonly number[],
  first: number,
  continuation: number,
): number[] {
  const counts = [0];
  let available = Math.max(0, first);
  for (const height of heights) {
    if (height > available && (counts.length === 1 || counts.at(-1)! > 0)) {
      counts.push(0);
      available = Math.max(0, continuation);
    }
    counts[counts.length - 1]++;
    available -= height;
  }
  return counts;
}

export const wrongTableColumns = (count: number): 1 | 2 =>
  count > EXAM_REPORT_WRONG_TABLE_SINGLE_LIMIT ? 2 : 1;

/** 최초 HTML의 보수적 추정치. 확정 전에는 같은 표의 실제 행 높이로 다시 배치한다. */
export function estimateWrongTableLayout(
  report: StudentExamReport,
  options: { note?: boolean; retry?: boolean; trend?: boolean },
): WrongTableLayout {
  const columns = wrongTableColumns(report.wrongQuestions.length);
  const lines = (text: string, width: number) =>
    text.split("\n").reduce((sum, line) => {
      const units = [...line].reduce(
        (length, char) => length + (char.codePointAt(0)! > 127 ? 1 : 0.65),
        0,
      );
      return sum + Math.max(1, Math.ceil((units * 3.175) / width));
    }, 0);
  const heights: number[] = [];
  for (let i = 0; i < report.wrongQuestions.length; i += columns) {
    const row = report.wrongQuestions.slice(i, i + columns);
    heights.push(
      3.1 +
        5.24 *
          Math.max(
            ...row.map((q) =>
              Math.max(
                lines(`${q.no}번`, columns === 2 ? 8 : 12),
                lines(q.unitName, columns === 2 ? 35 : 78),
                lines(q.typeLabel ?? "—", columns === 2 ? 35 : 78),
              ),
            ),
          ),
    );
  }
  const note =
    options.note !== false && report.teacherNote.trim()
      ? 16 + lines(report.teacherNote, 170) * 5.82
      : 0;
  const retry =
    options.retry !== false && report.retries.length
      ? 13 + report.retries.length * 5.6
      : 0;
  const trend =
    options.trend !== false && recentExamHistory(report.history).length
      ? 60
      : 0;
  return paginateWrongTableRows(heights, 145 - note - retry - trend, 210);
}
