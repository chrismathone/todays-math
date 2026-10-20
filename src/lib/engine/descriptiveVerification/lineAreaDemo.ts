/** C06 oracle: only printed equations and the visible graph, never author/helper facts. */
import type { NativePrintedProblem } from "../../../contracts/nativeDescriptive.contract";
import type { NativeVerification } from "./types";

export function verifyLineAreaDemo({
  content,
  figureSpec,
}: NativePrintedProblem): NativeVerification {
  const rows = content.replace(/\$/g, "").split("\n");
  const match =
    /^그림의 두 직선 l: (-?\d*)x-y=(-?\d+), m: (-?\d*)x-y=(-?\d+)와 y축으로 둘러싸인 삼각형을 생각하자. 두 좌표축에서 눈금 한 칸의 길이는 1 cm이다. A, B는 각각 l, m과 y축의 교점이고 P는 두 직선의 교점이다\.$/.exec(
      rows[0] ?? "",
    );
  // Deliberately narrow print grammar: changed axes, units or unasked evidence fail closed.
  if (
    !match ||
    rows.length !== 4 ||
    rows[1] !==
      "(1) y축 위의 점이 만족하는 좌표 조건을 쓰고, 이를 각 직선의 식에 대입하여 A, B의 좌표를 구하시오." ||
    rows[2] !==
      "(2) 두 직선의 식을 연립하여 푸는 과정을 보이고 P의 좌표를 구한 뒤, 두 식에 각각 대입하여 확인하시오." ||
    rows[3] !==
      "(3) 선분 AB를 밑변으로 할 때 밑변과 높이의 길이를 구하고, 좌표의 차와 축에 수직인 거리를 이용하는 이유를 설명하시오. 삼각형의 넓이를 계산 과정 및 단위와 함께 쓰시오."
  )
    throw new Error("인쇄된 직선·축·단위·요구 조건 불완전");
  const coefficient = (s: string) =>
    s === "" ? 1 : s === "-" ? -1 : Number(s);
  const a = coefficient(match[1]!),
    c = Number(match[2]),
    d = coefficient(match[3]!),
    e = Number(match[4]);
  if (
    ![a, c, d, e].every(Number.isSafeInteger) ||
    !a ||
    !d ||
    a === d ||
    Math.abs(a) > 3 ||
    Math.abs(d) > 3 ||
    !c ||
    !e ||
    Math.abs(c) > 5 ||
    Math.abs(e) > 5
  )
    throw new Error("두 직선의 범위 또는 유일성 오류");

  // Enumerate solutions of the printed equations, rather than reusing the author's
  // slope-intercept subtraction. Intercepts are independently found at x = 0.
  const axisA: number[] = [],
    axisB: number[] = [];
  const intersections: [number, number][] = [];
  for (let y = -20; y <= 20; y++) {
    if (-y === c) axisA.push(y);
    if (-y === e) axisB.push(y);
    for (let x = -20; x <= 20; x++)
      if (a * x - y === c && d * x - y === e) intersections.push([x, y]);
  }
  if (axisA.length !== 1 || axisB.length !== 1 || intersections.length !== 1)
    throw new Error("축교점 또는 두 직선의 교점이 유일하지 않음");
  const b1 = axisA[0]!,
    b2 = axisB[0]!,
    [x, y] = intersections[0]!;
  if (!x || Math.abs(x) > 3 || Math.abs(y) > 3 || b1 === b2)
    throw new Error("삼각형의 퇴화 또는 교점 범위 오류");

  // Every figure field is print-affecting; unknown labels/marks must not pass silently.
  const expectedFigure = {
    version: "elem-1",
    kind: "linearGraph",
    lines: [
      { slope: a, yIntercept: b1, label: "l" },
      { slope: d, yIntercept: b2, label: "m" },
    ],
    xRange: [Math.min(-1, x) - 1, Math.max(1, x) + 1],
    yRange: [Math.min(-1, b1, b2, y) - 1, Math.max(1, b1, b2, y) + 1],
    marks: [],
  };
  if (JSON.stringify(figureSpec) !== JSON.stringify(expectedFigure))
    throw new Error("인쇄 그림의 직선·라벨·범위·좌표답 노출 불일치");

  const base = Math.max(b1, b2) - Math.min(b1, b2);
  const height = x < 0 ? -x : x;
  // Signed shoelace area of A(0,b1), B(0,b2), P(x,y), a different route from base×height.
  const area = Math.abs(0 * b2 + 0 * y + x * b1 - b1 * 0 - b2 * x - y * 0) / 2;
  if (!Number.isSafeInteger(area) || area <= 0)
    throw new Error("삼각형 넓이 범위 오류");
  const axisProof = ["x=0", `-y=${c}`, `A(0,${b1})`, `-y=${e}`, `B(0,${b2})`];
  const intersectionProof = [
    `${a - d === 1 ? "" : a - d === -1 ? "-" : a - d}x=${c - e}`,
    `x=${x}`,
    `y=${y}`,
    `P(${x},${y})`,
    `${a}\\times(${x})-(${y})=${c}`,
    `${d}\\times(${x})-(${y})=${e}`,
  ];
  const lengthsProof = [
    `AB=|(${b1})-(${b2})|=${base} cm`,
    `h=|${x}|=${height} cm`,
    "y좌표",
    "y축",
    "수평",
    "수직",
  ];
  const areaProof = [
    `S=\\dfrac{1}{2}\\times${base}\\times${height}=${area}`,
    "cm²",
  ];
  return {
    derived: [
      { factKey: "equations", kind: "given", value: `${a},${c};${d},${e}` },
      { factKey: "scale", kind: "given", value: "1", unit: "cm" },
      { factKey: "axis", kind: "intermediate", value: `${b1},${b2}` },
      { factKey: "intersection", kind: "intermediate", value: `${x},${y}` },
      {
        factKey: "lengths",
        kind: "intermediate",
        value: `${base},${height}`,
        unit: "cm",
      },
      { factKey: "area", kind: "answer", value: String(area), unit: "cm²" },
    ],
    criterionChecks: [
      {
        criterionId: "axis",
        expectedContains: axisProof,
        modelContains: axisProof,
      },
      {
        criterionId: "intersection",
        expectedContains: intersectionProof,
        modelContains: intersectionProof,
      },
      {
        criterionId: "lengths",
        expectedContains: lengthsProof,
        modelContains: lengthsProof,
      },
      {
        criterionId: "area",
        expectedContains: areaProof,
        modelContains: areaProof,
        answerContains: [`${area} cm²`],
      },
    ],
    coverage: {
      linePair: `${a},${b1},${d},${b2}`,
      x: String(x),
      y: String(y),
      interceptSigns:
        b1 * b2 < 0 ? "opposite" : b1 > 0 ? "positive" : "negative",
      interceptOrder: b1 < b2 ? "ascending" : "descending",
      slopeSigns: a * d < 0 ? "opposite" : a > 0 ? "positive" : "negative",
      area: String(area),
    },
  };
}
