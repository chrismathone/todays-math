import type { NativeDescriptiveProblemR2 } from "@/contracts/nativeDescriptive.contract";

/** Render-only payload from the primary author's assembled r2 result. No storage schema. */
export type NativeDescriptivePrint = Pick<
  NativeDescriptiveProblemR2,
  "rubric" | "requirements" | "modelAnswer"
>;
export type DescriptivePrintItem = {
  number: number;
  data: NativeDescriptivePrint;
};

export function toNativeDescriptivePrint(
  problem: NativeDescriptiveProblemR2,
): NativeDescriptivePrint {
  return {
    rubric: problem.rubric,
    requirements: problem.requirements,
    modelAnswer: problem.modelAnswer,
  };
}

/** Confirmed B: 8mm rows, 2 rows/criterion (whole), 3 (split).
 * Reserve one first-part row for the final part: 3 criteria → 2/3/4 rows.
 * This is a paper allowance, not a score weighting or a handwriting measurement.
 */
export function descriptiveWritingLayout(data: NativeDescriptivePrint) {
  const split = data.requirements.length > 1;
  const lineHeightMm = 8;
  const rows = data.rubric.criteria.length * (split ? 3 : 2);
  if (!split) return { heightMm: rows * lineHeightMm, lineHeightMm };
  const counts = data.requirements.map(
    (requirement) =>
      data.rubric.criteria.filter(
        (c) => c.requirementId === requirement.requirementId,
      ).length,
  );
  const sections = counts.map((count, i) => ({
    label: i < 20 ? String.fromCodePoint(0x2474 + i) : `(${i + 1})`,
    heightMm:
      (count * 3 - (i === 0 ? 1 : 0) + (i === counts.length - 1 ? 1 : 0)) *
      lineHeightMm,
  }));
  return { heightMm: rows * lineHeightMm, lineHeightMm, sections };
}
