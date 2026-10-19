/**
 * 보기 한 칸의 글(`$\frac{3\sqrt{2}}{4}\,\mathrm{cm}$` 같은 것)을 **정확값**으로 읽는다.
 *
 * 값은 «부호 × 기약분수 × √(제곱 인수 없는 수)» 하나로 정규화한다. 그래서
 * `$\sqrt{8}$` 과 `$2\sqrt{2}$`, `$\frac{2}{4}$` 와 `$\frac{1}{2}$`, `$\frac{1}{\sqrt{2}}$` 와
 * `$\frac{\sqrt{2}}{2}$` 가 **같은 열쇠**를 갖는다 — 글자로 견주면 놓치는 «같은 값 다른 글자»다.
 *
 * 기출 쌍둥이 저작(2026-10-14, 노변 NB5)에서 보기 25개를 이 방식으로 검산했고, 엔진의
 * 객관식 파생은 소수 정답만 값으로 가르고 분수·근호는 글자로 가르고 있었다
 * (`deriveFormats.ts` `choiceKey`). 이 함수는 그 빈자리를 **재는** 데 먼저 쓴다.
 *
 * 읽는 꼴(그 밖은 null — 판정하지 않는다):
 *   정수·소수 · `k\sqrt{n}` · `\sqrt{n}` · `\frac{X}{Y}`(`\dfrac`·`\tfrac`, X·Y 는 앞의 꼴)
 *   앞의 `-` · 뒤의 단위(`\,\mathrm{cm}^2` · `^\circ` · 한글 꼬리)
 * 문자·π·더하기가 든 식은 읽지 않는다.
 */

export type ExactChoiceValue = {
  /** 값이 같으면 같고, 다르면 다른 열쇠(단위 포함). */
  key: string;
  /** 정규화한 값: sign·num/den·√rad (rad 는 제곱 인수가 없다, 0 이면 sign 0). */
  sign: -1 | 0 | 1;
  num: number;
  den: number;
  rad: number;
  unit: string;
  /** 지면에 정리되지 않은 채 적힌 꼴 — 값은 맞아도 학생이 «덜 정리된 보기»로 지워 낸다. */
  unsimplified: string[];
};

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

/** n = s²·t (t 는 제곱 인수 없음) → [s, t]. */
function splitSquare(n: number): [number, number] {
  let s = 1;
  let t = n;
  for (let f = 2; f * f <= t; f += 1) {
    while (t % (f * f) === 0) {
      t /= f * f;
      s *= f;
    }
  }
  return [s, t];
}

/** 여는 중괄호 위치에서 짝이 맞는 닫는 중괄호까지의 속. */
function braceGroup(
  s: string,
  open: number,
): { inner: string; end: number } | null {
  if (s[open] !== "{") return null;
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    if (s[i] === "{") depth += 1;
    else if (s[i] === "}") {
      depth -= 1;
      if (depth === 0) return { inner: s.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

type Mono = { coef: number; coefDen: number; rad: number; issues: string[] };

// This is a bounded exact reader, not a floating-point CAS. Reject values whose
// arithmetic cannot stay exact and bound trial factorization on untrusted text.
const MAX_RADICAND = 1_000_000_000;
const safeNatural = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

/** `3` · `0.25` · `2\sqrt{3}` · `\sqrt{5}` — 계수의 소수는 분수로 바꿔 둔다. */
function parseMono(raw: string): Mono | null {
  const s = raw.replace(/\s+/g, "");
  const m = /^(\d+(?:\.\d+)?)?(?:\\sqrt\{(\d+)\})?$/.exec(s);
  if (!m || (m[1] === undefined && m[2] === undefined)) return null;
  const issues: string[] = [];
  let coef = 1;
  let coefDen = 1;
  if (m[1] !== undefined) {
    const dot = m[1].indexOf(".");
    if (dot < 0) coef = Number(m[1]);
    else {
      coefDen = 10 ** (m[1].length - dot - 1);
      coef = Number(m[1].replace(".", ""));
    }
    if (m[2] !== undefined && (coef === coefDen || coef === 0))
      issues.push(coef === 0 ? "zero-coefficient" : "coefficient-one");
  }
  if (!safeNatural(coef) || !safeNatural(coefDen) || coefDen === 0) return null;
  let rad = 1;
  if (m[2] !== undefined) {
    rad = Number(m[2]);
    if (!safeNatural(rad) || rad > MAX_RADICAND) return null;
    if (rad === 0)
      return { coef: 0, coefDen: 1, rad: 1, issues: [...issues, "sqrt-zero"] };
    const [sq] = splitSquare(rad);
    // `\sqrt{1}` 도 제곱수의 근호다(값 1) — splitSquare 는 1 에서 인수를 안 낸다.
    if (rad === 1 || sq > 1)
      issues.push(rad === sq * sq ? "sqrt-of-square" : "sqrt-square-factor");
  }
  return { coef, coefDen, rad, issues };
}

const UNIT_TAIL =
  /((?:\\,|\\ |~|\s)*(?:\\mathrm\{[^{}]*\}|\\text\{[^{}]*\}|\^\{?\\circ\}?|[가-힣]+)(?:\^\{?\d\}?)?\s*)+$/;

export function exactChoiceValue(text: string): ExactChoiceValue | null {
  if (text.length > 4096) return null;
  let s = text.trim();
  let unit = "";
  // `$12$개` 처럼 단위가 수식 밖 한글로 붙은 꼴도 읽는다.
  const dollar = /^\$([^$]*)\$\s*([가-힣]*)$/.exec(s);
  if (dollar) {
    s = dollar[1]!.trim();
    unit = dollar[2] ?? "";
  } else if (s.includes("$")) return null;
  const tail = UNIT_TAIL.exec(s);
  if (tail && tail.index > 0) {
    unit =
      tail[0]
        .replace(/\\,|\\ |~|\s/g, "")
        .replace(/\^\{(\d|\\circ)\}/g, "^$1") + unit;
    s = s.slice(0, tail.index);
  }
  s = s.replace(/\\,/g, "").trim();
  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) s = s.slice(1).trim();

  let num: number, den: number, rad: number;
  const issues: string[] = [];
  const frac = /^\\[dt]?frac/.exec(s);
  if (frac) {
    const a = braceGroup(s, frac[0].length);
    const b = a && braceGroup(s, a.end);
    if (!a || !b || b.end !== s.length) return null;
    let top = a.inner.trim();
    if (top.startsWith("-")) {
      sign = -sign;
      top = top.slice(1);
    }
    const x = parseMono(top);
    const y = parseMono(b.inner);
    if (!x || !y || y.coef === 0) return null;
    issues.push(...x.issues, ...y.issues);
    if (y.rad > 1) issues.push("surd-denominator");
    if (y.rad === 1 && y.coef === y.coefDen) issues.push("denominator-one");
    // (x.coef/x.coefDen·√x.rad) / (y.coef/y.coefDen·√y.rad)
    num = x.coef * y.coefDen;
    den = x.coefDen * y.coef * y.rad;
    rad = x.rad * y.rad;
    const written = gcd(x.coef, y.coef);
    if (x.coefDen === 1 && y.coefDen === 1 && x.coef !== 0 && written > 1)
      issues.push("fraction-not-reduced");
  } else {
    const x = parseMono(s);
    if (!x) return null;
    issues.push(...x.issues);
    num = x.coef;
    den = x.coefDen;
    rad = x.rad;
  }
  if (
    !safeNatural(num) ||
    !safeNatural(den) ||
    den === 0 ||
    !safeNatural(rad) ||
    rad > MAX_RADICAND
  )
    return null;
  const [sq, free] = splitSquare(rad);
  num *= sq;
  if (!safeNatural(num)) return null;
  rad = free;
  if (num === 0)
    return {
      key: `0|${unit}`,
      sign: 0,
      num: 0,
      den: 1,
      rad: 1,
      unit,
      unsimplified: issues,
    };
  const g = gcd(num, den);
  num /= g;
  den /= g;
  const signed = (sign < 0 ? -1 : 1) as -1 | 1;
  return {
    key: `${signed < 0 ? "-" : ""}${num}/${den}r${rad}|${unit}`,
    sign: signed,
    num,
    den,
    rad,
    unit,
    unsimplified: [...new Set(issues)],
  };
}

/** 보기 다섯 가운데 값이 같은 짝(번호 0..4). 읽지 못한 보기는 견주지 않는다. */
export function sameValueChoicePairs(
  choices: readonly string[],
): [number, number][] {
  const keys = choices.map((c) => exactChoiceValue(c)?.key ?? null);
  const out: [number, number][] = [];
  for (let i = 0; i < keys.length; i += 1)
    for (let j = i + 1; j < keys.length; j += 1)
      if (keys[i] !== null && keys[i] === keys[j]) out.push([i, j]);
  return out;
}
