/**
 * 오늘의 영어 — 초안 검증기 (D-148 · 25 §4.4). 만들기 세 길(ChatGPT 붙여넣기 · 원문 복원 · DeepSeek)과
 * 세트 저장 라우트가 **같은 규칙**을 지난다. 계약(`english.contract.ts`)은 모양만 잠그고, 여기서는 지문과
 * 문항을 같이 보는 뜻을 본다 — 보기 다섯 · 정답 번호 범위 · 근거가 지문 안 · 유형별 보기 유무 · 요청과의 일치.
 * D-158(25 §13): «언급 없음»만 보기 넷도 받고, 정답 번호는 그 문항의 보기 수 안이어야 한다. 공통 빈칸 · 단어 배열은
 * 문제용 표지(빈칸 둘 이상 · 한 괄호 안에 « / » 로 나눈 말 셋 이상)가 발문에 있어야 한다 — 빈칸 추론의 빈칸 규칙과 같은 결이다.
 *
 * 순수 함수다(서버·클라이언트 같이). 통과 ≠ 검토 완료 — 저장은 늘 «초안».
 */
import {
  ENGLISH_FOUR_CHOICE_TYPES,
  ENGLISH_OPEN_TYPES,
  englishDraftSchema,
  type EnglishDraft,
  type EnglishDraftIssue,
  type EnglishGenerateRequest,
  type EnglishQuestion,
  type EnglishQuestionType,
} from "@/contracts/english.contract";

import { englishV1PayloadIssues } from "./v2/versionGate";

/** 공백을 하나로 접고 앞뒤를 지운다 — 근거 대조·보기 중복 판정의 자 */
export function normalizeEnglishText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 생성 요청과 견줄 때 쓰는 부분 — `examId` 같은 것은 필요 없다 */
export type EnglishDraftExpectation = Pick<
  EnglishGenerateRequest,
  "mode" | "passage" | "count" | "types"
> & {
  /**
   * 붙여넣기 · 수정 요청문만. 고른 쪽이 어법이면 어휘를, 어휘이면 어법을 결과에 허용한다.
   * 그 짝은 필수가 아니다. 다른 미선택 유형 · 요청 유형 누락 · 문항 수는 그대로 본다.
   */
  allowUnderlineCompanion?: boolean;
};

export type EnglishDraftVerdict =
  | { ok: true; draft: EnglishDraft }
  | { ok: false; issues: EnglishDraftIssue[] };

export const ENGLISH_CHOICE_COUNT = 5;

/**
 * 단어 배열의 문제용 표지 — «( 말 / 말 / 말 )»: **한 괄호 안**에 빗금이 둘 이상(전각 괄호 · 전각 빗금 · 대괄호도 같은 표지).
 * 빗금만 세면 날짜(2026/10) · and/or · 닫는 꺾쇠(`</u>`)가 표지로 읽힌다(D-158 검토 #7).
 */
const ARRANGE_LIST =
  /[(（[][^()（）[\]]*[/／][^()（）[\]]*[/／][^()（）[\]]*[)）\]]/;

/** 근거가 지문에 없을 때의 사유 — 고쳐 쓰기 되먹임(`feedback.ts`)이 이 줄 뒤에 자리 짚기를 붙인다 */
export const ENGLISH_EVIDENCE_NOT_FOUND =
  "지문 속 근거를 지문에서 찾지 못했습니다 (그대로 이어진 인용이어야 합니다).";

function questionIssues(
  question: EnglishQuestion,
  index: number,
  passage: string,
): EnglishDraftIssue[] {
  const issues: EnglishDraftIssue[] = [];
  const open = ENGLISH_OPEN_TYPES.includes(question.type);
  if (open) {
    if (question.options.length > 0)
      issues.push({
        question: index,
        message: `${question.type} 문항에는 보기가 없어야 합니다.`,
      });
  } else {
    const count = question.options.length;
    const four = ENGLISH_FOUR_CHOICE_TYPES.includes(question.type);
    const countOk =
      count === ENGLISH_CHOICE_COUNT ||
      (four && count === ENGLISH_CHOICE_COUNT - 1);
    if (!countOk)
      issues.push({
        question: index,
        message: four
          ? `보기는 ${ENGLISH_CHOICE_COUNT - 1}개 또는 ${ENGLISH_CHOICE_COUNT}개여야 합니다 (지금 ${count}개).`
          : `보기는 ${ENGLISH_CHOICE_COUNT}개여야 합니다 (지금 ${count}개).`,
      });
    else if (new Set(question.options.map(normalizeEnglishText)).size !== count)
      issues.push({ question: index, message: "같은 보기가 두 번 있습니다." });
    // 정답 번호는 그 문항의 보기 수 안 — 보기 수가 어긋났으면 다섯을 기준으로 본다(사유가 겹치지 않게)
    const top = countOk ? count : ENGLISH_CHOICE_COUNT;
    if (!new RegExp(`^[1-${top}]$`).test(question.answer))
      issues.push({
        question: index,
        message: `정답은 보기 번호 1~${top} 여야 합니다.`,
      });
  }
  // passage 는 원 지문이다. 빈칸은 학생에게 보이는 이 문항의 문제용 지문(prompt)에 있어야 한다.
  // 품질 검사(quality.ts)와 같은 표지: 밑줄 네 개 이상. 다른 문항이나 해설의 표지는 세지 않는다.
  if (question.type === "빈칸 추론" && !/_{4,}/.test(question.prompt))
    issues.push({
      question: index,
      message: "빈칸 추론 문항의 문제용 지문에 실제 빈칸(____)을 넣어 주세요.",
    });
  if (
    question.type === "공통 빈칸" &&
    (question.prompt.match(/_{4,}/g) ?? []).length < 2
  )
    issues.push({
      question: index,
      message: "공통 빈칸 문항에는 빈칸(____)이 든 문장을 둘 이상 넣어 주세요.",
    });
  if (question.type === "단어 배열" && !ARRANGE_LIST.test(question.prompt))
    issues.push({
      question: index,
      message:
        "단어 배열 문항에는 배열할 말을 «( 말 / 말 / 말 )» 꼴로 셋 이상 넣어 주세요.",
    });
  const evidence = normalizeEnglishText(question.evidence);
  if (!evidence)
    issues.push({ question: index, message: "지문 속 근거가 비어 있습니다." });
  else if (!passage.includes(evidence))
    issues.push({ question: index, message: ENGLISH_EVIDENCE_NOT_FOUND });
  return issues;
}

/**
 * 초안 하나를 판정한다. `expect` 가 있으면 생성 요청과도 견준다(문항 수 · 고른 유형만 · 고른 유형 각 하나 이상 ·
 * original 이면 지문 원문 유지).
 */
export function validateEnglishDraft(
  value: unknown,
  expect?: EnglishDraftExpectation,
): EnglishDraftVerdict {
  // 🔴 이 검증기는 1판 규칙이다. 2판 · 모르는 판 · 2판 칸이 든 값은 1판 규칙으로 재지 않고 그 사유 하나로 거절한다 —
  //    세 길(붙여넣기 · 서버 AI · 저장 라우트)이 다 여기를 지나므로 어느 길로도 표적이 버려진 채 저장되지 않는다.
  const versionIssues = englishV1PayloadIssues(value);
  if (versionIssues.length) return { ok: false, issues: versionIssues };
  const parsed = englishDraftSchema.safeParse(value);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => {
        const head = issue.path[0];
        const second = issue.path[1];
        return {
          question:
            head === "questions" && typeof second === "number" ? second : null,
          message: `${issue.path.join(".") || "초안"}: ${issue.message}`,
        };
      }),
    };
  const draft = parsed.data;
  const passage = normalizeEnglishText(draft.passage);
  const issues: EnglishDraftIssue[] = [];
  draft.questions.forEach((question, index) =>
    issues.push(...questionIssues(question, index, passage)),
  );
  if (expect) {
    if (draft.questions.length !== expect.count)
      issues.push({
        question: null,
        message: `요청한 문항 수(${expect.count})와 다릅니다 (${draft.questions.length}문항).`,
      });
    const wanted = new Set<EnglishQuestionType>(expect.types);
    const allowed = new Set(wanted);
    if (expect.allowUnderlineCompanion) {
      if (wanted.has("어법")) allowed.add("어휘");
      if (wanted.has("어휘")) allowed.add("어법");
    }
    draft.questions.forEach((question, index) => {
      if (!allowed.has(question.type))
        issues.push({
          question: index,
          message: `고르지 않은 유형입니다: ${question.type}.`,
        });
    });
    for (const type of wanted)
      if (!draft.questions.some((question) => question.type === type))
        issues.push({
          question: null,
          message: `요청한 유형이 빠졌습니다: ${type}.`,
        });
    if (
      expect.mode === "original" &&
      passage !== normalizeEnglishText(expect.passage)
    )
      issues.push({
        question: null,
        message: "원문 유지 모드인데 지문이 바뀌었습니다.",
      });
  }
  return issues.length ? { ok: false, issues } : { ok: true, draft };
}
