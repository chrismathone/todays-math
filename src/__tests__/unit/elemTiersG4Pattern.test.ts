/**
 * 초4 1-6 「규칙 찾기」 4단 확대 (D-72) — 다섯 소단원 전부. 초4 1학기 마감분.
 *
 * **참은 발문에서 온다.** 발문에 늘어놓인 항으로 규칙을 **독립 재도출**해 다음 항·빈
 * 항·몇째를 다시 세운다(팀장 지침 2026-08-23) — 생성기의 계산을 되부르지 않는다.
 *
 * **규칙의 유일성이 이 파일의 알맹이다.** 주어진 항들에 {등차 · 등비 · 늘어나는 폭이
 * 커지는 배열} 을 전부 대 보고 **정확히 하나만** 서는지 본다 — 둘 이상이 서면 답이
 * 여럿인 문항이므로 죽는다(g5 inferRel «정확히 하나» 선례).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["1-6-1", "1-6-2", "1-6-3", "1-6-4", "1-6-5"] as const;

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

const ORDINAL = [
  "첫째",
  "둘째",
  "셋째",
  "넷째",
  "다섯째",
  "여섯째",
  "일곱째",
  "여덟째",
  "아홉째",
] as const;

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier: (typeof ELEM_TIERS)[number]) {
  return generateElementaryProblem(unitOf(code), seed, tier);
}

function answerNum(answer: string): number {
  const m = answer.match(/\$(\d+)/);
  expect(m, `정답에서 수를 못 읽음: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** 해설 식 왼쪽 계산 — 곱·나눗셈 먼저(다른 g4 시험과 같은 자). */
function evalLhs(lhs: string): number {
  const toks = lhs.split(/(\\times|\\div|\+|-)/).filter((t) => t !== "");
  const nums: number[] = [Number(toks[0])];
  const ops: string[] = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i]!;
    const v = Number(toks[i + 1]);
    if (op === "\\times") nums[nums.length - 1]! *= v;
    else if (op === "\\div") nums[nums.length - 1]! /= v;
    else {
      ops.push(op);
      nums.push(v);
    }
  }
  let out = nums[0]!;
  for (let i = 0; i < ops.length; i += 1)
    out = ops[i] === "+" ? out + nums[i + 1]! : out - nums[i + 1]!;
  return out;
}

/** 발문에 늘어놓인 KaTeX 낱수(식이 아닌 것)만 차례대로. */
function bareTerms(content: string): number[] {
  return [...content.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
}

/**
 * **쉼표로 이어진 나열**만 뽑는다 — 발문 앞머리의 조건 수(«$L$ 을 넘는»)나 빈칸 표시가
 * 섞이면 규칙 판정이 엉뚱한 수열을 본다(이 시험을 쓰다 실제로 겪었다).
 * `$\square$` 는 「빈 자리」로 남겨 이어짐이 끊기지 않게 한다.
 */
function sequences(content: string): number[][] {
  const out: number[][] = [];
  const re = /\$(?:\d+|\\square)\$(?:\s*,\s*\$(?:\d+|\\square)\$)+/g;
  for (const run of content.match(re) ?? []) {
    const items = run.split(",").map((s) => s.trim().replace(/^\$|\$$/g, ""));
    // 빈 자리에서 끊어 «이어진 조각»들로 나눈다.
    let cur: number[] = [];
    for (const it of items) {
      if (it === "\\square") {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push(Number(it));
    }
    if (cur.length) out.push(cur);
  }
  return out;
}

/* ── 규칙 후보 셋을 독립 재구현한다. 각 판정기는 «이 항들이 그 규칙을 따르는가»만 본다. */
const isArith = (t: number[]) =>
  t.length >= 3 &&
  t.every((v, i) => i === 0 || v - t[i - 1]! === t[1]! - t[0]!);
const isGeo = (t: number[]) =>
  t.length >= 3 &&
  t[0] !== 0 &&
  t[1]! % t[0]! === 0 &&
  t.every((v, i) => i === 0 || v === t[i - 1]! * (t[1]! / t[0]!));
/** 늘어나는 폭이 일정하게 커지는 배열(계단형) — 등차가 아닌 것만 참으로 본다. */
const isStair = (t: number[]) => {
  if (t.length < 3) return false;
  const d = t.slice(1).map((v, i) => v - t[i]!);
  const dd = d.slice(1).map((v, i) => v - d[i]!);
  return dd.length > 0 && dd.every((v) => v === dd[0]) && dd[0] !== 0;
};

/** 이 항들에서 서는 규칙의 수 — 유일성 검사의 열쇠. */
function ruleCount(t: number[]): number {
  return [isArith(t), isGeo(t), isStair(t)].filter(Boolean).length;
}

describe("[초4 4단] 1-6 규칙 찾기 — 다섯 소단원", () => {
  it("다섯 소단원이 네 갈래를 전부 낸다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const a = gen(code, 31337, tier);
        const b = gen(code, 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 셈이 하나도 빠짐없이 실제로 맞는다", () => {
    const bad: string[] = [];
    const eq = /\$([\d+\-\\a-z]+)=(\d+)\$/g;
    const pure = /^\d+(?:(?:\+|-|\\times|\\div)\d+)*$/;
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const m of p.solution.matchAll(eq)) {
            if (!pure.test(m[1]!)) continue;
            const want = evalLhs(m[1]!);
            if (want !== Number(m[2]))
              bad.push(
                `${code} ${tier} seed ${seed}: ${m[1]}=${m[2]} (참 ${want})`,
              );
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("규모가 띠 안이다 — 모든 수가 99000 이하", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          for (const m of all.matchAll(/\d+/g)) {
            if (Number(m[0]) > 99000)
              bad.push(`${code} ${tier} seed ${seed}: ${m[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ① 규칙의 유일성 — 배열 갈래(1-6-1)의 항들에 세 규칙을 전부 대 본다.
  //    둘 이상 서면 답이 여럿이라 문항이 죽는다(반증 가능 형태).
  it("1-6-1 배열은 규칙이 정확히 하나만 선다", () => {
    const bad: string[] = [];
    for (const tier of ELEM_TIERS) {
      for (let seed = 0; seed < 120; seed += 1) {
        const p = gen("1-6-1", seed, tier);
        for (const t of sequences(p.content)) {
          if (t.length < 3) continue;
          const cnt = ruleCount(t);
          if (cnt !== 1)
            bad.push(`${tier} seed ${seed}: ${t.join(",")} — 규칙 ${cnt}가지`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  // 1-6-2 기본은 «폭이 커지는» 가족이라 등차·등비가 아니어야 한다 — 표준(제곱수·등차)과
  //    셋째 가족임을 셀 수 있는 형태로 못 박는다.
  it("1-6-2 기본은 등차도 등비도 아닌 계단형이다", () => {
    for (const seed of SEEDS) {
      const p = gen("1-6-2", seed, "기본");
      const t = bareTerms(p.content).slice(0, 3);
      expect(t.length, p.content).toBe(3);
      expect(isArith(t), `등차로도 읽힌다: ${t.join(",")}`).toBe(false);
      expect(isGeo(t), `등비로도 읽힌다: ${t.join(",")}`).toBe(false);
      expect(isStair(t), `계단형이 아니다: ${t.join(",")}`).toBe(true);
    }
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        expect(
          seen.size,
          `${code} ${tier}: 발문이 ${seen.size}가지뿐이다`,
        ).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("표준·갈래 스물다섯 문항의 발문이 겹치지 않는다 (R5)", () => {
    for (const seed of SEEDS) {
      const all: string[] = [];
      for (const code of CODES) {
        all.push(generateElementaryProblem(unitOf(code), seed).content);
        for (const tier of ELEM_TIERS) all.push(gen(code, seed, tier).content);
      }
      const dup = all.filter((c, i) => all.indexOf(c) !== i);
      expect(dup, `seed ${seed}: ${dup[0] ?? ""}`).toEqual([]);
    }
  });

  it("모든 수가 KaTeX 안에 있다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const [label, text] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (outside)
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 날 숫자 ${outside.join(",")}`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ── 소단원별 독립 재계산 (규칙을 발문에서 다시 세운다)

  it("1-6-1 — 수의 배열 네 갈래의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-6-1", seed, "연산");
      let t = bareTerms(calc.content);
      expect(t.length, calc.content).toBe(4);
      const d = t[1]! - t[0]!;
      expect(d, "줄어드는 배열이어야 한다").toBeLessThan(0);
      expect(answerNum(calc.answer)).toBe(t[3]! + d);

      const basic = gen("1-6-1", seed, "기본");
      const runs = sequences(basic.content);
      expect(runs.length, `빈 자리 앞뒤로 갈려야 한다: ${basic.content}`).toBe(
        2,
      );
      const [before, after] = runs as [number[], number[]];
      expect(before.length, basic.content).toBe(2);
      expect(after.length, basic.content).toBe(2);
      const d2 = before[1]! - before[0]!;
      expect(after[1]! - after[0]!, "앞뒤 공차가 같아야 한다").toBe(d2);
      expect(answerNum(basic.answer)).toBe(before[1]! + d2);
      expect(after[0]! - answerNum(basic.answer), "빈 항이 이어져야 한다").toBe(
        d2,
      );

      const apply = gen("1-6-1", seed, "응용");
      t = bareTerms(apply.content);
      expect(t.length, apply.content).toBe(4);
      if (/여덟째/.test(apply.content)) {
        expect(isArith(t), apply.content).toBe(true);
        expect(answerNum(apply.answer)).toBe(t[0]! + (t[1]! - t[0]!) * 7);
      } else {
        expect(/여섯째/.test(apply.content), apply.content).toBe(true);
        expect(isGeo(t), apply.content).toBe(true);
        expect(answerNum(apply.answer)).toBe(t[0]! * 2 ** 5);
      }

      const deep = gen("1-6-1", seed, "심화");
      let m = deep.content.match(
        /\$(\d+)\$씩 커지는 규칙으로 .*다섯째 수가 \$(\d+)\$[이가]/,
      );
      if (m) {
        deepKinds.add("첫째역산");
        expect(answerNum(deep.answer)).toBe(Number(m[2]) - Number(m[1]) * 4);
      } else {
        deepKinds.add("처음넘는째");
        m = deep.content.match(/처음으로 \$(\d+)\$[을를] 넘는 수는 몇째/);
        expect(m, deep.content).toBeTruthy();
        const L = Number(m![1]);
        const terms = bareTerms(deep.content).slice(1); // 첫 수는 L 이다
        expect(terms.length).toBe(4);
        const step = terms[1]! - terms[0]!;
        // 몇째인지 여기서 직접 센다 — 처음으로 L 을 넘는 자리.
        let k = 1;
        while (terms[0]! + step * (k - 1) <= L) k += 1;
        expect(deep.answer, deep.content).toBe(ORDINAL[k - 1]!);
        // 유일성 — 그 앞자리는 L 이하여야 «처음»이 성립한다.
        expect(terms[0]! + step * (k - 2)).toBeLessThanOrEqual(L);
      }
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-6-2 — 도형의 배열 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-6-2", seed, "연산");
      let t = bareTerms(calc.content);
      expect(t.length, calc.content).toBe(3);
      expect(isArith(t), calc.content).toBe(true);
      expect(answerNum(calc.answer)).toBe(t[1]! - t[0]!);

      const basic = gen("1-6-2", seed, "기본");
      t = bareTerms(basic.content).slice(0, 3);
      const d1 = t[1]! - t[0]!;
      const d2 = t[2]! - t[1]!;
      const fourth = t[2]! + d2 + (d2 - d1);
      const fifth = fourth + d2 + 2 * (d2 - d1);
      expect(answerNum(basic.answer)).toBe(
        /다섯째/.test(basic.content) ? fifth : fourth,
      );

      const apply = gen("1-6-2", seed, "응용");
      t = bareTerms(apply.content);
      expect(t.length, apply.content).toBe(4);
      const step = t[1]! - t[0]!;
      const target = t[3]!;
      expect((target - t[0]!) % step, "몇째가 자연수여야 한다").toBe(0);
      expect(apply.answer).toBe(ORDINAL[(target - t[0]!) / step]!);

      // 심화 — 예전엔 「첫째부터 넷째까지 모두 몇 개」로 **더하기만** 했다. 그런데 응용이
      // 「모형이 $19$개인 것은 몇째」로 **되짚는다** — 사다리가 뒤집혀 있었다.
      // 이제 «누적»을 되짚는다: 합이 주어지고 «몇째까지»를 묻는다.
      const deep = gen("1-6-2", seed, "심화");
      const dt = bareTerms(deep.content);
      t = dt.slice(0, 3);
      const d = t[1]! - t[0]!;
      expect(isArith(t), deep.content).toBe(true);
      const wantSum = dt[3]!;
      let acc = 0;
      let nth = 0;
      while (acc < wantSum && nth < 30) {
        nth += 1;
        acc += t[0]! + d * (nth - 1);
      }
      expect(
        acc,
        `합이 항의 누적으로 딱 떨어지지 않는다: ${deep.content}`,
      ).toBe(wantSum);
      expect(
        nth,
        `되짚을 것이 없다(넷째 미만): ${deep.content}`,
      ).toBeGreaterThan(3);
      expect(deep.answer, deep.content).toBe(ORDINAL[nth - 1]!);
    }
  });

  it("1-6-3 — 계산식 배열 네 갈래의 답을 발문·식에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-6-3", seed, "연산");
      let rows = [...calc.content.matchAll(/\$(\d+)-(\d+)=(\d+)\$/g)].map(
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
      );
      expect(rows.length, calc.content).toBe(2);
      expect(rows[1]![1] - rows[0]![1], "빼는 수가 100씩").toBe(100);
      expect(answerNum(calc.answer)).toBe(rows[1]![2] - 100);

      const basic = gen("1-6-3", seed, "기본");
      rows = [...basic.content.matchAll(/\$(\d+)\+(\d+)=(\d+)\$/g)].map(
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
      );
      expect(rows.length, basic.content).toBe(3);
      const dL = rows[1]![0] - rows[0]![0];
      // 답이 식이다 — 넷째 줄을 여기서 세워 문자열까지 맞댄다.
      const l4 = rows[2]![0] + dL;
      const r4 = rows[2]![1] + dL;
      expect(basic.answer).toBe(`$${l4}+${r4}=${l4 + r4}$`);

      const apply = gen("1-6-3", seed, "응용");
      rows = [...apply.content.matchAll(/\$(\d+)\+(\d+)=(\d+)\$/g)].map(
        (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
      );
      const dS = rows[1]![2] - rows[0]![2];
      expect(dS, "합이 200씩").toBe(200);
      expect(answerNum(apply.answer)).toBe(rows[0]![2] + dS * 5);

      const deep = gen("1-6-3", seed, "심화");
      const m = deep.content.match(/합이 \$(\d+)\$[이가] 되는/);
      expect(m, deep.content).toBeTruthy();
      rows = [...deep.content.matchAll(/\$(\d+)\+(\d+)=(\d+)\$/g)].map(
        (x) => [Number(x[1]), Number(x[2]), Number(x[3])] as const,
      );
      const first = rows[0]![2];
      const gap = rows[1]![2] - first;
      const k = (Number(m![1]) - first) / gap + 1;
      expect(Number.isInteger(k), deep.content).toBe(true);
      expect(deep.answer).toBe(ORDINAL[k - 1]!);
    }
  });

  it("1-6-4 — 규칙적인 계산식 네 갈래의 답을 식에서 다시 구한다", () => {
    const applyFams = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-6-4", seed, "연산");
      let m = calc.content.match(/\$(\d+)\\div(\d+)=(\d+)\$/);
      expect(m, calc.content).toBeTruthy();
      expect(Number(m![1]) / Number(m![2]), calc.content).toBe(Number(m![3]));
      expect(answerNum(calc.answer)).toBe(Number(m![3]) * 100);

      const basic = gen("1-6-4", seed, "기본");
      const sums = [...basic.content.matchAll(/\$(\d+)\+(\d+)=(\d+)\$/g)].map(
        (x) => Number(x[1]) + Number(x[2]),
      );
      expect(sums.length, basic.content).toBeGreaterThanOrEqual(2);
      expect(new Set(sums).size, "합이 변하면 안 된다").toBe(1);
      expect(answerNum(basic.answer)).toBe(sums[0]!);

      // 신기한 계산식 — 빈 식의 좌변을 여기서 직접 계산해 답과 맞댄다(패턴을 믿지 않는다).
      const apply = gen("1-6-4", seed, "응용");
      m = apply.content.match(/\$([\d\\times+]+)=\\square\$/);
      expect(m, apply.content).toBeTruthy();
      expect(answerNum(apply.answer), apply.content).toBe(evalLhs(m![1]!));
      applyFams.add(
        /37/.test(apply.content)
          ? "37"
          : /\\times8/.test(apply.content)
            ? "8"
            : "9",
      );
      // 앞 줄들도 전부 참인 항등식이어야 한다.
      for (const r of apply.content.matchAll(/\$([\d\\times+]+)=(\d+)\$/g)) {
        expect(evalLhs(r[1]!), `${r[1]}=${r[2]}`).toBe(Number(r[2]));
      }

      const deep = gen("1-6-4", seed, "심화");
      m = deep.answer.match(/^\$([\d\\times+]+)=(\d+)\$$/);
      expect(m, deep.answer).toBeTruthy();
      expect(evalLhs(m![1]!), `답의 식이 참이 아니다: ${deep.answer}`).toBe(
        Number(m![2]),
      );
      const want = deep.content.match(/결과가 \$(\d+)\$[이가] 되는/);
      expect(want, deep.content).toBeTruthy();
      expect(Number(m![2]), "구하라는 결과와 답이 어긋난다").toBe(
        Number(want![1]),
      );
    }
    expect(applyFams.size, `응용 가족이 ${[...applyFams]}뿐`).toBe(3);
  });

  it("1-6-5 — 등호 네 갈래의 답을 식에서 다시 구한다", () => {
    const calcAns = new Set<string>();
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-6-5", seed, "연산");
      let m = calc.content.match(/\$(\d+)\+(\d+)=(\d+)\+(\d+)\$/);
      expect(m, calc.content).toBeTruthy();
      const left = Number(m![1]) + Number(m![2]);
      const right = Number(m![3]) + Number(m![4]);
      expect(calc.answer).toBe(left === right ? "예" : "아니요");
      calcAns.add(calc.answer);

      const basic = gen("1-6-5", seed, "기본");
      m = basic.content.match(/\$(\d+)\+(\d+)\+(\d+)=(\d+)\+\\square\$/);
      expect(m, basic.content).toBeTruthy();
      expect(m![1], "양쪽에 같은 수가 있어야 한다").toBe(m![4]);
      expect(answerNum(basic.answer)).toBe(Number(m![2]) + Number(m![3]));

      const apply = gen("1-6-5", seed, "응용");
      m = apply.content.match(/\$(\d+)\+(\d+)=(\d+)\+\\square\$/);
      expect(m, apply.content).toBeTruthy();
      expect(answerNum(apply.answer)).toBe(
        Number(m![1]) + Number(m![2]) - Number(m![3]),
      );

      const deep = gen("1-6-5", seed, "심화");
      m = deep.content.match(/\$(\d+)\+(\d+)=\\square-(\d+)\$/);
      if (m) {
        deepKinds.add("뺄셈건너");
        expect(answerNum(deep.answer)).toBe(
          Number(m[1]) + Number(m[2]) + Number(m[3]),
        );
      } else {
        deepKinds.add("곱셈건너");
        m = deep.content.match(/\$\\square\+(\d+)=(\d+)\\times(\d+)\$/);
        expect(m, deep.content).toBeTruthy();
        const prod = Number(m![2]) * Number(m![3]);
        expect(prod, "왼쪽이 음수가 되면 안 된다").toBeGreaterThan(
          Number(m![1]),
        );
        expect(answerNum(deep.answer)).toBe(prod - Number(m![1]));
      }
    }
    expect(calcAns.size, "연산의 예·아니요가 다 나와야 한다").toBe(2);
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });
});
