/**
 * 개념 백지 지면(D-150)의 글 도구 — 뜻 문장 쪼개기 · 빈칸 길이 · 글 폭 어림 · 날짜 · 동그라미 번호.
 * 모두 순수 함수다(서버 인쇄 페이지 · 화면 미리보기 · 쪽 나누기가 같이 쓴다).
 */

/** 뜻 문장 조각 — 글(수식 `$...$` 이 섞일 수 있다) 또는 핵심어(`{ }` 안). */
export type SentencePiece =
  { kind: "text"; text: string } | { kind: "key"; text: string };

/**
 * 뜻 문장을 글 · 핵심어 조각으로 나눈다. `{ }` 는 핵심어 자리다.
 * 🔴 `$...$` 안의 `{ }` 는 TeX 묶음(`\frac{1}{2}`)이라 핵심어로 보지 않고 글에 그대로 둔다 —
 * 수식이 없는 문장에서는 계약의 `blankKeywords` 와 같은 조각이 나온다.
 */
export function splitSentence(sentence: string): SentencePiece[] {
  const pieces: SentencePiece[] = [];
  let text = "";
  let i = 0;
  while (i < sentence.length) {
    const ch = sentence[i]!;
    if (ch === "$") {
      const close = sentence.indexOf("$", i + 1);
      const end = close < 0 ? sentence.length : close + 1;
      text += sentence.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "{") {
      const close = sentence.indexOf("}", i + 1);
      const inner = close < 0 ? "" : sentence.slice(i + 1, close);
      if (close > i + 1 && !/[{$]/.test(inner)) {
        if (text) pieces.push({ kind: "text", text });
        text = "";
        pieces.push({ kind: "key", text: inner.trim() });
        i = close + 1;
        continue;
      }
    }
    text += ch;
    i += 1;
  }
  if (text) pieces.push({ kind: "text", text });
  return pieces;
}

/** 문장의 핵심어 — 빈칸 · 채점표 굵은 글. */
export const sentenceKeywords = (sentence: string): string[] =>
  splitSentence(sentence)
    .filter((p) => p.kind === "key")
    .map((p) => p.text);

/** 핵심어를 뺀 읽기용 문장(채점표 · 지도 · 이름표의 글 폭 어림에 쓴다). */
export const plainSentence = (sentence: string): string =>
  splitSentence(sentence)
    .map((p) => p.text)
    .join("");

/**
 * 글 폭(em) 어림 — 지면 명조 기준. 한글 · 한자 · 기호는 1em, 라틴 · 숫자 0.62em, 띄어쓰기 0.3em,
 * 문장부호 0.5em. `$...$` 은 TeX 원문 글자당 0.62em(명령어가 줄어 보이는 만큼 넉넉하다).
 * 🔴 쪽 나누기가 DOM 을 재지 않고 이 값으로 줄 수를 어림한다 — 모자라게 재면 넘친다. 크게 잡는다.
 */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (ch === " " || ch === " ") em += 0.3;
    else if (/[A-Za-z0-9]/.test(ch)) em += 0.62;
    else if (/[.,:;!?'"()[\]{}\-–·/$\\^_=+<>|]/.test(ch)) em += 0.5;
    else em += 1;
  }
  return em;
}

/**
 * 줄 수 어림 — 폭 `widthPx` 칸에 `fontPx` 글자로 쓴 글이 몇 줄인가. `extraPx` 는 줄 안에 끼는 빈칸 등.
 * 한글은 글자 사이에서 끊겨 줄이 거의 꽉 차지만, 끊기지 않는 조각(빈칸 · 수식 · 라틴 낱말) 때문에 칸의 95% 만 찬다고 본다
 * (Playwright 실측 — 88% 로 잡으면 한 줄 글을 두 줄로 어림해 장이 반쯤 빈 채 넘어갔다).
 */
export function estimateLines(
  text: string,
  fontPx: number,
  widthPx: number,
  extraPx = 0,
): number {
  const px = textEm(text) * fontPx + extraPx;
  return Math.max(1, Math.ceil(px / (widthPx * 0.95)));
}

/** 빈칸 밑줄 길이(px) — 핵심어 글자 폭에 비례(시안: 두 글자 56 · 여섯 글자 110). */
export function blankWidth(keyword: string): number {
  return Math.round(Math.min(260, Math.max(36, textEm(keyword) * 14 + 24)));
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `2026-10-01` → `2026. 10. 1 (목)`. 틀린 날짜는 null. */
export function formatSheetDate(date: string | null): string | null {
  const m = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(y, mo - 1, d));
  if (at.getUTCMonth() !== mo - 1 || at.getUTCDate() !== d) return null;
  return `${y}. ${mo}. ${d} (${WEEKDAYS[at.getUTCDay()]})`;
}

/** 동그라미 번호 ①~㊿ — 그 밖은 `(n)`. */
export function circled(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
  if (n >= 21 && n <= 35) return String.fromCodePoint(0x3251 + n - 21);
  if (n >= 36 && n <= 50) return String.fromCodePoint(0x32b1 + n - 36);
  return `(${n})`;
}
