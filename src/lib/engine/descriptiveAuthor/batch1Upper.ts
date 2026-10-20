/** C07–C10: unregistered primary authors. Helpers supply parameters, never the assessment. */
import type {
  NativeAuthorContext,
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
import type { NativeGateSuite } from "../nativeDescriptiveGates";
import type { NativeIndependentVerifier } from "../descriptiveVerification/types";
import {
  verifyRootSign,
  verifyFactorRepair,
  verifyQuadraticArea,
  verifyParabolaTranslation,
} from "../descriptiveVerification/batch1Upper";
import { createNativeAuthoredTask } from "./compose";
import { createNativeHelperAdapters } from "./adapters";

export const ROOT_SIGN_HELPER_TYPE = "3-1|제곱근의 뜻과 성질|16";
export const FACTOR_REPAIR_HELPER_TYPE = "3-1|다항식의 인수분해|12";
export const QUADRATIC_AREA_HELPER_TYPE = "3-1|이차방정식의 활용|19";
export const PARABOLA_TRANSLATION_HELPER_TYPE = "3-1|이차함수의 그래프 ⑵|07";

const signed = (n: number) => (n < 0 ? String(n) : `+${n}`);
const factor = (n: number) => `(x${signed(n)})`;
function poly(a: number, b: number, c: number): string {
  const first = a === 1 ? "x^2" : a === -1 ? "-x^2" : `${a}x^2`;
  const linear =
    b === 0 ? "" : b === 1 ? "+x" : b === -1 ? "-x" : `${signed(b)}x`;
  return first + linear + (c === 0 ? "" : signed(c));
}
function standard(a: number, p: number, q: number): string {
  return `${a === 1 ? "" : a === -1 ? "-" : a}(x${signed(-p)})^2${q === 0 ? "" : signed(q)}`;
}
const rootPrompts = [
  "정수와 제곱근의 대소를 제곱한 값의 비교로 판단하고, 그 비교가 가능한 이유를 쓰시오.",
  "근호 안에서 제곱된 식의 부호를 판단하고, 제곱근의 비음성을 이용하여 절댓값을 없애는 이유를 쓰시오.",
  "주어진 식을 간단히 한 결과를 쓰시오.",
] as const;
const factorPrompts = [
  "두 학생의 곱을 각각 전개하고, 각 학생에게서 보존된 항과 잘못 본 항을 구분하여 그 이유를 쓰시오.",
  "보존된 계수와 상수항을 이용하여 처음 이차식을 복원하고, 두 수의 합과 곱을 이용한 인수분해 과정을 쓰시오.",
  "바른 인수분해 결과를 쓰고, 다시 전개하여 모든 항의 계수를 비교하시오. x=0 한 번의 대입만으로 항등식인지 확인할 수 있는지도 설명하시오.",
] as const;
const areaPrompts = [
  "x로 나타낸 두 길이와 양수 조건을 쓰고, 이 도형의 넓이 공식을 이용하여 방정식을 세운 이유를 설명하시오.",
  "방정식을 정리하고 인수분해, 제곱근 또는 근의 공식을 이용하는 과정을 보여 대수적인 두 해를 모두 구하시오.",
  "두 길이의 조건에 맞지 않는 해를 버리는 이유를 쓰고, 알맞은 두 길이를 원래 넓이에 대입하여 확인한 뒤 x의 값을 단위와 함께 쓰시오.",
] as const;
const translationPrompts = [
  "주어진 이차함수의 식을 완전제곱식으로 고치는 과정을 보이고, 이동 전 꼭짓점의 좌표를 구하시오.",
  "평행이동에 따른 꼭짓점 좌표의 변화를 설명하고, 이동 후 꼭짓점과 축의 방정식 및 이차함수의 식을 표준형과 일반형으로 쓰시오.",
  "이동한 꼭짓점과 그보다 x좌표가 1 큰 점을 이동 후 식에 대입하여 확인하고, a+b-c의 값을 구하시오.",
] as const;

type CriterionPlan = {
  key: string;
  evidence: string;
  alternatives: string[];
  errors: string[];
  full: string;
  partial: { points: number; condition: string }[];
  carry?: string;
};
type AuthorPlan = {
  id: string;
  title: string;
  chapter: string;
  section: string;
  objective: string;
  difference: string;
  situation: string;
  requirements: NativeAuthorDefinition["studyRequirementIds"];
  standards: NativeAuthorDefinition["curriculum"]["achievementStandards"];
  prompts: readonly string[];
  points: readonly number[];
  criteria: CriterionPlan[];
};

const rootPlan: AuthorPlan = {
  id: "m3-root-sign-reason-r2",
  title: "제곱근의 비음성과 부호 설명하기",
  chapter: "1. 실수와 그 연산",
  section: "제곱근의 뜻과 성질",
  objective:
    "제곱 비교로 부호를 정하고 주제곱근의 비음성으로 절댓값 제거를 정당화한다.",
  difference:
    "단답의 정리식 외에 대소 비교의 전제와 음이 아닌 값을 택하는 이유를 직접 쓴다.",
  situation: "정수와 제곱근의 차를 제곱한 수의 주제곱근을 해석한다.",
  requirements: ["algebra.absolute-sign-cases"],
  standards: [
    {
      code: "9수01-07",
      description:
        "제곱근의 뜻과 성질을 알고, 제곱근의 대소 관계를 판단할 수 있다.",
    },
    {
      code: "9수01-09",
      description: "실수의 대소 관계를 판단하고 설명할 수 있다.",
    },
  ],
  prompts: rootPrompts,
  points: [2, 3, 1],
  criteria: [
    {
      key: "comparison",
      evidence: "제곱값 비교와 두 수가 음이 아니라는 전제",
      alternatives: ["양수의 제곱근은 크기 순서를 보존한다는 성질로 설명"],
      errors: ["음수까지 제곱 비교가 항상 보존된다고 함"],
      full: "제곱값·대소와 비음수 전제를 모두 제시",
      partial: [
        {
          points: 1,
          condition:
            "제곱값 비교 또는 두 수의 대소 중 하나 이상은 옳지만 만점 조건에 미달",
        },
      ],
    },
    {
      key: "sign",
      evidence: "차의 부호·절댓값·주제곱근의 비음성",
      alternatives: ["제곱이 같고 음이 아닌 쪽을 선택한다고 설명"],
      errors: ["제곱과 근호를 무조건 상쇄함"],
      full: "차의 부호와 근호 제거 및 비음성의 이유가 모두 옳음. 절댓값 기호 없이 같은 이유로 설명해도 인정",
      carry:
        "선행 대소 비교가 틀린 경우에는 이 규정을 우선한다. 그 비교에서 차의 부호를 일관되게 추론하면 방법 1점, 그 부호와 주제곱근의 비음성을 이용해 근호를 없애는 이유까지 옳으면 방법 1점을 더해 최대 2점을 보존한다. 나머지 1점은 실제 차의 부호가 옳을 때만 인정한다.",
      partial: [
        {
          points: 2,
          condition:
            "차의 부호와 근호 제거는 옳지만 비음성의 이유가 없거나 틀려 만점에 미달. 절댓값 기호 없이 올바르게 제거했으나 비음성 이유가 없는 경우도 포함",
        },
        {
          points: 1,
          condition:
            "차의 부호, 제곱근과 절댓값의 관계, 비음성의 이유 중 하나 이상 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "simplified",
      evidence: "간단히 한 정확한 식",
      alternatives: ["같은 식을 항 순서를 바꾸어 씀"],
      errors: ["최종 식의 부호를 반대로 씀"],
      full: "간단히 한 식이 정확함",
      partial: [],
      carry:
        "최종 식의 정답 점수에는 오류 승계를 적용하지 않는다. 선행 오류를 일관되게 사용했어도 실제 정답과 다르면 0점이다.",
    },
  ],
};
const repairPlan: AuthorPlan = {
  id: "m3-factor-error-identity-r2",
  title: "잘못 읽은 두 식에서 원식 복원하기",
  chapter: "2. 다항식의 곱셈과 인수분해",
  section: "인수분해의 응용",
  objective:
    "각 전개의 보존된 항을 찾아 원식을 복원하고 모든 계수의 일치로 항등식을 검산한다.",
  difference:
    "단답 인수분해 외 두 오류의 위치·보존 근거와 한 점 대입 검산의 한계를 요구한다.",
  situation:
    "서로 다른 항을 잘못 본 두 학생의 인수분해에서 원래 이차식을 찾는다.",
  requirements: ["algebra.error-identity"],
  standards: [
    { code: "9수02-19", description: "다항식의 곱셈과 인수분해를 할 수 있다." },
  ],
  prompts: factorPrompts,
  points: [3, 3, 2],
  criteria: [
    {
      key: "expansions",
      evidence: "두 전개식·보존된 항·잘못 읽은 항의 이유",
      alternatives: ["분배법칙 또는 곱셈 공식으로 전개"],
      errors: ["잘못 읽은 계수를 원식에 그대로 사용"],
      full: "두 전개와 각 보존·오류 항의 구분 및 이유가 모두 옳음",
      partial: [
        {
          points: 2,
          condition:
            "두 전개식이 모두 옳거나 두 보존 항과 각각의 이유가 모두 옳지만 만점 조건에 미달",
        },
        {
          points: 1,
          condition:
            "한 전개식 또는 한 보존 항의 근거가 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "restored",
      evidence: "복원한 원식 및 합·곱으로 구한 인수의 두 상수",
      alternatives: ["곱이 상수항인 정수 쌍을 나열하고 합으로 선택"],
      errors: ["두 학생의 잘못된 항을 함께 취함"],
      full: "원식·두 상수·합과 곱의 근거를 모두 제시",
      partial: [
        {
          points: 2,
          condition:
            "복원한 원식은 옳지만 합·곱을 이용한 인수분해 과정이 없거나 틀림",
        },
        {
          points: 1,
          condition:
            "복원할 계수·상수항 중 하나의 근거 또는 유효한 합·곱 관계가 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "factorized",
      evidence: "바른 곱·전개의 계수 일치·한 점 대입의 한계",
      alternatives: ["두 식의 차가 영다항식임을 보여 검산"],
      errors: ["x=0에서만 같으면 항등식이라고 함"],
      full: "바른 곱과 전개 검산을 제시하고 한 점 대입의 한계를 설명",
      carry: "선행 복원식이 틀리면 이 규정을 우선한다. 자기 식의 인수분해를 전개하여 전체 계수를 비교하고 한 점 대입의 한계까지 바르게 설명하면 검토 1점을 보존한다. 나머지 정답 1점은 실제 바른 인수분해일 때만 인정한다.",
      partial: [
        {
          points: 1,
          condition:
            "바른 인수분해 결과 또는 전체 계수 비교가 옳지만 만점 조건에 미달",
        },
      ],
    },
  ],
};
const areaPlan: AuthorPlan = {
  id: "m3-quadratic-area-domain-r2",
  title: "넓이의 두 해와 실제 길이 구별하기",
  chapter: "3. 이차방정식",
  section: "이차방정식의 활용",
  objective:
    "도형별 넓이식을 세우고 이차방정식의 두 해 중 양수인 두 길이를 만족하는 해를 선택·검산한다.",
  difference:
    "단답 길이 외 도형별 식의 근거·음수 해·배제 이유·원 넓이 대입을 요구한다.",
  situation:
    "직사각형·삼각형·평행사변형의 두 길이 관계와 넓이로 길이를 결정한다.",
  requirements: ["written.rectangle-domain"],
  standards: [
    {
      code: "9수02-20",
      description:
        "이차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.",
    },
  ],
  prompts: areaPrompts,
  points: [3, 3, 2],
  criteria: [
    {
      key: "model",
      evidence: "두 길이·양수 조건·도형의 넓이식과 이유",
      alternatives: ["길이 변수의 의미를 유지하는 동치 방정식을 세움"],
      errors: ["삼각형의 1/2를 빠뜨림", "평행사변형 높이를 옆변으로 바꿈"],
      full: "두 길이·양수 조건·넓이식과 도형별 이유를 모두 제시",
      partial: [
        {
          points: 2,
          condition:
            "두 길이와 넓이식은 옳지만 양수 조건 또는 이유가 없거나 틀림",
        },
        {
          points: 1,
          condition:
            "두 길이 관계 또는 도형별 넓이 공식의 적용이 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "roots",
      evidence: "정리한 방정식과 두 해를 얻는 과정",
      alternatives: ["근의 공식으로 두 해를 모두 구함"],
      errors: ["양수 해만 구하고 음수 해를 누락"],
      full: "동치 변형과 인수분해·제곱근·근의 공식 중 한 풀이 과정 및 두 해를 모두 제시",
      partial: [
        {
          points: 2,
          condition:
            "두 해는 옳지만 과정이 없거나, 풀이 과정은 옳으나 한 해가 누락되거나 부호·계산이 틀림",
        },
        {
          points: 1,
          condition:
            "한 해 또는 유효한 인수분해·제곱근 관계가 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "length",
      evidence: "음수 해 배제·두 길이의 양수 확인·넓이 대입·단위",
      alternatives: ["두 길이를 직접 원조건에 대입하여 확인"],
      errors: ["음수도 길이의 답으로 남김", "길이의 단위를 cm²로 씀"],
      full: "음수 배제와 두 양수 길이·원 넓이 검산·x의 cm 단위를 모두 제시",
      carry:
        "선행 해가 틀린 경우에는 이 규정을 우선한다. 길이 조건으로 부적합한 해를 버리고 남은 두 길이를 실제 도형의 원 넓이식에 대입하여 일치 또는 불일치를 바르게 판단하면 검토 1점을 보존한다. 자기의 잘못된 넓이식만 확인한 경우는 보존하지 않는다. 나머지 정답 1점은 실제 x값과 cm 단위가 옳을 때만 인정한다.",
      partial: [
        {
          points: 1,
          condition:
            "x의 수치·cm 단위 또는 두 길이를 사용한 원 넓이 검산이 옳지만 만점 조건에 미달",
        },
      ],
    },
  ],
};
const translationPlan: AuthorPlan = {
  id: "m3-parabola-translation-evidence-r2",
  title: "꼭짓점 이동에서 이차함수 복원하기",
  chapter: "4. 이차함수",
  section: "이차함수 y=ax²+bx+c의 그래프",
  objective:
    "완전제곱식의 꼭짓점과 이동 좌표를 연결하고 이동한 식의 계수를 대입으로 확인한다.",
  difference:
    "단답 계수 결합 외 완전제곱 과정·좌표 이동·축·두 점 대입을 요구한다.",
  situation: "일반형 이차함수의 그래프를 수평·수직으로 평행이동한다.",
  requirements: ["graph.translated-coefficient-reuse"],
  standards: [
    {
      code: "9수02-22",
      description:
        "이차함수의 그래프를 그릴 수 있고, 그 성질을 설명할 수 있다.",
    },
  ],
  prompts: translationPrompts,
  points: [3, 3, 2],
  criteria: [
    {
      key: "vertex",
      evidence: "완전제곱을 만드는 보정항과 원 꼭짓점",
      alternatives: ["축 x=-B/(2A)를 구하고 대입하되 완전제곱 변형도 제시"],
      errors: ["괄호 안의 부호를 꼭짓점 부호로 그대로 읽음"],
      full: "완전제곱의 보정 과정과 표준형·원 꼭짓점을 모두 제시",
      partial: [
        {
          points: 2,
          condition: "표준형과 꼭짓점은 맞지만 보정 과정이 없거나 틀림",
        },
        {
          points: 1,
          condition:
            "원 꼭짓점 또는 유효한 완전제곱 변형이 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "translated",
      evidence: "좌표에 이동량을 더한 근거·꼭짓점·축·표준형·일반형",
      alternatives: ["원식에 x-수평이동량을 대입하고 수직이동량을 더해 확인"],
      errors: ["수평이동 방향의 부호를 반대로 적용"],
      full: "좌표 변화와 꼭짓점·축·두 형태의 식이 모두 옳음",
      partial: [
        {
          points: 2,
          condition:
            "좌표 변화 설명·꼭짓점·축·표준형·일반형의 다섯 요소 중 네 요소는 옳지만 만점 조건에 미달",
        },
        {
          points: 1,
          condition:
            "좌표 이동 관계, 이동 후 꼭짓점, 축, 표준형, 일반형 중 하나 이상 옳지만 2점 조건에 미달",
        },
      ],
    },
    {
      key: "coefficient",
      evidence: "두 점 대입 검산과 a+b-c",
      alternatives: ["일반형의 값과 표준형의 값을 두 점에서 비교"],
      errors: ["상수항 c를 빼지 않고 더함"],
      full: "두 점 대입 결과와 계수 결합이 모두 옳음",
      carry:
        "선행 식이 틀린 경우에는 이 규정을 우선한다. 자기 식의 꼭짓점과 그보다 x좌표가 1 큰 점을 일관되게 대입하고 값을 바르게 확인하면 검산 1점을 보존한다. 나머지 정답 1점은 실제 a+b-c 값이 옳을 때만 인정한다.",
      partial: [
        {
          points: 1,
          condition:
            "a+b-c의 값 또는 두 점 중 한 점 이상의 대입 검산이 옳지만 만점 조건에 미달",
        },
      ],
    },
  ],
};

function definition(plan: AuthorPlan): NativeAuthorDefinition {
  return {
    revision: 2,
    definitionId: plan.id,
    title: plan.title,
    grade: "중3",
    chapter: plan.chapter,
    unitSection: plan.section,
    difficulty: "응용",
    difficultyBasis: plan.objective,
    differentAction: plan.difference,
    limits:
      "2027 중3 1학기 미등록 시연. 학원 자체 배점이며 학교 난도·교사 채점 일치율은 미측정. 기존 요구 ID는 관련 요소만 대응한다.",
    curriculum: {
      revision: 2022,
      schoolYear: 2027,
      grade: "중3",
      semester: 1,
      achievementStandards: plan.standards,
    },
    assessmentObjective: plan.objective,
    studentEvidence: plan.criteria.map((c) => c.evidence),
    studyRequirementIds: plan.requirements,
    situation: plan.situation,
    subquestions: plan.prompts.map((text, i) => ({
      requirementId: `${plan.id}-${i + 1}`,
      text,
      points: plan.points[i]!,
    })),
  };
}
function numbers(
  completed: NativeHelperResults,
  typeKey: string,
  keys: string[],
) {
  const helper = completed.get("numbers");
  if (!helper || helper.kind !== "calculation" || helper.typeKey !== typeKey)
    throw new Error("주 저자의 계산 보조 정체 오류");
  const f = helper.problem.facts;
  if (!keys.every((k) => Number.isSafeInteger(f[k])))
    throw new Error("계산 보조 수치 누락/범위 오류");
  return Object.fromEntries(keys.map((k) => [k, f[k]!]));
}
function assemble(
  plan: AuthorPlan,
  context: NativeAuthorContext,
  stem: string,
  given: NativeFact[],
  values: string[],
  expected: string[],
  answer: string,
): NativeDescriptiveProblemR2 {
  if (context.variant !== 0 && context.variant !== 1)
    throw new Error("첫 묶음은 변형 0·1만 허용합니다");
  const criteria: NativeCriterionR2[] = plan.criteria.map((c, i) => ({
    criterionId: c.key,
    requirementId: `${plan.id}-${i + 1}`,
    factKey: c.key,
    role: i === plan.criteria.length - 1 ? "answer" : "method",
    expected: expected[i]!,
    points: plan.points[i]!,
    evidence: c.evidence,
    alternatives: [...c.alternatives],
    errors: [...c.errors],
    scoring: {
      full: c.full,
      partial: c.partial,
      zero: "만점·부분점수를 높은 점수부터 적용한다. 어느 조건에도 해당하지 않으면 0점(무응답, 틀린 증거만 쓴 답 포함).",
    },
    carryForward: {
      fromFactKeys: plan.criteria.slice(0, i).map((prev) => prev.key),
      rule: "preserve-method-points",
      condition:
        c.carry ??
        (i === 0
          ? "선행 기준 없음"
          : "앞 수치가 틀려도 그 값을 일관되게 사용한 뒤 단계의 옳은 방법 점수는 보존한다."),
    },
  }));
  const rubric = {
    revision: 2 as const,
    totalPoints: plan.points.reduce((a, b) => a + b, 0),
    criteria,
  };
  const modelAnswer = expected.map((s, i) => `(${i + 1}) ${s}`).join("\n");
  return {
    revision: 2,
    definitionId: plan.id,
    ...context,
    familyKey: nativeFamilyKey(plan.id),
    externalId: nativeExternalId({ definitionId: plan.id, ...context }),
    questionType: "서술형",
    problemType: "활용",
    content: `${stem}\n${plan.prompts.map((s, i) => `(${i + 1}) ${s}`).join("\n")}`,
    answer,
    modelAnswer,
    solution: serializeNativeSolution(modelAnswer, rubric),
    rubric,
    figureSpec: null,
    curriculum: structuredClone(definition(plan).curriculum),
    requirements: plan.prompts.map((text, i) => ({
      requirementId: `${plan.id}-${i + 1}`,
      text,
      criterionIds: [criteria[i]!.criterionId],
    })),
    facts: [
      ...given,
      ...plan.criteria.map((c, i): NativeFact => ({
        factKey: c.key,
        kind: i === plan.criteria.length - 1 ? "answer" : "intermediate",
        value: values[i]!,
        ...(plan === areaPlan && i === 2 ? { unit: "cm" } : {}),
      })),
    ],
    steps: plan.criteria.map((c, i) => ({
      stepId: c.key,
      kind: "deduction",
      inputFactKeys: [
        ...given.map((f) => f.factKey),
        ...plan.criteria.slice(0, i).map((prev) => prev.key),
      ],
      relation: c.evidence,
      outputFactKey: c.key,
    })),
  };
}
function primary(
  plan: AuthorPlan,
  typeKey: string,
  compose: NativePrimaryAuthor["compose"],
): NativePrimaryAuthor {
  return {
    definition: definition(plan),
    helpers: [
      {
        id: "numbers",
        kind: "calculation",
        request: (context) => ({
          ...context,
          id: "numbers",
          kind: "calculation",
          engine: "middle",
          typeKey,
        }),
      },
    ],
    compose,
  };
}
const given = (value: string): NativeFact[] => [
  { factKey: "printed", kind: "given", value },
];

export const rootSignAuthor = primary(
  rootPlan,
  ROOT_SIGN_HELPER_TYPE,
  (context, completed) => {
    const { a, b } = numbers(completed, ROOT_SIGN_HELPER_TYPE, ["a", "b"]);
    if (
      a! < 2 ||
      a! > 8 ||
      ![2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23].includes(b!) ||
      Math.abs(a! * a! - b!) < 2
    )
      throw new Error("제곱근 보조 범위 오류");
    const square = a! * a!,
      cmp = square > b! ? ">" : "<";
    const body = square > b! ? `${a}-\\sqrt{${b}}` : `\\sqrt{${b}}-${a}`;
    return assemble(
      rootPlan,
      context,
      `식 $\\sqrt{(${a}-\\sqrt{${b}})^2}$에 대하여 다음 물음에 답하시오.`,
      given(`${a},${b}`),
      [`${square}${cmp}${b}`, `${a}-sqrt(${b})${cmp}0`, body],
      [
        `$${a}^2=${square}$, $${square}${cmp}${b}$이다. 두 수가 모두 음이 아니므로 $${a}${cmp}\\sqrt{${b}}$이다.`,
        `$${a}-\\sqrt{${b}}${cmp}0$이다. 제곱근은 음이 아니므로 $\\sqrt{(${a}-\\sqrt{${b}})^2}=|${a}-\\sqrt{${b}}|=${body}$이다.`,
        `따라서 $${body}$이다.`,
      ],
      `$${body}$`,
    );
  },
);

export const factorRepairAuthor = primary(
  repairPlan,
  FACTOR_REPAIR_HELPER_TYPE,
  (context, completed) => {
    const { m, n, p, q, u, v } = numbers(completed, FACTOR_REPAIR_HELPER_TYPE, [
      "m",
      "n",
      "p",
      "q",
      "u",
      "v",
    ]);
    const s = m! + n!,
      product = m! * n!,
      sa = p! + q!,
      pb = u! * v!;
    if (
      [m!, n!, p!, u!].some((x) => x === 0 || Math.abs(x) > 8) ||
      m === n ||
      q === 0 ||
      v === 0 ||
      p! * q! !== product ||
      u! + v! !== s ||
      sa === s ||
      pb === product
    )
      throw new Error("인수분해 보조 범위/보존 관계 오류");
    const lo = Math.min(m!, n!),
      hi = Math.max(m!, n!),
      result = factor(lo) + factor(hi);
    return assemble(
      repairPlan,
      context,
      `최고차항이 $x^2$인 이차식을 인수분해하였다. 지호는 x의 계수만 잘못 읽고 나머지 항은 바르게 읽어 $${factor(p!) + factor(q!)}$를 얻었다. 은수는 상수항만 잘못 읽고 나머지 항은 바르게 읽어 $${factor(u!) + factor(v!)}$를 얻었다. 두 학생은 읽은 식의 인수분해 계산은 바르게 하였다.`,
      given(`${p},${q};${u},${v}`),
      [`${sa},${product};${s},${pb}`, `${s},${product};${lo},${hi}`, result],
      [
        `지호: $${factor(p!) + factor(q!)}=${poly(1, sa, product)}$, 은수: $${factor(u!) + factor(v!)}=${poly(1, s, pb)}$. 지호에게서 보존된 상수항은 $${product}$이고 잘못 읽은 x의 계수는 $${sa}$이다. 은수에게서 보존된 x의 계수는 $${s}$이고 잘못 읽은 상수항은 $${pb}$이다.`,
        `처음 식은 $${poly(1, s, product)}$이다. $(${lo})+(${hi})=${s}$, $(${lo})\\times(${hi})=${product}$이므로 두 상수는 $${lo}$, $${hi}$이다.`,
        `$${result}=${poly(1, s, product)}$이다. x²의 계수 $1$, x의 계수 $${s}$, 상수항 $${product}$이 모두 일치한다. x=0 한 번의 대입은 상수항만 확인하므로 충분하지 않다.`,
      ],
      `$${result}$`,
    );
  },
);

export const quadraticAreaAuthor = primary(
  areaPlan,
  QUADRATIC_AREA_HELPER_TYPE,
  (context, completed) => {
    const { y, k, r, S, mode } = numbers(
      completed,
      QUADRATIC_AREA_HELPER_TYPE,
      ["y", "k", "r", "S", "mode"],
    );
    if (
      ![0, 1, 2].includes(mode!) ||
      (mode === 2
        ? ![2, 3, 4].includes(r!) ||
          y! < 3 ||
          y! > 14 ||
          k !== 0 ||
          S !== r! * y! * y!
        : y! < 2 ||
          y! > 15 ||
          k! < 1 ||
          k! > 9 ||
          r !== 0 ||
          S !== (y! * (y! + k!)) / (mode === 1 ? 2 : 1))
    )
      throw new Error("넓이 보조 범위/관계 오류");
    const shape = ["직사각형", "삼각형", "평행사변형"][mode!]!;
    const left = mode === 0 ? "세로의 길이" : "높이",
      right = mode === 0 ? "가로" : "밑변";
    const other = mode === 2 ? `${r}x` : `x+${k}`,
      length2 = mode === 2 ? r! * y! : y! + k!;
    const negative = mode === 2 ? -y! : -(y! + k!);
    const model =
      mode === 2
        ? `${r}x^2=${S}`
        : `${mode === 1 ? "\\dfrac{1}{2}" : ""}x(x+${k})=${S}`;
    const equation =
      mode === 2 ? `x^2=${y! * y!}` : `${poly(1, k!, -y! * (y! + k!))}=0`;
    const factorized = `${factor(-y!)}${factor(-negative)}=0`;
    const check = `${mode === 1 ? "\\dfrac{1}{2}\\times" : ""}${y}\\times${length2}=${S}`;
    const problem = assemble(
      areaPlan,
      context,
      `${shape}의 ${left}는 $x$ cm이고 ${right}의 길이는 $${other}$ cm이다. 두 길이는 모두 양수이고 넓이는 $${S}$ cm²이다.`,
      given(`${shape};${mode === 2 ? r : k};${S}`),
      [model, `${negative},${y}`, String(y)],
      [
        `두 길이는 $x$, $${other}$이므로 $x>0$, $${other}>0$이다. ${shape}의 넓이는 ${mode === 1 ? "밑변과 높이의 곱의 절반" : mode === 0 ? "가로와 세로의 곱" : "밑변과 높이의 곱"}이므로 $${model}$이다.`,
        `$${equation}$, $${factorized}$이므로 $x=${negative}$ 또는 $x=${y}$이다.`,
        `$x=${negative}$이면 음수 길이이므로 버린다. $x=${y}>0$, $${other}=${length2}>0$이고 $${check}$ cm²로 원래 넓이와 같다. 따라서 ${left}는 $${y}$ cm이다.`,
      ],
      `${y} cm`,
    );
    problem.rubric.criteria[0]!.errors =
      mode === 0
        ? ["직사각형 넓이에 1/2을 잘못 곱함", "두 길이의 합을 넓이로 씀"]
        : mode === 1
          ? ["삼각형의 1/2를 빠뜨림", "높이를 옆변으로 바꿈"]
          : [
              "평행사변형 높이를 옆변으로 바꿈",
              "평행사변형 넓이에 1/2을 잘못 곱함",
            ];
    problem.solution = serializeNativeSolution(
      problem.modelAnswer,
      problem.rubric,
    );
    return problem;
  },
);

export const parabolaTranslationAuthor = primary(
  translationPlan,
  PARABOLA_TRANSLATION_HELPER_TYPE,
  (context, completed) => {
    const { a, p, q, mx, my } = numbers(
      completed,
      PARABOLA_TRANSLATION_HELPER_TYPE,
      ["a", "p", "q", "mx", "my"],
    );
    const p2 = p! + mx!,
      q2 = q! + my!,
      b0 = -2 * a! * p!,
      c0 = a! * p! * p! + q!;
    const b = -2 * a! * p2,
      c = a! * p2 * p2 + q2,
      ans = a! + b - c;
    if (
      !a ||
      Math.abs(a) > 4 ||
      !p ||
      Math.abs(p) > 4 ||
      Math.abs(q!) > 8 ||
      !mx ||
      Math.abs(mx) > 4 ||
      !my ||
      Math.abs(my) > 5 ||
      p2 === 0 ||
      Math.abs(c0) > 60 ||
      Math.abs(c) > 60
    )
      throw new Error("이차함수 보조 범위 오류");
    return assemble(
      translationPlan,
      context,
      `이차함수 $y=${poly(a, b0, c0)}$의 그래프를 x축 방향으로 $${mx}$만큼, y축 방향으로 $${my}$만큼 평행이동하였다. 이동 후 식을 $y=ax^2+bx+c$라 한다.`,
      given(`${a},${b0},${c0};${mx},${my}`),
      [`${p},${q}`, `${p2},${q2};${a},${b},${c}`, String(ans)],
      [
        `$y=${a}(x^2${signed(-2 * p)}x+${p * p})${signed(c0 - a * p * p)}=${standard(a, p, q!)}$이다. 괄호를 만들 때 더한 $${a * p * p}$의 보정은 $(${c0})-(${a * p * p})=${q}$이므로 이동 전 꼭짓점은 $(${p},${q})$이다.`,
        `좌표에 이동량을 더하면 $(${p})+(${mx})=${p2}$, $(${q})+(${my})=${q2}$이다. 꼭짓점은 $(${p2},${q2})$, 축은 $x=${p2}$이다. 이동 후 식은 $y=${standard(a, p2, q2)}=${poly(a, b, c)}$이다.`,
        `이동 후 함수를 g라 하면 $g(${p2})=${a}\\times0^2+(${q2})=${q2}$, $g(${p2 + 1})=${a}\\times1^2+(${q2})=${a + q2}$이다. 따라서 $a=${a}$, $b=${b}$, $c=${c}$이고 $a+b-c=(${a})+(${b})-(${c})=${ans}$이다.`,
      ],
      String(ans),
    );
  },
);

type Profile = Record<string, string>;
type Numeric = Record<string, number>;
const sign = (n: number) => (n < 0 ? "-" : n > 0 ? "+" : "0");
function rootProfile(f: Numeric): Profile {
  return { pair: `${f.a},${f.b}`, sign: sign(f.a! * f.a! - f.b!) };
}
function repairProfile(f: Numeric): Profile {
  const s = f.u! + f.v!,
    p = f.p! * f.q!;
  return {
    preserved: `${s},${p}`,
    firstPair: `${f.p},${f.q}`,
    secondPair: `${f.u},${f.v}`,
    errors: `${sign(s)},${sign(p)}:${sign(f.p! + f.q! - s)},${sign(f.u! * f.v! - p)}`,
  };
}
function areaProfile(f: Numeric): Profile {
  const shape = ["직사각형", "삼각형", "평행사변형"][f.mode!]!;
  return { shape, combination: `${shape}:${f.y},${f.mode === 2 ? f.r : f.k}` };
}
function translationProfile(f: Numeric): Profile {
  const p2 = f.p! + f.mx!,
    q2 = f.q! + f.my!;
  return {
    curvatureVertex: `${f.a},${f.p}`,
    curvatureHeight: `${f.a},${f.q}`,
    shifts: `${f.mx},${f.my}`,
    horizontal: `${f.p},${f.mx}`,
    vertical: `${f.q},${f.my}`,
    branches: `${sign(f.a!)},${sign(f.mx!)},${sign(f.my!)}:${sign(p2)},${sign(q2)}`,
    sourceConstant: String(f.a! * f.p! * f.p! + f.q!),
    targetConstant: String(f.a! * p2 * p2 + q2),
  };
}
const nz = (n: number) =>
  Array.from({ length: n * 2 + 1 }, (_, i) => i - n).filter(Boolean);
function coverageDomain(
  kind: number,
): { dimension: string; values: string[] }[] {
  const domain = new Map<string, Set<string>>();
  const add = (profile: Profile) =>
    Object.entries(profile).forEach(([key, value]) => {
      if (!domain.has(key)) domain.set(key, new Set());
      domain.get(key)!.add(value);
    });
  if (kind === 0) {
    for (let a = 2; a <= 8; a++)
      for (const b of [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23])
        if (Math.abs(a * a - b) >= 2) add(rootProfile({ a, b }));
  } else if (kind === 1) {
    for (const m of nz(8))
      for (const n of nz(8)) {
        if (m === n) continue;
        for (const p of nz(8)) {
          if ((m * n) % p) continue;
          const q = (m * n) / p;
          if (p + q === m + n) continue;
          for (const u of nz(8)) {
            const v = m + n - u;
            if (v !== 0 && u * v !== m * n) add(repairProfile({ p, q, u, v }));
          }
        }
      }
  } else if (kind === 2) {
    for (const mode of [0, 1])
      for (let y = 2; y <= 15; y++)
        for (let k = 1; k <= 9; k++)
          if (mode === 0 || (y * (y + k)) % 2 === 0)
            add(areaProfile({ mode, y, k }));
    for (const r of [2, 3, 4])
      for (let y = 3; y <= 14; y++) add(areaProfile({ mode: 2, r, y }));
  } else {
    for (const a of nz(4))
      for (const p of nz(4))
        for (let q = -8; q <= 8; q++)
          for (const mx of nz(4))
            for (const my of nz(5)) {
              const p2 = p + mx;
              if (
                p2 &&
                Math.abs(a * p * p + q) <= 60 &&
                Math.abs(a * p2 * p2 + q + my) <= 60
              )
                add(translationProfile({ a, p, q, mx, my }));
            }
  }
  return [...domain].map(([dimension, values]) => ({
    dimension,
    values: [...values].sort(),
  }));
}

async function upperSuite(
  author: NativePrimaryAuthor,
  typeKey: string,
  verify: NativeIndependentVerifier,
  profile: (f: Numeric) => Profile,
  kind: number,
  adapters: NativeHelperAdapters,
): Promise<NativeGateSuite> {
  const coverage = coverageDomain(kind);
  const unseen = new Set(
    coverage.flatMap((c) => c.values.map((v) => `${c.dimension}:${v}`)),
  );
  const samples: NativeGateSuite["samples"] = [];
  // A baseline of 256 seeds × both variants, then new witnesses for every declared projection.
  for (let seed = 0; seed < 100000 && (seed < 256 || unseen.size); seed++) {
    for (const variant of [0, 1]) {
      const f = generateMiddleProblem(typeKey, seed, variant).facts;
      let novel = false;
      for (const [key, value] of Object.entries(profile(f)))
        if (unseen.delete(`${key}:${value}`)) novel = true;
      if (seed < 256 || novel) samples.push({ seed, variant });
    }
  }
  if (unseen.size)
    throw new Error(
      `첫 묶음 경계/갈래 누락 ${typeKey}: ${[...unseen].slice(0, 10).join(";")}`,
    );
  const problems = new Map<string, NativeDescriptiveProblemR2>();
  for (const sample of samples) {
    const task = await createNativeAuthoredTask(
      author,
      sample.seed,
      sample.variant,
      adapters,
    );
    problems.set(`${sample.seed}/${sample.variant}`, task.problem);
  }
  const mutations: NativeGateSuite["mutations"] = [
    {
      seed: 0,
      variant: 0,
      kind: "sign",
      label: "인쇄 조건의 첫 수 부호",
      mutate: (p) => {
        // Damage a meaningful printed number, not a helper field or serialized solution.
        if (kind === 0)
          p.content = p.content.replace(/sqrt\{\((\d+)-/, "sqrt{(-$1-");
        else if (kind === 1)
          p.content = p.content.replace(
            /\(x([+-])(\d+)\)/,
            (_, s: string, n: string) => `(x${s === "+" ? "-" : "+"}${n})`,
          );
        else if (kind === 2)
          p.content = p.content.replace(/넓이는 \$(\d+)\$/, "넓이는 $-$1$");
        else
          p.content = p.content.replace(
            /x축 방향으로 \$(-?\d+)\$/,
            (_, n: string) => `x축 방향으로 $${-Number(n)}$`,
          );
        return p;
      },
    },
    {
      seed: 0,
      variant: 0,
      kind: "unit",
      label:
        kind === 2
          ? "넓이 단위 cm²를 cm로"
          : "단위 없는 식/좌표에 길이 단위 삽입",
      mutate: (p) => {
        p.content =
          kind === 2
            ? p.content.replace("cm²", "cm")
            : p.content.replace("$", "$cm ");
        return p;
      },
    },
    ...author.definition.subquestions.map(
      (_, index): NativeGateSuite["mutations"][number] => ({
        seed: 0,
        variant: 0,
        kind: "intermediate",
        label: `배점 대상 ${index + 1} 훼손`,
        mutate: (p) => {
          if (p.revision === 2)
            p.facts.find(
              (f) => f.factKey === p.rubric.criteria[index]!.factKey,
            )!.value = "999999";
          return p;
        },
      }),
    ),
  ];
  return {
    samples,
    coverage,
    verify,
    mutations,
    generate: (seed, variant) => {
      const p = problems.get(`${seed}/${variant}`);
      if (!p) throw new Error("선언하지 않은 게이트 표본");
      return structuredClone(p);
    },
    twin: (seed, variant) => {
      const p = generateMiddleProblem(typeKey, seed, variant);
      return {
        seed,
        variant,
        content: p.content,
        modelAnswer: p.solution,
        requiredFactKeys: [
          [rootPlan, repairPlan, areaPlan, translationPlan][kind]!.criteria[2]!
            .key,
        ],
      };
    },
    scoringExamples: (p) => ({
      answerOnly: {
        response: p.answer,
        awards: p.rubric.criteria.map((c) => ({
          criterionId: c.criterionId,
          points: c.role === "answer" ? 1 : 0,
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
  };
}
export const rootSignGateSuite = (adapters = createNativeHelperAdapters()) =>
  upperSuite(
    rootSignAuthor,
    ROOT_SIGN_HELPER_TYPE,
    verifyRootSign,
    rootProfile,
    0,
    adapters,
  );
export const factorRepairGateSuite = (
  adapters = createNativeHelperAdapters(),
) =>
  upperSuite(
    factorRepairAuthor,
    FACTOR_REPAIR_HELPER_TYPE,
    verifyFactorRepair,
    repairProfile,
    1,
    adapters,
  );
export const quadraticAreaGateSuite = (
  adapters = createNativeHelperAdapters(),
) =>
  upperSuite(
    quadraticAreaAuthor,
    QUADRATIC_AREA_HELPER_TYPE,
    verifyQuadraticArea,
    areaProfile,
    2,
    adapters,
  );
export const parabolaTranslationGateSuite = (
  adapters = createNativeHelperAdapters(),
) =>
  upperSuite(
    parabolaTranslationAuthor,
    PARABOLA_TRANSLATION_HELPER_TYPE,
    verifyParabolaTranslation,
    translationProfile,
    3,
    adapters,
  );

export const batch1UpperAuthors = [
  {
    candidateId: "C07",
    author: rootSignAuthor,
    gateSuite: rootSignGateSuite,
    variants: [0, 1],
  },
  {
    candidateId: "C08",
    author: factorRepairAuthor,
    gateSuite: factorRepairGateSuite,
    variants: [0, 1],
  },
  {
    candidateId: "C09",
    author: quadraticAreaAuthor,
    gateSuite: quadraticAreaGateSuite,
    variants: [0, 1],
  },
  {
    candidateId: "C10",
    author: parabolaTranslationAuthor,
    gateSuite: parabolaTranslationGateSuite,
    variants: [0, 1],
  },
] as const;
