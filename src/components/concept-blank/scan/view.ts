import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";

/** Display identity belongs to the frozen page/slot order, never the current uncertainty filter. */
export function scanNumbers(view: ScanSubmissionView) {
  return new Map(
    view.snapshot.pages
      .flatMap((page) => page.slots)
      .map((slot, i) => [slot.id, i + 1]),
  );
}
export function latestScanGrades(view: ScanSubmissionView) {
  const latest = new Map<string, ScanSubmissionView["grades"][number]>();
  for (const grade of view.grades) {
    if ((latest.get(grade.targetId)?.sequence ?? -1) < grade.sequence)
      latest.set(grade.targetId, grade);
  }
  return [...latest.values()].sort(
    (a, b) =>
      a.page - b.page ||
      (view.snapshot.pages
        .find((p) => p.number === a.page)
        ?.slots.findIndex((s) => a.slotIds.includes(s.id)) ?? 0) -
        (view.snapshot.pages
          .find((p) => p.number === b.page)
          ?.slots.findIndex((s) => b.slotIds.includes(s.id)) ?? 0),
  );
}
export const scanIsPublished = (view: ScanSubmissionView) =>
  view.state === "graded" || view.state === "teacher-corrected";
