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
  insist,
  label,
  near,
  polygon,
  readGraph,
  rubric,
  type XY,
} from "./support";

const domain: CanonicalParams[] = [
  [4, 8],
  [6, 3],
  [8, 12],
  [12, 4],
].map(([A, B]) => ({ A, B }));
function response(A: number, B: number, value: number) {
  return `P=(t,${A}/t); Q=(-(${fmt(B / A)})t,${A}/t); R=(t,-${B}/t); S=(-(${fmt(B / A)})t,-(${fmt((A * A) / B)})/t); 넓이=${fmt(value)}`;
}
function criteria(A: number, B: number, value: number) {
  return [
    `P=(t,${A}/t), Q=(-(${fmt(B / A)})t,${A}/t)`,
    `R=(t,-${B}/t), S=(-(${fmt(B / A)})t,-(${fmt((A * A) / B)})/t)`,
    `가로 간격=(1+${fmt(B / A)})t, 세로 두 변=${A + B}/t, ${fmt(A + (A * A) / B)}/t`,
    `넓이=${fmt(value)}, t>0에서 t와 1/t가 소거되어 일정`,
  ];
}
export const signedTrapezoid = family({
  key: "signed-inverse-trapezoid",
  title: "부호가 다른 반비례 그래프와 매개변수 소거",
  course: "중1",
  unit: "정비례와 반비례",
  requirement: "coord.signed-inverse-trapezoid",
  domain,
  visual: true,
  written: true,
  boundaries: [
    "제1·2·3·4사분면",
    "서로 다른 두 양의 계수",
    "수평 정렬과 두 수직 정렬",
    "t=0 제외",
    "실제 t·1/t 소거",
  ],
  make(p) {
    const A = Number(p.A),
      B = Number(p.B),
      t = 2;
    const P: XY = [t, A / t],
      Q: XY = [(-B * t) / A, A / t],
      R: XY = [t, -B / t],
      S: XY = [(-B * t) / A, (-A * A) / (B * t)];
    const extentX = Math.max(t, -Q[0]) * 1.7,
      extentY = Math.max(A / t, B / t, (A * A) / (B * t)) * 1.7;
    const g = graph([-extentX, extentX], [-extentY, extentY]);
    polygon(g, [P, Q, S, R], ["P", "Q", "S", "R"]);
    Object.assign(
      g.labels.find((l) => l.text === "Q")!,
      { dx: -28, dy: -10 },
    );
    Object.assign(
      g.labels.find((l) => l.text === "S")!,
      { dx: -25, dy: 23 },
    );
    Object.assign(
      g.labels.find((l) => l.text === "R")!,
      { dx: 10, dy: 25 },
    );
    g.curves.push(
      { type: "inverse", k: A, domain: [0.35, extentX * 0.85] },
      { type: "inverse", k: A, domain: [-extentX * 0.85, -0.35] },
      { type: "inverse", k: -B, domain: [0.35, extentX * 0.85] },
      { type: "inverse", k: -B, domain: [-extentX * 0.85, -0.35] },
    );
    label(g, P, `$y=${A}/x$`, 15, -42);
    label(g, Q, `$y=-${B}/x$`, -90, -38);
    const value = (A + B) ** 3 / (2 * A * B),
      expected = criteria(A, B, value);
    const r = rubric(
      expected.map((e, i) => ({
        id: [
          "top-incidences",
          "bottom-incidences",
          "dependent-lengths",
          "cancellation-domain",
        ][i],
        expected: e,
        alternative: [
          "수평선 y=A/t와 두 곡선의 교점으로 구함",
          "각 x좌표에 반비례식을 대입",
          "큰 직사각형에서 삼각형을 더하거나 뺌",
          "두 삼각형 넓이 합에서 각각 t를 약분",
        ][i],
        error: [
          "음의 계수 곡선의 x좌표 부호를 잃음",
          "S에 Q의 세로좌표를 그대로 씀",
          "세로 길이에 음수를 그대로 사용",
          "특정 t 한 값의 계산만으로 일정함을 주장",
        ][i],
      })),
    );
    return draft(
      p,
      "그림의 두 반비례 그래프 위에 점 $P,Q,R,S$가 있다. $P,S$는 양의 계수 그래프 위, $Q,R$는 음의 계수 그래프 위에 있다. $P,Q$의 $y$좌표는 같고, $P,R$의 $x$좌표와 $Q,S$의 $x$좌표는 각각 같다. 각 점은 그림과 같은 사분면에 있다. $P$의 $x$좌표를 $t>0$이라 할 때, 네 점의 좌표를 $t$로 나타내고 사다리꼴 $PQSR$의 넓이를 구하시오. 넓이가 $t$에 관계없이 일정한 이유와 $t=0$을 제외하는 이유를 설명하시오.",
      response(A, B, value),
      `${expected[0]}. $P$의 세로좌표를 음의 계수 곡선에 넣어 $Q$의 가로좌표를 구한다.\n${expected[1]}. 두 수직선 위에서 각각 다른 곡선에 대입한다.\n${expected[2]}. 세로 길이는 위 좌표에서 아래 좌표를 뺀 양의 수이다.\n${expected[3]}. 두 평행변의 합에 가로 간격을 곱하고 2로 나누면 t가 약분된다. t=0에서는 반비례식이 정의되지 않는다.`,
      g,
      [
        "반대 부호의 두 곡선에 네 좌표를 의존시킴",
        "정렬 조건→길이→사다리꼴 넓이",
        "문자 소거와 정의역을 설명",
      ],
      r,
    );
  },
  solve(item) {
    clauses(item.content, [
      "$P,S$는 양의 계수 그래프 위",
      "$Q,R$는 음의 계수 그래프 위",
      "$P,Q$의 $y$좌표는 같고",
      "$P,R$의 $x$좌표와 $Q,S$의 $x$좌표는 각각 같다",
      "그림과 같은 사분면",
      "$t>0$",
      "네 점의 좌표를 $t$로",
      "사다리꼴 $PQSR$",
      "일정한 이유와 $t=0$을 제외하는 이유",
    ]);
    const g = readGraph(item),
      A = Number(figureLabel(g, /^\$y=(\d+)\/x\$$/)[1]),
      B = Number(figureLabel(g, /^\$y=-(\d+)\/x\$$/)[1]);
    insist(A > 0 && B > 0 && A !== B, "계수/사다리꼴 비퇴화");
    const pointsAt = (t: number): XY[] => [
      [t, A / t],
      [(-B * t) / A, A / t],
      [(-B * t) / A, (-A * A) / (B * t)],
      [t, -B / t],
    ];
    const t = g.polygons[0]?.points[0]?.[0];
    insist(t > 0, "첫 점의 양의 x좌표");
    checkPolygon(g, pointsAt(t), ["P", "Q", "S", "R"]);
    checkInverse(g, [A, A, -B, -B]);
    const value = area(pointsAt(1));
    insist(
      [2, 5].every((u) => near(area(pointsAt(u)), value)),
      "넓이 검산",
    );
    const pts = pointsAt(t);
    insist(
      pts[0][1] > 0 &&
        pts[1][0] < 0 &&
        pts[2][1] < 0 &&
        pts[3][0] > 0 &&
        !near(pts[0][1] - pts[3][1], pts[1][1] - pts[2][1]),
      "사분면과 정확한 사다리꼴",
    );
    return {
      answer: response(A, B, value),
      parameters: { A, B },
      rubric: criteria(A, B, value),
    };
  },
});
