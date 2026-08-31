/**
 * 초5 물결 3 확대 갈래(`심화중`·`심화상`) — **1-2 · 2-1 · 2-3** (D-113 · D-115).
 *
 * ## 이 시험이 잠그는 것 — 반증 가능한 형태로
 *
 * ```
 * ⑴ 마디가 «굳는다»       심화중: 시험이 **지면의 수로 후보를 직접 만들어**,
 *                          그 소단원의 성질을 만족하는 것이 **정확히 하나**임을 센다.
 *                          그리고 후보가 **둘 이상**임도 같이 센다 —
 *                          하나뿐이면 마디가 애초에 안 열린 것이라 심화하다
 * ⑵ 마디가 «안 굳는다»    심화상: 성질만으로는 후보가 둘 이상 남고, 발문이 준
 *                          둘째 값을 **후보마다 실제로 계산해야** 하나가 남는다.
 *                          🔴 심화상을 심화중 위에 세우는 유일한 문장이다
 * ⑶ 값 검산               참은 **찍힌 발문**에서 온다 — 생성기를 되부르지 않는다
 * ⑷ 반증 ⑥               제품 모듈 `forwardReach` 하나를 쓴다. **음성 대조**로
 *                          이 자가 «닿는다»를 낼 수 있음을 같은 회차에 못 박는다
 * ⑸ 비운 자리             1-2-2·1-2-3·1-2-5·2-1-2·2-1-3·2-1-5·2-3-1·2-3-2·2-3-3 은
 *                          확대 갈래를 **안 돌려주고**, 만들려 하면 **던진다**
 * ⑹ 되짚기가 장식이 아니다  2-3-4 는 되짚어 얻은 셋째 변이 답을 실제로 정한다
 *                          (그 마디를 빼면 답이 달라진다) · 1-2-6 상은 첫 후보가 답이 아니다
 * ⑺ 기준선 결함           `sym234Deep` 해설에 날 글자 `div` 가 없다
 * ```
 *
 * ## 못 보는 것
 *
 * · **「어려운가」 자체.** 난이도는 지면에 없다 — 원장님이 화면에서 보신다.
 * · **해설이 무엇을 시키는지**는 `probe-elem-tier-enumeration` 이 따로 센다.
 * · **문형(적재) 경로.** 이 회차는 갈래만 세웠다(D-114 는 별도 회차).
 * · **비운 자리가 «정말 못 서는가».** 시험은 「안 돌려준다」만 잠근다 —
 *   근거는 `scripts/qa/census-g5w3-empty.ts` 가 센다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  forwardReachable,
  pageNumbers,
  rat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { divisors, gcd, lcm } from "@/lib/elementary/math";

import { tiersOf } from "../helpers/elemTiers";

const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

/** 이 회차가 맡은 열여섯 소단원 — 손으로 적되 `supportedTiers` 와 **맞대어** 잠근다(⑸). */
const FILLED: Record<string, readonly ElemTier[]> = {
  "1-2-1": ["심화중", "심화상"],
  "1-2-2": [],
  "1-2-3": [],
  "1-2-4": ["심화중", "심화상"],
  "1-2-5": [],
  "1-2-6": ["심화중", "심화상"],
  "2-1-1": ["심화중"],
  "2-1-2": [],
  "2-1-3": [],
  "2-1-4": ["심화중", "심화상"],
  "2-1-5": [],
  "2-1-6": ["심화중", "심화상"],
  "2-3-1": [],
  "2-3-2": [],
  "2-3-3": [],
  "2-3-4": ["심화중"],
};

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(`${code} `),
  )!;

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/* ── 지면을 읽는 자 — 참은 **찍힌 발문**에서 온다(⑶) ── */

/** 발문의 `$…$` 안에 있는 정수들, 나온 차례대로. */
function intsOf(text: string): number[] {
  return [...text.matchAll(/\$([^$]*)\$/g)]
    .flatMap((m) => m[1]!.match(/\d+/g) ?? [])
    .map(Number);
}

/** 정답 한 값 — `$…$` 하나 안의 정수. */
function answerInt(answer: string): number {
  const m = /^\$(\d+)\$$/.exec(answer.trim());
  expect(m, `정답을 못 읽었다: ${answer}`).not.toBeNull();
  return Number(m![1]);
}

/** 약수를 모두 더한 값. */
const divSum = (v: number) => divisors(v).reduce((s, d) => s + d, 0);

/**
 * 「두 번째로 큰 약수가 `m`」인 수 **전부** — 시험이 직접 만든다(생성기를 안 부른다).
 * 규칙을 옮겨 적은 것이 아니라 «약수는 짝을 이룬다»는 정의를 그대로 편 것이다.
 */
function ownersOfSecondLargest(m: number): number[] {
  const out: number[] = [];
  for (let p = 2; p <= m; p += 1) {
    const ds = divisors(m * p);
    if (ds[1] === p && ds[ds.length - 2] === m) out.push(m * p);
  }
  return out;
}

/** 세 어림의 범위 `[가장 작은, 가장 큰]` — 자리 단위 `u`. */
const upRange = (A: number, u: number): [number, number] => [A - u + 1, A];
const downRange = (A: number, u: number): [number, number] => [A, A + u - 1];
const roundRange = (A: number, u: number): [number, number] => [
  A - u / 2,
  A + u / 2 - 1,
];

describe("[초5 물결 3] 확대 갈래 — 1-2 · 2-1 · 2-3", () => {
  /* ── ⑸ 채운 자리와 비운 자리 ── */

  it("채운 자리와 비운 자리가 등록과 정확히 맞는다", () => {
    for (const [code, want] of Object.entries(FILLED)) {
      const got = supportedTiers(unitOf(code)).filter(
        (t) => t === "심화중" || t === "심화상",
      );
      expect(got, `${code}`).toEqual(want);
    }
  });

  it("비운 자리는 확대 갈래를 만들려 하면 던진다 — 「냈다」가 거짓말이 되지 않는다", () => {
    for (const [code, want] of Object.entries(FILLED)) {
      for (const tier of ["심화중", "심화상"] as const) {
        if (want.includes(tier)) continue;
        expect(() => problem(code, tier, 11), `${code} ${tier}`).toThrow();
      }
    }
  });

  /* ── 공통 위생 ── */

  it("같은 씨앗·같은 갈래면 같은 문항이고, 씨앗에 반응한다 (R9)", () => {
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        expect(problem(code, tier, 11).content).toBe(
          problem(code, tier, 11).content,
        );
        const rows = new Set(SEEDS.map((s) => problem(code, tier, s).content));
        expect(rows.size, `${code} ${tier}`).toBeGreaterThan(2);
      }
    }
  });

  it("여섯 갈래 발문이 한 소단원 안에서 서로 갈린다 (D-66 ⑸)", () => {
    for (const code of Object.keys(FILLED)) {
      for (const seed of SEEDS) {
        const rows = tiersOf(unitOf(code)).map(
          (t) => problem(code, t, seed).content,
        );
        expect(new Set(rows).size, `${code} @${seed}\n${rows.join("\n")}`).toBe(
          rows.length,
        );
      }
    }
  });

  it("모든 수가 KaTeX 안에 있다 (R1) · 발문에 아라비아 «각형»이 없다 (R4)", () => {
    const bad: string[] = [];
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          for (const [where, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution ?? ""],
          ] as const) {
            const loose = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (loose) bad.push(`${code} ${tier} @${seed} ${where}: ${loose}`);
          }
          expect(p.content.match(/\d+\s*각형/g), `${code} ${tier}`).toBeNull();
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("1-2 의 이웃 낱말 규약을 확대 갈래도 지킨다 (D-66 ⑸)", () => {
    for (const seed of SEEDS) {
      for (const tier of ["심화중", "심화상"] as const) {
        // 1-2-1 은 «한 수»의 약수·배수만 다룬다
        expect(/공약수|공배수/.test(problem("1-2-1", tier, seed).content)).toBe(
          false,
        );
        // 1-2-4 는 «공배수»를, 1-2-6 은 «최대공약수»를 입에 올리지 않는다
        expect(/공배수/.test(problem("1-2-4", tier, seed).content)).toBe(false);
        expect(/최대공약수/.test(problem("1-2-6", tier, seed).solution!)).toBe(
          false,
        );
      }
    }
  });

  /* ── ⑷ 반증 ⑥ — 제품 모듈 하나로, **음성 대조**를 같이 ── */

  it("확대 갈래는 순방향으로 안 닿는다 (음성 대조 — 이 자가 «닿는다»를 낼 수 있다)", () => {
    const stuck: string[] = [];
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          if (
            forwardReachable(pageNumbers(p.content), rat(answerInt(p.answer)))
          )
            stuck.push(`${code} ${tier} @${seed}\n${p.content}`);
        }
      }
    }
    expect(stuck).toEqual([]);
    // 🔴 음성 대조 — 이 세 대단원의 **연산 갈래**에서 실제로 «닿는다»가 나온다.
    //    안 나오면 위의 `[]` 가 «깨끗»인지 «못 셈»인지 갈리지 않는다.
    //    (1-2-6 연산 「두 수의 최소공배수」는 씨앗의 절반쯤에서 곱 경로로 닿는다.)
    const hits = SEEDS.filter((s) => {
      const p = problem("1-2-6", "연산", s);
      const m = /^\$(\d+)\$$/.exec(p.answer.trim());
      return m
        ? forwardReachable(pageNumbers(p.content), rat(Number(m[1])))
        : false;
    });
    expect(
      hits.length,
      "음성 대조가 하나도 안 닿는다 — 자가 죽었다",
    ).toBeGreaterThan(0);
  });

  /* ── ⑴ 1-2-1 심화중 — 후보 둘 이상 중 «짝수»가 하나뿐이다 ── */

  it("1-2-1 심화중 — 두 번째로 큰 약수가 만드는 후보 중 짝수가 정확히 하나다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-1", "심화중", seed);
      const nums = intsOf(p.content);
      expect(nums.length, p.content).toBe(1);
      const m = nums[0]!;
      const owners = ownersOfSecondLargest(m);
      // 마디가 실제로 열린다 — 후보가 하나뿐이면 애초에 굳은 것이라 심화하다.
      expect(owners.length, `${p.content}\n후보 ${owners}`).toBeGreaterThan(1);
      const evens = owners.filter((v) => v % 2 === 0);
      expect(evens.length, `${p.content}\n후보 ${owners}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(evens[0]);
      // ⑶ 값 검산 — 답의 두 번째로 큰 약수가 정말 `m` 이다.
      const ds = divisors(answerInt(p.answer));
      expect(ds[ds.length - 2], p.content).toBe(m);
    }
  });

  /* ── ⑵ 1-2-1 심화상 — 성질로는 안 갈리고 «약수의 합»을 다 구해야 갈린다 ── */

  it("1-2-1 심화상 — 후보가 둘 이상이고 약수의 합이 맞는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-1", "심화상", seed);
      const [m, sum] = intsOf(p.content) as [number, number];
      const owners = ownersOfSecondLargest(m);
      expect(owners.length, `${p.content}\n후보 ${owners}`).toBeGreaterThan(1);
      const hit = owners.filter((v) => divSum(v) === sum);
      expect(hit.length, `${p.content}\n후보 ${owners}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]);
      // 🔴 성질(짝을 이룬다)만으로는 못 갈린다 — 후보가 둘 이상 남는 것이 그 뜻이다.
      //    그리고 후보의 약수합이 서로 달라야 «견주기»가 답을 하나로 만든다.
      expect(new Set(owners.map(divSum)).size, p.content).toBe(owners.length);
    }
  });

  /* ── ⑴ 1-2-4 심화중 — «두 몫은 서로소»가 굳힌다 ── */

  it("1-2-4 심화중 — 합이 같은 짝 중 서로소이고 둘 다 $1$보다 큰 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-4", "심화중", seed);
      const [g, S] = intsOf(p.content) as [number, number];
      expect(S % g, p.content).toBe(0);
      const T = S / g;
      const all: [number, number][] = [];
      for (let a = 1; a * 2 < T; a += 1) all.push([a, T - a]);
      // 마디가 열린다 — 합이 `T` 인 짝이 여럿이다.
      expect(all.length, p.content).toBeGreaterThan(1);
      const coprime = all.filter(([a, b]) => gcd(a, b) === 1);
      // 🔴 «서로소»만으로는 안 굳는다 — `(1, T-1)` 이 늘 서로소이기 때문이다.
      //    그래서 발문이 «어느 수도 다른 수의 약수가 아니다»를 함께 준다.
      expect(coprime.length, p.content).toBeGreaterThan(1);
      const both = coprime.filter(([a]) => a > 1);
      expect(both.length, `${p.content}\n${JSON.stringify(coprime)}`).toBe(1);
      const [a, b] = both[0]!;
      expect(gcd(g * a, g * b), p.content).toBe(g);
      expect(g * a + g * b, p.content).toBe(S);
      expect(answerInt(p.answer), p.content).toBe(g * b);
    }
  });

  /* ── ⑵ 1-2-4 심화상 — 공약수마다 장수를 실제로 세어야 갈린다 ── */

  it("1-2-4 심화상 — 공약수가 여럿인데 그 장수를 내는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-4", "심화상", seed);
      const [a, b, count] = intsOf(p.content) as [number, number, number];
      const divs = divisors(gcd(a, b));
      expect(divs.length, p.content).toBeGreaterThan(2);
      const hit = divs.filter((d) => (a / d) * (b / d) === count);
      expect(hit.length, p.content).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]);
      // 🔴 **기본**(가장 큰 정사각형)과 같은 문항이 아니다 — 답이 최대공약수가 아니다.
      expect(hit[0], p.content).not.toBe(gcd(a, b));
    }
  });

  /* ── ⑴ 1-2-6 심화중 — «두 수는 최소공배수의 약수»가 굳힌다 ── */

  it("1-2-6 심화중 — 최소공배수의 약수 중 합이 맞는 짝이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-6", "심화중", seed);
      const [M, S] = intsOf(p.content) as [number, number];
      const ds = divisors(M);
      const pairs = ds.flatMap((x) =>
        ds.filter((y) => y > x && x + y === S).map((y) => [x, y] as const),
      );
      expect(pairs.length, `${p.content}\n${JSON.stringify(pairs)}`).toBe(1);
      const [x, y] = pairs[0]!;
      expect(lcm(x, y), p.content).toBe(M);
      expect(answerInt(p.answer), p.content).toBe(y);
      // 🔴 성질을 빼면 안 굳는다 — 합이 `S` 인 자연수 짝은 얼마든지 있다.
      expect(Math.floor((S - 1) / 2), p.content).toBeGreaterThan(1);
    }
  });

  /* ── ⑵⑹ 1-2-6 심화상 — 후보를 차례로 대 봐야 하고 첫 후보가 답이 아니다 ── */

  it("1-2-6 심화상 — 공배수 후보를 차례로 대야 하고 첫 후보는 답이 아니다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-2-6", "심화상", seed);
      const [a, b, r, c] = intsOf(p.content) as [
        number,
        number,
        number,
        number,
      ];
      // 성질: 나머지를 뺀 값이 두 수의 공배수다.
      const m = lcm(a, b);
      const ans = answerInt(p.answer);
      expect((ans - r) % m, p.content).toBe(0);
      expect(ans % c, p.content).toBe(0);
      // 🔴 견줄 것이 실제로 있다 — 첫 후보(`m + r`)가 곧 답이면 되짚기가 장식이다.
      const k = (ans - r) / m;
      expect(k, p.content).toBeGreaterThan(2);
      // 그리고 그 앞 후보들은 정말 `c` 의 배수가 아니다(답이 «가장 작은» 것이 맞다).
      for (let i = 1; i < k; i += 1)
        expect((i * m + r) % c, `${p.content} @${i}`).not.toBe(0);
      // 성질(나머지 < 나누는 수)을 지킨다.
      expect(r, p.content).toBeLessThan(Math.min(a, b));
    }
  });

  /* ── ⑴ 2-1-1 심화중 — «이하는 끝을 포함한다»가 굳힌다 ── */

  it("2-1-1 심화중 — 개수가 같은 □ 후보가 여럿인데 배수인 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-1", "심화중", seed);
      const [a, k, c] = intsOf(p.content) as [number, number, number];
      const countUpTo = (hi: number) =>
        Math.floor(hi / k) - Math.floor((a - 1) / k);
      const cands: number[] = [];
      for (let v = a; v <= 200; v += 1) if (countUpTo(v) === c) cands.push(v);
      // 마디가 열린다 — 개수만으로는 □ 가 안 굳는다.
      expect(cands.length, p.content).toBeGreaterThan(1);
      const hit = cands.filter((v) => v % k === 0);
      expect(hit.length, p.content).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]);
      // 🔴 «이하»가 실제로 일한다 — «미만»으로 세면 답이 달라진다.
      const strict: number[] = [];
      for (let v = a; v <= 200; v += 1)
        if (Math.floor((v - 1) / k) - Math.floor((a - 1) / k) === c)
          strict.push(v);
      expect(strict.filter((v) => v % k === 0)[0], p.content).not.toBe(hit[0]);
    }
  });

  /* ── ⑴ 2-1-4 심화중 — 자릿값 성질이 자리를 굳힌다 ── */

  it("2-1-4 심화중 — 올림한 자리 후보 셋 중 하나만 남는다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-4", "심화중", seed);
      const [A] = intsOf(p.content) as [number];
      // 「그 자리까지 올림하면 그 자리 아래는 모두 $0$」 — 결과가 그 자리의 배수여야 한다.
      const ok = [10, 100, 1000].filter((u) => A % u === 0);
      expect(ok, p.content).toEqual([10]);
      expect(answerInt(p.answer), p.content).toBe(upRange(A, 10)[0]);
    }
  });

  /* ── ⑵ 2-1-4 심화상 — 자리 셋이 다 서고 개수를 세어야 갈린다 ── */

  it("2-1-4 심화상 — 자리 셋이 모두 서는데 개수가 맞는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-4", "심화상", seed);
      const [A, c] = intsOf(p.content) as [number, number];
      // 🔴 성질로는 안 갈린다 — 십·백·천 셋 다 `A` 를 낼 수 있다.
      const ok = [10, 100, 1000].filter((u) => A % u === 0);
      expect(ok.length, p.content).toBe(3);
      const hit = ok.filter((u) => u === c);
      expect(hit.length, p.content).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(upRange(A, c)[0]);
    }
  });

  /* ── ⑴ 2-1-6 심화중 — 끝 규칙이 «계산 없이» 둘을 지운다 ── */

  it("2-1-6 심화중 — 세 어림 중 그 값을 담는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-6", "심화중", seed);
      const [A, v] = intsOf(p.content) as [number, number];
      const ranges: [string, [number, number]][] = [
        ["올림", upRange(A, 10)],
        ["버림", downRange(A, 10)],
        ["반올림", roundRange(A, 10)],
      ];
      const ok = ranges.filter(([, [lo, hi]]) => v >= lo && v <= hi);
      expect(ok.length, `${p.content}\n${JSON.stringify(ranges)}`).toBe(1);
      const [name, [lo, hi]] = ok[0]!;
      expect(answerInt(p.answer), p.content).toBe(
        /가장 작은/.test(p.content) ? lo : hi,
      );
      // 마디가 실제로 열린다 — 그 단서가 없으면 세 어림이 다 가능하다.
      expect(["올림", "버림"], p.content).toContain(name);
    }
  });

  /* ── ⑵ 2-1-6 심화상 — 세 범위를 다 만들어 끝값으로 견준다 ── */

  it("2-1-6 심화상 — 세 어림의 «가장 큰 수»가 서로 달라 그것으로만 갈린다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-1-6", "심화상", seed);
      const [A, H] = intsOf(p.content) as [number, number];
      const ranges = [
        upRange(A, 100),
        downRange(A, 100),
        roundRange(A, 100),
      ] as [number, number][];
      // 🔴 셋 다 `A` 를 낼 수 있다 — 성질로는 안 갈린다.
      expect(
        ranges.every(([lo, hi]) => lo <= A && A <= hi),
        p.content,
      ).toBe(true);
      const hit = ranges.filter(([, hi]) => hi === H);
      expect(hit.length, `${p.content}\n${JSON.stringify(ranges)}`).toBe(1);
      expect(answerInt(p.answer), p.content).toBe(hit[0]![0]);
    }
  });

  /* ── ⑴⑹ 2-3-4 심화중 — «마주 보는 변은 같다»가 굳히고, 셋째 변이 답을 정한다 ── */

  it("2-3-4 심화중 — 되짚어 얻은 셋째 변이 답을 실제로 정한다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-3-4", "심화중", seed);
      const [P, x, y] = intsOf(p.content) as [number, number, number];
      expect(P % 2, p.content).toBe(0);
      const z = P / 2 - x - y;
      expect(z, p.content).toBeGreaterThan(0);
      // 세 길이가 모두 달라야 «가장 긴/짧은 변»이 하나로 정해진다.
      expect(new Set([x, y, z]).size, p.content).toBe(3);
      const want = Math.max(x, y, z) - Math.min(x, y, z);
      expect(answerInt(p.answer), p.content).toBe(want);
      // 🔴 되짚기가 장식이 아니다 — `z` 를 안 구하면 답이 `|y-x|` 가 되어 **달라진다**.
      expect(want, p.content).not.toBe(Math.abs(y - x));
    }
  });

  /* ── ⑺ 기준선 결함 — 해설에 날 글자 `div` 가 없다 ── */

  it("2-3-4 심화하 해설이 지면에 날 글자를 내지 않는다 (토대 17 §7)", () => {
    for (const seed of SEEDS) {
      const s = problem("2-3-4", "심화하", seed).solution ?? "";
      // `\div` 가 홑 역슬래시면 지면에 `60div2=30` 이 그대로 나간다.
      expect(/\d\s*div\s*\d/.test(s), `@${seed}\n${s}`).toBe(false);
      expect(s.includes("\\div"), `@${seed}\n${s}`).toBe(true);
    }
  });
});
