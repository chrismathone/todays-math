import type {
  WorkbookAssignment,
  WorkbookAssignmentTarget,
  WorkbookGradeEvent,
  WorkbookKey,
  WorkbookSaveMarks,
} from "@/contracts/commercialWorkbook.contract";
import { fail } from "./errors";

/** No text comparator: arbitrary mathematical/proof keys require a teacher judgment. */
export function workbookGradingCapability(key: WorkbookKey | null) {
  return {
    mode: "manual" as const,
    automatic: false as const,
    reason:
      key === null
        ? ("missing-key" as const)
        : key.status !== "reviewed"
          ? ("unreviewed-key" as const)
          : ("display-only-key" as const),
  };
}
export function applyWorkbookMarks(
  assignment: WorkbookAssignment,
  input: WorkbookSaveMarks,
  event: Pick<WorkbookGradeEvent, "id" | "gradedAt" | "gradedBy">,
): WorkbookAssignmentTarget {
  const target = assignment.targets.find(
    (t) => t.studentId === input.studentId,
  );
  if (!target) fail("NOT_FOUND", "과제 대상 학생이 아닙니다.");
  if (target.revision !== input.expectedRevision)
    fail("STALE_REVISION", "다른 채점이 저장되었습니다. 다시 불러와 주세요.");
  const allowed = new Set(assignment.exercises.map((e) => e.id));
  if (input.marks.some((m) => !allowed.has(m.exerciseId)))
    fail("VALIDATION_ERROR", "과제에 없는 문항입니다.");
  const nextEvent: WorkbookGradeEvent = {
    ...event,
    requestId: input.requestId,
    revision: target.revision + 1,
    previousRevision: target.revision,
    marks: input.marks,
  };
  return {
    ...target,
    revision: nextEvent.revision,
    marks: {
      ...target.marks,
      ...Object.fromEntries(input.marks.map((m) => [m.exerciseId, m.mark])),
    },
    history: [...target.history, nextEvent],
  };
}
