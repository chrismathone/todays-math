import type { CanonicalParams } from "@/contracts/examStudy.contract";
import {
  area,
  checkInverse,
  checkPolygon,
  clauses,
  draft,
  family,
  figureLabel,
  fmt,
  graph,
  hasLabel,
  insist,
  label,
  match,
  near,
  numberText,
  pointEqual,
  polygon,
  readGraph,
  type XY,
} from "./support";

const graphBasis = [
  "그림에서 읽은 여러 자료를 공유하여 판단",
  "좌표 조건과 길이·넓이의 의존 관계",
];

const piecewiseDomain: CanonicalParams[] = [];
for (const s of [3, 6])
  for (const h of [2, 4])
    for (const mask of [5, 10, 13]) piecewiseDomain.push({ s, h, mask });
const piecewiseConditions = [
  "각 선분에서는 일정한 속도로 움직인다",
  "위치가 감소하면 음의 방향",
  "옳은 주장의 기호를 모두 쓰시오",
];
export const piecewise = family({
  key: "piecewise-multi-claim",
  title: "위치 꺾은선의 방향·거리·반복 통과",
  course: "중1",
  unit: "좌표와 그래프",
  requirement: "graph.piecewise-multi-claim",
  domain: piecewiseDomain,
  visual: true,
  boundaries: [
    "정지 구간",
    "목표 위치를 꼭짓점에서 한 번만 셈",
    "음의 위치",
    "최초 도달과 세 번째 도달",
    "서로 다른 참 집합",
  ],
  make(p) {
    const s = Number(p.s),
      h = Number(p.h),
      mask = Number(p.mask);
    const pts: XY[] = [
      [0, 0],
      [s, 3 * h],
      [2 * s, 3 * h],
      [3 * s, -h],
      [4 * s, h],
      [5 * s, 0],
    ];
    const g = graph([-s / 2, 5.8 * s], [-2 * h, 4.1 * h]);
    g.height = 340;
    for (let i = 1; i < pts.length; i++)
      g.segments.push({ from: pts[i - 1], to: pts[i] });
    pts.forEach((at, i) => {
      g.points.push({ at });
      label(
        g,
        at,
        `(${at[0]},${at[1]})`,
        i === 0 ? -55 : i === 1 ? -20 : i === 2 ? 10 : i === 5 ? -3 : 0,
        i === 1 ? -35 : i === 3 ? 25 : -15,
      );
    });
    const values = [
      10 * h + (mask & 1 ? 0 : h),
      2 * s + (mask & 2 ? 0 : s),
      s / 3 + (mask & 4 ? 0 : 1),
      mask & 8 ? 3 : 4,
    ];
    const content = `그림은 시간 $t$분과 출발점에 대한 위치 $y$ m의 관계이다. 각 선분에서는 일정한 속도로 움직인다. 위치가 감소하면 음의 방향으로 움직인다고 한다. 다음에서 옳은 주장의 기호를 모두 쓰시오.\nㄱ. 전체 이동 거리는 ${values[0]} m이다.\nㄴ. 음의 방향으로 움직인 시간은 모두 ${values[1]}분이다.\nㄷ. 위치가 ${h} m가 되는 최초 시각은 ${values[2]}분이다.\nㄹ. 위치가 ${h} m가 되는 서로 다른 시각은 ${values[3]}개이다.`;
    const answer = ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]
      .filter((_, i) => mask & (1 << i))
      .join(", ");
    const solution = `위치 변화의 절댓값을 더하면 ${3 * h}+0+${4 * h}+${2 * h}+${h}=${10 * h} m이다. 감소 구간은 ${2 * s}~${3 * s}분, ${4 * s}~${5 * s}분이므로 합 ${2 * s}분이다. ${h} m 최초 도달은 ${s / 3}분이고, 나머지는 ${fmt(2.5 * s)}분과 ${4 * s}분이다. 꼭짓점 ${4 * s}분을 중복하지 않아 총 3개이다. 따라서 ${answer}.`;
    return draft(p, content, answer, solution, g, graphBasis);
  },
  solve(item) {
    clauses(item.content, piecewiseConditions);
    const g = readGraph(item);
    insist(
      g.segments.length === 5 &&
        g.points.length === 6 &&
        g.curves.length === 0 &&
        g.polygons.length === 0,
      "꺾은선 구성",
    );
    const pts = [g.segments[0].from, ...g.segments.map((s) => s.to)];
    for (let i = 0; i < 5; i++)
      insist(
        pointEqual(g.segments[i].from, pts[i]) && pts[i + 1][0] > pts[i][0],
        "시간 순서/연결",
      );
    pts.forEach((at) => {
      hasLabel(g, `(${at[0]},${at[1]})`, at);
      insist(
        g.points.some((p) => pointEqual(p.at, at)),
        "자료 점 없음",
      );
    });
    const h = Number(match(item.content, /ㄷ\. 위치가 (\d+) m가/)[1]);
    const h2 = Number(match(item.content, /ㄹ\. 위치가 (\d+) m가/)[1]);
    insist(h === h2, "공유 목표 위치 불일치");
    const s = pts[1][0];
    insist(
      near(pts[0][0], 0) &&
        near(pts[0][1], 0) &&
        pts.every((pt, i) => near(pt[0], i * s)) &&
        near(pts[1][1], 3 * h) &&
        near(pts[2][1], 3 * h) &&
        near(pts[3][1], -h) &&
        near(pts[4][1], h) &&
        near(pts[5][1], 0),
      "유한 꺾은선 영역",
    );
    let distance = 0,
      negativeTime = 0;
    const hits = new Set<string>();
    for (let i = 0; i < pts.length - 1; i++) {
      const [t, y] = pts[i],
        [u, z] = pts[i + 1];
      distance += Math.abs(z - y);
      if (z < y) negativeTime += u - t;
      if (h >= Math.min(y, z) && h <= Math.max(y, z)) {
        insist(z !== y, "목표에서의 정지 구간은 이 영역 밖");
        hits.add(fmt(t + ((u - t) * (h - y)) / (z - y)));
      }
    }
    const actual = [
      distance,
      negativeTime,
      Math.min(...[...hits].map(numberText)),
      hits.size,
    ];
    const claimed = [
      Number(match(item.content, /ㄱ\. 전체 이동 거리는 (\d+) m/)[1]),
      Number(
        match(item.content, /ㄴ\. 음의 방향으로 움직인 시간은 모두 (\d+)분/)[1],
      ),
      Number(match(item.content, /최초 시각은 (\d+)분/)[1]),
      Number(match(item.content, /서로 다른 시각은 (\d+)개/)[1]),
    ];
    const mask = actual.reduce(
      (bits, x, i) => bits + (near(x, claimed[i]) ? 1 << i : 0),
      0,
    );
    // False claims also have an explicit domain, so corrupted printed values cannot hide in a false branch.
    const expectedFalse = [distance + h, negativeTime + s, actual[2] + 1, 4];
    claimed.forEach((x, i) =>
      insist(
        near(x, actual[i]) || near(x, expectedFalse[i]),
        "주장 수치 영역 손상",
      ),
    );
    return {
      answer: ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]
        .filter((_, i) => mask & (1 << i))
        .join(", "),
      parameters: { s, h, mask },
    };
  },
});

const squareDomain: CanonicalParams[] = [];
for (const a of [1, 2])
  for (const gap of [1, 2])
    for (const u of [2, 3]) squareDomain.push({ a, gap, u });
export const square = family({
  key: "shared-side-square",
  title: "두 정비례 그래프와 공통 변의 정사각형",
  course: "중1",
  unit: "정비례와 반비례",
  requirement: "coord.shared-side-square",
  domain: squareDomain,
  visual: true,
  boundaries: [
    "두 양의 기울기",
    "서로 다른 기울기 차",
    "공통 변과 오른쪽 좌표의 의존",
  ],
  make(p) {
    const a = Number(p.a),
      b = a + Number(p.gap),
      u = Number(p.u),
      side = (b - a) * u,
      right = u + side;
    const A: XY = [u, a * u],
      B: XY = [right, a * u],
      C: XY = [right, b * u],
      D: XY = [u, b * u];
    const extent = Math.max(right, b * u) * 1.45;
    const g = graph([-1, extent], [-1, extent]);
    polygon(g, [A, B, C, D], ["A", "B", "C", "D"]);
    Object.assign(
      g.labels.find((l) => l.text === "A")!,
      { dx: 10, dy: 23 },
    );
    Object.assign(
      g.labels.find((l) => l.text === "B")!,
      { dx: 10, dy: 23 },
    );
    Object.assign(
      g.labels.find((l) => l.text === "D")!,
      { dx: -22, dy: -12 },
    );
    g.curves.push(
      { coefficients: [a, 0], domain: [0, u * 1.25] },
      { coefficients: [b, 0], domain: [0, u * 1.25] },
    );
    label(g, [u * 0.65, a * u * 0.65], `$y=${a}x$`, 12, 35);
    label(g, [u * 1.27, b * u * 1.27], `$y=${b}x$`, 10, -12);
    g.segments.push({ from: B, to: [right, 0], dashed: true });
    label(g, [right, 0], `R=${right}`, -10, 23);
    return draft(
      p,
      "그림의 정사각형 $ABCD$는 각 변이 좌표축과 평행하다. 아래쪽 왼쪽 꼭짓점 $A$와 위쪽 왼쪽 꼭짓점 $D$는 각각 그림의 아래쪽 직선과 위쪽 직선 위에 있다. 오른쪽 두 꼭짓점의 $x$좌표는 그림에 표시된 $R$이다. 제1사분면에 있는 꼭짓점 $C$의 좌표를 구하시오.",
      `C=(${right},${b * u})`,
      `$A=(u,${a}u)$, $D=(u,${b}u)$라 두면 세로 길이는 ${b - a}u이다. 정사각형이므로 가로도 같아 $u+${b - a}u=${right}$, $u=${u}$. 따라서 $C=(${right},${b * u})$이다. 두 그래프 입사와 공통 변을 모두 썼다.`,
      g,
      graphBasis,
    );
  },
  solve(item) {
    clauses(item.content, [
      "정사각형 $ABCD$",
      "각 변이 좌표축과 평행",
      "아래쪽 왼쪽 꼭짓점 $A$와 위쪽 왼쪽 꼭짓점 $D$",
      "각각 그림의 아래쪽 직선과 위쪽 직선 위",
      "오른쪽 두 꼭짓점의 $x$좌표",
      "제1사분면",
    ]);
    const g = readGraph(item);
    const slopes = g.labels
      .map((l) => /^\$y=(\d+)x\$$/.exec(l.text))
      .filter((m): m is RegExpExecArray => !!m)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
    insist(
      slopes.length === 2 && slopes[0] > 0 && slopes[1] > slopes[0],
      "두 비례식 누락",
    );
    const [a, b] = slopes,
      right = Number(figureLabel(g, /^R=(\d+)$/)[1]);
    // Solve R-u = bu-au without using any stored vertex/answer as an oracle.
    const u = right / (1 + b - a),
      side = right - u;
    insist(side > 0 && near(side, (b - a) * u), "양의 공통 변");
    checkPolygon(
      g,
      [
        [u, a * u],
        [right, a * u],
        [right, b * u],
        [u, b * u],
      ],
      ["A", "B", "C", "D"],
    );
    insist(
      g.curves.length === 2 &&
        g.curves.every(
          (c, i) =>
            c.coefficients?.length === 2 &&
            near(c.coefficients[0], slopes[i]) &&
            c.coefficients[1] === 0 &&
            c.domain[0] === 0 &&
            c.domain[1] >= u,
        ),
      "표시된 직선/입사 불일치",
    );
    hasLabel(g, `R=${right}`, [right, 0]);
    insist(
      g.segments.some(
        (s) =>
          s.dashed &&
          pointEqual(s.from, [right, a * u]) &&
          pointEqual(s.to, [right, 0]),
      ),
      "오른쪽 좌표 안내선",
    );
    return {
      answer: `C=(${fmt(right)},${fmt(b * u)})`,
      parameters: { a, gap: b - a, u },
    };
  },
});

const inverseAreaDomain: CanonicalParams[] = [];
for (const a of [2, 4])
  for (const y of [6, 12])
    for (const [r, s] of [
      [1, 1],
      [2, 1],
      [1, 2],
    ])
      inverseAreaDomain.push({ a, y, r, s });
export const inverseArea = family({
  key: "inverse-area-ratio",
  title: "반비례 두 점과 보조 삼각형의 넓이비",
  course: "중1",
  unit: "정비례와 반비례",
  requirement: "coord.inverse-area-ratio",
  domain: inverseAreaDomain,
  visual: true,
  boundaries: [
    "넓이비 1:2/1:1/2:1",
    "B가 A의 오른쪽",
    "같은 밑변으로 가로 길이 복원",
  ],
  make(p) {
    const a = Number(p.a),
      y = Number(p.y),
      r = Number(p.r),
      s = Number(p.s),
      k = a * y;
    const b = a * (1 + r / s),
      z = k / b;
    const g = graph([-1, b * 1.45], [-1, y * 1.45]);
    polygon(
      g,
      [
        [0, 0],
        [a, y],
        [b, z],
      ],
      ["", `A(${a},${y})`, "B"],
    );
    g.curves.push({ type: "inverse", k, domain: [a * 0.72, b * 1.3] });
    g.segments.push(
      { from: [a, y], to: [a, 0], dashed: true },
      { from: [a, 0], to: [b, z], dashed: true },
    );
    g.points.push({ at: [a, 0] });
    label(g, [a, 0], "C", 0, 23);
    const content = `그림의 $A,B$는 $k>0$인 반비례 그래프 $y=k/x$ 위의 제1사분면의 점이고, $B$는 $A$보다 오른쪽에 있다. $C$는 $A$에서 $x$축에 내린 수선의 발이다. 삼각형 $ABC$와 $OAC$의 넓이비가 ${r}:${s}일 때, $B$의 좌표와 삼각형 $OAB$의 넓이를 구하시오.`;
    const ans = `B=(${fmt(b)},${fmt(z)}), 넓이=${fmt(
      area([
        [0, 0],
        [a, y],
        [b, z],
      ]),
    )}`;
    return draft(
      p,
      content,
      ans,
      `$AC=${y}$를 공통 밑변으로 보면 높이 비는 $(x_B-${a}):${a}=${r}:${s}$이다. 따라서 $x_B=${fmt(b)}$. $k=${a}×${y}=${k}$이므로 $y_B=${fmt(z)}$. 큰 삼각형에서 작은 삼각형을 빼면 넓이는 $(${fmt(b * y)}-${fmt(a * z)})/2=${fmt(
        area([
          [0, 0],
          [a, y],
          [b, z],
        ]),
      )}$이다.`,
      g,
      graphBasis,
    );
  },
  solve(item) {
    clauses(item.content, [
      "$k>0$인 반비례 그래프 $y=k/x$",
      "제1사분면",
      "$B$는 $A$보다 오른쪽",
      "$C$는 $A$에서 $x$축에 내린 수선의 발",
      "$B$의 좌표와 삼각형 $OAB$의 넓이",
    ]);
    const m = match(item.content, /넓이비가 (\d+):(\d+)일/),
      r = Number(m[1]),
      s = Number(m[2]);
    const g = readGraph(item),
      aLabel = figureLabel(g, /^A\((\d+),(\d+)\)$/),
      a = Number(aLabel[1]),
      y = Number(aLabel[2]);
    const x = a + (a * r) / s,
      z = (a * y) / x;
    checkPolygon(
      g,
      [
        [0, 0],
        [a, y],
        [x, z],
      ],
      ["", aLabel[0], "B"],
    );
    checkInverse(g, [a * y]);
    hasLabel(g, "C", [a, 0]);
    insist(
      g.segments.length === 2 &&
        g.segments.some(
          (t) =>
            t.dashed && pointEqual(t.from, [a, y]) && pointEqual(t.to, [a, 0]),
        ) &&
        g.segments.some(
          (t) =>
            t.dashed && pointEqual(t.from, [a, 0]) && pointEqual(t.to, [x, z]),
        ),
      "보조 삼각형/수선 누락",
    );
    const ratio =
      area([
        [a, y],
        [x, z],
        [a, 0],
      ]) /
      area([
        [0, 0],
        [a, y],
        [a, 0],
      ]);
    insist(near(ratio, r / s), "넓이비와 그림 불일치");
    return {
      answer: `B=(${fmt(x)},${fmt(z)}), 넓이=${fmt((x * y - a * z) / 2)}`,
      parameters: { a, y, r, s },
    };
  },
});

const rayDomain: CanonicalParams[] = [];
for (const L of [6, 12])
  for (const H of [4, 8])
    for (const [r, s, t] of [
      [1, 1, 2],
      [2, 1, 1],
      [1, 2, 1],
    ])
      rayDomain.push({ L, H, r, s, t });
export const rayPartition = family({
  key: "ray-area-partition",
  title: "두 광선의 세 넓이 분할과 기울기",
  course: "중1",
  unit: "정비례와 반비례",
  requirement: "coord.ray-area-partition",
  domain: rayDomain,
  visual: true,
  boundaries: ["왼쪽/오른쪽 큰 분할", "중앙 큰 분할", "서로 다른 두 내부 분점"],
  make(p) {
    const L = Number(p.L),
      H = Number(p.H),
      r = Number(p.r),
      s = Number(p.s),
      t = Number(p.t),
      total = r + s + t;
    const P: XY = [(L * (s + t)) / total, (H * r) / total],
      Q: XY = [(L * t) / total, (H * (r + s)) / total];
    const g = graph([-1, L * 1.35], [-1, H * 1.35]);
    polygon(
      g,
      [
        [0, 0],
        [L, 0],
        [0, H],
      ],
      ["", `A(${L},0)`, `B(0,${H})`],
    );
    g.segments.push({ from: [0, 0], to: P }, { from: [0, 0], to: Q });
    label(g, P, "P", 10, -2);
    label(g, Q, "Q", 6, -12);
    g.points.push({ at: P }, { at: Q });
    const ans = `m=${fmt(P[1] / P[0])}, n=${fmt(Q[1] / Q[0])}`;
    return draft(
      p,
      `그림에서 $P,Q$는 선분 $AB$의 내부에 있고 $A,P,Q,B$ 순서로 놓인다. 원점을 지나는 두 직선 $OP,OQ$의 기울기를 각각 $m,n$이라 한다. 삼각형 $OAP,OPQ,OQB$의 넓이비가 ${r}:${s}:${t}일 때, $m,n$을 구하시오.`,
      ans,
      `세 삼각형은 $AB$에 대한 높이가 같으므로 $AP:PQ:QB=${r}:${s}:${t}$이다. $A$에서 $B$까지 가로는 ${L}만큼 감소하고 세로는 ${H}만큼 증가한다. 따라서 $P=(${fmt(P[0])},${fmt(P[1])})$, $Q=(${fmt(Q[0])},${fmt(Q[1])})$. 원점을 지나므로 각각 세로/가로를 계산하여 ${ans}이다.`,
      g,
      graphBasis,
    );
  },
  solve(item) {
    clauses(item.content, [
      "선분 $AB$의 내부",
      "$A,P,Q,B$ 순서",
      "원점을 지나는 두 직선 $OP,OQ$",
      "기울기를 각각 $m,n$",
      "삼각형 $OAP,OPQ,OQB$",
    ]);
    const m = match(item.content, /넓이비가 (\d+):(\d+):(\d+)일/),
      r = Number(m[1]),
      s = Number(m[2]),
      t = Number(m[3]);
    const g = readGraph(item),
      L = Number(figureLabel(g, /^A\((\d+),0\)$/)[1]),
      H = Number(figureLabel(g, /^B\(0,(\d+)\)$/)[1]);
    const pl = g.labels.find((l) => l.text === "P"),
      ql = g.labels.find((l) => l.text === "Q");
    insist(pl && ql, "분점 라벨 누락");
    const P = pl.at,
      Q = ql.at;
    insist(
      0 < Q[0] &&
        Q[0] < P[0] &&
        P[0] < L &&
        near(P[0] / L + P[1] / H, 1) &&
        near(Q[0] / L + Q[1] / H, 1),
      "내분/입사 불일치",
    );
    const areas = [
      area([[0, 0], [L, 0], P]),
      area([[0, 0], P, Q]),
      area([[0, 0], Q, [0, H]]),
    ];
    insist(
      near(areas[0] / r, areas[1] / s) && near(areas[1] / s, areas[2] / t),
      "넓이 분할비 불일치",
    );
    checkPolygon(
      g,
      [
        [0, 0],
        [L, 0],
        [0, H],
      ],
      ["", `A(${L},0)`, `B(0,${H})`],
    );
    insist(
      g.segments.length === 2 &&
        [P, Q].every((pt) =>
          g.segments.some(
            (z) => pointEqual(z.from, [0, 0]) && pointEqual(z.to, pt),
          ),
        ),
      "두 광선 누락",
    );
    return {
      answer: `m=${fmt(P[1] / P[0])}, n=${fmt(Q[1] / Q[0])}`,
      parameters: { L, H, r, s, t },
    };
  },
});
