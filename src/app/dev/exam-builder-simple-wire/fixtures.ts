/**
 * 차시 이름: src/lib/concept-blank/bank/e3-plus.ts의 실제 차시.
 * 출처 수: 지시서의 2026-10-18 관측값. 현재 조건의 출제 가능 수가 아니다.
 * 그 밖의 수·문항·책 선택·상태는 직접 만든 독립 픽스처다. DB/API를 읽지 않는다.
 */
export const SOURCE_COUNTS = [
  { label: "엔진", count: 53_514 },
  { label: "교과서", count: 12_301 },
  { label: "기출", count: 101 },
  { label: "그 밖", count: 4_452 },
] as const;

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
] as const;

export type VariantId = "A" | "B" | "C" | "D";
export type WireQuestion = {
  id: string;
  lesson: (typeof LESSONS)[number];
  tier: (typeof TIERS)[number];
  format: (typeof FORMATS)[number];
  body: string;
  answer: number;
};

export type Scenario = {
  id: VariantId;
  title: string;
  idea: string;
  weakness: string;
  sourceIdea: string;
  sourceBenefit: string;
  sourceCost: string;
  changes: string;
  target: number;
  requestedRows: number[];
  currentRows: number[];
  tierCounts: number[];
  formatCounts: number[];
  requestedFormats?: number[];
  canOutput: boolean;
};

export const SCENARIOS: readonly Scenario[] = [
  {
    id: "A",
    title: "범위는 넓게, 조건은 오른쪽에",
    idea: "왼쪽에서 단원을 체크하고 오른쪽의 짧은 조건 칸에서 문항 수와 다음 행동을 확인합니다.",
    weakness:
      "범위별 수와 고정을 자주 바꾸는 작업은 구성표를 한 번 더 펼쳐야 합니다.",
    sourceIdea:
      "출처는 ‘전체 출처 / 교과서만’ 한 줄, 책·자료 종류는 교과서에서만 펼칩니다.",
    sourceBenefit:
      "교과서 12,301문항만 책 선택이 필요하므로 다섯 출처 탭 대신 두 선택으로 줄입니다.",
    sourceCost:
      "엔진 53,514 · 기출 101 · 그 밖 4,452는 전체에 포함되며, 각각만 고르는 조작은 추가 조건에 남겨야 합니다.",
    changes:
      "범위·구성표 두 칸(H1)을 넓은 범위+짧은 조건 칸으로 바꿉니다. 총 문항·단계·형식을 창 밖에 꺼냅니다. 출처 다섯 탭(D-161)은 두 선택과 추가 조건으로 나눕니다.",
    target: 40,
    requestedRows: [10, 10, 10, 10],
    currentRows: [10, 10, 8, 6],
    tierCounts: [4, 12, 10, 5, 2, 1],
    formatCounts: [18, 12, 4],
    canOutput: true,
  },
  {
    id: "B",
    title: "범위와 구성표를 바로 연결",
    idea: "왼쪽 범위에 체크하면 오른쪽 구성표에 바로 담기고, 조건은 기존 한 줄 요약에서 엽니다.",
    weakness:
      "두 칸을 함께 읽어야 하므로 처음 만드는 교사에게는 A보다 항목이 많습니다.",
    sourceIdea:
      "별도 출처 창을 없애고 범위 칸 안에 출처 선택과 교과서의 책·자료 종류를 둡니다.",
    sourceBenefit:
      "12,301 교과서 문항은 학년·책·차시를 한 자리에서 좁히고, 53,514 엔진 문항도 직접 고를 수 있습니다.",
    sourceCost:
      "기출 101 · 그 밖 4,452까지 모두 남겨 범위 칸이 길어집니다. 교과서 세부만 접어 높이를 줄여야 합니다.",
    changes:
      "출처의 별도 적용·취소 창(D-161)을 범위 안의 즉시 반영 필터로 바꿉니다. 2단계의 조건 칸을 접힌 한 줄로 줄입니다.",
    target: 40,
    requestedRows: [10, 10, 10, 10],
    currentRows: [10, 10, 10, 10],
    tierCounts: [0, 8, 18, 10, 4, 0],
    formatCounts: [24, 12, 4],
    canOutput: true,
  },
  {
    id: "C",
    title: "위에서 아래로, 한 줄씩",
    idea: "학년·범위·조건을 한 열로 읽고, 검토에서는 위의 번호표와 아래의 문항을 이어 봅니다.",
    weakness:
      "범위와 문항이 길어질수록 화면을 위아래로 오가는 거리가 늘어납니다.",
    sourceIdea:
      "전체 출처로 바로 시작하고, 필요한 사람만 ‘출처 제한’에서 책이나 다른 출처를 고릅니다.",
    sourceBenefit:
      "엔진 53,514문항을 포함한 전체로 시작하므로 교과서가 필요 없는 작업에 출처 선택을 요구하지 않습니다.",
    sourceCost:
      "교과서 12,301 · 기출 101 · 그 밖 4,452를 한정하려면 한 번 펼쳐야 하며, 현재 ‘전체 출처’를 계속 보여야 합니다.",
    changes:
      "범위·구성표 두 칸(H1)을 한 열로 쌓습니다. 출처 창(D-161)은 선택적 펼침으로 바꾸고, 검토 번호표를 문항 위로 옮깁니다.",
    target: 50,
    requestedRows: [13, 13, 12, 12],
    currentRows: [13, 13, 12, 12],
    tierCounts: [0, 10, 22, 14, 4, 0],
    formatCounts: [24, 18, 8],
    requestedFormats: [24, 20, 6],
    canOutput: true,
  },
  {
    id: "D",
    title: "고른 범위를 작업의 중심에",
    idea: "좁은 범위 탐색 옆에 고른 차시를 넓게 놓고, 검토도 같은 차시 묶음 순서로 이어집니다.",
    weakness:
      "아직 범위를 고르지 않은 첫 화면에서는 넓은 구성 영역이 비어 보일 수 있습니다.",
    sourceIdea:
      "‘범위로 시작 / 교과서로 시작’으로 나누고, 교과서 경로에서만 책 고르기 창을 엽니다.",
    sourceBenefit:
      "교과서 12,301문항의 책·자료 선택에 창을 집중하고, 53,514 엔진 문항은 범위 경로에서 바로 찾습니다.",
    sourceCost:
      "기출 101 · 그 밖 4,452는 범위 경로의 추가 출처에 남습니다. 두 시작 방식의 차이를 먼저 이해해야 합니다.",
    changes:
      "범위·구성표 두 칸(H1)의 넓이 비중을 뒤집고, 출처 다섯 탭 창(D-161)을 두 진입과 교과서 전용 창으로 바꿉니다.",
    target: 36,
    requestedRows: [9, 9, 9, 9],
    currentRows: [9, 9, 9, 9],
    tierCounts: [0, 8, 16, 10, 2, 0],
    formatCounts: [22, 10, 4],
    canOutput: false,
  },
];

/** 수량·형식·난이도 표시가 같은 픽스처를 세도록 실제 34~50개 배열을 만든다. */
export function questionsFor(scenario: Scenario): WireQuestion[] {
  const tiers = scenario.tierCounts.flatMap(
    (count, index) => Array(count).fill(TIERS[index]) as WireQuestion["tier"][],
  );
  const formats = scenario.formatCounts.flatMap(
    (count, index) =>
      Array(count).fill(FORMATS[index]) as WireQuestion["format"][],
  );
  const result: WireQuestion[] = [];
  scenario.currentRows.forEach((count, scopeIndex) => {
    for (let serial = 0; serial < count; serial++) {
      const [a, b] =
        scopeIndex === 0
          ? [231 + serial, 142 + serial]
          : scopeIndex === 1
            ? [168 + (serial % 6) * 100, 274 + Math.floor(serial / 6) * 100]
            : scopeIndex === 2
              ? [641 + serial, 213 + (serial % 5)]
              : [700 + Math.floor(serial / 5) * 100 + (serial % 5), 286];
      const subtraction = scopeIndex > 1;
      result.push({
        id: `${scenario.id}-${scopeIndex}-${serial}`,
        lesson: LESSONS[scopeIndex],
        tier: tiers[result.length],
        format: formats[result.length],
        body: `${a} ${subtraction ? "−" : "+"} ${b}를 계산하시오.`,
        answer: subtraction ? a - b : a + b,
      });
    }
  });
  return result;
}

export function outputReasons(
  scenario: Scenario,
  questions: WireQuestion[],
): string[] {
  const reasons: string[] = [];
  if (!questions.length)
    reasons.push("담은 문항이 없습니다. 범위 설정에서 문항을 구성해 주세요.");
  if (questions.length !== scenario.target)
    reasons.push(
      `총 ${scenario.target}문항 지정 · 현재 ${questions.length}문항. ${scenario.target - questions.length}문항이 모자랍니다.`,
    );
  scenario.requestedFormats?.forEach((count, index) => {
    const actual = questions.filter((q) => q.format === FORMATS[index]).length;
    if (actual !== count)
      reasons.push(`${FORMATS[index]} ${count}문항 지정 · 현재 ${actual}문항.`);
  });
  if (!scenario.canOutput)
    reasons.push(
      "양식 구성·출력 권한이 없습니다. 원장님에게 출력 권한을 요청해 주세요.",
    );
  return reasons;
}
