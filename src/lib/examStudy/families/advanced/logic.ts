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
  range,
  readNumbers,
  requireMatch,
  setText,
  unique,
} from "./shared";

export interface InclusionProblem {
  left: number;
  right: number;
  radius: number;
  pClosed: boolean;
  qClosed: boolean;
}

/** Reads only student-facing statements, including both strictness signs. */
export function readInclusion(content: string): InclusionProblem {
  const p = requireMatch(content, /p_a\(x\): \|x-a\| (≤|<) (\d+)/);
  const q = requireMatch(
    content,
    /q\(x\): 「\(x-\((-?\d+)\)\)\(x-\((-?\d+)\)\) (>|≥) 0」의 부정/,
  );
  requireMatch(content, /실수 전체에서 p_a\(x\) ⇒ q\(x\)가 참/);
  requireMatch(content, /정수 a를 모두 구하시오/);
  const result = {
    left: +q[1]!,
    right: +q[2]!,
    radius: +p[2]!,
    pClosed: p[1] === "≤",
    qClosed: q[3] === ">",
  };
  assert(
    result.left < result.right && result.radius > 0,
    "잘못된 진리집합 구간",
  );
  return result;
}

/**
 * Independent universal implication check. All predicate roots partition R into
 * cells of constant truth; roots and one point of EVERY open cell suffice.
 * This does not use the generator's interval-containment formula.
 */
export function inclusionHolds(problem: InclusionProblem, a: number): boolean {
  const { left, right, radius, pClosed, qClosed } = problem;
  const roots = unique([left, right, a - radius, a + radius]);
  const probes = [roots[0]! - 1, roots.at(-1)! + 1, ...roots];
  for (let i = 1; i < roots.length; i++)
    probes.push((roots[i - 1]! + roots[i]!) / 2);
  return probes.every((x) => {
    const p = pClosed ? Math.abs(x - a) <= radius : Math.abs(x - a) < radius;
    const product = (x - left) * (x - right);
    const q = qClosed ? !(product > 0) : !(product >= 0);
    return !p || q;
  });
}

export function solveInclusion(problem: InclusionProblem): number[] {
  // x=a always satisfies p, so any feasible a lies in [left,right].
  return range(problem.left, problem.right).filter((a) =>
    inclusionHolds(problem, a),
  );
}

const inclusionDomain: CanonicalParams[] = [];
for (const left of [-7, -3, 2])
  for (const radius of [1, 2, 3])
    for (const slack of [2, 4])
      for (const pClosed of [false, true])
        for (const qClosed of [false, true])
          inclusionDomain.push({
            left,
            right: left + 2 * radius + slack,
            radius,
            pClosed,
            qClosed,
          });

function buildInclusion(p: CanonicalParams): ExamStudyDraft {
  const left = p.left as number,
    right = p.right as number,
    radius = p.radius as number;
  const strict = p.pClosed && !p.qClosed;
  const lo = left + radius + (strict ? 1 : 0),
    hi = right - radius - (strict ? 1 : 0);
  return draft(
    p,
    `실수 x에 대한 두 조건을 다음과 같이 정한다.\n` +
      `p_a(x): |x-a| ${p.pClosed ? "≤" : "<"} ${radius}\n` +
      `q(x): 「(x-(${left}))(x-(${right})) ${p.qClosed ? ">" : "≥"} 0」의 부정\n` +
      `실수 전체에서 p_a(x) ⇒ q(x)가 참이 되게 하는 정수 a를 모두 구하시오.`,
    setText(range(lo, hi)),
    `q의 진리집합은 ${p.qClosed ? "닫힌" : "열린"} 구간 (${left}, ${right})의 ` +
      `${p.qClosed ? "양 끝점을 포함한 집합" : "내부"}이다. p의 진리집합은 중심 a, 반지름 ${radius}인 ` +
      `${p.pClosed ? "닫힌" : "열린"} 구간이다. 이 구간 전체가 q에 포함되어야 하므로 ` +
      `${left + radius} ${strict ? "<" : "≤"} a ${strict ? "<" : "≤"} ${right - radius}이다. ` +
      `끝점이 q에 없고 p에는 있을 때만 등호를 제외한다. 따라서 정수 a의 전체 집합은 ${setText(range(lo, hi))}이다.`,
    [
      "명제의 부정을 이차부등식의 진리집합으로 변환",
      "열린/닫힌 끝점과 포함 관계를 동시에 판정",
    ],
  );
}

export const truthSetInclusionFamily = authoredFamily({
  id: "exam-advanced:truth-set-inclusion",
  title: "명제의 진리집합 포함과 정수 매개변수",
  requirement: "logic.truth-set-inclusion-param",
  unit: "집합과 명제",
  domain: inclusionDomain,
  boundaries: [
    "p/q의 열린·닫힌 끝점 네 조합",
    "음수·0·양수 매개변수",
    "끝점에서만 거짓인 함의",
  ],
  build: buildInclusion,
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readInclusion(item.content),
        values = solveInclusion(p);
      assert(values.length > 0, "실현 가능한 매개변수가 없습니다.");
      assertAnswer(item, setText(values));
      // Removing either truth-set boundary enlarges the feasible parameter set.
      const withoutLeft = solveInclusion({
        ...p,
        left: p.left - 2 * p.radius - 4,
      });
      const withoutRight = solveInclusion({
        ...p,
        right: p.right + 2 * p.radius + 4,
      });
      const withoutRadius = solveInclusion({ ...p, radius: p.radius + 1 });
      assert(
        withoutLeft.some((a) => !values.includes(a)) &&
          withoutRight.some((a) => !values.includes(a)),
        "포함 경계가 필수 조건이 아닙니다.",
      );
      assert(
        JSON.stringify(withoutRadius) !== JSON.stringify(values),
        "절댓값 조건이 불필요합니다.",
      );
      assert(
        !inclusionHolds(p, p.right + p.radius + 1),
        "함의 제거 반례가 없습니다.",
      );
    }),
});

export interface IntermediateProblem {
  universe: number[];
  p: number[];
  q: number[];
}
export function readIntermediate(content: string): IntermediateProblem {
  const match = requireMatch(
    content,
    /U=\{([^}]+)\}, P=\{([^}]+)\}, Q=\{([^}]+)\}/,
  );
  requireMatch(content, /\(p∧q\) ⇒ r 및 r ⇒ \(p∨q\)가 모두 참/);
  requireMatch(content, /진리집합 R의 개수/);
  const [universe, p, q] = [match[1]!, match[2]!, match[3]!].map(readNumbers);
  assert(
    universe &&
      p &&
      q &&
      unique(universe).length === universe.length &&
      [...p, ...q].every((x) => universe.includes(x)),
    "집합의 원소/전체집합 오류",
  );
  return { universe, p, q };
}

export function solveIntermediate(
  problem: IntermediateProblem,
  omit?: "lower" | "upper",
): number[][] {
  const { universe, p, q } = problem;
  return range(0, 2 ** universe.length - 1)
    .map((bits) => universe.filter((_, i) => bits & (1 << i)))
    .filter((r) =>
      universe.every(
        (x) =>
          (omit === "lower" ||
            !(p.includes(x) && q.includes(x)) ||
            r.includes(x)) &&
          (omit === "upper" ||
            !r.includes(x) ||
            p.includes(x) ||
            q.includes(x)),
      ),
    );
}

const intermediateDomain: CanonicalParams[] = [];
for (const offset of [-5, 1, 8])
  for (const n of [6, 7, 8])
    for (const shared of [1, 2])
      intermediateDomain.push({
        universe: range(offset, offset + n - 1),
        p: range(offset, offset + shared + 1),
        q: range(offset + 2, offset + n - 2),
      });

export const intermediateTruthSetFamily = authoredFamily({
  id: "exam-advanced:intermediate-truth-sets",
  title: "두 함의 사이의 가능한 진리집합",
  requirement: "logic.intermediate-truth-set-count",
  unit: "집합과 명제",
  domain: intermediateDomain,
  boundaries: [
    "교집합 원소의 강제 포함",
    "합집합 밖 원소의 강제 제외",
    "전체집합의 모든 부분집합 전수",
  ],
  build: (params) => {
    const universe = params.universe as number[],
      p = params.p as number[],
      q = params.q as number[];
    const forced = p.filter((x) => q.includes(x)),
      allowed = unique([...p, ...q]);
    const count = 2 ** (allowed.length - forced.length);
    return draft(
      params,
      `전체집합과 두 명제의 진리집합은 U=${setText(universe)}, P=${setText(p)}, Q=${setText(q)}이다. ` +
        `명제 r의 진리집합을 R이라 하자. U의 모든 원소에 대해 (p∧q) ⇒ r 및 r ⇒ (p∨q)가 모두 참일 때, 가능한 진리집합 R의 개수를 구하시오.`,
      String(count),
      `첫 함의는 P∩Q=${setText(forced)}를 R에 강제로 넣는다. 둘째 함의는 R을 P∪Q=${setText(allowed)} 안으로 제한한다. ` +
        `나머지 ${allowed.length - forced.length}개 원소는 서로 독립적으로 넣거나 뺄 수 있으므로 가능한 진리집합은 2^${allowed.length - forced.length}=${count}개이다.`,
      [
        "함의 두 개를 서로 다른 포함 조건으로 해석",
        "필수·선택·금지 원소를 분리",
      ],
    );
  },
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readIntermediate(item.content),
        count = solveIntermediate(p).length;
      assertAnswer(item, String(count));
      assert(
        solveIntermediate(p, "lower").length > count,
        "하한 함의가 필수 조건이 아닙니다.",
      );
      assert(
        solveIntermediate(p, "upper").length > count,
        "상한 함의가 필수 조건이 아닙니다.",
      );
    }),
});
