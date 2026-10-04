import type { CourseRosterStudent } from "@/contracts/mathSrsCourse.contract";
export const enrollmentKey = (
  row: Pick<CourseRosterStudent, "id" | "classId">,
) => `${row.classId}:${row.id}`;
export function sharedCourseState(
  row: CourseRosterStudent,
  update: CourseRosterStudent,
) {
  return row.id === update.id && row.revision <= update.revision
    ? {
        ...row,
        plan: update.plan,
        summary: update.summary,
        revision: update.revision,
        hasAccount: update.hasAccount,
      }
    : row;
}
export function courseTargets(rows: CourseRosterStudent[]) {
  const unique = new Map(rows.map((row) => [row.id, row]));
  const primary = new Set(
    rows
      .filter((row) => /^초[3-6]$/.test(row.classGrade ?? ""))
      .map((row) => row.id),
  );
  const supplementary = [...unique.values()].filter(
    (row) => !primary.has(row.id),
  );
  return {
    unique: [...unique.values()],
    primary,
    supplementary,
    setup: [...unique.values()].filter(
      (row) => primary.has(row.id) && !row.plan,
    ),
    target: [...unique.values()].filter(
      (row) => primary.has(row.id) || row.plan,
    ),
  };
}
