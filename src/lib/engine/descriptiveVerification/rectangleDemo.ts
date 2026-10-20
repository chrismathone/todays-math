/** Independent oracle: no author, generator, helper, answer or facts imports. */
import type { NativePrintedProblem } from "../../../contracts/nativeDescriptive.contract";
import type { NativeVerification } from "./types";

export function verifyRectangleDemo({
  content,
  figureSpec,
}: NativePrintedProblem): NativeVerification {
  const q = content.replace(/\$/g, "");
  const match =
    /직사각형 모양의 (전시판|공지판).*둘레는 (\d+) cm이고 가로는 세로보다 (\d+) cm 길다/.exec(
      q,
    );
  if (
    !match ||
    !q.includes("가로와 세로의 길이를 각각 x cm, y cm") ||
    !q.includes("길이의 비율과 관계없는 개략도")
  )
    throw new Error("인쇄된 길이·단위·변수 조건 불완전");
  const perimeter = Number(match[2]),
    difference = Number(match[3]);
  if (perimeter <= 0 || difference <= 0 || perimeter > 1000)
    throw new Error("길이 범위 오류");
  // Search the positive integral pairs; do not reuse the author's elimination arithmetic.
  const candidates: [number, number][] = [];
  for (let w = 1; w < perimeter; w++)
    for (let h = 1; h < w; h++)
      if (w + h + w + h === perimeter && w - h === difference)
        candidates.push([w, h]);
  if (candidates.length !== 1)
    throw new Error("원조건을 만족하는 두 길이가 유일하지 않음");
  const [w, h] = candidates[0]!;
  // Check every visible edge and dimension in this deliberately narrow diagram grammar.
  const expected = {
    version: 2,
    points: { A: [0, 0], B: [160, 0], C: [160, 90], D: [0, 90] },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
    },
    dimensions: {
      width: { points: ["A", "B"], label: "x cm" },
      height: { points: ["B", "C"], label: "y cm" },
    },
  };
  if (JSON.stringify(figureSpec) !== JSON.stringify(expected))
    throw new Error("인쇄 그림의 변·라벨·직사각형 조건 불일치");
  let area = 0;
  for (let row = 0; row < h!; row++) area += w!;
  const sum = w! + h!;
  return {
    derived: [
      {
        factKey: "perimeter",
        kind: "given",
        value: String(perimeter),
        unit: "cm",
      },
      {
        factKey: "difference",
        kind: "given",
        value: String(difference),
        unit: "cm",
      },
      {
        factKey: "model",
        kind: "intermediate",
        value: `x+y=${sum};x-y=${difference}`,
      },
      {
        factKey: "lengths",
        kind: "intermediate",
        value: `${w},${h}`,
        unit: "cm",
      },
      { factKey: "area", kind: "answer", value: String(area), unit: "cm²" },
    ],
    criterionChecks: [
      {
        criterionId: "model",
        expectedContains: [`x+y=${sum}`, `x-y=${difference}`],
        modelContains: [`x+y=${sum}`, `x-y=${difference}`],
      },
      {
        criterionId: "lengths",
        expectedContains: [`2x=${2 * w!}`, `x=${w}`, `y=${h}`],
        modelContains: [`2x=${2 * w!}`, `x=${w}`, `y=${h}`],
      },
      {
        criterionId: "area",
        expectedContains: [
          `2(${w}+${h})=${perimeter}`,
          `${w}-${h}=${difference}`,
          `${w}\\times${h}=${area}`,
          "cm²",
        ],
        modelContains: [
          `2(${w}+${h})=${perimeter}`,
          `${w}-${h}=${difference}`,
          `${w}\\times${h}=${area}`,
          "cm²",
        ],
        answerContains: [`${area} cm²`],
      },
    ],
    coverage: {
      lengthPair: `${w},${h}`,
      context: match[1]!,
      pairContext: `${w},${h}:${match[1]}`,
    },
  };
}
