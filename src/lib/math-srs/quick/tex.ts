/**
 * 한 걸음 문항의 수식 서식 — 계수 1·0, 부호 겹침이 **구조적으로** 안 나오게 한 곳에서 만든다.
 * 모든 함수는 `$` 없는 TeX 조각을 돌려준다(감싸기는 `m`).
 */

/** `$…$` 로 감싼다. */
export const m = (tex: string) => `$${tex}$`;

/** 계수 × 문자: `1→x` · `-1→-x` · `3→3x`. 계수 0 은 부르는 쪽 잘못이라 던진다. */
export function term(a: number, v = "x"): string {
  if (!Number.isInteger(a) || a === 0)
    throw new Error(`계수 ${a} 로 항을 만들 수 없습니다`);
  if (a === 1) return v;
  if (a === -1) return `-${v}`;
  return `${a}${v}`;
}

/** 뒤에 붙는 상수항: `+3` · `-3` · 0 이면 빈 글자. */
export function tail(b: number): string {
  if (b === 0) return "";
  return b > 0 ? `+${b}` : `${b}`;
}

/** `ax+b` — `a=0` 이면 상수만, 둘 다 0 이면 `0`. */
export function lin(a: number, b: number, v = "x"): string {
  if (a === 0) return String(b);
  return `${term(a, v)}${tail(b)}`;
}

/** 분수 `\frac{n}{d}`. 음수는 앞에 `-` 를 둔다(분모는 늘 양수). */
export function frac(n: number | string, d: number): string {
  if (!(d > 1)) throw new Error(`분모 ${d}`);
  if (typeof n === "number" && n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

/** `(p/q)x` — `\frac{x}{q}` · `-\frac{x}{q}` · `\frac{2}{3}x`. */
export function fracTerm(p: number, q: number, v = "x"): string {
  if (q === 1) return term(p, v);
  if (p === 1) return `\\frac{${v}}{${q}}`;
  if (p === -1) return `-\\frac{${v}}{${q}}`;
  return `${frac(p, q)}${v}`;
}

/** `px=q` 꼴 방정식. */
export const eq = (p: number, q: number, v = "x") => `${term(p, v)}=${q}`;

// ── 조사: 수식 뒤 조사를 «읽는 소리»로 고른다 ─────────────────────────────────
// 끝 숫자를 한자 수사로 읽은 받침. 표는 `src/lib/elementary/rules.ts` 의 JOSA_FINAL 과 같다
// (시험은 그쪽 `josaFaults` 로 잰다 — 쓰는 쪽과 세는 쪽이 따로다).
type Final = "none" | "l" | "other";
const DIGIT_FINAL: Record<string, Final> = {
  "0": "other",
  "1": "l",
  "2": "none",
  "3": "other",
  "4": "none",
  "5": "none",
  "6": "other",
  "7": "l",
  "8": "l",
  "9": "none",
};

/** 수식을 소리 내어 읽을 때 마지막 소리의 받침. 분수는 분자가 마지막이다(「사분의 삼」). */
export function lastSound(tex: string): Final {
  const s = tex.trim();
  const fracEnd = /\\frac\{([^{}]*)\}\{[^{}]*\}$/.exec(s);
  if (fracEnd) return lastSound(fracEnd[1]!);
  if (s.endsWith(")")) return lastSound(s.slice(0, -1));
  if (s.endsWith("\\square")) return "none"; // 네모
  const digit = /(\d)$/.exec(s);
  if (digit) return DIGIT_FINAL[digit[1]!]!;
  // a 에이 · b 비 · x 엑스 — 받침이 없다
  if (/[abx]$/.test(s)) return "none";
  throw new Error(`«${tex}» 뒤 조사를 정할 수 없습니다`);
}

type JosaPair = "을/를" | "과/와" | "은/는" | "이/가";
/** `$tex$ 을` 처럼 수식 + 한 칸 + 조사. */
export function withJosa(tex: string, pair: JosaPair): string {
  const [withBatchim, without] = pair.split("/") as [string, string];
  return `${m(tex)} ${lastSound(tex) === "none" ? without : withBatchim}`;
}

/** `$tex$ 로` · `$tex$ 으로` — ㄹ 받침(일·칠·팔)과 받침 없음은 «로». */
export function withRo(tex: string): string {
  return `${m(tex)} ${lastSound(tex) === "other" ? "으로" : "로"}`;
}

/** 곱셈 안에 넣을 수 — 음수는 괄호로 싼다: `3\times(-2)`. */
export const factor = (n: number) => (n < 0 ? `(${n})` : `${n}`);

/** 식 가운데 붙는 문자항: `+3x` · `-x`. */
export function tailTerm(a: number, v = "x"): string {
  return a > 0 ? `+${term(a, v)}` : term(a, v);
}
