// @vitest-environment node
/**
 * 모바일 «한 걸음» 문항 생성기(`src/lib/math-srs/quick/`) 전수 검증 — 트랙 B1 (2026-09-27).
 *
 * 🔴 **정답은 생성기가 아니라 이 파일이 따로 계산한다.** 발문의 `$…$` 를 이 파일의 작은 계산기로
 *    읽어(아래 `parseTex`) 모양마다 «무엇이 정답이어야 하나»를 다시 구한다. 생성기의 계산을
 *    불러 쓰면 둘이 같이 틀려도 초록이다(20-lessons 2026-08-29 «시험을 표본이 다시 구현할 때»의
 *    반대쪽 — 여기서는 **일부러** 다시 구현한다. 재는 대상이 생성기의 계산이기 때문이다).
 *
 * 보는 것: 보기 4개 · 보기끼리 값으로 서로 다름(식은 여러 값에서, 방정식은 해로) · 정답이 독립 계산과
 * 일치하는 보기가 **정확히 하나**이고 그것이 `answerIndex` · KaTeX 붉은 글자/폴백 0 · 수 범위(두 자리) ·
 * 퇴화(`1x`·`0x`·`+-`) 0 · 조사 · 보기 폭 · 발문 길이 · 정답 위치 분포 · 결정성 · 난이도 사다리.
 */
import { describe, expect, it } from "vitest";
import { bareNumbers, josaFaults } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  QUICK_SHAPES,
  generateQuickItemOfShape,
  toQuickItem,
} from "../../lib/math-srs/quick/generate";
import {
  generateQuickItem,
  type QuickItem,
} from "../../lib/math-srs/quick/types";
import {
  QUICK_CHOICE_MAX_EM,
  QUICK_EQUATION_MAX_EM,
  choiceWidthEm,
} from "../../lib/math-srs/quick/width";
import { srsChoiceIssue } from "../../lib/math-srs/sharedAnswers";
import { CONCEPT_IDS, type Difficulty } from "../../lib/math-srs/types";

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];
/** 모양 × 난이도마다 도는 씨앗 수. 19모양 × 5 × 60 = 5,700문항. */
const SEEDS = Array.from({ length: 60 }, (_, i) => 20260927 + i * 7919);

// ── 독립 계산기: `$…$` 속 TeX 를 수로 읽는다 ──────────────────────────────────
type Env = Record<string, number>;
type Fn = (env: Env) => number;

function tokenize(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const ch = src[i]!;
    if (ch === " ") {
      i += 1;
      continue;
    }
    const cmd = /^\\[a-zA-Z]+/.exec(rest);
    if (cmd) {
      out.push(cmd[0]);
      i += cmd[0].length;
      continue;
    }
    const digits = /^\d+/.exec(rest);
    if (digits) {
      out.push(digits[0]);
      i += digits[0].length;
      continue;
    }
    if (/[a-z{}()+\-=:]/.test(ch)) {
      out.push(ch);
      i += 1;
      continue;
    }
    throw new Error(`계산기가 모르는 글자 «${ch}» — ${src}`);
  }
  return out;
}

function parseTex(src: string): Fn {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (want?: string) => {
    const got = toks[p];
    if (got === undefined) throw new Error(`식이 끊겼다 — ${src}`);
    if (want !== undefined && got !== want)
      throw new Error(`«${want}» 자리에 «${got}» — ${src}`);
    p += 1;
    return got;
  };
  const startsPrimary = (t: string | undefined) =>
    t !== undefined &&
    (/^\d+$/.test(t) ||
      /^[a-z]$/.test(t) ||
      t === "(" ||
      t === "\\frac" ||
      t === "\\square");

  function expr(): Fn {
    let left = term();
    while (peek() === "+" || peek() === "-") {
      const op = eat();
      const right = term();
      const l = left;
      left = op === "+" ? (e) => l(e) + right(e) : (e) => l(e) - right(e);
    }
    return left;
  }
  function term(): Fn {
    let left = factor();
    for (;;) {
      const t = peek();
      if (t === "\\times" || t === "\\cdot" || t === "\\div") {
        eat();
        const right = factor();
        const l = left;
        left = t === "\\div" ? (e) => l(e) / right(e) : (e) => l(e) * right(e);
      } else if (startsPrimary(t)) {
        const right = primary();
        const l = left;
        left = (e) => l(e) * right(e);
      } else return left;
    }
  }
  function factor(): Fn {
    if (peek() === "-") {
      eat();
      const inner = factor();
      return (e) => -inner(e);
    }
    return primary();
  }
  function group(open: string, close: string): Fn {
    eat(open);
    const inner = expr();
    eat(close);
    return inner;
  }
  function primary(): Fn {
    const t = peek();
    if (t === undefined) throw new Error(`식이 끊겼다 — ${src}`);
    if (/^\d+$/.test(t)) {
      eat();
      const v = Number(t);
      return () => v;
    }
    if (/^[a-z]$/.test(t)) {
      eat();
      return (e) => {
        const v = e[t];
        if (v === undefined) throw new Error(`«${t}» 값이 없다 — ${src}`);
        return v;
      };
    }
    if (t === "\\square") {
      eat();
      return (e) => {
        const v = e["□"];
        if (v === undefined) throw new Error(`□ 값이 없다 — ${src}`);
        return v;
      };
    }
    if (t === "(") return group("(", ")");
    if (t === "\\frac") {
      eat();
      const num = group("{", "}");
      const den = group("{", "}");
      return (e) => num(e) / den(e);
    }
    throw new Error(`«${t}» 로 시작하는 식은 못 읽는다 — ${src}`);
  }
  const fn = expr();
  if (p !== toks.length)
    throw new Error(`식 뒤에 남은 것 «${toks.slice(p).join("")}» — ${src}`);
  return fn;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const SAMPLES = [-3.5, -1.25, 0.5, 2.75, 5.5];
const sameFn = (f: Fn, g: Fn, env: (t: number) => Env) =>
  SAMPLES.every((t) => near(f(env(t)), g(env(t))));
const xEnv = (t: number): Env => ({ x: t });

function sides(eq: string): [Fn, Fn] {
  const parts = eq.split("=");
  if (parts.length !== 2) throw new Error(`등식이 아니다 — ${eq}`);
  return [parseTex(parts[0]!), parseTex(parts[1]!)];
}

type Solution = { kind: "one"; x: number } | { kind: "none" } | { kind: "all" };

/** 일차방정식 `L=R` 의 해. 그 밖의 문자는 `env` 로 고정한다. */
function solve(eq: string, env: Env = {}): Solution {
  const [l, r] = sides(eq);
  const f = (x: number) => l({ ...env, x }) - r({ ...env, x });
  const f0 = f(0);
  const f1 = f(1);
  const f2 = f(2);
  if (!near(f2 - f1, f1 - f0)) throw new Error(`일차가 아니다 — ${eq}`);
  const slope = f1 - f0;
  if (near(slope, 0)) return near(f0, 0) ? { kind: "all" } : { kind: "none" };
  return { kind: "one", x: -f0 / slope };
}
const slopeOf = (eq: string) => {
  const [l, r] = sides(eq);
  return l({ x: 1 }) - r({ x: 1 }) - (l({ x: 0 }) - r({ x: 0 }));
};

/** 미션이 중복을 가르는 열쇠(`mission.ts` 의 `contentKey` 와 같은 모양 — 발문+식) */
const contentKey = (item: { prompt: string; equation: string }) =>
  `${item.prompt}\n${item.equation}`;
const spans = (text: string) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
function bare(choice: string): string {
  const m = /^\$([^$]+)\$$/.exec(choice);
  if (!m) throw new Error(`보기가 «$…$» 한 덩이가 아니다 — ${choice}`);
  return m[1]!;
}
const numberOf = (choice: string) => parseTex(bare(choice))({});
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

// ── 모양별 독립 판정: 발문만 보고 «정답인 보기인가»를 가른다 ───────────────────
type Judge = (item: QuickItem) => (choice: string) => boolean;

const isExprOf = (target: Fn, env: (t: number) => Env) => (choice: string) =>
  sameFn(parseTex(bare(choice)), target, env);
const isNumber = (target: number) => (choice: string) =>
  near(numberOf(choice), target);
/** `px=q` 꼴이고, 원래 방정식과 해가 같고, x 의 계수가 `slope` 인 보기. */
const isCollected = (eq: string, slope: number) => (choice: string) => {
  const c = bare(choice);
  if (!/^-?\d*x=-?\d+$/.test(c)) return false;
  const want = solve(eq);
  const got = solve(c);
  return (
    want.kind === "one" &&
    got.kind === "one" &&
    near(want.x, got.x) &&
    near(slopeOf(c), slope)
  );
};

function wordExpr(prompt: string): Fn {
  let m: RegExpExecArray | null;
  const sign = (w: string) =>
    w === "큰" || w === "많은" || w === "후" ? 1 : -1;
  if ((m = /^어떤 수 \$x\$ 의 \$(\d+)\$ 배는\?$/.exec(prompt))) {
    const a = Number(m[1]);
    return (e) => a * e.x!;
  }
  if ((m = /^어떤 수 \$x\$ 보다 \$(\d+)\$ (큰|작은) 수는\?$/.exec(prompt))) {
    const k = Number(m[1]) * sign(m[2]!);
    return (e) => e.x! + k;
  }
  if (
    (m = /^어떤 수 \$x\$ 의 \$(\d+)\$ 배보다 \$(\d+)\$ (큰|작은) 수는\?$/.exec(
      prompt,
    ))
  ) {
    const a = Number(m[1]);
    const k = Number(m[2]) * sign(m[3]!);
    return (e) => a * e.x! + k;
  }
  if (
    (m = /^어떤 수 \$x\$ 에서 \$(\d+)\$ [을를] 뺀 수의 \$(\d+)\$ 배는\?$/.exec(
      prompt,
    ))
  ) {
    const k = Number(m[1]);
    const a = Number(m[2]);
    return (e) => a * (e.x! - k);
  }
  if (
    (m =
      /^어떤 수 \$x\$ 의 \$\\frac\{1\}\{(\d+)\}\$ 보다 \$(\d+)\$ (큰|작은) 수는\?$/.exec(
        prompt,
      ))
  ) {
    const a = Number(m[1]);
    const k = Number(m[2]) * sign(m[3]!);
    return (e) => e.x! / a + k;
  }
  if (
    (m =
      /^연속하는 (두|세|네) (자연수|정수|짝수|홀수) 중 (가장 작은|가장 큰|작은|큰) 수가 \$x\$ 일 때 (두|세|네) 수의 합은\?$/.exec(
        prompt,
      ))
  ) {
    const n = { 두: 2, 세: 3, 네: 4 }[m[1]!]!;
    if ({ 두: 2, 세: 3, 네: 4 }[m[4]!] !== n)
      throw new Error(`개수가 어긋난다 — ${prompt}`);
    const step = m[2] === "자연수" || m[2] === "정수" ? 1 : 2;
    const fromSmallest = m[3]!.endsWith("작은");
    if (n > 2 !== m[3]!.startsWith("가장"))
      throw new Error(`«가장»의 쓰임이 개수와 어긋난다 — ${prompt}`);
    const offsets = Array.from({ length: n }, (_, i) =>
      fromSmallest ? i * step : -i * step,
    );
    return (e) => offsets.reduce((sum, o) => sum + e.x! + o, 0);
  }
  if ((m = /^\$x\$ 살인 사람의 \$(\d+)\$ 년 (후|전) 나이는\?$/.exec(prompt))) {
    const k = Number(m[1]) * sign(m[2]!);
    return (e) => e.x! + k;
  }
  if (
    (m =
      /^\$x\$ 살인 (동생|형)보다 \$(\d+)\$ 살 (많은|적은) (형|동생)의 \$(\d+)\$ 년 (후|전) 나이는\?$/.exec(
        prompt,
      ))
  ) {
    const older = m[3] === "많은";
    if ((m[1] === "동생") !== older || (m[4] === "형") !== older)
      throw new Error(`형·동생과 많고 적음이 어긋난다 — ${prompt}`);
    const k = Number(m[2]) * sign(m[3]!);
    const y = Number(m[5]) * sign(m[6]!);
    return (e) => e.x! + k + y;
  }
  if ((m = /^시속 \$x\$ km 로 \$(\d+)\$ 시간 동안 간 거리는\?$/.exec(prompt))) {
    const k = Number(m[1]);
    return (e) => k * e.x!;
  }
  if (
    (m = /^\$(\d+)\$ km 를 시속 \$x\$ km 로 갈 때 걸리는 시간은\?$/.exec(
      prompt,
    ))
  ) {
    const k = Number(m[1]);
    return (e) => k / e.x!;
  }
  if (
    (m =
      /^\$(\d+)\$ km 중 시속 \$x\$ km 로 \$(\d+)\$ 시간 가고 남은 거리는\?$/.exec(
        prompt,
      ))
  ) {
    const k = Number(m[1]);
    const h = Number(m[2]);
    return (e) => k - h * e.x!;
  }
  if ((m = /^시속 \$x\$ km 로 \$(\d+)\$ 분 동안 간 거리는\?$/.exec(prompt))) {
    const min = Number(m[1]);
    return (e) => (min / 60) * e.x!;
  }
  throw new Error(`문장제 판정기가 모르는 발문 — ${prompt}`);
}

/**
 * 발문이 `re` 꼴인지 보고, 식 칸(`$…$`)의 TeX 를 돌려준다. 식 칸이 비었으면 던진다 —
 * 식이 있어야 하는 모양이 식을 잃으면 여기서 드러난다.
 */
function read(item: QuickItem, re: RegExp): { eq: string; m: RegExpExecArray } {
  const m = re.exec(item.prompt);
  if (!m) throw new Error(`발문 꼴 — ${item.prompt}`);
  if (!item.equation) throw new Error(`식 칸이 비었다 — ${item.prompt}`);
  return { eq: bare(item.equation), m };
}

const JUDGES: Record<string, Judge> = {
  "quick:balance:same-op": (item) => {
    const { eq } = read(item, /^\$a=b\$ 일 때 이 식과 같은 것은\?$/);
    const left = parseTex(eq);
    return (choice) => {
      const c = bare(choice);
      // `\frac` 속 글자는 문자가 아니다
      if (c.replace(/\\[a-zA-Z]+/g, "").includes("a")) return false;
      return SAMPLES.every((t) => near(left({ a: t }), parseTex(c)({ b: t })));
    };
  },
  "quick:balance:undo": (item) => {
    const { eq, m } = read(
      item,
      /^\$x\$ 만 남기려면 (양변에서 뺄|양변에 더할|양변을 나눌|양변에 곱할) 수는\?$/,
    );
    const [left] = sides(eq);
    const op = m[1]!;
    return (choice) => {
      const v = numberOf(choice);
      const after = (x: number) => {
        const l = left({ x });
        if (op === "양변에서 뺄") return l - v;
        if (op === "양변에 더할") return l + v;
        if (op === "양변을 나눌") return l / v;
        return l * v;
      };
      return SAMPLES.every((t) => near(after(t), t));
    };
  },
  "quick:balance:root-constant": (item) => {
    const { eq, m } = read(item, /^해가 \$x=(-?\d+)\$ 일 때 \$a\$ 의 값은\?$/);
    const [l, r] = sides(eq);
    const x = Number(m[1]);
    const g = (a: number) => l({ x, a }) - r({ x, a });
    const a = -g(0) / (g(1) - g(0));
    return isNumber(a);
  },
  "quick:two-step:transpose": (item) => {
    const { eq, m } = read(item, /^\$(-?\d+)\$ [을를] 이항하면\?$/);
    // 옮기는 항이 정말 좌변의 상수항인가 — 좌변을 x=0 에서 재면 그 수다.
    const [left] = sides(eq);
    if (!near(left({ x: 0 }), Number(m[1])))
      throw new Error(`이항하는 항이 좌변의 상수항이 아니다 — ${item.prompt}`);
    return isCollected(eq, slopeOf(eq));
  },
  "quick:two-step:coef": (item) => {
    const { eq } = read(item, /^\$x\$ 의 값은\?$/);
    const s = solve(eq);
    if (s.kind !== "one") throw new Error(`해가 하나가 아니다 — ${eq}`);
    // 한 걸음 — 좌변은 항 하나(상수항 없음)
    const [left] = sides(eq);
    if (!near(left({ x: 0 }), 0)) throw new Error(`계수 문항에 상수항 — ${eq}`);
    return isNumber(s.x);
  },
  "quick:two-step:solve": (item) => {
    const { eq } = read(item, /^\$x\$ 의 값은\?$/);
    const s = solve(eq);
    if (s.kind !== "one") throw new Error(`해가 하나가 아니다 — ${eq}`);
    return isNumber(s.x);
  },
  "quick:distribute:sign": (item) => {
    const { eq } = read(item, /^괄호를 풀면\?$/);
    if (!eq.startsWith("-(")) throw new Error(`괄호 앞 − 가 아니다 — ${eq}`);
    return isExprOf(parseTex(eq), xEnv);
  },
  "quick:distribute:times": (item) => {
    const { eq } = read(item, /^괄호를 풀면\?$/);
    return isExprOf(parseTex(eq), xEnv);
  },
  "quick:distribute:simplify": (item) => {
    const { eq } = read(item, /^간단히 하면\?$/);
    return isExprOf(parseTex(eq), xEnv);
  },
  "quick:both-sides:collect": (item) => {
    const { eq } = read(item, /^이항해 정리하면\?$/);
    return isCollected(eq, slopeOf(eq));
  },
  "quick:both-sides:solve": (item) => {
    const { eq } = read(item, /^\$x\$ 의 값은\?$/);
    const s = solve(eq);
    if (s.kind !== "one") throw new Error(`해가 하나가 아니다 — ${eq}`);
    return isNumber(s.x);
  },
  "quick:both-sides:no-solution": (item) => {
    const { eq, m } = read(
      item,
      /^해가 (없을|무수히 많을) 때 \$a\$ 의 값은\?$/,
    );
    const want = m[1] === "없을" ? "none" : "all";
    return (choice) => solve(eq, { a: numberOf(choice) }).kind === want;
  },
  "quick:fractions:lcd": (item) => {
    const { eq } = read(item, /^양변에 곱할 가장 작은 자연수는\?$/);
    const dens = [...eq.matchAll(/\\frac\{[^{}]*\}\{(\d+)\}/g)].map((d) =>
      Number(d[1]),
    );
    if (dens.length < 2) throw new Error(`분모가 둘 이상이어야 — ${eq}`);
    return isNumber(dens.reduce(lcm));
  },
  "quick:fractions:clear": (item) => {
    const { eq, m } = read(item, /^양변에 \$(\d+)\$ [을를] 곱하면 좌변은\?$/);
    const [left] = sides(eq);
    const k = Number(m[1]);
    // 곱하는 수가 정말 모든 분모의 공배수인가
    for (const d of eq.matchAll(/\\frac\{[^{}]*\}\{(\d+)\}/g))
      if (k % Number(d[1]) !== 0)
        throw new Error(`곱하는 수가 분모 ${d[1]} 의 배수가 아니다 — ${eq}`);
    return isExprOf((e) => k * left(e), xEnv);
  },
  "quick:fractions:proportion": (item) => {
    const { eq } = read(item, /^비례식을 방정식으로 바꾸면\?$/);
    const [left, right] = eq.split("=");
    const terms = [...left!.split(":"), ...right!.split(":")];
    if (terms.length !== 4) throw new Error(`비례식 꼴 — ${eq}`);
    const at = terms.indexOf("x");
    if (at < 0) throw new Error(`x 가 없다 — ${eq}`);
    const n = terms.map((t) => (t === "x" ? Number.NaN : Number(t)));
    // 외항의 곱 = 내항의 곱
    const partner = [3, 2, 1, 0][at]!;
    const others = [0, 1, 2, 3].filter((i) => i !== at && i !== partner);
    const coef = n[partner]!;
    const product = n[others[0]!]! * n[others[1]!]!;
    return (choice) => {
      const c = bare(choice);
      const mm = /^(\d*)x=(\d+)$/.exec(c);
      if (!mm) return false;
      const p = mm[1] === "" ? 1 : Number(mm[1]);
      return p === coef && Number(mm[2]) === product;
    };
  },
  // 문장제는 식을 세우는 것이 문제라 식 칸이 비어 있어야 한다(모범 식을 보여 주면 안 된다)
  "quick:word:phrase": (item) => wordJudge(item),
  "quick:word:consecutive": (item) => wordJudge(item),
  "quick:word:age": (item) => wordJudge(item),
  "quick:word:speed": (item) => wordJudge(item),
};

function wordJudge(item: QuickItem) {
  if (item.equation !== "")
    throw new Error(`문장제에 식 칸이 있다 — ${item.equation}`);
  return isExprOf(wordExpr(item.prompt), xEnv);
}

/** 보기끼리 «값으로» 다른가. 방정식은 해로, 식은 여러 값에서, 수는 수로 견준다. */
function valueKey(choice: string): string {
  const c = bare(choice);
  if (c.includes("=")) {
    const s = solve(c);
    return s.kind === "one" ? `eq:${s.x.toFixed(9)}` : `eq:${s.kind}`;
  }
  if (/[a-z]|\\square/.test(c.replace(/\\[a-zA-Z]+/g, ""))) {
    const f = parseTex(c);
    return `fn:${SAMPLES.map((t) => f({ x: t, a: t, b: t }).toFixed(9)).join(",")}`;
  }
  return `num:${parseTex(c)({}).toFixed(9)}`;
}

// ── 겉모양 검사 ───────────────────────────────────────────────────────────────
/** `1x`·`0x`·`+-` 처럼 계수·부호가 덜 다듬어진 채 찍힌 자리. */
function degenerate(tex: string): string[] {
  const bad: string[] = [];
  const rules: [RegExp, string][] = [
    [/(^|[^\d.])1[a-z]/, "계수 1"],
    [/(^|[^\d.])0[a-z]/, "계수 0"],
    [/\+\s*-|-\s*\+|--|\+\s*\+/, "부호 겹침"],
    [/(^|[(=:{])\s*\+/, "앞에 붙은 +"],
    [/[+-]\s*0(?![\d.])/, "0 을 더하고 뺌"],
    [/\\frac\{0\}|\\frac\{[^{}]*\}\{1\}/, "0/… 또는 …/1"],
    [/\\frac\{[^{}]*\}\{-/, "음수 분모"],
    // 음수를 대입할 때의 `(-3)` 은 관례라 뺀다
    [/\(\s*\d*[a-z]?\s*\)/, "항 하나를 괄호로"],
  ];
  for (const [re, name] of rules) if (re.test(tex)) bad.push(`${name}: ${tex}`);
  return bad;
}

/** 조사 — 숫자로 끝나는 것은 제품 판정(`josaFaults`)으로, 문자·□·괄호로 끝나는 것은 여기서. */
function josaExtra(text: string): string[] {
  const bad: string[] = [];
  const re = /\$([^$]*)\$ ?(으로|로|을|를|이|가|과|와|은|는)(?![가-힣])/g;
  for (const m of text.matchAll(re)) {
    let span = m[1]!.trim();
    let close = /\)$/.test(span);
    while (close) {
      span = span.slice(0, -1).trim();
      close = /\)$/.test(span);
    }
    const frac = /\\frac\{([^{}]*)\}\{[^{}]*\}$/.exec(span);
    const tail = frac ? frac[1]! : span;
    const josa = m[2]!;
    if (/\d$/.test(tail)) {
      // 괄호를 벗겨 숫자로 끝나면 제품 판정에 다시 넣는다
      if (span !== m[1]!.trim())
        bad.push(
          ...josaFaults(`$${tail}$ ${josa}`).map((f) => `${m[0]} → ${f}`),
        );
      continue;
    }
    if (/([a-z]|\\square|^-)$/.test(tail)) {
      // 에이·비·엑스·네모·마이너스(`$-$` 홀로) — 모두 받침이 없다
      if (!["를", "가", "와", "는", "로"].includes(josa)) bad.push(m[0]);
      continue;
    }
    bad.push(`판정 못 함: ${m[0]}`);
  }
  return bad;
}

/**
 * 발문이 320px 폭에서 두 줄 안에 드는가 — **어림**이다(실측은 Playwright, 보고서 참조).
 * 한글 17px, 수식은 17×1.15px/em. 한 줄 257px(272 − 스크롤 여백 15).
 */
function promptPx(prompt: string): number {
  let px = 0;
  const parts = prompt.split(/(\$[^$]+\$)/);
  for (const part of parts) {
    if (part.startsWith("$")) {
      px += choiceWidthEm(part.slice(1, -1)) * 17 * 1.15;
      continue;
    }
    for (const ch of part) {
      if (/[가-힣]/.test(ch)) px += 17;
      else if (ch === " ") px += 5;
      else px += 9;
    }
  }
  return px;
}

function allItems(): { item: QuickItem; mistakes: (string | null)[] }[] {
  const out: { item: QuickItem; mistakes: (string | null)[] }[] = [];
  for (const shape of QUICK_SHAPES)
    for (const difficulty of DIFFICULTIES)
      for (const seed of SEEDS) {
        const { mistakes, ...item } = generateQuickItemOfShape({
          templateId: shape.templateId,
          difficulty,
          seed,
        });
        out.push({ item, mistakes });
      }
  return out;
}
const ITEMS = allItems();

describe("한 걸음 문항 — 목록", () => {
  it("개념마다 모양이 셋 이상이고, 모든 모양에 독립 판정기가 있다", () => {
    for (const conceptId of CONCEPT_IDS) {
      const shapes = QUICK_SHAPES.filter((s) => s.conceptId === conceptId);
      expect(shapes.length, conceptId).toBeGreaterThanOrEqual(3);
    }
    for (const shape of QUICK_SHAPES) {
      expect(shape.templateId).toBe(`quick:${shape.conceptId}:${shape.name}`);
      expect(JUDGES[shape.templateId], shape.templateId).toBeTypeOf("function");
    }
    // 원장님이 «몇 번 빼 주세요»라고 부를 번호 — 1부터 빈틈없이
    expect(QUICK_SHAPES.map((s) => s.no)).toEqual(
      QUICK_SHAPES.map((_, i) => i + 1),
    );
  });

  it(`전수 ${QUICK_SHAPES.length}모양 × 난이도 5 × 씨앗 ${SEEDS.length} 이 모두 만들어진다`, () => {
    expect(ITEMS.length).toBe(QUICK_SHAPES.length * 5 * SEEDS.length);
  });
});

describe("한 걸음 문항 — 정답과 보기", () => {
  it("보기는 정확히 넷, 각각 «$…$» 한 덩이, 정답 위치는 0..3", () => {
    for (const { item } of ITEMS) {
      expect(item.choices.length, item.prompt).toBe(4);
      for (const c of item.choices)
        expect(c, item.prompt).toMatch(/^\$[^$]+\$$/);
      expect([0, 1, 2, 3]).toContain(item.answerIndex);
    }
  });

  it("독립 계산으로 정답인 보기가 정확히 하나이고, 그것이 answerIndex 다", () => {
    const failures: string[] = [];
    for (const { item } of ITEMS) {
      const judge = JUDGES[item.templateId]!(item);
      const hits = item.choices.flatMap((c, i) => (judge(c) ? [i] : []));
      if (hits.length !== 1 || hits[0] !== item.answerIndex)
        failures.push(
          `${item.templateId} d${item.difficulty} — ${item.prompt} | ${item.choices.join(" / ")} | 정답칸 ${item.answerIndex} · 맞는 칸 ${hits.join(",") || "없음"}`,
        );
    }
    expect(failures.slice(0, 8)).toEqual([]);
  });

  it("보기끼리 값으로 서로 다르다 (같은 값이 다른 모양으로 두 번 나오지 않는다)", () => {
    const failures: string[] = [];
    for (const { item } of ITEMS) {
      const keys = item.choices.map(valueKey);
      if (new Set(keys).size !== 4)
        failures.push(`${item.templateId} — ${item.choices.join(" / ")}`);
      // 한 문항의 보기는 같은 종류(식·방정식·수)끼리다
      const kinds = new Set(keys.map((k) => k.split(":")[0]));
      if (kinds.size !== 1)
        failures.push(`종류 섞임 ${item.choices.join(" / ")}`);
    }
    expect(failures.slice(0, 8)).toEqual([]);
  });

  it("B2 저장 규칙 — 빈 글자·앞뒤 공백 없음 · 200자 이하 · 공백만 다른 보기도 서로 다름", () => {
    const squash = (c: string) => c.replace(/\s+/g, "");
    for (const { item } of ITEMS) {
      // 제품의 저장 규칙 함수를 그대로 부른다(B2 §8.2 — 어기면 미션 시작 저장이 통째로 거절된다)
      expect(
        srsChoiceIssue({ answer: item.answerIndex, choices: item.choices }),
        item.prompt,
      ).toBeNull();
      for (const c of item.choices) {
        expect(c.trim(), item.prompt).toBe(c);
        expect(c.length).toBeGreaterThan(2);
        expect(c.length).toBeLessThanOrEqual(200);
      }
      expect(new Set(item.choices.map(squash)).size, item.prompt).toBe(4);
      expect(item.prompt.trim()).toBe(item.prompt);
      expect(item.equation.trim()).toBe(item.equation);
    }
  });

  it("식 칸 — 문장제만 비어 있고, 나머지는 «$…$» 한 덩이이며 발문에 같은 식을 되풀이하지 않는다", () => {
    for (const { item } of ITEMS) {
      if (item.conceptId === "word") {
        expect(item.equation, item.prompt).toBe("");
        continue;
      }
      expect(item.equation, item.prompt).toMatch(/^\$[^$]+\$$/);
      expect(item.prompt.includes(item.equation), item.prompt).toBe(false);
    }
  });

  it("같은 발문·식이면 정답도 같다 (미션은 발문+식으로 중복을 가른다)", () => {
    const answerOf = new Map<string, string>();
    for (const { item } of ITEMS) {
      const answer = item.choices[item.answerIndex]!;
      const key = contentKey(item);
      const seen = answerOf.get(key);
      if (seen !== undefined) expect(answer, key).toBe(seen);
      else answerOf.set(key, answer);
    }
  });

  it("발문이 잘 겹치지 않는다 — 개념 × 난이도마다 씨앗 400 에서 서로 다른 발문+식 30 이상", () => {
    for (const conceptId of CONCEPT_IDS)
      for (const difficulty of DIFFICULTIES) {
        const prompts = new Set<string>();
        for (let seed = 1; seed <= 400; seed += 1)
          prompts.add(
            contentKey(generateQuickItem({ conceptId, difficulty, seed })),
          );
        expect(
          prompts.size,
          `${conceptId} d${difficulty}`,
        ).toBeGreaterThanOrEqual(30);
      }
  });

  it("오답마다 «어떤 실수인지»가 붙어 있고 정답 칸만 비어 있다", () => {
    for (const { item, mistakes } of ITEMS) {
      expect(mistakes.length).toBe(4);
      mistakes.forEach((m, i) =>
        i === item.answerIndex
          ? expect(m).toBeNull()
          : expect(m && m.length > 1, `${item.prompt} ${i}`).toBe(true),
      );
    }
  });

  it("정답 위치가 고르다 (모양마다 씨앗 2,000 에서 각 칸 21~29%)", () => {
    // 300개로 재면 우연 편차(표준편차 2.5%p)만으로 76칸 중 하나가 걸린다 — 표본을 키워 잰다
    for (const shape of QUICK_SHAPES) {
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 2000; i += 1) {
        const { answerIndex } = generateQuickItemOfShape({
          templateId: shape.templateId,
          difficulty: DIFFICULTIES[i % 5]!,
          seed: 7 + i * 104729,
        });
        counts[answerIndex]! += 1;
      }
      for (const c of counts) {
        expect(c / 2000, `${shape.templateId} ${counts}`).toBeGreaterThan(0.21);
        expect(c / 2000, `${shape.templateId} ${counts}`).toBeLessThan(0.29);
      }
    }
  });
});

describe("한 걸음 문항 — 지면", () => {
  it("KaTeX 가 붉은 글자·raw 폴백 없이 그린다 (발문·보기·풀이·힌트)", () => {
    const seen = new Set<string>();
    for (const { item } of ITEMS)
      for (const part of [
        item.prompt,
        item.equation,
        ...item.choices,
        ...item.solution,
        item.hint,
      ]) {
        if (!part || seen.has(part)) continue;
        seen.add(part);
        const html = renderMathHtml(part);
        expect(/#cc0000/i.test(html), part).toBe(false);
        expect(html.includes("math-raw"), part).toBe(false);
        expect(html.includes("katex-error"), part).toBe(false);
      }
  });

  it("숫자는 모두 수식 안에 있다", () => {
    for (const { item } of ITEMS)
      for (const part of [
        item.prompt,
        item.equation,
        ...item.solution,
        item.hint,
      ])
        expect(bareNumbers(part), part).toEqual([]);
  });

  it("계수 0·1, 부호 겹침, 음수 분모, 가분수가 찍히지 않는다", () => {
    const failures: string[] = [];
    for (const { item } of ITEMS) {
      for (const part of [
        item.prompt,
        item.equation,
        ...item.choices,
        ...item.solution,
      ])
        for (const span of spans(part)) {
          failures.push(...degenerate(span));
          // 정수끼리의 가분수는 제품 전처리가 대분수로 바꾼다(2026-08-23) — 아예 안 낸다
          for (const f of span.matchAll(/\\d?frac\{(\d+)\}\{(\d+)\}/g))
            if (Number(f[1]) >= Number(f[2])) failures.push(`가분수 ${span}`);
        }
    }
    expect(failures.slice(0, 8)).toEqual([]);
  });

  it("수는 두 자리 안이다 (발문·식·보기)", () => {
    for (const { item } of ITEMS)
      for (const part of [item.prompt, item.equation, ...item.choices])
        for (const span of spans(part))
          for (const n of span.match(/\d+/g) ?? [])
            expect(Number(n), `${item.templateId} ${part}`).toBeLessThanOrEqual(
              99,
            );
  });

  it("조사가 읽는 소리와 맞는다", () => {
    for (const { item } of ITEMS)
      for (const part of [item.prompt, ...item.solution, item.hint]) {
        expect(josaFaults(part), part).toEqual([]);
        expect(josaExtra(part), part).toEqual([]);
      }
  });

  it(`보기가 폰 2×2 칸에 든다 (어림 ${QUICK_CHOICE_MAX_EM}em 이하 — 실측은 Playwright)`, () => {
    let widest = { em: 0, tex: "" };
    for (const { item } of ITEMS)
      for (const c of item.choices) {
        const em = choiceWidthEm(bare(c));
        if (em > widest.em) widest = { em, tex: c };
        expect(em, `${item.templateId} ${c}`).toBeLessThanOrEqual(
          QUICK_CHOICE_MAX_EM,
        );
      }
    expect(widest.em).toBeGreaterThan(2);
  });

  it(`식 칸이 320px 에서 한 줄이다 (어림 ${QUICK_EQUATION_MAX_EM}em 이하 — 실측은 Playwright)`, () => {
    // 학생 화면 식 칸: 22px × KaTeX 1.15 = 25.3px/em, 문제 칸 폭 약 257px
    for (const { item } of ITEMS) {
      if (!item.equation) continue;
      const em = choiceWidthEm(bare(item.equation));
      expect(em, item.equation).toBeLessThanOrEqual(QUICK_EQUATION_MAX_EM);
      expect(em * 25.3, item.equation).toBeLessThanOrEqual(257);
    }
  });

  it("발문이 320px 에서 두 줄 안이다 (어림 — 실측은 Playwright)", () => {
    for (const { item } of ITEMS)
      expect(promptPx(item.prompt), item.prompt).toBeLessThanOrEqual(
        2 * 257 * 0.92,
      );
  });

  it("발문은 «…?» 로 짧게 끝나고, 느낌표·이모지가 없다 (D-08)", () => {
    for (const { item } of ITEMS) {
      expect(item.prompt.endsWith("?"), item.prompt).toBe(true);
      for (const part of [item.prompt, ...item.solution, item.hint]) {
        expect(part.includes("!"), part).toBe(false);
        expect(/\p{Extended_Pictographic}/u.test(part), part).toBe(false);
      }
    }
  });

  it("풀이 1~2줄 · 힌트 있음 · 목표 시간 8~20초", () => {
    for (const { item } of ITEMS) {
      expect(item.solution.length).toBeGreaterThanOrEqual(1);
      expect(item.solution.length).toBeLessThanOrEqual(2);
      expect(item.hint.length).toBeGreaterThan(5);
      expect(item.expectedSeconds).toBeGreaterThanOrEqual(8);
      expect(item.expectedSeconds).toBeLessThanOrEqual(20);
    }
  });
});

describe("한 걸음 문항 — 씨앗과 난이도", () => {
  it("같은 입력은 같은 문항이다 (결정성)", () => {
    for (const conceptId of CONCEPT_IDS)
      for (const difficulty of DIFFICULTIES)
        for (const seed of SEEDS.slice(0, 10)) {
          const a = generateQuickItem({ conceptId, difficulty, seed });
          const b = generateQuickItem({ conceptId, difficulty, seed });
          expect(a).toEqual(b);
          expect(a.conceptId).toBe(conceptId);
          expect(a.difficulty).toBe(difficulty);
        }
  });

  it("generateQuickItem 은 씨앗에 따라 개념의 모든 모양을 고르게 돈다", () => {
    for (const conceptId of CONCEPT_IDS) {
      const seen = new Map<string, number>();
      for (let seed = 1; seed <= 600; seed += 1) {
        const item = generateQuickItem({ conceptId, difficulty: 3, seed });
        seen.set(item.templateId, (seen.get(item.templateId) ?? 0) + 1);
      }
      const own = QUICK_SHAPES.filter((s) => s.conceptId === conceptId);
      expect([...seen.keys()].sort()).toEqual(
        own.map((s) => s.templateId).sort(),
      );
      for (const n of seen.values())
        expect(n).toBeGreaterThan((600 / own.length) * 0.6);
    }
  });

  it("generateQuickItem 과 모양 지정 생성이 같은 씨앗에서 같은 문항을 낸다", () => {
    for (const conceptId of CONCEPT_IDS)
      for (const seed of SEEDS.slice(0, 12)) {
        const a = generateQuickItem({ conceptId, difficulty: 2, seed });
        const b = toQuickItem(
          generateQuickItemOfShape({
            templateId: a.templateId,
            difficulty: 2,
            seed,
          }),
        );
        expect(b).toEqual(a);
      }
  });

  it("씨앗이 바뀌면 문항이 바뀐다 (모양 × 난이도마다 서로 다른 발문+식 둘 이상)", () => {
    for (const shape of QUICK_SHAPES) {
      const all = new Set<string>();
      for (const difficulty of DIFFICULTIES) {
        const prompts = new Set(
          ITEMS.filter(
            (x) =>
              x.item.templateId === shape.templateId &&
              x.item.difficulty === difficulty,
          ).map((x) => contentKey(x.item)),
        );
        expect(
          prompts.size,
          `${shape.templateId} d${difficulty}`,
        ).toBeGreaterThanOrEqual(2);
        prompts.forEach((p) => all.add(p));
      }
      expect(all.size, shape.templateId).toBeGreaterThanOrEqual(10);
    }
  });

  /**
   * «사다리가 오르나»(20-lessons 2026-08-23). 한 걸음 안의 난이도는 수 크기·부호·분수로 오른다 —
   * 발문과 정답의 수식에서 그 셋을 재어 모양마다 난이도 평균이 내려가지 않는지 본다.
   */
  it("난이도가 실제로 오른다 — 수 크기·부호·분수", () => {
    const score = (item: QuickItem) => {
      const parts = [
        ...spans(item.prompt),
        ...spans(item.equation),
        bare(item.choices[item.answerIndex]!),
      ];
      const ints = parts.flatMap((s) => (s.match(/\d+/g) ?? []).map(Number));
      const size = Math.max(0, ...ints);
      const neg = parts.some((s) => s.includes("-")) ? 1 : 0;
      const frac = parts.some((s) => s.includes("\\frac")) ? 1 : 0;
      return Math.log2(1 + size) + 2 * neg + 2 * frac;
    };
    for (const shape of QUICK_SHAPES) {
      const mean = DIFFICULTIES.map((d) => {
        const own = ITEMS.filter(
          (x) =>
            x.item.templateId === shape.templateId && x.item.difficulty === d,
        );
        return own.reduce((s, x) => s + score(x.item), 0) / own.length;
      });
      const label = `${shape.templateId} ${mean.map((m) => m.toFixed(2)).join(" < ")}`;
      for (let i = 1; i < 5; i += 1)
        expect(mean[i]!, label).toBeGreaterThanOrEqual(mean[i - 1]! - 0.05);
      expect(mean[2]! > mean[0]!, label).toBe(true);
      expect(mean[4]! > mean[2]!, label).toBe(true);
      expect(mean[4]! - mean[0]!, label).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("18번 나이 — «몇 년 후» 문항에는 «$k-x$ (순서를 바꿔 뺌)» 오답이 없다 (원장님 2026-09-27)", () => {
    let later = 0;
    for (const { item } of ITEMS) {
      if (
        item.templateId !== "quick:word:age" ||
        !/년 후 나이는\?$/.test(item.prompt)
      )
        continue;
      later += 1;
      for (const c of item.choices)
        expect(/^\$\d+-x\$$/.test(c), `${item.prompt} ${c}`).toBe(false);
    }
    expect(later).toBeGreaterThan(50);
  });

  it("목표 시간은 난이도와 함께 늘거나 같다", () => {
    for (const shape of QUICK_SHAPES) {
      const secs = DIFFICULTIES.map(
        (difficulty) =>
          generateQuickItemOfShape({
            templateId: shape.templateId,
            difficulty,
            seed: 1,
          }).expectedSeconds,
      );
      for (let i = 1; i < 5; i += 1)
        expect(secs[i]!, shape.templateId).toBeGreaterThanOrEqual(secs[i - 1]!);
    }
  });
});

describe("독립 계산기 자체 (판정기가 눈멀지 않았나)", () => {
  it("TeX 를 제대로 읽는다", () => {
    expect(parseTex("4x-(x-3)")({ x: 2 })).toBe(9);
    expect(parseTex("-2(x-3)")({ x: 0 })).toBe(6);
    expect(parseTex("\\frac{x}{3}-1")({ x: 6 })).toBe(1);
    expect(parseTex("\\frac{2}{3}x")({ x: 6 })).toBe(4);
    expect(parseTex("\\frac{x-2}{4}")({ x: 10 })).toBe(2);
    expect(parseTex("3(x+4)")({ x: 1 })).toBe(15);
    expect(parseTex("-x+3")({ x: 5 })).toBe(-2);
    expect(parseTex("\\frac{12}{x}")({ x: 4 })).toBe(3);
    expect(solve("5x+2=3x+8")).toEqual({ kind: "one", x: 3 });
    expect(solve("2x+3=2x+1")).toEqual({ kind: "none" });
    expect(solve("ax+3=2x+3", { a: 2 })).toEqual({ kind: "all" });
    expect(() => parseTex("3x+")).toThrow();
  });

  it("같은 값의 다른 모양을 같다고 본다 — 3(x-4) 와 3x-12", () => {
    expect(valueKey("$3(x-4)$")).toBe(valueKey("$3x-12$"));
    expect(valueKey("$2x=6$")).toBe(valueKey("$x=3$"));
    expect(valueKey("$12$")).not.toBe(valueKey("$-12$"));
  });

  it("퇴화·조사 판정이 결함 표본을 잡는다", () => {
    expect(degenerate("1x+3")).not.toEqual([]);
    expect(degenerate("0x+3")).not.toEqual([]);
    expect(degenerate("3x+-2")).not.toEqual([]);
    expect(degenerate("\\frac{x}{1}")).not.toEqual([]);
    expect(degenerate("10x+3")).toEqual([]);
    expect(degenerate("-x+3")).toEqual([]);
    expect(josaExtra("$3a$ 과 같은 식은?")).not.toEqual([]);
    expect(josaExtra("$3a$ 와 같은 식은?")).toEqual([]);
    expect(josaExtra("$4x-(x-3)$ 를 간단히 하면?")).not.toEqual([]);
    expect(josaExtra("$4x-(x-3)$ 을 간단히 하면?")).toEqual([]);
    expect(josaExtra("$\\frac{a}{4}$ 과 같은 식은?")).not.toEqual([]);
  });
});
