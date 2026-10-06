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
 * D-158(25 §13): 공통 빈칸 · 단어 배열도 변형이다 — 문장을 원 지문에서 가져오면 원 지문 상자가 답(빈칸의 낱말 · 완성된 문장)을 보여 준다.
 * 해석 · 영영풀이 · 언급 없음 · 문장 전환은 원 지문을 보고 푸는 쪽이라 독해 묶음에 남는다.
 * 두 유형은 답의 자리를 정렬로 찾지 않는다(D-158 검토 #2 · #3):
 *   - 공통 빈칸의 답은 기능어 한 낱말이고 문장은 새로 쓴 것일 수 있다 → **빈칸에 답을 넣은 문장**을 줄마다 지어 대조한다.
 *     (첫 빈칸을 원 지문에 정렬하면 원 지문의 엉뚱한 구절 스물몇 낱말이 «답»이 됐다.)
 *   - 단어 배열의 답은 문장 하나다 → 그 문장만으로 대조한다(앞뒤 문맥을 붙이면 발췌가 그 문장에서 시작할 때 놓친다).
 *   - 공통 빈칸의 지문은 빈칸이 **한 낱말 자리**다 → 다른 문항의 답 문장이 그 낱말만 빼고 다 보이면 보여 주는 쪽으로 센다.
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
  /** 근거 구절 — 원 지문에서 그대로 옮긴 것. 공통 빈칸만 빈칸에 답을 넣은 그 문장이다(새로 쓴 문장일 수 있다) */
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
  // 빈칸 추론 · 원문 복원 — 빈칸 표지에 닿은, 원문 쪽이 빠진 곳
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

/**
 * 단어 배열의 답 문장이 원 지문에서 차지하는 자리 — 답(완성된 문장)으로 찾고, 어형을 바꾸게 해 답이 원문과 다르면 근거로 찾는다.
 * 근거는 «한두 문장»이라 답보다 넓을 수 있다. 발문에는 말이 흩어져 있어 정렬로는 못 찾는다.
 */
function arrangedSentenceSpan(
  question: EnglishQuestion,
  p: string[],
): Span | null {
  for (const text of [question.answer, question.evidence]) {
    const tokens = tokenizeEnglish(text).tokens;
    if (tokens.length < 3) continue;
    const at = indexOfRun(p, tokens);
    if (at >= 0) return { start: at, end: at + tokens.length };
  }
  return null;
}

/** 보여 주는 쪽(공통 빈칸)의 빈칸 한 자리 — 어떤 낱말과도 맞는다. 낱말 토큰은 영숫자뿐이라 겹치지 않는다 */
const ANY_WORD = "*";

/** 공통 빈칸의 지문 — 빈칸 자리에 «아무 낱말» 표지를 끼운 낱말 줄 */
function tokensWithBlanks(prompt: string): string[] {
  const tok = tokenizeEnglish(prompt);
  const out = [...tok.tokens];
  for (const at of [...tok.blanks].sort((a, b) => b - a))
    out.splice(at, 0, ANY_WORD);
  return out;
}

function containsRun(
  haystack: string[],
  needle: string[],
  wildcard: boolean,
): boolean {
  if (!wildcard) return indexOfRun(haystack, needle) >= 0;
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1)
      if (haystack[i + j] !== needle[j] && haystack[i + j] !== ANY_WORD)
        continue outer;
    return true;
  }
  return false;
}

interface Probe {
  /** 다른 문항의 지문에서 찾을 낱말 줄 */
  run: string[];
  snippet: string;
}

/** 줄 앞의 번호(«① » · «1. » · «(2) »)를 뗀다 — 번호 숫자가 문맥 낱말로 세지지 않게 */
const LINE_MARK = /^\s*(?:[①-⑳]|\(?\d{1,2}[.)])\s*/;

/**
 * 공통 빈칸 — 빈칸이 하나 든 줄마다, 답을 넣은 문장에서 답 앞뒤 문맥을 붙인 낱말 줄.
 * 답이 « / »로 여럿이면 첫째 것으로 본다. 문맥을 다 붙여도 20자가 안 되는 줄은 재지 않는다.
 */
function commonBlankProbes(question: EnglishQuestion): Probe[] {
  const answerText = (question.answer.split("/")[0] ?? "").trim();
  const answer = tokenizeEnglish(answerText).tokens;
  if (!answer.length) return [];
  const probes: Probe[] = [];
  for (const raw of question.prompt.split(/\r?\n/)) {
    const line = raw.replace(LINE_MARK, "").trim();
    const tok = tokenizeEnglish(line);
    if (tok.blanks.length !== 1) continue;
    const at = tok.blanks[0]!;
    const filled = [
      ...tok.tokens.slice(0, at),
      ...answer,
      ...tok.tokens.slice(at),
    ];
    const window = withContext(filled, { start: at, end: at + answer.length });
    const run = filled.slice(window.start, window.end);
    if (run.join(" ").length < MIN_WINDOW_CHARS) continue;
    probes.push({ run, snippet: line.replace(/_{4,}/, answerText) });
  }
  return probes;
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
      question.type === "공통 빈칸"
        ? tokensWithBlanks(question.prompt)
        : tokenizeEnglish(question.prompt).tokens,
    ]),
  );
  /** 원 지문의 낱말 자리 → 대조할 낱말 줄과 근거 구절 */
  const passageProbe = (window: Span, wholeSentence: boolean): Probe => {
    const run = p.slice(window.start, window.end);
    if (!offsets) return { run, snippet: run.join(" ") };
    let end = offsets[window.end - 1]!.end;
    // 문장 하나가 답이면 근거 구절도 문장으로 — 닫는 문장부호까지
    if (wholeSentence)
      while (/[.!?"'”’)]/.test(draft.passage[end] ?? "")) end += 1;
    return {
      run,
      snippet: draft.passage.slice(offsets[window.start]!.start, end),
    };
  };
  const probesOf = (question: EnglishQuestion): Probe[] => {
    if (question.type === "공통 빈칸") return commonBlankProbes(question);
    if (question.type === "단어 배열") {
      const span = arrangedSentenceSpan(question, p);
      if (!span) return [];
      // 문장 하나가 통째로 답이다 — 그 문장만으로 20자가 되면 앞뒤 문맥을 붙이지 않는다
      const long =
        p.slice(span.start, span.end).join(" ").length >= MIN_WINDOW_CHARS;
      return [passageProbe(long ? span : withContext(p, span), long)];
    }
    const span =
      question.type === "문장 삽입"
        ? givenSentenceSpan(question, draft.passage, p)
        : answerSpan(question, p);
    return span ? [passageProbe(withContext(p, span), false)] : [];
  };
  const leaks: EnglishLeak[] = [];
  for (const { question, index } of variants) {
    const probes = probesOf(question);
    for (const other of variants) {
      if (other.index === index) continue;
      // 한 문항의 답이 한 지문에 여러 줄로 보여도 짝은 하나다(공통 빈칸은 줄마다 대조한다)
      const hit = probes.find((probe) =>
        containsRun(
          shown.get(other.index)!,
          probe.run,
          other.question.type === "공통 빈칸",
        ),
      );
      if (hit)
        leaks.push({
          source: index,
          target: other.index,
          kind: question.type,
          snippet: hit.snippet,
        });
    }
  }
  return leaks;
}
