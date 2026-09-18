/**
 * 작업실 MathLive 칸의 한글(HWP) 수식 **작은 판** (트랙 8, 2026-09-19 원장님 결정 B).
 *
 * 원장님 손에 익은 한컴 낱말을 MathLive 단축어로 받는다 — `root2` → √2, `a over b` → 분수,
 * `30DEG` → 30°. 확정된 것은 **작은 판까지**다(D-07 — 입력 방식을 넓게 바꾸지 않는다).
 *
 * - 낱말 → 기호 사전 + 구조 셋(`root`·`bar`·`over`) + «방금 만든 빈 칸에서만 띄어쓰기 무시».
 * - **한컴 중괄호 문법은 넣지 않는다** — `{` 는 지금처럼 집합 중괄호다.
 * - 대소문자는 가리지 않는다(`Root2`·`ROOT2`). 단 그리스 문자(`Pi`/`pi`)와 화살표
 *   (`rarrow` → / `RARROW` ⇒)는 대소문자가 뜻을 가르므로 적힌 모양만 받는다.
 *
 * ## 🔴 짧은 낱말을 넣지 않는다
 *
 * MathLive 는 친 글자열의 **가장 긴 꼬리부터** 사전을 찾는다. 그래서 짧은 낱말은 긴
 * 낱말 끝에서 터진다 — 실험(173건)에서 `ge` 는 `age` 를 `a≥` 로, `it` 는 `digit` 를,
 * `rm` 은 `term` 을, `to` 는 `photo` 를 깼다. `le`·`ge`·`ne`·`it`·`rm`·`of`·`in`·`to`·
 * `from` 은 사전에 없다(`in` 은 MathLive 기본값 ∈ 그대로다).
 * MathLive 기본값 중 한컴과 부딪히는 `of`(→ ∘)는 뺀다 — 한컴에서 `of` 는 `root n of x` 의 짝이다.
 */
import type { MathfieldElement } from "mathlive";

/** 낱말 → LaTeX. 키는 소문자다 — 대소문자 무시는 `hwpInlineShortcutFallback` 가 맡는다. */
const WORDS = new Map<string, string>([
  // 구조 셋 — 빈 칸(#?)을 만든다. `#@` 는 바로 앞 덩어리를 분자로 가져간다.
  ["root", "\\sqrt{#?}"],
  ["sqrt", "\\sqrt{#?}"],
  ["bar", "\\overline{#?}"],
  ["over", "\\frac{#@}{#?}"],
  // 낱말 → 기호
  ["times", "\\times"],
  ["divide", "\\div"],
  ["div", "\\div"],
  ["deg", "^{\\circ}"],
  ["angle", "\\angle"],
  ["triangle", "\\triangle"],
  ["leq", "\\le"],
  ["geq", "\\ge"],
  ["neq", "\\ne"],
  ["inf", "\\infty"],
  ["cup", "\\cup"],
  ["cap", "\\cap"],
  ["subset", "\\subset"],
  ["supset", "\\supset"],
  ["notin", "\\notin"],
  ["emptyset", "\\varnothing"],
  ["because", "\\because"],
  ["therefore", "\\therefore"],
  ["cdot", "\\cdot"],
  ["cdots", "\\cdots"],
  ["ldots", "\\ldots"],
  ["bot", "\\perp"],
  ["box", "\\square"],
  ["sim", "\\sim"],
]);

/** 대소문자가 뜻을 가르는 것 — 적힌 모양 그대로만 받는다. */
const EXACT: Record<string, string> = {
  "-+": "\\mp",
  rarrow: "\\to",
  larrow: "\\leftarrow",
  RARROW: "\\Rightarrow",
  LARROW: "\\Leftarrow",
  LRARROW: "\\Leftrightarrow",
};

/** MathLive 기본값 중 한컴과 부딪히는 것. */
const REMOVED_DEFAULTS = ["of"];

type Shortcuts = Record<string, unknown>;

/**
 * MathLive 기본 사전(`field.inlineShortcuts`)에 작은 판을 얹는다. 기본값에 이미 있는
 * 소문자 낱말(`times`·`deg`·`sqrt`)은 **기본값을 그대로** 둔다. 원래 사전은 고치지 않는다.
 */
export function buildHwpInlineShortcuts(defaults: Shortcuts): Shortcuts {
  const table: Shortcuts = { ...defaults };
  for (const key of REMOVED_DEFAULTS) delete table[key];
  for (const [word, latex] of WORDS) {
    if (!(word in defaults)) table[word] = latex;
    table[word.toUpperCase()] = latex;
  }
  return { ...table, ...EXACT };
}

/**
 * 사전에 **없는 모양**일 때 MathLive 가 묻는 자리(`onInlineShortcut`).
 * 소문자로 바꿔 작은 판 낱말이면 돌려준다 — `Root`·`Over`·`Times`.
 */
export function hwpInlineShortcutFallback(candidate: string): string {
  return WORDS.get(candidate.toLowerCase()) ?? "";
}

/**
 * 방금 만든 빈 칸(자리표가 선택된 상태)에서 친 띄어쓰기는 무시한다 — 한컴은 띄어쓰기가
 * 뜻이 없다. MathLive 기본은 띄어쓰기가 칸 밖으로 나가게 해 `1 over 2` 가 `\frac{1}{}2` 가 됐다.
 * 글자가 들어간 칸에서는 지금처럼 칸 밖으로 나간다(`bar AB =3` → `\overline{AB}=3`).
 */
function ignoreSpaceInFreshSlot(field: MathfieldElement) {
  return (event: KeyboardEvent) => {
    if (event.code !== "Space" && event.key !== " ") return;
    if (field.selectionIsCollapsed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
}

/** 작업실 수식 칸에 작은 판을 붙인다. 칸이 아직 안 붙었으면(mount 전) 붙을 때 건다. */
export function attachHwpMathShortcuts(field: MathfieldElement): void {
  const install = () => {
    field.inlineShortcuts = buildHwpInlineShortcuts(
      field.inlineShortcuts as Shortcuts,
    ) as MathfieldElement["inlineShortcuts"];
    field.onInlineShortcut = (_sender, candidate) =>
      hwpInlineShortcutFallback(candidate);
  };
  try {
    install();
  } catch {
    // `inlineShortcuts` 는 칸이 문서에 붙기 전에는 읽을 수 없다("Mathfield not mounted").
    field.addEventListener("mount", install, { once: true });
  }
  // 가로채기 단계 — MathLive 안쪽 입력칸보다 먼저 받아야 띄어쓰기를 삼킬 수 있다.
  field.addEventListener("keydown", ignoreSpaceInFreshSlot(field), {
    capture: true,
  });
}
