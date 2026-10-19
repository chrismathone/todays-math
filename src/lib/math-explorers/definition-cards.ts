import type {
  DefinitionAction as Action,
  DefinitionFeedback as Feedback,
  ExplorerProfile as Profile,
} from "./types";
import {
  courseCards,
  courseUnits,
  type CourseCard,
  type CourseUnit,
} from "./definition-content";
import { orderFreeCards } from "./conceptOrderFree";
import { applyCardFix, cardRevisions } from "./conceptSentenceFixes";

const legacyUnits: CourseUnit[] = [
  {
    id: "factors",
    grade: 7,
    title: "소인수분해",
    symbol: "2 × 3",
    subtitle: "수를 이루는 작은 조각",
    color: "blue",
  },
  {
    id: "numbers",
    grade: 7,
    title: "정수와 유리수",
    symbol: "−3 · 0 · ½",
    subtitle: "수의 종류와 거리",
    color: "mint",
  },
  {
    id: "expressions",
    grade: 7,
    title: "문자와 식",
    symbol: "3x + 2",
    subtitle: "식의 언어 읽기",
    color: "purple",
  },
];
export type DefinitionCard = CourseCard;
const legacyCards: DefinitionCard[] = [
  {
    id: "prime",
    unit: "factors",
    name: "소수",
    definition: "1보다 큰 자연수 중에서 약수가 1과 자기 자신뿐인 수.",
    pieces: ["", " 중에서 약수가 ", "뿐인 수."],
    words: ["1보다 큰 자연수", "1과 자기 자신", "모든 자연수", "1"],
    exampleTitle: "소수를 모두 골라봐.",
    examples: [
      { text: "1", yes: false },
      { text: "2", yes: true },
      { text: "7", yes: true },
      { text: "9", yes: false },
    ],
    trap: "1은 약수가 1뿐이므로 소수이다.",
    truth: false,
    explanation:
      "소수는 1보다 큰 자연수이고, 약수가 정확히 2개야. 1의 약수는 1개이므로 소수가 아니야.",
    note: "여기서 소수는 prime number야. 0.3 같은 소수와는 뜻이 달라.",
  },
  {
    id: "composite",
    unit: "factors",
    name: "합성수",
    definition: "1보다 큰 자연수 중에서 소수가 아닌 수.",
    pieces: ["", " 중에서 ", " 수."],
    words: ["1보다 큰 자연수", "소수가 아닌", "0보다 큰 수", "짝수인"],
    exampleTitle: "합성수를 모두 골라봐.",
    examples: [
      { text: "1", yes: false },
      { text: "4", yes: true },
      { text: "9", yes: true },
      { text: "11", yes: false },
    ],
    trap: "소수가 아닌 자연수는 모두 합성수이다.",
    truth: false,
    explanation: "1은 소수도 합성수도 아니야. 합성수도 반드시 1보다 커야 해.",
    note: "합성수에는 1과 자기 자신 이외의 약수가 있어.",
  },
  {
    id: "prime-factor",
    unit: "factors",
    name: "소인수",
    definition: "어떤 자연수의 약수 중에서 소수인 수.",
    pieces: ["어떤 자연수의 ", " 중에서 ", " 수."],
    words: ["약수", "소수인", "배수", "짝수인"],
    exampleTitle: "12의 소인수를 모두 골라봐.",
    examples: [
      { text: "2", yes: true },
      { text: "3", yes: true },
      { text: "4", yes: false },
      { text: "6", yes: false },
    ],
    trap: "6은 12의 약수이므로 12의 소인수이다.",
    truth: false,
    explanation:
      "소인수는 약수이면서 소수여야 해. 6은 합성수라서 소인수가 아니야.",
    note: "12 = 2 × 2 × 3. 소인수의 종류는 2와 3이야.",
  },
  {
    id: "factorization",
    unit: "factors",
    name: "소인수분해",
    definition: "1보다 큰 자연수를 소수들만의 곱으로 나타내는 것.",
    pieces: ["1보다 큰 자연수를 ", "만의 ", "으로 나타내는 것."],
    words: ["소수들", "곱", "합성수들", "합"],
    exampleTitle: "소인수분해가 끝난 식을 모두 골라봐.",
    examples: [
      { text: "12 = 2 × 2 × 3", yes: true },
      { text: "18 = 2 × 3 × 3", yes: true },
      { text: "12 = 3 × 4", yes: false },
      { text: "18 = 2 × 9", yes: false },
    ],
    trap: "12 = 3 × 4는 소인수분해가 끝난 식이다.",
    truth: false,
    explanation:
      "4는 소수가 아니야. 4를 2 × 2로 더 나누어야 소인수분해가 끝나.",
    note: "곱으로 나타낸 모든 인수가 소수인지 확인해.",
  },
  {
    id: "coprime",
    unit: "factors",
    name: "서로소",
    definition: "공약수가 1뿐인 두 자연수의 관계.",
    pieces: ["", "가 ", "뿐인 두 자연수의 관계."],
    words: ["공약수", "1", "공배수", "2"],
    exampleTitle: "서로소인 두 수를 모두 골라봐.",
    examples: [
      { text: "8과 9", yes: true },
      { text: "4와 9", yes: true },
      { text: "6과 9", yes: false },
      { text: "2와 8", yes: false },
    ],
    trap: "서로소인 두 수는 각각 소수여야 한다.",
    truth: false,
    explanation: "8과 9는 둘 다 합성수지만, 공약수가 1뿐이어서 서로소야.",
    note: "소수는 한 수의 성질, 서로소는 두 수의 관계야.",
  },
  {
    id: "positive",
    unit: "numbers",
    name: "양수",
    definition: "0보다 큰 수.",
    pieces: ["", "보다 ", " 수."],
    words: ["0", "큰", "1", "작은"],
    exampleTitle: "양수를 모두 골라봐.",
    examples: [
      { text: "+3", yes: true },
      { text: "1/2", yes: true },
      { text: "0", yes: false },
      { text: "−2", yes: false },
    ],
    trap: "0은 양수이다.",
    truth: false,
    explanation: "양수는 0보다 커야 해. 0은 양수도 음수도 아니야.",
    note: "양수의 + 부호는 생략할 수 있어. +3과 3은 같은 수야.",
  },
  {
    id: "negative",
    unit: "numbers",
    name: "음수",
    definition: "0보다 작은 수.",
    pieces: ["", "보다 ", " 수."],
    words: ["0", "작은", "1", "큰"],
    exampleTitle: "음수를 모두 골라봐.",
    examples: [
      { text: "−4", yes: true },
      { text: "−1/2", yes: true },
      { text: "0", yes: false },
      { text: "1/2", yes: false },
    ],
    trap: "−1/2은 정수가 아니므로 음수도 아니다.",
    truth: false,
    explanation:
      "음수인지 볼 때는 0보다 작은지만 확인해. −1/2도 0보다 작으므로 음수야.",
    note: "음수에는 음의 정수뿐 아니라 −0.5 같은 수도 있어.",
  },
  {
    id: "integer",
    unit: "numbers",
    name: "정수",
    definition: "양의 정수, 0, 음의 정수를 통틀어 이르는 수.",
    pieces: ["양의 정수, ", ", ", "를 통틀어 이르는 수."],
    words: ["0", "음의 정수", "1/2", "모든 음수"],
    exampleTitle: "정수를 모두 골라봐.",
    examples: [
      { text: "−3", yes: true },
      { text: "0", yes: true },
      { text: "2", yes: true },
      { text: "1/2", yes: false },
    ],
    trap: "0은 정수이다.",
    truth: true,
    explanation: "정수에는 …, −2, −1, 0, 1, 2, …가 모두 포함돼. 0도 정수야.",
    note: "양의 정수는 1, 2, 3, …이고 음의 정수는 −1, −2, −3, …이야.",
  },
  {
    id: "rational",
    unit: "numbers",
    name: "유리수",
    definition: "정수 a, b에 대하여 a/b 꼴로 나타낼 수 있는 수. 단, b ≠ 0.",
    pieces: ["", " a, b에 대하여 a/b 꼴로 나타낼 수 있는 수. 단, ", "."],
    words: ["정수", "b ≠ 0", "자연수", "b = 0"],
    exampleTitle: "유리수를 나타내는 것을 모두 골라봐.",
    examples: [
      { text: "−3/2", yes: true },
      { text: "0", yes: true },
      { text: "4", yes: true },
      { text: "1/0", yes: false },
    ],
    trap: "모든 정수는 유리수이다.",
    truth: true,
    explanation:
      "정수 n은 n/1로 나타낼 수 있어. 0도 0/1로 나타낼 수 있는 유리수야. 1/0은 정의되지 않아.",
    note: "분자와 분모는 정수, 분모는 0이 아니어야 해.",
  },
  {
    id: "absolute",
    unit: "numbers",
    name: "절댓값",
    definition: "수직선에서 어떤 수를 나타내는 점과 원점 사이의 거리.",
    pieces: ["수직선에서 어떤 수를 나타내는 점과 ", " 사이의 ", "."],
    words: ["원점", "거리", "1을 나타내는 점", "방향"],
    exampleTitle: "절댓값이 3인 수를 모두 골라봐.",
    examples: [
      { text: "−3", yes: true },
      { text: "+3", yes: true },
      { text: "0", yes: false },
      { text: "−1/3", yes: false },
    ],
    trap: "−3의 절댓값은 −3이다.",
    truth: false,
    explanation:
      "−3을 나타내는 점에서 원점까지의 거리는 3이야. 거리는 음수가 될 수 없어.",
    note: "원점은 수직선에서 0을 나타내는 점이야. 0의 절댓값은 0이야.",
  },
  {
    id: "term",
    unit: "expressions",
    name: "항",
    definition: "수 또는 문자의 곱으로 이루어진 식.",
    pieces: ["수 또는 문자의 ", "으로 이루어진 ", "."],
    words: ["곱", "식", "합", "등식"],
    exampleTitle: "3x − 2 + y의 항을 모두 골라봐.",
    examples: [
      { text: "3x", yes: true },
      { text: "−2", yes: true },
      { text: "y", yes: true },
      { text: "3x − 2", yes: false },
    ],
    trap: "3x − 2에서 −2도 하나의 항이다.",
    truth: true,
    explanation:
      "3x − 2를 3x + (−2)로 생각하면 항은 3x와 −2야. 부호까지 함께 봐.",
    note: "수 하나나 문자 하나도 항이 될 수 있어.",
  },
  {
    id: "constant",
    unit: "expressions",
    name: "상수항",
    definition: "문자를 포함하지 않고 수만으로 이루어진 항.",
    pieces: ["", "를 포함하지 않고 ", "만으로 이루어진 항."],
    words: ["문자", "수", "부호", "문자와 수"],
    exampleTitle: "각 식에서 상수항을 바르게 찾은 것을 골라봐.",
    examples: [
      { text: "3x − 5 → −5", yes: true },
      { text: "y + 2 → 2", yes: true },
      { text: "3x − 5 → 5", yes: false },
      { text: "2x + 1 → 2", yes: false },
    ],
    trap: "3x − 5의 상수항은 5이다.",
    truth: false,
    explanation:
      "3x − 5의 항은 3x와 −5야. 문자가 없는 항은 부호를 포함한 −5야.",
    note: "문자 앞의 수인 계수와 문자가 없는 상수항을 구분해.",
  },
  {
    id: "coefficient",
    unit: "expressions",
    name: "계수",
    definition: "수와 문자의 곱으로 이루어진 항에서 문자에 곱해진 수.",
    pieces: ["수와 문자의 곱으로 이루어진 항에서 ", "에 곱해진 ", "."],
    words: ["문자", "수", "지수", "항"],
    exampleTitle: "계수를 바르게 찾은 것을 모두 골라봐.",
    examples: [
      { text: "−3x → −3", yes: true },
      { text: "x → 1", yes: true },
      { text: "−x → 1", yes: false },
      { text: "3x + 2의 x의 계수 → 2", yes: false },
    ],
    trap: "−x의 계수는 −1이다.",
    truth: true,
    explanation: "−x는 (−1) × x를 줄여 쓴 식이야. 따라서 계수는 −1이야.",
    note: "−3x의 계수는 −3. 부호를 빠뜨리지 마.",
  },
  {
    id: "like-terms",
    unit: "expressions",
    name: "동류항",
    definition: "문자와 차수가 각각 같은 항.",
    pieces: ["", "와 ", "가 각각 같은 항."],
    words: ["문자", "차수", "계수", "부호"],
    exampleTitle: "서로 동류항인 항의 쌍을 모두 골라봐.",
    examples: [
      { text: "2x와 −3x", yes: true },
      { text: "x²과 4x²", yes: true },
      { text: "2x와 2x²", yes: false },
      { text: "3x와 3y", yes: false },
    ],
    trap: "2x와 2x²은 동류항이다.",
    truth: false,
    explanation:
      "문자는 x로 같지만 차수가 각각 1과 2로 달라. 문자와 차수가 모두 같아야 해.",
    note: "이 과정에서 차수는 한 항에 문자가 곱해진 개수야. x²은 x × x이므로 차수가 2야.",
  },
  {
    id: "linear",
    unit: "expressions",
    name: "일차식",
    definition: "동류항끼리 정리하였을 때 차수가 1인 다항식.",
    pieces: ["동류항끼리 정리하였을 때 ", "가 ", "인 다항식."],
    words: ["차수", "1", "계수", "2"],
    exampleTitle: "일차식을 모두 골라봐.",
    examples: [
      { text: "3x + 2", yes: true },
      { text: "−x", yes: true },
      { text: "x² + 1", yes: false },
      { text: "x − x + 2", yes: false },
    ],
    trap: "x − x + 2는 일차식이다.",
    truth: false,
    explanation:
      "동류항끼리 정리하면 2만 남아. 문자항이 없어지므로 일차식이 아니야.",
    note: "다항식은 하나 이상의 항의 합으로 이루어진 식이야. 다항식의 차수는 각 항의 차수 중 가장 큰 것이야.",
  },
];
const legacyPrerequisites: Record<string, string[]> = {
  prime: ["g5-divisor"],
  composite: ["prime"],
  "prime-factor": ["prime", "g5-divisor"],
  factorization: ["prime", "prime-factor"],
  coprime: ["g5-gcd"],
  positive: [],
  negative: ["positive"],
  integer: ["positive", "negative"],
  rational: ["integer", "g3-fraction"],
  absolute: ["positive", "negative"],
  term: ["g5-rule-expression"],
  constant: ["term"],
  coefficient: ["term", "negative"],
  "like-terms": ["term", "coefficient"],
  linear: ["like-terms"],
};
export const definitionUnits: CourseUnit[] = [
  ...legacyUnits,
  ...courseUnits,
].sort((a, b) => a.grade - b.grade);
// 보정 전 원본 카드 — 🔴 앱 코드는 읽지 않는다(시험이 막는다). 교재 원문 누출 검사 · 보정 표 생성기의 카드 덤프만 읽는다:
// 검사기는 카드 글을 «우리 글»로 허용하므로, 보정을 입은 카드를 덤프하면 보정 문장이 검사를 비껴간다(리드 검토 ④).
export const definitionSourceCards: DefinitionCard[] = definitionUnits.flatMap(
  (u) =>
    [
      ...legacyCards.map((c) => ({
        ...c,
        prerequisites: legacyPrerequisites[c.id] ?? [],
      })),
      ...courseCards,
    ].filter((c) => c.unit === u.id),
);
// 카드를 내보내는 층 — 보정 표(D-143 ⑦, `conceptSentenceFixes.ts`)를 여기서 한 번 입힌다. 채점 · 화면 · 복습 · 선수가
// 모두 이 목록을 읽으므로 같은 카드를 본다. 원본(`definition-content.ts`)은 그대로.
export const definitionCards: DefinitionCard[] =
  definitionSourceCards.map(applyCardFix);
export const courseGrades = [3, 4, 5, 6, 7, 8, 9];
export const gradeLabel = (grade: number) =>
  grade < 7 ? `초${grade}` : `중${grade - 6}`;
export const cardGrade = (card: DefinitionCard) =>
  definitionUnits.find((u) => u.id === card.unit)!.grade;
export function definitionCourseGrade(p: Profile) {
  const r = p.definitions;
  return (
    r?.courseGrade ??
    definitionUnits.find((u) => u.id === r?.session?.unit)?.grade ??
    definitionUnits.find((u) => u.id === r?.goalUnitId)?.grade ??
    (r && Object.keys(r.cards).length ? 7 : p.grade)
  );
}
export const reviewIntervals = [1, 3, 7, 14, 30] as const;
export function reviewStep(progress: DefinitionProgress) {
  return Math.max(0, Math.min(4, progress.reviewStep ?? progress.level - 1));
}
export function definitionSessionCards(s: DefinitionSession) {
  return s.cardIds
    ? s.cardIds.map(definitionCard)
    : definitionCards.filter((c) => c.unit === s.unit);
}
export function definitionSessionTitle(s: DefinitionSession) {
  return s.route === "memory"
    ? "기억 퀘스트"
    : s.route === "repair"
      ? `${definitionCard(s.targetCardId!).name} 회복 퀘스트`
      : definitionUnits.find((u) => u.id === s.unit)?.title;
}
export function definitionWeak(p: Profile) {
  return definitionCards
    .filter((c) => {
      const v = p.definitions?.cards[c.id];
      return (
        v &&
        (v.missed > 0 ||
          v.lastRecall === "retry" ||
          v.lastRecall === "supported")
      );
    })
    .sort((a, b) =>
      p.definitions!.cards[b.id].attemptedAt.localeCompare(
        p.definitions!.cards[a.id].attemptedAt,
      ),
    );
}
// Only recent performance is observed. Prerequisite links are authored recommendations, not diagnoses.
export function definitionRepairCards(p: Profile, targetId: string) {
  const target = definitionCard(targetId),
    chosen: DefinitionCard[] = [],
    visited = new Set<string>([target.id]);
  const priority = (c: DefinitionCard) => {
    const v = p.definitions?.cards[c.id];
    return v &&
      (v.missed > 0 || v.lastRecall === "retry" || v.lastRecall === "supported")
      ? -1
      : (v?.level ?? 0);
  };
  const parents = (c: DefinitionCard) =>
    (c.prerequisites ?? [])
      .map(definitionCard)
      .sort((a, b) => priority(a) - priority(b));
  const queue = parents(target);
  // Reserve the direct prerequisites first; a deep branch must not crowd out another direct link.
  while (queue.length && chosen.length < 4) {
    const c = queue.shift()!;
    if (visited.has(c.id)) continue;
    visited.add(c.id);
    chosen.push(c);
    queue.push(...parents(c));
  }
  const selected = new Set(chosen.map((c) => c.id)),
    ordered: DefinitionCard[] = [],
    seen = new Set<string>();
  const order = (c: DefinitionCard) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    for (const id of c.prerequisites ?? [])
      if (selected.has(id)) order(definitionCard(id));
    ordered.push(c);
  };
  chosen.forEach(order);
  ordered.push(target);
  for (const c of definitionCards.filter((c) => c.unit === target.unit))
    if (ordered.length < 5 && !ordered.some((x) => x.id === c.id))
      ordered.push(c);
  return ordered;
}
export function definitionMemoryCards(p: Profile, date: string) {
  const due = definitionDue(p, date),
    seen = new Set(due.map((c) => c.id));
  const learned = definitionCards
    .filter((c) => !seen.has(c.id) && p.definitions?.cards[c.id])
    .sort((a, b) =>
      p.definitions!.cards[a.id].due.localeCompare(
        p.definitions!.cards[b.id].due,
      ),
    );
  const fresh = definitionCards
    .filter((c) => !p.definitions?.cards[c.id])
    .sort(
      (a, b) =>
        Number(cardGrade(b) === definitionCourseGrade(p)) -
        Number(cardGrade(a) === definitionCourseGrade(p)),
    );
  return [...due, ...learned, ...fresh].slice(0, 5);
}
export type DefinitionTask = { cardId: string; kind: 0 | 1 | 2 };
export type DefinitionProgress = {
  level: number;
  due: string;
  lastDate: string;
  attemptedAt: string;
  missed: number;
  reviewStep?: number;
  reviewedAt?: string;
  lastRecall?: "new" | "remembered" | "supported" | "retry";
};
export type DefinitionSession = {
  route?: "unit" | "memory" | "repair";
  targetCardId?: string;
  cardIds?: string[];
  id: string;
  unit: string;
  date: string;
  queue: DefinitionTask[];
  index: number;
  round: number;
  continuation?: number;
  continuationCardIds?: string[];
  next: DefinitionTask[];
  seen: string[];
  hinted: string[];
  passed: string[];
  initialWrong: string[];
  first: number;
  done: boolean;
  stars: number;
  unresolved: DefinitionTask[];
  eligible: string[];
  reviewOnly?: boolean;
  /** «한 번 더 → 풀이» on the current question (plan §3.2 ②). */
  followUp?: {
    questionId: string;
    state: "again" | "solution";
    firstChoiceIds: number[];
  };
  /** Activities (`cardId:kind`) whose solution was shown — not asked again today. */
  shown?: string[];
};
export type DefinitionRecord = {
  courseGrade?: number;
  claimedChests?: string[];
  goalUnitId?: string;
  runs: number;
  cards: Record<string, DefinitionProgress>;
  session?: DefinitionSession;
  history: {
    sessionId?: string;
    route?: "unit" | "memory" | "repair";
    targetCardId?: string;
    date: string;
    unit: string;
    first: number;
    unresolved: number;
    stars: number;
  }[];
};
export const definitionLevels = [
  "새 카드",
  "수집 완료",
  "기억 성공",
  "단단한 기억",
];
export function definitionCard(id: string) {
  const c = definitionCards.find((c) => c.id === id);
  if (!c) throw new Error("개념 카드를 찾을 수 없어요.");
  return c;
}
export function definitionTaskKey(t: DefinitionTask) {
  return `${t.cardId}:${t.kind}`;
}
export function definitionQuestionId(s: DefinitionSession) {
  const continuation = s.continuation ? `:retry-${s.continuation}` : "";
  return `${s.id}${continuation}:${s.round}:${s.index}`;
}
/**
 * 문장 조립 채점 — 자리 그대로(첫 칸 = 정답 첫 조각, 둘째 칸 = 정답 둘째 조각). 다만 두 빈칸이 본디 대등한 카드(`orderFreeCards`)는
 * 두 정답 조각을 맞바꿔 넣어도 맞다(3자 합의 2026-09-28) — 맞바꿔도 뜻이 같은 문장을 만든 학생을 틀림 처리하지 않게.
 */
export function definitionAssemblyCorrect(
  c: DefinitionCard,
  values: readonly number[],
) {
  const [first, second] = values.map((v) => c.words[v]);
  if (first === c.words[0] && second === c.words[1]) return true;
  return (
    orderFreeCards.has(c.id) && first === c.words[1] && second === c.words[0]
  );
}
/**
 * 기억 복습에서 읽는 만기 — 저장된 만기, 다만 뜻을 고친 카드(`cardRevisions`)를 그 판 **전에** 마지막으로 풀었으면 판 날이
 * 더 이르면 판 날(원장님 확정 2026-09-28, D-143 ⑦). 공유 DB 에 쓰지 않는 읽기 규칙이다 — 저장된 만기 · 레벨 · 별은 그대로이고,
 * 레벨이 오르는 «제때 복습»(`eligible`)은 저장된 만기로만 가리므로 앞당긴 복습을 맞혀도 별 · 레벨 · 저장된 차례가 그대로다.
 * 🔴 틀리면 여느 복습처럼 엔진 규칙대로 차례가 처음(다음 날)으로 돌아간다(레벨 · 별은 그대로 — 리드 검토 ⑥).
 * 한 번 풀면 `attemptedAt`(세션을 시작한 날)이 판 뒤가 되어 저장된 만기로 돌아간다.
 */
export function definitionEffectiveDue(
  cardId: string,
  progress: DefinitionProgress,
) {
  const revised = Object.hasOwn(cardRevisions, cardId)
    ? cardRevisions[cardId]
    : undefined;
  const seen = progress.attemptedAt || progress.lastDate || "";
  return revised && seen < revised && revised < progress.due
    ? revised
    : progress.due;
}
export function definitionDue(p: Profile, date: string) {
  const due = (c: DefinitionCard) =>
    definitionEffectiveDue(c.id, p.definitions!.cards[c.id]);
  return definitionCards
    .filter((c) => !!p.definitions?.cards[c.id] && due(c) <= date)
    .sort((a, b) => due(a).localeCompare(due(b)));
}
function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function definitionNeedsRead(p: Profile, s: DefinitionSession) {
  const t = s.queue[s.index];
  return (
    !!t &&
    !s.continuation &&
    s.round === 0 &&
    t.kind === 0 &&
    !p.definitions?.cards[t.cardId]?.level &&
    !s.seen.includes(t.cardId)
  );
}
export function definitionOptions(s: DefinitionSession, t: DefinitionTask) {
  const c = definitionCard(t.cardId),
    n = t.kind === 0 ? c.words.length : t.kind === 1 ? c.examples.length : 2;
  const a = Array.from({ length: n }, (_, i) => i);
  let seed = 0;
  for (const ch of `${s.id}:${t.cardId}:${t.kind}:${s.round}${s.continuation ? `:retry-${s.continuation}` : ""}`)
    seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  for (let i = n - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Chests reward completed concepts, never just reaching a question index.
export function definitionChests(p: Profile) {
  const record = p.definitions,
    s = record?.session;
  return definitionUnits.flatMap((unit) =>
    [2, 4].map((after) => {
      const required = definitionCards
        .filter((c) => c.unit === unit.id)
        .slice(0, after);
      const solved = required.filter(
        (c) =>
          !!record?.cards[c.id]?.level ||
          [0, 1, 2].every((k) => s?.passed.includes(`${c.id}:${k}`)),
      ).length;
      const id = `${unit.id}:${after}`;
      return {
        id,
        unit: unit.id,
        after,
        solved,
        ready: solved === after,
        claimed: record?.claimedChests?.includes(id) ?? false,
      };
    }),
  );
}
export type DefinitionChest = ReturnType<typeof definitionChests>[number];
export function applyDefinitionAction(
  p: Profile,
  a: Action,
  date: string,
): Feedback {
  const starsBefore = p.stars;
  const record = (p.definitions ??= { runs: 0, cards: {}, history: [] });
  record.courseGrade ??= definitionCourseGrade(p);
  if (a.definitionAction === "course") {
    if (!courseGrades.includes(a.grade!))
      throw new Error("학년을 다시 골라주세요.");
    if (
      record.session &&
      (!record.session.done ||
        (!record.session.reviewOnly && record.session.unresolved.length))
    )
      throw new Error("진행 중 퀘스트를 마치고 학년을 바꿔주세요.");
    record.courseGrade = a.grade;
    return { message: `${gradeLabel(a.grade!)} 보드로 이동했어요.` };
  }
  if (a.definitionAction === "chest") {
    const chest = definitionChests(p).find((c) => c.id === a.chestId);
    if (!chest) throw new Error("보상상자를 다시 확인해주세요.");
    if (chest.claimed) return { message: "이미 별을 받은 상자예요." };
    if (!chest.ready)
      throw new Error(`앞의 개념 ${chest.after}개를 먼저 해결해봐.`);
    (record.claimedChests ??= []).push(chest.id);
    p.stars++;
    p.earned++;
    return {
      chestId: chest.id,
      stars: 1,
      message: "보상상자에서 별 1개를 얻었어!",
    };
  }
  if (a.definitionAction === "goal") {
    const unit = definitionUnits.find((u) => u.id === a.unitId);
    if (!unit) throw new Error("목표 단원을 다시 골라주세요.");
    record.goalUnitId = unit.id;
    return { message: `${unit.title} 카드 5개 수집을 목표로 정했어요.` };
  }
  if (a.definitionAction === "start") {
    if (record.session && !record.session.done)
      return { message: "진행 중인 도전을 이어가요." };
    if (record.session?.unresolved.length && !record.session.reviewOnly)
      return { message: "남은 문제 다시 풀기로 현재 도전을 마쳐 주세요." };
    const route = a.definitionRoute ?? "unit";
    if (!["unit", "memory", "repair"].includes(route))
      throw new Error("퀘스트 종류를 다시 확인해주세요.");
    if (route === "memory" && !definitionDue(p, date).length)
      throw new Error("아직 복습할 날이 된 카드가 없어요.");
    const cards =
      route === "memory"
        ? definitionMemoryCards(p, date)
        : route === "repair"
          ? definitionRepairCards(p, a.cardId ?? "")
          : definitionCards.filter((c) => c.unit === a.unitId);
    if (cards.length !== 5) throw new Error("단원을 골라주세요.");
    const unit = definitionUnits.find(
      (u) =>
        u.id ===
        (route === "repair" ? definitionCard(a.cardId!).unit : cards[0].unit),
    )!;
    record.runs++;
    if (route === "unit") record.courseGrade = unit.grade;
    record.session = {
      id: `definitions-${p.id}-${record.runs}`,
      route,
      targetCardId: route === "repair" ? a.cardId : undefined,
      cardIds: cards.map((c) => c.id),
      unit: unit.id,
      date,
      queue: cards.flatMap((c) =>
        [0, 1, 2].map((kind) => ({ cardId: c.id, kind: kind as 0 | 1 | 2 })),
      ),
      index: 0,
      round: 0,
      next: [],
      seen: [],
      hinted: [],
      passed: [],
      initialWrong: [],
      first: 0,
      done: false,
      stars: 0,
      unresolved: [],
      eligible: cards
        .filter(
          (c) =>
            !record.cards[c.id] ||
            (record.cards[c.id].due <= date &&
              (record.cards[c.id].reviewedAt ?? record.cards[c.id].lastDate) !==
                date),
        )
        .map((c) => c.id),
    };
    return { message: "개념 5개, 15문항을 시작해요." };
  }
  const s = record.session;
  if (a.definitionAction === "retry-unresolved") {
    if (!s?.done || !s.unresolved.length)
      throw new Error("남은 오답이 있는 도전을 마친 뒤 다시 풀 수 있어요.");
    // Older saved sessions did not identify their history row. The latest row
    // belongs to the current completed session; attach its ID before reopening.
    const history = record.history.at(-1);
    if (
      !s.reviewOnly &&
      history &&
      !history.sessionId &&
      history.unit === s.unit &&
      history.first === s.first &&
      history.unresolved === s.unresolved.length &&
      history.stars === s.stars
    )
      history.sessionId = s.id;
    s.cardIds ??= definitionSessionCards(s).map((card) => card.id);
    s.continuation = (s.continuation ?? 0) + 1;
    s.continuationCardIds = [
      ...new Set(s.unresolved.map((task) => task.cardId)),
    ];
    s.queue = s.unresolved.map((task) => ({ ...task }));
    s.index = 0;
    s.round = 0;
    s.next = [];
    s.unresolved = [];
    s.done = false;
    // Keep the original five cards, first-attempt score, passed tasks and ID.
    // A fresh question ID prevents old answers from addressing the new batch.
    return { message: "남은 문제를 다시 풀어요." };
  }
  if (!s || s.done || a.questionId !== definitionQuestionId(s))
    throw new Error("이미 넘어간 카드예요. 현재 문항을 확인해주세요.");
  const task = s.queue[s.index],
    c = definitionCard(task.cardId),
    key = definitionTaskKey(task);
  if (a.definitionAction === "read") {
    if (!definitionNeedsRead(p, s))
      throw new Error("정의 학습 단계가 아니에요.");
    s.seen.push(c.id);
    return { message: "이제 정의를 가리고 떠올려봐요." };
  }
  if (a.definitionAction === "hint") {
    if (!s.hinted.includes(c.id)) s.hinted.push(c.id);
    return { hint: true, message: c.definition };
  }
  if (a.definitionAction !== "answer" || definitionNeedsRead(p, s))
    throw new Error("먼저 정의를 읽어주세요.");
  const values = a.tiles;
  // «아직 모르겠어요» — 화면은 세 활동 모두에서 **빈 답**을 보낸다. 모름은 그 활동의 오답이다
  // (재도전 줄에 넣고 첫 시도 정답으로 세지 않는다 — 2026-10-03 3자 합의 S1).
  // 예전에는 개수 검사가 먼저라 문장 조립 · 경계 살피기에서 «답을 다시 확인해주세요.»로 던졌다 — 학생이 모른다고 할 수 없었다.
  // 🔴 풀어 주는 것은 빈 답 하나뿐이다. 개수가 어긋난 비어 있지 않은 답은 아래에서 그대로 거절한다.
  const gaveUp = Array.isArray(values) && values.length === 0;
  if (
    !gaveUp &&
    (!Array.isArray(values) ||
      new Set(values).size !== values.length ||
      values.some(
        (v) =>
          !Number.isInteger(v) ||
          v < 0 ||
          v >=
            (task.kind === 0
              ? c.words.length
              : task.kind === 1
                ? c.examples.length
                : 2),
      ) ||
      (task.kind === 0 && values.length !== 2) ||
      (task.kind === 2 && values.length !== 1))
  )
    throw new Error("답을 다시 확인해주세요.");
  const correct = gaveUp
    ? false
    : task.kind === 0
      ? definitionAssemblyCorrect(c, values)
      : task.kind === 1
        ? c.examples.every((e, i) => e.yes === values.includes(i))
        : values[0] === (c.truth ? 1 : 0);
  if (correct) {
    if (!s.passed.includes(key)) s.passed.push(key);
    if (s.round === 0 && !s.continuation) s.first++;
  } else {
    s.next.push(task);
    if (s.round === 0 && !s.continuation && !s.initialWrong.includes(c.id))
      s.initialWrong.push(c.id);
  }
  s.index++;
  if (s.index >= s.queue.length) {
    if (s.next.length && s.round < 3) {
      s.queue = s.next;
      s.next = [];
      s.index = 0;
      s.round++;
    } else {
      s.done = true;
      s.unresolved = s.next;
      const affectedCards = s.continuation
        ? (s.continuationCardIds ?? []).map(definitionCard)
        : definitionSessionCards(s);
      for (const card of affectedCards) {
        const old = record.cards[card.id],
          all = [0, 1, 2].every((kind) =>
            s.passed.includes(`${card.id}:${kind}`),
          ),
          clean =
            !s.continuation &&
            all &&
            !s.initialWrong.includes(card.id) &&
            !s.hinted.includes(card.id);
        let level = old?.level ?? 0;
        if (!level && all) level = 1;
        else if (
          level &&
          level < 3 &&
          clean &&
          s.eligible.includes(card.id) &&
          old.lastDate !== date
        )
          level++;
        if (level > (old?.level ?? 0)) {
          p.stars++;
          p.earned++;
          s.stars++;
        }
        const ranked = level > (old?.level ?? 0),
          eligible =
            s.eligible.includes(card.id) &&
            (old?.reviewedAt ?? old?.lastDate) !== date;
        let step = old ? reviewStep(old) : 0,
          due = old?.due ?? addDays(date, 1),
          reviewedAt = old?.reviewedAt ?? old?.lastDate ?? "",
          lastRecall = old?.lastRecall ?? "new";
        if (!old || (!old.level && all)) {
          step = 0;
          due = addDays(date, 1);
          reviewedAt = date;
          lastRecall = clean
            ? "new"
            : s.hinted.includes(card.id)
              ? "supported"
              : "retry";
        } else if (!clean && !s.continuation) {
          // Record a recall failure once for this session. Explicit retries
          // only resolve misses; they do not restart or advance this schedule.
          step = 0;
          due = addDays(date, 1);
          reviewedAt = date;
          lastRecall = s.hinted.includes(card.id) ? "supported" : "retry";
        } else if (clean && eligible) {
          step = Math.min(4, step + 1);
          due = addDays(date, reviewIntervals[step]);
          reviewedAt = date;
          lastRecall = "remembered";
        }
        record.cards[card.id] = {
          level,
          due,
          lastDate: ranked ? date : (old?.lastDate ?? ""),
          // 시도한 날 = 세션을 **시작한** 날. 끝낸 날로 적으면 판(`cardRevisions`) 전날 예전 문장으로 풀기 시작해 판 날
          // 끝낸 학생이 다시 복습에서 빠진다(D-143 ⑦ · 리드 검토 ③).
          attemptedAt: s.date,
          missed: s.unresolved.filter((t) => t.cardId === card.id).length,
          reviewStep: step,
          reviewedAt,
          lastRecall,
        };
      }
      const history = record.history.find((entry) => entry.sessionId === s.id);
      if (history) {
        // Preserve the first attempt's date/score. The daily ledger separately
        // records the actual server date on which every remaining task is solved.
        history.unresolved = s.unresolved.length;
        history.stars = s.stars;
      } else {
        record.history.push({
          sessionId: s.id,
          date,
          route: s.route,
          targetCardId: s.targetCardId,
          unit: s.unit,
          first: s.first,
          unresolved: s.unresolved.length,
          stars: s.stars,
        });
      }
      record.history = record.history.slice(-60);
    }
  }
  return {
    correct,
    advance: true,
    complete: s.done && s.unresolved.length === 0,
    stars: s.done ? p.stars - starsBefore : 0,
    message: correct
      ? "정확해! 다음으로."
      : s.done
        ? "남은 개념은 정의와 함께 확인해봐."
        : "기록했어. 틀린 문항은 뒤에서 다시 만나!",
  };
}
