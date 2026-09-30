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
 * 글자 폭(em) 표 — 지면 명조 · 고딕, 굵기 400~900 에서 **가장 넓게 잰 값**을 0.05 단위로 올렸다
 * (2026-09-30 Playwright 인쇄 매체 · `e2e/concept-blank-paper/estimate.spec.ts` 가 «표 ≥ 실제»를 잠근다).
 * 표에 없는 글자는 한글 1em, 그 밖(전각 기호 · 동그라미 번호 · 긴 줄표)은 1.03em.
 */
const EM_TABLE: ReadonlyArray<readonly [number, string]> = [
  [0.26, "‘’"],
  [0.3, "'"],
  [0.35, ",.:;|·"],
  [0.4, "fijl{}"],
  [0.42, "°²³"],
  [0.45, "!()-/IJ[]t"],
  [0.5, "*`“”"],
  [0.55, '"?rsz'],
  [0.6, "1acevy"],
  [0.62, "023456789–"],
  [0.65, "#$LSZ_gox"],
  [0.7, "EFPbdhknpquπ"],
  [0.75, "+<=>BCTVXY^~"],
  [0.8, "ADGKR\\"],
  [0.85, "NOQU"],
  [0.9, "&Hw"],
  [1, "%@"],
  [1.05, "Mm"],
  [1.15, "W"],
];
const EM_OF = new Map<string, number>(
  EM_TABLE.flatMap(([em, chars]) => [...chars].map((ch) => [ch, em] as const)),
);
/** 띄어쓰기 — 명조 0.31em · 고딕 0.352em 가운데 넓은 쪽. */
export const SPACE_EM = 0.36;
const NBSP = String.fromCharCode(160);

/**
 * 글 폭(em) 어림 — 글자마다 `EM_TABLE` 의 폭을 더한다. `$...$` 은 TeX 원문 글자를 그대로 센다(명령어가 줄어 보이는 만큼 넉넉하다).
 * 🔴 쪽 나누기가 DOM 을 재지 않고 이 값으로 줄 수를 어림한다 — 모자라게 재면 넘친다. 실제보다 작지 않게 잡는다.
 */
export function textEm(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (ch === " " || ch === NBSP) em += SPACE_EM;
    else if (ch >= "가" && ch <= "힣") em += 1;
    else em += EM_OF.get(ch) ?? 1.03;
  }
  return em;
}

/** 글을 끊기지 않는 덩이로 — 띄어쓰기에서만 나눈다(지면은 `word-break: keep-all`). `$...$` 은 안의 띄어쓰기까지 한 덩이. */
function words(text: string): string[] {
  return text.match(/\$[^$]*\$?|[^\s$]+/g) ?? [];
}

/** 줄 안에 끼는 끊기지 않는 조각 — 글 한 덩이 · 빈칸 하나. `glue` 는 앞 조각과 띄어 쓰는 폭(줄 첫머리면 버린다). */
export type InlineAtom = { px: number; glue: number };

/** KaTeX 글씨는 본문의 1.21배다(`.katex { font-size: 1.21em }`). */
const KATEX_SCALE = 1.21;

/** 글자를 그리지 않고 꼴만 바꾸는 명령어 — 분수 · 근호 · 괄호 늘이기 · 글꼴 · 윗줄 · 작은 띄움. 자리는 조금만 먹는다. */
const SHAPE_COMMAND =
  /^\\(?:d?frac|tfrac|cfrac|sqrt|left|right|big+[lr]?|displaystyle|textstyle|text|mathrm|mathbf|mathit|operatorname|overline|underline|bar|hat|vec|dot|tilde|begin|end|[,!;: ])$/i;

/**
 * 수식 조각(`$...$`)의 폭(본문 em) 어림 — TeX 원문 길이가 아니라 **그려지는 것**을 센다: 기호 명령어(`\times` · `\neq` …)
 * 하나는 넓은 글자 하나에 연산자 좌우 띄움을 더한 1.61em, 꼴만 바꾸는 명령어(`\frac` · `\sqrt` · `\left` …)는 0.9em,
 * 묶음 · 첨자 기호(`{ } ^ _`)는 0, 나머지 글자는 글자 폭, 등호 · 부등호 · 덧뺄셈은 좌우 띄움 0.56em 을 더한다.
 * 분수 · 첨자는 위아래로 쌓여 실제는 이보다 좁다(넉넉한 쪽 — `estimate.spec.ts` 가 어림 ≥ 실제를 잠근다).
 */
export function mathEm(segment: string): number {
  let em = 0;
  const shown = segment
    .replace(/^\$|\$$/g, "")
    .replace(/\\[a-zA-Z]+|\\./g, (command) => {
      em += SHAPE_COMMAND.test(command) ? 0.9 : 1.61;
      return "";
    });
  for (const ch of shown) {
    if (/[{}^_\s]/.test(ch)) continue;
    em += textEm(ch) + (/[=<>+\-]/.test(ch) ? 0.56 : 0);
  }
  return em * KATEX_SCALE;
}

/** 글 → 조각들. 글자 폭은 `textEm`(넉넉한 값), 수식 조각은 `mathEm`, 띄어쓰기는 `SPACE_EM`. */
export function textAtoms(text: string, fontPx: number): InlineAtom[] {
  const lead = /^\s/.test(text);
  return words(text).map((word, i) => ({
    px: (word.startsWith("$") ? mathEm(word) : textEm(word)) * fontPx,
    glue: i > 0 || lead ? SPACE_EM * fontPx : 0,
  }));
}

/**
 * 조각들을 폭 `widthPx` 칸에 앞에서부터 채우면 몇 줄인가 — 브라우저의 줄 나눔(낱말 사이에서만 끊고, 한 줄보다 긴
 * 덩이만 글자에서 끊는다)을 그대로 흉내 낸다. 글자 폭을 넉넉히 잡아 실제보다 줄이 적게 나오지 않는다.
 */
export function wrapLines(
  atoms: readonly InlineAtom[],
  widthPx: number,
): number {
  let lines = 1;
  let x = 0;
  for (const atom of atoms) {
    const need = (x > 0 ? atom.glue : 0) + atom.px;
    if (x > 0 && x + need > widthPx) {
      lines += 1;
      x = 0;
    }
    if (x === 0 && atom.px > widthPx) {
      // 한 줄보다 긴 덩이 — 글자에서 끊긴다
      lines += Math.ceil(atom.px / widthPx) - 1;
      x = atom.px % widthPx || widthPx;
    } else x += x > 0 ? need : atom.px;
  }
  return lines;
}

/**
 * 줄 수 어림 — 폭 `widthPx` 칸에 `fontPx` 글자로 쓴 글이 몇 줄인가. 지면은 낱말 사이에서만 줄을 바꾸므로
 * (`word-break: keep-all`) 글자 넓이를 칸 넓이로 나누지 않고 낱말을 한 줄씩 채워 센다.
 */
export function estimateLines(
  text: string,
  fontPx: number,
  widthPx: number,
): number {
  return wrapLines(textAtoms(text, fontPx), widthPx);
}

/**
 * 빈칸 밑줄 길이(px) — 핵심어 글자 폭에 비례한다. 손글씨는 활자보다 커서 글자마다 본문 한 글자(14px)에 좌우 여유
 * 24px 을 더하고, 한 글자 답도 쓸 수 있게 `min`, 줄 하나를 혼자 먹지 않게 `max` 로 막는다(시안: 두 글자 56 · 여섯 글자 110).
 */
export const BLANK_WIDTH = { perEm: 14, pad: 24, min: 40, max: 240 } as const;

export function blankWidth(keyword: string): number {
  const { perEm, pad, min, max } = BLANK_WIDTH;
  return Math.round(
    Math.min(max, Math.max(min, textEm(keyword) * perEm + pad)),
  );
}

/** 빈칸 좌우 여백(px) — `paper.module.css` 의 `.blank { margin: 0 3px }` 와 짝. */
export const BLANK_MARGIN = 6;

/** 빈칸이 낀 문장 → 조각들(글 덩이 · 빈칸). 빈칸은 끊기지 않고, 앞뒤 어디서나 줄이 바뀔 수 있다. */
export function sentenceAtoms(sentence: string, fontPx: number): InlineAtom[] {
  const pieces = splitSentence(sentence);
  return pieces.flatMap((piece, i) => {
    if (piece.kind === "text") return textAtoms(piece.text, fontPx);
    const spaced = /\s$/.test(pieces[i - 1]?.text ?? "");
    return [
      {
        px: blankWidth(piece.text) + BLANK_MARGIN,
        glue: spaced ? SPACE_EM * fontPx : 0,
      },
    ];
  });
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
