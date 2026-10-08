/**
 * **보기 둘이 «같은 값»인가** — 고등 객관식 보기의 수식을 글자가 아니라 값으로 견준다.
 *
 * 객관식 보기 다섯은 적재 전에 글자로만 겹침을 본다(`asMultipleChoice` — 문자열 `Set`). 그런데 고등 답은
 * 식이라 **글자가 달라도 같은 것**이 있다:
 *
 *     $\dfrac{2}{4}$ · $\dfrac{1}{2}$        $x<3$ · $3>x$        $(x+1)(x-2)$ · $(x-2)(x+1)$
 *     $2x-6=0$ · $x=3$                       $-(a-b)$ · $b-a$
 *
 * 그런 보기가 정답과 나란히 실리면 **정답이 둘**인 문항이다. 값 검산(답이 맞나)도 렌더도 이것을 못 본다.
 *
 * ## 어떻게 재나 — 문자에 수를 넣어 본다
 *
 * 수식을 읽어 나무로 만들고, 문자마다 정해 둔 수(표본 넷)를 넣어 값을 낸다. 모든 표본에서 값이 같으면 같은 식이다.
 * 부등식 · 등식은 `왼쪽 − 오른쪽` 을 값으로 삼고 **양의 상수배**(등식은 0 아닌 상수배)까지 같은 것으로 본다 —
 * `2x<6` 과 `x<3` 은 같은 조건이다. 이어진 부등식(`a<x\le b`)은 조건 둘의 묶음으로 견준다. 행렬은 칸마다.
 *
 * 제품의 표기 · 다항식 모듈(`src/lib/high/numbers.ts` · `poly.ts`)을 **부르지 않는다** — 같이 틀리지 않으려고
 * 따로 적었다(`helpers/highAnswer.ts` 와 같은 까닭). 읽는 꼴은 등록 유형이 실제로 내는 것이다(2026-10-08 실측
 * 452꼴): 수 · 문자 · `\dfrac` · `\sqrt` · 지수 · 괄호 · 붙여 쓴 곱 · `\pm` · `!` · 관계 기호 · `pmatrix`.
 *
 * 🔴 **못 읽는 꼴은 던진다.** 조용히 «다르다»로 넘기면 읽지 못한 보기가 전부 통과가 된다 — 부르는 쪽
 *    (`highLoadGate.ts`)이 «못 읽음»으로 따로 세어 찍는다.
 *
 * ⚠️ 이 자가 **못 보는 것**: 표본 넷에서 우연히 값이 같은 서로 다른 식(문자값을 무리수로 골라 사실상 없다) ·
 *    같은 해집합을 다른 꼴로 적은 것(`x^{2}-3x+2=0` 과 「$x=1$ 또는 $x=2$」) · 수식 밖의 글.
 */

export type Cx = { re: number; im: number };

type Tok =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "cmd"; v: string }
  | { k: "sym"; v: string };

const SKIP_CMDS = new Set([
  "left",
  "right",
  ",",
  ";",
  "!",
  " ",
  "quad",
  "qquad",
]);
const REL_CMDS: Record<string, string> = {
  le: "<=",
  leq: "<=",
  ge: ">=",
  geq: ">=",
  ne: "!=",
  neq: "!=",
  lt: "<",
  gt: ">",
};

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const rest = s.slice(i);
    const num = /^\d+(?:\.\d+)?/.exec(rest);
    if (num) {
      out.push({ k: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    if (ch === "\\") {
      if (rest.startsWith("\\\\")) {
        out.push({ k: "sym", v: "\\\\" });
        i += 2;
        continue;
      }
      const cmd = /^\\([a-zA-Z]+|[,;! ])/.exec(rest);
      if (!cmd) throw new Error(`수식을 못 읽는다 — «${rest.slice(0, 12)}»`);
      i += cmd[0].length;
      const name = cmd[1]!;
      if (SKIP_CMDS.has(name)) continue;
      if (name === "begin" || name === "end") {
        const env = /^\{([a-zA-Z]+)\}/.exec(s.slice(i));
        if (!env) throw new Error(`\\${name} 뒤에 환경 이름이 없다`);
        i += env[0].length;
        out.push({ k: "cmd", v: `${name}:${env[1]}` });
        continue;
      }
      out.push({ k: "cmd", v: name });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      out.push({ k: "var", v: ch });
      i += 1;
      continue;
    }
    if ("+-(){}^&=<>!|".includes(ch)) {
      out.push({ k: "sym", v: ch });
      i += 1;
      continue;
    }
    throw new Error(`수식을 못 읽는다 — «${rest.slice(0, 12)}»`);
  }
  return out;
}

// ───────────────────────────── 나무 ─────────────────────────────

type Node =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "neg"; a: Node }
  | { t: "add" | "sub" | "mul" | "div" | "pow" | "pm" | "mp"; a: Node; b: Node }
  | { t: "pmUnary"; a: Node }
  | { t: "sqrt"; a: Node }
  | { t: "fact"; a: Node };

type Statement =
  | { kind: "expr"; node: Node }
  | { kind: "chain"; sides: Node[]; rels: string[] }
  | { kind: "matrix"; rows: Node[][] };

class Parser {
  private pos = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly src: string,
  ) {}

  private fail(why: string): never {
    throw new Error(`수식을 못 읽는다 — ${why} (${this.src})`);
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private isSym(v: string): boolean {
    const t = this.peek();
    return t !== undefined && t.k === "sym" && t.v === v;
  }

  private isCmd(v: string): boolean {
    const t = this.peek();
    return t !== undefined && t.k === "cmd" && t.v === v;
  }

  private takeSym(v: string): void {
    if (!this.isSym(v)) this.fail(`«${v}» 가 와야 할 자리`);
    this.pos += 1;
  }

  statement(): Statement {
    const first = this.peek();
    if (first?.k === "cmd" && first.v.startsWith("begin:")) {
      const rows = this.matrix();
      if (this.pos !== this.toks.length) this.fail("행렬 뒤에 남은 조각");
      return { kind: "matrix", rows };
    }
    const sides = [this.expr()];
    const rels: string[] = [];
    for (;;) {
      const rel = this.relation();
      if (rel === null) break;
      rels.push(rel);
      sides.push(this.expr());
    }
    if (this.pos !== this.toks.length) this.fail("끝에 남은 조각");
    return rels.length === 0
      ? { kind: "expr", node: sides[0]! }
      : { kind: "chain", sides, rels };
  }

  private relation(): string | null {
    const t = this.peek();
    if (!t) return null;
    if (t.k === "sym" && (t.v === "=" || t.v === "<" || t.v === ">")) {
      this.pos += 1;
      return t.v;
    }
    if (t.k === "cmd" && REL_CMDS[t.v] !== undefined) {
      this.pos += 1;
      return REL_CMDS[t.v]!;
    }
    return null;
  }

  private matrix(): Node[][] {
    const open = this.peek() as { k: "cmd"; v: string };
    const env = open.v.slice("begin:".length);
    if (!/^[pbvBV]?matrix$/.test(env)) this.fail(`모르는 환경 ${env}`);
    this.pos += 1;
    const rows: Node[][] = [[]];
    for (;;) {
      rows[rows.length - 1]!.push(this.expr());
      if (this.isSym("&")) {
        this.pos += 1;
        continue;
      }
      if (this.isSym("\\\\")) {
        this.pos += 1;
        rows.push([]);
        continue;
      }
      break;
    }
    if (!this.isCmd(`end:${env}`)) this.fail("행렬이 안 닫혔다");
    this.pos += 1;
    const width = rows[0]!.length;
    if (rows.some((r) => r.length !== width))
      this.fail("행렬의 칸 수가 줄마다 다르다");
    return rows;
  }

  private expr(): Node {
    let acc: Node;
    if (this.isSym("-")) {
      this.pos += 1;
      acc = { t: "neg", a: this.term() };
    } else if (this.isSym("+")) {
      this.pos += 1;
      acc = this.term();
    } else if (this.isCmd("pm") || this.isCmd("mp")) {
      this.pos += 1;
      acc = { t: "pmUnary", a: this.term() };
    } else {
      acc = this.term();
    }
    for (;;) {
      if (this.isSym("+")) {
        this.pos += 1;
        acc = { t: "add", a: acc, b: this.term() };
      } else if (this.isSym("-")) {
        this.pos += 1;
        acc = { t: "sub", a: acc, b: this.term() };
      } else if (this.isCmd("pm")) {
        this.pos += 1;
        acc = { t: "pm", a: acc, b: this.term() };
      } else if (this.isCmd("mp")) {
        this.pos += 1;
        acc = { t: "mp", a: acc, b: this.term() };
      } else break;
    }
    return acc;
  }

  private startsFactor(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.k === "num" || t.k === "var") return true;
    if (t.k === "cmd") return ["dfrac", "frac", "tfrac", "sqrt"].includes(t.v);
    return t.v === "(" || t.v === "{" || t.v === "|";
  }

  private term(): Node {
    let acc = this.factor();
    for (;;) {
      if (this.isCmd("times") || this.isCmd("cdot")) {
        this.pos += 1;
        acc = { t: "mul", a: acc, b: this.factor() };
      } else if (this.isCmd("div")) {
        this.pos += 1;
        acc = { t: "div", a: acc, b: this.factor() };
      } else if (this.startsFactor() && !this.closingBar) {
        acc = { t: "mul", a: acc, b: this.factor() };
      } else break;
    }
    return acc;
  }

  /** 절댓값 안을 읽는 동안에는 `|` 가 «닫는 막대»다 — 붙여 쓴 곱으로 읽지 않는다. */
  private barDepth = 0;

  private get closingBar(): boolean {
    return this.barDepth > 0 && this.isSym("|");
  }

  private group(): Node {
    this.takeSym("{");
    const v = this.expr();
    this.takeSym("}");
    return v;
  }

  private factor(): Node {
    let base = this.base();
    for (;;) {
      if (this.isSym("^")) {
        this.pos += 1;
        const exp = this.isSym("{") ? this.group() : this.base();
        base = { t: "pow", a: base, b: exp };
      } else if (this.isSym("!")) {
        this.pos += 1;
        base = { t: "fact", a: base };
      } else break;
    }
    return base;
  }

  private base(): Node {
    const t = this.peek();
    if (!t) this.fail("수가 와야 할 자리에서 끝났다");
    this.pos += 1;
    if (t.k === "num") return { t: "num", v: t.v };
    if (t.k === "var") return { t: "var", name: t.v };
    if (t.k === "cmd") {
      if (t.v === "dfrac" || t.v === "frac" || t.v === "tfrac") {
        const top = this.group();
        const bottom = this.group();
        return { t: "div", a: top, b: bottom };
      }
      if (t.v === "sqrt") return { t: "sqrt", a: this.group() };
      return this.fail(`모르는 명령 \\${t.v}`);
    }
    if (t.v === "(") {
      const v = this.expr();
      this.takeSym(")");
      return v;
    }
    if (t.v === "{") {
      const v = this.expr();
      this.takeSym("}");
      return v;
    }
    if (t.v === "|") {
      this.barDepth += 1;
      const v = this.expr();
      this.barDepth -= 1;
      this.takeSym("|");
      return { t: "sqrt", a: { t: "pow", a: v, b: { t: "num", v: 2 } } };
    }
    return this.fail(`«${t.v}» 로 시작하는 수`);
  }
}

// ───────────────────────────── 값 ─────────────────────────────

const cx = (re: number, im = 0): Cx => ({ re, im });
const add = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im);
const sub = (a: Cx, b: Cx): Cx => cx(a.re - b.re, a.im - b.im);
const mul = (a: Cx, b: Cx): Cx =>
  cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

function div(a: Cx, b: Cx): Cx {
  const n = b.re * b.re + b.im * b.im;
  if (n === 0) throw new Error("0 으로 나눈다");
  return cx((a.re * b.re + a.im * b.im) / n, (a.im * b.re - a.re * b.im) / n);
}

function pow(a: Cx, b: Cx): Cx {
  if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 64) {
    let out = cx(1);
    for (let i = 0; i < Math.abs(b.re); i += 1) out = mul(out, a);
    return b.re < 0 ? div(cx(1), out) : out;
  }
  const r = Math.hypot(a.re, a.im);
  if (r === 0) return cx(0);
  const theta = Math.atan2(a.im, a.re);
  const lnr = Math.log(r);
  const mag = Math.exp(b.re * lnr - b.im * theta);
  const ang = b.im * lnr + b.re * theta;
  return cx(mag * Math.cos(ang), mag * Math.sin(ang));
}

/** 실수 x 의 감마 — 문자식의 계승(`(n-r)!`)에 수를 넣어 보려고 둔다(란초스 근사). */
function gamma(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const y = x - 1;
  let a = c[0]!;
  const t = y + g + 0.5;
  for (let i = 1; i < g + 2; i += 1) a += c[i]! / (y + i);
  return Math.sqrt(2 * Math.PI) * t ** (y + 0.5) * Math.exp(-t) * a;
}

/** 표본 수 — 문자마다 이만큼의 값을 넣어 본다. */
const SAMPLES = 4;

/**
 * 문자 `name` 의 `k` 번째 표본값 — 문자마다 다르고 실행마다 같다.
 * 양의 무리수로 둔다: 근호 · 계승이 실수로 남고, 서로 다른 식이 우연히 같은 값을 낼 일이 사실상 없다.
 */
function sampleOf(name: string, k: number): number {
  const code = name.charCodeAt(0);
  return (
    1.25 + ((code * 37 + k * 101) % 53) / 7 + Math.SQRT2 / (k + 3 + (code % 5))
  );
}

/** 나무 → 값들(`\pm` 이 가른 갈래마다 하나). 허수 단위 `i` 는 문자가 아니라 수다. */
function evaluate(n: Node, k: number): Cx[] {
  switch (n.t) {
    case "num":
      return [cx(n.v)];
    case "var":
      return [n.name === "i" ? cx(0, 1) : cx(sampleOf(n.name, k))];
    case "neg":
      return evaluate(n.a, k).map((v) => cx(-v.re, -v.im));
    case "pmUnary":
      return evaluate(n.a, k).flatMap((v) => [v, cx(-v.re, -v.im)]);
    case "sqrt":
      return evaluate(n.a, k).map((v) => pow(v, cx(0.5)));
    case "fact":
      return evaluate(n.a, k).map((v) => {
        if (v.im !== 0) throw new Error("허수의 계승");
        return cx(gamma(v.re + 1));
      });
    default: {
      const as = evaluate(n.a, k);
      const bs = evaluate(n.b, k);
      const out: Cx[] = [];
      for (const a of as)
        for (const b of bs) {
          if (n.t === "add") out.push(add(a, b));
          else if (n.t === "sub") out.push(sub(a, b));
          else if (n.t === "mul") out.push(mul(a, b));
          else if (n.t === "div") out.push(div(a, b));
          else if (n.t === "pow") out.push(pow(a, b));
          else if (n.t === "pm") out.push(add(a, b), sub(a, b));
          else out.push(sub(a, b), add(a, b));
        }
      return out;
    }
  }
}

/** 갈래 × 표본 — `alts[j][k]` 는 `\pm` 의 j 번째 갈래에 k 번째 표본을 넣은 값. */
type Vectors = Cx[][];

function vectorsOf(n: Node): Vectors {
  const perSample = Array.from({ length: SAMPLES }, (_, k) => evaluate(n, k));
  const width = perSample[0]!.length;
  return Array.from({ length: width }, (_, j) =>
    perSample.map((vals) => {
      const v = vals[j]!;
      if (!Number.isFinite(v.re) || !Number.isFinite(v.im))
        throw new Error("값이 유한하지 않다");
      return v;
    }),
  );
}

const near = (a: Cx, b: Cx): boolean => {
  const scale = Math.max(1, Math.hypot(a.re, a.im), Math.hypot(b.re, b.im));
  return Math.hypot(a.re - b.re, a.im - b.im) <= 1e-8 * scale;
};

const sameVector = (a: Cx[], b: Cx[]): boolean =>
  a.every((v, k) => near(v, b[k]!));

/** `a = λ·b` 인 λ — 없으면 null. `positive` 면 λ 가 양의 실수여야 한다(부등식), 아니면 0 아닌 수(등식). */
function proportional(a: Cx[], b: Cx[], positive: boolean): boolean {
  const k0 = b.findIndex((v) => Math.hypot(v.re, v.im) > 1e-12);
  if (k0 < 0) return a.every((v) => Math.hypot(v.re, v.im) <= 1e-12);
  const lambda = div(a[k0]!, b[k0]!);
  if (Math.hypot(lambda.re, lambda.im) <= 1e-12) return false;
  if (
    positive &&
    !(
      Math.abs(lambda.im) <= 1e-9 * Math.max(1, Math.abs(lambda.re)) &&
      lambda.re > 0
    )
  )
    return false;
  return a.every((v, k) => near(v, mul(lambda, b[k]!)));
}

/** 묶음 둘이 (차례 없이) 짝이 맞나 — 갈래 수가 많아야 넷이라 탐욕으로 충분하다. */
function matchUp<T>(as: T[], bs: T[], same: (a: T, b: T) => boolean): boolean {
  if (as.length !== bs.length) return false;
  const left = [...bs];
  for (const a of as) {
    const at = left.findIndex((b) => same(a, b));
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return true;
}

/** 한 조건 `d ⊲ 0` — 등식 · 부등식을 «왼쪽 − 오른쪽» 으로 옮긴 것. */
type Atom = { op: "<" | "<=" | "=" | "!="; d: Vectors };

function atomsOf(st: Extract<Statement, { kind: "chain" }>): Atom[] {
  return st.rels.map((rel, i) => {
    const lhs = st.sides[i]!;
    const rhs = st.sides[i + 1]!;
    // `a > b` 는 `b − a < 0` 이다 — 방향을 한쪽으로 모은다.
    const flip = rel === ">" || rel === ">=";
    const d: Node = flip
      ? { t: "sub", a: rhs, b: lhs }
      : { t: "sub", a: lhs, b: rhs };
    const op = rel === ">" ? "<" : rel === ">=" ? "<=" : (rel as Atom["op"]);
    return { op, d: vectorsOf(d) };
  });
}

function sameAtom(a: Atom, b: Atom): boolean {
  if (a.op !== b.op) return false;
  const positive = a.op === "<" || a.op === "<=";
  return matchUp(a.d, b.d, (x, y) => proportional(x, y, positive));
}

/** 읽은 수식 — `sameChoiceValue` 가 견주는 단위. */
export type ChoiceValue =
  | { kind: "expr"; v: Vectors }
  | { kind: "chain"; atoms: Atom[] }
  | { kind: "matrix"; rows: number; cols: number; cells: Vectors[] };

/** 수식 몸통(`$` 없이)을 읽는다 — 못 읽으면 **던진다**. */
export function readChoiceValue(tex: string): ChoiceValue {
  const st = new Parser(tokenize(tex), tex).statement();
  if (st.kind === "expr") return { kind: "expr", v: vectorsOf(st.node) };
  if (st.kind === "chain") return { kind: "chain", atoms: atomsOf(st) };
  return {
    kind: "matrix",
    rows: st.rows.length,
    cols: st.rows[0]!.length,
    cells: st.rows.flat().map(vectorsOf),
  };
}

/** 읽은 수식 둘이 같은 값(같은 조건 · 같은 행렬)인가. */
export function sameChoiceValue(a: ChoiceValue, b: ChoiceValue): boolean {
  if (a.kind === "expr" && b.kind === "expr")
    return matchUp(a.v, b.v, sameVector);
  if (a.kind === "chain" && b.kind === "chain")
    return matchUp(a.atoms, b.atoms, sameAtom);
  if (a.kind === "matrix" && b.kind === "matrix")
    return (
      a.rows === b.rows &&
      a.cols === b.cols &&
      a.cells.every((cell, i) => matchUp(cell, b.cells[i]!, sameVector))
    );
  return false;
}

/**
 * 보기 글 둘이 같은 값인가 — `true` · `false`, 읽지 못하면 `null`.
 *
 * 보기는 수식 한 덩어리(`$…$`)여야 읽는다. 글이 섞인 보기는 `null` 이다(부르는 쪽이 «못 읽음»으로 센다).
 */
export function sameChoice(a: string, b: string): boolean | null {
  const body = (s: string) => /^\$([^$]+)\$$/.exec(s.trim())?.[1] ?? null;
  const ta = body(a);
  const tb = body(b);
  if (ta === null || tb === null) return null;
  try {
    return sameChoiceValue(readChoiceValue(ta), readChoiceValue(tb));
  } catch {
    return null;
  }
}
