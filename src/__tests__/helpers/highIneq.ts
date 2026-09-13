/**
 * 고등 부등식 시험 연장 — `highLinIneq`·`highQuadIneq` 두 시험이 같이 쓴다. **제품 코드를 부르지 않는다.**
 *
 * 부등식 유형의 정답은 수 · 구간(`$-2<x\le 3$`) 둘이고, 발문은 연립(`\begin{cases}`)·A<B<C·절댓값·분수·
 * 소수 계수로 적힌다. 다항식 읽개(`highPage.parsePolyTex`)는 괄호·절댓값·분수를 못 읽고, 정답 읽개
 * (`highAnswer.readValues`)는 부등호를 못 읽는다. 그래서 여기 셋을 따로 둔다:
 *
 *   · **식 읽개** `parseChain` — 지면의 수식을 부등호로 가르고, 각 변을 **정확한 유리수**로 값 매긴다
 *     (정수·소수·문자·붙여 쓴 곱·괄호·`|…|`·`\dfrac`·거듭제곱·완전제곱 근호). 모르는 꼴은 던진다.
 *   · **부호표 풀이** `chartSolve` — 참·거짓이 바뀔 수 있는 점(시험이 facts 에서 따로 구한다)으로
 *     수직선을 나눠 칸마다 한 점씩 대 본다. 제품의 구간 셈(`h1LinIneq.ivMeet`)과 **다른 길**이다.
 *   · **구간 정답 읽개** `readIv` — 끝점은 `highAnswer.readValues` 로 읽고, 정확한 값과 맞대 둔다.
 *
 * 부등호 번호표(`REL`)는 제품 `REL_CODE` 와 **같은 값을 여기 다시 적었다** — 제품이 번호를 바꾸면
 * 여기와 갈라져 시험이 빨개진다.
 */
import { readValues } from "./highAnswer";
import { mathSpans } from "./highPage";

// ───────────────────────────── 유리수 ─────────────────────────────

export type F = { readonly n: number; readonly d: number };

function gcdAbs(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function fr(n: number, d = 1): F {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) {
    throw new Error(`유리수가 정수 둘로 안 떨어지거나 너무 크다: ${n}/${d}`);
  }
  if (d === 0) throw new Error("분모가 0 이다");
  if (n === 0) return { n: 0, d: 1 };
  const k = gcdAbs(n, d) * (d < 0 ? -1 : 1);
  return { n: n / k, d: d / k };
}

export const fAdd = (a: F, b: F): F => fr(a.n * b.d + b.n * a.d, a.d * b.d);
export const fSub = (a: F, b: F): F => fr(a.n * b.d - b.n * a.d, a.d * b.d);
export const fMul = (a: F, b: F): F => fr(a.n * b.n, a.d * b.d);
export function fDiv(a: F, b: F): F {
  if (b.n === 0) throw new Error("0 으로 나눈다");
  return fr(a.n * b.d, a.d * b.n);
}
export const fNeg = (a: F): F => fr(-a.n, a.d);
export const fCmp = (a: F, b: F): number => Math.sign(a.n * b.d - b.n * a.d);
export const fEq = (a: F, b: F): boolean => a.n === b.n && a.d === b.d;
export const fNum = (a: F): number => a.n / a.d;
export const fAbs = (a: F): F => (a.n < 0 ? fNeg(a) : a);

function fPow(a: F, e: number): F {
  if (!Number.isInteger(e) || e < 0) throw new Error(`지수가 이상하다: ${e}`);
  let out = fr(1);
  for (let i = 0; i < e; i += 1) out = fMul(out, a);
  return out;
}

function isqrt(n: number): number | null {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  for (const c of [r - 1, r, r + 1]) if (c >= 0 && c * c === n) return c;
  return null;
}

function fSqrt(a: F): F {
  const r = isqrt(a.n);
  const s = isqrt(a.d);
  if (r === null || s === null)
    throw new Error("근호 안이 유리수의 제곱이 아니다");
  return fr(r, s);
}

/** 정수 계수 이차식의 유리근 — 판별식이 제곱수가 아니면 `null`. */
export function ratRoots(a: number, b: number, c: number): F[] | null {
  const D = b * b - 4 * a * c;
  if (D < 0) return [];
  const r = isqrt(D);
  if (r === null) return null;
  const xs = [fr(-b - r, 2 * a), fr(-b + r, 2 * a)];
  return fEq(xs[0]!, xs[1]!) ? [xs[0]!] : xs.sort(fCmp);
}

// ───────────────────────────── 식 읽개 ─────────────────────────────

type Tok =
  | { k: "num"; v: F }
  | { k: "var"; v: string }
  | { k: "cmd"; v: string }
  | { k: "sym"; v: string };

type Node =
  | { t: "num"; v: F }
  | { t: "var"; v: string }
  | { t: "neg"; a: Node }
  | { t: "abs"; a: Node }
  | { t: "sqrt"; a: Node }
  | { t: "pow"; a: Node; e: number }
  | { t: "bin"; op: "+" | "-" | "*" | "/"; a: Node; b: Node };

export type Env = Readonly<Record<string, F>>;

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const num = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (num) {
      const [whole, frac = ""] = num[0].split(".");
      out.push({
        k: "num",
        v: fr(Number(whole + frac), 10 ** frac.length),
      });
      i += num[0].length;
      continue;
    }
    if (ch === "\\") {
      const m = /^\\([a-zA-Z]+|[,;!])/.exec(src.slice(i));
      if (!m)
        throw new Error(
          `수식을 못 읽는다 — «${src.slice(i, i + 12)}» (${src})`,
        );
      i += m[0].length;
      if (/^[,;!]$/.test(m[1]!)) continue;
      out.push({ k: "cmd", v: m[1]! });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      out.push({ k: "var", v: ch });
      i += 1;
      continue;
    }
    if ("+-()[]{}|^<>=".includes(ch)) {
      out.push({ k: "sym", v: ch });
      i += 1;
      continue;
    }
    throw new Error(`수식을 못 읽는다 — «${src.slice(i, i + 12)}» (${src})`);
  }
  return out;
}

class ExprParser {
  private pos = 0;
  private absDepth = 0;

  constructor(
    private readonly toks: readonly Tok[],
    private readonly src: string,
  ) {}

  private fail(why: string): never {
    throw new Error(`수식을 못 읽는다 — ${why} (${this.src})`);
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private isSym(t: Tok | undefined, v: string): boolean {
    return t !== undefined && t.k === "sym" && t.v === v;
  }

  private expect(v: string): void {
    if (
      this.peek()?.k === "cmd" &&
      (this.peek() as { v: string }).v === "right"
    )
      this.pos += 1;
    if (!this.isSym(this.peek(), v)) this.fail(`«${v}» 가 와야 할 자리`);
    this.pos += 1;
  }

  parseAll(): Node {
    const n = this.expr();
    if (this.pos !== this.toks.length) this.fail("끝에 남은 조각");
    return n;
  }

  private expr(): Node {
    let node: Node;
    const first = this.peek();
    if (this.isSym(first, "+")) {
      this.pos += 1;
      node = this.term();
    } else if (this.isSym(first, "-")) {
      this.pos += 1;
      node = { t: "neg", a: this.term() };
    } else node = this.term();
    for (;;) {
      const t = this.peek();
      if (this.isSym(t, "+") || this.isSym(t, "-")) {
        this.pos += 1;
        node = {
          t: "bin",
          op: (t as { v: string }).v as "+" | "-",
          a: node,
          b: this.term(),
        };
        continue;
      }
      return node;
    }
  }

  private startsFactor(t: Tok | undefined): boolean {
    if (!t) return false;
    if (t.k === "num" || t.k === "var") return true;
    if (t.k === "cmd")
      return ["dfrac", "frac", "tfrac", "sqrt", "left"].includes(t.v);
    return t.v === "(" || (t.v === "|" && this.absDepth === 0);
  }

  private term(): Node {
    let node = this.power();
    for (;;) {
      const t = this.peek();
      if (t?.k === "cmd" && (t.v === "times" || t.v === "cdot")) {
        this.pos += 1;
        node = { t: "bin", op: "*", a: node, b: this.power() };
        continue;
      }
      if (this.startsFactor(t)) {
        node = { t: "bin", op: "*", a: node, b: this.power() };
        continue;
      }
      return node;
    }
  }

  private power(): Node {
    const base = this.base();
    if (!this.isSym(this.peek(), "^")) return base;
    this.pos += 1;
    let e: Tok | undefined;
    if (this.isSym(this.peek(), "{")) {
      this.pos += 1;
      e = this.toks[this.pos];
      this.pos += 1;
      this.expect("}");
    } else {
      e = this.toks[this.pos];
      this.pos += 1;
    }
    if (!e || e.k !== "num" || e.v.d !== 1) this.fail("지수가 자연수가 아니다");
    return { t: "pow", a: base, e: e.v.n };
  }

  private group(): Node {
    this.expect("{");
    const n = this.expr();
    this.expect("}");
    return n;
  }

  private base(): Node {
    const t = this.peek();
    if (!t) this.fail("수가 와야 할 자리에서 끝났다");
    this.pos += 1;
    if (t.k === "num") return { t: "num", v: t.v };
    if (t.k === "var") return { t: "var", v: t.v };
    if (t.k === "cmd") {
      if (t.v === "left") return this.base();
      if (t.v === "dfrac" || t.v === "frac" || t.v === "tfrac") {
        const a = this.group();
        const b = this.group();
        return { t: "bin", op: "/", a, b };
      }
      if (t.v === "sqrt") return { t: "sqrt", a: this.group() };
      return this.fail(`모르는 명령 \\${t.v}`);
    }
    if (t.v === "(") {
      const n = this.expr();
      this.expect(")");
      return n;
    }
    if (t.v === "{") {
      const n = this.expr();
      this.expect("}");
      return n;
    }
    if (t.v === "|") {
      this.absDepth += 1;
      const n = this.expr();
      this.absDepth -= 1;
      this.expect("|");
      return { t: "abs", a: n };
    }
    return this.fail(`«${t.v}» 로 시작하는 식`);
  }
}

function evalNode(n: Node, env: Env): F {
  switch (n.t) {
    case "num":
      return n.v;
    case "var": {
      const v = env[n.v];
      if (v === undefined) throw new Error(`값이 안 매겨진 문자: ${n.v}`);
      return v;
    }
    case "neg":
      return fNeg(evalNode(n.a, env));
    case "abs":
      return fAbs(evalNode(n.a, env));
    case "sqrt":
      return fSqrt(evalNode(n.a, env));
    case "pow":
      return fPow(evalNode(n.a, env), n.e);
    default: {
      const a = evalNode(n.a, env);
      const b = evalNode(n.b, env);
      if (n.op === "+") return fAdd(a, b);
      if (n.op === "-") return fSub(a, b);
      if (n.op === "*") return fMul(a, b);
      return fDiv(a, b);
    }
  }
}

/** 식 하나(부등호 없음)의 값 — 문자는 `env` 로 매긴다. */
export function evalTex(tex: string, env: Env = {}): F {
  return evalNode(new ExprParser(tokenize(tex), tex).parseAll(), env);
}

// ───────────────────────────── 부등호 사슬 ─────────────────────────────

/** 부등호 번호 — 제품 `REL_CODE` 와 같은 값을 **다시 적었다**(0 `<` · 1 `>` · 2 `≤` · 3 `≥`). */
export const REL = ["<", ">", "le", "ge"] as const;
export type RelName = (typeof REL)[number] | "=";

const REL_CMD: Record<string, RelName> = {
  le: "le",
  leq: "le",
  ge: "ge",
  geq: "ge",
  lt: "<",
  gt: ">",
};

export function relHolds(r: RelName, a: F, b: F): boolean {
  const c = fCmp(a, b);
  if (r === "<") return c < 0;
  if (r === ">") return c > 0;
  if (r === "le") return c <= 0;
  if (r === "ge") return c >= 0;
  return c === 0;
}

/** facts 의 번호로 — `m·x rel c` */
export const relOf = (code: number): RelName => {
  const r = REL[code];
  if (r === undefined) throw new Error(`모르는 부등호 번호: ${code}`);
  return r;
};

export type Chain = { nodes: Node[]; rels: RelName[]; tex: string };

/** 수식 하나를 부등호로 가른 사슬 — 부등호가 없으면 `null`, 못 읽으면 던진다. */
export function parseChain(tex: string): Chain | null {
  const toks = tokenize(tex);
  const segs: Tok[][] = [[]];
  const rels: RelName[] = [];
  let depth = 0;
  for (const t of toks) {
    if (t.k === "sym" && (t.v === "(" || t.v === "{")) depth += 1;
    if (t.k === "sym" && (t.v === ")" || t.v === "}")) depth -= 1;
    const rel =
      depth === 0
        ? t.k === "sym" && (t.v === "<" || t.v === ">" || t.v === "=")
          ? (t.v as RelName)
          : t.k === "cmd"
            ? REL_CMD[t.v]
            : undefined
        : undefined;
    if (rel !== undefined) {
      rels.push(rel);
      segs.push([]);
      continue;
    }
    segs[segs.length - 1]!.push(t);
  }
  if (rels.length === 0) return null;
  const nodes = segs.map((s) => new ExprParser(s, tex).parseAll());
  return { nodes, rels, tex };
}

export function chainHolds(ch: Chain, env: Env): boolean {
  const vals = ch.nodes.map((n) => evalNode(n, env));
  return ch.rels.every((r, i) => relHolds(r, vals[i]!, vals[i + 1]!));
}

/** `\begin{cases}A\\B\end{cases}` 의 줄들 — 아니면 `null`. */
export function casesRows(span: string): string[] | null {
  const m = /^\s*\\begin\{cases\}([\s\S]*)\\end\{cases\}\s*$/.exec(span);
  return m ? m[1]!.split("\\\\").map((r) => r.trim()) : null;
}

export type Pred = (x: F) => boolean;

export type Shown = { tex: string; holds: Pred };

/**
 * 발문 수식 가운데 **읽을 수 있는 부등식(등식)** 전부 — `v` 에 값을 넣어 참·거짓을 내는 함수로.
 * 연립이면 줄마다 하나, 그리고 줄 전체의 «그리고» 하나. 문자는 `env` 로 매기고, 못 매기는 수식
 * (단위·다른 문자)은 **건너뛴다** — 건너뛴 것 때문에 초록이 되지는 않는다(찾는 쪽이 못 찾으면 빨강).
 */
export function shownPreds(content: string, env: Env, v = "x"): Shown[] {
  const out: Shown[] = [];
  const usable = (tex: string): Chain | null => {
    try {
      const ch = parseChain(tex);
      if (!ch) return null;
      chainHolds(ch, { ...env, [v]: fr(0) });
      return ch;
    } catch {
      return null;
    }
  };
  for (const span of mathSpans(content)) {
    const rows = casesRows(span) ?? [span];
    const chains = rows.map(usable);
    chains.forEach((ch, i) => {
      if (ch)
        out.push({
          tex: rows[i]!,
          holds: (x) => chainHolds(ch, { ...env, [v]: x }),
        });
    });
    if (rows.length > 1 && chains.every((c) => c !== null)) {
      out.push({
        tex: span,
        holds: (x) => chains.every((ch) => chainHolds(ch!, { ...env, [v]: x })),
      });
    }
  }
  return out;
}

/** 대 볼 점 — 정수 · 반 · 삼분의 일 격자와 facts 가 준 임계점(±1/1000 까지). */
export function probePoints(crit: readonly F[] = []): F[] {
  const seen = new Map<string, F>();
  const add = (x: F) => seen.set(`${x.n}/${x.d}`, x);
  for (let n = -30; n <= 30; n += 1) add(fr(n));
  for (let n = -16; n <= 16; n += 1) add(fr(n, 2));
  for (let n = -12; n <= 12; n += 1) add(fr(n, 3));
  const eps = fr(1, 1000);
  for (const c of crit) {
    add(c);
    add(fAdd(c, eps));
    add(fSub(c, eps));
  }
  return [...seen.values()];
}

/** 두 조건이 대 본 점에서 다 같은가 — 어긋난 첫 점, 없으면 `null`. */
export function firstDiff(a: Pred, b: Pred, pts: readonly F[]): F | null {
  for (const x of pts) if (a(x) !== b(x)) return x;
  return null;
}

/** 발문에 `want` 와 같은 조건이 있나 */
export function hasShown(
  shown: readonly Shown[],
  want: Pred,
  pts: readonly F[],
): boolean {
  return shown.some((s) => firstDiff(s.holds, want, pts) === null);
}

// ───────────────────────────── 부호표 풀이 ─────────────────────────────

/** 시험 쪽 구간 — 제품 `Iv` 와 따로 적었다. */
export type TIv = {
  lo: F | null;
  loC: boolean;
  hi: F | null;
  hiC: boolean;
};

export function tivHas(iv: TIv, x: F): boolean {
  if (iv.lo) {
    const c = fCmp(x, iv.lo);
    if (c < 0 || (c === 0 && !iv.loC)) return false;
  }
  if (iv.hi) {
    const c = fCmp(x, iv.hi);
    if (c > 0 || (c === 0 && !iv.hiC)) return false;
  }
  return true;
}

/**
 * 참·거짓이 바뀔 수 있는 점 `crit` 로 수직선을 나눠, 점과 칸마다 한 번씩 대 보고 참인 곳을 이어 붙인다.
 * `crit` 는 부르는 쪽이 facts 에서 **따로** 구한다(일차식의 근 · 절댓값의 경계 · 이차식의 유리근).
 */
export function chartSolve(pred: Pred, crit: readonly F[]): TIv[] {
  const cs = [...crit]
    .sort(fCmp)
    .filter((c, i, a) => i === 0 || !fEq(c, a[i - 1]!));
  type Piece = { at: F | null; point: boolean; lo: F | null; hi: F | null };
  const pieces: Piece[] = [];
  if (cs.length === 0) {
    return pred(fr(0)) ? [{ lo: null, loC: false, hi: null, hiC: false }] : [];
  }
  pieces.push({ at: fSub(cs[0]!, fr(1)), point: false, lo: null, hi: cs[0]! });
  cs.forEach((c, i) => {
    pieces.push({ at: c, point: true, lo: c, hi: c });
    const next = cs[i + 1];
    pieces.push({
      at: next ? fDiv(fAdd(c, next), fr(2)) : fAdd(c, fr(1)),
      point: false,
      lo: c,
      hi: next ?? null,
    });
  });
  const out: TIv[] = [];
  let cur: TIv | null = null;
  for (const p of pieces) {
    const ok = pred(p.at!);
    if (ok) {
      if (!cur) {
        cur = p.point
          ? { lo: p.lo, loC: true, hi: p.hi, hiC: true }
          : { lo: p.lo, loC: false, hi: p.hi, hiC: false };
      } else {
        cur.hi = p.hi;
        cur.hiC = p.point;
      }
    } else if (cur) {
      if (p.point) cur.hiC = false;
      out.push(cur);
      cur = null;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function tivEq(a: TIv, b: TIv): boolean {
  const same = (x: F | null, y: F | null) =>
    (x === null && y === null) || (x !== null && y !== null && fEq(x, y));
  return (
    same(a.lo, b.lo) &&
    same(a.hi, b.hi) &&
    (a.lo === null || a.loC === b.loC) &&
    (a.hi === null || a.hiC === b.hiC)
  );
}

export function tivText(iv: TIv): string {
  const f = (x: F) => (x.d === 1 ? `${x.n}` : `${x.n}/${x.d}`);
  const lo = iv.lo ? `${iv.loC ? "[" : "("}${f(iv.lo)}` : "(-∞";
  const hi = iv.hi ? `${f(iv.hi)}${iv.hiC ? "]" : ")"}` : "∞)";
  return `${lo}, ${hi}`;
}

/** 조건을 만족시키는 정수를 하나하나 대입해 모은다. */
export function intsWhere(pred: Pred, lo = -300, hi = 300): number[] {
  const out: number[] = [];
  for (let n = lo; n <= hi; n += 1) if (pred(fr(n))) out.push(n);
  return out;
}

// ───────────────────────────── 정답 읽기 ─────────────────────────────

const REL_SPLIT = /(\\leq?|\\geq?|<|>|=)(?![a-zA-Z])/;

function relName(tok: string): RelName {
  if (tok.startsWith("\\le")) return "le";
  if (tok.startsWith("\\ge")) return "ge";
  return tok as RelName;
}

/** 끝점 — `highAnswer.readValues` 로 읽은 값과 정확한 값이 같아야 한다. */
function endpoint(tex: string): F {
  const exact = evalTex(tex);
  const vals = readValues(tex);
  if (
    vals.length !== 1 ||
    vals[0]!.im !== 0 ||
    Math.abs(vals[0]!.re - fNum(exact)) > 1e-9
  ) {
    throw new Error(`끝점을 두 읽개가 다르게 읽는다: ${tex}`);
  }
  return exact;
}

/**
 * 구간 정답 `$a<x\le b$` · `$x\ge a$` · `$x=c$` 를 읽는다. 끝점은 유리수여야 한다.
 * 모양이 어긋나면(끝점 순서가 거꾸로 · 부등호가 섞임) 던진다.
 */
export function readIv(answer: string, v = "x"): TIv {
  const m = /^\$([^$]+)\$$/.exec(answer.trim());
  if (!m) throw new Error(`정답이 수식 한 덩어리가 아니다: ${answer}`);
  const parts = m[1]!.split(REL_SPLIT).map((s) => s.trim());
  const sides = parts.filter((_, i) => i % 2 === 0);
  const rels = parts.filter((_, i) => i % 2 === 1).map(relName);
  if (sides.length === 3 && sides[1] === v) {
    if (!rels.every((r) => r === "<" || r === "le"))
      throw new Error(`구간 부등호가 이상하다: ${answer}`);
    const lo = endpoint(sides[0]!);
    const hi = endpoint(sides[2]!);
    if (fCmp(lo, hi) >= 0) throw new Error(`끝점 순서가 거꾸로다: ${answer}`);
    return { lo, loC: rels[0] === "le", hi, hiC: rels[1] === "le" };
  }
  if (sides.length === 2 && sides[0] === v) {
    const t = endpoint(sides[1]!);
    const r = rels[0]!;
    if (r === "=") return { lo: t, loC: true, hi: t, hiC: true };
    if (r === ">" || r === "ge")
      return { lo: t, loC: r === "ge", hi: null, hiC: false };
    return { lo: null, loC: false, hi: t, hiC: r === "le" };
  }
  throw new Error(`구간 정답의 모양을 못 읽는다: ${answer}`);
}

/**
 * 구간 `iv` 가 조건 `prop` 을 만족시키는 값의 집합과 같은가 — 끝점 · 끝점±1/1000 · ±1/10 · 정수 격자
 * · 부르는 쪽이 준 점에서 대 본다. 어긋난 점을 글로, 없으면 `null`.
 */
export function ivVsProp(
  iv: TIv,
  prop: Pred,
  extra: readonly F[] = [],
): string | null {
  const pts: F[] = [...extra];
  for (let n = -60; n <= 60; n += 1) pts.push(fr(n));
  for (const e of [iv.lo, iv.hi]) {
    if (!e) continue;
    for (const d of [fr(0), fr(1, 1000), fr(-1, 1000), fr(1, 10), fr(-1, 10)])
      pts.push(fAdd(e, d));
  }
  for (const x of pts) {
    if (tivHas(iv, x) !== prop(x)) {
      return `${tivText(iv)} 인데 ${x.n}/${x.d} 에서 조건은 ${prop(x)}`;
    }
  }
  return null;
}

/** 발문 수식 속의 수 전부(부호 없이) — 문장제가 facts 의 수치를 보여 주나 볼 때. */
export function spanNumbers(content: string): number[] {
  return mathSpans(content).flatMap((s) =>
    [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0])),
  );
}
