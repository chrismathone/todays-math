/**
 * 고등 엔진 시험 연장 — **제품 코드를 부르지 않고** 다시 적은 것들.
 *
 * 다항식 셈·지면 다항식 읽기·조사 규칙을 제품(`src/lib/high/poly.ts` · `josa.ts`)에서 가져오면
 * 시험이 제품과 같이 틀린다(동어반복). 그래서 여기 따로 적는다. 제품이 바뀌어 여기와
 * 갈라지면 시험이 빨개진다 — 그게 이 파일의 쓸모다.
 *
 * 색인(`scripts/rpm/rpm-high-type-catalog.json`)은 **읽기만** 한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

// ───────────────────────────── 색인 ─────────────────────────────

export type HighCatalogRow = {
  page: number;
  major: string;
  minor: string;
  number: string;
  title: string;
  levels: Record<string, number>;
};

let cached: Record<string, { types: HighCatalogRow[] }> | null = null;

export function highCatalog(book: string): HighCatalogRow[] {
  if (cached === null) {
    cached = JSON.parse(
      readFileSync(
        path.resolve(process.cwd(), "scripts/rpm/rpm-high-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<string, { types: HighCatalogRow[] }>;
  }
  return cached[book]?.types ?? [];
}

/**
 * 검은 난이도 표 → 허락되는 칸 (`high-engine-plan.md` §1-4).
 * 대표문제 꼴은 늘 `기본`, 밑단 `연산` 은 `기본` 이 발문 모양으로 내려앉은 것이다.
 */
const LEVEL_TIER: Record<string, string> = {
  하: "기본",
  중하: "기본",
  중: "응용",
  중상: "심화하",
  상중: "심화하",
  상: "심화하",
};

export function tiersAllowedBy(levels: Record<string, number>): Set<string> {
  const out = new Set(["기본", "연산"]);
  for (const k of Object.keys(levels)) {
    const t = LEVEL_TIER[k];
    if (t === undefined) throw new Error(`모르는 난이도 표: ${k}`);
    out.add(t);
  }
  return out;
}

/** 표에서 가장 많은 칸(들) — 유형이 이 가운데 하나는 실제로 내야 한다. */
export function modalTiers(levels: Record<string, number>): Set<string> {
  const max = Math.max(...Object.values(levels));
  return new Set(
    Object.entries(levels)
      .filter(([, n]) => n === max)
      .map(([k]) => LEVEL_TIER[k]!),
  );
}

// ───────────────────────────── 다항식 ─────────────────────────────

export type P = number[];

export function ptrim(p: readonly number[]): P {
  const out = [...p];
  while (out.length > 1 && out[out.length - 1] === 0) out.pop();
  return out.length === 0 ? [0] : out;
}

export function padd(a: readonly number[], b: readonly number[]): P {
  const n = Math.max(a.length, b.length);
  return ptrim(Array.from({ length: n }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
}

export function pscale(a: readonly number[], k: number): P {
  return ptrim(a.map((c) => c * k));
}

export function pmul(a: readonly number[], b: readonly number[]): P {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) =>
    b.forEach((y, j) => {
      out[i + j]! += x * y;
    }),
  );
  return ptrim(out);
}

export function proots(roots: readonly number[]): P {
  return roots.reduce<P>((acc, r) => pmul(acc, [-r, 1]), [1]);
}

export function pval(p: readonly number[], x: number): number {
  return p.reduce((s, c, i) => s + c * x ** i, 0);
}

/** 긴 나눗셈 — 나누는 식은 최고차항 계수가 ±1 이어야 한다(시험에서 쓰는 것은 다 그렇다). */
export function plongDivide(
  num: readonly number[],
  den: readonly number[],
): { q: P; r: P } {
  const d = ptrim(den);
  const lead = d[d.length - 1]!;
  if (Math.abs(lead) !== 1) throw new Error("최고차항 계수가 ±1 이 아니다");
  const r = [...ptrim(num)];
  const q = new Array<number>(Math.max(1, r.length - d.length + 1)).fill(0);
  for (let i = r.length - d.length; i >= 0; i -= 1) {
    const k = r[i + d.length - 1]! / lead;
    q[i] = k;
    for (let j = 0; j < d.length; j += 1) r[i + j]! -= k * d[j]!;
  }
  return { q: ptrim(q), r: ptrim(r.slice(0, d.length - 1)) };
}

export function pkey(p: readonly number[]): string {
  return JSON.stringify(ptrim(p));
}

/**
 * 지면의 다항식 한 조각을 계수로 읽는다 — `x^{3}-x^{2}-3x+6` · `5x-6` · `-7`.
 * `x` 말고 다른 문자가 있거나 모양이 어긋나면 `null`.
 */
export function parsePolyTex(s: string): P | null {
  const body = s.replace(/\s+/g, "");
  if (body === "" || !/^[-+0-9x^{}]+$/.test(body)) return null;
  const terms = body.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const out: number[] = [];
  for (const t of terms) {
    const m = /^([+-]?)(\d*)(x(?:\^\{(\d+)\})?)?$/.exec(t);
    if (!m || (m[2] === "" && !m[3])) return null;
    const sign = m[1] === "-" ? -1 : 1;
    const coef = m[2] === "" ? 1 : Number(m[2]);
    const deg = m[3] ? (m[4] ? Number(m[4]) : 1) : 0;
    out[deg] = (out[deg] ?? 0) + sign * coef;
  }
  return ptrim(Array.from({ length: out.length }, (_, i) => out[i] ?? 0));
}

export function mathSpans(text: string): string[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
}

/** 발문의 수식에서 `=` 로 가른 변 가운데 **순수한 $x$ 다항식**인 것들의 계수 열쇠. */
export function shownPolys(content: string): Set<string> {
  const out = new Set<string>();
  for (const span of mathSpans(content)) {
    for (const side of span.split("=")) {
      const p = parsePolyTex(side);
      if (p) out.add(pkey(p));
    }
  }
  return out;
}

/** 정답 `$…$` 를 수 또는 다항식으로 읽는다. */
export function readAnswer(answer: string): number | P {
  const m = /^\$(.+)\$$/.exec(answer.trim());
  if (!m) throw new Error(`정답이 수식 한 덩어리가 아니다: ${answer}`);
  const p = parsePolyTex(m[1]!);
  if (!p) throw new Error(`정답을 못 읽는다: ${answer}`);
  return p.length === 1 ? p[0]! : p;
}

// ───────────────────────────── 조사 ─────────────────────────────

/**
 * 수식을 소리 내어 읽을 때 **마지막 소리** — 제품 `josa.finalOf` 를 안 부르고 다시 적었다.
 *
 * - 분수 `\dfrac{a}{b}` 는 「b분의 a」 — **분자**로 들어간다. ⚠️ 2026-09-13 전의 이 자는 끝 `}` 를
 *   걷어 분모를 읽었고, 제품도 똑같이 분모를 읽어 **둘이 같이 눈이 멀어** 있었다(`highJosa.test.ts`).
 * - 지수로 끝나면 「제곱」(받침 ㅂ).
 * - 괄호·중괄호는 걷고 안쪽 끝. 수는 끝자리 — 0 으로 끝나는 여러 자리 수는 십·백·천·만(받침).
 * - 영문자는 이름: 엘·알 ㄹ · 엠·엔 받침 · 나머지 모음(허수 단위 `i` 는 「아이」).
 * - 그 밖의 끝(명령어 기호 등)은 `null` — 판정하지 않는다(거짓 경보는 가드를 끈다).
 */
export type Sound = "vowel" | "rieul" | "consonant";

const DIGIT_SOUND: Record<string, Sound> = {
  "0": "consonant",
  "1": "rieul",
  "2": "vowel",
  "3": "consonant",
  "4": "vowel",
  "5": "vowel",
  "6": "consonant",
  "7": "rieul",
  "8": "rieul",
  "9": "vowel",
};

/** `s[open]` 이 `{` 일 때 짝 `}` 의 자리 — 없으면 -1. */
function closeOf(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    if (s[i] === "{") depth += 1;
    else if (s[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 수식이 분수로 **끝나면** 그 분자 — 아니면 `null`. 바깥 분수가 먼저 걸린다. */
function fracNumeratorAtEnd(s: string): string | null {
  for (const m of s.matchAll(/\d?frac(?=\{)/g)) {
    const numOpen = m.index! + m[0].length;
    const numClose = closeOf(s, numOpen);
    if (numClose < 0 || s[numClose + 1] !== "{") continue;
    if (closeOf(s, numClose + 1) === s.length - 1) {
      return s.slice(numOpen + 1, numClose);
    }
  }
  return null;
}

export function lastSound(tex: string): Sound | null {
  const s = tex.trim();
  const numerator = fracNumeratorAtEnd(s);
  if (numerator !== null) return lastSound(numerator);
  if (/\^\{[^{}]*\}$|\^\d$/.test(s)) return "consonant";
  const inner = s.replace(/[)}\]\s]+$/, "");
  const digits = /(\d+)$/.exec(inner);
  if (digits) {
    const n = digits[1]!;
    return n.length > 1 && n.endsWith("0")
      ? "consonant"
      : DIGIT_SOUND[n.slice(-1)]!;
  }
  const c = inner.slice(-1).toLowerCase();
  if (!/[a-z]/.test(c)) return null;
  if (c === "l" || c === "r") return "rieul";
  return c === "m" || c === "n" ? "consonant" : "vowel";
}

/** 「(으)로」 — ㄹ 받침은 「로」다. */
function expectedRo(tex: string): "로" | "으로" | null {
  const sound = lastSound(tex);
  if (sound === null) return null;
  return sound === "consonant" ? "으로" : "로";
}

export function roMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$([^$]+)\$(으로|로)(?=[\s,.)]|$)/g)) {
    const want = expectedRo(m[1]!);
    if (want !== null && m[2] !== want) {
      out.push(`$…${m[1]!.slice(-14)}$${m[2]} → ${want}`);
    }
  }
  return out;
}

/** [받침 뒤, 모음 뒤] — ㄹ 받침도 받침이다(「로」만 예외). */
const JOSA_PAIR: Record<string, readonly [string, string]> = {
  을: ["을", "를"],
  를: ["을", "를"],
  은: ["은", "는"],
  는: ["은", "는"],
  과: ["과", "와"],
  와: ["과", "와"],
  // 「이」는 뺀다 — 서술격 「$5$이다·$5$이므로」와 겹쳐 옳은 지면을 잡는다(`midPage.JOSA_PAIR` 와 같은 까닭).
  가: ["이", "가"],
};

/**
 * 수식 뒤 을/를 · 은/는 · 과/와 · 가 가 읽기와 맞나.
 *
 * 중등 `josaMismatches` 는 **수로 끝날 때만** 보고, 분수는 숫자만 든 분수만 안다(`\dfrac{\sqrt{3}}{2}` 는
 * 분모를 읽는다). 고등은 문자·지수·허수·근호 분수로 끝나는 수식이 흔해 따로 둔다.
 * 뒤에 한글이 이어지면(「$6$가지」) 조사가 아니므로 안 본다 — 「와의」·「과의」의 「의」만 허락한다.
 */
export function highJosaMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(
    /\$([^$]+)\$(을|를|은|는|과|와|가)(?=의|[^가-힣]|$)/g,
  )) {
    const sound = lastSound(m[1]!);
    if (sound === null) continue;
    const pair = JOSA_PAIR[m[2]!]!;
    const want = sound === "vowel" ? pair[1] : pair[0];
    if (m[2] !== want) out.push(`$…${m[1]!.slice(-16)}$${m[2]} → ${want}`);
  }
  return out;
}
