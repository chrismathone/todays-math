import {
  nativeExternalId,
  nativeFamilyKey,
  serializeNativeSolution,
  type NativeCriterionR2,
  type NativeDescriptiveProblemR2,
  type NativeDescriptiveProblem,
} from "../../contracts/nativeDescriptive.contract";
import type { NativeGateSuite } from "../../lib/engine/nativeDescriptiveGates";
import { verifyCoreFixture } from "./descriptiveCoreOracle";

/** Deliberately unregistered. It never enters a bank, loader, or student route. */
export function fixtureProblem(
  seed: number,
  variant: number,
): NativeDescriptiveProblemR2 {
  const definitionId = "fixture-linear-r2",
    b = seed + 2,
    m = variant === 0 ? 1 : -1;
  const height = b + 2 * m,
    result = b + 3 * m;
  const texts = [
    "절편의 근거를 쓰세요.",
    "x=2일 때 대입 관계를 쓰세요.",
    "x=3에서 y의 값을 쓰세요.",
  ];
  const criterion = (
    id: string,
    i: number,
    points: number,
    expected: string,
    fromFactKeys: string[],
  ): NativeCriterionR2 => ({
    criterionId: id,
    requirementId: `req-${id}`,
    factKey: id,
    role: id === "result" ? "answer" : "method",
    expected,
    evidence: texts[i]!,
    points,
    alternatives: ["두 점 사이의 변화량을 이용"],
    errors: ["증가량과 y값을 혼동"],
    scoring: {
      full: "관계와 결과를 모두 제시",
      partial: [{ points: 1, condition: "관계는 맞고 계산에 실수" }],
      zero: "요구한 증거가 없음",
    },
    carryForward: {
      fromFactKeys,
      rule: "preserve-method-points",
      condition: "앞 단계 수치를 일관되게 사용하여 방법이 옳은 경우",
    },
  });
  const rubric = {
    revision: 2 as const,
    totalPoints: 8,
    criteria: [
      criterion("base", 0, 3, `절편 ${b}`, []),
      criterion("height", 1, 3, `대입값 ${height}`, ["base"]),
      criterion("result", 2, 2, `결과 ${result} cm`, ["base", "height"]),
    ],
  };
  const modelAnswer = `두 점으로 구한 절편은 ${b}입니다. x=2의 대입값은 ${height}입니다. 결과는 ${result} cm입니다.`;
  return {
    revision: 2,
    definitionId,
    seed,
    variant,
    familyKey: nativeFamilyKey(definitionId),
    externalId: nativeExternalId({ definitionId, seed, variant }),
    questionType: "서술형",
    problemType: "활용",
    content: `그림의 두 점을 지나는 직선입니다. 단위는 cm입니다. ${texts.join(" ")}`,
    answer: `${result} cm`,
    modelAnswer,
    rubric,
    solution: serializeNativeSolution(modelAnswer, rubric),
    figureSpec: {
      version: "elem-1",
      kind: "linearGraph",
      lines: [{ slope: m, yIntercept: b }],
      marks: [
        [0, b],
        [1, b + m],
      ],
      xRange: [-1, 4],
      yRange: [-3, 8],
    },
    curriculum: {
      revision: 2022,
      schoolYear: 2027,
      grade: "중2",
      semester: 1,
      achievementStandards: [
        {
          code: "fixture",
          description: "검사기 시험 전용이며 교육과정 매핑 주장이 아님",
        },
      ],
    },
    facts: [
      { factKey: "points", kind: "given", value: `${b},${b + m}` },
      { factKey: "base", kind: "intermediate", value: String(b), unit: "cm" },
      {
        factKey: "height",
        kind: "intermediate",
        value: String(height),
        unit: "cm",
      },
      { factKey: "result", kind: "answer", value: String(result), unit: "cm" },
    ],
    requirements: texts.map((text, i) => ({
      requirementId: `req-${rubric.criteria[i]!.criterionId}`,
      text,
      criterionIds: [rubric.criteria[i]!.criterionId],
    })),
    steps: [
      {
        stepId: "intercept",
        kind: "deduction",
        inputFactKeys: ["points"],
        relation: "두 점의 변화율과 y절편 관계",
        outputFactKey: "base",
      },
      {
        stepId: "substitute",
        kind: "deduction",
        inputFactKeys: ["points", "base"],
        relation: "x의 변화량에 기울기를 곱하여 절편에 더함",
        outputFactKey: "height",
      },
      {
        stepId: "finish",
        kind: "deduction",
        inputFactKeys: ["base", "height"],
        relation: "일정한 변화율을 한 구간 더 적용",
        outputFactKey: "result",
      },
    ],
  };
}

export function coreFixtureSuite(): NativeGateSuite {
  return {
    generate: fixtureProblem,
    verify: verifyCoreFixture,
    twin: (seed, variant) => {
      const p = fixtureProblem(seed, variant);
      return {
        seed,
        variant,
        content: "그림에서 x=3일 때 y를 구하세요.",
        modelAnswer: p.answer,
        requiredFactKeys: ["result"],
      };
    },
    samples: [0, 1].flatMap((seed) =>
      [0, 1].map((variant) => ({ seed, variant })),
    ),
    coverage: [
      { dimension: "width", values: ["2", "3"] },
      { dimension: "branch", values: ["up", "down"] },
    ],
    scoringExamples: (p) => ({
      answerOnly: {
        response: p.answer,
        awards: p.rubric.criteria.map((c) => ({
          criterionId: c.criterionId,
          points: c.role === "answer" ? c.points : 0,
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
        label: "대입할 x 부호",
        mutate: (p: NativeDescriptiveProblem) => ({
          ...p,
          content: p.content.replace("x=3에서", "x=-3에서"),
        }),
      },
      {
        kind: "unit",
        label: "cm를 m로",
        mutate: (p: NativeDescriptiveProblem) => ({
          ...p,
          content: p.content.replace("단위는 cm", "단위는 m"),
        }),
      },
      {
        kind: "intermediate",
        label: "절편 중간값",
        mutate: (p: NativeDescriptiveProblem) => {
          if (p.revision === 2)
            p.facts.find((f) => f.factKey === "base")!.value = "999";
          return p;
        },
      },
      {
        kind: "figure-label",
        label: "첫 점의 y 라벨",
        mutate: (p: NativeDescriptiveProblem) => {
          (p.figureSpec!.marks as number[][])[0]![1]!++;
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
