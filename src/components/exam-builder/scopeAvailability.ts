import type { ExamScope } from "./types";

/** Unknown inventory can be used only by sources that do not require a count. */
export function canSelectScope(
  scope: Pick<ExamScope, "count"> | undefined,
  requireCount = false,
): boolean {
  if (!scope) return false;
  if (scope.count === undefined) return !requireCount;
  return Number.isSafeInteger(scope.count) && scope.count > 0;
}
