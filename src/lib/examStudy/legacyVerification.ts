import type {
  ExamStudyDraft,
  ExamStudyEvidence,
  ExamStudyVerification,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";

/** A deliberately small parser: no eval/Function, no generator facts or answer oracle. */
export function evaluatePrintedExpression(
  text: string,
  vars: Readonly<Record<string, number>>,
): number {
  const source = text
    .replace(/\s|\$|\\left|\\right/g, "")
    .replace(/([0-9abx)])(?=[abx(])/g, "$1*");
  let at = 0;
  function atom(): number {
    if (source[at] === "+") {
      at++;
      return atom();
    }
    if (source[at] === "-") {
      at++;
      return -atom();
    }
    if (source[at] === "(") {
      at++;
      const value = sum();
      if (source[at++] !== ")") throw new Error("Unclosed expression");
      return value;
    }
    const number = /^\d+(?:\.\d+)?/.exec(source.slice(at));
    if (number) {
      at += number[0].length;
      return Number(number[0]);
    }
    const variable = source[at++];
    if (variable && Object.hasOwn(vars, variable)) return vars[variable]!;
    throw new Error("Unrecognized printed expression");
  }
  function product(): number {
    let value = atom();
    while (source[at] === "*" || source[at] === "/") {
      const op = source[at++];
      const next = atom();
      value = op === "*" ? value * next : value / next;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (source[at] === "+" || source[at] === "-") {
      const op = source[at++];
      const next = product();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }
  const value = sum();
  if (at !== source.length || !Number.isFinite(value))
    throw new Error("Invalid printed expression");
  return value;
}

const ok = (): ExamStudyVerification => ({
  valid: true,
  checks: ["independent-solution", "essential-conditions"],
  errors: [],
});
const bad = (reason: string): ExamStudyVerification => ({
  valid: false,
  checks: [],
  errors: [reason],
});
const numericAnswer = (item: ExamStudyDraft) => {
  const match = /^\$(-?\d+)\$(?:개)?$/.exec(item.answer.trim());
  if (!match) throw new Error("Expected an integer answer");
  return Number(match[1]);
};
const quadrant = (x: number, y: number) =>
  x === 0 || y === 0 ? 0 : x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;

export function verifySignQuadrant(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const [head, tail] = item.content.split("일 때");
  if (!head || !tail) return bad("Missing sign conditions");
  const conditions = [...head.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
  const target = /점\s*\$\(([^,]+),\s*([^\)]+)\)\$/.exec(tail);
  if (conditions.length !== 2 || !target)
    return bad("Unexpected quadrant task");
  const predicate = (condition: string, a: number, b: number) => {
    const split = /^(.+)([<>])(.+)$/.exec(condition);
    if (!split) throw new Error("Unknown printed condition");
    const l = evaluatePrintedExpression(split[1]!, { a, b });
    const r = evaluatePrintedExpression(split[3]!, { a, b });
    return split[2] === ">" ? l > r : l < r;
  };
  const outcomes = (kept: readonly string[]) => {
    const out = new Set<number>();
    for (let a = -4; a <= 4; a++)
      for (let b = -4; b <= 4; b++) {
        if (!a || !b || !kept.every((c) => predicate(c, a, b))) continue;
        out.add(
          quadrant(
            evaluatePrintedExpression(target[1]!, { a, b }),
            evaluatePrintedExpression(target[2]!, { a, b }),
          ),
        );
      }
    return out;
  };
  const values = outcomes(conditions);
  const answer = /^제\$(\d)\$사분면$/.exec(item.answer);
  if (
    !answer ||
    values.size !== 1 ||
    values.has(0) ||
    !values.has(Number(answer[1]))
  )
    return bad("The printed signs do not imply the answer");
  if (
    conditions.some(
      (_, i) => outcomes(conditions.filter((__, j) => i !== j)).size < 2,
    )
  )
    return bad("A declared sign condition is redundant");
  return ok();
}

/** Count outputs of each printed relation, with explicit non-uniqueness witnesses. */
export function verifyFunctionUniqueness(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const statements = item.content
    .split("\n")
    .slice(1)
    .map((s) => s.replace(/^[①-⑤]\s*/, "").trim());
  if (statements.length !== 5 || new Set(statements).size !== 5)
    return bad("Expected five distinct printed relations");
  const outputs = (statement: string): readonly number[] | undefined => {
    const divisors = [1, 2, 3, 6];
    if (statement === "자연수 $x$의 약수의 개수 $y$") return [divisors.length];
    if (statement === "자연수 $x$의 약수 $y$") return divisors;
    const remainder = /^자연수 \$x\$를 \$(\d+)\$으로 나눈 나머지 \$y\$$/.exec(
      statement,
    );
    if (remainder && Number(remainder[1]) > 0)
      return [6 % Number(remainder[1])];
    if (statement === "절댓값이 $x$인 정수 $y$") return [-6, 6];
    const offset = /^\$x\$보다 \$(\d+)\$만큼 큰 수 \$y\$$/.exec(statement);
    if (offset) return [6 + Number(offset[1])];
    if (statement === "자연수 $x$보다 작은 홀수 $y$") return [1, 3, 5];
    const price = /^한 개에 \$(\d+)\$원인 물건 \$x\$개의 값 \$y\$원$/.exec(
      statement,
    );
    if (price) return [6 * Number(price[1])];
    if (statement === "둘레의 길이가 $x$인 직사각형의 넓이 $y$")
      return [1 * 3, 2 * 2]; // same perimeter, different areas
    return undefined;
  };
  const counts = statements.map((s) => outputs(s));
  if (counts.some((s) => s === undefined))
    return bad("Unreviewed relation wording");
  const truths = counts.map((s) => new Set(s).size === 1);
  if (!truths.some(Boolean) || truths.every(Boolean))
    return bad("Definition task lost its contrasting cases");
  return numericAnswer(item) === truths.filter(Boolean).length
    ? ok()
    : bad("Function output uniqueness disagrees with the answer");
}

export function verifyLineProperties(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const equation = /일차함수 \$y=([^$]+)\$/.exec(item.content);
  const lines = item.content.split("\n").slice(1);
  if (!equation || lines.length !== 5)
    return bad("Unrecognized printed line task");
  const b = evaluatePrintedExpression(equation[1]!, { x: 0 });
  const a = evaluatePrintedExpression(equation[1]!, { x: 1 }) - b;
  if (!a || !b) return bad("Degenerate line");
  const intercept = /\$y\$절편은 \$(-?\d+)\$/.exec(lines[1]!);
  const increment = /\$y\$의 값은 \$(\d+)\$만큼 (증가|감소)/.exec(lines[2]!);
  const point = /점 \$\((-?\d+),\s*(-?\d+)\)\$/.exec(lines[3]!);
  const quad = /제\$(\d)\$사분면/.exec(lines[4]!);
  if (!intercept || !increment || !point || !quad)
    return bad("Missing one of the five properties");
  const q = Number(quad[1]);
  const sx = q === 1 || q === 4 ? 1 : -1;
  const sy = q <= 2 ? 1 : -1;
  // On each x half-line y ranges from b toward the appropriate infinity.
  const passed = sy * b > 0 || sy * a * sx > 0;
  const truths = [
    lines[0]!.includes(a > 0 ? "오른쪽 위" : "오른쪽 아래"),
    Number(intercept[1]) === b,
    Number(increment[1]) * (increment[2] === "증가" ? 1 : -1) === a,
    evaluatePrintedExpression(equation[1]!, { x: Number(point[1]) }) ===
      Number(point[2]),
    passed,
  ];
  return numericAnswer(item) === truths.filter(Boolean).length
    ? ok()
    : bad("Independent line properties disagree with the answer");
}

export function verifyNaturalSolutionCount(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const printed = /\$(\d+)\(ax\+(\d+)\)\\le ax\+(\d+)\$/.exec(item.content);
  const count = /자연수 \$x\$가 \$(\d+)\$개/.exec(item.content);
  if (!printed || !count) return bad("Unrecognized inverse count inequality");
  const [p, q, r, n] = [
    Number(printed[1]),
    Number(printed[2]),
    Number(printed[3]),
    Number(count[1]),
  ];
  if (p <= 1 || n < 1 || r <= p * q || r > 400)
    return bad("Unsupported coefficient boundary");
  const bound = (r - p * q) / (p - 1);
  const satisfies = (a: number, x: number) => p * (a * x + q) <= a * x + r;
  const accepted: number[] = [];
  // Negative and zero a admit infinitely many positive x. Positive a cannot
  // exceed bound, since then even x=1 fails. Test nth and (n+1)th ORIGINAL rows.
  for (let a = 1; a <= Math.floor(bound); a++)
    if (satisfies(a, n) && !satisfies(a, n + 1)) accepted.push(a);
  if (!accepted.length || !satisfies(0, n + 1) || !satisfies(-1, 1000))
    return bad("Lost finite/infinite sign distinction");
  return numericAnswer(item) === accepted.reduce((s, a) => s + a, 0)
    ? ok()
    : bad("Complete parameter set disagrees with the answer");
}

export function verifyNaturalParameter(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const equation = /일차방정식 \$([^$=]+)=([^$]+)\$/.exec(item.content);
  if (!equation) return bad("Unrecognized natural parameter equation");
  const delta = (x: number, a: number) =>
    evaluatePrintedExpression(equation[1]!, { x, a }) -
    evaluatePrintedExpression(equation[2]!, { x, a });
  const constant = delta(0, 0),
    k = delta(1, 0) - constant,
    coefficient = delta(0, 1) - constant;
  const natural = item.content.includes("해가 자연수");
  if (!natural && !item.content.includes("해가 음의 정수"))
    return bad("Unreviewed root domain");
  if (!k || coefficient !== 1 || constant >= 0 || (natural ? k < 0 : k > 0))
    return bad("Parameter domain would not be finite");
  const accepted: number[] = [];
  for (let a = 1; a < -constant; a++) {
    for (let x = constant; x <= -constant; x++) {
      if ((natural ? x >= 1 : x <= -1) && delta(x, a) === 0) {
        accepted.push(a);
        break;
      }
    }
  }
  if (natural) {
    const printed = [...item.answer.matchAll(/\$(\d+)\$/g)].map((m) =>
      Number(m[1]),
    );
    return JSON.stringify(printed) === JSON.stringify(accepted)
      ? ok()
      : bad("Not all admissible natural parameters were returned");
  }
  return numericAnswer(item) === accepted.length
    ? ok()
    : bad("Negative-integer root condition disagrees with the parameter count");
}

export function verifyRationalRootParameter(
  item: ExamStudyDraft,
): ExamStudyVerification {
  const m = /이차방정식 \$(\d+)x\^\{2\}-(\d+)x\+k=0\$/.exec(item.content);
  if (!m) return bad("Unrecognized rational-root parameter task");
  if (
    !item.content.includes(
      "두 근이 모두 유리수가 되도록 하는 자연수 $k$의 값을 모두",
    )
  )
    return bad("Missing rational/natural/all-parameter conditions");
  const a = Number(m[1]),
    b = Number(m[2]);
  if (a < 1 || a > 20 || b < 1 || b > 100)
    return bad("Unreviewed coefficient domain");
  const winners: number[] = [];
  for (let k = 1; k <= Math.floor((b * b) / (4 * a)); k++) {
    let found = false;
    // Rational-root theorem, independently of the generator's square filtering.
    for (let den = 1; den <= a && !found; den++) {
      if (a % den !== 0) continue;
      for (let num = 1; num <= k && !found; num++) {
        if (k % num !== 0) continue;
        for (const sign of [-1, 1])
          if (a * num * num - b * sign * num * den + k * den * den === 0)
            found = true;
      }
    }
    if (found) winners.push(k);
  }
  return winners.length > 0 &&
    numericAnswer(item) === winners.reduce((s, k) => s + k, 0)
    ? ok()
    : bad("Rational-root theorem contradicts the complete parameter sum");
}

interface CuratedLegacyCheck {
  requirement: StudyRequirementId;
  verify: (item: ExamStudyDraft) => ExamStudyVerification;
  evidence: ExamStudyEvidence;
}
const reviewed = (
  requirement: StudyRequirementId,
  verify: CuratedLegacyCheck["verify"],
  boundaryCases: readonly string[],
): CuratedLegacyCheck => ({
  requirement,
  verify,
  evidence: {
    testFile: "src/__tests__/unit/examStudyCoreLegacy.test.ts",
    sampleCount: 64,
    boundaryCases,
    checkedRequirements: [requirement],
    checks: ["independent-solution", "essential-conditions"],
  },
});

export const CURATED_LEGACY_CHECKS: Readonly<
  Record<string, CuratedLegacyCheck>
> = {
  "1-1|좌표와 그래프|06": reviewed("coord.sign-quadrant", verifySignQuadrant, [
    "all four sign conditions and seven transforms",
    "remove each condition",
    "opposite-sign differences",
  ]),
  "2-1|일차함수와 그 그래프 ⑴|01": reviewed(
    "concept.function-uniqueness",
    verifyFunctionUniqueness,
    [
      "divisor count versus divisors",
      "two signed outputs",
      "rectangle perimeter counterexample",
      "truth subsets, not just count",
    ],
  ),
  "2-1|일차함수와 그 그래프 ⑵|01": reviewed(
    "graph.line-multi-properties",
    verifyLineProperties,
    [
      "four slope/intercept sign combinations",
      "true and false incidence",
      "increasing and decreasing",
      "each excluded quadrant",
    ],
  ),
  "2-1|일차부등식|118X": reviewed(
    "algebra.inequality-solution-count",
    verifyNaturalSolutionCount,
    [
      "negative and zero coefficient give infinite solutions",
      "nth satisfies, next fails",
      "integer quotient equality and strict neighbour",
    ],
  ),
  "1-1|일차방정식의 풀이|17": reviewed(
    "algebra.natural-parameter",
    verifyNaturalParameter,
    [
      "positive and negative root conditions",
      "a positive endpoint excluded",
      "all congruence classes",
    ],
  ),
  "3-1|이차방정식의 활용|53V": reviewed(
    "algebra.rational-root-parameter",
    verifyRationalRootParameter,
    [
      "repeated rational root",
      "irrational real roots rejected",
      "negative discriminant excluded",
      "complete natural parameter bound",
    ],
  ),
};

/** Source registry typography contains thin spaces; normalize only for lookup. */
export function curatedLegacyCheck(
  key: string,
): CuratedLegacyCheck | undefined {
  return CURATED_LEGACY_CHECKS[
    key.replace(/\s+/g, " ").replace(/\s+(?=[⑴⑵])/g, " ")
  ];
}
