/**
 * 중1 RPM 1-1 저조 단원 유형 — 세션 중1 소유 (`m1Extra.ts` 가 모아 등록).
 *
 * 대상 단원 (2026-08-23 공유 DB 실측, directUseAllowed=true 보유 건수):
 *   소수와 거듭제곱 (0) · 일차식의 뜻Ⅰ (5) · 일차식의 뜻Ⅱ (0)
 *   · 순서쌍과 좌표평면(응용) (0) · 방정식과 그 해 (10, 여력분)
 *
 * ## 일차식의 뜻Ⅰ/Ⅱ 배정 근거 (원장님 재검토용)
 * 두 소단원의 내용 구분이 기획 문서에 없다. 보유 문항(Ⅰ 5건: 다항식 용어 설명
 * ·동류항 계산)과 수업 순서로 판단해 **Ⅰ = 다항식·일차식 판별(용어)**,
 * **Ⅱ = 동류항·일차식의 계산** 으로 나눴다. 다르면 아래 SEC1 배정만 바꾸면 된다.
 *
 * 유형 번호·제목은 `scripts/rpm/rpm-type-catalog.json` 실측 — 테스트가 그 파일과
 * 직접 대조한다 (손 목록 이중화 금지, 2026-08-18 교훈).
 */
import { intBetween, pick } from "../elementary/rng";

import {
  attempt,
  defType,
  intNonzero,
  pickDistinct,
  poly,
  shuffle,
  signed,
} from "./m1Shared";
import type { TypeEntry } from "./types";

const BOOK = "1-1";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC1 = {
  소수: "소수와 거듭제곱",
  일차1: "일차식의 뜻Ⅰ",
  일차2: "일차식의 뜻Ⅱ",
  좌표응용: "순서쌍과 좌표평면(응용)",
  방정식해: "방정식과 그 해",
} as const;

/** 48 이하를 덮는 소수 집합 — 테스트는 이 집합이 아니라 나눗셈 판별로 재계산한다. */
const PRIMES = new Set([
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59,
]);

function quadrantOf(x: number, y: number): number {
  if (x > 0 && y > 0) return 1;
  if (x < 0 && y > 0) return 2;
  if (x < 0 && y < 0) return 3;
  return 4;
}

const QUAD_SIGNS: Record<number, readonly [number, number]> = {
  1: [1, 1],
  2: [-1, 1],
  3: [-1, -1],
  4: [1, -1],
};

const QUAD_DESC: Record<number, string> = {
  1: "$a>0$, $b>0$",
  2: "$a<0$, $b>0$",
  3: "$a<0$, $b<0$",
  4: "$a>0$, $b<0$",
};

/**
 * 점 변환 목록 — 좌표 05·06 이 공유한다. `needsDiff` 는 $a-b$ 의 부호가
 * 정해져야 결과 사분면이 정해지는 변환(제2·4사분면, 또는 $a>b$/$a<b$ 조건).
 * 테스트는 이 목록을 **자기 손으로 다시 구현**해 두 표본점으로 검산한다.
 */
const PT_TRANS: readonly {
  render: string;
  needsDiff: boolean;
  apply: (a: number, b: number) => [number, number];
}[] = [
  { render: "(a, b)", needsDiff: false, apply: (a, b) => [a, b] },
  { render: "(b, a)", needsDiff: false, apply: (a, b) => [b, a] },
  { render: "(-a, b)", needsDiff: false, apply: (a, b) => [-a, b] },
  { render: "(a, -b)", needsDiff: false, apply: (a, b) => [a, -b] },
  { render: "(-a, -b)", needsDiff: false, apply: (a, b) => [-a, -b] },
  { render: "(ab, a-b)", needsDiff: true, apply: (a, b) => [a * b, a - b] },
  { render: "(ab, b-a)", needsDiff: true, apply: (a, b) => [a * b, b - a] },
];

/** 좌표 06 의 부호 조건 — signs 는 (a, b) 의 부호. */
const SIGN_CONDS: readonly {
  render: string;
  signs: readonly [number, number];
  explain: string;
  allowDiff: boolean;
}[] = [
  {
    render: "$ab>0$, $a+b>0$",
    signs: [1, 1],
    explain:
      "$ab>0$이므로 $a$, $b$의 부호는 같고, $a+b>0$이므로 $a>0$, $b>0$이다.",
    allowDiff: false,
  },
  {
    render: "$ab>0$, $a+b<0$",
    signs: [-1, -1],
    explain:
      "$ab>0$이므로 $a$, $b$의 부호는 같고, $a+b<0$이므로 $a<0$, $b<0$이다.",
    allowDiff: false,
  },
  {
    render: "$ab<0$, $a>b$",
    signs: [1, -1],
    explain:
      "$ab<0$이므로 $a$, $b$의 부호는 다르고, $a>b$이므로 $a>0$, $b<0$이다.",
    allowDiff: true,
  },
  {
    render: "$ab<0$, $a<b$",
    signs: [-1, 1],
    explain:
      "$ab<0$이므로 $a$, $b$의 부호는 다르고, $a<b$이므로 $a<0$, $b>0$이다.",
    allowDiff: true,
  },
];

function signWord(n: number): string {
  return n > 0 ? "양수" : "음수";
}

/** 동류항 12 의 항 렌더 — kind: 0 x · 1 x² · 2 y · 3 xy · 4 상수 */
const TERM_SYMS = ["x", "x^{2}", "y", "xy", ""] as const;

function renderTerm(co: number, kind: number): string {
  const sym = TERM_SYMS[kind]!;
  if (sym === "") return String(co);
  const abs = Math.abs(co);
  const body = abs === 1 ? sym : `${abs}${sym}`;
  return co < 0 ? `-${body}` : body;
}

export const M1_BOOK1: TypeEntry[] = [
  // ── 소인수분해 → 소수와 거듭제곱 ───────────────────────
  defType(BOOK, "소인수분해", "01", "소수와 합성수", SEC1.소수, "기본", (rng) =>
    attempt(300, () => {
      const pool: number[] = [];
      for (let v = 1; v <= 48; v += 1) pool.push(v);
      const nums = pickDistinct(rng, pool, 6);
      const primes = nums.filter((v) => PRIMES.has(v));
      if (primes.length < 2 || primes.length > 4) return null;
      const count = primes.length;
      return {
        content: `다음 수 중에서 소수의 개수를 구하시오.\n${nums
          .map((v) => `$${v}$`)
          .join(", ")}`,
        answer: `$${count}$개`,
        solution: `약수가 $1$과 자기 자신뿐인 수가 소수이다.\n소수는 ${primes
          .map((v) => `$${v}$`)
          .join(", ")}의 $${count}$개이다.`,
        facts: {
          n1: nums[0]!,
          n2: nums[1]!,
          n3: nums[2]!,
          n4: nums[3]!,
          n5: nums[4]!,
          n6: nums[5]!,
          count,
        },
      };
    }),
  ),

  defType(
    BOOK,
    "소인수분해",
    "02",
    "소수와 합성수의 성질",
    SEC1.소수,
    "응용",
    (rng) =>
      attempt(300, () => {
        const kind = pick(rng, [0, 1] as const); // 0 소수 세기 · 1 합성수 세기
        const lo = intBetween(rng, 1, 30);
        const hi = lo + intBetween(rng, 10, 18);
        if (hi > 48) return null;
        const range: number[] = [];
        for (let v = lo; v <= hi; v += 1) range.push(v);
        const primes = range.filter((v) => PRIMES.has(v));
        const ones = lo === 1 ? 1 : 0;
        const count =
          kind === 0 ? primes.length : range.length - primes.length - ones;
        if (count < 3) return null;
        const kindText = kind === 0 ? "소수" : "합성수";
        const primeList = primes.map((v) => `$${v}$`).join(", ");
        const solution =
          kind === 0
            ? `이 범위의 소수는 ${primeList}이다.\n따라서 소수의 개수는 $${count}$개이다.`
            : `$${lo}$ 이상 $${hi}$ 이하의 자연수는 모두 $${range.length}$개이고, 이 중 소수는 ${primeList}의 $${primes.length}$개이다.${
                ones === 1 ? `\n$1$은 소수도 합성수도 아니다.` : ""
              }\n따라서 합성수는 $${range.length}-${primes.length + ones}=${count}$(개)이다.`;
        return {
          content: `$${lo}$ 이상 $${hi}$ 이하의 자연수 중에서 ${kindText}의 개수를 구하시오.`,
          answer: `$${count}$개`,
          solution,
          facts: { kind, lo, hi, count },
        };
      }),
  ),

  defType(BOOK, "소인수분해", "03", "거듭제곱", SEC1.소수, "기본", (rng) => {
    const [p, q] = pickDistinct(rng, [2, 3, 5, 7] as const, 2).sort(
      (x, y) => x - y,
    ) as [number, number];
    const m = intBetween(rng, 2, 4);
    const n = intBetween(rng, 2, 3);
    const reps = [...Array<number>(m).fill(p), ...Array<number>(n).fill(q)];
    return {
      content: `다음 식을 거듭제곱을 사용하여 나타내시오.\n$${reps.join(" \\times ")}$`,
      answer: `$${p}^{${m}} \\times ${q}^{${n}}$`,
      solution: `같은 수의 곱은 거듭제곱으로 나타낸다.\n밑 $${p}$의 지수는 $${m}$, 밑 $${q}$의 지수는 $${n}$이므로 $${p}^{${m}} \\times ${q}^{${n}}$이다.`,
      facts: { p, m, q, n },
    };
  }),

  // ── 문자의 사용과 식의 계산 → 일차식의 뜻Ⅰ·Ⅱ ─────────
  defType(
    BOOK,
    "문자의 사용과 식의 계산",
    "09",
    "다항식",
    SEC1.일차1,
    "기본",
    (rng) => {
      const a = intBetween(rng, 2, 7);
      const b = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 2, 9);
      const c = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 2, 9);
      const S = a + b + c;
      return {
        content: `다항식 $${a}x^{2}${signed(b)}x${signed(c)}$에서 $x^{2}$의 계수를 $a$, $x$의 계수를 $b$, 상수항을 $c$라 할 때, $a+b+c$의 값을 구하시오.`,
        answer: `$${S}$`,
        solution: `$x^{2}$의 계수는 $${a}$, $x$의 계수는 $${b}$, 상수항은 $${c}$이다.\n따라서 $a+b+c=${a}${signed(b)}${signed(c)}=${S}$이다.`,
        facts: { a, b, c, S },
      };
    },
  ),

  defType(
    BOOK,
    "문자의 사용과 식의 계산",
    "10",
    "일차식",
    SEC1.일차1,
    "기본",
    (rng) =>
      attempt(400, () => {
        const L = intBetween(rng, 2, 3);
        const items: { p: number; q: number; r: number }[] = [];
        for (let i = 0; i < L; i += 1) {
          items.push({
            p: 0,
            q: intNonzero(rng, -7, 7),
            r: intBetween(rng, -9, 9),
          });
        }
        for (let i = L; i < 5; i += 1) {
          if (rng() < 0.6) {
            items.push({
              p: intNonzero(rng, -5, 5),
              q: intBetween(rng, -5, 5),
              r: intBetween(rng, -5, 5),
            });
          } else {
            items.push({ p: 0, q: 0, r: intNonzero(rng, -9, 9) });
          }
        }
        const mixed = shuffle(rng, items);
        const strs = mixed.map((t) => poly(t.p, t.q, t.r));
        if (new Set(strs).size < 5) return null;
        const linearStrs = mixed
          .filter((t) => t.p === 0 && t.q !== 0)
          .map((t) => `$${poly(t.p, t.q, t.r)}$`);
        const facts: Record<string, number> = { count: L };
        mixed.forEach((t, i) => {
          facts[`p${i + 1}`] = t.p;
          facts[`q${i + 1}`] = t.q;
          facts[`r${i + 1}`] = t.r;
        });
        return {
          content: `다음 중 $x$에 대한 일차식의 개수를 구하시오.\n${strs
            .map((s) => `$${s}$`)
            .join(", ")}`,
          answer: `$${L}$개`,
          solution: `차수가 $1$인 다항식이 일차식이다.\n일차식은 ${linearStrs.join(", ")}의 $${L}$개이다.`,
          facts,
        };
      }),
  ),

  defType(
    BOOK,
    "문자의 사용과 식의 계산",
    "12",
    "동류항",
    SEC1.일차2,
    "기본",
    (rng) =>
      attempt(400, () => {
        const k = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 2, 8);
        const L = intBetween(rng, 2, 3);
        const items: { co: number; kd: number }[] = [];
        for (let i = 0; i < L; i += 1) {
          const co = intNonzero(rng, -9, 9);
          if (co === k) return null;
          items.push({ co, kd: 0 });
        }
        for (let i = L; i < 5; i += 1) {
          items.push({ co: intNonzero(rng, -9, 9), kd: intBetween(rng, 1, 4) });
        }
        const mixed = shuffle(rng, items);
        const strs = mixed.map((t) => renderTerm(t.co, t.kd));
        if (new Set(strs).size < 5) return null;
        const likeStrs = mixed
          .filter((t) => t.kd === 0)
          .map((t) => `$${renderTerm(t.co, t.kd)}$`);
        const facts: Record<string, number> = { k, count: L };
        mixed.forEach((t, i) => {
          facts[`co${i + 1}`] = t.co;
          facts[`kd${i + 1}`] = t.kd;
        });
        return {
          content: `다음 중 $${k}x$와 동류항인 것의 개수를 구하시오.\n${strs
            .map((s) => `$${s}$`)
            .join(", ")}`,
          answer: `$${L}$개`,
          solution: `문자와 차수가 각각 같은 항이 동류항이다.\n$${k}x$와 동류항인 것은 ${likeStrs.join(", ")}의 $${L}$개이다.`,
          facts,
        };
      }),
  ),

  defType(
    BOOK,
    "문자의 사용과 식의 계산",
    "13",
    "일차식의 덧셈과 뺄셈",
    SEC1.일차2,
    "응용",
    (rng) =>
      attempt(400, () => {
        const a = intNonzero(rng, -7, 7);
        if (Math.abs(a) < 2) return null;
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -7, 7);
        if (Math.abs(c) < 2) return null;
        const d = intNonzero(rng, -9, 9);
        const k = intBetween(rng, 2, 4);
        const op = pick(rng, [1, -1] as const);
        const p = a + op * k * c;
        const q = b + op * k * d;
        if (Math.abs(p) < 2 || q === 0) return null;
        return {
          content: `다음 식을 간단히 하시오.\n$(${poly(0, a, b)})${op > 0 ? "+" : "-"}${k}(${poly(0, c, d)})$`,
          answer: `$${poly(0, p, q)}$`,
          solution: `괄호를 풀면 $${poly(0, a, b)}${signed(op * k * c)}x${signed(op * k * d)}$이다.\n동류항끼리 모으면 $${poly(0, p, q)}$이다.`,
          facts: { a, b, c, d, k, op, p, q },
        };
      }),
  ),

  // ── 좌표와 그래프 → 순서쌍과 좌표평면(응용) ───────────
  defType(
    BOOK,
    "좌표와 그래프",
    "03",
    "좌표평면 위의 도형의 넓이",
    SEC1.좌표응용,
    "응용",
    (rng) =>
      attempt(500, () => {
        const by = intBetween(rng, -4, 4);
        const bx = intBetween(rng, -6, 2);
        const base = intBetween(rng, 2, 7);
        const cx = bx + base;
        if (cx > 6) return null;
        const h = intBetween(rng, 2, 7);
        if ((base * h) % 2 !== 0) return null;
        const up = rng() < 0.5 ? 1 : -1;
        const ay = by + up * h;
        if (Math.abs(ay) > 6) return null;
        const ax = intBetween(rng, -6, 6);
        const area = (base * h) / 2;
        return {
          content: `세 점 $\\mathrm{A}(${ax}, ${ay})$, $\\mathrm{B}(${bx}, ${by})$, $\\mathrm{C}(${cx}, ${by})$를 꼭짓점으로 하는 삼각형 $\\mathrm{ABC}$의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution: `두 점 $\\mathrm{B}$, $\\mathrm{C}$의 $y$좌표가 같으므로 변 $\\mathrm{BC}$는 $x$축에 평행하고, 그 길이는 $${base}$이다.\n높이는 점 $\\mathrm{A}$와 변 $\\mathrm{BC}$의 $y$좌표의 차 $${h}$이다.\n따라서 넓이는 $\\dfrac{1}{2}\\times${base}\\times${h}=${area}$이다.`,
          facts: { ax, ay, bx, by, cx, cy: by, area },
        };
      }),
  ),

  defType(
    BOOK,
    "좌표와 그래프",
    "04",
    "사분면",
    SEC1.좌표응용,
    "기본",
    (rng) => {
      const a = intNonzero(rng, -8, 8);
      const b = intNonzero(rng, -8, 8);
      const q = quadrantOf(a, b);
      return {
        content: `점 $(${a}, ${b})$는 제 몇 사분면 위의 점인지 구하시오.`,
        answer: `제$${q}$사분면`,
        solution: `$x$좌표가 ${signWord(a)}, $y$좌표가 ${signWord(b)}이므로 점 $(${a}, ${b})$는 제$${q}$사분면 위의 점이다.`,
        facts: { a, b, q },
      };
    },
  ),

  defType(
    BOOK,
    "좌표와 그래프",
    "05",
    "사분면 위의 점 점 가 속한 사분면이 주어진 경우",
    SEC1.좌표응용,
    "응용",
    (rng) => {
      const t = intBetween(rng, 1, PT_TRANS.length - 1);
      const trans = PT_TRANS[t]!;
      const s = trans.needsDiff
        ? pick(rng, [2, 4] as const)
        : intBetween(rng, 1, 4);
      const [sa, sb] = QUAD_SIGNS[s]!;
      const [qx, qy] = trans.apply(2 * sa, 3 * sb);
      const q = quadrantOf(qx, qy);
      return {
        content: `점 $\\mathrm{P}(a, b)$가 제$${s}$사분면 위의 점일 때, 점 $\\mathrm{Q}${trans.render}$는 제 몇 사분면 위의 점인지 구하시오.`,
        answer: `제$${q}$사분면`,
        solution: `점 $\\mathrm{P}$가 제$${s}$사분면 위의 점이므로 ${QUAD_DESC[s]}이다.\n점 $\\mathrm{Q}$의 $x$좌표는 ${signWord(qx)}, $y$좌표는 ${signWord(qy)}이므로 점 $\\mathrm{Q}$는 제$${q}$사분면 위의 점이다.`,
        facts: { s, t, q },
      };
    },
  ),

  defType(
    BOOK,
    "좌표와 그래프",
    "06",
    "사분면 위의 점 두 수의 부호를 이용하는 경우",
    SEC1.좌표응용,
    "심화",
    (rng) =>
      attempt(100, () => {
        const c = intBetween(rng, 0, SIGN_CONDS.length - 1);
        const cond = SIGN_CONDS[c]!;
        const t = intBetween(rng, 0, PT_TRANS.length - 1);
        const trans = PT_TRANS[t]!;
        if (trans.needsDiff && !cond.allowDiff) return null;
        const [sa, sb] = cond.signs;
        const [qx, qy] = trans.apply(2 * sa, 3 * sb);
        const q = quadrantOf(qx, qy);
        return {
          content: `${cond.render}일 때, 점 $${trans.render}$는 제 몇 사분면 위의 점인지 구하시오.`,
          answer: `제$${q}$사분면`,
          solution: `${cond.explain}\n점 $${trans.render}$의 $x$좌표는 ${signWord(qx)}, $y$좌표는 ${signWord(qy)}이므로 제$${q}$사분면 위의 점이다.`,
          facts: { c, t, q },
        };
      }),
  ),

  defType(
    BOOK,
    "좌표와 그래프",
    "10",
    "대칭인 점의 좌표",
    SEC1.좌표응용,
    "기본",
    (rng) => {
      const a = intNonzero(rng, -9, 9);
      const b = intNonzero(rng, -9, 9);
      const axis = intBetween(rng, 0, 2); // 0 x축 · 1 y축 · 2 원점
      const [cVal, dVal] =
        axis === 0 ? [a, -b] : axis === 1 ? [-a, b] : [-a, -b];
      const axisText = axis === 0 ? "$x$축" : axis === 1 ? "$y$축" : "원점";
      const rule =
        axis === 0
          ? "$x$축에 대하여 대칭인 점은 $y$좌표의 부호만 바뀐다."
          : axis === 1
            ? "$y$축에 대하여 대칭인 점은 $x$좌표의 부호만 바뀐다."
            : "원점에 대하여 대칭인 점은 $x$좌표와 $y$좌표의 부호가 모두 바뀐다.";
      return {
        content: `점 $(${a}, ${b})$와 ${axisText}에 대하여 대칭인 점의 좌표를 구하시오.`,
        answer: `$(${cVal}, ${dVal})$`,
        solution: `${rule}\n따라서 구하는 점의 좌표는 $(${cVal}, ${dVal})$이다.`,
        facts: { a, b, axis, c: cVal, d: dVal },
      };
    },
  ),

  // ── 일차방정식의 풀이 → 방정식과 그 해 (여력분) ────────
  defType(
    BOOK,
    "일차방정식의 풀이",
    "05",
    "항등식이 되는 조건",
    SEC1.방정식해,
    "응용",
    (rng) => {
      const p = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 2, 8);
      const k = (rng() < 0.5 ? -1 : 1) * intBetween(rng, 2, 5);
      const b0 = intNonzero(rng, -6, 6);
      const cVal = k * b0;
      const S = p + b0;
      return {
        content: `등식 $ax${signed(cVal)}=${p}x${signed(k)}b$가 $x$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: `$${S}$`,
        solution: `항등식은 $x$에 어떤 값을 대입해도 성립하므로 양변의 $x$의 계수와 상수항이 각각 같다.\n$a=${p}$이고 $${k}b=${cVal}$에서 $b=${b0}$이다.\n따라서 $a+b=${S}$이다.`,
        facts: { p, k, c: cVal, b: b0, S },
      };
    },
  ),
];
