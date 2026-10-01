/**
 * 오늘의 영어 — 결정적 품질 검사 (D-148 · 25 §12). **막지 않고 잰다** — 검증기(`validate.ts`)는 저장을 막는 규칙,
 * 여기는 «좋은 문항인가»의 기계로 잴 수 있는 부분이다. 모델 벤치(`scripts/qa/english-bench/`)와 앞으로의 품질 경고가 쓴다.
 *
 * 핵심은 **문항 속 변형 지문과 원 지문(passage)의 단어 단위 대조**(LCS)다:
 *   - 어법: 고친 곳이 정확히 한 군데이고, 그곳이 정답 밑줄이며, 나머지 밑줄은 원문 그대로다.
 *   - 빈칸 추론: 빈칸 표지가 하나이고, 원문에서 빠진 곳이 한 군데다.
 *   - 문장 삽입: 주어진 문장이 본문에서 빠져 있고, 정답 번호가 그 문장의 원래 자리다.
 * 근거는 조사 3자 합의(2026-09-30 — 리드 · codex · grok): IWF(문항작성 결함) 표면 단서 · STARC · 수능 유형 관행.
 *
 * 순수 함수다(서버·클라이언트 같이). 판정 글자는 사무적으로(D-08).
 */
import {
  ENGLISH_OPEN_TYPES,
  type EnglishDraft,
  type EnglishQuestion,
  type EnglishQuestionType,
} from "@/contracts/english.contract";

import { splitEnglishSentences } from "./cloze";
import { type EnglishDraftExpectation, normalizeEnglishText } from "./validate";

export type EnglishCheckKind = "structure" | "iwf" | "evidence" | "set";

export interface EnglishCheck {
  code: string;
  kind: EnglishCheckKind;
  ok: boolean;
  message: string;
}

export interface EnglishQuestionReport {
  question: number;
  type: EnglishQuestionType;
  checks: EnglishCheck[];
}

export interface EnglishDraftReport {
  questions: EnglishQuestionReport[];
  set: EnglishCheck[];
}

export type EnglishQualityExpectation = EnglishDraftExpectation & {
  words?: number;
};

// ─────────────────────────────────────────────
// 단어 토큰 · 표지
// ─────────────────────────────────────────────

const CIRCLED = ["①", "②", "③", "④", "⑤"] as const;
const BLANK_RUN = /_{4,}/g;

interface Tokenized {
  tokens: string[];
  /** 원문자 ①~⑤ 가 놓인 토큰 위치(그 앞 토큰 수) — 같은 표지가 여럿이면 마지막 것 */
  markers: (number | null)[];
  /** 빈칸(`____`) 이 놓인 토큰 위치 */
  blanks: number[];
}

const WORD = /[A-Za-z0-9]+(?:'[A-Za-z]+)?/y;

/** 영어 단어만 소문자로 센다 — 한글 발문 · 문장부호 · 괄호는 건너뛴다. 표지와 빈칸 위치를 같이 적는다 */
/**
 * 표기 걷어 내기 — `<u>…</u>` 같은 꺾쇠 표기와 글자 그대로의 이스케이프(`
`·`	`)는 단어가 아니다.
 * 🔴 안 걷으면 `<u>` 가 «u» 로, `
Many` 가 «nmany» 로 세져 멀쩡한 문항이 «고친 곳 여럿»이 된다.
 */
function stripMarkup(text: string): string {
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, " ").replace(/\\[ntr]/g, " ");
}

export function tokenizeEnglish(raw: string): Tokenized {
  const text = stripMarkup(raw);
  const tokens: string[] = [];
  const markers: (number | null)[] = [null, null, null, null, null];
  const blanks: number[] = [];
  let i = 0;
  while (i < text.length) {
    const circled = CIRCLED.indexOf(text[i] as (typeof CIRCLED)[number]);
    if (circled >= 0) {
      markers[circled] = tokens.length;
      i += 1;
      continue;
    }
    if (text[i] === "_" && text.startsWith("____", i)) {
      blanks.push(tokens.length);
      while (text[i] === "_") i += 1;
      continue;
    }
    WORD.lastIndex = i;
    const match = WORD.exec(text);
    if (match) {
      tokens.push(match[0].toLowerCase());
      i += match[0].length;
      continue;
    }
    i += 1;
  }
  return { tokens, markers, blanks };
}

/** 보기 앞의 번호 표지(«③», «(3)», «3.») 를 뗀다 */
function stripOptionMarker(option: string): string {
  return option.replace(/^\s*(?:[①-⑤]|\(?[1-5][).]?)\s*/, "").trim();
}

function containsRun(haystack: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > haystack.length) return false;
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1)
      if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function indexOfRun(haystack: string[], needle: string[]): number {
  if (!needle.length) return -1;
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1)
      if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

// ─────────────────────────────────────────────
// LCS 대조 — 원문(P) 과 문항 속 지문(Q) 의 «고친 곳»
// ─────────────────────────────────────────────

export interface EditHunk {
  pStart: number;
  pEnd: number;
  qStart: number;
  qEnd: number;
  /** 첫 일치 앞이나 마지막 일치 뒤 — 발췌(지문 일부만 실음)일 수 있어 따로 본다 */
  outer: boolean;
}

export interface Alignment {
  matched: number;
  hunks: EditHunk[];
}

/** 본체로 인정할 일치 구간의 최소 길이 — 발췌 경계의 우연한 한두 낱말 짝(«a», «that»)을 본체로 보지 않는다 */
const SOLID_RUN = 4;

export function alignTokens(p: string[], q: string[]): Alignment {
  const n = p.length;
  const m = q.length;
  const width = m + 1;
  const table = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = m - 1; j >= 0; j -= 1)
      table[i * width + j] =
        p[i] === q[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);

  // 1) 편집 순서 — 같음(=) · 원문만(-) · 문항만(+)
  const ops: ("=" | "-" | "+")[] = [];
  for (let i = 0, j = 0; i < n || j < m;) {
    if (i < n && j < m && p[i] === q[j]) {
      ops.push("=");
      i += 1;
      j += 1;
    } else if (
      j < m &&
      (i >= n || table[i * width + j + 1] >= table[(i + 1) * width + j])
    ) {
      ops.push("+");
      j += 1;
    } else {
      ops.push("-");
      i += 1;
    }
  }

  // 2) 같음 구간 — 본체는 첫 «굳은» 구간(SOLID_RUN 이상)부터 마지막 굳은 구간까지
  type Run = { op: number; len: number; p: number; q: number };
  const runs: Run[] = [];
  for (let k = 0, i = 0, j = 0; k < ops.length;) {
    if (ops[k] === "=") {
      const run: Run = { op: k, len: 0, p: i, q: j };
      while (ops[k] === "=") {
        run.len += 1;
        k += 1;
        i += 1;
        j += 1;
      }
      runs.push(run);
    } else {
      if (ops[k] === "-") i += 1;
      else j += 1;
      k += 1;
    }
  }
  const solid = runs.filter((r) => r.len >= SOLID_RUN);
  const core = solid.length ? solid : runs;
  if (!core.length)
    return {
      matched: 0,
      hunks:
        n || m ? [{ pStart: 0, pEnd: n, qStart: 0, qEnd: m, outer: true }] : [],
    };
  const first = core[0]!;
  const last = core[core.length - 1]!;
  const coreEnd = {
    op: last.op + last.len,
    p: last.p + last.len,
    q: last.q + last.len,
  };

  // 3) 고친 곳 — 본체 앞 · 뒤는 바깥 하나씩(그 안의 우연한 짝은 버린다), 본체 안은 같음 사이마다 하나
  const hunks: EditHunk[] = [];
  if (first.p > 0 || first.q > 0)
    hunks.push({
      pStart: 0,
      pEnd: first.p,
      qStart: 0,
      qEnd: first.q,
      outer: true,
    });
  let open: EditHunk | null = null;
  for (let k = first.op, i = first.p, j = first.q; k < coreEnd.op; k += 1) {
    if (ops[k] === "=") {
      if (open) hunks.push(open);
      open = null;
      i += 1;
      j += 1;
      continue;
    }
    open ??= { pStart: i, pEnd: i, qStart: j, qEnd: j, outer: false };
    if (ops[k] === "-") {
      i += 1;
      open.pEnd = i;
    } else {
      j += 1;
      open.qEnd = j;
    }
  }
  if (open) hunks.push(open);
  if (coreEnd.p < n || coreEnd.q < m)
    hunks.push({
      pStart: coreEnd.p,
      pEnd: n,
      qStart: coreEnd.q,
      qEnd: m,
      outer: true,
    });
  return { matched: table[0] ?? 0, hunks };
}

/**
 * 셀 고친 곳 — 표지(빈칸 · 원문자) 자리에 닿은 것 + 본체 안에서 문항 쪽 글이 **있는** 바꿈.
 * 표지와 떨어진 순수 생략(원문 문장을 건너뛴 발췌)은 «고친 곳»이 아니다 — 2026-09-30 sonnet 표본:
 * 어법 오류는 한 곳인데 중간 문장 둘을 건너뛰어 «고친 곳 셋»으로 세졌다.
 */
function countedHunks(alignment: Alignment, anchors: number[]): EditHunk[] {
  return alignment.hunks.filter(
    (h) =>
      anchors.some((a) => h.qStart <= a && a <= h.qEnd) ||
      (!h.outer && h.qEnd > h.qStart),
  );
}

// ─────────────────────────────────────────────
// 문항 검사
// ─────────────────────────────────────────────

const HANGUL = /[가-힣]/g;
const LATIN = /[A-Za-z]/g;
function ratio(text: string, pattern: RegExp): number {
  const letters = (text.match(/[A-Za-z가-힣]/g) ?? []).length;
  return letters ? (text.match(pattern) ?? []).length / letters : 0;
}

const AOTA =
  /all of the above|none of the above|모두\s*(옳|맞|정답)|정답\s*없음|해당\s*없음/i;
const ABSOLUTE =
  /\b(always|never|only|all|none|every|completely|entirely|must)\b|항상|절대|반드시|전혀|모든|오직|결코/i;

function check(
  code: string,
  kind: EnglishCheckKind,
  ok: boolean,
  message: string,
): EnglishCheck {
  return { code, kind, ok, message };
}

/**
 * 표면 단서 셋 — 결정적 검사(여기)와 편집 화면의 «확인해 볼 곳»(`notes.ts`)이 같은 판정을 쓴다(3자 합의 25 §12.13).
 * 보기가 글인 유형만(어법 밑줄 · 삽입 자리 번호는 제외).
 */
export const ENGLISH_SURFACE_CUE_TYPES: readonly EnglishQuestionType[] = [
  "주제",
  "내용 일치",
  "빈칸 추론",
];

/** «모두 옳다 / 정답 없음» 꼴 — 찾은 표현(없으면 null) */
export function aotaMatch(option: string): string | null {
  return AOTA.exec(option)?.[0] ?? null;
}

/** 절대어(always · only · every · 모든 …) — 찾은 낱말들(순서대로) */
export function absoluteWords(text: string): string[] {
  return [...text.matchAll(new RegExp(ABSOLUTE.source, "gi"))].map((m) => m[0]);
}

/**
 * 절대어가 오답에만 — 오답 둘 이상에 있고 정답에는 없을 때 그 오답의 번호(0부터). 아니면 null.
 */
export function absoluteOnlyDistractors(
  question: Pick<EnglishQuestion, "options" | "answer">,
): number[] | null {
  const answerIndex = Number(question.answer) - 1;
  const hits = question.options.flatMap((option, i) =>
    i !== answerIndex && ABSOLUTE.test(option) ? [i] : [],
  );
  return hits.length >= 2 && !ABSOLUTE.test(question.options[answerIndex] ?? "")
    ? hits
    : null;
}

/** 정답 번호 쏠림 — 객관식이 넷 이상이고 한 번호가 절반을 넘으면 그 번호와 수. 아니면 null */
export function answerSpread(
  questions: readonly Pick<EnglishQuestion, "type" | "answer">[],
): { answer: string; count: number; total: number } | null {
  const objective = questions.filter(
    (question) => !ENGLISH_OPEN_TYPES.includes(question.type),
  );
  if (objective.length < 4) return null;
  const counts = new Map<string, number>();
  for (const question of objective)
    counts.set(question.answer, (counts.get(question.answer) ?? 0) + 1);
  let top: [string, number] | null = null;
  for (const entry of counts) if (!top || entry[1] > top[1]) top = entry;
  return top && top[1] > objective.length / 2
    ? { answer: top[0], count: top[1], total: objective.length }
    : null;
}

/** 해설이 «정답은 ③» 처럼 다른 번호를 정답이라 하면 어긋남 */
export function explanationNumber(explanation: string): string | null {
  const match =
    /정답\s*(?:은|는|:|=)?\s*([①-⑤]|[1-5])(?!\d)/.exec(explanation) ??
    /([①-⑤])\s*번?\s*(?:이|가)?\s*정답/.exec(explanation);
  if (!match) return null;
  const mark = match[1]!;
  const circled = CIRCLED.indexOf(mark as (typeof CIRCLED)[number]);
  return circled >= 0 ? String(circled + 1) : mark;
}

function scoringElements(explanation: string): boolean {
  const points = (explanation.match(/\d+(?:\.\d+)?\s*점/g) ?? []).length;
  if (points >= 2) return true;
  const parts = explanation
    .split(/[·\n•;]|\(\d\)|[①-⑤]|\d\)/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
  return parts.length >= 2 && /점|요소|포함|채점|감점|인정/.test(explanation);
}

/** 문항 속 지문으로 인정할 분량 — 원문의 절반, 또는 40단어(발췌 지문 — 내신 변형에서 흔하다) */
function enoughPassage(passageTokens: string[]): number {
  return Math.min(passageTokens.length * 0.5, 40);
}

function variantChecks(
  question: EnglishQuestion,
  passage: string,
  passageTokens: string[],
): EnglishCheck[] {
  const out: EnglishCheck[] = [];
  const answerIndex = Number(question.answer) - 1;

  if (question.type === "문장 삽입") {
    const tok = tokenizeEnglish(question.prompt);
    const allMarkers = tok.markers.every((m) => m !== null);
    out.push(
      check(
        "insert.markers",
        "structure",
        allMarkers,
        "①~⑤ 자리 표시가 다 있어야 합니다.",
      ),
      check(
        "insert.options",
        "structure",
        question.options.every((option, i) =>
          new RegExp(`${CIRCLED[i]}|^\\(?${i + 1}\\)?$`).test(option.trim()),
        ),
        "보기는 ①~⑤ 자리여야 합니다.",
      ),
    );
    // 주어진 문장 = 원문 문장 가운데, 첫 등장을 걷어 내면 «빠진 곳 하나»가 되는 것
    let best: {
      hunks: EditHunk[];
      q: string[];
      markers: (number | null)[];
      matched: number;
    } | null = null;
    for (const sentenceTokens of sentenceTokenRuns(passage)) {
      // 주어진 문장은 문항 글의 맨 앞에 따로 보인다(발문 뒤 첫 영어) — 본문 문장을 «주어진 문장»으로 오인하지 않게.
      // 맨 끝은 인정하지 않는다: 본문 마지막 문장과 가려지지 않는다(2026-09-30 시험 표본).
      const at = indexOfRun(tok.tokens, sentenceTokens);
      if (at !== 0) continue;
      const q = [
        ...tok.tokens.slice(0, at),
        ...tok.tokens.slice(at + sentenceTokens.length),
      ];
      const markers = tok.markers.map((m) =>
        m === null
          ? null
          : m >= at + sentenceTokens.length
            ? m - sentenceTokens.length
            : m > at
              ? at
              : m,
      );
      const alignment = alignTokens(passageTokens, q);
      // 셀 것은 둘뿐 — 주어진 문장이 빠진 자리(원문 쪽이 그 문장으로 시작하거나 끝나는 순수 생략: 발췌 앞뒤와 붙어
      // 있을 수 있다) · 본체 안에서 글을 바꾼 곳. 발췌 경계의 생략은 ( ⑤ ) 자리에 닿아도 세지 않는다(2026-09-30 opus 표본).
      const given = sentenceTokens.join(" ");
      const hunks = alignment.hunks.filter((h) => {
        const removed = passageTokens.slice(h.pStart, h.pEnd).join(" ");
        const relocation =
          h.qStart === h.qEnd &&
          (removed === given ||
            removed.startsWith(`${given} `) ||
            removed.endsWith(` ${given}`));
        return relocation || (!h.outer && h.qEnd > h.qStart);
      });
      if (
        !best ||
        hunks.length < best.hunks.length ||
        (hunks.length === best.hunks.length && alignment.matched > best.matched)
      )
        best = { hunks, q, markers, matched: alignment.matched };
    }
    const single =
      !!best &&
      best.hunks.length === 1 &&
      best.hunks[0]!.qStart === best.hunks[0]!.qEnd;
    out.push(
      check(
        "insert.given-in-passage",
        "structure",
        !!best,
        "주어진 문장이 원 지문(passage)의 문장이 아닙니다.",
      ),
      check(
        "variant.has-passage",
        "structure",
        !!best && best.matched >= enoughPassage(passageTokens),
        "문항 안에 자리 표시가 든 지문이 있어야 합니다.",
      ),
      check(
        "variant.single-edit",
        "structure",
        single,
        "주어진 문장은 본문에서 빠져 있어야 합니다(한 문장만).",
      ),
    );
    const slot = best?.markers[answerIndex];
    out.push(
      check(
        "insert.answer-slot",
        "structure",
        single &&
          slot !== null &&
          slot !== undefined &&
          slot === best!.hunks[0]!.qStart,
        "정답 번호가 주어진 문장의 원래 자리와 다릅니다.",
      ),
    );
    return out;
  }

  const tok = tokenizeEnglish(question.prompt);
  const alignment = alignTokens(passageTokens, tok.tokens);
  const anchors = [
    ...tok.blanks,
    ...tok.markers.filter((m): m is number => m !== null),
  ];
  const hunks = countedHunks(alignment, anchors);
  const hasPassage = alignment.matched >= enoughPassage(passageTokens);
  out.push(
    check(
      "variant.has-passage",
      "structure",
      hasPassage,
      "문항 안에 문제용 지문이 있어야 합니다.",
    ),
  );

  if (question.type === "빈칸 추론") {
    const blanks = question.prompt.match(BLANK_RUN)?.length ?? 0;
    out.push(
      check(
        "blank.marker",
        "structure",
        blanks === 1,
        "빈칸(____)은 하나여야 합니다.",
      ),
      check(
        "variant.single-edit",
        "structure",
        hasPassage && hunks.length === 1,
        "원문에서 빈칸으로 바뀐 곳이 한 군데여야 합니다.",
      ),
    );
    return out;
  }

  // 어법
  out.push(
    check(
      "grammar.markers",
      "structure",
      tok.markers.every((m) => m !== null),
      "밑줄 ①~⑤ 표지가 다 있어야 합니다.",
    ),
  );
  const optionTokens = question.options.map(
    (option) => tokenizeEnglish(stripOptionMarker(option)).tokens,
  );
  out.push(
    check(
      "grammar.distractors-in-passage",
      "structure",
      optionTokens.every(
        (tokens, i) => i === answerIndex || containsRun(passageTokens, tokens),
      ),
      "정답이 아닌 밑줄은 원문 표현 그대로여야 합니다.",
    ),
    check(
      "variant.single-edit",
      "structure",
      hasPassage && hunks.length === 1,
      "원문에서 틀리게 고친 곳이 정확히 한 군데여야 합니다.",
    ),
  );
  const start = tok.markers[answerIndex];
  const span = Math.max(1, optionTokens[answerIndex]?.length ?? 1);
  const hunk = hunks[0];
  out.push(
    check(
      "grammar.answer-is-edit",
      "structure",
      hunks.length === 1 &&
        start !== null &&
        start !== undefined &&
        hunk !== undefined &&
        hunk.qStart <= start + span &&
        start <= Math.max(hunk.qEnd, hunk.qStart),
      "정답 밑줄이 원문에서 고친 곳이어야 합니다.",
    ),
  );
  if (question.type === "어휘") out.push(...vocabUnderlineChecks(question));
  return out;
}

const VOCAB_MARKS = ["①", "②", "③", "④", "⑤"] as const;

/** 어휘만 — 밑줄 다섯이 보기와 같은지. 어법 문장은 바꾸지 않는다. */
function vocabUnderlineChecks(question: EnglishQuestion): EnglishCheck[] {
  const pairs = [...question.prompt.matchAll(/([①-⑤])\s*<u>([\s\S]*?)<\/u>/gi)];
  const marks = pairs.map((match) => match[1] ?? "");
  const unique = new Set(marks);
  const markersOk =
    pairs.length === VOCAB_MARKS.length &&
    unique.size === VOCAB_MARKS.length &&
    VOCAB_MARKS.every((mark) => unique.has(mark));
  const texts = new Map(
    pairs.map((match) => [
      match[1],
      (match[2] ?? "").replace(/\s+/g, " ").trim().toLowerCase(),
    ]),
  );
  const optionsOk =
    markersOk &&
    question.options.length === VOCAB_MARKS.length &&
    question.options.every((option, index) => {
      const underlined = texts.get(VOCAB_MARKS[index]);
      const value = stripOptionMarker(stripMarkup(option))
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      return (
        underlined !== undefined && value === underlined && value.length > 0
      );
    });
  return [
    check(
      "vocab.markers",
      "structure",
      markersOk,
      "어휘 밑줄 ①~⑤ 가 각각 한 번씩 <u> 구간과 대응해야 합니다.",
    ),
    check(
      "vocab.options-match",
      "structure",
      optionsOk,
      "어휘 보기는 그 번호의 밑줄과 같아야 합니다.",
    ),
  ];
}

/** 원문 문장마다의 단어 토큰 — 토큰에는 문장 끝 표시가 없어 원문 글에서 나눈다 */
function sentenceTokenRuns(passage: string): string[][] {
  return splitEnglishSentences(passage)
    .map((sentence) => tokenizeEnglish(sentence).tokens)
    .filter((tokens) => tokens.length >= 3);
}

function questionChecks(
  question: EnglishQuestion,
  passage: string,
  passageTokens: string[],
): EnglishCheck[] {
  const out: EnglishCheck[] = [];
  const open = ENGLISH_OPEN_TYPES.includes(question.type);
  const answerIndex = Number(question.answer) - 1;

  out.push(
    check(
      "format.escape-residue",
      "structure",
      ![
        question.prompt,
        ...question.options,
        question.explanation,
        question.answer,
      ].some((text) => /\\[ntr]/.test(text)),
      "글자 그대로의 이스케이프(\\n 등)가 남아 있습니다.",
    ),
  );
  if (
    question.type === "어법" ||
    question.type === "어휘" ||
    question.type === "빈칸 추론" ||
    question.type === "문장 삽입"
  )
    out.push(...variantChecks(question, passage, passageTokens));

  if (question.type === "주제")
    out.push(
      check(
        "topic.english-options",
        "structure",
        question.options.every((option) => ratio(option, LATIN) >= 0.7),
        "주제 보기는 영어여야 합니다.",
      ),
    );
  if (question.type === "내용 일치")
    out.push(
      check(
        "match.korean-options",
        "structure",
        question.options.every((option) => ratio(option, HANGUL) >= 0.5),
        "내용 일치 보기는 한국어 문장이어야 합니다.",
      ),
      check(
        "match.stem-polarity",
        "structure",
        /일치/.test(question.prompt),
        "발문에 «일치하는» 또는 «일치하지 않는»을 밝혀야 합니다.",
      ),
    );
  if (question.type === "서술형")
    out.push(
      check(
        "open.criteria",
        "structure",
        scoringElements(question.explanation),
        "채점 기준에 부분점수 요소가 둘 이상 있어야 합니다.",
      ),
      check(
        "open.answer",
        "structure",
        question.answer.trim().length >= 5,
        "모범 답안이 너무 짧습니다.",
      ),
    );

  // IWF 표면 단서 — 보기가 글인 유형만(어법 밑줄 · 삽입 자리 번호는 제외)
  if (ENGLISH_SURFACE_CUE_TYPES.includes(question.type)) {
    const lengths = question.options.map((option) => option.trim().length);
    const correct = lengths[answerIndex] ?? 0;
    const others = lengths.filter((_, i) => i !== answerIndex);
    const second = Math.max(0, ...others);
    out.push(
      check(
        "iwf.longest-correct",
        "iwf",
        !(correct > second && correct >= second * 1.3),
        "정답 보기만 유독 깁니다.",
      ),
      check(
        "iwf.aota",
        "iwf",
        !question.options.some((option) => aotaMatch(option) !== null),
        "«모두 옳다 / 정답 없음» 같은 보기를 쓰지 않습니다.",
      ),
    );
    out.push(
      check(
        "iwf.absolute-only-distractors",
        "iwf",
        absoluteOnlyDistractors(question) === null,
        "절대어(always · never · 모든 …)가 오답에만 몰려 있습니다.",
      ),
    );
  }

  // 근거 · 번호 일관성
  const evidence = normalizeEnglishText(question.evidence);
  out.push(
    check(
      "evidence.quote",
      "evidence",
      !!evidence && normalizeEnglishText(passage).includes(evidence),
      "근거가 지문의 연속 인용이 아닙니다.",
    ),
    check(
      "evidence.substantive",
      "evidence",
      evidence.split(" ").filter(Boolean).length >= 4,
      "근거 인용이 너무 짧습니다.",
    ),
  );
  if (!open) {
    const said = explanationNumber(question.explanation);
    out.push(
      check(
        "answer.explanation-consistent",
        "evidence",
        said === null || said === question.answer,
        "해설이 가리키는 정답 번호가 정답과 다릅니다.",
      ),
    );
  }
  return out;
}

// ─────────────────────────────────────────────
// 세트
// ─────────────────────────────────────────────

function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i += 1)
    out.push(tokens.slice(i, i + n).join(" "));
  return out;
}

function setChecks(
  draft: EnglishDraft,
  passageTokens: string[],
  expect?: EnglishQualityExpectation,
): EnglishCheck[] {
  const out: EnglishCheck[] = [];
  const objectiveCount = draft.questions.filter(
    (question) => !ENGLISH_OPEN_TYPES.includes(question.type),
  ).length;
  if (objectiveCount >= 4)
    out.push(
      check(
        "set.answer-spread",
        "set",
        answerSpread(draft.questions) === null,
        "정답 번호가 한 번호에 몰려 있습니다.",
      ),
    );
  if (!expect) return out;
  if (expect.mode === "original")
    out.push(
      check(
        "passage.original",
        "set",
        normalizeEnglishText(draft.passage) ===
          normalizeEnglishText(expect.passage),
        "원문 유지 모드인데 지문이 바뀌었습니다.",
      ),
    );
  if (expect.mode !== "original" && expect.words) {
    const words = draft.passage.split(/\s+/).filter(Boolean).length;
    out.push(
      check(
        "passage.length",
        "set",
        Math.abs(words - expect.words) / expect.words <= 0.25,
        `지문 길이가 요청(${expect.words}단어)과 많이 다릅니다 (${words}단어).`,
      ),
    );
  }
  if (expect.mode === "variation") {
    const source = new Set(ngrams(tokenizeEnglish(expect.passage).tokens, 8));
    const grams = ngrams(passageTokens, 8);
    const copied = grams.filter((gram) => source.has(gram)).length;
    out.push(
      check(
        "passage.variation-distance",
        "set",
        grams.length > 0 && copied / grams.length < 0.3,
        "변형 지문이 원문을 거의 그대로 옮겼습니다.",
      ),
    );
  }
  return out;
}

/** 초안 하나를 잰다 — 계약을 지난 초안을 받는다(모양이 틀리면 검증기가 먼저 막는다) */
export function reviewEnglishDraft(
  draft: EnglishDraft,
  expect?: EnglishQualityExpectation,
): EnglishDraftReport {
  const passageTokens = tokenizeEnglish(draft.passage).tokens;
  return {
    questions: draft.questions.map((question, index) => ({
      question: index,
      type: question.type,
      checks: questionChecks(question, draft.passage, passageTokens),
    })),
    set: setChecks(draft, passageTokens, expect),
  };
}
