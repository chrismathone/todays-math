import { FADING_TYPED_MAX } from "@/contracts/fading.contract";
import type { FadingTrap } from "./chips";
import { fadingTargets, type FadingConcept } from "./concepts";

/**
 * 자판으로 쓴 답 — 견주는 규칙은 이 파일 하나다 (`docs/planning/srs-overhaul-20261006.md` §17.11 · 4단계 A′ 합의 2026-10-07).
 *
 * 쓴 글과 은행의 답을 **같은 함수**(`typedKey`)에 넣어 나온 열쇠가 같으면 같은 답이다. 화면은 견주는 규칙을 다시 짓지 않는다.
 * 보지 않는 것은 띄어쓰기 · 대소문자 · 수식 표시(`$`) · 쉼표 · 가운뎃점 · 따옴표다. 은행이 수식 명령으로 쓴 기호는
 * 자판으로 칠 수 있는 글과 같게 본다(`\frac{c}{2}` = `c/2` = «2분의 c» · `^\circ` = «도» · `\times` = `*` = `x`).
 * 작업실의 한컴 낱말(`root2` · `a over b` · `30deg` · `neq` · `bot` … — `hwpMathShortcuts.ts` 의 사전)도 같은 기호로 읽는다.
 * 🔴 뜻이 같은 다른 말 · 오타 · 조사만 다른 글은 알아보지 못한다. 그래서 못 알아본 글은 «틀림»이 아니다 — `unknown` 으로
 * 받아 두고, 학생이 단계를 다 마친 뒤 기준안과 대조해 «같은 뜻 / 다름»을 고른다(`fadingTypedOutcome`).
 * 🔴 규칙을 더할 때는 은행 전체 시험이 지킨다 — 한 개념 안에서 서로 다른 두 답(함정 포함)이 같은 열쇠가 되면 `fadingTyped.test.ts` 가 운다.
 * 런타임 AI 는 없다 — 같은 글은 언제나 같은 열쇠다.
 */

export { FADING_TYPED_MAX };

/** `at` 의 `{` 에서 짝이 맞는 `}` 까지 — 안의 글과 그다음 자리. 중괄호 묶음이 아니면 `null`. */
function braced(
  text: string,
  at: number,
): { inner: string; end: number } | null {
  if (text[at] !== "{") return null;
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0)
      return { inner: text.slice(at + 1, i), end: i + 1 };
  }
  return null;
}

/** 한 덩어리(글자 · 숫자뿐)가 아니면 괄호로 싼다 — `a/(a+b)`. */
const grouped = (text: string) =>
  /^[\p{L}\p{N}.]*$/u.test(text) ? text : `(${text})`;

/** 묶음을 받는 명령 — 분수 · 제곱근 · 선분 · 직선 · 반직선 · 곧은 글씨. 안쪽부터 푼다. */
const WRAPPERS: Record<string, (args: string[], before: string) => string> = {
  frac: ([top, bottom], before) =>
    // 대분수 — 앞이 숫자면 «과»로 잇는다(`1\frac{1}{2}` 이 `11/2` 로 읽히지 않게).
    `${/\d\s*$/.test(before) ? "과" : ""}${grouped(top!)}/${grouped(bottom!)}`,
  dfrac: (args, before) => WRAPPERS.frac!(args, before),
  tfrac: (args, before) => WRAPPERS.frac!(args, before),
  sqrt: ([inner]) => `√${grouped(inner!)}`,
  overline: ([inner]) => `선분${inner}`,
  overleftrightarrow: ([inner]) => `직선${inner}`,
  overrightarrow: ([inner]) => `반직선${inner}`,
  mathrm: ([inner]) => inner!,
  text: ([inner]) => inner!,
};
const ARITY: Record<string, number> = { frac: 2, dfrac: 2, tfrac: 2 };

function unwrap(text: string): string {
  let out = "";
  for (let i = 0; i < text.length;) {
    const command =
      text[i] === "\\" ? /^[a-zA-Z]+/.exec(text.slice(i + 1)) : null;
    const wrapper = command && WRAPPERS[command[0]];
    if (!command || !wrapper) {
      out += text[i++];
      continue;
    }
    let at = i + 1 + command[0].length;
    const args: string[] = [];
    for (let n = ARITY[command[0]] ?? 1; n > 0; n--) {
      while (text[at] === " ") at++;
      const group = braced(text, at);
      if (!group) break;
      args.push(unwrap(group.inner));
      at = group.end;
    }
    if (args.length !== (ARITY[command[0]] ?? 1)) {
      // 꼴이 다른 명령(묶음이 없다)은 그대로 둔다 — 그 답은 써서 맞힐 수 없고, 학생의 대조로 간다.
      out += text[i++];
      continue;
    }
    out += wrapper(args, out);
    i = at;
  }
  return out;
}

/** 수식 명령 → 기호. 명령의 이름 전체로 찾는다(`\le` 가 `\left` 의 앞머리로 읽히지 않는다). 표에 없는 명령은 그대로 남는다. */
const SYMBOLS: [string, string][] = [
  ["times", "×"],
  ["div", "÷"],
  ["pi", "π"],
  ["leq", "≤"],
  ["le", "≤"],
  ["geq", "≥"],
  ["ge", "≥"],
  ["neq", "≠"],
  ["ne", "≠"],
  ["pm", "±"],
  ["mp", "∓"],
  ["angle", "∠"],
  ["triangle", "△"],
  ["square", "□"],
  ["parallel", "∥"],
  ["perp", "⊥"],
  ["equiv", "≡"],
  ["infty", "∞"],
  ["cup", "∪"],
  ["cap", "∩"],
  ["subset", "⊂"],
  ["supset", "⊃"],
  ["notin", "∉"],
  ["varnothing", "∅"],
  ["emptyset", "∅"],
  ["because", "∵"],
  ["therefore", "∴"],
  ["sim", "∼"],
  ["cdots", "…"],
  ["ldots", "…"],
  ["dots", "…"],
  ["cdot", "·"],
  ["circ", "°"],
  ["alpha", "α"],
  ["beta", "β"],
  ["gamma", "γ"],
  ["theta", "θ"],
  ["left", ""],
  ["right", ""],
  ["quad", ""],
  ["qquad", ""],
  ["sin", "sin"],
  ["cos", "cos"],
  ["tan", "tan"],
  ["log", "log"],
];
const SYMBOL_OF = new Map(SYMBOLS);

/**
 * 한컴 낱말 → 기호 — 작업실 수식 칸(`src/components/math/editor/hwpMathShortcuts.ts`)의 사전과 같은 낱말이다.
 * 낱말 하나로 서 있을 때만 읽는다(앞뒤가 영문 글자면 다른 낱말의 일부다 · `\` 뒤면 수식 명령이다).
 * `root` 는 뒤의 것을 근호 안에, `over` 는 앞뒤를 분수로, `bar` 는 뒤의 것을 선분으로 — 은행의 꼴이 풀린 모양과 같아진다.
 */
const HWP_WORDS: [string, string][] = [
  ["root", "√"],
  ["sqrt", "√"],
  ["bar", "선분"],
  ["over", "/"],
  ["times", "×"],
  ["divide", "÷"],
  ["div", "÷"],
  ["deg", "°"],
  ["angle", "∠"],
  ["triangle", "△"],
  ["leq", "≤"],
  ["geq", "≥"],
  ["neq", "≠"],
  ["inf", "∞"],
  ["cup", "∪"],
  ["cap", "∩"],
  ["subset", "⊂"],
  ["supset", "⊃"],
  ["notin", "∉"],
  ["emptyset", "∅"],
  ["because", "∵"],
  ["therefore", "∴"],
  ["cdots", "…"],
  ["ldots", "…"],
  ["cdot", "·"],
  ["bot", "⊥"],
  ["box", "□"],
  ["sim", "∼"],
  ["pi", "π"],
  ["alpha", "α"],
  ["beta", "β"],
  ["gamma", "γ"],
  ["theta", "θ"],
];
const HWP_WORD = new RegExp(
  `(?<![\\\\a-z])(${HWP_WORDS.map(([word]) => word).join("|")})(?![a-z])`,
  "gi",
);
const HWP_OF = new Map(HWP_WORDS);

/** 기호 → 자판으로 치는 글. 쓴 글과 은행의 글이 같은 쪽으로 모인다. */
const TYPED: [RegExp, string][] = [
  [/\^\{?°\}?/g, "°"],
  // 수 · 글자 뒤의 도 기호만 «도»로 읽는다 — 기호 하나뿐인 답(«°»)은 낱말 «도»와 다른 답이다.
  [/(?<=[0-9a-z)])°/g, "도"],
  [/[×*]/g, "x"],
  [/÷/g, "/"],
  [/π/g, "파이"],
  [/√/g, "루트"],
  [/∠/g, "각"],
  [/△/g, "삼각형"],
  [/□/g, "네모"],
  [/∥/g, "//"],
  [/≤/g, "<="],
  [/≥/g, ">="],
  [/≠/g, "!="],
  [/±/g, "+-"],
  [/−/g, "-"],
  [/…/g, "..."],
  [/\^\{([^{}])\}/g, "^$1"],
  [/_\{([^{}])\}/g, "_$1"],
  [/\^2(?!\d)/g, "제곱"],
  [/\^3(?!\d)/g, "세제곱"],
  [/[,·'"‘’“”]/g, ""],
];

/**
 * 앞의 자리 표시(«…보다 크다» · «~와 같다»)는 떼고 견준다 — 뗀 뒤에 남는 글이 없으면 그대로 둔다.
 * 뒤의 줄임표는 떼지 않는다: «…배, …» 와 «…배» 는 다른 답이다.
 */
const PLACEHOLDER = /^(?:\.\.\.|~)+/;

/** 쓴 글 · 은행의 답 → 견주는 열쇠. 같은 답이면 같은 열쇠다. 견줄 글자가 없으면 빈 글이다. */
export function typedKey(text: string): string {
  let key = unwrap(
    text
      .normalize("NFC")
      .replace(/\$/g, "")
      // 한컴 낱말은 띄어쓰기를 지우기 전에 읽는다(`a over b` · `root 2`).
      .replace(HWP_WORD, (word) => HWP_OF.get(word.toLowerCase())!)
      // 수식 안의 띄움(`\,` `\;` `\ `) · 퍼센트(`\%`)와 이름 있는 기호 — 묶음을 풀기 **전에** 읽는다.
      // 풀고 나서 읽으면 `\times\frac{c}{d}` 가 `\timesc/d` 로 붙어 명령의 이름을 잃는다.
      .replace(/\\[,;:! ]/g, "")
      .replace(/\\%/g, "%")
      .replace(/\\([a-zA-Z]+)/g, (whole, name: string) =>
        SYMBOL_OF.has(name) ? SYMBOL_OF.get(name)! : whole,
      ),
  );
  // 명령을 다 읽은 뒤에 띄어쓰기를 지운다(`\pi r` 의 띄어쓰기는 명령의 끝이다).
  key = key.toLowerCase().replace(/\s+/g, "");
  for (const [from, to] of TYPED) key = key.replace(from, to);
  // «2분의 c» → `c/2`.
  key = key.replace(/([0-9a-z]+)분의([0-9a-z]+)/g, "$2/$1");
  return key.replace(PLACEHOLDER, "") || key;
}

/**
 * 4단계(A′)에서 쓴 글 하나의 결과 — 결정적이다.
 * - `correct` 그 빈칸의 답과 열쇠가 같다.
 * - `wrong` 그 개념의 **다른 답**이나 함정 칩의 글과 열쇠가 같다 — 객관적 틀림이다(그 자리에서 서버에 적는다).
 * - `unknown` 어느 답의 글도 아니다 — 맞다고도 틀리다고도 하지 않는다. 단계를 마친 뒤 학생이 기준안과 대조한다.
 * 견줄 글자가 없는 글(빈 글 · 쉼표뿐)은 받지 않는다 — 막히면 «아직 모르겠어요»다.
 */
export type FadingTypedOutcome = "correct" | "wrong" | "unknown";

export function fadingTypedOutcome(
  concept: FadingConcept,
  targetId: string,
  text: string,
  traps: readonly FadingTrap[] = [],
): FadingTypedOutcome {
  const targets = fadingTargets(concept);
  const target = targets.find((t) => t.id === targetId);
  if (!target) throw new Error(`이 개념에 없는 빈칸입니다: ${targetId}`);
  if (text.length > FADING_TYPED_MAX)
    throw new Error(`답이 너무 깁니다(${FADING_TYPED_MAX}자까지).`);
  const key = typedKey(text);
  if (!key) throw new Error("견줄 글자가 없는 답입니다.");
  if (key === typedKey(target.text)) return "correct";
  const others = [
    ...targets.map((t) => t.text),
    ...traps.map((trap) => trap.text),
  ];
  return others.some((other) => typedKey(other) === key) ? "wrong" : "unknown";
}
