/**
 * 오늘의 영어 — 변형 문항끼리의 정답 누출 (D-151 · 25 §12.8 「1」). **막지 않고 잰다.**
 *
 * 한 세트에 어법 · 빈칸 추론 · 문장 삽입(· 원문 복원)이 같이 있으면, 한 문항의 정답이 다른 문항의 문제용 지문에 그대로 보일 수 있다 —
 * 빈칸에 빠진 원문이 어법 문항의 지문에 있거나, 어법의 원래 형태가 삽입 문항의 지문에 있거나, 삽입 문장이 빈칸 문항의 지문에
 * 원래 자리 그대로 있는 경우. 학생용 지면을 독해용 · 변형용 묶음으로 가른 뒤에도 남는 누출이다.
 *
 * 3자 합의(리드 · codex · grok, 2026-09-30): 정답 구절을 **앞뒤 문맥과 함께 연속 20자 이상 창**으로 대조한다 — 어법의 원래 형태는
 * 한두 낱말이라 문맥 없이 보면 늘 걸린다. 걸리면 근거 구절을 같이 낸다. 🔴 문자열 대조는 누출을 다 잡지 못한다(바꿔 쓴 단서 · 기억).
 * 원 지문을 보고 푸는 독해형(주제 · 내용 일치 · 서술형)은 대상이 아니다 — 그쪽은 인쇄 묶음 분리가 맡는다.
 *
 * D-158(25 §13): 공통 빈칸 · 단어 배열도 변형이다 — 답(빈칸에 들어갈 말 · 완성된 문장)이 원 지문에 그대로 있다.
 * 해석 · 영영풀이 · 언급 없음 · 문장 전환은 원 지문을 보고 푸는 쪽이라 독해 묶음에 남는다.
 *
 * 순수 함수다(서버 · 클라이언트 같이).
 */
import type {
  EnglishDraft,
  EnglishQuestion,
  EnglishQuestionType,
} from "@/contracts/english.contract";

import { splitEnglishSentences } from "./cloze";
import { alignTokens, tokenizeEnglish } from "./quality";

export interface EnglishLeak {
  /** 정답이 드러나는 문항(0부터) */
  source: number;
  /** 그 정답을 지문으로 보여 주는 문항(0부터) */
  target: number;
  kind: EnglishQuestionType;
  /** 원 지문에서 그대로 옮긴 근거 구절 */
  snippet: string;
}

/** 문제용 지문이 발문 안에 드는 유형 — `bundle.ts` 도 이 목록을 쓴다 */
export const VARIANT_TYPES: readonly EnglishQuestionType[] = [
  "어법",
  "어휘",
  "빈칸 추론",
  "문장 삽입",
  "공통 빈칸",
  "단어 배열",
  "원문 복원",
];

/** 창의 최소 글자 수(3자 합의) · 앞뒤에 붙이는 문맥 낱말 수 */
const MIN_WINDOW_CHARS = 20;
const CONTEXT_TOKENS = 2;
/** 이보다 긴 «빠진 곳»은 빈칸이 아니라 발췌 경계다 */
const MAX_ANSWER_TOKENS = 25;
/** 어법의 고친 곳 — 이보다 길면 오류가 아니라 발췌 생략이다 */
const MAX_EDIT_TOKENS = 8;

const WORD = /[A-Za-z0-9]+(?:'[A-Za-z]+)?/g;

interface Span {
  start: number;
  end: number;
}

function indexOfRun(haystack: string[], needle: string[], from = 0): number {
  if (!needle.length) return -1;
  outer: for (let i = from; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1)
      if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** 정답 자리에 문맥을 붙여 20자 이상이 되게 넓힌다 */
function withContext(tokens: string[], span: Span): Span {
  let start = Math.max(0, span.start - CONTEXT_TOKENS);
  let end = Math.min(tokens.length, span.end + CONTEXT_TOKENS);
  while (
    tokens.slice(start, end).join(" ").length < MIN_WINDOW_CHARS &&
    (start > 0 || end < tokens.length)
  ) {
    start = Math.max(0, start - 1);
    end = Math.min(tokens.length, end + 1);
  }
  return { start, end };
}

/** 어법 · 빈칸 · 원문 복원 문항의 정답이 원 지문에서 차지하는 자리(낱말 위치) — 못 가리면 null */
function answerSpan(question: EnglishQuestion, p: string[]): Span | null {
  const tok = tokenizeEnglish(question.prompt);
  const alignment = alignTokens(p, tok.tokens);
  if (question.type === "어법" || question.type === "어휘") {
    const at = tok.markers[Number(question.answer) - 1];
    if (at === null || at === undefined) return null;
    // 정답 밑줄에 닿은 고친 곳 — `quality.ts` 의 «정답 밑줄이 원문에서 고친 곳» 과 같은 조건. 발췌 앞뒤 세 낱말 안의
    // 오류는 «경계 구간»에 들어가므로 경계도 본다(크기로 발췌 생략과 가른다).
    const length = Math.max(
      1,
      tokenizeEnglish(question.options[Number(question.answer) - 1] ?? "")
        .tokens.length,
    );
    const hunk = alignment.hunks.find(
      (h) =>
        h.qStart <= at + length &&
        at <= Math.max(h.qEnd, h.qStart) &&
        h.pEnd - h.pStart <= MAX_EDIT_TOKENS,
    );
    return hunk ? { start: hunk.pStart, end: hunk.pEnd } : null;
  }
  // 단어 배열 — 답은 완성된 문장이고, 그 문장이 근거(원 지문의 연속 인용)다. 발문에는 말이 흩어져 있어 정렬로는 못 찾는다
  if (question.type === "단어 배열") {
    const sentence = tokenizeEnglish(question.evidence).tokens;
    const at = indexOfRun(p, sentence);
    return at < 0 ? null : { start: at, end: at + sentence.length };
  }
  // 빈칸 추론 · 공통 빈칸 · 원문 복원 — (첫) 빈칸 표지에 닿은, 원문 쪽이 빠진 곳
  const blank = tok.blanks[0];
  if (blank === undefined) return null;
  const hunk = alignment.hunks.find(
    (h) =>
      h.qStart <= blank &&
      blank <= h.qEnd &&
      h.pEnd > h.pStart &&
      h.pEnd - h.pStart <= MAX_ANSWER_TOKENS,
  );
  return hunk ? { start: hunk.pStart, end: hunk.pEnd } : null;
}

/** 삽입 문항의 주어진 문장이 원 지문에서 차지하는 자리 — 원 지문 문장 가운데 문항 글의 맨 앞에 놓인 것(quality.ts 와 같은 규칙) */
function givenSentenceSpan(
  question: EnglishQuestion,
  passage: string,
  p: string[],
): Span | null {
  const q = tokenizeEnglish(question.prompt).tokens;
  let from = 0;
  for (const sentence of splitEnglishSentences(passage)) {
    const tokens = tokenizeEnglish(sentence).tokens;
    if (tokens.length < 3) continue;
    const at = indexOfRun(p, tokens, from);
    if (at < 0) continue;
    from = at + tokens.length;
    if (indexOfRun(q, tokens) === 0)
      return { start: at, end: at + tokens.length };
  }
  return null;
}

/** 원 지문의 낱말 위치 → 글자 위치. 낱말 나눔이 `tokenizeEnglish` 와 어긋나면 null */
function tokenOffsets(
  passage: string,
  p: string[],
): { start: number; end: number }[] | null {
  const offsets: { start: number; end: number }[] = [];
  for (const match of passage.matchAll(WORD))
    offsets.push({ start: match.index, end: match.index + match[0].length });
  return offsets.length === p.length &&
    offsets.every(
      (o, i) => passage.slice(o.start, o.end).toLowerCase() === p[i],
    )
    ? offsets
    : null;
}

/** 변형 문항마다의 정답이 다른 변형 문항의 지문에 그대로 보이는 짝 — 없으면 빈 배열 */
export function findVariantLeaks(
  draft: Pick<EnglishDraft, "passage" | "questions">,
): EnglishLeak[] {
  const p = tokenizeEnglish(draft.passage).tokens;
  const variants = draft.questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => VARIANT_TYPES.includes(question.type));
  if (variants.length < 2 || !p.length) return [];
  const offsets = tokenOffsets(draft.passage, p);
  const shown = new Map(
    variants.map(({ question, index }) => [
      index,
      tokenizeEnglish(question.prompt).tokens,
    ]),
  );
  const leaks: EnglishLeak[] = [];
  for (const { question, index } of variants) {
    const span =
      question.type === "문장 삽입"
        ? givenSentenceSpan(question, draft.passage, p)
        : answerSpan(question, p);
    if (!span) continue;
    const window = withContext(p, span);
    const run = p.slice(window.start, window.end);
    const snippet = offsets
      ? draft.passage.slice(
          offsets[window.start]!.start,
          offsets[window.end - 1]!.end,
        )
      : run.join(" ");
    for (const other of variants) {
      if (other.index === index) continue;
      if (indexOfRun(shown.get(other.index)!, run) >= 0)
        leaks.push({
          source: index,
          target: other.index,
          kind: question.type,
          snippet,
        });
    }
  }
  return leaks;
}
