import { insist } from "./support";

type Point = readonly [number, number];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const square = (a: Point) => dot(a, a);
function eq(a: number, b: number, message: string) {
  insist(
    Number.isFinite(a) &&
      Number.isFinite(b) &&
      Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b)),
    message,
  );
}
function record(value: unknown): Record<string, unknown> {
  insist(
    value && typeof value === "object" && !Array.isArray(value),
    "벡터 객체 누락",
  );
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[]) {
  insist(
    Object.keys(value).sort().join("|") === expected.sort().join("|"),
    "검토한 도형 요소 밖의 추가·누락",
  );
}
function endpoints(raw: unknown, a: string, b: string) {
  insist(
    Array.isArray(raw) &&
      raw.length === 2 &&
      ((raw[0] === a && raw[1] === b) || (raw[0] === b && raw[1] === a)),
    "그려지는 선분·각의 끝점 불일치",
  );
}

/** Rendering coordinates only: the answer is independently solved from printed
 * givens in exact arithmetic. No SVG/raster pixels or generator geometry helper
 * enter that solve. Residuals use circle-radius units, so a smaller drawing
 * cannot hide a false incidence. The closed, named drawing topology is checked
 * separately from coordinates and from the producer's canonical comparison.
 */
export function assertTangentRectangleGeometry(
  raw: unknown,
  givens: { width: number; upperPart: number; tangent: number },
) {
  const spec = record(raw),
    points = record(spec.points),
    circle = record(record(spec.circles).c);
  const names = ["A", "B", "C", "D", "E", "F", "O"];
  keys(spec, [
    "version",
    "style",
    "points",
    "circles",
    "segments",
    "angles",
    "labels",
  ]);
  keys(points, [...names]);
  keys(record(spec.circles), ["c"]);
  keys(circle, ["center", "radius"]);
  const style = record(spec.style);
  keys(style, ["show_points"]);
  insist(style.show_points === true, "점 표시 필요");
  const segments = record(spec.segments);
  const edgesByName: [string, string, string][] = [
    ["AB", "A", "B"],
    ["BC", "B", "C"],
    ["CD", "C", "D"],
    ["DA", "D", "A"],
    ["EC", "E", "C"],
    ["OF", "O", "F"],
  ];
  keys(
    segments,
    edgesByName.map(([name]) => name),
  );
  for (const [name, a, b] of edgesByName) endpoints(segments[name], a, b);
  const labels = record(spec.labels);
  keys(labels, [...names]);
  for (const name of names)
    insist(labels[name] === name, "점 이름 표시 불일치");
  const angles = record(spec.angles),
    right = record(angles.rightF);
  keys(angles, ["rightF"]);
  keys(right, ["vertex", "points", "right", "label"]);
  insist(
    right.vertex === "F" && right.right === true && right.label === "",
    "접점의 직각 표시 불일치",
  );
  endpoints(right.points, "O", "C");
  insist(
    spec.version === 2 && circle.center === "O",
    "지원하지 않는 도형 구조",
  );
  const point = (name: string): Point => {
    const p = points[name];
    insist(
      Array.isArray(p) &&
        p.length === 2 &&
        p.every((x) => typeof x === "number" && Number.isFinite(x)),
      `유한한 점 좌표 필요: ${name}`,
    );
    return p as unknown as Point;
  };
  const rawRadius = circle.radius;
  insist(
    typeof rawRadius === "number" &&
      Number.isFinite(rawRadius) &&
      rawRadius > 0,
    "양의 원 반지름 필요",
  );
  const origin = point("O");
  const normalized = (name: string): Point => {
    const p = point(name);
    const result: Point = [
      (p[0] - origin[0]) / rawRadius,
      (p[1] - origin[1]) / rawRadius,
    ];
    insist(result.every(Number.isFinite), "정규화할 수 없는 도형 좌표");
    return result;
  };
  const A = normalized("A"),
    B = normalized("B"),
    C = normalized("C"),
    D = normalized("D"),
    E = normalized("E"),
    F = normalized("F"),
    O = normalized("O");
  const radius = 1;
  const { width, upperPart, tangent } = givens,
    s = upperPart - width / 2;
  insist(
    [width, upperPart, tangent].every(Number.isFinite) &&
      width > 0 &&
      s > 0 &&
      2 * s < width &&
      tangent > 2 * s,
    "인쇄 자료의 양수 영역",
  );
  const scale = (2 * radius) / width,
    AB = sub(B, A),
    BC = sub(C, B),
    CD = sub(D, C),
    DA = sub(A, D);
  insist(square(AB) > 0 && square(BC) > 0, "비퇴화 직사각형 필요");
  for (const axis of [0, 1] as const) {
    eq(AB[axis], -CD[axis], "마주 보는 변 불일치");
    eq(BC[axis], -DA[axis], "마주 보는 변 불일치");
  }
  eq(dot(AB, BC), 0, "직사각형의 수직 조건");
  eq(square(BC), (width * scale) ** 2, "가로와 지름 조건");
  eq(cross(sub(E, A), AB), 0, "E가 변 AB 위에 없음");
  insist(
    dot(sub(E, A), AB) > 0 && dot(sub(E, A), AB) < square(AB),
    "E가 변 내부에 없음",
  );
  eq(square(sub(E, A)), (upperPart * scale) ** 2, "부분 길이와 그림 불일치");
  const orientation = Math.sign(cross(AB, BC));
  insist(orientation !== 0, "퇴화한 사각형");
  const edges: [Point, Point][] = [
    [A, B],
    [B, C],
    [C, D],
    [D, A],
  ];
  for (const [a, b] of edges)
    insist(
      orientation * cross(sub(b, a), sub(O, a)) > 0,
      "중심이 직사각형 내부에 없음",
    );
  const distanceSquared = (a: Point, b: Point) =>
    cross(sub(b, a), sub(O, a)) ** 2 / square(sub(b, a));
  for (const [a, b] of [
    [A, B],
    [C, D],
    [D, A],
  ] as const)
    eq(distanceSquared(a, b), radius ** 2, "세 변과 원의 접촉 조건");
  insist(
    distanceSquared(B, C) >= radius ** 2 * (1 - 1e-8),
    "원이 직사각형 밖으로 나감",
  );
  const EC = sub(C, E),
    EF = sub(F, E),
    OF = sub(O, F);
  eq(cross(EF, EC), 0, "F가 접선 선분 위에 없음");
  insist(dot(EF, EC) > 0 && dot(EF, EC) < square(EC), "F가 접선 내부에 없음");
  eq(dot(OF, EC), 0, "반지름과 접선의 수직 조건");
  eq(square(OF), radius ** 2, "접점이 원 위에 없음");
  eq(square(EF), (s * scale) ** 2, "같은 점에서 그은 접선 분할 불일치");
  eq(
    square(EC),
    (tangent * scale) ** 2,
    "인쇄 조건의 독립 복원 길이와 도형 불일치",
  );
}
