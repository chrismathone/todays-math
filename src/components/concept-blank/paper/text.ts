/**
 * 개념 백지 지면(D-150)의 글 도구 — 뜻 문장 쪼개기 · 빈칸 길이 · 글 폭 어림 · 날짜 · 동그라미 번호.
 * 모두 순수 함수다(서버 인쇄 페이지 · 화면 미리보기 · 쪽 나누기가 같이 쓴다).
 */
import {
  blankKeywords,
  splitBlankSentence,
  type BlankSentencePiece,
} from "@/contracts/conceptBlank.contract";

/**
 * 뜻 문장 가르기는 **계약 한 자리**에만 있다(`splitBlankSentence` — 계약 검사 · 은행 시험 · 지면이 같이 쓴다).
 * 여기서는 지면이 부르던 이름 그대로 넘겨줄 뿐이다 — 가르는 법을 이 파일에 다시 쓰지 않는다.
 */
export type SentencePiece = BlankSentencePiece;
export const splitSentence = splitBlankSentence;
/** 문장의 핵심어 — 빈칸 · 채점표 굵은 글. */
export const sentenceKeywords = blankKeywords;

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
    // 연산자 · 관계 기호는 좌우 띄움(가장 넓은 관계 기호 0.556em), 쉼표는 뒤 띄움
    em +=
      mathCharEm(ch) + (/[=<>+\-:*]/.test(ch) ? 0.56 : ch === "," ? 0.17 : 0);
  }
  return em * KATEX_SCALE;
}

/**
 * 수식 글자 가운데 KaTeX 글꼴(Math-Italic · Main-Regular)이 지면 글꼴 표(`EM_TABLE`)보다 넓은 것 — 수식 안 글자는
 * 둘 가운데 넓은 쪽으로 센다(`ConceptBlankPaper.test.tsx` 가 KaTeX 글꼴 폭 표와 맞대어 «어림 ≥ 실제»를 잠근다).
 */
const MATH_WIDE = new Map<string, number>([
  ["f", 0.49],
  ["j", 0.42],
  ["B", 0.76],
  ["D", 0.83],
  ["E", 0.74],
  ["J", 0.56],
  ["K", 0.85],
  ["L", 0.69],
  ["X", 0.83],
  ["Z", 0.69],
  ["/", 0.5],
  ["+", 0.78],
  // 수식의 `-` 는 붙임표가 아니라 뺄셈표(−)로 그려진다
  ["-", 0.78],
  ["=", 0.78],
  ["<", 0.78],
  [">", 0.78],
]);
/** 수식 안 글자 하나의 폭(수식 em) — 넉넉한 쪽. */
export const mathCharEm = (ch: string): number =>
  Math.max(textEm(ch), MATH_WIDE.get(ch) ?? 0);

/**
 * 굵은 글(용어 · 굵은 핵심어 · 굵은 답) 안의 수식은 굵은 벌(Main-Bold · Math-BoldItalic)로 그려져 넓다 —
 * KaTeX 글꼴에서 굵은 벌 ÷ 보통 벌의 폭은 가장 커도 1.2 다(기울인 `a`). 굵은 글의 줄 수 어림은 수식 폭에 이 값을 곱한다.
 */
export const BOLD_MATH = 1.2;

/**
 * 수식 조각을 **줄이 바뀔 수 있는 자리**에서 나눈 도막들 — KaTeX 는 글줄 속 수식을 맨 바깥의 연산자(`+` · `\times` …) ·
 * 관계 기호(`=` · `\le` …) **뒤**에서만 끊는다. 묶음 `{ }` · `\left … \right` 안과 식 머리의 부호(`-3`)에서는 안 끊긴다.
 * 맨 괄호 `( )` 안도 끊기지 않는 것으로 센다 — 제품 수식 경로가 키 큰 속(근호 · 분수)을 감싼 괄호를 `\left( \right)` 로
 * 바꿔 그린다(끊는 자리를 실제보다 많게 잡으면 줄 수가 모자란다 — 적게 잡는 쪽이 안전하다).
 * 도막 하나는 끊기지 않는 조각이다 — 좁은 칸(채점표 개념 열 118px)에서 긴 식이 «폭 ÷ 칸 폭»보다 여러 줄로 접힌다.
 */
export function mathChunks(segment: string): string[] {
  const tex = segment.replace(/^\$|\$$/g, "");
  const chunks: string[] = [];
  let depth = 0;
  let start = 0;
  /** 바로 앞이 식의 머리 · 여는 괄호 · 연산자 · 쉼표인가 — 그 뒤의 기호는 부호라 끊는 자리가 아니다. */
  let opens = true;
  let i = 0;
  const breakAfter = () => {
    if (depth === 0 && !opens && tex.slice(i).trim()) {
      chunks.push(tex.slice(start, i));
      start = i;
    }
    opens = true;
  };
  while (i < tex.length) {
    const ch = tex[i]!;
    if (ch === "\\") {
      const name = /^\\([A-Za-z]+|.)/.exec(tex.slice(i))?.[1] ?? "";
      i += 1 + name.length;
      if (name === "left" || name === "right") {
        // 늘인 괄호 — 뒤따르는 괄호 글자까지 한 몸이다
        i += tex[i] === "\\" ? 2 : 1;
        depth = Math.max(0, depth + (name === "left" ? 1 : -1));
        opens = name === "left";
      } else if (INK_BINARY.test(name) || INK_RELATION.test(name)) breakAfter();
      else if (!INK_SPACE.has(name) && !INK_SILENT.test(name)) opens = false;
      continue;
    }
    i += 1;
    if ("{([".includes(ch)) {
      depth += 1;
      opens = true;
    } else if ("})]".includes(ch)) {
      depth = Math.max(0, depth - 1);
      opens = false;
    } else if ("+-=<>:".includes(ch)) breakAfter();
    else if (ch === ",") opens = true;
    else if (ch !== " " && ch !== "^" && ch !== "_") opens = false;
  }
  chunks.push(tex.slice(start));
  return chunks;
}

/**
 * 글 → 조각들. 글자 폭은 `textEm`(넉넉한 값), 수식은 끊길 수 있는 도막(`mathChunks`)마다 `mathEm`, 띄어쓰기는 `SPACE_EM`.
 * `mathScale` 은 굵은 글이면 `BOLD_MATH`.
 */
export function textAtoms(
  text: string,
  fontPx: number,
  mathScale = 1,
): InlineAtom[] {
  const lead = /^\s/.test(text);
  return words(text).flatMap((word, i) => {
    const glue = i > 0 || lead ? SPACE_EM * fontPx : 0;
    if (!word.startsWith("$")) return [{ px: textEm(word) * fontPx, glue }];
    return mathChunks(word).map((chunk, k) => ({
      px: mathEm(chunk) * mathScale * fontPx,
      glue: k === 0 ? glue : 0,
    }));
  });
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
  mathScale = 1,
): number {
  return wrapLines(textAtoms(text, fontPx, mathScale), widthPx);
}

/* ───────── 보이는 폭 — 수식이 실제로 그려지는 만큼 ───────── */

/** 인수를 그대로 그리는 명령어(글꼴 · 윗줄 · 얹는 표시) — 폭은 인수의 폭이다. */
const INK_WRAP = new Set([
  "mathrm",
  "mathbf",
  "mathit",
  "mathsf",
  "boldsymbol",
  "text",
  "textrm",
  "textbf",
  "operatorname",
  "overline",
  "underline",
  "bar",
  "hat",
  "widehat",
  "vec",
  "dot",
  "ddot",
  "tilde",
  "overrightarrow",
  "overleftarrow",
  "overleftrightarrow",
]);
/** 아무것도 그리지 않는 명령어 — 뒤따르는 식은 제 글자로 센다. */
const INK_SILENT =
  /^(?:[bB]igg?[lrm]?|displaystyle|textstyle|scriptstyle|limits|nolimits)$/;
/** 띄움(수식 em). */
const INK_SPACE = new Map<string, number>([
  [",", 0.17],
  [":", 0.22],
  [";", 0.28],
  ["!", -0.17],
  [" ", 0.33],
  ["quad", 1],
  ["qquad", 2],
]);
/**
 * 연산자(좌우 띄움 0.22씩 — 앞뒤에 식이 다 있을 때만) · 관계 기호(0.28씩 — 식이 있는 쪽만). 글자 폭 0.78.
 * 식 없이 혼자 선 기호(`$\times$` · `$=$`)는 띄움이 없다.
 */
const INK_BINARY = /^(?:times|div|pm|mp|ast|cap|cup|cdot)$/;
const INK_RELATION =
  /^(?:le|ge|leq|geq|ne|neq|approx|equiv|sim|backsim|simeq|parallel|perp|to|rightarrow|leftarrow|leftrightarrow|Rightarrow|propto|in|subset)$/;
const INK_GAP = { binary: 0.22, relation: 0.28 } as const;
/** 첨자가 위아래로 쌓이는 큰 연산자 — 폭은 연산자와 첨자 가운데 넓은 쪽. */
const INK_LIMITS = new Map<string, number>([
  ["sum", 1.44],
  ["prod", 1.28],
  ["lim", 1.39],
  ["max", 1.86],
  ["min", 1.67],
]);
/** 기호 하나의 폭(수식 em) — KaTeX 글꼴에서 잰 값. 표에 없는 기호는 0.8. */
const INK_SYMBOL = new Map<string, number>([
  ["circ", 0.5],
  ["angle", 0.72],
  ["triangle", 0.89],
  ["square", 0.78],
  ["bigcirc", 1],
  ["frown", 1],
  ["pi", 0.57],
  ["alpha", 0.64],
  ["beta", 0.57],
  ["theta", 0.47],
  ["infty", 1],
  ["int", 0.75],
  ["cdots", 1.17],
  ["ldots", 1.17],
  ["dots", 1.17],
  ["%", 0.83],
  ["{", 0.5],
  ["}", 0.5],
  ["$", 0.5],
  ["#", 0.83],
  ["&", 0.78],
  ["_", 0.5],
  ["|", 0.5],
]);
/** 함수 이름(곧은 글자) — 글자 폭 + 뒤 띄움 0.17. */
const INK_FUNCTION = /^(?:sin|cos|tan|log|ln|gcd)$/;
/** 수식 글자 하나의 폭(수식 em) — 숫자 0.5, 기울인 라틴 글자는 넓이가 고르지 않아 좁은 것 · 넓은 것만 따로. */
function inkChar(ch: string): number {
  if (ch >= "0" && ch <= "9") return 0.5;
  if (ch >= "가" && ch <= "힣") return 1;
  if (/[a-z]/.test(ch))
    return "ijl".includes(ch)
      ? 0.33
      : "frt".includes(ch)
        ? 0.42
        : "mw".includes(ch)
          ? 0.85
          : 0.53;
  if (/[A-Z]/.test(ch))
    return "MW".includes(ch)
      ? 1
      : "IJ".includes(ch)
        ? 0.5
        : ch === "S"
          ? 0.6
          : 0.75;
  if ("()[]".includes(ch)) return 0.39;
  if (".|!';".includes(ch)) return 0.28;
  if (ch === "/") return 0.5;
  return textEm(ch) / KATEX_SCALE;
}

/**
 * 수식 조각(`$...$`)이 **그려지는 폭**(본문 em) — 마크업 글자 수가 아니다. 글꼴 · 윗줄 · 묶음 · `\left` 처럼 글자를 그리지 않는
 * 것은 0, 분수는 분자 · 분모 가운데 넓은 쪽, 근호는 속 + 근호 머리, 첨자는 0.7배, 기호는 그 글자 폭에 좌우 띄움.
 * 빈칸 길이 · 제목 글씨 단계처럼 «보이는 크기»가 필요한 자리에 쓴다(`e2e/concept-blank-paper/ink.spec.ts` 가 실제 폭과 맞댄다).
 * 🔴 줄 수 어림에는 쓰지 않는다 — 그쪽은 실제보다 작으면 넘치므로 넉넉한 `mathEm` 을 쓴다.
 */
export function mathInkEm(segment: string): number {
  const tex = segment.replace(/^\$|\$$/g, "");
  let i = 0;
  /**
   * 바로 앞이 식의 머리 · 여는 괄호 · 연산자 · 관계 기호 · 쉼표였는가 — 그러면 뒤따르는 `+` · `-` 는 부호이고(띄움 없음),
   * 기호 앞에 띄움이 붙지 않는다.
   */
  let opens = true;
  /** 뒤에 그릴 것이 남았는가 — 묶음 · 식의 끝에 선 기호는 뒤 띄움이 없다. */
  const more = () => {
    const rest = tex.slice(i).trimStart();
    return rest !== "" && rest[0] !== "}";
  };
  /** 연산자 · 관계 기호 — 글자 폭에 식이 있는 쪽의 띄움을 더한다. */
  const operator = (glyph: number, kind: keyof typeof INK_GAP): number => {
    const before = !opens;
    const after = more();
    opens = true;
    if (kind === "binary")
      return glyph + (before && after ? INK_GAP.binary * 2 : 0);
    return (
      glyph + (before ? INK_GAP.relation : 0) + (after ? INK_GAP.relation : 0)
    );
  };
  /** 첨자 하나 또는 위 · 아래 한 쌍 — 한 자리에 쌓이므로 넓은 쪽(0.7배). 첨자가 없으면 0. */
  const scripts = (): number => {
    if (tex[i] !== "^" && tex[i] !== "_") return 0;
    i += 1;
    let script = arg();
    if (tex[i] === "^" || tex[i] === "_") {
      i += 1;
      script = Math.max(script, arg());
    }
    return script * 0.7;
  };
  /** 인수 하나 — 묶음 `{ }` 이거나 글자 · 명령어 하나. */
  const arg = (): number => {
    while (tex[i] === " ") i += 1;
    if (i >= tex.length) return 0;
    // 인수 속은 새 식이다(머리의 `-` 는 부호) — 끝나면 바깥 자리로 돌아온다
    const outer = opens;
    opens = true;
    let em: number;
    if (tex[i] === "{") {
      i += 1;
      em = run("}");
    } else em = atom();
    opens = outer;
    return em;
  };
  /** 글자 · 명령어 하나의 폭. */
  const atom = (): number => {
    const ch = tex[i]!;
    if (ch !== "\\") {
      i += 1;
      if ("=<>:".includes(ch))
        return operator(ch === ":" ? 0.28 : 0.78, "relation");
      if (ch === "+" || ch === "-") return operator(0.78, "binary");
      if (ch === ",") {
        opens = true;
        return 0.28 + (more() ? 0.17 : 0);
      }
      opens = ch === "(" || ch === "[";
      return inkChar(ch);
    }
    const name = /^\\([A-Za-z]+|.)/.exec(tex.slice(i))?.[1] ?? "";
    i += 1 + name.length;
    if (INK_BINARY.test(name))
      return operator(name === "cdot" ? 0.28 : 0.78, "binary");
    if (INK_RELATION.test(name)) return operator(0.78, "relation");
    if (name === "left" || name === "right") {
      // 늘어나는 괄호 — 뒤따르는 괄호 글자까지 먹는다(`\left.` 은 그리지 않는다)
      const delimiter = tex[i] === "\\" ? tex.slice(i, i + 2) : (tex[i] ?? "");
      i += delimiter.length;
      opens = name === "left";
      return delimiter === "." ? 0 : 0.55;
    }
    const space = INK_SPACE.get(name);
    if (space !== undefined) return space;
    if (INK_SILENT.test(name)) return 0;
    opens = false;
    if (/^(?:d|t|c)?frac$/.test(name)) {
      const top = arg();
      return Math.max(top, arg()) + 0.24;
    }
    if (name === "sqrt") {
      if (tex[i] === "[") i = tex.indexOf("]", i) + 1 || tex.length;
      return arg() + 0.95;
    }
    if (/^(?:overset|underset|stackrel)$/.test(name)) {
      const over = arg() * 0.7;
      return Math.max(over, arg());
    }
    if (INK_WRAP.has(name)) return arg();
    const limits = INK_LIMITS.get(name);
    if (limits !== undefined) return Math.max(limits, scripts()) + 0.17;
    if (INK_FUNCTION.test(name))
      return [...name].reduce((em, c) => em + inkChar(c) * 0.9, 0) + 0.17;
    if (name === "begin" || name === "end") {
      // 환경 이름 `{cases}` 는 그려지지 않는다 — 여는 쪽의 큰 괄호만
      if (tex[i] === "{") i = tex.indexOf("}", i) + 1 || tex.length;
      opens = true;
      return name === "begin" ? 0.9 : 0;
    }
    return INK_SYMBOL.get(name) ?? 0.8;
  };
  /** `close` 를 만날 때까지(없으면 끝까지) 이어 그린 폭 — 줄 나눔 `\\` 이 있으면 가장 넓은 줄. */
  const run = (close?: string): number => {
    let em = 0;
    let widest = 0;
    while (i < tex.length) {
      const ch = tex[i]!;
      if (ch === close) {
        i += 1;
        break;
      }
      if (tex.startsWith("\\\\", i)) {
        i += 2;
        widest = Math.max(widest, em);
        em = 0;
        opens = true;
      } else if (ch === " " || ch === "\n" || ch === "&" || ch === "}") {
        // 띄어쓰기 · 칸 나눔 · 짝 없는 닫는 괄호는 그려지지 않는다
        i += 1;
      } else if (ch === "{") {
        i += 1;
        em += run("}");
        opens = false;
      } else if (ch === "^" || ch === "_") {
        em += scripts() + 0.05;
        opens = false;
      } else em += atom();
    }
    return Math.max(widest, em);
  };
  return Math.max(0, run()) * KATEX_SCALE;
}

/**
 * 글이 **보이는 폭**(em) — 글자는 `textEm`, 수식 `$...$` 은 `mathInkEm`. 은행 2차부터 숫자 · 단위 · 분수가 모두 `$...$` 라
 * (원장님 2026-09-30 «카텍스 사용할 것») 마크업 글자 수로 재면 빈칸이 터무니없이 길어지고 제목 글씨가 괜히 줄어든다.
 */
export function inkEm(text: string): number {
  if (!text.includes("$")) return textEm(text);
  return text
    .split(/(\$[^$]*\$)/)
    .reduce(
      (em, part) =>
        em + (part.startsWith("$") ? mathInkEm(part) : textEm(part)),
      0,
    );
}

/**
 * 빈칸 밑줄 길이(px) — 핵심어의 **보이는 폭**에 비례한다(`inkEm` — 수식 핵심어 `{$\frac{\sqrt{3}}{2}$}` 도 그려지는 폭만큼).
 * 손글씨는 활자보다 커서 글자마다 본문 한 글자(14px)에 좌우 여유 24px 을 더하고, 한 글자 답도 쓸 수 있게 `min`,
 * 줄 하나를 혼자 먹지 않게 `max` 로 막는다(시안: 두 글자 56 · 여섯 글자 110).
 */
export const BLANK_WIDTH = { perEm: 14, pad: 24, min: 40, max: 240 } as const;

export function blankWidth(keyword: string): number {
  const { perEm, pad, min, max } = BLANK_WIDTH;
  return Math.round(Math.min(max, Math.max(min, inkEm(keyword) * perEm + pad)));
}

/** 빈칸 좌우 여백(px) — `paper.module.css` 의 `.blank { margin: 0 3px }` 와 짝. */
export const BLANK_MARGIN = 6;

/**
 * 빈칸 뒤에 띄어쓰기 없이 붙은 글(«____이다.» · «____,» · «____를»)의 첫 덩이 — 빈칸과 한 줄에 묶는다.
 * 묶지 않으면 빈칸이 줄 끝에 닿았을 때 조사 · 마침표만 다음 줄로 떨어진다(«… 값은 ____ / .»).
 * 수식으로 시작하거나 여덟 글자를 넘는 덩이는 묶지 않는다(긴 덩이를 묶으면 줄 밖으로 밀린다).
 */
export function blankTail(after: string | undefined): string {
  const tail = /^[^\s$]+/.exec(after ?? "")?.[0] ?? "";
  return [...tail].length <= 8 ? tail : "";
}

/**
 * 빈칸이 낀 문장 → 조각들(글 덩이 · 빈칸). 빈칸은 끊기지 않는다 — 앞에서는 줄이 바뀔 수 있고, 뒤에 붙은 글
 * (`blankTail`)과는 한 덩이다.
 */
export function sentenceAtoms(sentence: string, fontPx: number): InlineAtom[] {
  const pieces = splitSentence(sentence);
  return pieces.flatMap((piece, i) => {
    if (piece.kind === "text") {
      // 앞 빈칸에 묶인 첫 덩이는 빈칸 쪽에서 셌다
      const tail = pieces[i - 1]?.kind === "key" ? blankTail(piece.text) : "";
      return textAtoms(piece.text.slice(tail.length), fontPx);
    }
    const spaced = /\s$/.test(pieces[i - 1]?.text ?? "");
    const next = pieces[i + 1];
    const tail = next?.kind === "text" ? blankTail(next.text) : "";
    return [
      {
        px: blankWidth(piece.text) + BLANK_MARGIN + textEm(tail) * fontPx,
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
