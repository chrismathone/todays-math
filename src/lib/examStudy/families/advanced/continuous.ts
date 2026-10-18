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
  checkRubric,
  draft,
  equalFraction,
  fraction,
  fractionText,
  range,
  requireMatch,
  rubric,
  setText,
  type Fraction,
} from "./shared";

const WRITTEN_CHECKS = [...BASIC_CHECKS, "native-rubric"] as const;
interface QuadraticProblem {
  endpoint: number;
  bound: number;
  distance: number;
  side: 1 | -1;
  sign: 1 | -1;
}

export function readQuadratic(content: string): QuadraticProblem {
  const m = requireMatch(
    content,
    /f\(x\)=(1|-1)\(x²-2ax\)\+b, D=\{x∈R \| x (≥|≤) (-?\d+)\}, E=\{y∈R \| y (≥|≤) (-?\d+)\}/,
  );
  const target = requireMatch(content, /f\((-?\d+)\)의 (최솟값|최댓값)/);
  requireMatch(content, /D에서 E로의 일대일대응/);
  requireMatch(content, /가능한 \(a,b\)의 조건을 모두 밝히고/);
  requireMatch(content, /일대일성과 E 전체로의 대응을 각각 정당화/);
  const endpoint = +m[3]!,
    side = m[2] === "≥" ? 1 : -1,
    sign = +m[1]! as 1 | -1;
  assert((sign === 1 ? "≥" : "≤") === m[4], "이차함수의 치역 방향 오류");
  assert((sign === 1 ? "최솟값" : "최댓값") === target[2], "극값 방향 오류");
  const distance = side * (+target[1]! - endpoint);
  assert(distance > 0, "평가점이 정의역 내부가 아닙니다.");
  return { endpoint, bound: +m[5]!, distance, side, sign };
}

/**
 * Polynomial identity proof, independent of authored answers:
 * vertex a inside D gives f(a-t)=f(a+t); otherwise monotone. Continuity and
 * unboundedness force f(d)=m for onto, then the difference from the endpoint
 * is sign*s*(s+2*side*(d-a)). Every feasible side*(d-a)>=0 is attained.
 */
export function solveQuadratic(p: QuadraticProblem) {
  const { endpoint: d, bound: m, distance: s, side, sign } = p;
  return {
    relation: side === 1 ? "a≤" : "a≥",
    bConstant: m - sign * d * d,
    bCoefficient: 2 * sign * d,
    extremum: m + sign * s * s,
    equalityA: d,
    equalityB: m + sign * d * d,
  };
}

export function quadraticAnswer(p: QuadraticProblem): string {
  const s = solveQuadratic(p);
  return (
    `${s.relation}${p.endpoint}, b=${s.bConstant}+(${s.bCoefficient})a; ` +
    `${p.sign === 1 ? "최솟값" : "최댓값"} ${s.extremum}; (a,b)=(${s.equalityA},${s.equalityB})`
  );
}

const quadraticDomain: CanonicalParams[] = [];
for (const endpoint of [-3, 0, 2])
  for (const bound of [-4, 1, 5])
    for (const distance of [1, 2, 3])
      for (const side of [1, -1])
        for (const sign of [1, -1])
          quadraticDomain.push({ endpoint, bound, distance, side, sign });

function buildQuadratic(p: CanonicalParams): ExamStudyDraft {
  const d = p.endpoint as number,
    m = p.bound as number,
    s = p.distance as number;
  const side = p.side as 1 | -1,
    sign = p.sign as 1 | -1;
  const target = d + side * s;
  const r = rubric([
    [
      "injective-domain",
      `꼭짓점의 x좌표 a가 정의역 내부에 있으면 대칭인 두 입력의 함수값이 같으므로 ${side === 1 ? `a≤${d}` : `a≥${d}`}이어야 한다.`,
      "대칭축 양쪽의 두 입력을 실제로 택해 반례를 보인다.",
      "치역의 끝값만 맞추고 단사 조건을 생략한다.",
    ],
    [
      "onto-endpoint",
      `단조인 반직선에서 치역의 끝값은 f(${d})이므로 E 전체를 덮으려면 b=${m - sign * d * d}+(${2 * sign * d})a이다.`,
      "완전제곱식과 반직선의 연속적인 함수값 범위로 전사를 증명한다.",
      "E 안에 들어가는 조건을 E 전체를 덮는 조건과 혼동한다.",
    ],
    [
      "extremum-equality",
      `f(${target})=${m + sign * s * s}+(${2 * sign * s})·(${side}·(${d}-a))이고 괄호 안은 0 이상이므로 ${sign === 1 ? "최솟값" : "최댓값"}은 ${m + sign * s * s}, 등호는 (a,b)=(${d},${m + sign * d * d})에서 성립한다.`,
      "반직선에서 완전제곱식의 꼭짓점 위치와 끝점 값을 이용한다.",
      "정의역 밖의 계수나 치역을 덮지 않는 계수로 극값을 만든다.",
    ],
  ]);
  // The author calculates from endpoint geometry; verify reconstructs the
  // polynomial identity from the printed coefficients and half-line signs.
  const answer = `${side === 1 ? "a≤" : "a≥"}${d}, b=${m - sign * d * d}+(${2 * sign * d})a; ${sign === 1 ? "최솟값" : "최댓값"} ${m + sign * s * s}; (a,b)=(${d},${m + sign * d * d})`;
  return draft(
    p,
    `실수 a,b에 대하여 f(x)=${sign}(x²-2ax)+b, D={x∈R | x ${side === 1 ? "≥" : "≤"} ${d}}, E={y∈R | y ${sign === 1 ? "≥" : "≤"} ${m}}이다. ` +
      `f가 D에서 E로의 일대일대응이 되도록 하는 가능한 (a,b)의 조건을 모두 밝히고, 그때 f(${target})의 ${sign === 1 ? "최솟값" : "최댓값"}과 이를 만드는 (a,b)를 구하시오. ` +
      `일대일성과 E 전체로의 대응을 각각 정당화하고 극값의 달성 여부까지 설명하시오.`,
    answer,
    r.criteria.map((c) => c.expected).join("\n"),
    [
      "정의역에서의 대칭축 배제와 단조성",
      "전사 조건으로 끝값 복원",
      "허용 계수 전체에서 극값과 등호 증명",
    ],
    { questionType: "서술형", rubric: r },
  );
}

export const restrictedQuadraticFamily = authoredFamily({
  id: "exam-advanced:restricted-quadratic-bijection",
  title: "반직선의 이차함수 일대일대응과 최적화",
  requirement: "function.restricted-quadratic-bijection",
  unit: "함수와 그래프",
  domain: quadraticDomain,
  written: true,
  checks: WRITTEN_CHECKS,
  boundaries: [
    "왼쪽/오른쪽 반직선",
    "위/아래로 열린 포물선",
    "꼭짓점이 경계인 등호",
    "정의역 내부의 대칭 입력 반례",
    "단사와 전사의 독립 필요성",
  ],
  build: buildQuadratic,
  verify: (item) =>
    checked(WRITTEN_CHECKS, () => {
      const p = readQuadratic(item.content),
        solved = solveQuadratic(p);
      assertAnswer(item, quadraticAnswer(p));
      checkRubric(item, [
        "injective-domain",
        "onto-endpoint",
        "extremum-equality",
      ]);
      const { endpoint: d, bound: m, distance: s, sign, side } = p;
      const f = (x: number, a: number, b: number) =>
        sign * (x * x - 2 * a * x) + b;
      assert(
        f(d + side * s, solved.equalityA, solved.equalityB) === solved.extremum,
        "등호 계수의 원식 검산 실패",
      );
      // Without injectivity, vertex at the requested input and vertex value m
      // still give an onto map, but the requested extremum becomes m.
      const a = d + side * s,
        b = m + sign * a * a;
      assert(
        f(a, a, b) === m && m !== solved.extremum,
        "단사 조건 제거 반례 실패",
      );
      // Without onto, the entire curve can be shifted by sign without leaving E;
      // the coefficient characterization changes. Same domain and injectivity.
      assert(
        f(d, d, solved.equalityB + sign) !== m,
        "전사 조건 제거 반례 실패",
      );
      assert(
        f(d - 1, d, solved.equalityB) === f(d + 1, d, solved.equalityB),
        "정의역 제한의 필요성 실패",
      );
    }),
});

export function readRadicalArea(content: string): {
  intercept: number;
  height: number;
} {
  const m = requireMatch(content, /A=\((\d+),0\), B=\(0,(\d+)\)/);
  const curve = requireMatch(content, /y=√\((\d+)-x\)/);
  requireMatch(content, /x≥0을 만족하는 점/); // Exact authored domain clause, not internal parameters.
  requireMatch(content, /삼각형 ABP의 넓이의 최댓값/);
  assert(+m[1]! === +curve[1]!, "곡선과 절편의 연결이 다릅니다.");
  const intercept = +m[1]!,
    height = +m[2]!;
  assert(
    intercept > 0 && height > 0 && intercept <= 4 * height * height,
    "면적 부호 가지가 달라집니다.",
  );
  return { intercept, height };
}

/** Direct shoelace determinant + all critical/end points, with a sign proof. */
export function solveRadicalArea(p: { intercept: number; height: number }) {
  const k = p.intercept,
    h = p.height,
    t = k / (2 * h);
  assert(t > 0 && t * t < k, "내부 극대점이 아닙니다.");
  // y lies in [0,sqrt(k)]; k>=h² proves sqrt(k)<=k/h, so determinant
  // h*y²-k*y never changes sign there. Separately, k<4h² puts its vertex
  // t=k/(2h) strictly inside this interval.
  assert(k >= h * h, "절댓값 넓이의 부호를 보장하지 못합니다.");
  const area = (y: number) => Math.abs(k * h - h * (k - y * y) - k * y) / 2;
  const value = fraction(k * k, 8 * h);
  assert(
    area(t) >= area(0) - 1e-8 && area(t) >= area(Math.sqrt(k)) - 1e-8,
    "끝점 비교 실패",
  );
  return { y: t, x: k - t * t, value, area };
}

const areaDomain: CanonicalParams[] = [];
for (const height of [3, 4, 5, 6, 7])
  for (const vertexY of range(Math.ceil(height / 2), height - 1))
    areaDomain.push({ height, intercept: 2 * height * vertexY });

export const radicalAreaFamily = authoredFamily({
  id: "exam-advanced:radical-triangle-area",
  title: "근호곡선 위 움직이는 점과 넓이의 최댓값",
  requirement: "function.radical-area-maximum",
  unit: "무리함수",
  domain: areaDomain,
  boundaries: [
    "근호의 비음수 가지",
    "x≥0로 정해지는 유계 구간",
    "축 위 퇴화 끝점",
    "완전제곱의 내부 극대점",
    "넓이 절댓값 부호",
  ],
  build: (p) => {
    const k = p.intercept as number,
      h = p.height as number,
      t = k / (2 * h);
    const answer = fractionText(fraction(h * t * t, 2));
    return draft(
      p,
      `좌표평면 위의 A=(${k},0), B=(0,${h})를 고정한다. 점 P는 곡선 y=√(${k}-x) 위에서 x≥0을 만족하는 점(축 위의 점 포함)을 움직인다. 삼각형 ABP의 넓이의 최댓값을 구하시오.`,
      answer,
      `t=y≥0으로 놓으면 x=${k}-t²≥0이므로 0≤t≤√${k}이다. 좌표 넓이 공식으로 넓이는 |${h}t²-${k}t|/2이다. ` +
        `√${k}≤${k}/${h}이므로 이 구간에서 ${h}t²-${k}t≤0이다. ` +
        `넓이=${h}/2·(${t * t}-(t-${t})²)이다. t=${t}는 구간 안에 있고, P=(${k - t * t},${t})일 때 최댓값 ${answer}를 갖는다.`,
      [
        "근호의 주값과 정의역을 치환 구간으로 옮김",
        "좌표 넓이의 부호를 전구간 확인",
        "완전제곱과 등호 달성",
      ],
    );
  },
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readRadicalArea(item.content),
        solved = solveRadicalArea(p);
      assertAnswer(item, fractionText(solved.value));
      assert(
        Math.abs(solved.y - Math.sqrt(p.intercept - solved.x)) < 1e-8 &&
          solved.x > 0,
        "원래 근호곡선과 부호 검산 실패",
      );
      // Without the curve, P=(k,h) is permitted and changes the largest area.
      assert(
        (p.intercept * p.height) / 2 > solved.value[0] / solved.value[1],
        "곡선 관계가 불필요합니다.",
      );
      // Without x>=0, y can grow without bound, and determinant grows quadratically.
      assert(
        solved.area(p.intercept + 2 * p.height) >
          solved.value[0] / solved.value[1],
        "정의역 조건이 불필요합니다.",
      );
      assert(
        Math.abs(
          Math.abs(p.height * solved.y * solved.y + p.intercept * solved.y) /
            2 -
            solved.value[0] / solved.value[1],
        ) > 0,
        "음의 제곱근 배제 반례가 없습니다.",
      );
    }),
});

export interface LevelProblem {
  zero: number;
  pole: number;
  left: number;
  right: number;
  hole: number;
  leftClosed: boolean;
  rightClosed: boolean;
}

export function readLevels(content: string): LevelProblem {
  const m = requireMatch(
    content,
    /f\(x\)=\|\(x-\((-?\d+)\)\)\/\(x-\((-?\d+)\)\)\|/,
  );
  const d = requireMatch(
    content,
    /D=(\[|\()(-?\d+), (-?\d+)(\]|\)) \\ \{(-?\d+), (-?\d+)\}/,
  );
  requireMatch(content, /교점이 정확히 1개/);
  requireMatch(content, /정수 k를 모두/);
  const p = {
    zero: +m[1]!,
    pole: +m[2]!,
    left: +d[2]!,
    right: +d[3]!,
    hole: +d[6]!,
    leftClosed: d[1] === "[",
    rightClosed: d[4] === "]",
  };
  assert(
    +d[5]! === p.pole &&
      p.left < p.pole &&
      p.pole < p.hole &&
      p.hole < p.right &&
      p.right <= p.zero,
    "제한/결손 정의역 오류",
  );
  return p;
}

/** Exact roots of EACH signed branch, checked against both endpoints and holes. */
export function levelRoots(
  p: LevelProblem,
  k: number,
  omit?: "hole" | "interval" | "absolute",
): Fraction[] {
  if (k < 0 && omit !== "absolute") return [];
  const candidates: Fraction[] = [];
  for (const signedLevel of omit === "absolute"
    ? [k]
    : k === 0
      ? [0]
      : [k, -k]) {
    if (signedLevel === 1) continue; // a!=b, so x-a=x-b has no solution.
    const root = fraction(p.zero - signedLevel * p.pole, 1 - signedLevel);
    const [n, d] = root;
    if (n === p.pole * d || (omit !== "hole" && n === p.hole * d)) continue;
    if (
      omit !== "interval" &&
      (n < p.left * d ||
        n > p.right * d ||
        (!p.leftClosed && n === p.left * d) ||
        (!p.rightClosed && n === p.right * d))
    )
      continue;
    // Substitute into the ORIGINAL equation using integer cross-products.
    assert(
      (omit === "absolute" ? n - p.zero * d : Math.abs(n - p.zero * d)) ===
        k * (omit === "absolute" ? n - p.pole * d : Math.abs(n - p.pole * d)),
      "유리함수 원식 검산 실패",
    );
    if (!candidates.some((r) => equalFraction(r, root))) candidates.push(root);
  }
  return candidates;
}

export function levelTailBound(p: LevelProblem): number {
  // For k>bound, b-u/(k-1) is strictly between L,b and b+u/(k+1)
  // is strictly between b,R, and neither is the one fixed hole. Thus exactly 2.
  const u = p.zero - p.pole;
  return (
    Math.ceil(
      Math.max(
        1 + u / (p.pole - p.left),
        u / (p.right - p.pole) - 1,
        Math.abs((p.hole - p.zero) / (p.hole - p.pole)),
      ),
    ) + 1
  );
}
export function solveLevels(
  p: LevelProblem,
  omit?: "hole" | "interval" | "absolute",
): number[] {
  return range(0, levelTailBound(p)).filter(
    (k) => levelRoots(p, k, omit).length === 1,
  );
}

const levelDomain: CanonicalParams[] = [];
for (const pole of [-3, 0, 4])
  for (const u of [6, 12])
    for (const d of [1, 2, 3, 4])
      for (const j of [1, 2, 3])
        for (const h of [2, 3, 5])
          for (const leftClosed of [false, true])
            for (const rightClosed of [false, true])
              if (u % (h + 1) === 0 && h > j - 1)
                levelDomain.push({
                  zero: pole + u,
                  pole,
                  left: pole - d,
                  right: pole + u / j,
                  hole: pole + u / (h + 1),
                  leftClosed,
                  rightClosed,
                });

export const absoluteRationalFamily = authoredFamily({
  id: "exam-advanced:absolute-rational-levels",
  title: "결손 정의역에서 절댓값 유리함수의 교점 수",
  requirement: "function.absolute-rational-level-count",
  unit: "유리함수",
  domain: levelDomain,
  boundaries: [
    "k<0, k=0, k=1, k>1",
    "극점과 별도 결손점",
    "양 끝점 열린/닫힌 네 조합",
    "정수 경계와 그 직전·직후",
    "무한 꼬리에서 항상 2개임의 증명",
  ],
  build: (p) => {
    const zero = p.zero as number,
      pole = p.pole as number,
      left = p.left as number,
      right = p.right as number,
      hole = p.hole as number;
    const u = zero - pole,
      bound = Math.ceil(2 + u / (pole - left) + u / (right - pole));
    // Authored branch inequalities; the verifier instead solves and substitutes
    // signed rational roots with exact integer arithmetic.
    const levels = range(0, bound).filter((k) => {
      let count = 0;
      if (k > 1) {
        const x = pole - u / (k - 1);
        if (p.leftClosed ? x >= left : x > left) count++;
      }
      const x = pole + u / (k + 1);
      if ((p.rightClosed ? x <= right : x < right) && x !== hole) count++;
      return count === 1;
    });
    return draft(
      p,
      `함수 f(x)=|(x-(${zero}))/(x-(${pole}))|의 정의역은 D=${p.leftClosed ? "[" : "("}${left}, ${right}${p.rightClosed ? "]" : ")"} \\ {${pole}, ${hole}}이다. ` +
        `그래프 y=f(x)와 직선 y=k의 교점이 정확히 1개가 되게 하는 정수 k를 모두 구하시오.`,
      setText(levels),
      `k<0이면 교점은 없다. k=0에서는 x=${zero}의 정의역 포함 여부를 검사한다. ` +
        `k>0에서 두 부호를 나누면 x=${pole}-${u}/(k-1) (k≠1), x=${pole}+${u}/(k+1)이다. ` +
        `k=1의 첫 식은 분모가 0인 예외로서 실제 해가 없고, 두 번째 식만 검사한다. ` +
        `각 후보에 양 끝점 ${p.leftClosed ? "포함" : "제외"}/${p.rightClosed ? "포함" : "제외"}과 x≠${hole}를 적용한다. ` +
        `k>${bound}에서는 두 해가 각각 극점의 왼쪽과 오른쪽 내부에 있고 결손점과도 다르므로 모두 2개이다. ` +
        `나머지 정수 경계를 빠짐없이 검사하면 ${setText(levels)}이다.`,
      [
        "절댓값의 두 유리함수 가지와 k=1의 예외",
        "유한 구간·극점·별도 결손점의 동시 적용",
        "모든 정수 경계와 무한 꼬리의 완전성",
      ],
    );
  },
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readLevels(item.content),
        levels = solveLevels(p),
        bound = levelTailBound(p);
      assertAnswer(item, setText(levels));
      for (const k of range(bound + 1, bound + 4))
        assert(levelRoots(p, k).length === 2, "무한 꼬리의 두 가지 확인 실패");
      assert(
        JSON.stringify(solveLevels(p, "hole")) !== JSON.stringify(levels),
        "결손점이 정답에 필요하지 않습니다.",
      );
      assert(
        JSON.stringify(solveLevels(p, "interval")) !== JSON.stringify(levels),
        "제한 정의역이 정답에 필요하지 않습니다.",
      );
      assert(
        JSON.stringify(solveLevels(p, "absolute")) !== JSON.stringify(levels),
        "절댓값 가지가 정답에 필요하지 않습니다.",
      );
    }),
});
