/**
 * 고등 수 표기 — **유리수 · 근호 `(a+b√r)/d` · 복소수(유리 실수부·허수부)** 의 정규형과 지면 글자.
 *
 * 물결 1 의 복소수 · 이차방정식 · 여러 가지 방정식 · 부등식 모듈이 같이 쓴다. 표기가 모듈마다
 * 갈리면 한 시험지 안에서 `\dfrac{1-\sqrt{5}}{2}` 와 `\dfrac{1}{2}-\dfrac{\sqrt{5}}{2}` 가
 * 섞여 나간다 — 그래서 **한 벌**만 둔다(`high-engine-plan.md` §1-2).
 *
 * ## 표기 규칙 (교과서 관행)
 *
 * - 분수는 `\dfrac`, **가분수 그대로**(`\dfrac{7}{3}`). 대분수 변환은 2026-08-24 에 지면 경로에서
 *   빠졌다(`textPreprocess.ts` §대분수) — 중등 `m3Trig.frac` 의 「가분수면 던진다」는 그 전의 규칙이라
 *   **옮겨 오지 않았다.**
 * - 음의 분수는 부호를 밖에: `-\dfrac{3}{2}`.
 * - 근호 식은 **유리항 먼저**: `1-\sqrt{2}` · `\dfrac{-1+\sqrt{3}i}{2}`. 근의 공식 `\dfrac{-b\pm\sqrt{D}}{2a}` 와
 *   같은 순서라 `±` 꼴(`surdPmTex`)과 한 짝이 된다. 유리항이 0 이면 부호를 분수 밖에: `-\dfrac{\sqrt{5}}{2}`.
 * - 허수 단위는 근호 **뒤**: `\sqrt{3}i` · `2i` · `i`.
 * - 복소수는 `a+bi` — 허수부가 분수면 `\dfrac{3}{2}i`.
 *
 * 값이 안전한 정수 범위를 넘으면 던진다 — 지면에 쓸 수 없는 크기다.
 */

// ───────────────────────────── 정수 ─────────────────────────────

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function safe(v: number, what: string): number {
  if (!Number.isSafeInteger(v)) {
    throw new Error(`${what} 이(가) 정수가 아니거나 너무 큽니다: ${v}`);
  }
  return v;
}

// ───────────────────────────── 유리수 ─────────────────────────────

/** 기약분수 `n/d` — `d > 0`. 0 은 `{ n: 0, d: 1 }`. */
export type Q = { readonly n: number; readonly d: number };

export function q(n: number, d = 1): Q {
  safe(n, "분자");
  safe(d, "분모");
  if (d === 0) throw new Error("분모가 0 입니다");
  if (n === 0) return { n: 0, d: 1 };
  const g = gcd(n, d);
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

export const qAdd = (a: Q, b: Q): Q => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const qSub = (a: Q, b: Q): Q => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const qMul = (a: Q, b: Q): Q => q(a.n * b.n, a.d * b.d);

export function qDiv(a: Q, b: Q): Q {
  if (b.n === 0) throw new Error("0 으로 나눌 수 없습니다");
  return q(a.n * b.d, a.d * b.n);
}

export const qNeg = (a: Q): Q => q(-a.n, a.d);
export const qEq = (a: Q, b: Q): boolean => a.n === b.n && a.d === b.d;
export const qValue = (a: Q): number => a.n / a.d;

/** `3` · `-\dfrac{3}{2}` · `\dfrac{7}{3}` */
export function qTex(x: Q): string {
  if (x.d === 1) return String(x.n);
  return `${x.n < 0 ? "-" : ""}\\dfrac{${Math.abs(x.n)}}{${x.d}}`;
}

// ───────────────────────────── 근호 ─────────────────────────────

/**
 * `(a + b√r) / d` — 정규형:
 * `d > 0` · `r` 은 제곱인수 없는 수(음수면 허수, `-1` 이면 `i`) · 근호 항이 없으면 `b = 0, r = 1`
 * · `a`, `b`, `d` 의 최대공약수 1.
 */
export type Surd = {
  readonly a: number;
  readonly b: number;
  readonly r: number;
  readonly d: number;
};

export function surd(a: number, b: number, r: number, d = 1): Surd {
  for (const [what, v] of [
    ["유리항", a],
    ["근호 계수", b],
    ["근호 안", r],
    ["분모", d],
  ] as const) {
    safe(v, what);
  }
  if (d === 0) throw new Error("분모가 0 입니다");
  let A = d < 0 ? -a : a;
  let B = d < 0 ? -b : b;
  const D = Math.abs(d);
  let R = 1;
  if (B !== 0 && r !== 0) {
    let k = Math.abs(r);
    for (let p = 2; p * p <= k; p += 1) {
      while (k % (p * p) === 0) {
        k /= p * p;
        B *= p;
      }
    }
    if (k === 1 && r > 0) {
      A += B;
      B = 0;
    } else {
      R = r < 0 ? -k : k;
    }
  } else {
    B = 0;
  }
  safe(A, "유리항");
  safe(B, "근호 계수");
  const g = gcd(gcd(A, B), D);
  return { a: A / g, b: B / g, r: B === 0 ? 1 : R, d: D / g };
}

/** `|b|√r` 의 몸통 — `2\sqrt{3}` · `\sqrt{3}i` · `3i` · `i`. */
function radBody(absB: number, r: number): string {
  const coef = absB === 1 ? "" : String(absB);
  if (r === -1) return `${coef}i`;
  if (r < 0) return `${coef}\\sqrt{${-r}}i`;
  return `${coef}\\sqrt{${r}}`;
}

export function surdTex(s: Surd): string {
  if (s.b === 0) return qTex(q(s.a, s.d));
  const body = radBody(Math.abs(s.b), s.r);
  if (s.a === 0) {
    const sign = s.b < 0 ? "-" : "";
    return s.d === 1 ? `${sign}${body}` : `${sign}\\dfrac{${body}}{${s.d}}`;
  }
  const num = `${s.a}${s.b < 0 ? "-" : "+"}${body}`;
  return s.d === 1 ? num : `\\dfrac{${num}}{${s.d}}`;
}

/** 두 근을 한 번에 — `\dfrac{-1\pm\sqrt{3}i}{2}` · `1\pm\sqrt{2}` · `\pm\dfrac{\sqrt{3}}{3}`. */
export function surdPmTex(s: Surd): string {
  if (s.b === 0) throw new Error("근호 항이 없어 ± 꼴로 쓸 수 없습니다");
  const body = radBody(Math.abs(s.b), s.r);
  // 🔴 `\pm` 뒤가 글자로 시작하면(`i` — $\sqrt{-1}$ 의 계수가 1 일 때) 붙여 쓴 `\pmi` 가 **없는 명령**이 된다.
  //    KaTeX 가 던지는 자리이고, 지면에서는 그 수식이 날 글자로 나간다(2026-10-08 적재 전 관문이
  //    「$x=\pmi$」로 찾았다). 그때만 한 칸 띈다 — 수 · 근호로 시작하는 다른 꼴은 한 바이트도 안 바뀐다.
  const pm = /^[A-Za-z]/.test(body) ? "\\pm " : "\\pm";
  if (s.a === 0) {
    return s.d === 1 ? `${pm}${body}` : `\\pm\\dfrac{${body}}{${s.d}}`;
  }
  const num = `${s.a}${pm}${body}`;
  return s.d === 1 ? num : `\\dfrac{${num}}{${s.d}}`;
}

/**
 * 정수 계수 이차방정식 `Ax²+Bx+C=0` 의 두 근 — `roots[0]` 이 `+√D` 쪽.
 * 판별식이 제곱수면 근호 없는 유리근, 음수면 허근이 된다.
 */
export function quadRoots(
  A: number,
  B: number,
  C: number,
): { D: number; roots: readonly [Surd, Surd] } {
  if (A === 0) throw new Error("이차항의 계수가 0 입니다");
  const D = safe(B * B - 4 * A * C, "판별식");
  return { D, roots: [surd(-B, 1, D, 2 * A), surd(-B, -1, D, 2 * A)] };
}

// ───────────────────────────── 복소수 ─────────────────────────────

/** 실수부·허수부가 유리수인 복소수. */
export type Cx = { readonly re: Q; readonly im: Q };

const toQ = (x: Q | number): Q => (typeof x === "number" ? q(x) : x);

export function cplx(re: Q | number, im: Q | number = 0): Cx {
  return { re: toQ(re), im: toQ(im) };
}

export const cAdd = (a: Cx, b: Cx): Cx =>
  cplx(qAdd(a.re, b.re), qAdd(a.im, b.im));
export const cSub = (a: Cx, b: Cx): Cx =>
  cplx(qSub(a.re, b.re), qSub(a.im, b.im));
export const cMul = (a: Cx, b: Cx): Cx =>
  cplx(
    qSub(qMul(a.re, b.re), qMul(a.im, b.im)),
    qAdd(qMul(a.re, b.im), qMul(a.im, b.re)),
  );
export const cConj = (a: Cx): Cx => cplx(a.re, qNeg(a.im));
export const cEq = (a: Cx, b: Cx): boolean =>
  qEq(a.re, b.re) && qEq(a.im, b.im);

export function cDiv(a: Cx, b: Cx): Cx {
  const norm = qAdd(qMul(b.re, b.re), qMul(b.im, b.im));
  if (norm.n === 0) throw new Error("0 으로 나눌 수 없습니다");
  const top = cMul(a, cConj(b));
  return cplx(qDiv(top.re, norm), qDiv(top.im, norm));
}

/** 정수 거듭제곱 — 음의 지수는 역수의 거듭제곱. */
export function cPow(z: Cx, n: number): Cx {
  safe(n, "지수");
  if (n < 0) return cDiv(cplx(1), cPow(z, -n));
  let out = cplx(1);
  for (let i = 0; i < n; i += 1) out = cMul(out, z);
  return out;
}

/** `3-2i` · `-i` · `\dfrac{1}{2}+\dfrac{3}{2}i` */
export function cTex(z: Cx): string {
  if (z.im.n === 0) return qTex(z.re);
  const abs = q(Math.abs(z.im.n), z.im.d);
  const imBody = abs.n === 1 && abs.d === 1 ? "i" : `${qTex(abs)}i`;
  if (z.re.n === 0) return z.im.n < 0 ? `-${imBody}` : imBody;
  return `${qTex(z.re)}${z.im.n < 0 ? "-" : "+"}${imBody}`;
}
