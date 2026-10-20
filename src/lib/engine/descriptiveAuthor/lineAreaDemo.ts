/** Unregistered C06. The author owns the evidence; existing engines supply numbers and graphs. */
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
import { verifyLineAreaDemo } from "../descriptiveVerification/lineAreaDemo";
import { createNativeAuthoredTask } from "./compose";

export const LINE_AREA_HELPER_TYPE = "2-1|일차함수와 일차방정식의 관계|12";
const definitionId = "m2-line-intersection-area-evidence-r2";
const prompts = [
  "y축 위의 점이 만족하는 좌표 조건을 쓰고, 이를 각 직선의 식에 대입하여 A, B의 좌표를 구하시오.",
  "두 직선의 식을 연립하여 푸는 과정을 보이고 P의 좌표를 구한 뒤, 두 식에 각각 대입하여 확인하시오.",
  "선분 AB를 밑변으로 할 때 밑변과 높이의 길이를 구하고, 좌표의 차와 축에 수직인 거리를 이용하는 이유를 설명하시오. 삼각형의 넓이를 계산 과정 및 단위와 함께 쓰시오.",
] as const;
const equation = (m: number, b: number) =>
  `${m === 1 ? "" : m === -1 ? "-" : m}x-y=${-b}`;

function calculation(completed: NativeHelperResults) {
  const result = completed.get("numbers");
  if (
    !result ||
    result.kind !== "calculation" ||
    result.typeKey !== LINE_AREA_HELPER_TYPE
  )
    throw new Error("직선 넓이 계산 보조가 없습니다");
  const { m1, b1, m2, b2, p, q, area } = result.problem.facts;
  if (
    ![m1, b1, m2, b2, p, q, area].every(Number.isSafeInteger) ||
    !m1 ||
    !m2 ||
    m1 === m2 ||
    Math.abs(m1) > 3 ||
    Math.abs(m2) > 3 ||
    !b1 ||
    !b2 ||
    Math.abs(b1) > 5 ||
    Math.abs(b2) > 5 ||
    !p ||
    Math.abs(p) > 3 ||
    Math.abs(q!) > 3 ||
    q !== m1 * p + b1 ||
    q !== m2 * p + b2 ||
    area !== (Math.abs(b1 - b2) * Math.abs(p)) / 2
  )
    throw new Error("직선 넓이 계산 보조의 범위/관계 오류");
  const expected = {
    version: "elem-1",
    kind: "linearGraph",
    lines: [
      { slope: m1, yIntercept: b1 },
      { slope: m2, yIntercept: b2 },
    ],
    xRange: [Math.min(-1, p) - 1, Math.max(1, p) + 1],
    yRange: [Math.min(-1, b1, b2, q!) - 1, Math.max(1, b1, b2, q!) + 1],
    marks: [
      [0, b1],
      [0, b2],
      [p, q],
    ],
  };
  if (JSON.stringify(result.problem.figureSpec) !== JSON.stringify(expected))
    throw new Error("기존 linearGraph 보조의 직선·범위·교점 불일치");
  const spec: NativeFigureSpec = structuredClone(result.problem.figureSpec!);
  // Existing marks print coordinate values. Those are assessed intermediates here.
  spec.marks = [];
  spec.lines = expected.lines.map((line, i) => ({
    ...line,
    label: i === 0 ? "l" : "m",
  }));
  return { m1, b1, m2, b2, p, q: q!, area, spec };
}

export const lineAreaAuthor: NativePrimaryAuthor = {
  definition: {
    revision: 2,
    definitionId,
    title: "두 직선의 교점에서 삼각형 넓이까지 설명하기",
    grade: "중2",
    chapter: "4. 함수",
    unitSection: "일차함수의 그래프와 연립방정식의 해",
    difficulty: "심화하",
    difficultyBasis:
      "두 축교점과 연립식의 해를 구하고 좌표의 부호와 수직 거리를 넓이의 밑변·높이로 연결한다.",
    differentAction:
      "넓이만 묻는 단답 쌍둥이에 축교점 대입, 연립 풀이와 교점 검산, 밑변·높이의 근거를 추가한다.",
    limits:
      "2027 중2 1학기 미등록 시연. 학원 자체 배점이며 학교 난도·교사 채점 일치율은 미측정.",
    curriculum: {
      revision: 2022,
      schoolYear: 2027,
      grade: "중2",
      semester: 1,
      achievementStandards: [
        {
          code: "9수02-16",
          description:
            "일차함수의 그래프의 성질을 이해하고, 이를 활용하여 문제를 해결할 수 있다.",
        },
        {
          code: "9수02-18",
          description:
            "두 일차함수의 그래프와 연립일차방정식의 관계를 설명할 수 있다.",
        },
      ],
    },
    assessmentObjective:
      "축교점·연립식의 해를 좌표로 해석하고 수직 거리의 근거로 삼각형의 넓이를 설명한다.",
    studentEvidence: [
      "x=0을 대입한 두 y축 교점",
      "연립식 풀이와 교점을 두 식에 대입한 검산",
      "y좌표 차의 절댓값인 밑변과 x좌표 절댓값인 높이의 근거",
      "삼각형 넓이 계산과 제곱 단위",
    ],
    // Related component only; written.line-intersection-area is not registered.
    studyRequirementIds: ["coord.two-lines-dependent-area"],
    situation:
      "두 직선과 y축으로 둘러싸인 삼각형의 넓이를 좌표와 식으로 설명한다.",
    subquestions: prompts.map((text, i) => ({
      requirementId: `line-area-${i + 1}`,
      text,
      points: [2, 2, 4][i]!,
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
        typeKey: LINE_AREA_HELPER_TYPE,
      }),
    },
    {
      // linearGraph is elem-1, so use the existing figure adapter; graph accepts graph-1 only.
      id: "diagram",
      kind: "figure",
      request: (_, completed) => ({
        id: "diagram",
        kind: "figure",
        spec: calculation(completed).spec,
      }),
    },
  ],
  compose({ seed, variant }, completed) {
    if (variant !== 0 && variant !== 1)
      throw new Error("직선 넓이 시연은 변형 0·1만 허용합니다");
    const { m1, b1, m2, b2, p, q, area } = calculation(completed);
    const diagram = completed.get("diagram");
    if (!diagram || diagram.kind !== "figure")
      throw new Error("직선 넓이 그림 보조가 없습니다");
    const base = Math.abs(b1 - b2),
      height = Math.abs(p);
    const difference = m1 - m2;
    const eliminated =
      difference === 1 ? "x" : difference === -1 ? "-x" : `${difference}x`;
    const expected = [
      `y축 위에서는 $x=0$이다. 두 식에 각각 대입하면 $-y=${-b1}$, $-y=${-b2}$이므로 $A(0,${b1})$, $B(0,${b2})$이다.`,
      `두 식을 빼면 $${eliminated}=${b2 - b1}$이므로 $x=${p}$, 대입하면 $y=${q}$이다. 따라서 $P(${p},${q})$이고, $${m1}\\times(${p})-(${q})=${-b1}$, $${m2}\\times(${p})-(${q})=${-b2}$이므로 두 식을 모두 만족한다.`,
      `A, B는 y축 위에 있으므로 밑변은 y좌표 차의 절댓값 $AB=|(${b1})-(${b2})|=${base}$ cm이다. 높이는 P에서 y축에 수직인 수평 거리이므로 x좌표의 절댓값 $h=|${p}|=${height}$ cm이다.`,
      `$S=\\dfrac{1}{2}\\times${base}\\times${height}=${area}$ cm²이다.`,
    ];
    const criteria: NativeCriterionR2[] = [
      {
        criterionId: "axis",
        requirementId: "line-area-1",
        factKey: "axis",
        role: "method",
        expected: expected[0]!,
        points: 2,
        evidence: "y축의 좌표 조건 x=0, 두 식에 대입한 결과와 A·B 좌표",
        alternatives: ["각 식을 y에 대해 정리하여 y절편과 x=0을 연결함"],
        errors: [
          "y축 교점에서 y=0을 대입함",
          "좌표의 순서 또는 절편의 부호를 바꿈",
        ],
        scoring: {
          full: "y축의 좌표 조건 x=0과 두 식의 대입 및 A·B 좌표가 모두 옳음",
          partial: [
            {
              points: 1,
              condition:
                "x=0을 이용한 유효한 대입이 하나 이상 있거나 교점 좌표가 하나 이상 옳지만, 만점 조건에는 못 미침(대입 뒤 부호를 틀린 경우 포함)",
            },
          ],
          zero: "만점·부분점수 중 충족하는 높은 점수를 적용하고, 유효한 대입과 옳은 교점 좌표가 모두 없으면 0점",
        },
        carryForward: {
          fromFactKeys: [],
          rule: "preserve-method-points",
          condition: "선행 기준 없음",
        },
      },
      {
        criterionId: "intersection",
        requirementId: "line-area-2",
        factKey: "intersection",
        role: "method",
        expected: expected[1]!,
        points: 2,
        evidence: "소거·대입 과정, P 좌표, 두 원식에 대입한 확인",
        alternatives: [
          "대입법 또는 각 직선을 y에 대해 정리한 뒤 두 우변을 같게 두어 풂",
        ],
        errors: ["두 식을 빼면서 부호를 바꿈", "검산을 한 식에만 함"],
        scoring: {
          full: "연립 풀이·교점 좌표·두 식 대입 검산이 모두 옳음",
          partial: [
            {
              points: 1,
              condition:
                "유효한 연립 풀이 또는 두 원식에 대한 올바른 대입 검산이 있으나 만점 조건에 미달(두 식 검산만 한 경우 포함)",
            },
          ],
          zero: "만점·부분점수를 높은 점수부터 적용하고 나머지는 0점(좌표만 쓴 경우 포함)",
        },
        carryForward: {
          fromFactKeys: [],
          rule: "preserve-method-points",
          condition:
            "축교점 값에 의존하지 않고 두 원식을 풀므로 선행 오류 재감점 없음",
        },
      },
      {
        criterionId: "lengths",
        requirementId: "line-area-3",
        factKey: "lengths",
        role: "method",
        expected: expected[2]!,
        points: 3,
        evidence:
          "밑변의 y좌표 차, 높이의 x좌표 절댓값, y축에 수직인 수평 거리의 설명",
        alternatives: [
          "밑변의 두 끝점 사이 칸 수와 P에서 y축까지 수평 칸 수를 설명함",
        ],
        errors: [
          "음수 좌표를 음수 길이로 씀",
          "높이를 P의 y좌표나 비스듬한 변 길이로 씀",
        ],
        scoring: {
          full: "양수인 밑변·높이와 각각의 좌표·수직 거리 근거가 모두 옳음",
          partial: [
            {
              points: 2,
              condition:
                "밑변·높이 모두 옳으나 한 근거만 설명하거나 두 방법은 옳고 한 계산만 실수함",
            },
            {
              points: 1,
              condition:
                "밑변·높이 계산 방법과 근거가 하나 이상 옳지만 2점 조건에 미달, 또는 두 길이의 계산식·값만 옳게 쓰고 설명 없이 제시함",
            },
          ],
          zero: "만점·부분점수 중 충족하는 높은 점수를 적용하고, 그 밖의 답안은 0점",
        },
        carryForward: {
          fromFactKeys: ["axis", "intersection"],
          rule: "preserve-method-points",
          condition:
            "선행 좌표 오류에는 이 규정을 우선한다. 그 좌표로 두 길이의 절댓값과 좌표·수직 거리 근거를 모두 바르게 제시하면 방법 3점, 일부만 옳으면 부분점수를 준다. 현재 새 계산 오류는 감점한다.",
        },
      },
      {
        criterionId: "area",
        requirementId: "line-area-3",
        factKey: "area",
        role: "answer",
        expected: expected[3]!,
        points: 1,
        evidence: "밑변×높이÷2의 계산과 넓이 수치·cm²",
        alternatives: [
          "같은 삼각형 두 개로 밑변 AB, 높이 h인 평행사변형을 만든 뒤 그 넓이를 반으로 나눔",
        ],
        errors: ["2로 나누지 않음", "cm를 넓이의 단위로 씀"],
        scoring: {
          full: "밑변×높이÷2의 계산 과정과 넓이 정답 수치·cm²를 모두 제시",
          partial: [],
          zero: "계산 과정이 없거나 넓이 수치·제곱 단위가 틀리거나 없음",
        },
        carryForward: {
          fromFactKeys: ["axis", "intersection", "lengths"],
          rule: "preserve-method-points",
          condition:
            "최종 넓이는 정답 기준으로 채점하되 선행 좌표 오류로 이미 인정한 거리·풀이 방법 점수를 다시 깎지 않는다.",
        },
      },
    ];
    const rubric = { revision: 2 as const, totalPoints: 8, criteria };
    const modelAnswer = `(1) ${expected[0]}\n(2) ${expected[1]}\n(3) ${expected[2]} ${expected[3]}`;
    return {
      revision: 2,
      definitionId,
      seed,
      variant,
      familyKey: nativeFamilyKey(definitionId),
      externalId: nativeExternalId({ definitionId, seed, variant }),
      questionType: "서술형",
      problemType: "활용",
      content: `그림의 두 직선 $l: ${equation(m1, b1)}$, $m: ${equation(m2, b2)}$와 y축으로 둘러싸인 삼각형을 생각하자. 두 좌표축에서 눈금 한 칸의 길이는 1 cm이다. A, B는 각각 l, m과 y축의 교점이고 P는 두 직선의 교점이다.\n${prompts.map((text, i) => `(${i + 1}) ${text}`).join("\n")}`,
      answer: `${area} cm²`,
      modelAnswer,
      solution: serializeNativeSolution(modelAnswer, rubric),
      rubric,
      curriculum: structuredClone(lineAreaAuthor.definition.curriculum),
      figureSpec: structuredClone(diagram.spec),
      requirements: prompts.map((text, i) => ({
        requirementId: `line-area-${i + 1}`,
        text,
        criterionIds:
          i === 0 ? ["axis"] : i === 1 ? ["intersection"] : ["lengths", "area"],
      })),
      facts: [
        {
          factKey: "equations",
          kind: "given",
          value: `${m1},${-b1};${m2},${-b2}`,
        },
        { factKey: "scale", kind: "given", value: "1", unit: "cm" },
        { factKey: "axis", kind: "intermediate", value: `${b1},${b2}` },
        { factKey: "intersection", kind: "intermediate", value: `${p},${q}` },
        {
          factKey: "lengths",
          kind: "intermediate",
          value: `${base},${height}`,
          unit: "cm",
        },
        { factKey: "area", kind: "answer", value: String(area), unit: "cm²" },
      ],
      steps: [
        {
          stepId: "axis",
          kind: "deduction",
          inputFactKeys: ["equations"],
          relation: "y축 위의 x=0을 두 식에 대입",
          outputFactKey: "axis",
        },
        {
          stepId: "intersection",
          kind: "deduction",
          inputFactKeys: ["equations"],
          relation: "두 식의 해를 연립하고 원식에 대입해 검산",
          outputFactKey: "intersection",
        },
        {
          stepId: "lengths",
          kind: "deduction",
          inputFactKeys: ["axis", "intersection", "scale"],
          relation: "같은 축의 좌표 차와 축에 수직인 거리를 양수 길이로 환산",
          outputFactKey: "lengths",
        },
        {
          stepId: "area",
          kind: "deduction",
          inputFactKeys: ["lengths"],
          relation: "삼각형의 밑변×높이÷2",
          outputFactKey: "area",
        },
      ],
    };
  },
};

/** Cover the helper's entire small domain, independently declared before seed selection. */
export async function lineAreaGateSuite(
  adapters: NativeHelperAdapters,
): Promise<NativeGateSuite> {
  const pairs = new Set<string>();
  for (const x of [-3, -2, -1, 1, 2, 3])
    for (let y = -3; y <= 3; y++)
      for (const a of [-3, -2, -1, 1, 2, 3])
        for (const b of [-3, -2, -1, 1, 2, 3]) {
          const c = y - a * x,
            d = y - b * x;
          if (
            a === b ||
            !c ||
            !d ||
            Math.abs(c) > 5 ||
            Math.abs(d) > 5 ||
            Math.abs((c - d) * x) % 2
          )
            continue;
          pairs.add(`${a},${c},${b},${d}`);
        }
  const seeds = new Set(Array.from({ length: 256 }, (_, i) => i));
  const unseen = new Set(
    [...pairs].flatMap((pair) => [0, 1].map((v) => `${pair}:${v}`)),
  );
  for (let seed = 0; seed < 20000 && unseen.size; seed++)
    for (const variant of [0, 1]) {
      const f = generateMiddleProblem(
        LINE_AREA_HELPER_TYPE,
        seed,
        variant,
      ).facts;
      if (unseen.delete(`${f.m1},${f.b1},${f.m2},${f.b2}:${variant}`))
        seeds.add(seed);
    }
  if (unseen.size)
    throw new Error("직선 넓이 전체 수치·변형 조합을 찾지 못했습니다");
  const samples = [...seeds]
    .sort((a, b) => a - b)
    .flatMap((seed) => [0, 1].map((variant) => ({ seed, variant })));
  const problems = new Map<string, NativeDescriptiveProblemR2>();
  for (const { seed, variant } of samples) {
    const task = await createNativeAuthoredTask(
      lineAreaAuthor,
      seed,
      variant,
      adapters,
    );
    problems.set(`${seed}/${variant}`, task.problem);
  }
  return {
    samples,
    generate: (s, v) => {
      const p = problems.get(`${s}/${v}`);
      if (!p) throw new Error("검사 표본에 없는 씨앗·변형");
      return structuredClone(p);
    },
    verify: verifyLineAreaDemo,
    twin: (seed, variant) => {
      const p = generateMiddleProblem(LINE_AREA_HELPER_TYPE, seed, variant);
      return {
        seed,
        variant,
        content: p.content,
        modelAnswer: p.solution,
        requiredFactKeys: ["area"],
      };
    },
    coverage: [
      { dimension: "linePair", values: [...pairs] },
      { dimension: "x", values: ["-3", "-2", "-1", "1", "2", "3"] },
      { dimension: "y", values: ["-3", "-2", "-1", "0", "1", "2", "3"] },
      {
        dimension: "interceptSigns",
        values: ["opposite", "positive", "negative"],
      },
      { dimension: "interceptOrder", values: ["ascending", "descending"] },
      { dimension: "slopeSigns", values: ["opposite", "positive", "negative"] },
      { dimension: "area", values: ["1", "2", "3", "4", "6", "8", "9", "10"] },
    ],
    scoringExamples: (p) => ({
      answerOnly: {
        response: p.answer,
        awards: p.rubric.criteria.map((c) => ({
          criterionId: c.criterionId,
          points: 0,
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
        kind: "sign",
        label: "첫 직선의 상수항 부호",
        mutate: (p) => ({
          ...p,
          content: p.content.replace(
            /(l: [^=]+=)(-?\d+)/,
            (_, prefix: string, n: string) => `${prefix}${-Number(n)}`,
          ),
        }),
      },
      {
        seed: 0,
        variant: 0,
        kind: "unit",
        label: "좌표 눈금의 단위",
        mutate: (p) => ({ ...p, content: p.content.replace("1 cm", "1 m") }),
      },
      ...["axis", "intersection", "lengths"].map((key) => ({
        seed: 0,
        variant: 0,
        kind: "intermediate" as const,
        label: `${key} 배점 중간값`,
        mutate: (p: NativeDescriptiveProblem) => {
          if (p.revision === 2)
            p.facts.find((f) => f.factKey === key)!.value = "999,999";
          return p;
        },
      })),
      {
        seed: 0,
        variant: 0,
        kind: "figure-label",
        label: "직선 l을 m으로 바꾼 라벨",
        mutate: (p) => {
          (p.figureSpec!.lines as { label: string }[])[0]!.label = "m";
          return p;
        },
      },
    ],
  };
}
