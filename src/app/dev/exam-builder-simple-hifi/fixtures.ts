import {
  emptyFormats,
  emptyLadder,
  type AppliedConditions,
} from "../../../components/exam-builder/conditionsPlan";

/**
 * 독립 시안 데이터. 전체 범위 735는 지시서의 관측 규모다.
 * 차시명은 concept-blank/bank/e3-plus.ts와 Wire A에서 확인한 이름이다.
 * 가능 수·책·배분·문항은 자체 예시이며 DB/API를 조회하지 않는다.
 */
export const CATALOG_SIZE = 735;
export const TIERS = [
  "연산",
  "기본",
  "응용",
  "심화하",
  "심화중",
  "심화상",
] as const;
export const FORMATS = ["객관식", "단답형", "서술형"] as const;
export const LESSONS = [
  {
    id: "1-1-1",
    chapter: "1. 덧셈과 뺄셈",
    name: "받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)",
    available: 48,
  },
  {
    id: "1-1-2",
    chapter: "1. 덧셈과 뺄셈",
    name: "받아올림이 두 번, 세 번 있는 (세 자리 수)+(세 자리 수)",
    available: 36,
  },
  {
    id: "1-1-3",
    chapter: "1. 덧셈과 뺄셈",
    name: "받아내림이 없는, 한 번 있는 (세 자리 수)-(세 자리 수)",
    available: 42,
  },
  {
    id: "1-1-4",
    chapter: "1. 덧셈과 뺄셈",
    name: "받아내림이 두 번 있는 (세 자리 수)-(세 자리 수)",
    available: 28,
  },
  {
    id: "1-2-1",
    chapter: "2. 평면도형",
    name: "선분, 반직선, 직선",
    available: 24,
  },
  {
    id: "1-2-2",
    chapter: "2. 평면도형",
    name: "각, 직각 알아보기",
    available: 31,
  },
  {
    id: "1-2-3",
    chapter: "2. 평면도형",
    name: "직각삼각형 알아보기",
    available: 19,
  },
  {
    id: "1-2-4",
    chapter: "2. 평면도형",
    name: "직사각형 알아보기",
    available: 0,
  },
  {
    id: "1-2-5",
    chapter: "2. 평면도형",
    name: "정사각형 알아보기",
    available: 17,
  },
  { id: "1-3-1", chapter: "3. 나눗셈", name: "똑같이 나누기", available: 25 },
  {
    id: "1-3-2",
    chapter: "3. 나눗셈",
    name: "곱셈과 나눗셈의 관계",
    available: 34,
  },
  {
    id: "1-3-3",
    chapter: "3. 나눗셈",
    name: "나눗셈의 몫을 곱셈식으로 구하기",
    available: 22,
  },
  {
    id: "1-3-4",
    chapter: "3. 나눗셈",
    name: "나눗셈의 몫을 곱셈구구로 구하기",
    available: 29,
  },
  { id: "1-4-1", chapter: "4. 곱셈", name: "(몇십)×(몇)", available: 37 },
  {
    id: "1-4-2",
    chapter: "4. 곱셈",
    name: "올림이 없는 (몇십몇)×(몇)",
    available: 32,
  },
  {
    id: "1-4-3",
    chapter: "4. 곱셈",
    name: "십의 자리에서 올림이 있는 (몇십몇)×(몇)",
    available: 28,
  },
  {
    id: "1-4-4",
    chapter: "4. 곱셈",
    name: "일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    available: 26,
  },
  {
    id: "1-4-5",
    chapter: "4. 곱셈",
    name: "십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    available: 23,
  },
  {
    id: "1-5-1",
    chapter: "5. 길이와 시간",
    name: "1cm보다 작은 단위",
    available: 18,
  },
  {
    id: "1-5-2",
    chapter: "5. 길이와 시간",
    name: "1m보다 큰 단위",
    available: 21,
  },
  {
    id: "1-5-3",
    chapter: "5. 길이와 시간",
    name: "길이와 거리를 어림하고 재어 보기",
    available: 23,
  },
  {
    id: "1-5-4",
    chapter: "5. 길이와 시간",
    name: "1분보다 작은 단위",
    available: 18,
  },
  {
    id: "1-5-5",
    chapter: "5. 길이와 시간",
    name: "시간의 덧셈",
    available: 24,
  },
  {
    id: "1-5-6",
    chapter: "5. 길이와 시간",
    name: "시간의 뺄셈",
    available: 19,
  },
  {
    id: "1-6-1",
    chapter: "6. 분수와 소수",
    name: "똑같이 나누기",
    available: 26,
  },
  {
    id: "1-6-2",
    chapter: "6. 분수와 소수",
    name: "분수 알아보기(1)",
    available: 21,
  },
  {
    id: "1-6-3",
    chapter: "6. 분수와 소수",
    name: "분수 알아보기(2)",
    available: 28,
  },
  {
    id: "1-6-4",
    chapter: "6. 분수와 소수",
    name: "분모가 같은 분수의 크기 비교",
    available: 25,
  },
  {
    id: "1-6-5",
    chapter: "6. 분수와 소수",
    name: "단위분수의 크기 비교",
    available: 18,
  },
  {
    id: "1-6-6",
    chapter: "6. 분수와 소수",
    name: "소수 알아보기",
    available: 23,
  },
  {
    id: "1-6-7",
    chapter: "6. 분수와 소수",
    name: "소수의 크기 비교",
    available: 22,
  },
] as const;

export type PreviewQuestion = {
  id: string;
  lesson: (typeof LESSONS)[number];
  tier: (typeof TIERS)[number];
  format: (typeof FORMATS)[number];
  a: number;
  b: number;
  subtract: boolean;
  answer: number;
};
export type ListState = "ready" | "loading" | "error";
export type Blocker =
  "ready" | "checking" | "empty" | "permission" | "total" | "format";
export const BLOCKERS: { value: Blocker; label: string }[] = [
  { value: "ready", label: "진행 가능" },
  { value: "checking", label: "확인 중" },
  { value: "empty", label: "0문항" },
  { value: "permission", label: "출력 권한" },
  { value: "total", label: "총수 불일치" },
  { value: "format", label: "형식별 불일치" },
];
export type Variant = {
  id: "H1" | "H2" | "H3" | "H4";
  name: string;
  idea: string;
  weakness: string;
  target: number;
  rows: readonly number[];
  tiers: readonly number[];
  formats: readonly number[];
  blocker: Blocker;
};
export const VARIANTS: readonly Variant[] = [
  {
    id: "H1",
    name: "여백이 있는 작업대",
    idea: "넉넉한 행과 옅은 경계로 구분하고, 막힌 까닭을 맨 아래 다음 행동과 함께 둡니다.",
    weakness: "넉넉한 간격만큼 한 번에 읽는 범위와 문항 수가 줄어듭니다.",
    target: 40,
    rows: [10, 10, 8, 6],
    tiers: [4, 12, 10, 5, 2, 1],
    formats: [18, 12, 4],
    blocker: "total",
  },
  {
    id: "H2",
    name: "촘촘한 목록",
    idea: "얇은 가로선과 짧은 행으로 밀도를 높이고, 왼쪽 순서표 끝에 막힘 안내와 다음 행동을 모읍니다.",
    weakness: "조건과 순서표가 이어져 왼쪽 칸에 읽을 정보가 많습니다.",
    target: 40,
    rows: [10, 10, 10, 10],
    tiers: [0, 8, 18, 10, 4, 0],
    formats: [24, 12, 4],
    blocker: "ready",
  },
  {
    id: "H3",
    name: "숫자와 구획",
    idea: "담은 수와 현재 단계를 선명하게 강조하고, 문항 목록 머리에서 막힌 까닭을 먼저 읽습니다.",
    weakness: "강한 수량 강조가 긴 차시 이름보다 먼저 눈에 들어옵니다.",
    target: 50,
    rows: [13, 13, 12, 12],
    tiers: [0, 10, 22, 14, 4, 0],
    formats: [24, 18, 8],
    blocker: "format",
  },
  {
    id: "H4",
    name: "한 면의 작업지",
    idea: "상자를 줄이고 면과 세로선으로 나누며, 검토 시작 줄에 막힘 안내와 다음 행동을 붙입니다.",
    weakness:
      "면 사이의 경계가 약해 처음에는 조건과 본문을 구별하는 데 시간이 들 수 있습니다.",
    target: 36,
    rows: [9, 9, 9, 9],
    tiers: [0, 8, 16, 10, 2, 0],
    formats: [22, 10, 4],
    blocker: "permission",
  },
];

export function initialConditions(total: number): AppliedConditions {
  return {
    total,
    ladder: emptyLadder(TIERS),
    formats: emptyFormats(),
    recent: true,
    mcFirst: true,
  };
}

export function conditionInputError(values: AppliedConditions): string | null {
  if (
    values.total !== null &&
    (!Number.isSafeInteger(values.total) ||
      values.total < 1 ||
      values.total > 100)
  )
    return "총 문항 수는 1~100의 정수로 입력해 주세요.";
  const numbers = [
    ...Object.values(values.ladder),
    ...Object.values(values.formats),
  ];
  if (
    numbers.some(
      (value) =>
        value !== null &&
        (!Number.isSafeInteger(value) || value < 0 || value > 100),
    )
  )
    return "난이도와 형식별 수는 0~100의 정수로 입력해 주세요. 비우면 지정하지 않습니다.";
  return null;
}

function spread<T>(labels: readonly T[], counts: readonly number[]): T[] {
  const remaining = [...counts];
  const result: T[] = [];
  while (remaining.some((count) => count > 0)) {
    labels.forEach((label, index) => {
      if (remaining[index] > 0) {
        result.push(label);
        remaining[index] -= 1;
      }
    });
  }
  return result;
}

/** 분포와 순서표는 이 실제 배열만 센다. */
export function questionsFor(variant: Variant): PreviewQuestion[] {
  const tiers = spread(TIERS, variant.tiers);
  const formats = spread(FORMATS, variant.formats);
  const result: PreviewQuestion[] = [];
  variant.rows.forEach((count, lessonIndex) => {
    for (let serial = 0; serial < count; serial++) {
      const a = [231 + serial, 368 + serial, 641 + serial, 702 + serial][
        lessonIndex
      ];
      const b = [142, 274, 213, 286][lessonIndex];
      const subtract = lessonIndex > 1;
      result.push({
        id: `${variant.id}-${lessonIndex}-${serial}`,
        lesson: LESSONS[lessonIndex],
        tier: tiers[result.length],
        format: formats[result.length],
        a,
        b,
        subtract,
        answer: subtract ? a - b : a + b,
      });
    }
  });
  return result.sort(
    (a, b) =>
      FORMATS.indexOf(a.format) - FORMATS.indexOf(b.format) ||
      TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier),
  );
}

export function blockerMessage(
  blocker: Blocker,
  questions: readonly PreviewQuestion[],
  target: number,
  formats?: AppliedConditions["formats"],
) {
  const count = questions.length;
  switch (blocker) {
    case "checking":
      return {
        title: "출력할 문항을 확인하는 중입니다.",
        detail: "확인이 끝나면 다음 단계로 이동합니다.",
      };
    case "empty":
      return {
        title: "담은 문항이 없습니다.",
        detail: "범위 설정에서 문항을 구성해 주세요.",
      };
    case "permission":
      return {
        title: "양식 구성·출력 권한이 없습니다.",
        detail: "원장님에게 출력 권한을 요청해 주세요.",
      };
    case "total":
      return {
        title: `총 ${target}문항 지정 · 현재 ${count}문항`,
        detail:
          target > count
            ? `${target - count}문항을 더 담거나 총 문항 수를 바꿔 주세요.`
            : `${count - target}문항을 빼거나 총 문항 수를 바꿔 주세요.`,
      };
    case "format": {
      const mismatches = FORMATS.flatMap((format) => {
        const requested = formats?.[format];
        const actual = questions.filter((q) => q.format === format).length;
        return requested !== undefined &&
          requested !== null &&
          requested !== actual
          ? [`${format} ${requested}문항 지정 · 현재 ${actual}문항`]
          : [];
      });
      return {
        title: mismatches[0] ?? "지정한 형식별 수와 담은 수가 다릅니다.",
        detail: `${mismatches.slice(1).join(" · ")}${mismatches.length > 1 ? ". " : ""}문항을 바꾸거나 형식별 수를 바꿔 주세요.`,
      };
    }
    case "ready":
      return {
        title: "양식 구성·출력으로 이동할 수 있습니다.",
        detail: "담은 문항의 순서가 그대로 이어집니다.",
      };
  }
}

export type ScopeSelection = {
  ids: string[];
  counts: Record<string, number>;
  fixed: Record<string, boolean>;
  source: "all" | "textbook";
};
export type SavedPreview = {
  id: string;
  name: string;
  selection: ScopeSelection;
  total: AppliedConditions["total"];
  ladder: AppliedConditions["ladder"];
  recent: boolean;
};
export function initialSelection(target: number): ScopeSelection {
  return {
    ids: LESSONS.slice(0, 4).map((lesson) => lesson.id),
    counts: Object.fromEntries(
      LESSONS.slice(0, 4).map((lesson, i) => [
        lesson.id,
        Math.floor(target / 4) + (i < target % 4 ? 1 : 0),
      ]),
    ),
    fixed: { [LESSONS[0].id]: true },
    source: "all",
  };
}
export function initialPresets(): SavedPreview[] {
  return [
    {
      id: "saved-1",
      name: "초3 덧셈·뺄셈 확인",
      selection: initialSelection(40),
      ...pickSaved(initialConditions(40)),
    },
    {
      id: "saved-2",
      name: "초3 1학기 마무리",
      selection: { ...initialSelection(50), fixed: {} },
      ...pickSaved(initialConditions(50)),
    },
    {
      id: "saved-3",
      name: "초3 덧셈·뺄셈 보충",
      selection: initialSelection(36),
      ...pickSaved(initialConditions(36)),
    },
  ];
}
/** W5 v1은 형식과 차례를 저장하지 않는다. */
export function pickSaved(values: AppliedConditions) {
  return {
    total: values.total,
    ladder: { ...values.ladder },
    recent: values.recent,
  };
}
