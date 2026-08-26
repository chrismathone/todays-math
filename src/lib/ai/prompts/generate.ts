/**
 * AI 문제 생성 프롬프트 — v1 (2026-08-13, T3.2 최초 작성).
 * 변경 시 버전 문자열과 날짜를 갱신하고 변경 사유를 한 줄로 남긴다(07-coding-convention.md,
 * docs/planning/02-trd.md §5 "프롬프트는 lib/ai/prompts/에 버전 관리").
 *
 * 대응: src/lib/ai/generator.ts, POST /api/problems/generate(T3.1)
 */
import type { Difficulty } from "@/contracts/common.contract";

import { WORDY_OPERATOR_RULE } from "./wordyOperatorRule";

/**
 * v2 (2026-08-26) — `problemType` 의 **서술형**이 무슨 뜻인지 못 박았다.
 *
 * 이유: 생성물의 형식(`questionType`)을 AI 에게 묻지 않고 생성물에서 읽어 내는데
 * (`src/lib/ai/questionType.ts`), 주관식에서 «단답»과 «서술»만은 글로 안 갈린다.
 * 그 축을 나르는 것이 `problemType` 이므로, 그 값이 실제로 채워지게 프롬프트가
 * 기준을 말해야 한다. v1 은 갈래 이름만 나열하고 뜻을 안 적었다.
 */
/**
 * v3 (2026-08-26) — **「말 대신 기호」를 금지**했다 (원장님 지시).
 *
 * 「해설에 `$\min(a,3)=2$` 라 쓰지 말고 **최솟값이란 말을 명확히** 쓸 것」.
 * 예외를 함께 적는다 — 안 적으면 AI 가 `\sin`·`\log` 까지 말로 풀어 쓴다.
 * 프롬프트만으로는 안 되므로 받는 쪽에서도 검사한다(`src/lib/ai/wordyOperators.ts`).
 */
export const GENERATE_PROMPT_VERSION = "v3";

export interface GeneratePromptInput {
  /** 사람이 읽는 단원명 — 예: "일차부등식의 활용(농도)". */
  unitLabel: string;
  difficulty: Difficulty;
  count: number;
}

/**
 * 갈래마다 「무엇을 내라」는 말 — 이것은 **진짜 매핑**이라 남긴다(D-106).
 * 값 자체는 이름이지만, AI 에게는 그 이름이 무슨 뜻인지 풀어 주어야 한다.
 * 뜻은 초등 4단(D-72)의 정의를 그대로 따른다.
 */
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  연산: "연산 — 식이 그대로 주어지고 계산만 하면 풀리는 수준 (상황·조건 없음)",
  기본: "기본 — 개념을 그대로 적용하면 풀리는 수준",
  응용: "응용 — 개념을 1~2단계 응용해야 하는 수준",
  심화: "심화 — 여러 개념을 복합적으로 활용하거나 거꾸로 되짚어야 하는 수준",
};

export function buildGenerateSystemPrompt(): string {
  return [
    "당신은 한국 중학교 수학 문제를 출제하는 조교입니다.",
    "반드시 요청받은 개수만큼의 문제를 JSON 배열로만 응답하십시오. 코드펜스나 설명 문장은 절대 덧붙이지 마십시오.",
    "각 배열 원소는 problemType/content/answer/solution 4개 필드를 가진 객체여야 합니다.",
    '- problemType: "계산" | "개념" | "활용" | "서술형" 중 정확히 하나.',
    '  발문이 풀이 과정·근거·이유를 **서술하라고 요구하면 반드시 "서술형"** 으로 하고,',
    '  답만 쓰면 되는 문제는 "서술형"을 쓰지 마십시오 — 이 값으로 시험지의 「서술형 n」 표시가 정해집니다.',
    "- 보기(①②③④⑤)를 쓸 경우 answer 는 반드시 그 보기 번호(예: ③)로 적으십시오.",
    "- content: 학생에게 보여줄 발문. 수식은 $...$ 인라인 LaTeX로 표기하고, \\dfrac 대신 반드시 \\frac을 사용하십시오.",
    "- answer: 정답(LaTeX 허용, 단위/조건 포함 가능).",
    "- solution: 풀이 과정(선택). 제공하지 않으면 null로 두십시오.",
    WORDY_OPERATOR_RULE,
    "JSON 문자열 값 안의 백슬래시(\\frac, \\times, \\sqrt 등)는 반드시 \\\\로 이스케이프해 유효한 JSON을 만드십시오.",
  ].join("\n");
}

export function buildGenerateUserPrompt({
  unitLabel,
  difficulty,
  count,
}: GeneratePromptInput): string {
  return [
    `단원: ${unitLabel}`,
    `난이도: ${DIFFICULTY_LABEL[difficulty]}`,
    `문제 개수: ${count}개`,
    "위 조건에 맞는 서로 다른 문제를 생성해 JSON 배열로만 응답하십시오.",
  ].join("\n");
}
