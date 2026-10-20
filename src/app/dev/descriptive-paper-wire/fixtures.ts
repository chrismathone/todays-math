/** Wire-only examples. These are neither bank items nor engine definitions. */
export type PaperKind = "daily" | "review" | "past";
export type OptionId = "A" | "B" | "C" | "D" | "E";
export type Pattern = "lines" | "grid" | "blank";
export type ScorePosition = "number" | "end" | "answer";

export interface Criterion {
  evidence: string;
  points: number;
  partialPoints: readonly number[];
  partial: string;
}

export interface WireProblem {
  number: number;
  kind: "choice" | "short" | "descriptive";
  text: string;
  choices?: readonly string[];
  parts?: readonly string[];
  diagram?: boolean;
  answer: string;
  solution?: string;
  criteria?: readonly Criterion[];
}

export const PAPER_LABELS: Record<PaperKind, string> = {
  daily: "일일",
  review: "확인",
  past: "기출형",
};

export const PATTERN_LABELS: Record<Pattern, string> = {
  lines: "줄",
  grid: "모눈",
  blank: "빈칸",
};

export const SCORE_LABELS: Record<ScorePosition, string> = {
  number: "번호 옆",
  end: "문항 끝",
  answer: "답란 머리",
};

export const PROBLEMS: readonly WireProblem[] = [
  {
    number: 1,
    kind: "choice",
    text: "(−4) + 9의 값은?",
    choices: ["① −13", "② −5", "③ 5", "④ 13"],
    answer: "③",
  },
  {
    number: 2,
    kind: "choice",
    text: "2(x + 3) − x를 간단히 한 식은?",
    choices: ["① x + 3", "② x + 6", "③ 2x + 3", "④ 3x + 6"],
    answer: "②",
  },
  {
    number: 3,
    kind: "short",
    text: "일차방정식 5x − 4 = 21의 해를 구하시오.",
    answer: "5",
  },
  {
    number: 4,
    kind: "short",
    text: "y = −2x + 7에서 x = 3일 때 y의 값을 구하시오.",
    answer: "1",
  },
  {
    number: 5,
    kind: "descriptive",
    text: "공책 3권과 1,200원짜리 펜 1자루를 사서 9,900원을 냈다. 공책 한 권의 가격을 x원이라 할 때 방정식을 세우고 각 항의 뜻을 설명하시오. 방정식을 풀어 가격을 구한 뒤, 구한 가격으로 총액을 확인하시오.",
    answer: "공책 한 권 2,900원",
    solution:
      "3x는 공책 세 권의 값, 1,200은 펜값, 9,900은 총액이므로 3x + 1,200 = 9,900. 3x = 8,700, x = 2,900. 3 × 2,900 + 1,200 = 9,900원.",
    criteria: [
      {
        evidence: "식과 3x·1,200·9,900의 뜻",
        points: 2,
        partialPoints: [1],
        partial: "모두 2 · 식이 맞고 뜻 미완 1 · 그 외 0",
      },
      {
        evidence: "3x = 8,700 → x = 2,900의 과정",
        points: 3,
        partialPoints: [2],
        partial: "과정과 값 3 · 방법만 맞음 2 · 답만 0",
      },
      {
        evidence: "구한 가격을 대입해 9,900원과 비교",
        points: 1,
        partialPoints: [],
        partial: "대입·비교 정확 1 · 그 외 0",
      },
    ],
  },
  {
    number: 6,
    kind: "descriptive",
    text: "직선 y = 2x + b가 점 (1, 5)를 지난다. 다음 물음에 식과 계산 과정을 쓰시오.",
    parts: [
      "⑴ 점의 좌표를 대입하여 b의 값을 구하시오.",
      "⑵ 이 직선 위에서 x = 4인 점의 y좌표를 구하시오.",
      "⑶ 이 직선 위에서 y = 15인 점의 x좌표를 구하시오.",
    ],
    answer: "⑴ 3  ⑵ 11  ⑶ 6",
    solution:
      "⑴ 5 = 2 × 1 + b → b = 3. ⑵ y = 2 × 4 + 3 = 11. ⑶ 15 = 2x + 3 → 2x = 12 → x = 6.",
    criteria: [
      {
        evidence: "⑴ 5 = 2 × 1 + b → b = 3",
        points: 3,
        partialPoints: [2],
        partial: "대입과 값 3 · 대입식만 2 · 답만 0",
      },
      {
        evidence: "⑵ y = 2 × 4 + 3 = 11",
        points: 3,
        partialPoints: [2],
        partial: "대입과 값 3 · 방법만 맞음 2 · 답만 0",
      },
      {
        evidence: "⑶ 15 = 2x + 3 → x = 6",
        points: 2,
        partialPoints: [1],
        partial: "식과 풀이 2 · 식만 1 · 답만 0",
      },
    ],
  },
  {
    number: 7,
    kind: "descriptive",
    text: "그림에서 ∠A = 90°이고 D는 변 AB의 중점이다. 중점의 뜻을 이용해 AD와 DB의 길이를 구하는 과정을 쓰시오. △ACD와 △BCD의 넓이가 같은 이유를 밑변과 높이로 설명하고, △ABC의 넓이를 구하는 식과 답을 쓰시오.",
    diagram: true,
    answer: "AD = DB = 4cm, 넓이의 비 1 : 1, △ABC = 24cm²",
    solution:
      "AD = DB = 8 ÷ 2 = 4cm. 두 삼각형은 같은 직선 AB 위의 밑변 길이가 같고 높이도 6cm로 같으므로 넓이가 같다. △ABC = 8 × 6 ÷ 2 = 24cm².",
    criteria: [
      {
        evidence: "중점에서 AD = DB = 4cm 도출",
        points: 2,
        partialPoints: [1],
        partial: "근거·길이 모두 2 · 하나만 1 · 그 외 0",
      },
      {
        evidence: "같은 밑변 길이와 같은 높이로 등적 설명",
        points: 3,
        partialPoints: [1],
        partial: "밑변·높이 둘 다 3 · 하나만 1 · 그 외 0",
      },
      {
        evidence: "8 × 6 ÷ 2 = 24cm²",
        points: 1,
        partialPoints: [],
        partial: "식과 넓이 1 · 답만 0",
      },
    ],
  },
];

export const DESCRIPTIVE = PROBLEMS.filter((p) => p.kind === "descriptive");
export const scoreOf = (problem: WireProblem) =>
  problem.criteria?.reduce((sum, c) => sum + c.points, 0) ?? 0;
export const TOTAL_SCORE = DESCRIPTIVE.reduce((sum, p) => sum + scoreOf(p), 0);

// A proposed handwriting allowance, not an engine rule or a shipped default.
export const ROW_HEIGHT_MM = 8;
export const ROWS_PER_CRITERION = 2;
export const rowsOf = (problem: WireProblem) =>
  (problem.criteria?.length ?? 0) * ROWS_PER_CRITERION;

export interface WireOption {
  id: OptionId;
  name: string;
  description: string;
  weakness: string;
  pattern: Pattern;
  score: ScorePosition;
  pastChangesRule: boolean;
}

export const OPTIONS: readonly WireOption[] = [
  {
    id: "A",
    name: "문제 바로 아래",
    description: "문제를 읽은 자리에서 바로 쓴다. 기준당 두 줄을 둔다.",
    weakness: "기출형은 서술형이 두 쪽에 흩어지고, 짧은 단에 빈 공간이 남는다.",
    pattern: "lines",
    score: "number",
    pastChangesRule: true,
  },
  {
    id: "B",
    name: "마지막 쪽에 모음",
    description: "앞쪽에서 문제를 읽고, 같은 묶음의 마지막 쪽에 답을 쓴다.",
    weakness: "문제와 답란을 번갈아 찾아야 한다.",
    pattern: "grid",
    score: "end",
    pastChangesRule: false,
  },
  {
    id: "C",
    name: "별도 답안지 한 장",
    description: "문제지는 유지하고 서술형 답안지 한 장을 따로 배부한다.",
    weakness: "일일·확인은 한 쪽이 늘고, 답안지를 따로 관리해야 한다.",
    pattern: "blank",
    score: "answer",
    pastChangesRule: false,
  },
  {
    id: "D",
    name: "서술형만 한 단 폭",
    description: "일반 문항은 두 단, 서술형과 답란은 한 단 폭으로 쓴다.",
    weakness: "일반 문항의 풀이 공간이 줄고, 기출형은 한 쪽이 늘어난다.",
    pattern: "lines",
    score: "answer",
    pastChangesRule: true,
  },
  {
    id: "E",
    name: "소문항별 칸 분할",
    description: "⑴⑵⑶마다 두 줄씩 나누고, 같은 높이의 큰 칸과 비교한다.",
    weakness: "풀이가 길어도 다른 소문항의 빈 공간을 가져다 쓸 수 없다.",
    pattern: "grid",
    score: "number",
    pastChangesRule: false,
  },
];

export interface PageSpec {
  kind: "questions" | "answers";
  layout: "daily" | "compact" | "columns" | "wide" | "answers";
  groups: readonly (readonly number[])[];
  inlineAnswers?: boolean;
  separate?: boolean;
}

const dailyQuestions: PageSpec[] = [[1, 2], [3, 4], [5, 6], [7]].map(
  (numbers) => ({
    kind: "questions",
    layout: "daily",
    groups: [numbers],
  }),
);
const pastQuestions: PageSpec = {
  kind: "questions",
  layout: "columns",
  groups: [
    [1, 2, 3, 4, 5],
    [6, 7],
  ],
};
const answerPage = (separate = false): PageSpec => ({
  kind: "answers",
  layout: "answers",
  groups: [[5, 6, 7]],
  separate,
});

/** Explicit fixture pagination: no product packing estimates, CSS columns or hidden overflow. */
export function pagesFor(
  option: OptionId,
  paper: PaperKind,
): readonly PageSpec[] {
  const past = paper === "past";
  switch (option) {
    case "A":
      return past
        ? [
            {
              kind: "questions",
              layout: "columns",
              groups: [[1, 2, 3, 4], [5]],
              inlineAnswers: true,
            },
            {
              kind: "questions",
              layout: "columns",
              groups: [[6], [7]],
              inlineAnswers: true,
            },
          ]
        : dailyQuestions.map((p) => ({ ...p, inlineAnswers: true }));
    case "B":
      return past
        ? [pastQuestions, answerPage()]
        : [
            ...dailyQuestions.slice(0, 2),
            { kind: "questions", layout: "compact", groups: [[5, 6, 7]] },
            answerPage(),
          ];
    case "C":
      return [...(past ? [pastQuestions] : dailyQuestions), answerPage(true)];
    case "D":
      return [
        {
          kind: "questions",
          layout: "columns",
          groups: [
            [1, 2],
            [3, 4],
          ],
        },
        {
          kind: "questions",
          layout: "wide",
          groups: [[5, 6]],
          inlineAnswers: true,
        },
        {
          kind: "questions",
          layout: "wide",
          groups: [[7]],
          inlineAnswers: true,
        },
      ];
    case "E":
      return past
        ? [pastQuestions, answerPage(true)]
        : dailyQuestions.map((p) => ({ ...p, inlineAnswers: true }));
  }
}

export function pageCounts(option: OptionId, paper: PaperKind) {
  const pages = pagesFor(option, paper);
  const questions = pages.filter((p) => p.kind === "questions").length;
  const answers = pages.length - questions;
  // Current daily/review: two items per Jaseup sheet. Past: question sheet + proposed answer sheet.
  const baseline = paper === "past" ? 2 : 4;
  return {
    questions,
    answers,
    total: pages.length,
    delta: pages.length - baseline,
  };
}
