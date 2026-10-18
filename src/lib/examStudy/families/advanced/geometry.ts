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
import { type Point, graphFigure } from "./graph";

const FIGURE_CHECKS = [...BASIC_CHECKS, "visual-information"] as const;
const radians = (a: number) => (a * Math.PI) / 180;
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const angleAt = (a: Point, vertex: Point, b: Point) => {
  const u = [a[0] - vertex[0], a[1] - vertex[1]],
    v = [b[0] - vertex[0], b[1] - vertex[1]];
  const norm = Math.hypot(u[0]!, u[1]!) * Math.hypot(v[0]!, v[1]!);
  assert(norm > 1e-12, "각의 꼭짓점과 끝점이 겹칩니다.");
  return (
    (Math.acos(
      Math.max(-1, Math.min(1, (u[0]! * v[0]! + u[1]! * v[1]!) / norm)),
    ) *
      180) /
    Math.PI
  );
};
export function incenter(a: Point, b: Point, c: Point): Point {
  const wa = distance(b, c),
    wb = distance(a, c),
    wc = distance(a, b),
    sum = wa + wb + wc;
  return [
    (wa * a[0] + wb * b[0] + wc * c[0]) / sum,
    (wa * a[1] + wb * b[1] + wc * c[1]) / sum,
  ];
}
export function lineIntersection(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
): Point {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    vx = d[0] - c[0],
    vy = d[1] - c[1];
  const det = ux * vy - uy * vx;
  assert(Math.abs(det) > 1e-10, "교선이 평행합니다.");
  const t = ((c[0] - a[0]) * vy - (c[1] - a[1]) * vx) / det;
  return [a[0] + t * ux, a[1] + t * uy];
}
export interface SplitConstruction {
  a: Point;
  b: Point;
  c: Point;
  d: Point;
  i: Point;
  j: Point;
  e: Point;
}

/** Independent coordinate/incidence construction from angles, allowing an
 * asymmetric ABD as a counterfactual. No authored center coordinates are read. */
export function constructSplit(
  alpha: number,
  beta: number,
  baseAngle = 90 - alpha / 2,
): SplitConstruction {
  const angleD = 180 - alpha - baseAngle,
    gamma = 180 - alpha - beta - baseAngle;
  assert(
    alpha > 0 && beta > 0 && gamma > 0 && angleD > 0,
    "삼각형 각의 범위 오류",
  );
  const ab = Math.sin(radians(angleD)) / Math.sin(radians(alpha));
  const a: Point = [
    ab * Math.cos(radians(baseAngle)),
    ab * Math.sin(radians(baseAngle)),
  ];
  const b: Point = [0, 0],
    d: Point = [1, 0];
  const c: Point = [a[0] + a[1] / Math.tan(radians(gamma)), 0];
  assert(c[0] > 1, "D가 선분 BC의 내부가 아닙니다.");
  const i = incenter(a, b, d),
    j = incenter(a, d, c),
    e = lineIntersection(a, i, c, j);
  return { a, b, c, d, i, j, e };
}

export function readSplit(item: ExamStudyDraft): {
  alpha: number;
  beta: number;
} {
  requireMatch(item.content, /D는 선분 BC의 내부/);
  requireMatch(item.content, /AB=AD/);
  requireMatch(item.content, /I와 J는 각각 삼각형 ABD와 삼각형 ACD의 내심/);
  requireMatch(item.content, /반직선 CJ를 J 너머로 연장/);
  requireMatch(item.content, /직선 AI와 만나는 점을 E/);
  requireMatch(item.content, /α=∠BAD, β=∠DAC/);
  requireMatch(item.content, /∠IEJ/);
  const spec = graphFigure(item);
  const read = (key: string) => {
    const labels = spec.labels.filter((l) => l.text.startsWith(`${key}=`));
    assert(labels.length === 1, "그림의 각도 라벨이 없습니다.");
    return +requireMatch(labels[0]!.text, new RegExp(`^${key}=(\\d+)°$`))[1]!;
  };
  assert(
    !/\d+°/.test(item.content),
    "핵심 각도가 그림 밖에 중복되어 있습니다.",
  );
  return { alpha: read("α"), beta: read("β") };
}

export function solveSplit(item: ExamStudyDraft) {
  const angles = readSplit(item),
    points = constructSplit(angles.alpha, angles.beta);
  const value = angleAt(points.i, points.e, points.j);
  // Canonical degree values are exact by the angle-bisector proof, not rounded
  // guesses from a root finder. Coordinates independently verify that proof.
  const exact = 45 + angles.alpha / 4 + angles.beta / 2;
  assert(Math.abs(value - exact) < 1e-8, "두 내심의 독립 좌표 각 검산 실패");
  assert(
    points.e[1] > points.i[1] && points.e[1] < points.a[1],
    "E가 AI의 의도한 가지에 없습니다.",
  );
  assert(
    distance(points.c, points.e) > distance(points.c, points.j),
    "CJ의 J 너머 연장 조건 실패",
  );
  return { ...angles, points, exact };
}

const splitDomain: CanonicalParams[] = [];
for (const alpha of [32, 40, 48, 56, 64])
  for (const beta of [20, 28, 36]) splitDomain.push({ alpha, beta });

function buildSplit(p: CanonicalParams): ExamStudyDraft {
  const alpha = p.alpha as number,
    beta = p.beta as number;
  // Authored Euclidean construction: the isosceles apex is above the midpoint
  // of BD. The verifier instead uses the sine rule and barycentric incenters.
  const a: Point = [0.5, 0.5 / Math.tan(radians(alpha / 2))],
    b: Point = [0, 0],
    d: Point = [1, 0];
  const gamma = 90 - alpha / 2 - beta;
  const c: Point = [0.5 + a[1] / Math.tan(radians(gamma)), 0];
  const i: Point = [0.5, a[1] / (1 + 2 * distance(a, b))];
  const angleD = 90 + alpha / 2;
  // Intersect the bisectors at C and D to construct the OTHER incenter.
  const rayD: Point = [
    d[0] + Math.cos(radians(angleD / 2)),
    Math.sin(radians(angleD / 2)),
  ];
  const rayC: Point = [
    c[0] - Math.cos(radians(gamma / 2)),
    Math.sin(radians(gamma / 2)),
  ];
  const j = lineIntersection(d, rayD, c, rayC);
  const e: Point = [0.5, (c[0] - 0.5) * Math.tan(radians(gamma / 2))];
  const positions = { A: a, B: b, C: c, D: d, I: i, J: j, E: e };
  // graph-1 uses independent x/y scales. Equal DATA units must also have
  // equal physical lengths for a geometry figure with angle labels.
  const spanX = Math.max(c[0] + 0.8, ((a[1] + 0.8) * 464) / 404);
  const spanY = (spanX * 404) / 464;
  const figure = {
    version: "graph-1",
    axes: false,
    width: 560,
    height: 500,
    xRange: [-0.35, spanX - 0.35],
    yRange: [-0.3, spanY - 0.3],
    curves: [],
    polygons: [{ points: [a, b, c] }],
    segments: [
      { from: a, to: d },
      { from: a, to: i },
      { from: c, to: j },
      { from: j, to: e, dashed: true },
    ],
    points: Object.values(positions).map((at) => ({ at, radius: 2 })),
    labels: [
      ...Object.entries(positions).map(([text, at]) => ({
        at,
        text,
        dx: ["I", "E"].includes(text) ? -13 : text === "J" ? 11 : 0,
        dy: text === "I" ? 14 : ["B", "C", "D"].includes(text) ? 22 : -12,
        anchor: ["I", "E"].includes(text) ? "end" : "middle",
      })),
      { at: [0.05, a[1] + 0.23], text: `α=${alpha}°`, anchor: "start" },
      {
        at: [Math.min(c[0] - 0.8, 1), a[1] + 0.23],
        text: `β=${beta}°`,
        anchor: "start",
      },
    ],
  };
  const answer = `${45 + alpha / 4 + beta / 2}°`;
  return draft(
    p,
    `그림에서 D는 선분 BC의 내부에 있고 AB=AD이다. I와 J는 각각 삼각형 ABD와 삼각형 ACD의 내심이다. ` +
      `반직선 CJ를 J 너머로 연장하여 직선 AI와 만나는 점을 E라 한다. α=∠BAD, β=∠DAC일 때 ∠IEJ의 크기를 구하시오. (각도는 그림에 표시되어 있다.)`,
    answer,
    `AB=AD에서 ∠ABD=∠BDA=${90 - alpha / 2}°이다. 따라서 ∠ADC=${90 + alpha / 2}°, ∠ACD=${gamma}°이다. ` +
      `I는 ABD의 내심이므로 ∠IAC=${alpha / 2 + beta}°이고, J는 ACD의 내심이므로 ∠ACE=${gamma / 2}°이다. ` +
      `E는 C-J-E 순서이고 A-E-I 순서이므로 ∠IEJ는 삼각형 ACE의 E에서의 외각이다. ` +
      `따라서 ∠IEJ=${alpha / 2 + beta}°+${gamma / 2}°=${answer}이다. 두 내심을 같은 삼각형의 내심으로 취급하면 안 된다.`,
    [
      "이등변 부분삼각형과 이웃 부분삼각형의 각 의존",
      "서로 다른 내심의 두 이등분선",
      "연장선의 순서와 외각 가지",
    ],
    { figureSpec: figure },
  );
}

export const splitIncentersFamily = authoredFamily({
  id: "exam-advanced:split-triangle-incenters",
  title: "두 부분삼각형의 내심과 연장선 각",
  requirement: "geometry.split-incenters",
  course: "중2",
  unit: "삼각형의 외심과 내심",
  domain: splitDomain,
  figure: true,
  checks: FIGURE_CHECKS,
  boundaries: [
    "두 서로 다른 삼각형의 내심",
    "이등변 조건 제거 반례",
    "C-J-E와 A-E-I의 순서",
    "독립 좌표·각·세 변까지 거리 일치",
    "그림의 두 각도 라벨",
  ],
  build: buildSplit,
  verify: (item) =>
    checked(FIGURE_CHECKS, () => {
      const result = solveSplit(item),
        { points: q, alpha, beta } = result;
      assertAnswer(item, `${result.exact}°`);
      const spec = graphFigure(item);
      for (const [name, point] of Object.entries({
        A: q.a,
        B: q.b,
        C: q.c,
        D: q.d,
        I: q.i,
        J: q.j,
        E: q.e,
      })) {
        const label = spec.labels.find((l) => l.text === name);
        assert(
          label && distance(label.at, point) < 1e-8,
          `${name}의 그림 좌표가 내심/입사 관계와 다릅니다.`,
        );
        assert(
          spec.points.some((p) => distance(p.at, point) < 1e-8),
          `${name}의 점이 없습니다.`,
        );
      }
      // Three genuinely separate condition-removal witnesses.
      const asymmetric = constructSplit(alpha, beta, 94 - alpha / 2);
      assert(
        Math.abs(
          angleAt(asymmetric.i, asymmetric.e, asymmetric.j) - result.exact,
        ) > 0.1,
        "이등변 조건이 불필요합니다.",
      );
      const movedI: Point = [q.i[0] + 0.025, q.i[1]];
      const alteredE = lineIntersection(q.a, movedI, q.c, q.j);
      assert(
        Math.abs(angleAt(movedI, alteredE, q.j) - result.exact) > 0.1,
        "첫 내심이 불필요합니다.",
      );
      const movedJ: Point = [q.j[0] + 0.025, q.j[1]];
      const alteredE2 = lineIntersection(q.a, q.i, q.c, movedJ);
      assert(
        Math.abs(angleAt(q.i, alteredE2, movedJ) - result.exact) > 0.1,
        "둘째 내심이 불필요합니다.",
      );
      assert(
        Math.abs(angleAt(q.b, q.a, q.d) - alpha) < 1e-8 &&
          Math.abs(angleAt(q.d, q.a, q.c) - beta) < 1e-8,
        "그림의 각도 불일치",
      );
      const segs = spec.segments ?? [];
      const hasSegment = (a: Point, b: Point) =>
        segs.some(
          (s) => distance(s.from, a) < 1e-8 && distance(s.to, b) < 1e-8,
        );
      assert(
        hasSegment(q.a, q.d) &&
          hasSegment(q.a, q.i) &&
          hasSegment(q.c, q.j) &&
          hasSegment(q.j, q.e),
        "핵심 보조선/연장선 누락",
      );
      const boundary = spec.polygons?.[0]?.points;
      assert(
        boundary?.length === 3 &&
          boundary.every((p, i) => distance(p, [q.a, q.b, q.c][i]!) < 1e-8),
        "바깥 삼각형이 입사 관계와 다릅니다.",
      );
      assert(
        Math.abs(
          (spec.width - 96) / (spec.xRange[1] - spec.xRange[0]) -
            (spec.height - 96) / (spec.yRange[1] - spec.yRange[0]),
        ) < 1e-8,
        "도형 각도가 축별 확대율로 왜곡됩니다.",
      );
    }),
});

export interface TwoCentersProblem {
  theta: number;
  outerAboveInner: boolean;
}
export function readTwoCenters(item: ExamStudyDraft): TwoCentersProblem {
  requireMatch(item.content, /AB=AC인 예각삼각형/);
  requireMatch(item.content, /O는 외심, I는 내심/);
  requireMatch(item.content, /∠OBI=θ/);
  requireMatch(item.content, /그림의 O와 I의 위치 관계/);
  requireMatch(item.content, /∠BIC의 크기/);
  const spec = graphFigure(item),
    o = spec.labels.find((l) => l.text === "O"),
    i = spec.labels.find((l) => l.text === "I");
  const theta = spec.labels.filter((l) => l.text.startsWith("θ="));
  assert(
    o && i && theta.length === 1 && Math.abs(o.at[1] - i.at[1]) > 1e-8,
    "그림의 두 중심/각도 가지가 없습니다.",
  );
  const value = +requireMatch(theta[0]!.text, /^θ=(\d+)°$/)[1]!;
  assert(
    value > 0 && value < 22.5,
    "두 중심이 다른 예각 구성의 각도 범위 오류",
  );
  assert(!/\d+°/.test(item.content), "핵심 각도가 본문에 중복되어 있습니다.");
  return { theta: value, outerAboveInner: o.at[1] > i.at[1] };
}

export function solveTwoCenters(p: TwoCentersProblem) {
  // The branch is essential: equal theta values have two different apex angles.
  const apex = (180 + (p.outerAboveInner ? -4 : 4) * p.theta) / 3;
  assert(apex > 0 && apex < 90 && apex !== 60, "예각/서로 다른 중심 조건 오류");
  const a: Point = [0, 1 / Math.tan(radians(apex / 2))],
    b: Point = [-1, 0],
    c: Point = [1, 0];
  const i = incenter(a, b, c);
  // Circumcenter recovered independently from equal squared distances to A/B.
  const o: Point = [0, (a[1] * a[1] - 1) / (2 * a[1])];
  assert(
    o[1] > i[1] === p.outerAboveInner,
    "그림의 중심 순서 가지가 다릅니다.",
  );
  assert(
    Math.abs(angleAt(o, b, i) - p.theta) < 1e-8,
    "외심·내심으로 복원한 각도 불일치",
  );
  const exact = 90 + apex / 2;
  assert(
    Math.abs(angleAt(b, i, c) - exact) < 1e-8,
    "요청 각의 독립 좌표 검산 실패",
  );
  return { apex, a, b, c, i, o, exact };
}

const twoCenterDomain: CanonicalParams[] = [];
for (const theta of [9, 15, 21])
  for (const outerAboveInner of [true, false])
    twoCenterDomain.push({ theta, outerAboveInner });

function buildTwoCenters(p: CanonicalParams): ExamStudyDraft {
  const theta = p.theta as number,
    above = p.outerAboveInner as boolean;
  const apex = 60 + ((above ? -1 : 1) * 4 * theta) / 3,
    height = 1 / Math.tan(radians(apex / 2));
  const a: Point = [0, height],
    b: Point = [-1, 0],
    c: Point = [1, 0];
  // Author's angle-bisector/circumcircle formulas, checked independently below.
  const i: Point = [0, Math.tan(radians(45 - apex / 4))];
  const o: Point = [0, Math.tan(radians(90 - apex))];
  const spanX = Math.max(3, ((height + 0.9) * 464) / 404),
    spanY = (spanX * 404) / 464;
  const positions = { A: a, B: b, C: c, O: o, I: i };
  const figure = {
    version: "graph-1",
    axes: false,
    width: 560,
    height: 500,
    xRange: [-spanX / 2, spanX / 2],
    yRange: [-0.3, spanY - 0.3],
    curves: [],
    polygons: [{ points: [a, b, c] }],
    segments: [
      { from: a, to: [0, 0], dashed: true },
      { from: b, to: o },
      { from: b, to: i },
      { from: c, to: i },
    ],
    points: Object.values(positions).map((at) => ({ at, radius: 2 })),
    labels: [
      ...Object.entries(positions).map(([text, at]) => ({
        text,
        at,
        dx: text === "O" ? 13 : text === "I" ? -13 : 0,
        dy: ["B", "C"].includes(text) ? 22 : text === "A" ? -15 : -4,
        anchor: text === "O" ? "start" : text === "I" ? "end" : "middle",
      })),
      { at: [-1.15, height + 0.25], text: `θ=${theta}°`, anchor: "start" },
    ],
  };
  const answer = `${90 + apex / 2}°`;
  return draft(
    p,
    `그림은 AB=AC인 예각삼각형 ABC이다. O는 외심, I는 내심이다. ∠OBI=θ라 하자. ` +
      `그림의 O와 I의 위치 관계를 이용하여 ∠BIC의 크기를 구하시오. (각도는 그림에 표시되어 있다.)`,
    answer,
    `∠BAC=α라 하면 이등변 조건에서 ∠IBC=45°-α/4이다. OB=OC이고 중심각 관계를 사용하면 ∠OBC=90°-α이다. ` +
      `그림에서 ${above ? "O가 I보다 위에 있으므로" : "O가 I보다 아래에 있으므로"} ` +
      `${above ? "(90°-α)-(45°-α/4)" : "(45°-α/4)-(90°-α)"}=${theta}°이다. ` +
      `따라서 α=${apex}°이고 내심의 각 관계로 ∠BIC=90°+α/2=${answer}이다. 위치 관계를 무시하면 서로 다른 두 α가 가능하다.`,
    [
      "이등변삼각형에서 외심과 내심의 서로 다른 각 관계",
      "그림의 중심 순서로 절댓값의 두 가지 구별",
      "복원한 꼭짓각을 다른 내심 각에 연결",
    ],
    { figureSpec: figure },
  );
}

export const twoCentersAngleFamily = authoredFamily({
  id: "exam-advanced:two-centers-angle",
  title: "외심·내심의 순서와 이등변삼각형 각",
  requirement: "geometry.two-centers-angle",
  course: "중2",
  unit: "삼각형의 외심과 내심",
  domain: twoCenterDomain,
  figure: true,
  checks: FIGURE_CHECKS,
  boundaries: [
    "같은 θ의 서로 다른 두 꼭짓각",
    "외심이 내심보다 위/아래",
    "외심의 세 꼭짓점 거리 일치",
    "내심의 세 변 거리 일치",
    "두 중심이 일치하는 정삼각형 제외",
  ],
  build: buildTwoCenters,
  verify: (item) =>
    checked(FIGURE_CHECKS, () => {
      const p = readTwoCenters(item),
        q = solveTwoCenters(p),
        spec = graphFigure(item);
      assertAnswer(item, `${q.exact}°`);
      for (const [name, at] of Object.entries({
        A: q.a,
        B: q.b,
        C: q.c,
        O: q.o,
        I: q.i,
      })) {
        const label = spec.labels.find((l) => l.text === name);
        assert(
          label && distance(label.at, at) < 1e-8,
          "두 중심/꼭짓점의 그림 좌표 불일치",
        );
        assert(
          spec.points.some((p) => distance(p.at, at) < 1e-8),
          "필수 중심/꼭짓점 누락",
        );
      }
      assert(
        Math.abs(distance(q.o, q.a) - distance(q.o, q.b)) < 1e-8 &&
          Math.abs(distance(q.o, q.b) - distance(q.o, q.c)) < 1e-8,
        "외심의 등거리 실패",
      );
      assert(
        solveTwoCenters({ ...p, outerAboveInner: !p.outerAboveInner }).exact !==
          q.exact,
        "중심 순서가 필수 조건이 아닙니다.",
      );
      // Each center participates in the printed theta: holding the triangle and
      // moving just that center changes theta, rather than being a decoration.
      assert(
        Math.abs(angleAt([q.o[0], q.o[1] + 0.2], q.b, q.i) - p.theta) > 0.1,
        "외심 조건이 불필요합니다.",
      );
      assert(
        Math.abs(angleAt(q.o, q.b, [q.i[0], q.i[1] + 0.2]) - p.theta) > 0.1,
        "내심 조건이 불필요합니다.",
      );
      // Remove only AB=AC while retaining both genuine centers and theta:
      // alpha'=alpha-2, beta'=beta+4 preserves 90-alpha-beta/2. Its BIC
      // angle changes by one degree. This is not a decorative symmetry label.
      const altAlpha = q.apex - 2,
        altBeta = 94 - q.apex / 2,
        altGamma = 180 - altAlpha - altBeta;
      const altAB =
        (2 * Math.sin(radians(altGamma))) / Math.sin(radians(altAlpha));
      const altA: Point = [
        -1 + altAB * Math.cos(radians(altBeta)),
        altAB * Math.sin(radians(altBeta)),
      ];
      const altI = incenter(altA, q.b, q.c);
      const altO: Point = [
        0,
        (altA[0] ** 2 + altA[1] ** 2 - 1) / (2 * altA[1]),
      ];
      assert(
        Math.abs(angleAt(altO, q.b, altI) - p.theta) < 1e-8 &&
          Math.abs(angleAt(q.b, altI, q.c) - q.exact) > 0.5,
        "이등변 조건 제거의 독립 반례 실패",
      );
      const boundary = spec.polygons?.[0]?.points;
      assert(
        boundary?.length === 3 &&
          boundary.every((p, i) => distance(p, [q.a, q.b, q.c][i]!) < 1e-8),
        "바깥 삼각형 오류",
      );
      const segments = spec.segments ?? [];
      for (const [start, end] of [
        [q.b, q.o],
        [q.b, q.i],
        [q.c, q.i],
      ] as const)
        assert(
          segments.some(
            (s) => distance(s.from, start) < 1e-8 && distance(s.to, end) < 1e-8,
          ),
          "핵심 중심 연결선 누락",
        );
      assert(
        Math.abs(
          (spec.width - 96) / (spec.xRange[1] - spec.xRange[0]) -
            (spec.height - 96) / (spec.yRange[1] - spec.yRange[0]),
        ) < 1e-8,
        "도형 각도의 비균일 확대 오류",
      );
    }),
});
