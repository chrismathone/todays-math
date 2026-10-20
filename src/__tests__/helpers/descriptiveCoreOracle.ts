import type { NativePrintedProblem } from "../../contracts/nativeDescriptive.contract";
import type { NativeVerification } from "../../lib/engine/descriptiveVerification/types";

/** Test-only oracle: reconstructs the line from the two printed point labels. */
export function verifyCoreFixture(
  printed: NativePrintedProblem,
): NativeVerification {
  const marks = printed.figureSpec?.marks as number[][];
  const target = /x=(-?\d+)에서/.exec(printed.content);
  const unit = /단위는 (cm|m)입니다/.exec(printed.content)?.[1];
  if (!Array.isArray(marks) || marks.length !== 2 || !target || !unit)
    throw new Error("발문·그래프 읽기 실패");
  const [[x1, y1], [x2, y2]] = marks;
  if (![x1, y1, x2, y2].every(Number.isFinite) || x1 === x2)
    throw new Error("그래프 점 조건 오류");
  const slope = (y2! - y1!) / (x2! - x1!),
    base = y1! - slope * x1!;
  const height = base + 2 * slope,
    result = base + Number(target[1]) * slope;
  return {
    derived: [
      { factKey: "points", kind: "given", value: `${y1},${y2}` },
      { factKey: "base", kind: "intermediate", value: String(base), unit },
      { factKey: "height", kind: "intermediate", value: String(height), unit },
      { factKey: "result", kind: "answer", value: String(result), unit },
    ],
    criterionChecks: [
      {
        criterionId: "base",
        expectedContains: [`절편 ${base}`],
        modelContains: [`절편은 ${base}`],
      },
      {
        criterionId: "height",
        expectedContains: [`대입값 ${height}`],
        modelContains: [`대입값은 ${height}`],
      },
      {
        criterionId: "result",
        expectedContains: [`결과 ${result} ${unit}`],
        modelContains: [`결과는 ${result} ${unit}`],
        answerContains: [`${result} ${unit}`],
      },
    ],
    coverage: { width: String(base), branch: slope > 0 ? "up" : "down" },
  };
}
