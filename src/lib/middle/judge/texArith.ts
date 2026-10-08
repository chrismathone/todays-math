/**
 * **지면에 찍힌 식을 다시 계산한다** — 2단계 판정형(곱셈 · 나눗셈 · 거듭제곱 · 식의 값 · 비교형)의
 * `truthOf` · `valueOf` 가 쓰는 작은 계산기 (2026-10-08 엔진 보강 2단계).
 *
 *   `-\left(\dfrac{2}{3}\right)^{2}\times\left(-3\right)^{3}`  →  12
 *   `-x^{2}` ($x=-3$)                                          →  -9
 *
 * 🔴 생성기의 셈(`m1Calc` 의 `mulQ` · `powQ` · 약분)을 **다시 부르지 않는다** — 같은 셈으로 다시 재면
 *    동어반복이다(1단계 `signedSum.ts` 와 같은 태도). 여기서는 글을 낱말로 쪼개 **약분 없는 BigInt 분수**로
 *    계산하고, 같은가는 교차곱으로 본다. 시험은 또 다른 길(부동소수 · 다른 읽기)로 한 번 더 잰다.
 *
 * ## 연산 차례 — 판정형이 묻는 바로 그것
 *
 *   거듭제곱 → 곱셈 · 나눗셈(왼쪽부터) → 덧셈 · 뺄셈(왼쪽부터). **맨 앞 부호는 항 전체에 걸린다** —
 *   `-2^{2}` 은 $-(2^{2})=-4$ 이고 `(-2)^{2}` 은 $4$ 다. 문자는 글자를 바꿔 끼우지 않고 **값으로** 넣는다 —
 *   `x^{2}` 에 $x=-3$ 이면 $(-3)^{2}=9$ 다(«괄호 없이 대입»이 바로 학생의 실수다).
 *
 * ## 읽는 꼴은 우리 엔진이 찍는 그것뿐이다
 *
 *   수 · `\dfrac{…}{…}` · `\left(…\right)`(부호 붙은 수 포함) · `^{자연수}` · `\times` · `\div` · `+` · `-` ·
 *   한 글자 문자 · «계수 바로 뒤의 문자»(`3x^{2}`). 그 밖의 꼴(소수 · `\frac` · `2(x+1)` · `xy`)은 null —
 *   «못 읽음»이면 등록부가 그 문항을 안 낸다. 넓게 읽으려 애쓰지 않는다.
 */

/** 약분하지 않은 분수 — 분모는 0 이 아니다(부호는 어느 쪽에 있어도 된다). */
export type Frac = { n: bigint; d: bigint };
/** 문자 → 대입값 */
export type Env = Readonly<Record<string, Frac>>;

// ⚠️ `0n` 리터럴을 쓰지 않는다 — tsconfig target 이 ES2017 이라 tsc 가 TS2737 로 문다(`signedSum.ts` 와 같다).
const ZERO = BigInt(0);
const ONE = BigInt(1);
const MINUS = BigInt(-1);

/** 지수 상한 — 우리 문항은 2~4 다. 큰 지수는 읽지 않는다. */
const MAX_EXPONENT = 9;

type Token =
  | { t: "num"; v: bigint }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "(" }
  | { t: ")" }
  | { t: "{" }
  | { t: "}" }
  | { t: "^" }
  | { t: "frac" };

function tokenize(src: string): Token[] | null {
  const s = src
    .replace(/\s+/g, "")
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")");
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = /^\d+/.exec(rest);
    if (num) {
      out.push({ t: "num", v: BigInt(num[0]) });
      i += num[0].length;
      continue;
    }
    if (rest.startsWith("\\times")) {
      out.push({ t: "op", v: "*" });
      i += 6;
      continue;
    }
    if (rest.startsWith("\\div")) {
      out.push({ t: "op", v: "/" });
      i += 4;
      continue;
    }
    if (rest.startsWith("\\dfrac")) {
      out.push({ t: "frac" });
      i += 6;
      continue;
    }
    const c = s[i]!;
    if (c === "+" || c === "-") out.push({ t: "op", v: c });
    else if (c === "(" || c === ")" || c === "{" || c === "}" || c === "^")
      out.push({ t: c });
    else if (/[a-z]/.test(c)) out.push({ t: "var", v: c });
    else return null;
    i += 1;
  }
  return out;
}

const add = (a: Frac, b: Frac): Frac => ({
  n: a.n * b.d + b.n * a.d,
  d: a.d * b.d,
});
const mul = (a: Frac, b: Frac): Frac => ({ n: a.n * b.n, d: a.d * b.d });
const neg = (a: Frac): Frac => ({ n: MINUS * a.n, d: a.d });

/** 한 번 읽기 — 실패는 `null` 로 올린다(던지지 않는다). */
class Reader {
  private at = 0;
  constructor(
    private readonly tokens: readonly Token[],
    private readonly env: Env,
  ) {}

  done(): boolean {
    return this.at === this.tokens.length;
  }

  private peek(): Token | undefined {
    return this.tokens[this.at];
  }

  private eat(t: Token["t"]): boolean {
    if (this.peek()?.t !== t) return false;
    this.at += 1;
    return true;
  }

  private eatOp(...ops: string[]): string | null {
    const tok = this.peek();
    if (tok?.t !== "op" || !ops.includes(tok.v)) return null;
    this.at += 1;
    return tok.v;
  }

  /** 식 := [±] 항 (± 항)* — 맨 앞 부호는 첫 **항 전체**에 걸린다. */
  expr(): Frac | null {
    const sign = this.eatOp("+", "-");
    let v = this.term();
    if (v === null) return null;
    if (sign === "-") v = neg(v);
    for (;;) {
      const op = this.eatOp("+", "-");
      if (op === null) return v;
      const t = this.term();
      if (t === null) return null;
      v = add(v, op === "-" ? neg(t) : t);
    }
  }

  /** 항 := 인수 ((× | ÷) 인수)* — 왼쪽부터. 계수 바로 뒤의 문자(`3x^{2}`)만 곱으로 읽는다. */
  private term(): Frac | null {
    const startsWithNumber = this.peek()?.t === "num";
    let v = this.factor();
    if (v === null) return null;
    if (startsWithNumber && this.peek()?.t === "var") {
      const x = this.factor();
      if (x === null) return null;
      v = mul(v, x);
    }
    for (;;) {
      const op = this.eatOp("*", "/");
      if (op === null) return v;
      const f = this.factor();
      if (f === null) return null;
      if (op === "*") v = mul(v, f);
      else {
        if (f.n === ZERO) return null;
        v = mul(v, { n: f.d, d: f.n });
      }
    }
  }

  /** 인수 := 밑 [^{자연수}] */
  private factor(): Frac | null {
    const base = this.base();
    if (base === null) return null;
    if (!this.eat("^")) return base;
    if (!this.eat("{")) return null;
    const e = this.peek();
    if (e?.t !== "num" || e.v > BigInt(MAX_EXPONENT)) return null;
    this.at += 1;
    if (!this.eat("}")) return null;
    let out: Frac = { n: ONE, d: ONE };
    for (let i = 0; i < Number(e.v); i += 1) out = mul(out, base);
    return out;
  }

  /** 밑 := 수 | 문자 | ( 식 ) | \dfrac{식}{식} */
  private base(): Frac | null {
    const tok = this.peek();
    if (!tok) return null;
    if (tok.t === "num") {
      this.at += 1;
      return { n: tok.v, d: ONE };
    }
    if (tok.t === "var") {
      this.at += 1;
      return this.env[tok.v] ?? null;
    }
    if (tok.t === "(") {
      this.at += 1;
      const v = this.expr();
      if (v === null || !this.eat(")")) return null;
      return v;
    }
    if (tok.t === "frac") {
      this.at += 1;
      if (!this.eat("{")) return null;
      const num = this.expr();
      if (num === null || !this.eat("}") || !this.eat("{")) return null;
      const den = this.expr();
      if (den === null || !this.eat("}")) return null;
      if (den.n === ZERO) return null;
      return mul(num, { n: den.d, d: den.n });
    }
    return null;
  }
}

/** 식(`$` 없이)의 값 — 이 꼴이 아니면 null. */
export function evalTex(src: string, env: Env = {}): Frac | null {
  const tokens = tokenize(src);
  if (tokens === null || tokens.length === 0) return null;
  const reader = new Reader(tokens, env);
  const v = reader.expr();
  if (v === null || !reader.done() || v.d === ZERO) return null;
  return v;
}

/** 교차곱으로 같은 값인가 — 약분 · 분모 부호에 기대지 않는다. */
export function sameFrac(a: Frac, b: Frac): boolean {
  return a.n * b.d === b.n * a.d;
}

/** 크기 비교 — a<b 면 -1, 같으면 0, 크면 1. */
export function compareFrac(a: Frac, b: Frac): -1 | 0 | 1 {
  // 분모를 양수로 돌린 뒤 교차곱 — 부호가 분모에 있어도 차례가 안 뒤집히게.
  const l = (a.d < ZERO ? MINUS : ONE) * a.n * (b.d < ZERO ? MINUS * b.d : b.d);
  const r = (b.d < ZERO ? MINUS : ONE) * b.n * (a.d < ZERO ? MINUS * a.d : a.d);
  return l < r ? -1 : l > r ? 1 : 0;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < ZERO ? MINUS * a : a;
  let y = b < ZERO ? MINUS * b : b;
  while (y !== ZERO) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 사람이 읽는 값 — 기약 · 분모 양수 · 정수는 분모 없이(`-3/2` · `4`). 오류 사유 · 시험이 쓴다. */
export function fracText(v: Frac): string {
  const s = v.d < ZERO ? MINUS : ONE;
  const g = gcd(v.n, v.d) || ONE;
  const n = (s * v.n) / g;
  const d = (s * v.d) / g;
  return d === ONE ? `${n}` : `${n}/${d}`;
}

/** `$…$` 한 덩어리의 안쪽 — 아니면 null. */
function inner(text: string): string | null {
  const t = text.trim();
  if (!t.startsWith("$") || !t.endsWith("$") || t.length < 3) return null;
  const body = t.slice(1, -1);
  return body.includes("$") ? null : body;
}

/** 등식의 오른쪽 — 값 하나(부호 붙은 정수 · 분수)만. 식이면 «이 꼴이 아니다». */
const VALUE = /^-?(?:\\dfrac\{\d+\}\{\d+\}|\d+)$/;

/**
 * `$식=값$` 이 참인가 — 참이면 true · 거짓이면 false · 이 꼴이 아니면 null.
 * 계산 판정(«계산이 옳지 않은 것은?») · 식의 값 판정의 `truthOf`.
 */
export function equationTruth(
  choiceText: string,
  env: Env = {},
): boolean | null {
  const body = inner(choiceText);
  if (body === null) return null;
  const parts = body.replace(/\s+/g, "").split("=");
  if (parts.length !== 2 || !VALUE.test(parts[1]!)) return null;
  const left = evalTex(parts[0]!, env);
  const right = evalTex(parts[1]!);
  if (left === null || right === null) return null;
  return sameFrac(left, right);
}

/** `$식$` 의 값 — 비교형(«나머지 넷과 다른 하나» · «가장 큰 것»)의 `valueOf`. 등호가 있으면 null. */
export function expressionValue(
  choiceText: string,
  env: Env = {},
): Frac | null {
  const body = inner(choiceText);
  if (body === null || body.includes("=")) return null;
  return evalTex(body, env);
}

const ASSIGN = /\$([a-z])=(-?(?:\\dfrac\{\d+\}\{\d+\}|\d+))\$/;

/**
 * 발문에서 대입값을 읽는다 — «$x=-3$일 때, …». 없으면 빈 env(문자가 든 식은 그때 «못 읽음»이 된다).
 * 보기 글에는 대입값이 없다 — 지면의 **발문 줄**에서 읽어야 한다(`registry.ts` 가 그 줄을 넘긴다).
 */
export function readEnv(lead: string): Env {
  const m = ASSIGN.exec(lead);
  if (!m) return {};
  const v = evalTex(m[2]!);
  return v === null ? {} : { [m[1]!]: v };
}
