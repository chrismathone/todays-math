import type {
  ExamStudyDraft,
  ExamStudyVerification,
} from "@/contracts/examStudy.contract";
import { draftErrors } from "./evidence";
import { countValue, selectedStudyAnswer } from "./studyChoiceBounds";
import {
  add,
  coefficient,
  degree,
  div,
  equation,
  everywhereDefined,
  expression,
  fraction,
  mul,
  polynomial,
  polynomialSame,
  polynomialTex,
  positive,
  rationalAt,
  rationalSame,
  same,
  scalar,
  sub,
  substitute,
  valueAt,
  variable,
  type Fraction,
} from "./reinforcementMath";

const IDS = "ㄱㄴㄷㄹㅁ";
function demand(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function matched(
  regex: RegExp,
  text: string,
  message: string,
): RegExpExecArray {
  const m = regex.exec(text);
  demand(m, message);
  return m;
}
const maths = (text: string) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const integerAnswer = (answer: string) =>
  scalar(matched(/^\$([^$]+)\$$/, answer.trim(), "Missing scalar answer")[1]!);
function verify(
  item: ExamStudyDraft,
  check: () => void,
  written = false,
): ExamStudyVerification {
  try {
    const errors = draftErrors(item);
    demand(!errors.length, errors.join("; "));
    check();
    return {
      valid: true,
      checks: [
        "independent-solution",
        "essential-conditions",
        ...(written ? ["native-rubric" as const] : []),
      ],
      errors: [],
    };
  } catch (error) {
    return {
      valid: false,
      checks: [],
      errors: [
        error instanceof Error
          ? error.message
          : "Printed mathematics verification failed",
      ],
    };
  }
}
function conclusion(
  solution: string,
  label: string,
  truths: readonly boolean[],
): void {
  const m = matched(
    new RegExp(`${label}: ([ㄱ-ㅎ, ]+)\\. 따라서 \\$([0-5])\\$개이다\\.$`),
    solution,
    "Missing statement-set conclusion",
  );
  const got = m[1]!.split(/,\s*/),
    want = [...IDS].filter((_, i) => truths[i]);
  demand(
    got.length === want.length &&
      got.every((id, i) => id === want[i]) &&
      Number(m[2]) === want.length,
    "Statement identities/count disagree",
  );
}
function fiveRows(text: string): string[] {
  const rows = text.split("\n").slice(1);
  demand(
    rows.length === 5 && rows.every((s, i) => s.startsWith(`${IDS[i]}. `)),
    "Expected five identified statement rows",
  );
  return rows;
}

export const verifyReinforcedCandidate = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(item, () => {
    const { question, answer } = selectedStudyAnswer(item);
    demand(
      question.startsWith(
        "다음은 서로 다른 방정식과 각각의 후보이다. 자기 행의 후보를 대입할 때 성립하는 항목의 개수를 구하시오.",
      ),
      "Missing per-row candidate substitution demand",
    );
    const candidates: Fraction[] = [],
      equations: string[] = [];
    const truths = fiveRows(question).map((row, i) => {
      const m = matched(
        /^[ㄱ-ㅎ]\. \$([^$]+)=([^$]+)\$, 후보 \$x=([^$]+)\$$/,
        row,
        "Missing equation/candidate pair",
      );
      const left = polynomial(m[1]!),
        right = polynomial(m[2]!),
        x = scalar(m[3]!);
      demand(
        degree(left) === 1 && degree(right) === 0,
        "Expected a nondegenerate printed linear equation",
      );
      candidates.push(x);
      equations.push(`${m[1]}=${m[2]}`);
      const l = valueAt(left, x),
        r = valueAt(right, x),
        truth = same(l, r);
      const proof = matched(
        new RegExp(
          `^${IDS[i]}: 후보 \\$x=([^$]+)\\$를 대입하면 좌변 \\$([^$]+)\\$, 우변 \\$([^$]+)\\$이므로 (성립|불성립)한다\\.$`,
          "m",
        ),
        item.solution,
        "Missing row-by-row substitution proof",
      );
      const chain = proof[2]!.split("=");
      demand(
        chain.length === 2 &&
          same(scalar(proof[1]!), x) &&
          same(scalar(chain[0]!), l) &&
          same(scalar(chain[1]!), l) &&
          same(scalar(proof[3]!), r) &&
          (proof[4] === "성립") === truth,
        "Incorrect substitution or row truth in solution",
      );
      return truth;
    });
    demand(
      new Set(candidates.map((x) => `${x.n}/${x.d}`)).size === 5 &&
        new Set(equations).size === 5,
      "Rows must have distinct equations and their own distinct candidates",
    );
    demand(
      truths.some(Boolean) && !truths.every(Boolean),
      "Candidate task lost contrasting rows",
    );
    demand(
      countValue(answer) === truths.filter(Boolean).length,
      "Wrong candidate count",
    );
    conclusion(item.solution, "성립하는 항목", truths);
  });

export const verifyReinforcedEquality = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(item, () => {
    const { question, answer } = selectedStudyAnswer(item);
    const premise = matched(
      /^실수 \$a\$, \$b\$가 \$a=(-?\d+)b\$를 만족한다\. \$b=0\$인 경우도 포함하여 항상 옳은 진술의 개수를 구하시오\./,
      question,
      "Missing universal nonunit relation or zero case",
    );
    const k = Number(premise[1]);
    demand(
      Math.abs(k) > 1 && Math.abs(k) <= 6,
      "Unreviewed relation multiplier",
    );
    const vars = { a: substitute(k), b: variable() };
    const statements: string[] = [];
    const truths = fiveRows(question).map((row, i) => {
      const eq = matched(
          /^[ㄱ-ㅎ]\. \$([^$]+)\$$/,
          row,
          "Missing equality statement",
        )[1]!,
        sides = eq.split("=");
      statements.push(eq);
      demand(sides.length === 2, "Invalid equality");
      const left = expression(sides[0]!, vars),
        right = expression(sides[1]!, vars);
      const truth =
        everywhereDefined(left) &&
        everywhereDefined(right) &&
        rationalSame(left, right);
      const line = matched(
        new RegExp(`^${IDS[i]}: (.+)$`, "m"),
        item.solution,
        "Missing statement proof",
      )[1]!;
      if (truth) {
        const proof = matched(
          /^\$a=([^$]+)\$를 대입하면 \$([^$]+)\$이며 모든 실수 \$b\$에서 성립한다\.$/,
          line,
          "Missing universal identity proof",
        );
        demand(
          polynomialSame(polynomial(proof[1]!, "b"), [
            fraction(0),
            fraction(k),
          ]),
          "Solution used another premise",
        );
        const parts = proof[2]!.split("=");
        demand(
          parts.length === 2 && !/(?:^|[^a-z])a(?:[^a-z]|$)/.test(proof[2]!),
          "Substitution not completed",
        );
        const l = expression(parts[0]!, { b: variable() }),
          r = expression(parts[1]!, { b: variable() });
        demand(
          everywhereDefined(l) &&
            everywhereDefined(r) &&
            rationalSame(l, r) &&
            rationalSame(l, left) &&
            rationalSame(r, right),
          "Incorrect universal substituted identity",
        );
      } else {
        const proof = matched(
          /^\$b=([^$]+)\$, \$a=([^$]+)\$에서 (.+)$/,
          line,
          "False statements need an actual counterexample",
        );
        const b = scalar(proof[1]!),
          a = scalar(proof[2]!);
        demand(same(a, mul(fraction(k), b)), "Counterexample violates premise");
        const l = rationalAt(left, b),
          r = rationalAt(right, b);
        if (!l || !r)
          demand(
            proof[3] === "분모가 $0$이므로 정의되지 않는다.",
            "Missing zero denominator exclusion",
          );
        else {
          const values = matched(
            /^좌변 \$([^$]+)\$, 우변 \$([^$]+)\$로 다르다\.$/,
            proof[3]!,
            "Missing numerical counterexample",
          );
          demand(
            !same(l, r) &&
              same(l, scalar(values[1]!)) &&
              same(r, scalar(values[2]!)),
            "False or incorrectly evaluated counterexample",
          );
        }
      }
      return truth;
    });
    demand(new Set(statements).size === 5, "Duplicate equality statements");
    demand(
      countValue(answer) === truths.filter(Boolean).length,
      "Wrong universal statement count",
    );
    conclusion(item.solution, "항상 성립하는 항목", truths);
  });

export function classificationRows(question: string) {
  const lines = question.split("\n");
  demand(
    lines.length === 2 &&
      lines[0] === "다음 중 일차방정식인 것의 개수를 구하시오.",
    "Missing classification target/printed set",
  );
  const equations = maths(lines[1]!);
  demand(
    equations.length === 5 &&
      new Set(equations).size === 5 &&
      !lines[1]!.replace(/\$[^$]+\$/g, "").replace(/[,\s]/g, ""),
    "Expected five distinct printed equations",
  );
  return equations.map((printed) => {
    const diff = equation(printed),
      d = degree(diff);
    demand(d <= 2, "Unreviewed polynomial degree");
    const label =
      d === 2
        ? "이차방정식"
        : d === 1
          ? "일차방정식"
          : diff[0]!.n === 0
            ? "항등식"
            : "불가능한 등식";
    return { printed, diff, reduced: polynomialTex(diff), label };
  });
}
export const verifyReinforcedClassification = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(item, () => {
    const { question, answer } = selectedStudyAnswer(item),
      rows = classificationRows(question);
    const truths = rows.map((r, i) => {
      const proof = matched(
        new RegExp(
          `^${IDS[i]}: 양변을 정리하면 \\$([^$]+)=0\\$이므로 (일차방정식|이차방정식|항등식|불가능한 등식)이다\\.$`,
          "m",
        ),
        item.solution,
        "Missing exact classification proof",
      );
      demand(
        polynomialSame(polynomial(proof[1]!), r.diff) && proof[2] === r.label,
        "Incorrect reduced polynomial/degree/zero branch",
      );
      return r.label === "일차방정식";
    });
    demand(
      countValue(answer) === truths.filter(Boolean).length,
      "Wrong linear-equation count",
    );
    conclusion(item.solution, "일차방정식인 항목", truths);
  });

export function modelWords(question: string) {
  const m = matched(
    /^어떤 수에 \$(\d+)\$(?:을|를) 곱한 후 \$(\d+)\$(?:을|를) 더한 수는 어떤 수의 \$(\d+)\$배보다 \$(\d+)\$만큼 (크다|작다)고 한다\. 어떤 수를 구하시오\.$/,
    question,
    "Missing or changed original modeling situation",
  );
  const a = Number(m[1]),
    b = Number(m[2]),
    c = Number(m[3]),
    delta = Number(m[4]) * (m[5] === "크다" ? 1 : -1);
  demand(
    a >= 2 &&
      a <= 5 &&
      b >= 1 &&
      b <= 9 &&
      c >= 2 &&
      c <= 7 &&
      a !== c &&
      delta !== 0,
    "Unreviewed modeling coefficient range",
  );
  const root = div(fraction(delta - b), fraction(a - c));
  demand(
    root.d === 1 && root.n >= 2 && root.n <= 12,
    "Root outside reviewed existing scope",
  );
  return { a, b, c, delta, x: root.n };
}
export const verifyReinforcedModel = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(item, () => {
    const { question, answer } = selectedStudyAnswer(item),
      m = modelWords(question);
    demand(same(integerAnswer(answer), fraction(m.x)), "Wrong model solution");
    const lines = item.solution.split("\n");
    demand(lines.length === 4, "Missing complete original-situation solution");
    const model = matched(
      /^어떤 수를 \$x\$라 하면 \$([^$]+)\$이다\.$/,
      lines[0]!,
      "Missing variable/model",
    );
    const sides = model[1]!.split("=");
    demand(sides.length === 2, "Bad printed model");
    demand(
      polynomialSame(polynomial(sides[0]!), [fraction(m.b), fraction(m.a)]) &&
        polynomialSame(polynomial(sides[1]!), [
          fraction(m.delta),
          fraction(m.c),
        ]),
      "Model not equivalent to original words",
    );
    demand(
      same(
        scalar(
          matched(
            /^정리하여 풀면 \$x=([^$]+)\$이다\.$/,
            lines[1]!,
            "Missing solved root",
          )[1]!,
        ),
        fraction(m.x),
      ),
      "Wrong root in solution",
    );
    const substitutions = matched(
      /^원상황 확인: 첫 계산 \$([^$]+)\$, 비교 계산 \$([^$]+)\$이다\.$/,
      lines[2]!,
      "Both original quantities must be substituted",
    );
    const values = [m.a * m.x + m.b, m.c * m.x];
    [substitutions[1]!, substitutions[2]!].forEach((chain, i) => {
      const [expressionText, result, ...rest] = chain.split("=");
      demand(
        !rest.length &&
          expressionText &&
          result &&
          same(scalar(expressionText), fraction(values[i]!)) &&
          same(scalar(result), fraction(values[i]!)),
        "Original quantity evaluation is incorrect",
      );
      // Multipliers and the solved number must actually appear, not only a bare claimed value.
      const expected =
        i === 0
          ? new RegExp(`^${m.a}\\\\times${m.x}\\+${m.b}$`)
          : new RegExp(`^${m.c}\\\\times${m.x}$`);
      demand(
        expected.test(expressionText!),
        "Original quantities were not substituted",
      );
    });
    const relation = matched(
      /^\$([^$]+)\$이므로 첫 계산은 비교 계산보다 \$(\d+)\$만큼 (크다|작다)\.$/,
      lines[3]!,
      "Missing original comparison",
    );
    const comparison = relation[1]!.split("=");
    demand(
      comparison.length === 2 &&
        comparison[0] === `${values[0]}-${values[1]}` &&
        same(scalar(comparison[1]!), fraction(m.delta)) &&
        Number(relation[2]) === Math.abs(m.delta) &&
        (relation[3] === "크다") === m.delta > 0,
      "Original relation check disagrees with the wording",
    );
  });

export const verifyReinforcedSimplify = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(item, () => {
    const { question, answer } = selectedStudyAnswer(item),
      lines = question.split("\n");
    demand(
      lines.length === 2 &&
        lines[0] ===
          "다음 식을 전개하고 동류항끼리 정리하여 $Ax+B$로 나타낼 때, $x$의 계수 $A$와 상수항 $B$의 합 $A+B$의 값을 구하시오.",
      "Missing coefficient/constant interpretation target",
    );
    const printed = matched(
      /^\$\((.+)\)([+-]\d+)\((.+)\)\$$/,
      lines[1]!,
      "Missing distributive-expression structure",
    );
    demand(
      degree(polynomial(printed[1]!)) === 1 &&
        degree(polynomial(printed[3]!)) === 1,
      "Both printed inner expressions must be linear",
    );
    const expected = polynomial(lines[1]!),
      A = coefficient(expected, 1),
      B = coefficient(expected, 0);
    demand(
      degree(expected) <= 1 && same(integerAnswer(answer), add(A, B)),
      "Wrong coefficient-plus-constant target",
    );
    const proof = matched(
      /^괄호를 풀면 \$([^$]+)\$이다\.\n동류항끼리 모으면 \$([^$]+)\$이다\.\n따라서 \$A=([^$]+)\$, \$B=([^$]+)\$이므로 \$A\+B=([^$]+)\$이다\.$/,
      item.solution,
      "Missing expansion, collection, or interpretation",
    );
    demand(
      !/[()]/.test(proof[1]!) &&
        !/[()]/.test(proof[2]!) &&
        polynomialSame(polynomial(proof[1]!), expected) &&
        polynomialSame(polynomial(proof[2]!), expected) &&
        same(scalar(proof[3]!), A) &&
        same(scalar(proof[4]!), B) &&
        same(scalar(proof[5]!), add(A, B)),
      "Incorrect expansion/collection/interpretation in solution",
    );
  });

interface RectangleSituation {
  l: number;
  w: number;
  p: number;
  q: number;
  area: number;
  t: Fraction;
  upper: Fraction;
  L: Fraction;
  W: Fraction;
}
function rectangleWords(question: string): RectangleSituation {
  const m = matched(
    /^처음 가로 \$(\d+)\$ cm, 세로 \$(\d+)\$ cm인 직사각형이 있다\. 시작 후 가로는 매분 \$(\d+)\$ cm씩 늘어나고 세로는 매분 \$(\d+)\$ cm씩 줄어든다\. 두 변의 길이가 모두 양수인 동안만 생각한다\./,
    question,
    "Missing rectangle rates, units, or positive lengths",
  );
  demand(
    question.includes("방정식의 모든 실근") &&
      question.includes("처음 시각 $t=0$을 제외하고 양의 회복 시각") &&
      question.includes("원상황에 대입"),
    "Missing all-roots, positive-time, or original-situation demand",
  );
  const l = Number(m[1]),
    w = Number(m[2]),
    p = Number(m[3]),
    q = Number(m[4]);
  demand(
    l >= 1 && w >= 1 && p >= 1 && q >= 1 && Math.max(l, w, p, q) <= 20,
    "Unreviewed rectangle range",
  );
  // Solve the original product equation: constant cancels, roots are 0 and -b/a.
  const diff = equation(`(${l}+${p}t)(${w}-${q}t)=${l * w}`, "t");
  demand(
    degree(diff) === 2 && coefficient(diff, 0).n === 0,
    "Original area equation must include t=0",
  );
  const t = div(sub(fraction(0), coefficient(diff, 1)), coefficient(diff, 2));
  return {
    l,
    w,
    p,
    q,
    area: l * w,
    t,
    upper: fraction(w, q),
    L: add(fraction(l), mul(fraction(p), t)),
    W: sub(fraction(w), mul(fraction(q), t)),
  };
}
function rectangleDomainProof(text: string, m: RectangleSituation): void {
  const bound = matched(
    /^시간 조건: \$t>0\$, \$L\(t\)>0\$, \$W\(t\)>0\$이므로 \$0<t<([^$]+)\$\.$/m,
    text,
    "Missing positive time/length conditions or strict upper bound",
  );
  demand(same(scalar(bound[1]!), m.upper), "Wrong length-positive time bound");
}
function rectangleModelProof(text: string, m: RectangleSituation): void {
  const lengths = matched(
    /\$L\(t\)=([^$]+)\$, \$W\(t\)=([^$]+)\$ \(cm\)/,
    text,
    "Missing variable lengths and units",
  );
  demand(
    polynomialSame(polynomial(lengths[1]!, "t"), [
      fraction(m.l),
      fraction(m.p),
    ]) &&
      polynomialSame(polynomial(lengths[2]!, "t"), [
        fraction(m.w),
        fraction(-m.q),
      ]),
    "Wrong changing lengths",
  );
  const area = matched(
    /넓이 방정식: \$([^$]+)\$\. 정리하면 \$([^$]+)\$\./,
    text,
    "Missing original area equation and expansion",
  );
  const sides = area[1]!.split("=");
  demand(sides.length === 2, "Malformed area equality");
  demand(
    polynomialSame(polynomial(sides[0]!, "t"), [
      fraction(m.area),
      fraction(m.p * m.w - m.q * m.l),
      fraction(-m.p * m.q),
    ]) && same(scalar(sides[1]!), fraction(m.area)),
    "Area model not the original product",
  );
  demand(
    polynomialSame(equation(area[2]!, "t"), equation(area[1]!, "t")),
    "Wrong expanded area equation",
  );
}
function rectangleRootsProof(text: string, m: RectangleSituation): void {
  const roots = matched(
    /모든 실근: ([^\n]+)\n/,
    text,
    "Missing enumeration of every real root",
  )[1]!;
  const actual = maths(roots).map(scalar),
    expected = m.t.n ? [fraction(0), m.t] : [fraction(0)];
  demand(
    actual.length === expected.length &&
      actual.every((r, i) => same(r, expected[i]!)) &&
      (m.t.n !== 0 || roots.includes("중근")),
    "Missing/incorrect roots or repeated-zero branch",
  );
  demand(
    text.includes("$t=0$은 처음 시각이므로 제외한다."),
    "Zero root must be excluded as initial time",
  );
  if (positive(m.t)) {
    const accepted = matched(
      /남은 근 \$([^$]+)\$은 \$0<t<([^$]+)\$를 만족하므로 양의 회복 시각이다\./,
      text,
      "Missing positive-root admissibility",
    );
    demand(
      same(scalar(accepted[1]!), m.t) &&
        same(scalar(accepted[2]!), m.upper) &&
        positive(sub(m.upper, m.t)) &&
        positive(m.L) &&
        positive(m.W),
      "Accepted root violates positive time/length domain",
    );
  } else
    demand(
      text.includes("나머지 근도 $t\\le0$이므로 양의 회복 시각은 없다."),
      "Nonpositive roots require exclusion reason",
    );
}
function rectangleCheckProof(text: string, m: RectangleSituation): void {
  if (!positive(m.t)) {
    demand(
      text.includes(
        "모든 실근이 양수 조건 $t>0$을 만족하지 않으므로 나중의 넓이 회복은 없다.",
      ),
      "Missing all-root domain check",
    );
    return;
  }
  const check = matched(
    /대입 확인: \$L\(([^$]+)\)=([^$]+)\$, \$W\(([^$]+)\)=([^$]+)\$, \$([^$]+)\$ \(cm²\)\. 두 길이는 양수이다\./,
    text,
    "Missing original two-length/area/unit check",
  );
  demand(
    same(scalar(check[1]!), m.t) &&
      same(scalar(check[3]!), m.t) &&
      same(scalar(check[2]!), m.L) &&
      same(scalar(check[4]!), m.W),
    "Wrong length values at returned time",
  );
  const parts = check[5]!.split("=");
  demand(parts.length === 2, "Missing area substitution equality");
  const product = parts[0]!.split("\\times");
  demand(
    product.length === 2 &&
      same(scalar(product[0]!), m.L) &&
      same(scalar(product[1]!), m.W) &&
      same(mul(m.L, m.W), fraction(m.area)) &&
      same(scalar(parts[1]!), fraction(m.area)),
    "Original area substitution incorrect",
  );
}
export const verifyReinforcedRectangle = (
  item: ExamStudyDraft,
): ExamStudyVerification =>
  verify(
    item,
    () => {
      demand(
        item.questionType === "서술형",
        "Rectangle reasoning remains native written only",
      );
      const m = rectangleWords(item.content),
        model = item.solution.split(/\n\n채점 기준/)[0]!;
      rectangleDomainProof(model, m);
      rectangleModelProof(model, m);
      rectangleRootsProof(model, m);
      rectangleCheckProof(model, m);
      if (positive(m.t)) {
        const a = matched(
          /^\$([^$]+)\$분 후; 가로 \$([^$]+)\$ cm, 세로 \$([^$]+)\$ cm$/,
          item.answer,
          "Missing admissible time/length answer",
        );
        demand(
          same(scalar(a[1]!), m.t) &&
            same(scalar(a[2]!), m.L) &&
            same(scalar(a[3]!), m.W),
          "Wrong rectangle answer",
        );
      } else
        demand(
          item.answer === "양의 회복 시각 없음",
          "Nonpositive roots cannot be returned",
        );
      const rubric = item.rubric!;
      demand(
        rubric.totalPoints === 8 && rubric.criteria.length === 4,
        "Rectangle rubric must cover four essential actions",
      );
      const validators = {
        domain: rectangleDomainProof,
        model: rectangleModelProof,
        roots: rectangleRootsProof,
        check: rectangleCheckProof,
      };
      // These are closed authored guidance, not free-form grading input. Broad
      // keyword matches accept the opposite instruction with the same words.
      // Numerical expected proofs above remain independently solved from text.
      const guidance = {
        domain: {
          alternatives: [
            "두 변의 양수 조건을 시간 부등식으로 각각 구해 공통 범위를 제시",
          ],
          errors: [
            "처음 시각 t=0을 나중 회복으로 인정",
            "줄어드는 변이 0인 시각을 허용",
          ],
        },
        model: {
          alternatives: [
            "변화한 두 길이의 곱에서 처음 넓이를 빼서 방정식 작성",
          ],
          errors: ["줄어드는 변의 변화 부호를 반대로 둠"],
        },
        roots: {
          alternatives: [
            "인수분해 또는 이차방정식 근의 공식으로 모든 근을 구하고 시간 조건으로 판정",
          ],
          errors: [
            "t로 나누어 0인 근을 누락",
            "음의 시간을 나중 회복으로 인정",
          ],
        },
        check: {
          alternatives: [
            "허용한 시간을 원래 두 길이에 대입하고 넓이와 양수 조건 확인; 허용 근이 없으면 모든 근의 시간 조건 확인",
          ],
          errors: ["원래 두 길이와 넓이의 대입 검산 생략"],
        },
      } as const;
      for (const c of rubric.criteria) {
        demand(
          Object.hasOwn(validators, c.criterionId) && c.points === 2,
          "Unknown/misweighted rubric criterion",
        );
        const id = c.criterionId as keyof typeof validators;
        validators[id](c.expected, m);
        demand(
          JSON.stringify(c.alternatives) ===
            JSON.stringify(guidance[id].alternatives) &&
            JSON.stringify(c.errors) === JSON.stringify(guidance[id].errors),
          "Rubric guidance is unsupported or contradicts the reviewed methods/errors",
        );
        // The teacher's serialized rubric must carry the same reviewed semantics as its structured form.
        demand(
          item.solution.includes(
            `${id} (${c.points}점): ${c.expected} / 허용 다른 풀이: ${c.alternatives.join("; ")} / 흔한 오류: ${c.errors.join("; ")}`,
          ),
          "Printed and structured rubric diverge",
        );
      }
    },
    true,
  );
