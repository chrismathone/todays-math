/** C01~C04: unregistered primary authors. Helpers supply numbers, never the assessment. */
import type {
  NativeAuthorDefinition,
  NativeHelperAdapters,
  NativeHelperResults,
  NativePrimaryAuthor,
} from "../../../contracts/descriptiveAuthor.contract";
import {
  nativeExternalId,
  nativeFamilyKey,
  serializeNativeSolution,
  type NativeCriterionR2,
  type NativeDescriptiveProblemR2,
  type NativeFact,
} from "../../../contracts/nativeDescriptive.contract";
import { generateMiddleProblem } from "../../middle/generate";
import { eulReul } from "../../middle/m2Josa";
import type { NativeGateSuite } from "../nativeDescriptiveGates";
import {
  verifyLcmExponent,
  verifyRationalRepair,
  verifyDiscountModel,
  verifyIntegerBudget,
} from "../descriptiveVerification/batch1Lower";
import type { NativeIndependentVerifier } from "../descriptiveVerification/types";
import { createNativeAuthoredTask } from "./compose";

export const LCM_EXPONENT_HELPER_TYPE = "1-1|최대공약수와 최소공배수|07";
export const RATIONAL_REPAIR_HELPER_TYPE = "1-1|정수와 유리수의 계산|08";
export const DISCOUNT_MODEL_HELPER_TYPE = "1-1|일차방정식의 활용|34";
export const INTEGER_BUDGET_HELPER_TYPE = "2-1|일차부등식의 활용|04";

type Row = {
  id: string;
  prompt: string;
  evidence: string;
  points: number;
  full: string;
  partial: NativeCriterionR2["scoring"]["partial"];
  zero: string;
  alternatives: string[];
  errors: string[];
  relation: string;
  carry?: string;
};
type AuthoredValues = {
  introduction: string;
  given: NativeFact[];
  values: { value: string; expected: string; unit?: string }[];
  answer: string;
};
type Plan = {
  definition: Omit<
    NativeAuthorDefinition,
    "revision" | "subquestions" | "studentEvidence"
  >;
  helperType: string;
  rows: Row[];
  write(f: Record<string, number>, variant: number): AuthoredValues;
};

/** Evidence and criteria are fixed before a helper is invoked. Points reflect each task. */
function primaryAuthor(plan: Plan): NativePrimaryAuthor {
  const { rows } = plan;
  const definition: NativeAuthorDefinition = {
    ...plan.definition,
    revision: 2,
    studentEvidence: rows.map((r) => r.evidence),
    subquestions: rows.map((r) => ({
      requirementId: `${definitionId(plan)}-${r.id}`,
      text: r.prompt,
      points: r.points,
    })),
  };
  return {
    definition,
    helpers: [
      {
        id: "numbers",
        kind: "calculation",
        request: (context) => ({
          ...context,
          id: "numbers",
          kind: "calculation",
          engine: "middle",
          typeKey: plan.helperType,
        }),
      },
    ],
    compose({ seed, variant }, completed) {
      if (variant !== 0 && variant !== 1)
        throw new Error("허용 변형은 0·1입니다");
      const values = plan.write(numbers(completed, plan.helperType), variant);
      if (values.values.length !== rows.length)
        throw new Error("배점 대상 누락");
      const criteria: NativeCriterionR2[] = rows.map((row, i) => ({
        criterionId: row.id,
        requirementId: definition.subquestions[i]!.requirementId,
        factKey: row.id,
        role: i === rows.length - 1 ? "answer" : "method",
        expected: values.values[i]!.expected,
        points: row.points,
        evidence: row.evidence,
        alternatives: row.alternatives,
        errors: row.errors,
        scoring: {
          full: row.full,
          partial: row.partial,
          zero: `만점·부분점수를 높은 점수부터 적용하고 나머지는 0점(무응답 포함). ${row.zero}.`,
        },
        carryForward: {
          fromFactKeys: rows.slice(0, i).map((r) => r.id),
          rule: "preserve-method-points",
          condition:
            row.carry ??
            (i === rows.length - 1
              ? "최종답 기준이므로 선행 오류를 따른 틀린 최종답에는 점수를 주지 않는다. 방법 점수 보존은 앞의 방법 기준에만 적용한다."
              : i === 0
                ? "선행 기준 없음"
                : `선행 수치·부호·식 오류에는 이 규정을 일반 0점보다 우선한다. 그 입력으로 현재 방법을 모두 바르게 수행하면 만점 ${row.points}점, 일부만 옳으면 부분점수를 준다. 선행 오류는 다시 감점하지 않고 현재 새 오류는 감점한다.`),
        },
      }));
      const rubric = {
        revision: 2 as const,
        totalPoints: rows.reduce((n, r) => n + r.points, 0),
        criteria,
      };
      const modelAnswer = values.values
        .map((v, i) => `(${i + 1}) ${v.expected}`)
        .join("\n");
      return {
        revision: 2,
        definitionId: definition.definitionId,
        familyKey: nativeFamilyKey(definition.definitionId),
        externalId: nativeExternalId({
          definitionId: definition.definitionId,
          seed,
          variant,
        }),
        seed,
        variant,
        questionType: "서술형",
        problemType: "활용",
        content: `${values.introduction}\n${rows.map((r, i) => `(${i + 1}) ${r.prompt}`).join("\n")}`,
        answer: values.answer,
        modelAnswer,
        solution: serializeNativeSolution(modelAnswer, rubric),
        rubric,
        curriculum: structuredClone(definition.curriculum),
        figureSpec: null,
        requirements: rows.map((r, i) => ({
          requirementId: definition.subquestions[i]!.requirementId,
          text: r.prompt,
          criterionIds: [r.id],
        })),
        facts: [
          ...values.given,
          ...values.values.map((v, i) => ({
            factKey: rows[i]!.id,
            kind:
              i === rows.length - 1
                ? ("answer" as const)
                : ("intermediate" as const),
            value: v.value,
            ...(v.unit ? { unit: v.unit } : {}),
          })),
        ],
        steps: rows.map((r, i) => ({
          stepId: r.id,
          kind: "deduction",
          inputFactKeys:
            i === 0 ? values.given.map((f) => f.factKey) : [rows[i - 1]!.id],
          relation: r.relation,
          outputFactKey: r.id,
        })),
      };
    },
  };
}
const definitionId = (plan: Plan) => plan.definition.definitionId;
function numbers(completed: NativeHelperResults, typeKey: string) {
  const h = completed.get("numbers");
  if (!h || h.kind !== "calculation" || h.typeKey !== typeKey)
    throw new Error("계산 보조가 없습니다");
  return h.problem.facts;
}
function ints(f: Record<string, number>, keys: string[]) {
  if (keys.some((key) => !Number.isSafeInteger(f[key])))
    throw new Error("보조 정수 누락");
}
const given = (
  factKey: string,
  value: string | number,
  unit?: string,
): NativeFact => ({
  factKey,
  kind: "given",
  value: String(value),
  ...(unit ? { unit } : {}),
});
const limits =
  "2027 겨울 선행용 미등록 정의. 배점은 학원 자체 초안이며 학교 난도·교사 채점 일치율은 미측정. studyRequirementIds는 관련 요소만 가리키며 새 서술 요구의 완전 대응을 뜻하지 않는다.";
function curriculum(grade: "중1" | "중2", standards: [string, string][]) {
  return {
    revision: 2022 as const,
    schoolYear: 2027,
    grade,
    semester: 1 as const,
    achievementStandards: standards.map(([code, description]) => ({
      code,
      description,
    })),
  };
}

function factor(n: number): [number, number][] {
  const result: [number, number][] = [];
  for (let p = 2; p <= n; p++) {
    let e = 0;
    while (n % p === 0) {
      n /= p;
      e++;
    }
    if (e) result.push([p, e]);
  }
  return result;
}
const powers = (entries: [number, number][]) =>
  entries
    .map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`))
    .join("\\times");

export const lcmExponentAuthor = primaryAuthor({
  helperType: LCM_EXPONENT_HELPER_TYPE,
  definition: {
    definitionId: "m1-lcm-exponent-evidence-r2",
    title: "최소공배수의 지수를 고르는 이유",
    grade: "중1",
    chapter: "1. 소인수분해",
    unitSection: "공배수와 최소공배수",
    difficulty: "응용",
    difficultyBasis: "소인수별 지수 비교와 공배수의 필요조건 및 최소성 설명",
    differentAction:
      "단답의 최소공배수 외에 지수 비교표와 큰 지수 선택·최소성의 이유를 요구한다.",
    limits,
    curriculum: curriculum("중1", [
      ["9수01-01", "소인수분해의 뜻을 알고 자연수를 소인수분해할 수 있다."],
      [
        "9수01-02",
        "소인수분해를 이용하여 최대공약수와 최소공배수를 구할 수 있다.",
      ],
    ]),
    assessmentObjective:
      "각 소인수의 지수 선택을 두 수로 나누어떨어져야 한다는 조건과 연결한다.",
    studyRequirementIds: ["number.coprime-symbolic-sum"],
    situation: "두 자연수의 최소공배수를 구하면서 지수 선택을 설명한다.",
  },
  rows: [
    {
      id: "exponents",
      points: 2,
      prompt:
        "두 수를 소인수분해하고, 나타나는 모든 소인수에 대해 A와 B의 지수를 비교표로 쓰시오. 없는 소인수의 지수는 0으로 쓰시오.",
      evidence: "소인수별 A·B 지수 비교표",
      relation: "자연수의 소인수분해",
      full: "두 수의 소인수분해와 모든 소인수의 두 지수를 빠짐없이 제시",
      partial: [
        {
          points: 1,
          condition:
            "한 수 이상의 소인수분해 또는 비교표에서 한 소인수의 두 지수가 옳지만 만점 조건에 미달",
        },
      ],
      zero: "두 수 모두 소인수와 지수의 증거가 성립하지 않음",
      alternatives: [
        "소인수분해식 두 개와 대응하는 지수 목록으로 비교표를 대신함",
      ],
      errors: ["한쪽에 없는 소인수를 누락", "밑과 지수를 혼동"],
    },
    {
      id: "selection",
      points: 3,
      prompt:
        "최소공배수에 쓸 각 소인수의 지수를 고르시오. 그보다 작은 지수로는 왜 두 수의 공배수가 안 되는지, 더 큰 지수를 쓸 필요는 왜 없는지 설명하시오.",
      evidence: "선택 지수와 공배수의 필요조건·최소성",
      relation: "배수의 소인수 지수는 각 약수의 지수 이상이어야 함",
      full: "각 지수의 선택과 작은 지수의 불가·더 큰 지수의 불필요를 모두 설명",
      partial: [
        {
          points: 2,
          condition:
            "선택 지수와 필요조건·최소성 중 한 근거는 옳지만 만점 조건에 미달",
        },
        {
          points: 1,
          condition:
            "지수 선택 또는 필요조건·최소성 중 하나 이상은 옳지만 2점 조건에 미달",
        },
      ],
      zero: "선택과 그 이유의 증거가 없음",
      alternatives: [
        "두 수를 각각 나누어떨어지게 하는 가장 작은 지수라고 설명",
      ],
      errors: ["작은 지수를 택함", "두 지수를 무조건 더함"],
    },
    {
      id: "lcm",
      points: 1,
      prompt: "선택한 소인수의 거듭제곱을 곱하여 최소공배수를 자연수로 쓰시오.",
      evidence: "최소공배수의 수치",
      relation: "선택한 소인수 거듭제곱의 곱",
      full: "최소공배수 수치가 옳음",
      partial: [],
      zero: "최소공배수 수치가 틀리거나 없음",
      alternatives: ["거듭제곱을 풀어 반복곱셈"],
      errors: ["거듭제곱의 곱셈 오류"],
    },
  ],
  write(f, variant) {
    ints(f, ["A", "B", "L", "kind"]);
    if (
      f.A! < 2 ||
      f.B! < 2 ||
      f.A! > 400 ||
      f.B! > 400 ||
      ![0, 1].includes(f.kind!)
    )
      throw new Error("최소공배수 보조 범위 오류");
    const fa = factor(f.A!),
      fb = factor(f.B!);
    const primes = [...new Set([...fa, ...fb].map(([p]) => p))].sort(
      (a, b) => a - b,
    );
    const table = primes.map((p) => [
      p,
      fa.find(([q]) => p === q)?.[1] ?? 0,
      fb.find(([q]) => p === q)?.[1] ?? 0,
    ]);
    const selected: [number, number][] = table.map(([p, a, b]) => [
      p!,
      Math.max(a!, b!),
    ]);
    const lcm = selected.reduce((n, [p, e]) => n * p ** e, 1);
    if (lcm !== f.L || lcm > 6000) throw new Error("최소공배수 보조 관계 오류");
    const tableText = table.map(([p, a, b]) => `$${p}:(${a},${b})$`).join(", ");
    const choices = selected.map(([p, e]) => `$${p}:${e}$`).join(", ");
    return {
      // Factoring is assessed: even a factorized helper must become ordinary integers here.
      introduction: `${variant === 0 ? "연습" : "탐구"} 카드에 두 자연수 $A=${f.A}$, $B=${f.B}$가 적혀 있다.`,
      given: [given("A", f.A!), given("B", f.B!)],
      values: [
        {
          value: table.map((t) => t.join(":")).join(";"),
          expected: `$A=${powers(fa)}$, $B=${powers(fb)}$이다. 지수 비교표 (A의 지수, B의 지수)는 ${tableText}이다.`,
        },
        {
          value: selected.map(([p, e]) => `${p}:${e}`).join(";"),
          expected: `선택 지수는 ${choices}이다. 공배수는 A와 B로 모두 나누어떨어져야 하므로 각 소인수의 지수는 A의 지수와 B의 지수 이상이어야 한다. 작은 지수를 택하면 더 큰 지수를 가진 수로 나누어떨어지지 않는다. 더 큰 지수를 택하면 두 수의 공배수이지만 최소가 아니므로 필요 없다.`,
        },
        {
          value: String(lcm),
          expected: `$${powers(selected)}=${lcm}$이므로 최소공배수는 $${lcm}$이다.`,
        },
      ],
      answer: String(lcm),
    };
  },
});

type Q = { n: number; d: number };
function rational(n: number, d: number): Q {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0)
    throw new Error("분수 범위 오류");
  let a = Math.abs(n),
    b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
const plus = (x: Q, y: Q, sign = 1) =>
  rational(x.n * y.d + sign * y.n * x.d, x.d * y.d);
const qt = ({ n, d }: Q) =>
  d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`;
const qv = ({ n, d }: Q) => `${n}/${d}`;

export const rationalRepairAuthor = primaryAuthor({
  helperType: RATIONAL_REPAIR_HELPER_TYPE,
  definition: {
    definitionId: "m1-rational-repair-evidence-r2",
    title: "잘못한 덧셈·뺄셈을 되돌리고 고치기",
    grade: "중1",
    chapter: "2. 정수와 유리수",
    unitSection: "유리수의 덧셈과 뺄셈",
    difficulty: "응용",
    difficultyBasis: "잘못한 연산의 역연산, 원래 연산, 두 결과의 차이를 연결",
    differentAction:
      "단답의 바른 결과 외에 잘못된 관계식·원 수 복원·두 결과 차이의 이유를 요구한다.",
    limits,
    curriculum: curriculum("중1", [
      [
        "9수01-05",
        "정수와 유리수의 사칙계산의 원리를 이해하고 그 계산을 할 수 있다.",
      ],
    ]),
    assessmentObjective:
      "잘못한 연산의 관계를 식으로 쓰고 역연산으로 복원한 뒤 결과 차이를 설명한다.",
    studyRequirementIds: ["algebra.error-identity"],
    situation: "덧셈과 뺄셈을 바꾸어 계산한 기록을 고친다.",
  },
  rows: [
    {
      id: "wrong-relation",
      points: 2,
      prompt:
        "원래 유리수를 x라 하고, 잘못 계산한 기록의 관계식을 쓰시오. 식의 부호가 그 기록을 나타내는 이유도 쓰시오.",
      evidence: "잘못한 연산의 식과 연산 부호의 이유",
      relation: "잘못한 연산을 등식으로 번역",
      full: "잘못한 연산의 식과 부호 이유가 모두 옳음",
      partial: [
        { points: 1, condition: "식은 옳으나 부호 이유가 빠지거나 틀림" },
      ],
      zero: "잘못한 연산의 관계를 나타내지 못함",
      alternatives: ["미지수를 빈칸으로 표시한 관계식"],
      errors: ["바르게 할 연산을 잘못한 기록의 식에 씀"],
    },
    {
      id: "original",
      points: 1,
      prompt: "잘못한 연산을 되돌리는 계산을 보이고 원래 유리수를 구하시오.",
      evidence: "역연산과 원래 유리수",
      relation: "등식 양변에 같은 수를 더하거나 빼기",
      full: "원 수를 구하는 올바른 역연산식과 계산을 제시함. 단순 계산 실수는 감점하지 않음",
      partial: [],
      zero: "원 수만 쓰거나 역연산이 성립하지 않음",
      alternatives: ["이항하여 원 수를 구하되 부호 변경 과정을 보임"],
      errors: ["같은 연산을 한 번 더 함"],
      carry:
        "일반 0점보다 우선한다. 선행 식의 부호·수치가 틀려도 그 식의 올바른 역연산과 계산을 제시하면 1점이다. 단순 계산 실수도 감점하지 않는다. 원 수만 쓰거나 역연산 자체를 틀리면 0점이다.",
    },
    {
      id: "repair-gap",
      points: 2,
      prompt:
        "바르게 할 계산식을 쓰시오. (바른 결과)−(잘못한 결과)를 구하고, 그 차이가 생기는 이유를 두 식을 비교하여 설명하시오.",
      evidence: "바르게 할 식과 부호를 포함한 결과 차이 및 이유",
      relation: "두 식에서 같은 미지수를 소거하여 차이를 구함",
      full: "바르게 할 식·결과 차이·같은 원 수가 소거되는 설명이 모두 옳음",
      partial: [
        {
          points: 1,
          condition:
            "바르게 할 식은 옳으나 결과 차이 또는 설명이 빠지거나 틀림, 또는 차이와 그 근거는 옳지만 바르게 할 식을 쓰지 않음",
        },
      ],
      zero: "바르게 할 식과 차이 근거 모두 성립하지 않음",
      alternatives: ["수직선에서 반대 방향으로 같은 수만큼 이동한 차이를 설명"],
      errors: ["결과 차이를 한 번의 더한 수로 봄", "뺄셈 순서를 뒤집음"],
    },
    {
      id: "correct",
      points: 1,
      prompt: "바르게 계산한 결과를 기약분수 또는 정수로 쓰시오.",
      evidence: "바른 결과",
      relation: "복원한 수에 원래 연산 적용",
      full: "기약분수 또는 정수인 바른 결과",
      partial: [],
      zero: "결과가 틀리거나 약분하지 않음",
      alternatives: ["동치인 기약분수 표기"],
      errors: ["음수 부호 누락"],
    },
  ],
  write(f, variant) {
    ints(f, ["xn", "xd", "an", "ad", "rn", "rd", "sn", "sd", "wrongIsAdd"]);
    const x = rational(f.xn!, f.xd!),
      a = rational(f.an!, f.ad!);
    const r = rational(f.rn!, f.rd!),
      s = rational(f.sn!, f.sd!);
    const sign = f.wrongIsAdd === 1 ? 1 : -1;
    if (
      ![0, 1].includes(f.wrongIsAdd!) ||
      a.d < 2 ||
      qv(plus(x, a, sign)) !== qv(r) ||
      qv(plus(x, a, -sign)) !== qv(s)
    )
      throw new Error("유리수 보조 관계 오류");
    const op = sign === 1 ? "+" : "-",
      undo = sign === 1 ? "-" : "+";
    const delta = rational(-2 * sign * a.n, a.d);
    const relation = `x${op}(${qt(a)})=${qt(r)}`;
    const recover = `${qt(r)}${undo}(${qt(a)})=${qt(x)}`;
    const repair = `x${undo}(${qt(a)})`;
    const gap = `${sign === 1 ? "-" : ""}2\\times(${qt(a)})=${qt(delta)}`;
    return {
      introduction: `${variant === 0 ? "민서" : "지우"}는 어떤 유리수에 대해 다음 기록을 남겼다. 원래는 $${qt(a)}$${eulReul(a.n)} ${sign === 1 ? "빼야" : "더해야"} 하는데, 잘못하여 ${sign === 1 ? "더했더니" : "뺐더니"} 결과가 $${qt(r)}$이었다.`,
      given: [
        given("operand", qv(a)),
        given("wrong-result", qv(r)),
        given("wrong-operation", sign === 1 ? "add" : "subtract"),
      ],
      values: [
        {
          value: relation,
          expected: `$${relation}$이다. 기록에서 ${sign === 1 ? "더했으므로 덧셈" : "뺐으므로 뺄셈"} 부호를 쓴다.`,
        },
        {
          value: qv(x),
          expected: `${sign === 1 ? "양변에서 같은 수를 빼면" : "양변에 같은 수를 더하면"} $x=${recover}$이다.`,
        },
        {
          value: `${repair};delta=${qv(delta)}`,
          expected: `바르게 할 식은 $${repair}$이다. 두 식에서 같은 x가 소거되므로 (바른 결과)−(잘못한 결과)는 $${gap}$이다.`,
        },
        {
          value: qv(s),
          expected: `$${qt(x)}${undo}(${qt(a)})=${qt(s)}$이므로 바른 결과는 $${qt(s)}$이다.`,
        },
      ],
      answer: `$${qt(s)}$`,
    };
  },
});

export const discountModelAuthor = primaryAuthor({
  helperType: DISCOUNT_MODEL_HELPER_TYPE,
  definition: {
    definitionId: "m1-discount-model-evidence-r2",
    title: "할인의 기준량으로 정가 구하기",
    grade: "중1",
    chapter: "3. 방정식",
    unitSection: "일차방정식의 활용(증가와 감소, 원가와 정가)",
    difficulty: "응용",
    difficultyBasis:
      "할인율의 기준량을 정가에 연결하고 판매가 식과 원조건을 검토",
    differentAction:
      "정가만 구하는 단답 외에 할인액의 기준량·등식 풀이·원상황 검산을 요구한다.",
    limits,
    curriculum: curriculum("중1", [
      ["9수02-01", "다양한 상황을 문자를 사용한 식으로 나타낼 수 있다."],
      [
        "9수02-04",
        "일차방정식을 풀 수 있고 이를 활용하여 문제를 해결할 수 있다.",
      ],
    ]),
    assessmentObjective:
      "할인율의 기준량을 명확히 하여 정가·할인액·판매가의 관계를 설명한다.",
    studyRequirementIds: ["algebra.linear-model"],
    situation: "정가에서 할인해 판매한 물품의 원래 가격을 복원한다.",
  },
  rows: [
    {
      id: "discount",
      points: 2,
      prompt:
        "정가를 x원이라 할 때 할인액을 x를 사용한 식으로 나타내고, 할인율의 기준량이 무엇인지 설명하시오.",
      evidence: "할인액 식과 기준량인 정가",
      relation: "기준량과 백분율의 곱",
      full: "할인액 식과 정가가 기준량이라는 설명 모두 옳음",
      partial: [
        {
          points: 1,
          condition: "할인액 식만 옳거나 정가가 기준량임만 옳게 설명",
        },
      ],
      zero: "할인액 식과 기준량 모두 틀리거나 없음",
      alternatives: ["소수 또는 기약분수로 할인액 표현"],
      errors: ["판매가를 할인율의 기준량으로 삼음"],
    },
    {
      id: "equation",
      points: 3,
      prompt:
        "정가에서 할인액을 빼는 방법 또는 정가에 남은 비율을 곱하는 방법으로 방정식을 세우고, 푸는 과정을 보이시오.",
      evidence: "할인 조건에 맞는 정가와 판매가의 관계식 및 일차방정식 풀이",
      relation: "정가와 판매가의 관계를 정리하고 등식의 성질 적용",
      full: "관계식과 등식의 성질을 이용한 풀이가 모두 옳음",
      partial: [
        { points: 2, condition: "관계식과 푸는 방법은 옳으나 산술 실수" },
        { points: 1, condition: "올바른 관계식만 제시" },
      ],
      zero: "할인 조건에 맞는 정가와 판매가의 관계식이 없음",
      alternatives: ["판매가가 정가의 남은 백분율이라는 식으로 직접 풀기"],
      errors: ["할인율과 남은 비율 혼동"],
    },
    {
      id: "price",
      points: 1,
      prompt:
        "정가를 단위와 함께 쓰고, 구한 정가에 할인 조건을 적용하면 주어진 판매가가 되는지 계산하여 확인하시오.",
      evidence: "정가·원 단위와 할인 조건을 적용한 검산",
      relation: "구한 정가를 원상황에 대입",
      full: "정가와 원 단위 및 원상황 검산 모두 옳음",
      partial: [],
      zero: "정가만 쓰거나 원상황 검산이 성립하지 않음",
      alternatives: ["정가에 남은 비율을 곱해 판매가 확인"],
      errors: ["단위 누락", "정가에 할인율을 더함"],
    },
  ],
  write(f, variant) {
    ints(f, ["rate", "price", "sale"]);
    const {
      rate: r,
      price: p,
      sale: s,
    } = f as { rate: number; price: number; sale: number };
    if (
      ![10, 20, 25, 40].includes(r) ||
      p < 4000 ||
      p > 20000 ||
      p % 1000 ||
      p * (100 - r) !== s * 100
    )
      throw new Error("할인 보조 범위/관계 오류");
    const discount = (p * r) / 100;
    return {
      introduction: `${variant === 0 ? "문구" : "미술"} 용품 한 개를 정가에서 $${r}\\%$ 할인하여 $${s}$원에 판매했다.`,
      given: [given("rate", r, "%"), given("sale", s, "원")],
      values: [
        {
          value: `${r}x/100`,
          unit: "원",
          expected: `기준량은 정가 x원이다. 할인액은 $\\frac{${r}}{100}x$원이다.`,
        },
        {
          value: `x-${r}x/100=${s};${100 - r}x=${100 * s};x=${p}`,
          expected: `$x-\\frac{${r}}{100}x=${s}$에서 양변에 100을 곱하면 $${100 - r}x=${100 * s}$이므로 $x=${p}$이다.`,
        },
        {
          value: String(p),
          unit: "원",
          expected: `정가는 $${p}$원이다. 할인액은 $${p}\\times\\frac{${r}}{100}=${discount}$원이므로 $${p}-${discount}=${s}$원으로 판매가와 같다.`,
        },
      ],
      answer: `${p}원`,
    };
  },
});

export const integerBudgetAuthor = primaryAuthor({
  helperType: INTEGER_BUDGET_HELPER_TYPE,
  definition: {
    definitionId: "m2-integer-budget-evidence-r2",
    title: "예산 안에서 살 수 있는 정수 최댓값",
    grade: "중2",
    chapter: "2. 부등식",
    unitSection: "일차부등식의 활용(개수, 예금액, 유리한 방법)",
    difficulty: "응용",
    difficultyBasis: "고정비를 포함한 부등식과 정수 경계의 양쪽 비용 확인",
    differentAction:
      "개수 단답 외에 부등식·실수 경계·선택 정수와 다음 정수의 비용을 요구한다.",
    limits,
    curriculum: curriculum("중2", [
      ["9수02-11", "부등식과 그 해의 뜻을 알고 부등식의 성질을 이해한다."],
      [
        "9수02-12",
        "일차부등식을 풀 수 있고 이를 활용하여 문제를 해결할 수 있다.",
      ],
    ]),
    assessmentObjective:
      "고정비·단가로 부등식을 세우고 정수 최댓값을 다음 정수의 불가능성으로 정당화한다.",
    studyRequirementIds: ["algebra.inequality-solution-count"],
    situation: "예산 안에서 한 상자에 담을 준비물의 최대 개수를 정한다.",
  },
  rows: [
    {
      id: "inequality",
      points: 2,
      prompt:
        "물품을 x개 산다고 할 때 전체 비용의 부등식을 세우고, 각 항과 부등호의 뜻을 설명하시오.",
      evidence: "단가×개수+고정비≤예산과 각 항의 뜻",
      relation: "총비용의 선형 모델과 예산의 상한",
      full: "비용식과 이하 부등호 및 각 항의 의미 모두 옳음",
      partial: [
        { points: 1, condition: "부등식은 옳으나 항 또는 부등호의 뜻이 빠짐" },
      ],
      zero: "전체 비용의 부등식을 세우지 못함",
      alternatives: [
        "전체 비용의 식과 각 항의 뜻을 먼저 쓰고, 고정비를 뺀 동치 부등식으로 나타냄",
      ],
      errors: ["상자값을 개수만큼 곱함", "이하를 미만으로 바꿈"],
    },
    {
      id: "bound",
      points: 2,
      prompt:
        "부등식을 풀어 x의 범위를 기약분수, 정수 또는 정확한 소수로 나타내시오. 나누는 수의 부호와 부등호 방향의 관계도 설명하시오.",
      evidence: "비용 잔액·나눗셈·실수 경계와 방향 유지 이유",
      relation: "양수를 나누는 부등식의 성질",
      full: "정리 과정·경계와 양수로 나누어 부등호를 유지한다는 이유 모두 옳음",
      partial: [
        {
          points: 1,
          condition: "정리 방법은 옳으나 계산 또는 부등호 이유가 빠짐",
        },
      ],
      zero: "부등식 정리 방법이 성립하지 않음",
      alternatives: [
        "같은 값의 정확한 유한소수 또는 순환마디를 명시한 순환소수로 경계 표시",
      ],
      errors: ["양수로 나누며 부등호를 뒤집음", "경계를 반올림"],
    },
    {
      id: "boundary-check",
      points: 2,
      prompt:
        "가능한 가장 큰 정수 개수와 그보다 1개 많은 경우의 비용을 각각 계산하여 예산과 비교하시오. 이 비교가 정수 최댓값을 보장하는 이유도 쓰시오.",
      evidence: "선택 정수·다음 정수의 비용 두 값과 단가 양수에 따른 증가",
      relation: "정수 경계 양쪽 대입과 비용의 증가",
      full: "두 비용과 예산의 비교 및 개수가 늘면 비용이 증가한다는 이유 모두 옳음",
      partial: [
        {
          points: 1,
          condition:
            "두 비용 비교는 옳지만 증가 이유가 없거나, 선택 정수의 가능성·다음 정수의 불가능성 중 하나만 옳게 확인",
        },
      ],
      zero: "어느 경계에서도 비용·예산 비교가 성립하지 않음",
      alternatives: [
        "두 경우의 비용과 예산 비교를 함께 쓰고, 남는 돈이 한 개 가격보다 작음을 이용하여 단가 양수에 따른 불가능성을 설명",
      ],
      errors: ["다음 정수의 비용을 확인하지 않음"],
    },
    {
      id: "maximum",
      points: 1,
      prompt: "살 수 있는 물품의 최대 개수를 단위와 함께 쓰시오.",
      evidence: "최대 개수와 개 단위",
      relation: "가능성과 다음 정수 불가능성으로 최댓값 결론",
      full: "최대 정수 개수와 개 단위 모두 옳음",
      partial: [],
      zero: "개수 또는 단위가 틀림",
      alternatives: ["동일한 개수의 문장 답안"],
      errors: ["실수 경계를 그대로 개수로 씀"],
    },
  ],
  write(f, variant) {
    ints(f, ["p", "f", "T", "n"]);
    const {
      p,
      f: box,
      T,
      n,
    } = f as { p: number; f: number; T: number; n: number };
    const remainder = T - box - p * n;
    if (
      ![800, 1000, 1200, 1500].includes(p) ||
      ![2000, 2500, 3000].includes(box) ||
      n < 5 ||
      n > 15 ||
      remainder < 0 ||
      remainder >= p ||
      remainder % 100
    )
      throw new Error("예산 보조 범위/관계 오류");
    const bound = rational(T - box, p),
      cost = p * n + box,
      next = p * (n + 1) + box;
    return {
      introduction: `${variant === 0 ? "준비물" : "꾸러미"} 물품은 한 개에 $${p}$원이다. 물품을 한 상자에 담을 때 상자값 $${box}$원을 한 번 내야 한다. 전체 비용을 $${T}$원 이하로 하며 물품은 쪼개어 살 수 없다.`,
      given: [
        given("unit-price", p, "원/개"),
        given("fixed-cost", box, "원"),
        given("budget", T, "원"),
      ],
      values: [
        {
          value: `${p}x+${box}<=${T}`,
          expected: `$${p}x+${box}\\le${T}$이다. 물품값은 $${p}x$원, 한 번 내는 상자값은 $${box}$원이며 이하이므로 등호를 포함한다.`,
        },
        {
          value: `${p}x<=${T - box};x<=${qv(bound)}`,
          expected: `$${p}x\\le${T - box}$이므로 $x\\le${qt(bound)}$이다. 양수인 $${p}$으로 나누므로 부등호 방향은 그대로이다.`,
        },
        {
          value: `n=${n};cost=${cost};next=${next}`,
          expected: `$${p}\\times${n}+${box}=${cost}\\le${T}$이고 $${p}\\times${n + 1}+${box}=${next}>${T}$이다. 단가가 양수여서 개수가 늘면 비용이 증가하므로 더 큰 정수도 불가능하다.`,
        },
        {
          value: String(n),
          unit: "개",
          expected: `따라서 최대 $${n}$개까지 살 수 있다.`,
        },
      ],
      answer: `${n}개`,
    };
  },
});

type LowerEntry = {
  candidateId: "C01" | "C02" | "C03" | "C04";
  author: NativePrimaryAuthor;
  verify: NativeIndependentVerifier;
  variants: readonly [0, 1];
  gateSuite(adapters: NativeHelperAdapters): Promise<NativeGateSuite>;
};

/** Enumerate the helper's admissible *numeric* domain, independently of its random draws.
 * gcdPair uses 1~2 common primes (exponents 1~2), 1~2 disjoint extra primes per side,
 * and may raise exactly one common prime on A's side by 1~2. B has no such bump.
 */
function lcmDomain(): string[] {
  const factors = new Map(
    Array.from({ length: 400 }, (_, i) => [i + 1, factor(i + 1)]),
  );
  const allowed = (fs: [number, number][]) =>
    fs.every(([p, e]) => [2, 3, 5, 7, 11, 13].includes(p) && e <= 2);
  const domain: string[] = [];
  for (let a = 2; a <= 400; a++) {
    for (let b = 2; b <= 400; b++) {
      let g = a,
        rest = b;
      while (rest) [g, rest] = [rest, g % rest];
      if (g > 60 || g === a || g === b || (a * b) / g > 6000) continue;
      const gf = factors.get(g)!,
        af = factors.get(a / g)!,
        bf = factors.get(b / g)!;
      if (
        !gf.length ||
        gf.length > 2 ||
        !allowed(gf) ||
        !allowed(af) ||
        !allowed(bf)
      )
        continue;
      const common = new Set(gf.map(([p]) => p));
      const aExtra = af.filter(([p]) => !common.has(p));
      if (
        aExtra.length < 1 ||
        aExtra.length > 2 ||
        af.length - aExtra.length > 1 ||
        bf.length < 1 ||
        bf.length > 2 ||
        bf.some(([p]) => common.has(p))
      )
        continue;
      domain.push(`${a},${b}`);
    }
  }
  return domain;
}

/** Small numeric domains are exhaustive; C02 uses a baseline and every declared branch. */
async function lowerSuite(
  entry: LowerEntry,
  adapters: NativeHelperAdapters,
): Promise<NativeGateSuite> {
  const type = entry.author.helpers[0]!.request(
    { seed: 0, variant: 0 },
    new Map(),
  );
  if (type.kind !== "calculation") throw new Error("계산 보조 아님");
  const required = new Map<string, Set<string>>();
  const set = (key: string, values: string[]) =>
    required.set(key, new Set(values));
  set("context", ["0", "1"]);
  if (entry.candidateId === "C01") {
    set("combination", lcmDomain());
    set("presentation", ["number"]);
    set("order", ["A<B", "A>B"]);
    set("common-exponents", ["equal", "different"]);
    for (const key of ["A-boundary", "B-boundary", "lcm-boundary"])
      set(key, ["min", "max", "interior"]);
  } else if (entry.candidateId === "C02") {
    set("operation-sign", ["add:-", "add:+", "subtract:-", "subtract:+"]);
    set("x-boundary", ["-9", "9", "-1/12", "1/12", "interior"]);
    set("a-boundary", ["-13/2", "13/2", "-1/12", "1/12", "interior"]);
    set("operand-denominator", ["2", "3", "4", "5", "6", "8", "10", "12"]);
    set("original-denominator", [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "8",
      "10",
      "12",
    ]);
    set(
      "denominator-pair-operation",
      [2, 3, 4, 5, 6, 8, 10, 12].flatMap((a) =>
        [1, 2, 3, 4, 5, 6, 8, 10, 12].flatMap((x) =>
          ["add", "subtract"].map((op) => `${a},${x},${op}`),
        ),
      ),
    );
    set("sign-pattern", [
      "add:++++",
      "add:+++-",
      "add:+-++",
      "add:+--+",
      "add:-++-",
      "add:-+--",
      "add:---+",
      "add:----",
      "subtract:++++",
      "subtract:++-+",
      "subtract:+-++",
      "subtract:+-+-",
      "subtract:-+-+",
      "subtract:-+--",
      "subtract:--+-",
      "subtract:----",
    ]);
  } else if (entry.candidateId === "C03") {
    set(
      "combination",
      [10, 20, 25, 40].flatMap((r) =>
        Array.from({ length: 17 }, (_, i) => `${r},${(i + 4) * 1000}`),
      ),
    );
    set("rate", ["10", "20", "25", "40"]);
  } else {
    set(
      "combination",
      [800, 1000, 1200, 1500].flatMap((p) =>
        [2000, 2500, 3000].flatMap((f) =>
          Array.from({ length: 11 }, (_, i) => i + 5).flatMap((n) =>
            Array.from(
              { length: p / 100 },
              (_, i) => `${p},${f},${n},${i * 100}`,
            ),
          ),
        ),
      ),
    );
    set("integer-boundary", ["exact", "fractional"]);
    set("remainder-boundary", ["zero", "highest", "interior"]);
  }
  const unseen = new Map([...required].map(([k, v]) => [k, new Set(v)]));
  const samples: NativeGateSuite["samples"] = [];
  const problems = new Map<string, NativeDescriptiveProblemR2>();
  const observed = new Map<string, Set<string>>();
  const baseline =
    entry.candidateId === "C01" || entry.candidateId === "C02" ? 1024 : 256;
  for (let seed = 0; seed < 100000; seed++) {
    if (seed >= baseline && [...unseen.values()].every((v) => !v.size)) break;
    for (const variant of entry.variants) {
      if (entry.candidateId === "C01" && seed >= baseline) {
        const f = generateMiddleProblem(type.typeKey, seed, variant).facts;
        // Once the non-numeric branches are complete, inspect only seeds adding a new pair.
        if (
          [...unseen].every(
            ([key, values]) => key === "combination" || values.size === 0,
          ) &&
          !unseen.get("combination")!.has(`${f.A},${f.B}`)
        )
          continue;
      }
      const task = await createNativeAuthoredTask(
        entry.author,
        seed,
        variant,
        adapters,
      );
      const coverage = entry.verify({
        content: task.problem.content,
        figureSpec: null,
      }).coverage;
      let adds = false;
      for (const [key, value] of Object.entries(coverage))
        if (unseen.get(key)?.delete(value)) adds = true;
      if (seed < baseline || adds) {
        samples.push({ seed, variant });
        problems.set(`${seed}/${variant}`, task.problem);
        for (const [key, value] of Object.entries(coverage)) {
          if (!observed.has(key)) observed.set(key, new Set());
          observed.get(key)!.add(value);
        }
      }
    }
  }
  if ([...unseen.values()].some((v) => v.size))
    throw new Error(
      `범위 표본 누락 ${JSON.stringify([...unseen].map(([k, v]) => [k, [...v]]))}`,
    );
  const intermediateKeys = [...problems.values()][0]!.facts
    .filter((f) => f.kind === "intermediate")
    .map((f) => f.factKey);
  return {
    samples,
    generate(seed, variant) {
      const p = problems.get(`${seed}/${variant}`);
      if (!p) throw new Error("선언되지 않은 검사 표본");
      return structuredClone(p);
    },
    verify: entry.verify,
    twin(seed, variant) {
      const p = generateMiddleProblem(type.typeKey, seed, variant);
      return {
        seed,
        variant,
        content: p.content,
        modelAnswer: p.solution,
        requiredFactKeys: [
          problems.get(`${seed}/${variant}`)!.rubric.criteria.at(-1)!.factKey,
        ],
      };
    },
    coverage: [...observed].map(([dimension, values]) => ({
      dimension,
      values: [...(required.get(dimension) ?? values)],
    })),
    scoringExamples: (p) => ({
      answerOnly: {
        response: p.answer,
        awards: p.rubric.criteria.map((c) => ({
          criterionId: c.criterionId,
          points:
            c.role === "answer" && entry.candidateId !== "C03" ? c.points : 0,
        })),
      },
      reasoned: {
        response: p.modelAnswer,
        awards: p.rubric.criteria.map((c) => ({
          criterionId: c.criterionId,
          points: c.points,
        })),
      },
    }),
    mutations: [
      {
        seed: 0,
        variant: 0,
        kind: "sign" as const,
        label: "첫 조건 수치의 부호",
        mutate: (p) => ({
          ...p,
          content: p.content.replace(
            /\$(A=)?(-?)(?=\d|\\frac)/,
            (_, name: string | undefined, sign: string) =>
              `$${name ?? ""}${sign === "-" ? "" : "-"}`,
          ),
        }),
      },
      {
        seed: 0,
        variant: 0,
        kind: "unit" as const,
        label: "인쇄 수치의 단위",
        mutate: (p) => ({
          ...p,
          content:
            entry.candidateId === "C01" || entry.candidateId === "C02"
              ? p.content.replace(/(\$[^$]+\$)/, "$1 cm")
              : p.content.replace(/\$원/, "$달러"),
        }),
      },
      ...intermediateKeys.map((key) => ({
        seed: 0,
        variant: 0,
        kind: "intermediate" as const,
        label: `${key} 중간값`,
        mutate: (
          p: Parameters<NativeGateSuite["verify"]>[0] &
            NativeDescriptiveProblemR2,
        ) => {
          p.facts.find((f) => f.factKey === key)!.value = "999999";
          return p;
        },
      })),
    ] as NativeGateSuite["mutations"],
  };
}

export const lcmExponentGateSuite = (adapters: NativeHelperAdapters) =>
  lowerSuite(batch1LowerAuthors[0]!, adapters);
export const rationalRepairGateSuite = (adapters: NativeHelperAdapters) =>
  lowerSuite(batch1LowerAuthors[1]!, adapters);
export const discountModelGateSuite = (adapters: NativeHelperAdapters) =>
  lowerSuite(batch1LowerAuthors[2]!, adapters);
export const integerBudgetGateSuite = (adapters: NativeHelperAdapters) =>
  lowerSuite(batch1LowerAuthors[3]!, adapters);

export const batch1LowerAuthors: readonly LowerEntry[] = [
  {
    candidateId: "C01",
    author: lcmExponentAuthor,
    gateSuite: lcmExponentGateSuite,
    verify: verifyLcmExponent,
    variants: [0, 1],
  },
  {
    candidateId: "C02",
    author: rationalRepairAuthor,
    gateSuite: rationalRepairGateSuite,
    verify: verifyRationalRepair,
    variants: [0, 1],
  },
  {
    candidateId: "C03",
    author: discountModelAuthor,
    gateSuite: discountModelGateSuite,
    verify: verifyDiscountModel,
    variants: [0, 1],
  },
  {
    candidateId: "C04",
    author: integerBudgetAuthor,
    gateSuite: integerBudgetGateSuite,
    verify: verifyIntegerBudget,
    variants: [0, 1],
  },
];
