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
 * 「(으)로」가 수식의 **읽기**와 맞나 — 제품 `josa.ro` 를 안 부르고 다시 적었다.
 * 지수로 끝나면 「제곱」(받침 ㅂ) → 으로 · 괄호·첨자는 걷고 안쪽 끝 · 수의 끝자리 0·3·6 → 으로
 * · 영문자 m·n → 으로 · 나머지 → 로.
 */
function expectedRo(tex: string): "로" | "으로" {
  let s = tex.trim();
  if (/\^\{[^{}]*\}$|\^\d$/.test(s)) return "으로";
  while (/[)}\]]$/.test(s)) s = s.slice(0, -1).trimEnd();
  const d = /(\d)$/.exec(s);
  if (d) return ["0", "3", "6"].includes(d[1]!) ? "으로" : "로";
  return /[mn]$/i.test(s) ? "으로" : "로";
}

export function roMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$([^$]+)\$(으로|로)(?=[\s,.)]|$)/g)) {
    const want = expectedRo(m[1]!);
    if (m[2] !== want) out.push(`$…${m[1]!.slice(-14)}$${m[2]} → ${want}`);
  }
  return out;
}
