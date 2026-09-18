/**
 * 한글(HWP) 수식 문법 → LaTeX 문자열 (트랙 8, 2026-09-19 원장님 결정 B).
 *
 * 원장님은 한컴 수식 입력이 손에 익으셨다 — `root2`·`a over b`·`30DEG` 를 치면
 * `\sqrt{2}`·`\frac{a}{b}`·`30^\circ` 가 되어야 한다.
 *
 * ## 두 겹
 *
 * 1. **정본 이식** `hwpScriptToLatexCanon` — 파이썬 겉포장
 *    `scripts/qa/convert-hwp-spans.py`(구멍 가림) → `hwpeq_unglue`(붙은 구조 키워드 떼기·
 *    후처리) → 정본 `F:\시험지변환기\core\hwpeq_to_latex.py`(읽기 전용) 를 **그대로** 옮겼다.
 *    정본만 옮기면 모자란다 — 정본 단독은 `root 2` 를 `\sqrt[2]{}` 로 깬다.
 *    황금표(`src/__tests__/fixtures/hwpEquationGolden.json`, 파이썬 산출 114행)와 한 글자도
 *    다르지 않아야 한다. 파이썬 쪽이 바뀌면 황금표를 다시 뽑고 여기를 맞춘다.
 * 2. **타이핑용** `hwpToLatex` — 사람이 칠 때의 차이만 정본 위에 얹는다.
 *    - 역슬래시가 든 입력은 이미 LaTeX 다 — **변환하지 않는다**(겉포장은 `\sqrt{2}` 를
 *      `\\sqrt{2}` 로, `\overline{AB}` 를 분수로 망가뜨린다).
 *    - 한컴 낱말이 하나도 없으면 손대지 않는다(`x^2` 를 `x^{2}` 로 고쳐 쓰지 않는다).
 *    - OCR 용 **낱말 쪼개기**를 뺀다 — `age`→`a\geq`, `limit`→`\lim\mathit{}`, `term`→
 *      `te\mathrm{}` 가 됐다. 전부 알려진 키워드로만 덮이는 낱말(`sintheta`)과
 *      숫자 앞(`log2`)만 뗀다. 짧은꼴 `le`·`ge`·`ne` 는 **소문자 홀로 선 낱말**일 때만
 *      부등호다(대문자 두 글자 `GE` 는 선분 이름 — 2026-08-18 `\overline{\geq }` 사고).
 *    - 정본 구멍을 막는다: `+-`(±) · `-+`(∓) · `->`(→) · `<->`(↔) · `//`(∥) · `sim`(∼) ·
 *      `Root2`(대소문자) · 중괄호 없는 `overline AB` · `==`(≡).
 *      `==` 는 한컴 도움말 «수식 기호» 표에 `==, EQUIV` 로 한 칸에 있다 — 합동 기호다.
 *      (저장소 후처리 `hwpeq_unglue._POST` 는 `==` 를 `=` 로 바꾼다 — 정본 쪽은 그대로 둔다.)
 *
 * 어휘는 `hwpEquationVocab.json` — `scripts/qa/hwp-vocab.json`(정본에서 뽑은 것)의 **사본**이다.
 * 클라이언트 번들에 들어가야 해서 `src/` 에 둔다. 시험이 두 파일이 같은지 본다.
 */
import vocab from "./hwpEquationVocab.json";

/* ── 어휘 ──────────────────────────────────────────────────────────────── */

/** 정본 `_REV` 의 알파벳 키 전부. 낱말 토큰만 조회하므로 기호 키(`->` 등)는 닿지 않는다. */
const REVERSE = new Map<string, string>(Object.entries(vocab.reverse));

/** 정본 `_GLUE_PREFIX` — 길이 내림차순(같은 길이 둘이 한 낱말의 접두일 수는 없다). */
const GLUE_PREFIX = [...vocab.gluePrefix].sort((a, b) => b.length - a.length);
const TYPING_GLUE_PREFIX = GLUE_PREFIX.filter((prefix) => prefix.length >= 3);

// 객체가 아니라 Map 이다 — 객체로 두면 `constructor`·`toString` 같은 낱말이 원형 사슬에서 걸린다.
const ACCENTS = new Map<string, string>([
  ["bar", "\\overline"],
  ["hat", "\\hat"],
  ["vec", "\\vec"],
  ["tilde", "\\tilde"],
  ["dot", "\\dot"],
  ["ddot", "\\ddot"],
  ["acute", "\\acute"],
  ["grave", "\\grave"],
  ["check", "\\check"],
  ["breve", "\\breve"],
  ["arch", "\\overarc"],
]);
/** 타이핑용에만 — 정본은 `underline` 을 기호로(`\underline AB`), `overline` 을 `over line` 으로 읽는다. */
const TYPING_ACCENTS = new Map<string, string>([
  ["overline", "\\overline"],
  ["underline", "\\underline"],
]);
const MATRIX = new Set(["matrix", "pmatrix", "bmatrix", "vmatrix"]);

/**
 * 겉포장 `_unglue_vocab` 의 토큰 — 네 목록을 다 합친다(하나만 쓰면 `INF` 가 샌다).
 * 두 글자 이상 알파벳만.
 */
const GLUE_TOKENS = [
  ...new Set(
    [
      ...vocab.hwpTokens,
      ...Object.keys(vocab.reverse),
      ...vocab.struct,
      ...vocab.gluePrefix,
      ...Object.keys(vocab.outsideCanon),
    ].filter((token) => token.length >= 2 && /^[A-Za-z]+$/.test(token)),
  ),
].sort((a, b) => b.length - a.length);
const GLUE_LOWER = new Set(GLUE_TOKENS.map((token) => token.toLowerCase()));
/** 타이핑용 낱말 가르기는 세 글자 이상 토큰만 쓴다 — `it`·`rm`·`ge` 가 `limit`·`term`·`age` 를 찢었다. */
const LONG_GLUE_TOKENS = GLUE_TOKENS.filter((token) => token.length >= 3);

/* ── 토큰 ──────────────────────────────────────────────────────────────── */

type Kind =
  | "lit"
  | "word"
  | "num"
  | "brace"
  | "script"
  | "tilde"
  | "tick"
  | "sep"
  | "other";
interface Token {
  kind: Kind;
  value: string;
}

/**
 * 정본 `_TOKEN_RE` 와 같은 순서의 갈래. 묶음 번호가 곧 종류다 — 이름 붙은 묶음은
 * tsconfig target(ES2017)이 못 받는다. 공백 갈래(`\s+`)가 줄바꿈까지 먼저 먹으므로
 * 마지막 `.` 에 `s` 깃발이 없어도 빠지는 글자가 없다.
 */
const TOKEN_KINDS: readonly (Kind | "space")[] = [
  "space",
  "lit",
  "word",
  "num",
  "brace",
  "script",
  "tilde",
  "tick",
  "sep",
  "other",
];
const TOKEN_RE =
  /(\s+)|("[^"]*")|([A-Za-z][A-Za-z0-9]*)|([0-9]+(?:\.[0-9]+)?)|([{}])|([\^_])|(~)|(`)|([#&])|(.)/gu;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  for (const match of source.matchAll(TOKEN_RE)) {
    const kind =
      TOKEN_KINDS[
        match.findIndex((group, at) => at > 0 && group !== undefined) - 1
      ];
    if (kind === undefined || kind === "space") continue;
    tokens.push({ kind, value: match[0] });
  }
  return tokens;
}

/* ── 해석기 (정본 `_P` 그대로) ─────────────────────────────────────────── */

interface Tally {
  /** 한컴 낱말·기호를 옮긴 횟수. 0 이면 타이핑용은 입력을 그대로 돌려준다. */
  signals: number;
  emptyFraction: boolean;
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly typing: boolean,
    private readonly tally: Tally,
  ) {}

  private peek(): Token | null {
    return this.tokens[this.index] ?? null;
  }

  private next(): Token | null {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  group(): string {
    const token = this.peek();
    if (token?.kind === "brace" && token.value === "{") {
      this.next();
      const out = this.seq("}");
      if (this.peek()?.value === "}") this.next();
      return out;
    }
    return this.atom();
  }

  private atom(): string {
    const token = this.next();
    if (!token) return "";
    const { kind, value } = token;
    switch (kind) {
      case "word":
        return this.word(value);
      case "lit": {
        this.tally.signals += 1;
        const inner = value.slice(1, -1);
        return inner ? `\\text{${inner}}` : "";
      }
      case "script":
        return `${value}{${this.group()}}`;
      case "tilde":
        return "~";
      case "tick":
        this.tally.signals += 1;
        return "\\,";
      case "brace":
        return "";
      default:
        return value;
    }
  }

  private word(value: string): string {
    const low = value.toLowerCase();
    const hit = (out: string) => {
      this.tally.signals += 1;
      return out;
    };
    const accent =
      ACCENTS.get(low) ?? (this.typing ? TYPING_ACCENTS.get(low) : undefined);
    if (accent) return hit(`${accent}{${this.group()}}`);
    if (low === "sqrt") return hit(`\\sqrt{${this.group()}}`);
    if (low === "root") {
      this.tally.signals += 1;
      const degree = this.group();
      if (this.peek()?.value.toLowerCase() === "of") this.next();
      return `\\sqrt[${degree}]{${this.group()}}`;
    }
    if (MATRIX.has(low)) return hit(this.matrix(low));
    if (low === "cases" || low === "pile" || low === "eqalign")
      return hit(this.matrix("cases"));
    if (low === "rm" || low === "it")
      return hit(`${low === "rm" ? "\\mathrm" : "\\mathit"}{${this.group()}}`);
    if (low === "left" || low === "right") {
      this.tally.signals += 1;
      let delimiter = this.next()?.value ?? "";
      // 정본은 `d in (".")` — 파이썬에서 빈 문자열도 "." 의 부분 문자열이라 참이 된다.
      if (delimiter === "" || delimiter === ".") delimiter = ".";
      if (delimiter === "{" || delimiter === "}") delimiter = `\\${delimiter}`;
      return `${low === "left" ? "\\left" : "\\right"}${delimiter} `;
    }
    if (low === "from" || low === "to")
      return hit(`${low === "from" ? "_" : "^"}{${this.group()}}`);
    if (this.typing) {
      // 짧은꼴 부등호는 **소문자 홀로 선 낱말**일 때만. `GE` 는 선분 이름이다.
      if (value === "le") return hit("\\leq ");
      if (value === "ge") return hit("\\geq ");
      if (value === "ne") return hit("\\neq ");
      if (value === "sim" || value === "SIM") return hit("\\sim ");
    }
    const upper = value.toUpperCase();
    const mapped = REVERSE.get(value) ?? REVERSE.get(low) ?? REVERSE.get(upper);
    if (mapped !== undefined) return hit(`${mapped} `);
    // 붙은 접두: `RMABC` → `\mathrm{ABC}` · `TIMES3` → `\times 3`
    // 타이핑용은 **대문자로 친 세 글자 이상** 접두만 — `item` 이 `\mathit{em}`, `index` 가
    // `\in dex`, 점 이름 `ITA` 가 `\mathit{A}` 가 된다.
    for (const prefix of this.typing ? TYPING_GLUE_PREFIX : GLUE_PREFIX) {
      const typed = this.typing ? value : upper;
      if (!typed.startsWith(prefix) || value.length <= prefix.length) continue;
      const rest = value.slice(prefix.length);
      const lowPrefix = prefix.toLowerCase();
      if (lowPrefix === "rm" || lowPrefix === "it")
        return hit(`${lowPrefix === "rm" ? "\\mathrm" : "\\mathit"}{${rest}}`);
      const head = REVERSE.get(prefix) || REVERSE.get(lowPrefix) || "";
      if (head) return hit(`${head} ${rest}`);
    }
    return value;
  }

  private matrix(env: string): string {
    const token = this.peek();
    const body =
      token?.kind === "brace" && token.value === "{"
        ? this.group()
        : this.atom();
    const rows = body.split("#").map((row) =>
      row
        .trim()
        .split("&")
        .map((cell) => cell.trim())
        .join(" & "),
    );
    return `\\begin{${env}} ${rows.join(" \\\\ ")} \\end{${env}}`;
  }

  seq(stop?: string): string {
    const parts: string[] = [];
    for (;;) {
      const token = this.peek();
      if (!token || (stop && token.value === stop && token.kind === "brace"))
        break;
      if (token.kind === "word" && token.value.toLowerCase() === "over") {
        this.next();
        this.tally.signals += 1;
        const numerator = (parts.pop() ?? "").trim();
        const denominator = this.group().trim();
        if (!numerator || !denominator) this.tally.emptyFraction = true;
        parts.push(`\\frac{${numerator}}{${denominator}}`);
        continue;
      }
      if (token.kind === "sep") {
        this.next();
        parts.push(token.value);
        continue;
      }
      if (token.kind === "brace" && token.value === "{") {
        parts.push(this.group());
        continue;
      }
      parts.push(this.atom());
    }
    return parts.join("");
  }
}

/** 정본 `hwpeq_to_latex` — 빈 입력은 빈 문자열, 영폭 공백은 지운다. */
function parseScript(script: string, typing: boolean, tally: Tally): string {
  if (!script || !script.trim()) return "";
  const source = script.replaceAll("\u200b", "");
  const out = new Parser(tokenize(source), typing, tally).seq();
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/* ── 앞손질: 붙은 구조 키워드 떼기 (`hwpeq_unglue.unglue`) ──────────────── */

const KEYWORDS = "over|atop|sqrt|root|bar|triangle|angle";

interface UnglueRules {
  left: RegExp;
  right: RegExp;
  of: RegExp;
  hasOf: RegExp;
  root: RegExp;
}

/** 정본은 소문자·대문자만 안다(`Root2` 는 그대로). 타이핑용은 대소문자를 가리지 않는다. */
function unglueRules(typing: boolean): UnglueRules {
  const keywords = typing ? KEYWORDS : `${KEYWORDS}|${KEYWORDS.toUpperCase()}`;
  const flags = typing ? "gi" : "g";
  return {
    left: new RegExp(`(?<![\\\\A-Za-z])([A-Za-z])(${keywords})`, flags),
    right: new RegExp(`(?<![\\\\A-Za-z])(${keywords})(?=[A-Za-z0-9])`, flags),
    of: new RegExp("(?<=[0-9}])of(?=[0-9{])", flags),
    hasOf: new RegExp("(?<![A-Za-z])of(?![A-Za-z])", typing ? "i" : ""),
    root: new RegExp("(?<![\\\\A-Za-z])(root|ROOT)(?![A-Za-z])", flags),
  };
}
const CANON_UNGLUE = unglueRules(false);
const TYPING_UNGLUE = unglueRules(true);
const RM_IT =
  /(?<![\\A-Za-z])([Rr][Mm]|[Ii][Tt])(TRIANGLE|ANGLE|BAR|triangle|angle|bar)(?![a-z])/g;

function unglue(script: string, rules: UnglueRules): string {
  if (!script) return script;
  let out = script.replace(
    RM_IT,
    (_whole, head: string, keyword: string) => `${head} ${keyword} `,
  );
  let previous: string | null = null;
  // `aoverbovercc` 처럼 연쇄로 붙은 것이 있어 변화가 없을 때까지(최대 여섯 번) 돌린다.
  for (let round = 0; round < 6 && out !== previous; round += 1) {
    previous = out;
    out = out.replace(
      rules.left,
      (_whole, letter: string, keyword: string) => `${letter} ${keyword}`,
    );
    out = out.replace(rules.right, (_whole, keyword: string) => `${keyword} `);
  }
  out = out.replace(rules.of, " of ");
  // `of` 짝이 없으면 n제곱근이 아니라 제곱근이다 — `15root2+5` 가 `15\sqrt[2]{+}5` 가 됐다.
  if (!rules.hasOf.test(out)) out = out.replace(rules.root, "sqrt");
  return out.replace(/[ \t]{2,}/g, " ");
}

/* ── 앞손질: 어휘로 붙은 낱말 떼기 (겉포장 `_unglue_vocab`) ─────────────── */

function segment(word: string): string[] | null {
  const pieces: string[] = [];
  const low = word.toLowerCase();
  let lone = 0;
  for (let i = 0; i < word.length;) {
    const token = GLUE_TOKENS.find((candidate) =>
      low.startsWith(candidate.toLowerCase(), i),
    );
    if (token) {
      pieces.push(word.slice(i, i + token.length)); // 원문 대소문자를 지킨다
      i += token.length;
    } else {
      pieces.push(word[i]!);
      lone += 1;
      i += 1;
    }
  }
  if (pieces.length < 2) return null;
  if (!pieces.some((piece) => piece.length >= 2)) return null;
  // 전부 대문자면 기하 라벨과 구분되지 않는다 — `rm COF` 의 `COF` 를 `C`+`OF` 로 찢었다.
  if (word === word.toUpperCase() && pieces.some((piece) => piece.length < 3))
    return null;
  if (lone > 2) return null;
  return pieces;
}

/** 타이핑용: **세 글자 이상 알려진 키워드로만** 빈틈없이 덮이는 낱말만 가른다(`sintheta`). */
function segmentWhole(word: string): string[] | null {
  const pieces: string[] = [];
  const low = word.toLowerCase();
  for (let i = 0; i < word.length;) {
    const token = LONG_GLUE_TOKENS.find((candidate) =>
      low.startsWith(candidate.toLowerCase(), i),
    );
    if (!token) return null;
    pieces.push(word.slice(i, i + token.length));
    i += token.length;
  }
  return pieces.length >= 2 ? pieces : null;
}

/** 숫자 앞의 토큰을 뗀다(`log2` → `log 2`). 낱말 경계에서 토큰 바로 뒤가 숫자면 가를 자리가 하나다. */
const DIGIT_SPLIT = GLUE_TOKENS.map(
  (token) =>
    [
      new RegExp(`(?<![A-Za-z\\\\])${token}(?=[0-9])`, "g"),
      `${token} `,
    ] as const,
);

function unglueVocab(body: string, typing: boolean): string {
  let out = body.replace(/[A-Za-z]{2,}/g, (word) => {
    if (GLUE_LOWER.has(word.toLowerCase())) return word; // 이미 온전한 토큰(`TRIANGLE`)
    const pieces = typing ? segmentWhole(word) : segment(word);
    return pieces ? pieces.join(" ") : word;
  });
  for (const [pattern, replacement] of DIGIT_SPLIT)
    out = out.replace(pattern, replacement);
  return out;
}

/* ── 뒷손질 (`hwpeq_unglue.postfix_latex`) ─────────────────────────────── */

const POSTFIX: Array<readonly [RegExp, string]> = [
  [/(?<![\\A-Za-z])(?:BOX|box)(?![A-Za-z])/g, "\\square "],
  // 네모 뒤 채움(`~~~`)은 한 칸으로 — 원장님 "네모 뒤에 공백이 너무 많아보여"(2026-08-18).
  [/(\\square\s*)(?:~|\\,){2,}/g, "$1~"],
  [/(\\square\s*)(?:~|\\,)+\s*$/g, "$1"],
  [/(?<!\\)DIVIDE/g, "\\div "],
  [/(?<!\\)divide/g, "\\div "],
  [/(?<!\\)TIMES/g, "\\times "],
  [/(?<![\\A-Za-z])times(?![A-Za-z])/g, "\\times "],
  [/(?<![\\A-Za-z])ANGL(?![A-Za-z])/g, "\\angle "],
  // `\overarc` 는 KaTeX 에 없다 — 붉은 글씨로 나간다.
  [/\\overarc(?=\s*\{)/g, "\\overset{\\frown}"],
  [/(?<!\\)(?<!\\[lr])vert/g, "\\vert "],
  [/(?<![\\A-Za-z])CENTIGRADE(?![A-Za-z])/g, "^\\circ\\mathrm{C}"],
  [/(?<![\\A-Za-z])FAHRENHEIT(?![A-Za-z])/g, "^\\circ\\mathrm{F}"],
  [/\\mathit\{LEFT\}/g, "\\left"],
  [/\\mathit\{RIGHT\}/g, "\\right"],
  [/\\mathit\{ANGLE([A-Za-z]*)\}/g, "\\angle $1"],
  [/!=/g, "\\neq "],
  [/<=/g, "\\leq "],
  [/>=/g, "\\geq "],
  [/(?<![\\A-Za-z])(?:LEQ|leq)/g, "\\leq "],
  [/(?<![\\A-Za-z])(?:GEQ|geq)/g, "\\geq "],
  [/(?<![\\A-Za-z])(?:NEQ|neq)/g, "\\neq "],
  [/(?<![<>!=])==(?![=])/g, "="],
];

const LEGE_RUN = /(?<![\\A-Za-z])[A-Za-z]{2,}/g;
const LEGE_DECOMPOSABLE = /^(?:[A-Za-z]{0,2}(?:le|ge))+[A-Za-z]{0,2}$/i;
const LEGE_TOKEN = /le|ge/gi;
const LEGE_BLOCK = [
  "pile",
  "left",
  "right",
  "angle",
  "triangle",
  "eqalign",
  "arch",
];

/** 점 라벨이 인자인 명령 — `\overline{GE}` 의 `GE` 를 ≥ 로 바꿔 두 행을 망가뜨린 뒤 넣었다. */
const PROTECTED =
  /\\(?:text|mathrm|mathit|mathbf|mathbb|mathcal|mathfrak|mathsf|mathtt|operatorname|mbox|overline|underline|overrightarrow|overleftarrow|overleftrightarrow|widehat|widetilde)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g;
const SENTINEL = "\u{E010}";

function fixLege(latex: string): string {
  return latex.replace(LEGE_RUN, (run) => {
    if (!/le|ge/i.test(run)) return run;
    if (!LEGE_DECOMPOSABLE.test(run)) return run;
    const low = run.toLowerCase();
    if (LEGE_BLOCK.some((keyword) => low.includes(keyword))) return run;
    if (run.length > 2 && run === run.toUpperCase()) return run;
    return run.replace(LEGE_TOKEN, (token) =>
      token.toLowerCase() === "le" ? "\\leq " : "\\geq ",
    );
  });
}

function outsideProtected(
  latex: string,
  fn: (masked: string) => string,
): string {
  const kept: string[] = [];
  const masked = latex.replace(PROTECTED, (whole) => {
    kept.push(whole);
    return `${SENTINEL}${kept.length - 1}${SENTINEL}`;
  });
  return fn(masked).replace(
    new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, "g"),
    (_whole, at: string) => kept[Number(at)]!,
  );
}

/**
 * 타이핑용은 붙은 짧은꼴(`xle3`·`age`)을 부등호로 읽지 않는다 — 해석기가 홀로 선
 * `le`·`ge` 를 이미 옮겼다.
 */
function postfix(latex: string, typing: boolean): string {
  if (!latex) return latex;
  let out = latex;
  for (const [pattern, replacement] of POSTFIX)
    out = out.replace(pattern, replacement);
  if (!typing) out = outsideProtected(out, fixLege);
  return out.replace(/[ \t]{2,}/g, " ");
}

/* ── 구멍 가리기 (겉포장 `_HOLES` + 타이핑용) ────────────────────────────── */

interface Hole {
  name: string;
  pattern: RegExp;
  back: (group: string) => string;
}

const CANON_HOLES: Hole[] = [
  {
    name: "overline",
    pattern: /(?<![A-Za-z\\])(?:overline|OVERLINE)\s*\{([^{}]*)\}/g,
    back: (group) => `\\overline{${group.trim()}}`,
  },
  {
    name: "underline",
    pattern: /(?<![A-Za-z\\])(?:underline|UNDERLINE)\s*\{([^{}]*)\}/g,
    back: (group) => `\\underline{${group.trim()}}`,
  },
  {
    name: "rightarrow",
    pattern: /(?<![A-Za-z\\])(?:RIGHTARROW|Rightarrow|rightarrow)(?![A-Za-z])/g,
    back: () => "\\rightarrow ",
  },
  {
    name: "leftarrow",
    pattern: /(?<![A-Za-z\\])(?:LEFTARROW|Leftarrow|leftarrow)(?![A-Za-z])/g,
    back: () => "\\leftarrow ",
  },
  {
    name: "underover",
    pattern: /(?<![A-Za-z\\])UNDEROVER(?![A-Za-z])/g,
    back: () => "",
  },
  // 소문자 `rarrow` 는 → 다. 정본은 대문자로 떨어져 ⇒ 를 낸다(`lim _{n rarrow INF}`).
  {
    name: "rarrow",
    pattern: /(?<![A-Za-z\\])rarrow(?![A-Za-z])/g,
    back: () => "\\to ",
  },
  {
    name: "larrow",
    pattern: /(?<![A-Za-z\\])larrow(?![A-Za-z])/g,
    back: () => "\\leftarrow ",
  },
];

/**
 * 타이핑용 기호 구멍. 순서가 뜻이다 — `<->` 가 `->` 보다 먼저.
 * `<-` 는 넣지 않는다: `x<-1` 은 «x 는 -1 보다 작다»다.
 */
const TYPING_HOLES: Hole[] = [
  { name: "leftrightarrow", pattern: /<->/g, back: () => "\\leftrightarrow " },
  { name: "to", pattern: /->/g, back: () => "\\to " },
  { name: "pm", pattern: /\+-/g, back: () => "\\pm " },
  { name: "mp", pattern: /-\+/g, back: () => "\\mp " },
  { name: "parallel", pattern: /\/\//g, back: () => "\\parallel " },
  { name: "equiv", pattern: /(?<![<>!=])==(?!=)/g, back: () => "\\equiv " },
];

/** 가림 열쇠는 사적 사용 영역 글자 — 어떤 어휘에도 없어, 삼켜지면 결과에 그대로 남아 드러난다. */
const KEY0 = 0xe100;
const KEY_RE = /[\u{E100}-\u{E1FF}]/u;

function mask(body: string, holes: Hole[], kept: string[]): string {
  let out = body;
  for (const hole of holes) {
    out = out.replace(hole.pattern, (...args: unknown[]) => {
      const group = typeof args[1] === "string" ? args[1] : "";
      kept.push(hole.back(group));
      return String.fromCodePoint(KEY0 + kept.length - 1);
    });
  }
  return out;
}

function unmask(out: string, kept: string[]): string {
  let restored = out;
  kept.forEach((back, index) => {
    restored = restored.replaceAll(String.fromCodePoint(KEY0 + index), back);
  });
  return restored;
}

/* ── 공개 함수 ─────────────────────────────────────────────────────────── */

/**
 * 정본 이식 — 파이썬 겉포장 `convert-hwp-spans.py` 의 `_convert` 와 같은 출력.
 * 황금표 대조용이고, OCR 로 뽑은 한컴 스크립트를 옮길 때도 쓸 수 있다.
 * **사람이 친 입력에는 `hwpToLatex` 를 쓴다.**
 */
export function hwpScriptToLatexCanon(body: string): string {
  const kept: string[] = [];
  const masked = mask(body, CANON_HOLES, kept);
  const tally: Tally = { signals: 0, emptyFraction: false };
  const out = postfix(
    parseScript(unglue(unglueVocab(masked, false), CANON_UNGLUE), false, tally),
    false,
  );
  return unmask(out, kept);
}

export interface HwpToLatexResult {
  latex: string;
  /** 입력과 다른가. 바뀌지 않았으면 `latex` 는 입력 그대로다. */
  changed: boolean;
  /** 사람에게 보일 짧은 알림(사무적 문구). 없으면 빈 배열. */
  warnings: string[];
}

const UNCHANGED = (input: string): HwpToLatexResult => ({
  latex: input,
  changed: false,
  warnings: [],
});

/** 중괄호 짝 — `"…"` 글자 안은 세지 않는다. */
function bracesBalanced(body: string): boolean {
  let depth = 0;
  for (const char of body.replace(/"[^"]*"/g, "")) {
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/**
 * 사람이 친 한컴 수식 한 덩어리(`$` 없이)를 LaTeX 로 옮긴다.
 *
 * 역슬래시가 있거나(이미 LaTeX), 비었거나, 한컴 낱말·기호가 하나도 없으면
 * 입력을 그대로 돌려준다.
 */
export function hwpToLatex(input: string): HwpToLatexResult {
  if (!input || !input.trim() || input.includes("\\")) return UNCHANGED(input);

  const kept: string[] = [];
  // 중괄호 없는 `overline AB` 는 `bar` 와 같다. 먼저 바꿔 두지 않으면 `over line` 으로 찢긴다.
  let body = input.replace(/(?<![A-Za-z\\])overline/gi, "bar ");
  body = mask(body, TYPING_HOLES, kept);
  body = mask(
    body,
    CANON_HOLES.filter((hole) => hole.name !== "overline"),
    kept,
  );

  const tally: Tally = { signals: kept.length, emptyFraction: false };
  const parsed = parseScript(
    unglue(unglueVocab(body, true), TYPING_UNGLUE),
    true,
    tally,
  );
  const fixed = postfix(parsed, true);
  if (fixed !== parsed) tally.signals += 1;
  if (tally.signals === 0) return UNCHANGED(input);

  const latex = unmask(fixed, kept);
  const warnings: string[] = [];
  if (!bracesBalanced(input)) warnings.push("중괄호 짝이 맞지 않습니다");
  if (tally.emptyFraction) warnings.push("분수의 빈 칸이 있습니다");
  if (KEY_RE.test(latex)) warnings.push("옮기지 못한 조각이 있습니다");
  return { latex, changed: latex !== input, warnings };
}

export interface HwpSpansResult {
  text: string;
  changed: boolean;
  warnings: string[];
}

/** `$$…$$` 를 먼저, 그다음 `$…$`. 짝 없는 `$` 뒤는 건드리지 않는다. */
const SPAN_RE = /\$\$([\s\S]+?)\$\$|\$([^$]+)\$/g;

/**
 * 본문 안의 수식 구간(`$…$`·`$$…$$`)만 옮긴다 — 구간 밖 한글 문장은 한 글자도 안 건드린다.
 * 구간마다 `hwpToLatex` 의 조건(역슬래시·한컴 낱말)을 따로 본다.
 */
export function convertHwpMathSpans(text: string): HwpSpansResult {
  const warnings: string[] = [];
  const out = text.replace(
    SPAN_RE,
    (whole, display?: string, inline?: string) => {
      const body = display ?? inline ?? "";
      const result = hwpToLatex(body);
      for (const warning of result.warnings)
        if (!warnings.includes(warning)) warnings.push(warning);
      if (!result.changed) return whole;
      return display !== undefined
        ? `$$${result.latex}$$`
        : `$${result.latex}$`;
    },
  );
  return { text: out, changed: out !== text, warnings };
}
