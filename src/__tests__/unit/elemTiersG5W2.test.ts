/**
 * 초5 물결 2 확대 갈래(`심화중`·`심화상`) — **1-5 · 1-6 · 2-6** (D-113 · D-115).
 *
 * ## 이 시험이 잠그는 것 — 반증 가능한 형태로
 *
 * ```
 * ⑴ 마디가 «굳는다»        심화중: 되짚기 후보 **둘**을 시험이 직접 만들어,
 *                          그 소단원의 성질을 만족하는 것이 **정확히 하나**임을 센다
 * ⑵ 마디가 «안 굳는다»     심화상: 조건마다 후보 둘이 **둘 다** 성질을 만족한다
 *                          (= 성질로 못 갈린다). 두 조건의 교집합이 하나다.
 *                          🔴 **심화상을 심화중 위에 세우는 유일한 문장이다**
 * ⑶ 값 검산               참은 **찍힌 발문**에서 온다 — 생성기를 되부르지 않는다
 * ⑷ 반증 ⑥               제품 모듈 `forwardReach` 하나를 쓴다. **음성 대조**로
 *                          연산 갈래가 «닿는다»를 함께 못 박는다 —
 *                          0 이 «깨끗»인지 «못 셈»인지 갈라야 하므로
 * ⑸ 비운 자리             1-5-2·1-6-3 은 확대 갈래를 **안 돌려준다**.
 *                          비움이 «깜빡»이 아니라 **결정**임을 못 박는다
 * ```
 *
 * ## 못 보는 것
 *
 * · **「어려운가」 자체.** 난이도는 지면에 없다 — 원장님이 화면에서 보신다.
 * · **해설이 무엇을 시키는지**는 `probe-elem-tier-enumeration` 이 따로 센다.
 * · **문형(적재) 경로.** 이 회차는 갈래만 세웠다(D-114 는 별도 회차).
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

import { tiersOf } from "../helpers/elemTiers";

const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

/** 이 회차가 채운 자리 — 손으로 적되 `supportedTiers` 와 **맞대어** 잠근다(⑸). */
const FILLED: Record<string, readonly ElemTier[]> = {
  "1-5-1": ["심화중"],
  "1-5-2": [],
  "1-5-3": ["심화중", "심화상"],
  "1-5-4": ["심화중", "심화상"],
  "1-6-1": ["심화중", "심화상"],
  "1-6-2": ["심화상"],
  "1-6-3": [],
  "1-6-4": ["심화중", "심화상"],
  "1-6-5": ["심화중", "심화상"],
  "2-6-1": ["심화중"],
  "2-6-2": ["심화중"],
  "2-6-3": ["심화중", "심화상"],
};

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(`${code} `),
  )!;

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/* ── 지면을 읽는 자 — 참은 **찍힌 발문**에서 온다(⑶) ── */

/** `$…$` 덩어리 목록. */
const chunks = (t: string) => [...t.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!);

/** 분수·대분수를 **뺀 뒤** 남은 정수들. `\frac{3}{4}` 를 3·4 로 읽으면 안 된다. */
function intsOf(text: string): number[] {
  return chunks(text)
    .map((c) => c.replace(/(\d+)?\s*\\frac\{\d+\}\{\d+\}/g, " "))
    .flatMap((c) => c.match(/\d+/g) ?? [])
    .map(Number);
}

type Fr = [number, number];

/** 지면의 분수·대분수를 나온 차례대로 — `[분자, 분모]`. */
function fracsOf(text: string): Fr[] {
  const out: Fr[] = [];
  for (const c of chunks(text))
    for (const m of c.matchAll(/(\d+)?\s*\\frac\{(\d+)\}\{(\d+)\}/g))
      out.push([Number(m[1] ?? 0) * Number(m[3]) + Number(m[2]), Number(m[3])]);
  return out;
}

/** 정답 한 값 — 정수든 분수든. */
function answerFr(answer: string): Fr {
  const f = fracsOf(answer);
  if (f.length === 1) return f[0]!;
  const i = intsOf(answer);
  expect(i.length, `정답을 못 읽었다: ${answer}`).toBe(1);
  return [i[0]!, 1];
}

const red = ([a, b]: Fr): Fr => {
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
  const d = g(a, b) || 1;
  return [a / d, b / d];
};
const fAdd = ([a, b]: Fr, [c, d]: Fr): Fr => red([a * d + c * b, b * d]);
const fSub = ([a, b]: Fr, [c, d]: Fr): Fr => red([a * d - c * b, b * d]);
const fEq = (x: Fr, y: Fr) => {
  const [a, b] = red(x);
  const [c, d] = red(y);
  return a === c && b === d;
};
/** 진분수 — `0 < x < 1`. 1-5-1·1-5-3 이 마디를 굳히는 성질 그 자체다. */
const isProper = ([a, b]: Fr) => a > 0 && a < b;
/** 대분수 — `1` 보다 크고 자연수가 아니다. 1-5-4 의 성질. */
const isMixed = ([a, b]: Fr) => a > b && b !== 1;

/** 곱이 `p` 인 자연수 짝 `[작은, 큰]`. */
function pairsOf(p: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = 1; d * d < p; d += 1) if (p % d === 0) out.push([d, p / d]);
  return out;
}

const COUNT_WORD: Record<string, number> = {
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
};

function countAfter(text: string, label: string): number {
  const m = new RegExp(`${label}\\s+(\\S+)\\s`).exec(text);
  expect(m, `«${label}» 뒤의 개수를 못 읽었다\n${text}`).not.toBeNull();
  const v = COUNT_WORD[m![1]!];
  expect(v, `한글 세는 수가 아니다: ${m![1]}\n${text}`).toBeDefined();
  return v!;
}

describe("[초5 물결 2] 확대 갈래 — 1-5 · 1-6 · 2-6", () => {
  /* ── ⑸ 채운 자리와 비운 자리 ── */

  it("채운 자리와 비운 자리가 등록과 정확히 맞는다", () => {
    for (const [code, want] of Object.entries(FILLED)) {
      const got = supportedTiers(unitOf(code)).filter(
        (t) => t === "심화중" || t === "심화상",
      );
      expect(got, `${code}`).toEqual(want);
    }
  });

  it("비운 소단원은 확대 갈래를 만들려 하면 던진다 — 「냈다」가 거짓말이 되지 않는다", () => {
    for (const code of ["1-5-2", "1-6-3"]) {
      for (const tier of ["심화중", "심화상"] as const) {
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

  /* ── ⑷ 반증 ⑥ — 제품 모듈 하나로, **음성 대조**를 같이 ── */

  it("확대 갈래는 순방향으로 안 닿고, 연산 갈래는 닿는다 (음성 대조)", () => {
    const stuck: string[] = [];
    for (const [code, tiers] of Object.entries(FILLED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = problem(code, tier, seed);
          const [an, ad] = answerFr(p.answer);
          if (forwardReachable(pageNumbers(p.content), rat(an, ad)))
            stuck.push(`${code} ${tier} @${seed}\n${p.content}`);
        }
      }
    }
    expect(stuck).toEqual([]);
    // 🔴 음성 대조 — 이 자가 «닿는다»를 낼 수 있음을 같은 회차에 보인다.
    //    안 보이면 위의 `[]` 가 «깨끗»인지 «못 셈»인지 갈리지 않는다.
    const hits = SEEDS.filter((s) => {
      const p = problem("2-6-2", "연산", s);
      const [an, ad] = answerFr(p.answer);
      return forwardReachable(pageNumbers(p.content), rat(an, ad));
    });
    expect(hits.length, "음성 대조가 하나도 안 닿는다 — 자가 죽었다").toBe(
      SEEDS.length,
    );
  });

  /* ── ⑴ 1-5 심화중 — 후보 둘 중 **하나만** 그 소단원의 수다 ── */

  it("1-5-1 심화중 — 합의 자연수 부분 후보 둘 중 진분수를 내는 것이 하나뿐이다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-5-1", "심화중", seed);
      const f = fracsOf(p.content);
      expect(f.length, p.content).toBe(2);
      const [added, part] = f as [Fr, Fr];
      // 「진분수+진분수는 $2$보다 작다」 → 합 후보는 둘뿐이다.
      const cands: Fr[] = [part, fAdd(part, [1, 1])].map((s) => fSub(s, added));
      const ok = cands.filter(isProper);
      expect(ok.length, `${p.content}\n후보 ${JSON.stringify(cands)}`).toBe(1);
      expect(fEq(ok[0]!, answerFr(p.answer)), p.content).toBe(true);
      // 되짚기만으로는 안 굳는다 — 두 후보가 실제로 다르다.
      expect(fEq(cands[0]!, cands[1]!)).toBe(false);
    }
  });

  it("1-5-3·1-5-4 심화중 — 차의 두 방향 중 그 소단원의 수가 하나뿐이다", () => {
    for (const [code, holds] of [
      ["1-5-3", isProper],
      ["1-5-4", isMixed],
    ] as const) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        const f = fracsOf(p.content);
        expect(f.length, p.content).toBe(2);
        const [base, diff] = f as [Fr, Fr];
        const cands = [fAdd(base, diff), fSub(base, diff)];
        const ok = cands.filter(holds);
        expect(ok.length, `${code}\n${p.content}`).toBe(1);
        expect(fEq(ok[0]!, answerFr(p.answer)), p.content).toBe(true);
      }
    }
  });

  /* ── ⑵ 1-5 심화상 — 조건마다 후보 **둘 다** 성질을 만족한다 ── */

  it("1-5-3·1-5-4 심화상 — 성질로는 안 갈리고 두 조건의 교집합이 하나다", () => {
    for (const [code, holds] of [
      ["1-5-3", isProper],
      ["1-5-4", isMixed],
    ] as const) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const f = fracsOf(p.content);
        expect(f.length, p.content).toBe(4);
        const [p1, d1, p2, d2] = f as [Fr, Fr, Fr, Fr];
        const set1 = [fAdd(p1, d1), fSub(p1, d1)];
        const set2 = [fAdd(p2, d2), fSub(p2, d2)];
        // 🔴 이 두 줄이 «상»을 «중» 위에 세운다 — 성질이 **아무것도 못 지운다**.
        expect(set1.every(holds), `${code} 첫째 조건\n${p.content}`).toBe(true);
        expect(set2.every(holds), `${code} 둘째 조건\n${p.content}`).toBe(true);
        const both = set1.filter((x) => set2.some((y) => fEq(x, y)));
        expect(both.length, `${code}\n${p.content}`).toBe(1);
        expect(fEq(both[0]!, answerFr(p.answer)), p.content).toBe(true);
      }
    }
  });

  /* ── 1-6-1 심화중 — 이어 붙이는 방법 둘, 둘레가 하나만 맞는다 ── */

  it("1-6-1 심화중 — 두 붙이기의 둘레가 서로 다르고 발문의 둘레는 하나만 맞는다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-1", "심화중", seed);
      const [w, h, per] = intsOf(p.content) as [number, number, number];
      const made = [
        { per: 2 * (w + 2 * h), long: Math.max(w, 2 * h) }, // $w$ 끼리 붙임
        { per: 2 * (2 * w + h), long: Math.max(2 * w, h) }, // $h$ 끼리 붙임
      ];
      expect(made[0]!.per, p.content).not.toBe(made[1]!.per);
      const hit = made.filter((m) => m.per === per);
      expect(hit.length, p.content).toBe(1);
      expect(intsOf(p.answer)[0], p.content).toBe(hit[0]!.long);
    }
  });

  /* ── 1-6-1 심화상 — 후보 둘레를 실제로 만들어 견주어야 갈린다 ── */

  it("1-6-1 심화상 — 답보다 작은 공통 둘레가 하나 이상 있고 차가 다르다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-1", "심화상", seed);
      const [s1, s2, diff] = intsOf(p.content) as [number, number, number];
      const per = intsOf(p.answer)[0]!;
      expect(per % s1, p.content).toBe(0);
      expect(per % s2, p.content).toBe(0);
      expect(per / s1 - per / s2, p.content).toBe(diff);
      // 더 작은 공통 둘레가 실제로 있고, 그것들은 조건을 **안** 만족한다 —
      // 곧 첫 후보에서 끊지 못하고 **만들어 견주어야** 한다.
      const smaller: number[] = [];
      for (let v = 1; v < per; v += 1)
        if (v % s1 === 0 && v % s2 === 0) smaller.push(v);
      expect(
        smaller.length,
        `${p.content}\n첫 공통 둘레가 곧 답이면 견줄 것이 없다`,
      ).toBeGreaterThan(0);
      for (const v of smaller) {
        const ok = v / s2 >= 3 && v / s1 - v / s2 === diff;
        expect(ok, `${p.content}\n${v} 도 조건을 만족한다`).toBe(false);
      }
    }
  });

  /* ── 1-6-2·1-6-4·1-6-5 — 인수 짝을 만들어 **다른 축**으로 고른다 ── */

  it("1-6-2 심화상 — 넓이의 짝이 셋 이상이고 둘레가 정확히 하나를 고른다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-2", "심화상", seed);
      const [area, per] = intsOf(p.content) as [number, number];
      const pairs = pairsOf(area);
      expect(pairs.length, p.content).toBeGreaterThanOrEqual(3);
      const hit = pairs.filter(([x, y]) => 2 * (x + y) === per);
      expect(hit.length, p.content).toBe(1);
      expect(intsOf(p.answer)[0], p.content).toBe(hit[0]![1]);
    }
  });

  it("1-6-4 심화상 — 넓이의 $2$배가 만든 짝을 «차»가 정확히 하나 고른다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-4", "심화상", seed);
      const [pb, ph, diff] = intsOf(p.content) as [number, number, number];
      const pairs = pairsOf(2 * pb * ph);
      expect(pairs.length, p.content).toBeGreaterThanOrEqual(3);
      const hit = pairs.filter(([x, y]) => y - x === diff);
      expect(hit.length, p.content).toBe(1);
      expect(intsOf(p.answer)[0], p.content).toBe(hit[0]![1]);
    }
  });

  it("1-6-5 심화상 — 두 변의 곱이 만든 짝을 «합»이 정확히 하나 고른다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-5", "심화상", seed);
      const [h, area, prod] = intsOf(p.content) as [number, number, number];
      expect((2 * area) % h, p.content).toBe(0);
      const sum = (2 * area) / h;
      const pairs = pairsOf(prod);
      expect(pairs.length, p.content).toBeGreaterThanOrEqual(3);
      const hit = pairs.filter(([x, y]) => x + y === sum);
      expect(hit.length, p.content).toBe(1);
      expect(intsOf(p.answer)[0], p.content).toBe(hit[0]![1]);
    }
  });

  /* ── 1-6 심화중 — 성질이 **한 번에** 굳힌다 ── */

  it("1-6-4 심화중 — 넓이의 합이 삼각형 넓이의 $3$배이고 높이가 다시 선다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-4", "심화중", seed);
      const [sum, base] = intsOf(p.content) as [number, number];
      expect(sum % 3, p.content).toBe(0);
      const para = (sum / 3) * 2;
      expect(para % base, p.content).toBe(0);
      expect(intsOf(p.answer)[0], p.content).toBe(para / base);
    }
  });

  it("1-6-5 심화중 — 대각선의 곱이 «짧은 것을 두 번 곱한 값»의 배수로 갈린다", () => {
    for (const seed of SEEDS) {
      const p = problem("1-6-5", "심화중", seed);
      const [area, mult] = intsOf(p.content) as [number, number];
      const long = intsOf(p.answer)[0]!;
      expect(long % mult, p.content).toBe(0);
      const short = long / mult;
      expect(short * long, p.content).toBe(2 * area);
      // 곱셈구구 안에서만 되짚을 수 있다(초5 는 제곱근이 없다).
      expect(short, p.content).toBeLessThanOrEqual(12);
    }
  });

  /* ── 2-6 ── */

  it("2-6-1 심화중 — 전체 평균이 «인원이 많은 쪽»에 더 가깝고 합이 다시 선다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-6-1", "심화중", seed);
      const [low, high, total] = intsOf(p.content) as [number, number, number];
      const ga = countAfter(p.content, "가 모둠은");
      const na = countAfter(p.content, "나 모둠은");
      expect(ga, p.content).not.toBe(na);
      expect(low < total && total < high, p.content).toBe(true);
      // 🔴 굳히는 성질이 **실제로 일한다** — 가까운 쪽이 인원이 많은 쪽이다.
      const nearHigh = high - total < total - low;
      const bigIsNa = na > ga;
      const naAvg = nearHigh === bigIsNa ? high : low;
      const gaAvg = naAvg === high ? low : high;
      expect(naAvg * na + gaAvg * ga, p.content).toBe(total * (ga + na));
      expect(intsOf(p.answer)[0], p.content).toBe(naAvg * na);
    }
  });

  it("2-6-2 심화중 — 남는 만큼과 모자란 만큼이 맞물리고 전체 평균이 다시 선다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-6-2", "심화중", seed);
      const [low, high, total] = intsOf(p.content) as [number, number, number];
      const back = countAfter(p.content, "뒤의");
      expect(low < total && total < high, p.content).toBe(true);
      const over = (high - total) * back;
      expect(over % (total - low), p.content).toBe(0);
      const front = over / (total - low);
      expect(front, p.content).toBeGreaterThanOrEqual(2);
      expect(low * front + high * back, p.content).toBe(total * (front + back));
      expect(intsOf(p.answer)[0], p.content).toBe(front + back);
    }
  });

  it("2-6-3 심화중 — 가능성만으로는 개수가 안 굳고 한 색의 개수가 굳힌다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-6-3", "심화중", seed);
      const f = fracsOf(p.content);
      expect(f.length, p.content).toBe(1);
      const [a, b] = red(f[0]!);
      const blue = intsOf(p.content)[0]!;
      // 🔴 마디가 안 굳는다 — 분수만으로는 (빨강, 전체) 짝이 여럿이다.
      expect(b - a, p.content).toBeGreaterThan(0);
      expect(blue % (b - a), p.content).toBe(0);
      const times = blue / (b - a);
      expect(
        times,
        `${p.content}\n첫 배수가 곧 답이면 굳을 것이 없다`,
      ).toBeGreaterThan(1);
      expect(intsOf(p.answer)[0], p.content).toBe(a * times);
    }
  });

  it("2-6-3 심화상 — 후보 줄에 «더 넣은 뒤»를 대 보아야 하나가 남는다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-6-3", "심화상", seed);
      const f = fracsOf(p.content);
      expect(f.length, p.content).toBe(1);
      const [a, b] = red(f[0]!);
      const add = intsOf(p.content)[0]!;
      const hits: number[] = [];
      for (let k = 1; k <= 12; k += 1)
        if (2 * (a * k + add) === b * k + add) hits.push(k);
      expect(hits.length, p.content).toBe(1);
      const k = hits[0]!;
      expect(
        k,
        `${p.content}\n첫 후보가 곧 답이면 견줄 것이 없다`,
      ).toBeGreaterThan(1);
      expect(intsOf(p.answer)[0], p.content).toBe((b - a) * k);
    }
  });
});
