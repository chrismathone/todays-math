/**
 * 판정형 시험의 **셋째 셈** — 지면 글을 부동소수로 다시 계산한다 (2026-10-08 엔진 보강 2단계).
 *
 * 값을 재는 길이 셋이다. ⑴ 생성기는 `m1Calc` 의 기약 분수 셈으로 값을 만들고 ⑵ 등록부의 관문은 지면 글을
 * `texArith.ts`(되부름 내림 읽기 · 약분 없는 BigInt 분수 · 교차곱)로 다시 재고 ⑶ 이 시험 도우미는 **결합 세기로
 * 읽는 다른 읽개**(Pratt)와 **부동소수**로 또 잰다. 셋이 코드를 나누어 쓰지 않는다 — 하나가 연산 차례를
 * 틀리면 어긋난다.
 *
 * 우리 문항의 값은 분모가 작은 유리수다. 서로 다른 두 값의 차는 $10^{-4}$ 보다 크므로 `1e-9` 로 같은가를 본다.
 */

type Tok =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "+" | "-" | "*" | "/" | "^" | "(" | ")" | "{" | "}" | "frac" };

function lex(tex: string): Tok[] {
  const s = tex
    .replace(/\s+/g, "")
    .replace(/\\left\\\{/g, "(")
    .replace(/\\right\\\}/g, ")")
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\dfrac/g, "#");
  const out: Tok[] = [];
  for (let i = 0; i < s.length;) {
    const m = /^\d+/.exec(s.slice(i));
    if (m) {
      out.push({ k: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    const c = s[i]!;
    if (c === "#") out.push({ k: "frac" });
    else if ("+-*/^(){}".includes(c)) out.push({ k: c as "+" });
    else if (/[a-z]/.test(c)) out.push({ k: "var", v: c });
    else throw new Error(`시험 셈이 못 읽는 글자 «${c}»: ${tex}`);
    i += 1;
  }
  return out;
}

/** 결합 세기 — 덧셈 1 · 곱셈 3 · 앞 부호 5 · 거듭제곱 7. 앞 부호가 거듭제곱보다 약해 `-2^{2}` 은 $-4$ 다. */
const INFIX: Record<string, number> = { "+": 1, "-": 1, "*": 3, "/": 3 };
const PREFIX = 5;
const POWER = 7;

/** 식(`$` 없이)의 값. 못 읽으면 던진다. */
export function floatOf(tex: string, env: Record<string, number> = {}): number {
  const toks = lex(tex);
  let at = 0;
  const peek = () => toks[at];
  const take = (k: Tok["k"]) => {
    if (toks[at]?.k !== k)
      throw new Error(`시험 셈: «${k}» 자리에 «${toks[at]?.k}» — ${tex}`);
    at += 1;
  };
  const group = (): number => {
    take("{");
    const v = parse(0);
    take("}");
    return v;
  };
  function atom(): number {
    const t = toks[at];
    if (!t) throw new Error(`시험 셈: 식이 끊겼다 — ${tex}`);
    at += 1;
    // 계수 바로 뒤의 문자(`3x^{2}`) — 문자의 거듭제곱까지 읽어 곱한다.
    if (t.k === "num") return peek()?.k === "var" ? t.v * parse(POWER) : t.v;
    if (t.k === "var") {
      const v = env[t.v];
      if (v === undefined) throw new Error(`시험 셈: ${t.v} 의 값이 없다`);
      return v;
    }
    if (t.k === "(") {
      const v = parse(0);
      take(")");
      return v;
    }
    if (t.k === "frac") {
      const n = group();
      return n / group();
    }
    if (t.k === "-") return -parse(PREFIX);
    if (t.k === "+") return parse(PREFIX);
    throw new Error(`시험 셈: «${t.k}» 로 시작하는 식 — ${tex}`);
  }
  function parse(min: number): number {
    let left = atom();
    for (;;) {
      const t = peek();
      if (!t) return left;
      if (t.k === "^") {
        if (POWER < min) return left;
        at += 1;
        take("{");
        const e = toks[at];
        if (e?.k !== "num")
          throw new Error(`시험 셈: 지수가 수가 아니다 — ${tex}`);
        at += 1;
        take("}");
        left **= e.v;
        continue;
      }
      const bp = INFIX[t.k];
      if (bp === undefined || bp < min) return left;
      at += 1;
      const right = parse(bp + 1);
      if (t.k === "+") left += right;
      else if (t.k === "-") left -= right;
      else if (t.k === "*") left *= right;
      else left /= right;
    }
  }
  const v = parse(0);
  if (at !== toks.length) throw new Error(`시험 셈: 남는 글 — ${tex}`);
  if (!Number.isFinite(v))
    throw new Error(`시험 셈: 값이 수가 아니다 — ${tex}`);
  return v;
}

export const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** `$…$` 한 덩어리의 안쪽. */
export function mathOf(text: string): string {
  const t = text.trim();
  if (!t.startsWith("$") || !t.endsWith("$"))
    throw new Error(`수식 한 덩어리가 아니다: ${text}`);
  return t.slice(1, -1);
}

/** 글 안의 수식 덩어리들 — 차례대로. */
export const mathsIn = (text: string) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);

/** 발문의 «$x=-3$일 때»를 읽는다 — 없으면 빈 대입. */
export function envOf(lead: string): Record<string, number> {
  const m = /\$([a-z])=(-?\d+)\$일 때/.exec(lead);
  return m ? { [m[1]!]: Number(m[2]) } : {};
}

export const MARKS = ["①", "②", "③", "④", "⑤"];

/** 지면 본문 → 발문 줄과 보기 글 다섯(번호 뗀 것). */
export function readPaper(content: string): {
  lead: string;
  choices: string[];
} {
  const [lead, ...rest] = content.split("\n");
  return { lead: lead!, choices: rest.map((l) => l.slice(1).trim()) };
}

/** 값 글 `-\dfrac{3}{4}` · `5` → 분자 · 분모(찍힌 그대로 — 약분하지 않는다). */
export function literal(tex: string): { n: number; d: number } {
  const m = /^(-?)(?:\\dfrac\{(\d+)\}\{(\d+)\}|(\d+))$/.exec(
    tex.replace(/\s+/g, ""),
  );
  if (!m) throw new Error(`값 하나가 아니다: ${tex}`);
  return {
    n: (m[1] ? -1 : 1) * Number(m[2] ?? m[4]),
    d: Number(m[3] ?? 1),
  };
}
