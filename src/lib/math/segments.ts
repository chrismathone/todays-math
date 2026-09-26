/**
 * 혼합 본문(한글 + `$...$` / `$$...$$`)을 텍스트/수식 조각으로 나눈다.
 *
 * renderMathHtml(문자열 HTML 경로)과 parseProblemContent(지문/보기 분해)가 같은
 * 토크나이저를 쓴다 — 수식 경계 판정이 두 곳에서 갈리면 침묵 회귀가 난다.
 */

export type Segment =
  | { type: "text"; value: string }
  | { type: "inline" | "display"; value: string };

export function tokenizeMath(input: string): Segment[] {
  const parts: Segment[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    if (input.startsWith("$$", i)) {
      const end = input.indexOf("$$", i + 2);
      if (end === -1) {
        parts.push({ type: "text", value: input.slice(i) });
        break;
      }
      parts.push({ type: "display", value: input.slice(i + 2, end) });
      i = end + 2;
      continue;
    }

    if (input[i] === "$" && input[i - 1] !== "\\") {
      let end = i + 1;
      while (end < n) {
        if (input[end] === "$" && input[end - 1] !== "\\") break;
        end += 1;
      }
      if (end >= n) {
        parts.push({ type: "text", value: input.slice(i) });
        break;
      }
      parts.push({ type: "inline", value: input.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    let j = i + 1;
    while (j < n) {
      if (input.startsWith("$$", j)) break;
      if (input[j] === "$" && input[j - 1] !== "\\") break;
      j += 1;
    }
    parts.push({ type: "text", value: input.slice(i, j) });
    i = j;
  }

  return parts;
}

/* ──────────────────────────────────────────────────────────────────────────
 * 수식 구간의 **자리** — 짝의 시작을 아는 한 벌 (2026-09-26, 후보정 트랙 T3).
 *
 * 🔴 이 저장소에서 `$` 짝을 세는 정규식이 **짝의 시작 자리를 몰라서** 정상 해설이 샜다.
 *    `/\$([^$\n]+)\$\$([^$\n]+)\$/`(붙은 수식 떼기)·`/\$\$…\$\$/`(표시식 문단)는 앞 인라인의
 *    **닫는** `$` 부터 읽어, `$8$ 이고 $$s=8$$` 를 `$ $$\displaystyle s=8$$$` 로, `$A$$B$` 의
 *    «닫고-여는» `$$` 를 표시식으로 만들었다. 왼쪽부터 한 번 훑는 `tokenizeMath` 는 그 자리를
 *    안다 — 그래서 **자리는 여기서만** 센다.
 * ────────────────────────────────────────────────────────────────────────── */

export interface MathSpan {
  type: "inline" | "display";
  /** 여는 구분자 자리 */
  start: number;
  /** 닫는 구분자 **다음** 자리 */
  end: number;
  /** 구분자 안쪽 */
  value: string;
}

/** `tokenizeMath` 와 같은 규칙으로 수식 구간의 자리를 낸다(조각을 이으면 원문 그대로다). */
export function findMathSpans(input: string): MathSpan[] {
  const spans: MathSpan[] = [];
  let at = 0;
  for (const seg of tokenizeMath(input)) {
    if (seg.type === "text") {
      at += seg.value.length;
      continue;
    }
    const width = seg.value.length + (seg.type === "display" ? 4 : 2);
    spans.push({
      type: seg.type,
      start: at,
      end: at + width,
      value: seg.value,
    });
    at += width;
  }
  return spans;
}

/** 수식 안에서 글자 모드가 되는 묶음 — 이 안의 `$…$` 는 «글 속 수식»이다(TeX·KaTeX 가 그린다). */
const TEXT_MODE_GROUP =
  /^\\(?:text|textrm|textbf|textit|textsf|textnormal|mbox|hbox)\s*\{/;

/**
 * 인라인 `$…$` 하나를 **중괄호를 세며** 읽는다. `\text{… $x$ …}` 속 `$` 를 만나면 그것을
 * `\(…\)` 로 옮겨 적은 글을 돌려준다. 속 수식이 없으면 원문 조각 그대로다.
 * 닫는 `$` 는 `tokenizeMath` 와 같다(바로 앞이 `\` 면 닫지 않는다). 짝이 없으면 null.
 */
function readInlineWithTextGroups(
  text: string,
  open: number,
): { end: number; text: string } | null {
  const groups: boolean[] = []; // true = 글자 모드 묶음
  let out = "$";
  let from = open + 1;
  let nested = false;
  for (let j = open + 1; j < text.length;) {
    const ch = text[j];
    if (ch === "\\") {
      const group = TEXT_MODE_GROUP.exec(text.slice(j, j + 16));
      if (group) {
        groups.push(true);
        j += group[0].length;
        continue;
      }
      // `\{` `\}` 는 묶음이 아니다 — 두 글자를 한 덩어리로 넘긴다.
      j += text[j + 1] === "{" || text[j + 1] === "}" ? 2 : 1;
      continue;
    }
    if (ch === "{") groups.push(false);
    else if (ch === "}") groups.pop();
    else if (ch === "$" && text[j - 1] !== "\\") {
      if (!groups.includes(true)) {
        out += text.slice(from, j) + "$";
        return { end: j + 1, text: nested ? out : text.slice(open, j + 1) };
      }
      // 글자 모드 속 수식 — 짝 `$` 까지를 `\(…\)` 로.
      let close = j + 1;
      while (
        close < text.length &&
        !(text[close] === "$" && text[close - 1] !== "\\")
      )
        close += 1;
      if (close >= text.length) return null;
      out += `${text.slice(from, j)}\\(${text.slice(j + 1, close)}\\)`;
      nested = true;
      j = close + 1;
      from = j;
      continue;
    }
    j += 1;
  }
  return null;
}

/**
 * `$\text{값이 $x$ 일 때}=3$` — `\text{}` 안의 `$x$` 는 TeX 에서 **글 속 수식**이라 KaTeX 는 그린다.
 * 그런데 remark-math·`tokenizeMath` 는 중괄호를 모르고 속 `$` 에서 바깥 수식을 끊어
 * 붉은 원문(`\displaystyle \text{값이 x 일 때…`)이 됐다. 속 `$…$` 를 같은 뜻의 `\(…\)` 로
 * 옮겨 적으면 모든 구간 나누기가 바깥 수식을 한 덩어리로 본다.
 */
function protectTextModeMath(text: string): string {
  if (!/\\(?:text|mbox|hbox)/.test(text)) return text;
  let out = "";
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch !== "$" || text[i - 1] === "\\") {
      out += ch;
      i += 1;
      continue;
    }
    if (text[i + 1] === "$") {
      const close = text.indexOf("$$", i + 2);
      if (close < 0) return out + text.slice(i);
      out += text.slice(i, close + 2);
      i = close + 2;
      continue;
    }
    const inline = readInlineWithTextGroups(text, i);
    if (!inline) return out + text.slice(i);
    out += inline.text;
    i = inline.end;
  }
  return out;
}

/**
 * 수식 안 `\$`(글자 달러) → `{\char36}`. KaTeX 는 둘을 똑같이 `$` 로 그리지만(수식·글자 모드 모두),
 * remark-math 는 수식 **안**의 `\$` 에서 수식을 닫는다(수식 안에서는 이스케이프가 없다) —
 * `tokenizeMath` 는 거기서 안 닫는다. 그 불일치로 `$\$5 + \$3$` 가 `\displaystyle \5 + $3` 로 샜다.
 */
function literalDollarsInMath(inner: string): string {
  if (!inner.includes("\\$")) return inner;
  let out = "";
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] !== "\\") {
      out += inner[i];
      continue;
    }
    if (inner[i + 1] === "$") out += "{\\char36}";
    else out += inner[i] + (inner[i + 1] ?? ""); // `\\` 등 — 두 글자가 한 덩어리
    i += 1;
  }
  return out;
}

/** 중괄호 밖(깊이 0)에 한글이 있는가 — 짝이 어긋나 산문을 품은 구간을 가려낸다. */
function hasTopLevelHangul(inner: string): boolean {
  let depth = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i]!;
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[가-힣]/.test(ch)) return true;
  }
  return false;
}

/**
 * 여는 `$$`·닫는 `$$` 가 **각자 제 줄에** 홀로 선 울타리 표시식인가(마크다운이 표시식으로 읽는 꼴).
 *
 * 여는 줄에 `\displaystyle` 만 붙은 것도 울타리다 — 렌더 전처리가 스스로 넣는 글자이고,
 * remark-math 는 여는 줄의 나머지를 «메타»로 버리는데 표시식은 어차피 display 크기라 잃는 것이 없다.
 * 그 밖의 글이 여는 줄에 있으면 울타리가 아니다(그 글이 메타로 **사라진다**).
 */
function isFencedDisplay(text: string, span: MathSpan): boolean {
  const lineStart = text.lastIndexOf("\n", span.start - 1) + 1;
  const lineEnd = text.indexOf("\n", span.end);
  return (
    /^[ \t]*$/.test(text.slice(lineStart, span.start)) &&
    /^[ \t]*(?:\\displaystyle\b[ \t]*)?\n[\s\S]*\n[ \t]*$/.test(span.value) &&
    /^[ \t]*$/.test(text.slice(span.end, lineEnd < 0 ? text.length : lineEnd))
  );
}

/**
 * 수식 안 줄바꿈을 공백으로 접을지. **TeX 에서 수식 안 줄바꿈은 공백이다** — 접어도 식은 같다.
 *
 * 접지 않으면 마크다운 층이 그 줄을 읽는다: remark-math 는 줄머리 `$$` 뒤 같은 줄 글을
 * **메타로 버리고** 닫는 `$$` 가 제 줄에 없으면 끝까지 삼켜, 첫 줄 식이 사라지고 뒤 한글이
 * 수식으로 들어갔다. 본문 파서는 그 줄머리에 `\=` 를 넣어 붉게 만들었다.
 *
 * 안 접는 것:
 *  - **울타리 표시식** — 마크다운이 이미 표시식으로 읽는다(가운데 정렬 모양을 지킨다).
 *  - 빈 줄을 품은 구간 — 짝이 어긋나 문단을 건너 묶였을 수 있다(합치면 문단이 사라진다).
 *  - 인라인인데 중괄호 밖에 한글 — 떠돌이 `$` 가 산문을 묶은 것일 수 있다.
 *  - 이스케이프 안 된 `%` — TeX 주석이라 줄을 접으면 뒷줄까지 주석이 된다.
 */
function shouldFoldLines(text: string, span: MathSpan): boolean {
  const { value } = span;
  if (!value.includes("\n")) return false;
  if (/\n[ \t]*\n/.test(value) || /(?<!\\)%/.test(value)) return false;
  return span.type === "display"
    ? !isFencedDisplay(text, span)
    : !hasTopLevelHangul(value);
}

/**
 * 수식 구간을 **모든 구간 나누기가 같은 자리로 읽는 꼴**로 맞춘다 — 렌더 후보정의 첫 단계.
 *
 * 구간 나누기가 네 벌(`tokenizeMath` · remark-math · 전처리 정규식들 · 본문 파서)이라
 * 같은 글을 서로 다르게 읽는 자리에서 샜다. 여기서 그 자리를 없앤다:
 *  ① `\text{… $x$ …}` 속 수식 → `\(x\)` (중괄호를 모르는 쪽이 바깥 수식을 끊지 않게)
 *  ② 붙은 두 수식(`$A$$B$` · `$$A$$$B$` · `$A$$$B$$`) 사이를 한 칸 띄운다 —
 *     짝의 시작 자리는 `findMathSpans` 가 안다(정규식이 닫는 `$` 부터 읽던 결함).
 *  ③ 수식 안 `\$` → `{\char36}` · ④ 수식 안 줄바꿈 → 공백(`shouldFoldLines`).
 *
 * ⚠️ 수식 **안의 식**은 바꾸지 않는다 — 구분자 자리·공백·같은 뜻의 표기만 바꾼다.
 * ⚠️ **멱등**이다 — 한 번 맞춘 글은 다시 넣어도 그대로다(본문 파서와 렌더 전처리가 둘 다 부른다).
 */
export function canonicalizeMathSpans(text: string): string {
  if (!text || !text.includes("$")) return text;
  const source = protectTextModeMath(text);
  const spans = findMathSpans(source);
  if (spans.length === 0) return source;
  let out = "";
  let last = 0;
  spans.forEach((span, index) => {
    out += source.slice(last, span.start);
    const fence = span.type === "display" ? "$$" : "$";
    let inner = literalDollarsInMath(span.value);
    if (shouldFoldLines(source, span))
      inner = inner.replace(/[ \t]*\n[ \t]*/g, " ");
    out += fence + inner + fence;
    last = span.end;
    // 다음 수식이 바로 붙어 있으면 한 칸 띄운다 — remark-math 는 `$A$$B$` 를 수식 **하나**로 읽는다.
    if (spans[index + 1]?.start === span.end) out += " ";
  });
  return out + source.slice(last);
}
