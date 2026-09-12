/**
 * 고등 다항식 — **정수 계수** 다항식의 셈과 지면 표기. 고등 유형 모듈이 같이 쓴다.
 *
 * 계수 배열은 **낮은 차수부터**다 — `p[i]` 가 $x^{i}$ 의 계수. `[6, -5, 1]` 은 $x^{2}-5x+6$.
 *
 * ## 왜 따로 두나
 *
 * 중등은 유형마다 `signed`·`poly`·`term` 을 제 손으로 적었다(실측 여섯 벌 —
 * `m1Shared.poly` · `m1Expr.signed` · `m1Top5i.coefTerm` …). 고등은 다항식이 거의 모든
 * 중단원에 나오므로 **처음부터 한 벌**로 둔다. 지면 냄새(`1x`·`x^{1}`·`+-`·`+0` —
 * `src/__tests__/helpers/midPage.ts` `pageSmells`)를 여기 한 곳이 막는다.
 *
 * ## 값을 지어내지 않는다
 *
 * 나눗셈은 **정수로 떨어질 때만** 한다 — 떨어지지 않으면 던진다(조용히 반올림 금지).
 * 유형 생성기는 답을 먼저 정하고 식을 짓기 때문에, 떨어지지 않는다면 생성기가 틀린 것이다.
 */

export type Poly = readonly number[];

/** 뒤쪽(높은 차수)의 0 을 걷는다. 영다항식은 `[0]`. */
export function trim(p: Poly): number[] {
  const out = [...p];
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  if (out.length === 0) out.push(0);
  return out;
}

export function degree(p: Poly): number {
  const t = trim(p);
  return t.length === 1 && t[0] === 0 ? -Infinity : t.length - 1;
}

export function add(a: Poly, b: Poly): number[] {
  const n = Math.max(a.length, b.length);
  return trim(Array.from({ length: n }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
}

export function scale(p: Poly, k: number): number[] {
  return trim(p.map((c) => c * k));
}

export function sub(a: Poly, b: Poly): number[] {
  return add(a, scale(b, -1));
}

export function mul(a: Poly, b: Poly): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1)
    for (let j = 0; j < b.length; j += 1) out[i + j]! += a[i]! * b[j]!;
  return trim(out);
}

export function pow(p: Poly, n: number): number[] {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`거듭제곱 지수가 이상합니다: ${n}`);
  let out: number[] = [1];
  for (let i = 0; i < n; i += 1) out = mul(out, p);
  return out;
}

/** 호너법 — 값이 안전한 정수 범위를 넘으면 던진다(지면에 쓸 수 없는 크기다). */
export function evalAt(p: Poly, x: number): number {
  let v = 0;
  for (let i = p.length - 1; i >= 0; i -= 1) v = v * x + p[i]!;
  if (!Number.isSafeInteger(v)) throw new Error(`값이 너무 큽니다: p(${x})`);
  return v;
}

/** $(x-r_1)(x-r_2)\cdots$ 를 전개한다. */
export function fromRoots(roots: readonly number[]): number[] {
  return roots.reduce<number[]>((acc, r) => mul(acc, [-r, 1]), [1]);
}

/** $(x-s)$ 에 대한 전개 계수 $a_0 + a_1(x-s) + \cdots$ 를 $x$ 의 다항식으로. */
export function shiftedToPoly(coefs: readonly number[], s: number): number[] {
  return coefs.reduce<number[]>(
    (acc, c, i) => add(acc, scale(pow([-s, 1], i), c)),
    [0],
  );
}

/**
 * `a = b·q + r`, `deg r < deg b`. **정수로 떨어지지 않으면 던진다.**
 */
export function divMod(a: Poly, b: Poly): { q: number[]; r: number[] } {
  const B = trim(b);
  const db = degree(B);
  if (db === -Infinity) throw new Error("영다항식으로 나눌 수 없습니다");
  const lead = B[B.length - 1]!;
  let r = trim(a);
  const q = new Array<number>(Math.max(1, r.length - B.length + 1)).fill(0);
  while (degree(r) >= db) {
    const shift = r.length - B.length;
    const top = r[r.length - 1]!;
    if (top % lead !== 0)
      throw new Error(
        "정수 계수로 떨어지지 않는 나눗셈입니다 — 생성기 매개변수를 확인하십시오",
      );
    const k = top / lead;
    q[shift] = k;
    r = sub(r, mul([...new Array<number>(shift).fill(0), k], B));
  }
  return { q: trim(q), r };
}

// ───────────────────────────── 지면 표기 ─────────────────────────────

/** 한 항 — 부호를 붙인다. 첫 항이면 `+` 를 안 쓴다. 계수 ±1 은 숫자를 안 쓴다. */
export function term(coef: number, body: string, first = false): string {
  const sign = coef < 0 ? "-" : first ? "" : "+";
  const abs = Math.abs(coef);
  if (body === "") return `${sign}${abs}`;
  return `${sign}${abs === 1 ? "" : abs}${body}`;
}

function powerTex(v: string, i: number): string {
  if (i === 0) return "";
  if (i === 1) return v;
  return `${v}^{${i}}`;
}

/**
 * 다항식의 KaTeX 몸통 — **내림차순**, 0 항 생략, 계수 ±1 은 숫자 생략. `$` 는 밖에서 감싼다.
 * 영다항식은 `0`.
 */
export function polyTex(p: Poly, v = "x"): string {
  const t = trim(p);
  const parts: string[] = [];
  for (let i = t.length - 1; i >= 0; i -= 1) {
    const c = t[i]!;
    if (c === 0) continue;
    parts.push(term(c, powerTex(v, i), parts.length === 0));
  }
  return parts.length === 0 ? "0" : parts.join("");
}

/** $x-r$ 의 몸통 — `x-3` · `x+2` · `x`. */
export function factorTex(r: number, v = "x"): string {
  if (r === 0) return v;
  return r > 0 ? `${v}-${r}` : `${v}+${-r}`;
}

/** 곱으로 쓸 때 괄호를 친 인수 — `(x-3)` · `x`. */
export function factorParen(r: number, v = "x"): string {
  return r === 0 ? v : `(${factorTex(r, v)})`;
}

/**
 * 문자 계수들의 일차 결합 — `[[1,"b"],[-1,"c"]], -1` → `b-c-1`.
 * 계수 0 인 항은 버린다. 전부 0 이면 `0`.
 */
export function linTex(
  terms: readonly (readonly [number, string])[],
  k = 0,
): string {
  const parts: string[] = [];
  for (const [c, sym] of terms) {
    if (c === 0) continue;
    parts.push(term(c, sym, parts.length === 0));
  }
  if (k !== 0) parts.push(term(k, "", parts.length === 0));
  return parts.length === 0 ? "0" : parts.join("");
}

/** 등식 옆에 붙는 수 — 음수면 괄호. 곱셈 `3\times(-2)` 처럼 쓸 때. */
export function paren(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}
