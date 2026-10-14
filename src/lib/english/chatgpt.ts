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
import {
  ENGLISH_SCHEMA_VERSION_V1,
  ENGLISH_V2_ONLY_DOCUMENT_KEYS,
  ENGLISH_V2_ONLY_ITEM_KEYS,
} from "@/contracts/englishV2.contract";
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

import { englishRejectionReasons } from "./feedback";
import { englishV1PayloadIssues } from "./v2/versionGate";
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
    "[오늘 영어 — 내신 대비 문제 제작 요청]",
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

/**
 * 글자 그대로의 `\n` · `\r\n` · `\t` 를 줄바꿈 · 빈칸으로 — 모델이 줄바꿈을 두 번 이스케이프하면 발문에 `\n\n` 이 글자로 남아
 * 학생 지면에 찍힌다. 벤치 1,280문항에서 12건, 12건 모두 진짜였다(25 §12.8). 영어 글에 글자 `\n` 이 정당하게 들 일이 없어
 * 막지 않고 받을 때 고친다. 다른 역슬래시는 건드리지 않는다.
 */
function unescapeLiteralBreaks(value: unknown): unknown {
  if (typeof value !== "string" || !value.includes("\\")) return value;
  return value.replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\\t/g, " ");
}

/**
 * 🔴 «모르는 열쇠는 버린다»의 예외 — 형식 판 표지와 2판에만 있는 칸은 **버리지 않고 실어 넘긴다.**
 * 버리면 표적과 표적별 정답이 사라진 1판 초안이 조용히 통과한다. 실어 넘기면 검증기(`validateEnglishDraft`)가
 * 그 값을 사유와 함께 거절한다. `schemaVersion: 1` 은 «1판»이라는 표지일 뿐이라 뗀다.
 */
function carried(
  value: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (Object.hasOwn(value, key)) out[key] = value[key];
  return out;
}

function coerceQuestion(question: unknown): unknown {
  if (!isRecord(question)) return question;
  const open =
    typeof question.type === "string" &&
    ENGLISH_OPEN_TYPES.includes(question.type as EnglishQuestionType);
  return {
    ...carried(question, ENGLISH_V2_ONLY_ITEM_KEYS),
    type: question.type,
    prompt: unescapeLiteralBreaks(question.prompt),
    options:
      question.options == null
        ? []
        : Array.isArray(question.options)
          ? question.options.map((option) =>
              typeof option === "number"
                ? String(option)
                : unescapeLiteralBreaks(option),
            )
          : question.options,
    answer: unescapeLiteralBreaks(coerceAnswer(question.answer, open)),
    explanation:
      question.explanation == null
        ? ""
        : unescapeLiteralBreaks(question.explanation),
    evidence:
      question.evidence == null ? "" : unescapeLiteralBreaks(question.evidence),
  };
}

/**
 * ChatGPT · DeepSeek 가 흔히 덧붙이는 **모양**을 받아 준다 — 모르는 열쇠(번호 · 난이도)는 버리고(형식 판 표지와
 * 2판 칸은 예외 — `carried`), 서술형의 빠진
 * `options` 는 빈 배열로, 빠진 `explanation`·`evidence` 는 빈 글로, 정답의 원문자·숫자는 번호 문자열로,
 * 글자 그대로의 `\n` 은 줄바꿈으로(`unescapeLiteralBreaks`).
 * **뜻은 손대지 않는다** — 보기 수 · 정답 범위 · 근거 대조는 검증기가 그대로 본다. `source` 는 부르는 쪽이 정한다.
 */
export function coerceEnglishDraftShape(
  value: unknown,
  source: EnglishSetSource,
): unknown {
  if (!isRecord(value)) return value;
  return {
    ...carried(value, ENGLISH_V2_ONLY_DOCUMENT_KEYS),
    ...(Object.hasOwn(value, "schemaVersion") &&
    value.schemaVersion !== ENGLISH_SCHEMA_VERSION_V1
      ? { schemaVersion: value.schemaVersion }
      : {}),
    title:
      typeof value.title === "string"
        ? value.title.trim().slice(0, TITLE_MAX)
        : value.title,
    passage: unescapeLiteralBreaks(value.passage),
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

export interface ChatgptFixInput {
  request: EnglishMakerConditions;
  /** 붙여 넣었던 글 그대로 — 같은 대화가 지금 편집본과 다를 수 있어 요청문에 다시 싣는다 */
  pasted: string;
}

/** 붙여 넣은 글이 너무 길면 요청문이 ChatGPT 입력 한도를 넘는다 — 세트 하나는 이 안에 든다 */
const FIX_PASTED_MAX = 40_000;

/**
 * 붙여 넣은 결과가 검증기에 **거절됐을 때만** — 같은 ChatGPT 대화에 붙일 «고쳐 달라 요청문». 통과했으면 null.
 * 3자 합의(25 §12.8 「3」): 저장을 막은 사유와 관측 사실(문항 번호 · 근거 자리 짚기)만 싣고 막지 않는 품질 검사는 안 싣는다 ·
 * 모양 문제는 그 칸만, 내용 문제는 그 문항의 정답 · 해설 · 근거까지 최소 범위로 · 나머지는 그대로 · 전체 JSON 만.
 * 서버 AI 길의 «한 번 고쳐 쓰기»(`generate.ts`)와 같은 뜻을 사람이 옮겨 붙이는 길로 낸 것이다.
 * 🔴 붙여 넣은 글에서 JSON 객체를 못 찾았으면 null — 앱은 일부만 복사한 것인지 말뿐인 답인지 모르고, 그 글을
 *    «앞서 낸 결과»로 다시 실어 보내도 고칠 대상이 없다(3자 합의 25 §12.13). 화면의 사유가 먼저 할 일을 말한다.
 */
export function buildChatgptFixRequest({
  request,
  pasted,
}: ChatgptFixInput): string | null {
  let value: unknown;
  try {
    value = coerceEnglishDraftShape(parseAiJsonObject(pasted), "chatgpt");
  } catch {
    return null;
  }
  // 2판 · 모르는 판의 값이면 요청문을 만들지 않는다 — «1판 꼴로 다시 써 달라»는 요청이 곧 표적을 버리는 일이다
  if (englishV1PayloadIssues(value).length) return null;
  const reasons = englishRejectionReasons(value, {
    ...request,
    allowUnderlineCompanion: true,
  });
  if (!reasons.length) return null;

  const lines = [
    "[오늘 영어 — 고쳐 쓰기 요청]",
    "앞서 만든 결과가 자동 검사에 걸려 저장되지 않았습니다. 아래 [고칠 곳]만 고쳐 주세요.",
    "",
    "[고칠 곳]",
    ...reasons.map((reason) => `- ${reason}`),
    "",
    "[고치는 범위]",
    "- 모양 문제(보기 수 · 정답 번호 · 빠진 칸 · 유형 이름)는 그 칸만 고칩니다.",
    "- 내용 문제(근거 · 지문 · 요청과 다른 유형이나 문항 수)는 그 문항의 정답 · 해설 · 근거까지만 같이 고칩니다.",
    "- 지적되지 않은 문항과 지문(passage)은 한 글자도 바꾸지 않습니다.",
    "",
    "[조건]",
    `제작 방식: ${ENGLISH_MODE_LABEL[request.mode]}`,
  ];
  if (request.mode === "new") lines.push(`소재: ${request.topic}`);
  lines.push(
    `난이도: ${ENGLISH_DIFFICULTY_LABEL[request.difficulty]}`,
    `문항 수: ${request.count}문항`,
    `문항 유형: ${request.types.join(" · ")}`,
  );
  if (request.mode !== "new") lines.push("", "[원문]", request.passage.trim());
  lines.push(
    "",
    "[앞서 낸 결과]",
    pasted.trim().slice(0, FIX_PASTED_MAX),
    "",
    "[답 형식]",
    "고친 뒤 같은 모양의 JSON 하나만 ```json 코드펜스 안에 넣어 **전체를** 다시 답하고, 그 밖의 말은 쓰지 않습니다.",
    "```json",
    ENGLISH_ANSWER_FORMAT_EXAMPLE,
    "```",
    `type 값은 다음 글자 그대로만 씁니다: ${ENGLISH_TYPE_VALUES}`,
  );
  return lines.join("\n");
}
