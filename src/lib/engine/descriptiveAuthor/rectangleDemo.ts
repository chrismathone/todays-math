/** Unregistered vertical slice. The primary author owns the task, not the helper's wording. */
import type {
  NativeHelperAdapters,
  NativeHelperResults,
  NativePrimaryAuthor,
} from "../../../contracts/descriptiveAuthor.contract";
import {
  nativeExternalId,
  nativeFamilyKey,
  serializeNativeSolution,
  type NativeCriterionR2,
  type NativeDescriptiveProblem,
  type NativeDescriptiveProblemR2,
  type NativeFigureSpec,
} from "../../../contracts/nativeDescriptive.contract";
import { generateMiddleProblem } from "../../middle/generate";
import type { NativeGateSuite } from "../nativeDescriptiveGates";
import { verifyRectangleDemo } from "../descriptiveVerification/rectangleDemo";
import { createNativeAuthoredTask } from "./compose";

export const RECTANGLE_HELPER_TYPE = "2-1|연립일차방정식의 활용|29A";
const definitionId = "m2-rectangle-system-evidence-r2";
const prompts = [
  "가로와 세로의 길이를 각각 x cm, y cm라 할 때, 두 조건을 연립방정식으로 나타내고 각 식을 세운 이유를 쓰시오.",
  "연립방정식에서 한 미지수를 없애는 과정을 보이고 가로와 세로의 길이를 구하시오.",
  "구한 두 길이가 둘레와 길이 차의 조건에 맞는지 확인하고, 판의 넓이를 단위와 함께 쓰시오.",
] as const;

/** Fixed schematic: measured dimensions are unknown, and must not leak from the helper. */
function rectangleFigure(): NativeFigureSpec {
  return {
    version: 2,
    points: { A: [0, 0], B: [160, 0], C: [160, 90], D: [0, 90] },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
    },
    dimensions: {
      width: { points: ["A", "B"], label: "x cm" },
      height: { points: ["B", "C"], label: "y cm" },
    },
  };
}

function calculation(completed: NativeHelperResults) {
  const result = completed.get("numbers");
  if (
    !result ||
    result.kind !== "calculation" ||
    result.typeKey !== RECTANGLE_HELPER_TYPE
  )
    throw new Error("직사각형 계산 보조가 없습니다");
  const { width, height, perimeter, difference } = result.problem.facts;
  if (
    ![width, height, perimeter, difference].every(Number.isSafeInteger) ||
    width! < 8 ||
    width! > 24 ||
    height! < 3 ||
    height! > width! - 2 ||
    perimeter !== 2 * (width! + height!) ||
    difference !== width! - height!
  )
    throw new Error("직사각형 계산 보조의 범위/관계 오류");
  return {
    width: width!,
    height: height!,
    perimeter: perimeter!,
    difference: difference!,
  };
}

export const rectangleAuthor: NativePrimaryAuthor = {
  definition: {
    revision: 2,
    definitionId,
    title: "판의 두 조건을 연립하고 넓이 확인하기",
    grade: "중2",
    chapter: "3. 방정식",
    unitSection: "연립방정식의 활용(가격, 개수, 증감, 도형)",
    difficulty: "응용",
    difficultyBasis:
      "둘레·길이 차의 서로 다른 관계를 연립하고 소거 과정과 원조건 검토를 설명한다.",
    differentAction:
      "단답 쌍둥이의 세로 길이 외에 두 식의 근거, 소거 과정, 두 조건 검토를 요구한다.",
    limits:
      "2027 중2 1학기 시연 전용. 학교 난도·교사 채점 일치율은 미측정. 등록하지 않는다.",
    curriculum: {
      revision: 2022,
      schoolYear: 2027,
      grade: "중2",
      semester: 1,
      achievementStandards: [
        {
          code: "9수02-13",
          description:
            "미지수가 2개인 연립일차방정식을 풀 수 있고, 이를 활용하여 문제를 해결할 수 있다.",
        },
      ],
    },
    assessmentObjective:
      "두 실제 조건을 식으로 연결하고 연립방정식 풀이와 원조건 검토를 설명한다.",
    studentEvidence: [
      "둘레의 반과 차를 나타낸 두 식 및 이유",
      "가감법 또는 대입법의 소거 과정",
      "둘레·차 검산과 넓이의 제곱 단위",
    ],
    // Component mapping only. A system-specific written requirement is proposed in the report.
    studyRequirementIds: ["algebra.linear-model"],
    situation:
      "직사각형 판의 둘레와 가로·세로의 차를 알고 필요한 넓이를 구한다.",
    subquestions: prompts.map((text, i) => ({
      requirementId: `rectangle-${i + 1}`,
      text,
      points: [3, 3, 2][i]!,
    })),
  },
  helpers: [
    {
      id: "numbers",
      kind: "calculation",
      request: (context) => ({
        ...context,
        id: "numbers",
        kind: "calculation",
        engine: "middle",
        typeKey: RECTANGLE_HELPER_TYPE,
      }),
    },
    {
      id: "diagram",
      kind: "figure",
      request: (_, completed) => {
        calculation(completed);
        return { id: "diagram", kind: "figure", spec: rectangleFigure() };
      },
    },
  ],
  compose({ seed, variant }, completed) {
    if (variant !== 0 && variant !== 1)
      throw new Error("직사각형 시연은 변형 0·1만 허용합니다");
    const {
      width: w,
      height: h,
      perimeter: p,
      difference: d,
    } = calculation(completed);
    const diagram = completed.get("diagram");
    if (!diagram || diagram.kind !== "figure")
      throw new Error("직사각형 그림 보조가 없습니다");
    const sum = p / 2,
      area = w * h;
    const expected = [
      `$x+y=${sum}$, $x-y=${d}$: 둘레는 두 변의 합의 2배, 차는 가로에서 세로를 뺀 값`,
      `$2x=${sum + d}$, $x=${w}$, $y=${h}$: 두 식을 더해 y를 없애고 대입`,
      `$2(${w}+${h})=${p}$, $${w}-${h}=${d}$, 넓이 $${w}\\times${h}=${area}$ cm²`,
    ];
    const criteria: NativeCriterionR2[] = expected.map((text, i) => ({
      criterionId: ["model", "lengths", "area"][i]!,
      requirementId: `rectangle-${i + 1}`,
      factKey: ["model", "lengths", "area"][i]!,
      role: i === 2 ? "answer" : "method",
      expected: text,
      points: [3, 3, 2][i]!,
      evidence: [
        "두 관계식과 각각의 이유",
        "소거 또는 대입 과정과 두 길이",
        "둘레·차 검토, 넓이와 제곱 단위",
      ][i]!,
      alternatives: [
        [`둘레식 $2x+2y=${p}$와 차의 식을 함께 세움`],
        ["대입법으로 x 또는 y를 먼저 구하고 다른 길이를 구함"],
        ["두 길이의 곱을 반복덧셈 또는 세로셈으로 구함"],
      ][i]!,
      errors: [
        ["둘레를 두 변의 합으로 봄"],
        ["두 식을 더하면서 부호를 잘못 처리함"],
        ["둘레를 넓이로 쓰거나 cm로 표기함"],
      ][i]!,
      scoring: {
        full: [
          "두 관계식과 각각의 이유를 모두 제시",
          "소거 관계와 계산 및 두 길이를 모두 제시",
          "두 조건에 수치를 대입하고 일치 여부를 정확히 확인하며, 넓이 정답 수치·cm²를 모두 제시",
        ][i]!,
        partial:
          i === 2
            ? [
                {
                  points: 1,
                  condition:
                    "두 조건의 대입과 일치 여부 확인이 옳거나, 넓이 정답 수치·제곱 단위가 옳음. 둘 중 하나만 충족하면 1점(두 조건 검토만 옳고 넓이·단위가 틀린 경우 또는 정답·단위만 쓴 경우 포함)",
                },
              ]
            : [
                {
                  points: 2,
                  condition:
                    i === 0
                      ? "두 식은 옳지만 이유가 하나 이상 빠지거나 틀림"
                      : "소거·대입 뒤 길이를 구하는 계산까지 진행했으나 한 길이 누락 또는 계산 실수로 만점 조건에 미달",
                },
                {
                  points: 1,
                  condition:
                    i === 0
                      ? "한 관계식은 옳으나 다른 식이 틀리거나 없음(이유 유무와 관계없이 1점)"
                      : "유효한 소거 또는 대입 관계만 제시",
                },
              ],
        zero: "만점·부분점수 조건 중 충족하는 가장 높은 점수를 적용하고, 어느 조건도 충족하지 못하면 0점",
      },
      carryForward: {
        fromFactKeys: i === 0 ? [] : i === 1 ? ["model"] : ["model", "lengths"],
        rule: "preserve-method-points",
        condition:
          i === 0
            ? "선행 기준 없음"
            : i === 1
              ? "앞에서 잘못 세운 식이라도 그 식에 대한 소거·대입 계산이 일관되게 옳으면 방법 2점을 인정한다. 나머지 1점은 실제 두 길이가 정답일 때만 인정한다."
              : "앞 길이가 틀려도 두 원조건에 대입하고 일치 여부를 정확히 확인하면 검토 1점을 보존한다. 나머지 1점은 최종 넓이 수치와 cm²가 정답일 때만 인정한다.",
      },
    }));
    const rubric = { revision: 2 as const, totalPoints: 8, criteria };
    const modelAnswer = `(1) 둘레는 가로와 세로의 합의 2배이므로 $x+y=${sum}$이다. 가로에서 세로를 뺀 값이 ${d}이므로 $x-y=${d}$이다.\n(2) 두 식을 더하면 $2x=${sum + d}$이므로 $x=${w}$이다. 첫 식에 대입하면 $y=${h}$이다.\n(3) $2(${w}+${h})=${p}$, $${w}-${h}=${d}$이므로 두 조건을 모두 만족한다. 넓이는 $${w}\\times${h}=${area}$ cm²이다.`;
    return {
      revision: 2,
      definitionId,
      seed,
      variant,
      familyKey: nativeFamilyKey(definitionId),
      externalId: nativeExternalId({ definitionId, seed, variant }),
      questionType: "서술형",
      problemType: "활용",
      content: `직사각형 모양의 ${variant === 0 ? "전시판" : "공지판"}을 만들려고 한다. 판의 둘레는 $${p}$ cm이고 가로는 세로보다 $${d}$ cm 길다. 그림은 길이의 비율과 관계없는 개략도이다.\n${prompts.map((text, i) => `(${i + 1}) ${text}`).join("\n")}`,
      answer: `${area} cm²`,
      modelAnswer,
      solution: serializeNativeSolution(modelAnswer, rubric),
      rubric,
      curriculum: structuredClone(rectangleAuthor.definition.curriculum),
      figureSpec: structuredClone(diagram.spec),
      requirements: prompts.map((text, i) => ({
        requirementId: `rectangle-${i + 1}`,
        text,
        criterionIds: [criteria[i]!.criterionId],
      })),
      facts: [
        { factKey: "perimeter", kind: "given", value: String(p), unit: "cm" },
        { factKey: "difference", kind: "given", value: String(d), unit: "cm" },
        {
          factKey: "model",
          kind: "intermediate",
          value: `x+y=${sum};x-y=${d}`,
        },
        {
          factKey: "lengths",
          kind: "intermediate",
          value: `${w},${h}`,
          unit: "cm",
        },
        { factKey: "area", kind: "answer", value: String(area), unit: "cm²" },
      ],
      steps: [
        {
          stepId: "model",
          kind: "deduction",
          inputFactKeys: ["perimeter", "difference"],
          relation: "직사각형 둘레 및 차의 정의",
          outputFactKey: "model",
        },
        {
          stepId: "eliminate",
          kind: "deduction",
          inputFactKeys: ["model"],
          relation: "두 식의 합으로 한 미지수를 소거하고 대입",
          outputFactKey: "lengths",
        },
        {
          stepId: "area",
          kind: "deduction",
          inputFactKeys: ["lengths", "perimeter", "difference"],
          relation: "두 원조건을 검토하고 가로와 세로를 곱함",
          outputFactKey: "area",
        },
      ],
    };
  },
};

/** Samples cover every helper width/height pair as well as both author contexts. */
export async function rectangleGateSuite(
  adapters: NativeHelperAdapters,
): Promise<NativeGateSuite> {
  const pairs = new Set<string>();
  for (let w = 8; w <= 24; w++)
    for (let h = 3; h <= w - 2; h++) pairs.add(`${w},${h}`);
  const seeds = new Set(Array.from({ length: 256 }, (_, i) => i));
  const branches = [...pairs].flatMap((pair) =>
    ["전시판", "공지판"].map((context) => `${pair}:${context}`),
  );
  const unseen = new Set(branches);
  for (let seed = 0; seed < 20000 && unseen.size; seed++) {
    for (const variant of [0, 1]) {
      const f = generateMiddleProblem(
        RECTANGLE_HELPER_TYPE,
        seed,
        variant,
      ).facts;
      if (
        unseen.delete(
          `${f.width},${f.height}:${variant === 0 ? "전시판" : "공지판"}`,
        )
      )
        seeds.add(seed);
    }
  }
  if (unseen.size) throw new Error("직사각형 전체 수치 갈래를 찾지 못했습니다");
  const samples = [...seeds].flatMap((seed) =>
    [0, 1].map((variant) => ({ seed, variant })),
  );
  const problems = new Map<string, NativeDescriptiveProblemR2>();
  for (const { seed, variant } of samples) {
    const task = await createNativeAuthoredTask(
      rectangleAuthor,
      seed,
      variant,
      adapters,
    );
    problems.set(`${seed}/${variant}`, task.problem);
  }
  return {
    samples,
    generate: (s, v) => structuredClone(problems.get(`${s}/${v}`)!),
    verify: verifyRectangleDemo,
    twin: (seed, variant) => {
      const p = generateMiddleProblem(RECTANGLE_HELPER_TYPE, seed, variant);
      // The twin asks for the height in the shared lengths group; it asks for no model evidence.
      return {
        seed,
        variant,
        content: p.content,
        modelAnswer: p.solution,
        requiredFactKeys: ["lengths"],
      };
    },
    coverage: [
      { dimension: "lengthPair", values: [...pairs] },
      { dimension: "context", values: ["전시판", "공지판"] },
      { dimension: "pairContext", values: branches },
    ],
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
    mutations: [
      {
        kind: "sign",
        label: "길이 차의 부호",
        mutate: (p: NativeDescriptiveProblem) => ({
          ...p,
          content: p.content.replace(/세로보다 \$(\d+)/, "세로보다 $-$1"),
        }),
      },
      {
        kind: "unit",
        label: "둘레의 단위",
        mutate: (p: NativeDescriptiveProblem) => ({
          ...p,
          content: p.content.replace(/(둘레는 \$\d+\$) cm/, "$1 m"),
        }),
      },
      {
        kind: "intermediate",
        label: "두 길이 중간값",
        mutate: (p: NativeDescriptiveProblem) => {
          if (p.revision === 2)
            p.facts.find((f) => f.factKey === "lengths")!.value = "999,999";
          return p;
        },
      },
      {
        kind: "figure-label",
        label: "가로 라벨",
        mutate: (p: NativeDescriptiveProblem) => {
          (
            p.figureSpec!.dimensions as Record<string, { label: string }>
          ).width!.label = "y cm";
          return p;
        },
      },
    ].map((m) => ({
      seed: 0,
      variant: 0,
      ...m,
    })) as NativeGateSuite["mutations"],
  };
}
