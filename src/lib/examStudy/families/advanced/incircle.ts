import type {
  CanonicalParams,
  ExamStudyDraft,
} from "@/contracts/examStudy.contract";
import {
  BASIC_CHECKS,
  assert,
  assertAnswer,
  authoredFamily,
  checked,
  draft,
  requireMatch,
} from "./shared";
import type { Point } from "./graph";

const FIGURE_CHECKS = [...BASIC_CHECKS, "visual-information"] as const;
export const incircleDrawingScale = (a: number, b: number) =>
  260 / Math.max(a, b);
interface V2Incircle {
  version: 2;
  points: Record<
    string,
    Point | { type: "on_circle"; circle: string; angle: number }
  >;
  circles: { incircle: { center: string; radius: number } };
  labels: Record<
    string,
    string | { text: string; dx?: number; dy?: number; position?: string }
  >;
  regions: Record<string, { boundary: unknown[]; fill: string }>;
  segments: Record<
    string,
    readonly string[] | { points: readonly string[]; dash: string }
  >;
  angles: Record<string, { vertex: string; points: string[]; right: boolean }>;
}
export function readIncircle(item: ExamStudyDraft) {
  requireMatch(item.content, /∠A=90°인 삼각형 ABC/);
  requireMatch(item.content, /I는 내심/);
  requireMatch(item.content, /D, E, F는 각각 AB, AC, BC와 내접원의 접점/);
  requireMatch(
    item.content,
    /삼각형 ABC의 내부에서 원의 내부를 제외한 음영 부분/,
  );
  assert(item.figureSpec?.version === 2, "v2 내접원 그림이 없습니다.");
  const spec = item.figureSpec as unknown as V2Incircle;
  const read = (name: string, edge: string) => {
    const label = spec.labels[name];
    const text = typeof label === "string" ? label : label?.text;
    assert(text, "그림의 변 길이가 없습니다.");
    return +requireMatch(text, new RegExp(`^${edge}=(\\d+)$`))[1]!;
  };
  const legAB = read("L_AB", "AB"),
    legAC = read("L_AC", "AC");
  assert(
    legAB > 0 && legAC > 0 && !/AB=\d|AC=\d/.test(item.content),
    "변 길이의 정의/시각 표상 오류",
  );
  return { legAB, legAC, spec };
}

/** Independent area/semiperimeter solution (author instead uses tangent lengths). */
export function solveIncircle(a: number, b: number) {
  const c = Math.sqrt(a * a + b * b),
    area = (a * b) / 2;
  assert(Number.isInteger(c), "유한 허용 영역 밖의 변 길이");
  const radius = area / ((a + b + c) / 2);
  assert(Number.isInteger(radius) && radius > 0, "정수 반지름 영역 밖의 도형");
  return {
    c,
    radius,
    area,
    circleCoefficient: radius * radius,
    answer: `${area} - ${radius * radius}π`,
  };
}

const incircleDomain: CanonicalParams[] = [];
for (const [a, b] of [
  [3, 4],
  [5, 12],
  [8, 15],
  [7, 24],
] as const)
  for (const scale of [1, 2, 3])
    for (const reversed of [false, true])
      incircleDomain.push({
        legAB: scale * (reversed ? b : a),
        legAC: scale * (reversed ? a : b),
      });

function buildIncircle(params: CanonicalParams): ExamStudyDraft {
  const a = params.legAB as number,
    b = params.legAC as number,
    c = Math.sqrt(a * a + b * b);
  const r = (a + b - c) / 2,
    area = (a * b) / 2;
  const scale = incircleDrawingScale(a, b);
  const point = (x: number, y: number): Point => [scale * x, scale * y];
  // Projection of I onto BC. Coordinates follow native v2's y-down convention.
  const factor = (a * b - r * (a + b)) / (a * a + b * b);
  const figure: V2Incircle = {
    version: 2,
    points: {
      A: point(0, 0),
      B: point(a, 0),
      C: point(0, b),
      I: point(r, r),
      D: point(r, 0),
      E: point(0, r),
      F: point(r + b * factor, r + a * factor),
      R: { type: "on_circle", circle: "incircle", angle: 0 },
      S: { type: "on_circle", circle: "incircle", angle: 180 },
      L_AB: [scale * a * 0.55, -40],
      L_AC: [-50, scale * b * 0.55],
    },
    circles: { incircle: { center: "I", radius: r * scale } },
    segments: {
      AB: ["A", "B"],
      AC: ["A", "C"],
      BC: ["B", "C"],
      ID: { points: ["I", "D"], dash: "4 3" },
      IE: { points: ["I", "E"], dash: "4 3" },
      IF: { points: ["I", "F"], dash: "4 3" },
    },
    regions: {
      triangle: {
        boundary: [
          { seg: ["A", "B"] },
          { seg: ["B", "C"] },
          { seg: ["C", "A"] },
        ],
        fill: "#eeeeee",
      },
      disk: {
        boundary: [
          { arc: { circle: "incircle", from: "R", to: "S", dir: "ccw" } },
          { arc: { circle: "incircle", from: "S", to: "R", dir: "ccw" } },
        ],
        fill: "white",
      },
    },
    angles: { rightA: { vertex: "A", points: ["B", "C"], right: true } },
    labels: {
      A: { text: "A", dx: -13, dy: -13 },
      B: { text: "B", dx: 14, dy: -6 },
      C: { text: "C", dx: -8, dy: 18 },
      I: { text: "I", dx: 10, dy: -8 },
      D: { text: "D", dx: 0, dy: -14 },
      E: { text: "E", dx: -14, dy: 3 },
      F: { text: "F", dx: 12, dy: 12 },
      L_AB: { text: `AB=${a}`, position: "N" },
      L_AC: { text: `AC=${b}`, position: "W" },
    },
  };
  return draft(
    params,
    `그림에서 ∠A=90°인 삼각형 ABC의 I는 내심이다. D, E, F는 각각 AB, AC, BC와 내접원의 접점이다. ` +
      `삼각형 ABC의 내부에서 원의 내부를 제외한 음영 부분의 넓이를 π를 사용하여 나타내시오. (변의 길이는 그림에 표시되어 있다.)`,
    `${area} - ${r * r}π`,
    `피타고라스 정리로 BC=√(${a}²+${b}²)=${c}이다. 반지름을 r라 하면 접선과 반지름이 수직이므로 ADIE는 한 변이 r인 정사각형이다. ` +
      `따라서 AD=AE=r, BD=BF=${a}-r, CE=CF=${b}-r이다. ` +
      `BC=BF+CF에서 ${c}=${a}+${b}-2r이므로 r=${r}이다. ` +
      `삼각형 넓이 ${a}·${b}/2=${area}에서 원의 넓이 ${r * r}π를 빼면 ${area} - ${r * r}π이다.`,
    [
      "직각·내심·접선 길이와 반지름 수선을 결합",
      "빗변 복원 후 접선의 합으로 반지름 도출",
      "전체 영역에서 원판을 제외하는 합성 넓이",
    ],
    { figureSpec: figure as unknown as Record<string, unknown> },
  );
}

export const incircleShadedAreaFamily = authoredFamily({
  id: "exam-advanced:incircle-shaded-area",
  title: "직각삼각형의 접선과 내접원 제외 넓이",
  requirement: "geometry.incircle-shaded-area",
  course: "중2",
  unit: "삼각형의 외심과 내심",
  domain: incircleDomain,
  figure: true,
  figureKinds: ["v2"],
  checks: FIGURE_CHECKS,
  boundaries: [
    "두 직각변의 방향 교환",
    "여러 비율의 원시 피타고라스 삼각형",
    "세 접점과 수선 발의 독립 검산",
    "원의 내부가 실제로 흰 원판인 음영",
    "발문의 변 길이는 그림에만 표기",
  ],
  build: buildIncircle,
  verify: (item) =>
    checked(FIGURE_CHECKS, () => {
      const p = readIncircle(item),
        q = solveIncircle(p.legAB, p.legAC),
        spec = p.spec;
      assertAnswer(item, q.answer);
      const scale = incircleDrawingScale(p.legAB, p.legAC);
      const point = (name: string): Point => {
        const value = spec.points[name];
        assert(
          Array.isArray(value) &&
            value.length === 2 &&
            value.every(Number.isFinite),
          "필수 기하 점 누락",
        );
        return [value[0] / scale, value[1] / scale];
      };
      const a = point("A"),
        b = point("B"),
        c = point("C"),
        i = point("I"),
        d = point("D"),
        e = point("E"),
        f = point("F");
      const close = (x: number, y: number) => Math.abs(x - y) < 1e-8;
      assert(
        close(a[0], 0) &&
          close(a[1], 0) &&
          close(b[0], p.legAB) &&
          close(b[1], 0) &&
          close(c[0], 0) &&
          close(c[1], p.legAC),
        "그림의 직각변과 라벨 불일치",
      );
      assert(
        close(i[0], q.radius) &&
          close(i[1], q.radius) &&
          close(d[0], q.radius) &&
          close(d[1], 0) &&
          close(e[0], 0) &&
          close(e[1], q.radius),
        "두 직각변의 접선/수선 불일치",
      );
      assert(
        Math.abs(p.legAC * f[0] + p.legAB * f[1] - p.legAB * p.legAC) < 1e-8,
        "빗변의 접점이 변 위에 없습니다.",
      );
      assert(
        Math.abs(Math.hypot(f[0] - i[0], f[1] - i[1]) - q.radius) < 1e-8,
        "빗변 접점까지의 거리 오류",
      );
      assert(
        Math.abs(
          (f[0] - i[0]) * (c[0] - b[0]) + (f[1] - i[1]) * (c[1] - b[1]),
        ) < 1e-8,
        "반지름과 접선이 수직이 아닙니다.",
      );
      assert(
        spec.circles.incircle.center === "I" &&
          spec.circles.incircle.radius === q.radius * scale,
        "내접원 스펙 불일치",
      );
      assert(
        spec.angles.rightA.right && spec.angles.rightA.vertex === "A",
        "직각 표시 누락",
      );
      assert(
        spec.regions.triangle?.fill === "#eeeeee" &&
          spec.regions.disk?.fill === "white",
        "음영에서 원판을 제외하지 않았습니다.",
      );
      assert(
        JSON.stringify(spec.regions.triangle.boundary) ===
          JSON.stringify([
            { seg: ["A", "B"] },
            { seg: ["B", "C"] },
            { seg: ["C", "A"] },
          ]),
        "음영 바깥 경계 오류",
      );
      assert(
        JSON.stringify(spec.regions.disk.boundary) ===
          JSON.stringify([
            { arc: { circle: "incircle", from: "R", to: "S", dir: "ccw" } },
            { arc: { circle: "incircle", from: "S", to: "R", dir: "ccw" } },
          ]),
        "원판 제외의 닫힌 경계 오류",
      );
      // Essential exclusion: otherwise the answer is the entire triangle.
      assert(
        q.circleCoefficient > 0 && q.area - Math.PI * q.circleCoefficient > 0,
        "제외 영역이 퇴화합니다.",
      );
      // The right angle fixes c; changing just that angle to 60° with the SAME
      // two adjacent side lengths changes both area and inradius (cosine law).
      const altArea = (p.legAB * p.legAC * Math.sqrt(3)) / 4;
      const altC = Math.sqrt(p.legAB ** 2 + p.legAC ** 2 - p.legAB * p.legAC);
      const altR = (2 * altArea) / (p.legAB + p.legAC + altC);
      assert(
        Math.abs(
          altArea -
            Math.PI * altR * altR -
            (q.area - Math.PI * q.radius * q.radius),
        ) > 0.01,
        "직각 조건이 불필요합니다.",
      );
      assert(
        q.area - Math.PI * (q.radius / 2) ** 2 !==
          q.area - Math.PI * q.radius ** 2,
        "세 변에 내접하는 조건을 빼고 더 작은 내부 원을 허용해도 넓이가 같습니다.",
      );
      for (const [a, b] of [
        [3 * p.legAB, p.legAC],
        [p.legAB, 3 * p.legAC],
      ]) {
        const changedR = (a! + b! - Math.hypot(a!, b!)) / 2;
        assert(
          Math.abs(
            (a! * b!) / 2 -
              Math.PI * changedR ** 2 -
              (q.area - Math.PI * q.radius ** 2),
          ) > 0.01,
          "그림의 두 직각변 중 하나가 불필요합니다.",
        );
      }
    }),
});
