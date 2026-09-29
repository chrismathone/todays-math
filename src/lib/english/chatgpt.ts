/**
 * 오늘의 영어 — ChatGPT 로 제작 (D-148 · 25 §4.1). **키 없는 주 경로.**
 *
 * 원장님이 ChatGPT 구독으로 만든다. 앱은 두 가지만 한다:
 *   1. `buildChatgptRequest` — 조건(학교 · 학년 · 제작 방식 · 소재/원문 · 난이도 · 문항 수 · 지문 길이 · 유형)과
 *      규칙(DeepSeek 프롬프트와 **같은 한 벌**, `src/lib/ai/prompts/englishExam.ts`)과 답 형식을 한국어 요청문으로.
 *   2. `parseChatgptResult` — 붙여 넣은 글에서 JSON 객체를 찾아(`parseAiJsonObject` — 코드펜스 · 잡설 · 후행 쉼표)
 *      모양을 받아 준 뒤 검증기(`validateEnglishDraft`, 25 §4.4)를 지난다. `source` 는 여기서 `chatgpt` 로 붙는다.
 *
 * 순수 함수 — 브라우저에서 돈다(키 · 서버 없음).
 */
import {
  ENGLISH_OPEN_TYPES,
  type EnglishExam,
  type EnglishGenerateRequest,
  type EnglishQuestionType,
  type EnglishSetSource,
} from "@/contracts/english.contract";
import { AiParseError } from "@/lib/ai/errors";
import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import {
  ENGLISH_ANSWER_FORMAT_EXAMPLE,
  ENGLISH_DIFFICULTY_LABEL,
  ENGLISH_EXAM_RULES,
  ENGLISH_MODE_LABEL,
  ENGLISH_TYPE_GUIDE,
  ENGLISH_TYPE_VALUES,
  englishRequestRules,
} from "@/lib/ai/prompts/englishExam";

import {
  type EnglishDraftExpectation,
  type EnglishDraftVerdict,
  normalizeEnglishText,
  validateEnglishDraft,
} from "./validate";

/** 만들기 조건 — 생성 요청 계약에서 `examId` 만 뺀 것(ChatGPT 탭과 API 탭이 같이 쓴다). */
export type EnglishMakerConditions = Omit<EnglishGenerateRequest, "examId">;

export interface ChatgptRequestInput {
  exam: Pick<EnglishExam, "school" | "grade" | "title">;
  request: EnglishMakerConditions;
  /** 저장한 텍스트 자료 — 참고용으로 따로 싣는다. `request.passage` 와 같은 글이면 두 번 싣지 않는다. */
  materialText?: string;
}

/** 세트 이름 상한 — 계약 `setTitleSchema`(160) 와 같다. AI 가 긴 제목을 내도 초안 전체가 막히지 않게 자른다. */
const TITLE_MAX = 160;

export function buildChatgptRequest({
  exam,
  request,
  materialText,
}: ChatgptRequestInput): string {
  const lines = [
    "[오늘의 영어 — 내신 대비 문제 제작 요청]",
    `대상: ${exam.school} ${exam.grade} · ${exam.title}`,
    `제작 방식: ${ENGLISH_MODE_LABEL[request.mode]}`,
  ];
  if (request.mode === "new") lines.push(`소재: ${request.topic}`);
  lines.push(
    `난이도: ${ENGLISH_DIFFICULTY_LABEL[request.difficulty]}`,
    `문항 수: ${request.count}문항`,
  );
  if (request.mode !== "original")
    lines.push(`지문 길이: 약 ${request.words}단어`);
  lines.push(`문항 유형: ${request.types.join(" · ")}`);

  if (request.mode !== "new") lines.push("", "[원문]", request.passage.trim());

  const material = materialText?.trim();
  if (
    material &&
    normalizeEnglishText(material) !== normalizeEnglishText(request.passage)
  )
    lines.push("", "[참고 자료]", material);

  lines.push(
    "",
    "[규칙]",
    ...[...englishRequestRules(request), ...ENGLISH_EXAM_RULES].map(
      (rule, index) => `${index + 1}. ${rule}`,
    ),
    "유형 안내:",
    ...request.types.map((type) => `- ${ENGLISH_TYPE_GUIDE[type]}`),
    "",
    "[답 형식]",
    "아래 모양의 JSON 하나만 ```json 코드펜스 안에 넣어 답하고, 그 밖의 말은 쓰지 않습니다.",
    "```json",
    ENGLISH_ANSWER_FORMAT_EXAMPLE,
    "```",
    `type 값은 다음 글자 그대로만 씁니다: ${ENGLISH_TYPE_VALUES}`,
  );
  return lines.join("\n");
}

const CIRCLED_ANSWER: Record<string, string> = {
  "①": "1",
  "②": "2",
  "③": "3",
  "④": "4",
  "⑤": "5",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 객관식 정답의 흔한 표기(«③» · «3번» · 숫자 3)를 번호 문자열로. 뜻이 다른 값은 그대로 둔다(검증기가 본다). */
function coerceAnswer(answer: unknown, open: boolean): unknown {
  if (typeof answer === "number" && Number.isInteger(answer))
    return String(answer);
  if (typeof answer !== "string" || open) return answer;
  const trimmed = answer.trim();
  const circled = CIRCLED_ANSWER[trimmed];
  if (circled) return circled;
  const numbered = /^\(?([1-5])\)?\s*번?$/.exec(trimmed);
  return numbered ? numbered[1] : answer;
}

function coerceQuestion(question: unknown): unknown {
  if (!isRecord(question)) return question;
  const open =
    typeof question.type === "string" &&
    ENGLISH_OPEN_TYPES.includes(question.type as EnglishQuestionType);
  return {
    type: question.type,
    prompt: question.prompt,
    options:
      question.options == null
        ? []
        : Array.isArray(question.options)
          ? question.options.map((option) =>
              typeof option === "number" ? String(option) : option,
            )
          : question.options,
    answer: coerceAnswer(question.answer, open),
    explanation: question.explanation == null ? "" : question.explanation,
    evidence: question.evidence == null ? "" : question.evidence,
  };
}

/**
 * ChatGPT · DeepSeek 가 흔히 덧붙이는 **모양**을 받아 준다 — 모르는 열쇠(번호 · 난이도)는 버리고, 서술형의 빠진
 * `options` 는 빈 배열로, 빠진 `explanation`·`evidence` 는 빈 글로, 정답의 원문자·숫자는 번호 문자열로.
 * **뜻은 손대지 않는다** — 보기 수 · 정답 범위 · 근거 대조는 검증기가 그대로 본다. `source` 는 부르는 쪽이 정한다.
 */
export function coerceEnglishDraftShape(
  value: unknown,
  source: EnglishSetSource,
): unknown {
  if (!isRecord(value)) return value;
  return {
    title:
      typeof value.title === "string"
        ? value.title.trim().slice(0, TITLE_MAX)
        : value.title,
    passage: value.passage,
    questions: Array.isArray(value.questions)
      ? value.questions.map(coerceQuestion)
      : value.questions,
    source,
  };
}

/**
 * 붙여 넣은 글 → 초안. 실패는 어느 문항·어느 규칙인지 한 줄씩(`issues`). `expect` 를 주면 요청(문항 수 · 고른 유형 ·
 * 원문 유지)과도 견준다 — 요청문을 복사한 조건 그대로 넘기면 된다.
 */
export function parseChatgptResult(
  text: string,
  expect?: EnglishDraftExpectation,
): EnglishDraftVerdict {
  let value: unknown;
  try {
    value = parseAiJsonObject(text);
  } catch (error) {
    const notObject =
      error instanceof AiParseError && error.message.includes("객체");
    return {
      ok: false,
      issues: [
        {
          question: null,
          message: notObject
            ? "붙여 넣은 글의 JSON 이 객체 하나가 아닙니다(배열이나 문자열). 답 형식의 JSON 객체를 붙여 넣어 주세요."
            : "붙여 넣은 글에서 JSON 을 찾지 못했습니다. ChatGPT 답의 코드펜스 안 내용 전부를 붙여 넣어 주세요.",
        },
      ],
    };
  }
  return validateEnglishDraft(
    coerceEnglishDraftShape(value, "chatgpt"),
    expect,
  );
}
