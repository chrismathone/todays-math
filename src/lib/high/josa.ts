/**
 * 수식 뒤 조사 — 고등 발문은 수식 바로 뒤에 조사가 붙는 자리가 많다
 * (「$x-3$**으로** 나누었을 때」·「$f(2x-3)$**을**」·「$x^{3}+ax^{2}+b$**를**」).
 *
 * 수의 끝자리 규칙은 **중등 `m2Josa` 를 그대로 부른다**(두 벌 두지 않는다).
 * 여기서 더 가르는 것은 수식이 **수가 아닌 것으로 끝날 때**다:
 *
 *   · 지수로 끝남 `x^{2}` · `1000^{11}` — 「…의 제곱」으로 읽으니 받침 ㅂ → 을 · 으로 · 이 · 은 · 과
 *   · 분수로 끝남 `\dfrac{1}{2}` — 「2분의 1」로 읽으니 **분자**의 끝소리다. ⚠️ 2026-09-13 전에는
 *     끝 `}` 를 걷어 **분모**를 읽었다(`$\dfrac{1}{2}$를`) — 시험 쪽 자도 같이 분모를 읽어 안 보였다
 *     (`highJosa.test.ts`)
 *   · 괄호·첨자로 끝남 `f(x)` · `(x+2)` · `a_{6}` — 괄호를 걷고 그 안의 끝 글자로 읽는다
 *   · 영문자로 끝남 — 이름으로 읽는다: 엘(l)·알(r)은 ㄹ, 엠(m)·엔(n)은 받침, 나머지는 모음
 *
 * 읽을 수 없는 끝이면 **던진다** — 조용히 아무 조사나 붙이지 않는다.
 */
import { eulReul, euroRo, waGwa } from "../middle/m2Josa";

type Final =
  | { kind: "digit"; n: number }
  | { kind: "vowel" }
  | { kind: "rieul" }
  | { kind: "consonant" };

const LETTER_FINAL: Record<string, "rieul" | "consonant"> = {
  l: "rieul",
  r: "rieul",
  m: "consonant",
  n: "consonant",
};

/** `s[close]` 가 `}` 일 때 짝이 되는 `{` 의 자리 — 없으면 -1. */
function matchingOpen(s: string, close: number): number {
  let depth = 0;
  for (let i = close; i >= 0; i -= 1) {
    if (s[i] === "}") depth += 1;
    else if (s[i] === "{") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 끝이 `\dfrac{A}{B}`·`rac{A}{B}` 면 분자 `A` — 아니면 `null`. */
function trailingNumerator(s: string): string | null {
  if (!s.endsWith("}")) return null;
  const denOpen = matchingOpen(s, s.length - 1);
  if (denOpen <= 0 || s[denOpen - 1] !== "}") return null;
  const numOpen = matchingOpen(s, denOpen - 1);
  if (numOpen < 0 || !/\d?frac$/.test(s.slice(0, numOpen))) return null;
  return s.slice(numOpen + 1, denOpen - 1);
}

export function finalOf(tex: string): Final {
  let s = tex.trim();
  const numerator = trailingNumerator(s);
  if (numerator !== null) return finalOf(numerator);
  if (/\^\{[^{}]*\}$|\^\d$/.test(s)) return { kind: "consonant" };
  while (/[)}\]]$/.test(s)) s = s.slice(0, -1).trimEnd();
  const digits = /(\d+)$/.exec(s);
  if (digits) return { kind: "digit", n: Number(digits[1]) };
  const ch = s.slice(-1).toLowerCase();
  if (/[a-z]/.test(ch)) {
    const f = LETTER_FINAL[ch];
    return f === undefined ? { kind: "vowel" } : { kind: f };
  }
  throw new Error(`수식 끝 글자를 읽을 수 없어 조사를 못 고릅니다: ${tex}`);
}

function digitHasVowelFinal(n: number): boolean {
  return eulReul(n) === "를";
}

/** 을/를 */
export function eul(tex: string): "을" | "를" {
  const f = finalOf(tex);
  if (f.kind === "digit") return eulReul(f.n);
  return f.kind === "vowel" ? "를" : "을";
}

/** (으)로 — ㄹ 받침은 「로」다 */
export function ro(tex: string): "로" | "으로" {
  const f = finalOf(tex);
  if (f.kind === "digit") return euroRo(f.n);
  return f.kind === "consonant" ? "으로" : "로";
}

/** 이/가 */
export function ga(tex: string): "이" | "가" {
  const f = finalOf(tex);
  if (f.kind === "digit") return digitHasVowelFinal(f.n) ? "가" : "이";
  return f.kind === "vowel" ? "가" : "이";
}

/** 은/는 */
export function eun(tex: string): "은" | "는" {
  const f = finalOf(tex);
  if (f.kind === "digit") return digitHasVowelFinal(f.n) ? "는" : "은";
  return f.kind === "vowel" ? "는" : "은";
}

/** 과/와 */
export function gwa(tex: string): "과" | "와" {
  const f = finalOf(tex);
  if (f.kind === "digit") return waGwa(f.n);
  return f.kind === "vowel" ? "와" : "과";
}

/** (이)라 — 「$f(x)=…+3$이라 하면」 · 「$x=5$라 하면」 */
export function ira(tex: string): "이라" | "라" {
  return ga(tex) === "가" ? "라" : "이라";
}
