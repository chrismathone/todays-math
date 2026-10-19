import type { CanonicalParams } from "@/contracts/examStudy.contract";
import {
  checkPolygon,
  clauses,
  draft,
  family,
  figureLabel,
  fmt,
  graph,
  hasLabel,
  insist,
  linear2,
  match,
  near,
  polygon,
  readGraph,
} from "./support";

const equalDomain: CanonicalParams[] = [];
for (const p of [2, 3]) for (const q of [5, 7]) equalDomain.push({ p, q });
export const equalLegs = family({
  key: "inverse-equal-legs",
  version: "2-m1-single-variable",
  bindStudentSolution: true,
  title: "반비례 두 좌표차의 같은 길이",
  course: "중1",
  unit: "정비례와 반비례",
  requirement: "coord.inverse-equal-legs",
  domain: equalDomain,
  boundaries: [
    "양의 서로 다른 두 x좌표",
    "어떤 한 점도 완전히 주지 않음",
    "두 좌표차와 두 입사 모두 필요",
  ],
  make(p) {
    const x1 = Number(p.p),
      x2 = Number(p.q),
      k = x1 * x2;
    return draft(
      p,
      `$k>0$인 반비례 그래프 $y=k/x$ 위에 두 점 $A=(${x1},u)$, $B=(${x2},v)$가 있다. $u>v>0$이고, 두 점의 가로 좌표 차와 세로 좌표 차가 같다. $k,u,v$를 모두 구하시오.`,
      `k=${k}, u=${x2}, v=${x1}`,
      `가로 차는 ${x2 - x1}이다. $v$를 $t$라 하면 같은 길이 조건에서 $u=t+${x2 - x1}$이다. 반비례 관계에서 두 점의 좌표의 곱이 같으므로 $${x1}(t+${x2 - x1})=${x2}t$이다. 분배법칙으로 $${x1}t+${x1 * (x2 - x1)}=${x2}t$, 이를 정리하면 $${x2 - x1}t=${x1 * (x2 - x1)}$이므로 $t=${x1}$이다. 따라서 $v=${x1}$, $u=${x2}$, $k=${k}$이다. 두 세로 좌표는 양수이고 차는 ${x2 - x1}이며, $${x1}×${x2}=${x2}×${x1}=${k}$이므로 원래 조건도 모두 만족한다.`,
      null,
      ["같은 반비례식의 두 입사", "두 좌표차의 길이 조건을 결합"],
    );
  },
  solve(item) {
    clauses(item.content, [
      "$k>0$인 반비례 그래프 $y=k/x$",
      "$u>v>0$",
      "가로 좌표 차와 세로 좌표 차가 같다",
      "$k,u,v$를 모두",
    ]);
    const m = match(item.content, /\$A=\((\d+),u\)\$, \$B=\((\d+),v\)\$/),
      p = Number(m[1]),
      q = Number(m[2]);
    insist(0 < p && p < q, "서로 다른 양의 x좌표");
    const [u, v] = linear2(1, -1, q - p, p, -q, 0);
    insist(u > v && v > 0 && near(p * u, q * v), "동일 곡선/길이 원조건 실패");
    // A correct numerical answer does not approve a later-grade student method.
    clauses(item.solution, [
      "$v$를 $t$라 하면",
      `$u=t+${q - p}$`,
      `$${p}(t+${q - p})=${q}t$`,
      `$${p}t+${p * (q - p)}=${q}t$`,
      `$${q - p}t=${p * (q - p)}$`,
      `$t=${fmt(v)}$`,
    ]);
    insist(
      !/첫 식에|연립방정식|가감법|소거/u.test(item.solution),
      "중1 한 미지수 풀이가 필요함",
    );
    return {
      answer: `k=${fmt(p * u)}, u=${fmt(u)}, v=${fmt(v)}`,
      parameters: { p, q },
    };
  },
});

const shiftedDomain: CanonicalParams[] = [];
for (const u of [2, 4])
  for (const v of [1, 3])
    for (const h of [1, 2])
      for (const a of [2, 3]) shiftedDomain.push({ u, v, h, j: 1, a, b: 1 });
export const shiftedSystem = family({
  key: "shifted-system-coupling",
  title: "해의 좌표 이동으로 묶인 두 연립식",
  course: "중2",
  unit: "연립일차방정식",
  requirement: "algebra.shifted-system-coupling",
  domain: shiftedDomain,
  boundaries: [
    "두 독립 수치식으로 원래 해 결정",
    "두 독립 계수조건",
    "각 연립식의 유일해 재확인",
    "서로 다른 양의 이동",
  ],
  make(p) {
    const u = Number(p.u),
      v = Number(p.v),
      h = Number(p.h),
      j = Number(p.j),
      a = Number(p.a),
      b = Number(p.b);
    const C = u + 2 * v,
      D = 2 * (u + h) - (v + j),
      E = a * u + b * v,
      F = a * (u + h) - b * (v + j);
    const content = `두 연립방정식 (Ⅰ) $x+2y=${C},\\ ax+by=${E}$와 (Ⅱ) $2x-y=${D},\\ ax-by=${F}$는 각각 유일한 해를 갖는다. (Ⅰ)의 해가 $(u,v)$일 때 (Ⅱ)의 해는 $(u+${h},v+${j})$이다. $u,v,a,b$를 모두 구하시오.`;
    return draft(
      p,
      content,
      `u=${u}, v=${v}, a=${a}, b=${b}`,
      `수치식에서 $u+2v=${C}$, $2(u+${h})-(v+${j})=${D}$이므로 $u=${u},v=${v}$이다. 계수조건은 $${u}a+${v}b=${E}$와 $${u + h}a-${v + j}b=${F}$로 서로 독립이다. 이를 풀면 $a=${a},b=${b}$. (Ⅰ)의 두 식은 $2a-b=${2 * a - b}≠0$, (Ⅱ)는 $a+2b=${a + 2 * b}≠0$이므로 실제로 유일한 해를 갖고, 네 원식에 대입해 모두 확인된다.`,
      null,
      [
        "두 해의 이동을 수치식으로 복원",
        "복원한 두 좌표를 서로 다른 계수조건에 재사용",
        "연립식 비퇴화 확인",
      ],
    );
  },
  solve(item) {
    clauses(item.content, [
      "각각 유일한 해",
      "(Ⅰ)의 해가 $(u,v)$",
      "(Ⅱ)의 해는",
      "$u,v,a,b$를 모두",
    ]);
    const m = match(
      item.content,
      /\(Ⅰ\) \$x\+2y=(\d+),\\ ax\+by=(\d+)\$와 \(Ⅱ\) \$2x-y=(-?\d+),\\ ax-by=(-?\d+)\$/,
    );
    const sh = match(item.content, /\(Ⅱ\)의 해는 \$\(u\+(\d+),v\+(\d+)\)\$/);
    const C = Number(m[1]),
      E = Number(m[2]),
      D = Number(m[3]),
      F = Number(m[4]),
      h = Number(sh[1]),
      j = Number(sh[2]);
    const [u, v] = linear2(1, 2, C, 2, -1, D - 2 * h + j);
    const [a, b] = linear2(u, v, E, u + h, -(v + j), F);
    insist(
      !near(b - 2 * a, 0) && !near(-2 * b - a, 0),
      "제시된 두 연립식 유일성 실패",
    );
    insist(
      near(u + 2 * v, C) &&
        near(a * u + b * v, E) &&
        near(2 * (u + h) - (v + j), D) &&
        near(a * (u + h) - b * (v + j), F),
      "네 원식 확인 실패",
    );
    return {
      answer: `u=${fmt(u)}, v=${fmt(v)}, a=${fmt(a)}, b=${fmt(b)}`,
      parameters: { u, v, h, j, a, b },
    };
  },
});

const trapezoidDomain: CanonicalParams[] = [];
for (const [a, c] of [
  [2, 3],
  [3, 2],
  [4, 6],
  [6, 4],
])
  for (const b of [4, 8]) trapezoidDomain.push({ a, b, c });
export const interceptTrapezoid = family({
  key: "intercept-trapezoid-cases",
  title: "네 축절편의 사다리꼴과 두 평행변 경우",
  course: "중2",
  unit: "일차함수와 일차방정식의 관계",
  requirement: "coord.intercept-trapezoid-cases",
  domain: trapezoidDomain,
  visual: true,
  boundaries: [
    "a<c와 a>c",
    "음수 매개변수",
    "두 대변 쌍의 대안",
    "a≠c로 평행사변형 제외",
  ],
  make(p) {
    const a = Number(p.a),
      b = Number(p.b),
      c = Number(p.c),
      m = -b / a,
      bottom = c * m;
    const g = graph([-c * 1.6, a * 1.6], [bottom * 1.5, b * 1.5]);
    polygon(
      g,
      [
        [a, 0],
        [0, b],
        [-c, 0],
        [0, bottom],
      ],
      [`P(${a},0)`, `Q(0,${b})`, `R(-${c},0)`, `S(0,${c}m)`],
    );
    Object.assign(
      g.labels.find((l) => l.text.startsWith("R("))!,
      { dx: -90, dy: -14 },
    );
    Object.assign(
      g.labels.find((l) => l.text.startsWith("S("))!,
      { dx: 10, dy: 30 },
    );
    const ans = `m=${fmt(-b / a)} (PQ∥RS), ${fmt((-a * b) / (c * c))} (QR∥SP)`;
    return draft(
      p,
      "그림은 네 축절편 $P,Q,R,S$를 이 순서로 이은 사각형의 한 경우를 나타낸다. $S$의 좌표에 쓰인 $m$은 음수이다. $P$의 양의 $x$절편을 $a$, $Q$의 양의 $y$절편을 $b$, $R$의 $x$좌표의 절댓값을 $c$라 하면 $a≠c$이다. 네 점의 축 위 순서는 그대로 두고, 사각형이 정확히 한 쌍의 대변만 평행한 사다리꼴이 되도록 하는 모든 $m$을 구하고 각각의 평행한 대변 쌍을 쓰시오.",
      ans,
      `$PQ$의 기울기는 $-${b}/${a}$, $RS$의 기울기는 $m$이므로 첫 경우 $m=${fmt(-b / a)}$. 다른 대변 쌍에서는 $QR$의 기울기가 $${b}/${c}$이고 $SP$는 $-${c}m/${a}$여서 $m=${fmt((-a * b) / (c * c))}$. 두 값은 모두 음수이고 $a≠c$이므로 서로 다르다. 두 경우의 값이 일치하려면 $a=c$여야 하므로 평행사변형은 없다. 사각형에서 대변 쌍은 이 둘뿐이므로 빠진 경우가 없다.`,
      g,
      [
        "그림의 축절편을 기울기로 전환",
        "평행한 두 대변 쌍의 경우를 모두 조사",
        "음수·비퇴화·평행사변형 제외",
      ],
    );
  },
  solve(item) {
    clauses(item.content, [
      "이 순서로 이은 사각형의 한 경우",
      "$m$은 음수",
      "$a≠c$",
      "네 점의 축 위 순서는 그대로",
      "정확히 한 쌍의 대변만 평행",
      "모든 $m$",
      "각각의 평행한 대변 쌍",
    ]);
    const g = readGraph(item),
      a = Number(figureLabel(g, /^P\((\d+),0\)$/)[1]),
      b = Number(figureLabel(g, /^Q\(0,(\d+)\)$/)[1]),
      c = Number(figureLabel(g, /^R\(-(\d+),0\)$/)[1]);
    insist(a > 0 && b > 0 && c > 0 && a !== c, "서로 다른 양의 축절편");
    hasLabel(g, `S(0,${c}m)`);
    const candidates = [-b / a, (-a * b) / (c * c)];
    insist(
      candidates.every((x) => x < 0) && !near(candidates[0], candidates[1]),
      "두 음수 경우의 독립성",
    );
    const S = g.polygons[0]?.points[3];
    insist(S && near(S[0], 0) && S[1] < 0, "음의 y절편");
    const drawn = S[1] / c;
    insist(
      candidates.some((x) => near(x, drawn)),
      "그림이 사다리꼴 경우가 아님",
    );
    checkPolygon(
      g,
      [[a, 0], [0, b], [-c, 0], S],
      [`P(${a},0)`, `Q(0,${b})`, `R(-${c},0)`, `S(0,${c}m)`],
    );
    // Cross products of opposite direction vectors are linear in m; solve each, then substitute.
    const parallel = (x: number) => [
      near(a * c * x + b * c, 0),
      near(a * b + c * c * x, 0),
    ];
    insist(
      candidates.every((x) => parallel(x).filter(Boolean).length === 1),
      "정확히 한 평행변 쌍 조건",
    );
    return {
      answer: `m=${fmt(candidates[0])} (PQ∥RS), ${fmt(candidates[1])} (QR∥SP)`,
      parameters: { a, b, c },
    };
  },
});
