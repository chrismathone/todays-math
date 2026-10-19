import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import { assert, checked, draft, selectParams } from "./shared";
import {
  Q,
  q,
  type ExactPoint,
  type Interval,
  pointText,
  samePoint,
  norm,
  determinant,
  linearSolve,
  circumcenter,
  exactSqrt,
  interval,
  isolateRoot,
} from "./remainingExact";

const CHECKS = ["independent-solution", "essential-conditions"] as const;
const TEST_FILE = "src/__tests__/unit/examStudyAdvancedRemaining.test.ts";
const integer = "(-?\\d+)";
const rational = "(-?\\d+(?:/[1-9]\\d*)?)";
function match(text: string, pattern: RegExp): RegExpMatchArray {
  const found = text.match(pattern);
  assert(found, "필수 발문 조건이 없거나 변경되었습니다.");
  return found;
}
const identity = (p: CanonicalParams) =>
  JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));

/** Local factory: evidence must point to the tests that actually exhaust these
 * domains, rather than the older advanced helper's fixed test-file claim. */
function remainingFamily(config: {
  id: string;
  title: string;
  requirement: StudyRequirementId;
  course: ExamStudyFamily["course"];
  unit: string;
  domain: readonly CanonicalParams[];
  boundaries: readonly string[];
  build: (p: CanonicalParams) => ExamStudyDraft;
  inspect: (item: ExamStudyDraft) => CanonicalParams;
}): ExamStudyFamily {
  const allowed = new Set(config.domain.map(identity));
  return {
    id: config.id,
    version: "1.0.0",
    title: config.title,
    course: config.course,
    unitIds: [config.unit],
    unitSections: [config.unit],
    source: "authored",
    fulfills: [{ requirement: config.requirement, level: "full" }],
    formats: ["단답형"],
    difficulties: ["심화하"],
    representation: "text",
    figureKinds: [],
    paramDomain: {
      kind: "finite",
      size: config.domain.length,
      enumerate: () => structuredClone(config.domain),
    },
    evidence: {
      testFile: TEST_FILE,
      sampleCount: config.domain.length,
      boundaryCases: config.boundaries,
      checkedRequirements: [config.requirement],
      checks: CHECKS,
    },
    generate: (seed, variant) =>
      config.build(selectParams(config.domain, seed, variant)),
    canonicalParams: (item) => structuredClone(item.parameters),
    verify: (item) =>
      checked(CHECKS, () => {
        assert(
          item.questionType === "단답형" &&
            item.figureSpec === null &&
            !item.rubric &&
            !item.distractors,
          "이 가족은 완전한 텍스트 단답형만 지원합니다.",
        );
        const printed = config.inspect(item);
        assert(
          allowed.has(identity(printed)),
          "증명된 유한 저작 영역 밖입니다.",
        );
        assert(
          identity(printed) === identity(item.parameters),
          "인쇄 조건과 canonical 매개변수 불일치",
        );
      }),
  };
}

export interface ReuseProblem {
  h: Q;
  k: Q;
  px: Q;
  py: Q;
}
export function readQuadraticReuse(
  item: Pick<ExamStudyDraft, "content">,
): ReuseProblem {
  const m = match(
    item.content,
    new RegExp(
      `^이차함수 f\\(x\\)=ax²\\+bx\\+c의 그래프는 꼭짓점 V\\(${integer}, ${integer}\\)와 ` +
        `그래프 위의 점 P\\(${integer}, ${integer}\\)를 갖는다\\. ` +
        `이때 같은 계수 a, b, c를 다른 위치에 놓은 이차함수 g\\(x\\)=cx²\\+ax\\+b의 꼭짓점 좌표를 구하시오\\.$`,
    ),
  );
  return {
    h: Q.read(m[1]!),
    k: Q.read(m[2]!),
    px: Q.read(m[3]!),
    py: Q.read(m[4]!),
  };
}

/** Independent route: vertex symmetry gives a third point; interpolate the
 * three points by exact Gaussian elimination. Generator uses vertex form. */
export function solveQuadraticReuse(p: ReuseProblem) {
  assert(!p.px.eq(p.h), "꼭짓점만으로는 첫 이차함수가 결정되지 않습니다.");
  const mirror = p.h.mul(q(2)).sub(p.px);
  const [a, b, c] = linearSolve(
    [p.h, p.px, mirror].map((x) => [x.sq(), x, q(1)]),
    [p.k, p.py, p.py],
  ) as [Q, Q, Q];
  assert(!a.eq(q(0)) && !c.eq(q(0)), "두 함수 모두 이차함수여야 합니다.");
  assert(!a.eq(b) && !b.eq(c) && !c.eq(a), "같은 계수로 무의미한 재배치");
  assert(a.mul(p.h).mul(q(2)).add(b).eq(q(0)), "첫 그래프 대칭축 오류");
  const x = a.neg().div(c.mul(q(2))),
    y = c.mul(x.sq()).add(a.mul(x)).add(b);
  assert(c.mul(x).mul(q(2)).add(a).eq(q(0)), "둘째 그래프 대칭축 오류");
  const vertex: ExactPoint = [x, y];
  return { a, b, c, vertex };
}
function reuseSolution(
  p: ReuseProblem,
  s: ReturnType<typeof solveQuadraticReuse>,
): string {
  return (
    `첫 그래프를 꼭짓점형으로 쓰면 f(x)=a(x-(${p.h}))²+(${p.k})이다. ` +
    `P를 대입하여 ${p.py}=a·(${p.px.sub(p.h)})²+(${p.k})이므로 a=${s.a}이다. ` +
    `전개하면 (a,b,c)=(${s.a}, ${s.b}, ${s.c})이다. ` +
    `재배치한 식은 g(x)=(${s.c})x²+(${s.a})x+(${s.b})이다. ` +
    `완전제곱으로 정리하면 g(x)=(${s.c})(x-(${s.vertex[0]}))²+(${s.vertex[1]})이다. ` +
    `따라서 축은 x=${s.vertex[0]}이고 꼭짓점은 ${pointText(s.vertex)}이다.`
  );
}
const reuseDomain: CanonicalParams[] = [];
for (const a of [-2, -1, 1, 2])
  for (const h of [-2, -1, 1, 2])
    for (const k of [-3, 2]) {
      const b = -2 * a * h,
        c = a * h * h + k;
      const sameVertex = -a === 2 * c * h && 4 * b * c - a * a === 4 * c * k;
      if (c !== 0 && new Set([a, b, c]).size === 3 && !sameVertex)
        reuseDomain.push({ a, h, k });
    }
export const quadraticCoefficientReuseFamily = remainingFamily({
  id: "exam-advanced:quadratic-coefficient-reuse",
  title: "첫 포물선의 계수를 둘째 포물선에 재배치",
  requirement: "graph.translated-coefficient-reuse",
  course: "중3",
  unit: "이차함수와 그래프",
  domain: reuseDomain,
  boundaries: [
    "두 포물선의 위/아래 열림",
    "양/음의 대칭축",
    "서로 다른 세 계수",
    "0이 아닌 둘째 최고차항",
    "유리수 꼭짓점",
    "그림 없이 모든 좌표를 본문에 명시",
  ],
  build: (p) => {
    const a = q(p.a as number),
      h = q(p.h as number),
      k = q(p.k as number);
    const b = a.mul(h).mul(q(-2)),
      c = a.mul(h.sq()).add(k);
    const problem = { h, k, px: h.add(q(1)), py: k.add(a) };
    const x = a.neg().div(c.mul(q(2))),
      vertex: ExactPoint = [x, b.sub(a.sq().div(c.mul(q(4))))];
    return draft(
      p,
      `이차함수 f(x)=ax²+bx+c의 그래프는 꼭짓점 V(${h}, ${k})와 그래프 위의 점 P(${problem.px}, ${problem.py})를 갖는다. ` +
        `이때 같은 계수 a, b, c를 다른 위치에 놓은 이차함수 g(x)=cx²+ax+b의 꼭짓점 좌표를 구하시오.`,
      pointText(vertex),
      reuseSolution(problem, { a, b, c, vertex }),
      [
        "꼭짓점·입사점에서 세 계수 복원",
        "세 계수의 역할을 모두 바꾸어 둘째 이차함수 구성",
        "완전제곱과 유리수 꼭짓점",
      ],
    );
  },
  inspect: (item) => {
    const p = readQuadraticReuse(item),
      s = solveQuadraticReuse(p);
    assert(
      item.answer === pointText(s.vertex),
      "인쇄 조건의 독립 꼭짓점과 정답 불일치",
    );
    assert(
      item.solution === reuseSolution(p, s),
      "풀이의 복원·재배치·완전제곱 증명 불일치",
    );
    assert(p.px.sub(p.h).eq(q(1)), "저작 입사점 영역 밖입니다.");
    return {
      a: Number(s.a.toString()),
      h: Number(p.h.toString()),
      k: Number(p.k.toString()),
    };
  },
});

export interface RadicalCircleProblem {
  a: Q;
  k: Q;
  lower: Q;
  upper: Q;
  cap: Q;
  C: ExactPoint;
}
export function readRadicalInverseCircle(
  item: Pick<ExamStudyDraft, "content">,
): RadicalCircleProblem {
  const m = match(
    item.content,
    new RegExp(
      `^함수 f\\(x\\)=√\\(\\(${integer}\\)x\\+\\(${integer}\\)\\)의 정의역은 \\[${rational}, ${integer}\\]이고 치역은 \\[0, √\\(${integer}\\)\\]이다\\. ` +
        `g는 f의 역함수이며 g의 정의역은 \\[0, √\\(${integer}\\)\\]이다\\. ` +
        `점 A는 y=f\\(x\\)의 그래프 위에, 점 B는 y=g\\(x\\)의 그래프 위에 있다\\. ` +
        `A와 B는 직선 ℓ: y=-x\\+b 위의 서로 다른 점이다\\. ` +
        `C\\(${integer}, ${integer}\\)와 A, B는 한 직선 위에 있지 않다\\. ` +
        `삼각형 ABC의 외접원의 중심은 y축 위에 있다\\. 실수 b의 값을 구하시오\\.$`,
    ),
  );
  const p = {
    a: Q.read(m[1]!),
    k: Q.read(m[2]!),
    lower: Q.read(m[3]!),
    upper: Q.read(m[4]!),
    cap: Q.read(m[5]!),
    C: [Q.read(m[7]!), Q.read(m[8]!)] as ExactPoint,
  };
  assert(
    p.a.cmp(q(0)) > 0 && p.upper.cmp(p.lower) > 0,
    "명시된 단사 구간 오류",
  );
  assert(
    p.lower.eq(p.k.neg().div(p.a)) &&
      p.cap.eq(p.a.mul(p.upper).add(p.k)) &&
      p.cap.cmp(q(0)) > 0,
    "근호 정의역·치역 오류",
  );
  assert(
    p.cap.eq(Q.read(m[6]!)),
    "역함수 정의역은 원함수의 치역이어야 합니다.",
  );
  return p;
}
export const onRadical = (p: RadicalCircleProblem, A: ExactPoint) =>
  A[0].cmp(p.lower) >= 0 &&
  A[0].cmp(p.upper) <= 0 &&
  A[1].cmp(q(0)) >= 0 &&
  A[1].sq().eq(p.a.mul(A[0]).add(p.k));
export const onInverse = (p: RadicalCircleProblem, B: ExactPoint) =>
  B[0].cmp(q(0)) >= 0 &&
  B[0].sq().cmp(p.cap) <= 0 &&
  B[1].eq(B[0].sq().sub(p.k).div(p.a));
const radicalX = (p: RadicalCircleProblem, t: Q) => t.sq().sub(p.k).div(p.a);
export interface RadicalBranch {
  z: Q;
  t: Q | null;
  reason: string;
  A?: ExactPoint;
  B?: ExactPoint;
  b?: Q;
  center?: ExactPoint;
  det?: Q;
}
function inspectRadicalRoot(
  p: RadicalCircleProblem,
  z: Q,
  t: Q | null,
): RadicalBranch {
  if (t === null) return { z, t, reason: "z<0이므로 실수 t가 없다" };
  if (t.cmp(q(0)) < 0) return { z, t, reason: "제곱 전 t≥0 조건 위반" };
  const x = radicalX(p, t),
    A: ExactPoint = [x, t],
    B: ExactPoint = [t, x],
    b = x.add(t);
  if (!onRadical(p, A) || !onInverse(p, B))
    return { z, t, reason: "원함수 또는 역함수의 명시된 정의역 밖" };
  if (samePoint(A, B)) return { z, t, reason: "A=B이므로 삼각형이 아니다" };
  const det = determinant(A, B, p.C);
  if (det.eq(q(0))) return { z, t, reason: "A,B,C 공선으로 외접원 없음" };
  const center = circumcenter(A, B, p.C);
  if (!center[0].eq(q(0)))
    return { z, t, reason: "외접원의 중심이 y축 위에 있지 않다" };
  assert(
    norm(A).eq(norm(B)) && norm(A).eq(norm(p.C)) && norm(A).cmp(q(0)) > 0,
    "원식 원 검산 실패",
  );
  return { z, t, reason: "허용", A, B, b, center, det };
}
function allRadicalBranches(
  p: RadicalCircleProblem,
  zs: readonly Q[],
): RadicalBranch[] {
  return zs.flatMap((z) =>
    z.cmp(q(0)) < 0
      ? [inspectRadicalRoot(p, z, null)]
      : (z.eq(q(0)) ? [q(0)] : [exactSqrt(z).neg(), exactSqrt(z)]).map((t) =>
          inspectRadicalRoot(p, z, t),
        ),
  );
}
export function solveRadicalInverseCircle(p: RadicalCircleProblem) {
  const coefficient = p.a.sq().sub(p.k.mul(q(2))),
    constant = p.k.sq().sub(p.a.sq().mul(norm(p.C)));
  const discriminant = coefficient.sq().sub(constant.mul(q(4)));
  assert(discriminant.cmp(q(0)) > 0, "저작 영역은 서로 다른 z근을 갖습니다.");
  const root = exactSqrt(discriminant);
  const zs = [
    coefficient.neg().sub(root).div(q(2)),
    coefficient.neg().add(root).div(q(2)),
  ];
  const branches = allRadicalBranches(p, zs),
    accepted = branches.filter((branch) => branch.reason === "허용");
  assert(
    accepted.length === 1,
    "원래 조건의 전체 허용 해가 유일하지 않습니다.",
  );
  return { coefficient, constant, zs, branches, accepted: accepted[0]! };
}
function radicalSolution(
  p: RadicalCircleProblem,
  s: ReturnType<typeof solveRadicalInverseCircle>,
): string {
  const good = s.accepted,
    t = good.t!,
    A = good.A!,
    B = good.B!;
  const branches = s.branches
    .map(
      (branch) =>
        `z=${branch.z}${branch.t === null ? "" : `, t=${branch.t}`}: ${branch.reason}`,
    )
    .join("; ");
  return (
    `a=${p.a}>0이므로 f는 주어진 구간에서 일대일이다. y=√((${p.a})x+(${p.k}))에서는 y≥0을 먼저 보존한다. ` +
    `역함수는 g(x)=(x²-(${p.k}))/(${p.a}), 0≤x≤√(${p.cap})이고 치역은 [${p.lower}, ${p.upper}]이다. ` +
    `A=((t²-(${p.k}))/(${p.a}),t), B=(u,(u²-(${p.k}))/(${p.a}))로 두면 0≤t,u≤√(${p.cap})이다. ` +
    `직선 조건에서 (t-u)((t+u)/(${p.a})+1)=0이고 둘째 인수는 양수이므로 t=u이다. 따라서 A,B의 좌표교환은 두 입사식과 직선 조건에서 증명된다. ` +
    `A≠B이므로 두 점에서 같은 거리에 있는 외심 (H,J)는 H=J를 만족한다. y축 조건 H=0으로 외심은 (0,0)이다. ` +
    `C의 제곱거리는 ${norm(p.C)}이므로 ((t²-(${p.k}))/(${p.a}))²+t²=${norm(p.C)}이다. ` +
    `z=t²로 놓으면 z²+(${s.coefficient})z+(${s.constant})=0이고 모든 z근은 {${s.zs.join(", ")}}이다. ` +
    `부호·정의역·퇴화를 원식에서 검사하면 ${branches}이다. ` +
    `허용 해는 t=${t}, A=${pointText(A)}, B=${pointText(B)}뿐이다. ` +
    `원래 근호식은 (${p.a})·(${A[0]})+(${p.k})=${t.sq()}와 t≥0, 역함수식은 g(${B[0]})=${B[1]}로 검산된다. ` +
    `A와 B의 x+y는 모두 ${good.b}이고 det(B-A,C-A)=${good.det}≠0이다. ` +
    `세 점의 원점까지 제곱거리는 모두 ${norm(A)}이고 실제 외심은 ${pointText(good.center!)}이다. 따라서 b=${good.b}이다.`
  );
}

// Every entry changes actual radical coefficients/root structure/domain; no
// rotations of C, formats, seeds or answer-label variants multiply capacity.
const radicalDomain: CanonicalParams[] = [
  { a: 1, k: 3, upper: 0, cx: -1, cy: -2 },
  { a: 1, k: 9, upper: 0, cx: -1, cy: 8 },
  { a: 2, k: 7, upper: 0, cx: -1, cy: 3 },
  { a: 3, k: 13, upper: 0, cx: -1, cy: 4 },
  { a: 1, k: 1, upper: 10, cx: 3, cy: -8 },
  { a: 2, k: 0, upper: 10, cx: -8, cy: -4 },
  { a: 1, k: 5, upper: 0, cx: 0, cy: 5 },
];
function radicalProblem(params: CanonicalParams): RadicalCircleProblem {
  const a = q(params.a as number),
    k = q(params.k as number),
    upper = q(params.upper as number);
  return {
    a,
    k,
    upper,
    lower: k.neg().div(a),
    cap: a.mul(upper).add(k),
    C: [q(params.cx as number), q(params.cy as number)],
  };
}

export interface DeletionWitness {
  omitted: "radical" | "inverse" | "circle";
  A: ExactPoint;
  B: ExactPoint;
  b: Q;
  center: ExactPoint;
}
/** Rational witnesses keep even the omitted graph's domain/range box. Thus the
 * counterexample breaks incidence, rather than merely exploiting a bad sign. */
export function radicalDeletionWitnesses(
  p: RadicalCircleProblem,
  answer: Q,
): DeletionWitness[] {
  const found: DeletionWitness[] = [];
  for (const omitted of ["radical", "inverse", "circle"] as const) {
    for (let n = 0; n <= 240; n++) {
      const t = q(n, 12);
      if (t.sq().cmp(p.cap) > 0) break;
      const x = radicalX(p, t),
        b = x.add(t);
      if (b.eq(answer) || b.eq(p.C[0].add(p.C[1]))) continue;
      let A: ExactPoint = [x, t],
        B: ExactPoint = [t, x];
      if (omitted !== "circle") {
        const y = omitted === "inverse" ? t : x;
        if (y.eq(p.C[1])) continue;
        const j = x
          .sq()
          .add(t.sq())
          .sub(norm(p.C))
          .div(y.sub(p.C[1]).mul(q(2)));
        if (j.eq(q(0))) continue;
        if (omitted === "inverse") B = [t.sub(j), x.add(j)];
        else A = [x.sub(j), t.add(j)];
      }
      if (samePoint(A, B) || determinant(A, B, p.C).eq(q(0))) continue;
      const box =
        A[0].cmp(p.lower) >= 0 &&
        A[0].cmp(p.upper) <= 0 &&
        A[1].cmp(q(0)) >= 0 &&
        A[1].sq().cmp(p.cap) <= 0 &&
        B[0].cmp(q(0)) >= 0 &&
        B[0].sq().cmp(p.cap) <= 0 &&
        B[1].cmp(p.lower) >= 0 &&
        B[1].cmp(p.upper) <= 0;
      if (!box) continue;
      const center = circumcenter(A, B, p.C);
      if (omitted !== "circle" && !center[0].eq(q(0))) continue;
      if (omitted === "circle" && center[0].eq(q(0))) continue;
      if (omitted !== "radical" && !onRadical(p, A)) continue;
      if (omitted !== "inverse" && !onInverse(p, B)) continue;
      if (omitted === "radical" && onRadical(p, A)) continue;
      if (omitted === "inverse" && onInverse(p, B)) continue;
      assert(
        A[0].add(A[1]).eq(b) && B[0].add(B[1]).eq(b),
        "삭제 증인의 직선 검산 실패",
      );
      found.push({ omitted, A, B, b, center });
      break;
    }
    assert(
      found.some((w) => w.omitted === omitted),
      `${omitted} 조건의 필요성 증인 없음`,
    );
  }
  return found;
}

/** Removing slope -1: two exact sign/monotonicity brackets certify real points
 * on the SAME circle with center (0,1/100). Neither a guessed swapped pair nor
 * rounded numerical roots are used. Interval determinants prove noncollinearity,
 * slope<0, slope≠-1 and an intercept distinct from the original answer. */
export function radicalLineDeletionWitness(
  p: RadicalCircleProblem,
  solution: ReturnType<typeof solveRadicalInverseCircle>,
) {
  const j = q(1, 100),
    t = solution.accepted.t!;
  const start: Interval = t.eq(q(0))
    ? [q(0), q(1, 2)]
    : [t.sub(q(1, 8)), t.add(q(1, 8))];
  const a2 = p.a.sq(),
    baseD = solution.constant.add(a2.mul(j).mul(p.C[1]).mul(q(2)));
  const ta = isolateRoot(
    [q(1), q(0), solution.coefficient, a2.mul(j).mul(q(-2)), baseD],
    start,
  );
  const tb = isolateRoot(
    [
      q(1),
      q(0),
      solution.coefficient.sub(p.a.mul(j).mul(q(2))),
      q(0),
      baseD.add(p.a.mul(j).mul(p.k).mul(q(2))),
    ],
    start,
  );
  const fixed = (x: Q): Interval => [x, x];
  const xOf = (range: Interval) =>
    interval.div(
      interval.sub(interval.mul(range, range), fixed(p.k)),
      fixed(p.a),
    );
  const ax = xOf(ta),
    ay = ta,
    bx = tb,
    by = xOf(tb);
  for (const r of [ta, tb])
    assert(
      r[0].cmp(q(0)) >= 0 && r[1].sq().cmp(p.cap) <= 0,
      "사선 삭제 증인의 정의역 검산 실패",
    );
  const dx = interval.sub(bx, ax),
    dy = interval.sub(by, ay);
  const slope = interval.div(dy, dx);
  const intercept = interval.sub(ay, interval.mul(slope, ax));
  const det = interval.sub(
    interval.mul(dx, interval.sub(fixed(p.C[1]), ay)),
    interval.mul(dy, interval.sub(fixed(p.C[0]), ax)),
  );
  const outside = (r: Interval, x: Q) => r[1].cmp(x) < 0 || r[0].cmp(x) > 0;
  assert(
    outside(dx, q(0)) &&
      outside(det, q(0)) &&
      slope[1].cmp(q(0)) < 0 &&
      outside(slope, q(-1)) &&
      outside(intercept, solution.accepted.b!),
    "사선 기울기 삭제 후 다른 목표값의 엄밀 구간 증명 실패",
  );
  return {
    center: [q(0), j] as ExactPoint,
    radicalParameter: ta,
    inverseParameter: tb,
    slope,
    intercept,
    determinant: det,
  };
}

export const radicalInverseCircleFamily = remainingFamily({
  id: "exam-advanced:radical-inverse-circle",
  title: "근호·역함수 입사와 사선에서 외접원 조건까지",
  requirement: "function.radical-inverse-circle",
  course: "공통수학2",
  unit: "무리함수와 역함수",
  domain: radicalDomain,
  boundaries: [
    "두 양의 z근과 상한에 따른 배제",
    "양/음 z근",
    "t=0 근호 끝점",
    "제곱 전 음수 t 배제",
    "0이 아닌 원 조건",
    "중복·공선 배제",
    "입사·사선·원 조건 각각 삭제 증인",
    "그림 없이 모든 입사·좌표 명시",
  ],
  build: (params) => {
    const p = radicalProblem(params);
    // Generation searches only integer ordinates in the authored finite design;
    // verification below proves completeness over ALL real ordinates algebraically.
    const hits = Array.from({ length: 21 }, (_, n) => q(n)).filter((t) => {
      const A: ExactPoint = [radicalX(p, t), t],
        B: ExactPoint = [t, radicalX(p, t)];
      return (
        onRadical(p, A) &&
        onInverse(p, B) &&
        !samePoint(A, B) &&
        !determinant(A, B, p.C).eq(q(0)) &&
        norm(A).eq(norm(p.C))
      );
    });
    assert(hits.length === 1, "저작 정수 후보 오류");
    const z = hits[0]!.sq(),
      other = p.k.mul(q(2)).sub(p.a.sq()).sub(z),
      zs = [z, other].sort((x, y) => x.cmp(y));
    const branches = allRadicalBranches(p, zs),
      accepted = branches.find((branch) => branch.reason === "허용")!;
    const solved = {
      coefficient: zs[0]!.add(zs[1]!).neg(),
      constant: zs[0]!.mul(zs[1]!),
      zs,
      branches,
      accepted,
    };
    return draft(
      params,
      `함수 f(x)=√((${p.a})x+(${p.k}))의 정의역은 [${p.lower}, ${p.upper}]이고 치역은 [0, √(${p.cap})]이다. ` +
        `g는 f의 역함수이며 g의 정의역은 [0, √(${p.cap})]이다. ` +
        `점 A는 y=f(x)의 그래프 위에, 점 B는 y=g(x)의 그래프 위에 있다. ` +
        `A와 B는 직선 ℓ: y=-x+b 위의 서로 다른 점이다. C(${p.C[0]}, ${p.C[1]})와 A, B는 한 직선 위에 있지 않다. ` +
        `삼각형 ABC의 외접원의 중심은 y축 위에 있다. 실수 b의 값을 구하시오.`,
      String(accepted.b),
      radicalSolution(p, solved),
      [
        "근호와 역함수 정의역·부호 보존",
        "두 입사식과 사선에서 좌표교환을 증명",
        "외접원 중심 조건으로 전체 후보 도출",
        "음수·범위 밖·퇴화 후보를 원식에 검산",
      ],
    );
  },
  inspect: (item) => {
    const p = readRadicalInverseCircle(item),
      solved = solveRadicalInverseCircle(p);
    assert(
      item.answer === String(solved.accepted.b),
      "원래 조건의 전체 실수 후보와 정답 불일치",
    );
    assert(
      item.solution === radicalSolution(p, solved),
      "입사·역함수·가지·외접원 풀이 증명 불일치",
    );
    radicalDeletionWitnesses(p, solved.accepted.b!);
    radicalLineDeletionWitness(p, solved);
    return {
      a: Number(p.a.toString()),
      k: Number(p.k.toString()),
      upper: Number(p.upper.toString()),
      cx: Number(p.C[0].toString()),
      cy: Number(p.C[1].toString()),
    };
  },
});
