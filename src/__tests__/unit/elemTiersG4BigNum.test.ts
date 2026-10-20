/**
 * 초4 1-1 「큰 수」 대단원 4단 확대 (D-72) — 일곱 소단원 전부.
 *
 * **참은 발문·그림에서 온다.** 발문에 찍힌 수(그리고 1-1-2 응용의 카드 그림)를 꺼내
 * 여기서 다시 셈한다 — 생성기의 계산을 되부르지 않는다.
 *
 * **규모 가드가 이 파일의 알맹이 하나다.** 「숫자 규모를 키우는 축은 다양성이 아니다」
 * (원장님 문항 다양성 원칙) — 이 단원은 자릿수가 교과 내용이라, 소단원마다 허용 띠를
 * 상한으로 잠근다. 4단이라고 자릿수를 키우면 여기서 빨개진다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = [
  "1-1-1",
  "1-1-2",
  "1-1-3",
  "1-1-4",
  "1-1-5",
  "1-1-6",
  "1-1-7",
] as const;
type Code = (typeof CODES)[number];

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);

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

/** `$55$원`·`$3$억`·`$10000$씩`·`$400$` 류에서 맨 앞의 수 하나. */
function answerNum(answer: string): number {
  const m = answer.match(/^\$(\d+)\$/);
  expect(m, `정답이 KaTeX 수로 시작하지 않는다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/**
 * 해설 식(`$A+B\times C=D$`)의 왼쪽을 **여기서** 계산한다 — 곱·나눗셈 먼저.
 * 지면 식엔 괄호가 없으므로 이 우선순위 규칙이 전부다.
 */
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

/** 소단원이 허용하는 수의 상한 — 자릿수 자체가 교과 내용인 단원의 띠(위 머리말). */
const SCALE_CAP: Record<Code, number> = {
  "1-1-1": 10000,
  "1-1-2": 99999,
  "1-1-3": 90000000,
  "1-1-4": 999999999,
  "1-1-5": 9999999999999,
  "1-1-6": 1500000,
  "1-1-7": 99999,
};

/**
 * 수 뒤 조사의 **소리 검산** — 「4」는 «사»라 받침이 없고 「8」은 «팔»이라 있다.
 * 표는 소리 규칙에서 독립으로 다시 적는다(생성기의 표를 믿지 않는다).
 */
const SOUND_BATCHIM: Record<string, boolean> = {
  "0": true, // 영
  "1": true, // 일
  "2": false, // 이
  "3": true, // 삼
  "4": false, // 사
  "5": false, // 오
  "6": true, // 육
  "7": true, // 칠
  "8": true, // 팔
  "9": false, // 구
};
const WITH_BATCHIM = new Set(["은", "이", "을", "과"]);
const WITHOUT_BATCHIM = new Set(["는", "가", "를", "와"]);

describe("[초4 4단] 1-1 큰 수 — 일곱 소단원", () => {
  it("일곱 소단원이 핵심 갈래를 전부 낸다", () => {
    for (const code of CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const a = gen(code, 31337, tier);
        const b = gen(code, 31337, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  it("해설의 셈이 하나도 빠짐없이 실제로 맞는다 (곱셈 먼저 계산)", () => {
    const bad: string[] = [];
    const eq = /\$([\d+\-\\a-z]+)=(\d+)\$/g;
    const pure = /^\d+(?:(?:\+|-|\\times|\\div)\d+)*$/;
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const m of p.solution.matchAll(eq)) {
            if (!pure.test(m[1]!)) continue; // \square 등 산술식이 아닌 것
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

  it("규모가 소단원 띠를 넘지 않는다 — 난이도가 자릿수를 키우면 빨개진다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const cap = SCALE_CAP[code];
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          for (const m of all.matchAll(/\d+/g)) {
            if (Number(m[0]) > cap)
              bad.push(`${code} ${tier} seed ${seed}: ${m[0]} > ${cap}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("갈래마다 씨앗 16개에서 서로 다른 발문이 8개 이상이다 (변형 8+)", () => {
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        expect(
          seen.size,
          `${code} ${tier}: 발문이 ${seen.size}가지뿐이다`,
        ).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("표준·갈래 서른다섯 문항의 발문이 겹치지 않는다 (R5)", () => {
    for (const seed of SEEDS) {
      const all: string[] = [];
      for (const code of CODES) {
        all.push(generateElementaryProblem(unitOf(code), seed).content);
        for (const tier of tiersOf(unitOf(code)))
          all.push(gen(code, seed, tier).content);
      }
      const dup = all.filter((c, i) => all.indexOf(c) !== i);
      expect(dup, `seed ${seed}: ${dup[0] ?? ""}`).toEqual([]);
    }
  });

  it("모든 수가 KaTeX 안에 있고, 수 뒤 조사가 소리와 맞는다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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
            // 수 바로 뒤 조사 — 끝 숫자의 소리로 검산한다. 뒤에 한글이 이어지는 것은
            // 조사가 아니라 계사 활용(「$5$이므로」·「$5$이고」)이므로 뺀다.
            for (const m of text.matchAll(
              /\$(\d+)\$(은|는|이|가|을|를|과|와)(?![가-힣])/g,
            )) {
              const has = SOUND_BATCHIM[m[1]!.slice(-1)]!;
              const ok = has
                ? WITH_BATCHIM.has(m[2]!)
                : WITHOUT_BATCHIM.has(m[2]!);
              if (!ok)
                bad.push(
                  `${code} ${tier} seed ${seed} ${label}: $${m[1]}$${m[2]} — 소리와 안 맞는 조사`,
                );
            }
            // (으)로는 ㄹ 받침 예외가 있어 소리표로 못 가른다 — 아예 쓰지 않는다.
            if (/\$\d+\$(으로|로)(?![가-힣])/.test(text))
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: 수 뒤 (으)로 — 쓰지 말 것`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ── 소단원별 독립 재계산 (참은 발문에서)

  it("1-1-1 — 네 갈래의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    const calcKinds = new Set<string>();
    const applyKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-1-1", seed, "연산");
      let m = calc.content.match(/^\$10000\$은 \$(\d+)\$보다 얼마나 큰 수입니까/);
      if (m) {
        calcKinds.add("보다");
        expect(answerNum(calc.answer), calc.content).toBe(10000 - Number(m[1]));
      } else {
        m = calc.content.match(/^\$10000\$은 \$(10|100)\$이 몇 개인 수입니까/);
        expect(m, `연산 발문 꼴이 아니다: ${calc.content}`).toBeTruthy();
        calcKinds.add("몇개");
        expect(answerNum(calc.answer)).toBe(10000 / Number(m![1]));
      }

      const basic = gen("1-1-1", seed, "기본");
      m = basic.content.match(/\$(1000|100|10)\$[가-힣]*씩? ?/);
      expect(m, basic.content).toBeTruthy();
      const bm = basic.content.match(/\$1000\$[개장]씩 \$(\d)\$묶음/);
      if (bm) {
        expect(answerNum(basic.answer), basic.content).toBe(
          1000 * Number(bm[1]),
        );
      } else {
        // 동전 두 벌 — 100원×100개 또는 10원×1000개, 답은 늘 10000원.
        expect(
          /\$100\$원짜리 동전 \$100\$개|\$10\$원짜리 동전 \$1000\$개/.test(
            basic.content,
          ),
          basic.content,
        ).toBe(true);
        expect(basic.answer).toBe("$10000$원");
      }

      const apply = gen("1-1-1", seed, "응용");
      const am = apply.content.match(
        /\$1000\$원짜리 지폐 \$(\d)\$장과 \$100\$원짜리 동전 \$(\d+)\$개/,
      );
      if (am) {
        applyKinds.add("조합");
        expect(1000 * Number(am[1]) + 100 * Number(am[2])).toBe(10000);
        expect(apply.answer).toBe("$10000$원");
      } else {
        applyKinds.add("모자람");
        const m2 = apply.content.match(/지폐가 \$(\d)\$장 있습니다/);
        expect(m2, apply.content).toBeTruthy();
        expect(answerNum(apply.answer)).toBe(10 - Number(m2![1]));
      }

      // 심화 — 응용을 **거꾸로** 돌린다. ⓐ 지폐 몫을 만들고 남은 돈을 동전 수로 되짚는다.
      // ⓑ 자릿값으로 한 수를 세운 뒤 $10000$ 까지 모자란 몫을 구한다. 둘 다 두 걸음이다.
      const deep = gen("1-1-1", seed, "심화하");
      const coin = deep.content.match(
        /^\$1000\$원짜리 지폐 \$(\d)\$장과 \$100\$원짜리 동전을 모았더니 \$10000\$원이 되었습니다/,
      );
      if (coin) {
        deepKinds.add("동전 되짚기");
        const rest = 10000 - 1000 * Number(coin[1]);
        expect(rest, deep.content).toBeGreaterThan(0);
        expect(rest % 100, deep.content).toBe(0);
        expect(answerNum(deep.answer), deep.content).toBe(rest / 100);
      } else {
        deepKinds.add("모자란 몫");
        const dm = deep.content.match(
          /^\$1000\$이 \$(\d)\$개인 수보다 \$(\d+)\$ 큰 수가 있습니다/,
        );
        expect(dm, deep.content).toBeTruthy();
        const base = 1000 * Number(dm![1]) + Number(dm![2]);
        expect(base, deep.content).toBeLessThan(10000);
        expect(answerNum(deep.answer), deep.content).toBe(10000 - base);
      }
    }
    expect(calcKinds.size, `연산이 ${[...calcKinds]}뿐`).toBe(2);
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-1-2 — 조립·문장·카드·조건의 답을 발문(그림)에서 다시 구한다", () => {
    const applyKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-1-2", seed, "연산");
      const parts = [...calc.content.matchAll(/\$(\d+)\$이 \$(\d)\$개/g)];
      expect(parts.length, calc.content).toBeGreaterThanOrEqual(1);
      const sum = parts.reduce((a, m) => a + Number(m[1]) * Number(m[2]), 0);
      expect(answerNum(calc.answer), calc.content).toBe(sum);

      const basic = gen("1-1-2", seed, "기본");
      const bm = basic.content.match(
        /\$10000\$[개장]씩 [가-힣]+ \$(\d)\$개에, \$1000\$[개장]씩 [가-힣]+ \$(\d)\$개에/,
      );
      expect(bm, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(
        10000 * Number(bm![1]) + 1000 * Number(bm![2]),
      );

      const apply = gen("1-1-2", seed, "응용");
      const spec = apply.figureSpec as { kind: string; cards: string[] };
      expect(spec.kind).toBe("numberCards");
      const cards = spec.cards.map(Number);
      expect(new Set(cards).size, "카드가 겹친다").toBe(5);
      // 발문의 카드 나열과 그림이 같은 패다.
      const inText = [...apply.content.matchAll(/\$(\d)\$/g)].map((m) =>
        Number(m[1]),
      );
      expect([...inText].sort(), apply.content).toEqual([...cards].sort());
      const wantBig = /가장 큰/.test(apply.content);
      applyKinds.add(wantBig ? "큰" : "작은");
      const asc = [...cards].sort((x, y) => x - y);
      const best = wantBig
        ? Number([...cards].sort((x, y) => y - x).join(""))
        : Number((asc[0] === 0 ? [asc[1]!, 0, ...asc.slice(2)] : asc).join(""));
      expect(answerNum(apply.answer), apply.content).toBe(best);
      // 그림이 답의 배열 그대로면 그림이 답을 말한다(D-66 ⑺).
      expect(spec.cards.join("")).not.toBe(String(best));

      const deep = gen("1-1-2", seed, "심화하");
      const dm = deep.content.match(
        /만의 자리 숫자가 \$(\d)\$, 백의 자리 숫자가 \$(\d)\$인 .*가장 (큰|작은)/,
      );
      expect(dm, deep.content).toBeTruthy();
      const s = String(answerNum(deep.answer));
      expect(s.length, deep.content).toBe(5);
      expect(s[0]).toBe(dm![1]);
      expect(s[2]).toBe(dm![2]);
      const rest = dm![3] === "큰" ? "9" : "0";
      expect(s[1]).toBe(rest);
      expect(s[3]).toBe(rest);
      expect(s[4]).toBe(rest);
    }
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
  });

  it("1-1-3 — 교차 단위·돈·다발·역산의 답을 발문에서 다시 구한다", () => {
    const applyKinds = new Set<string>();
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-1-3", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$은 \$1000\$이 몇 개/);
      expect(m, calc.content).toBeTruthy();
      expect(answerNum(calc.answer)).toBe(Number(m![1]) / 1000);

      const basic = gen("1-1-3", seed, "기본");
      m = basic.content.match(/지폐가 \$(\d+)\$장/);
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(10000 * Number(m![1]));

      const apply = gen("1-1-3", seed, "응용");
      m = apply.content.match(/\$100\$장씩 묶은 다발이 \$(\d)\$개/);
      if (m) {
        applyKinds.add("다발");
        expect(answerNum(apply.answer)).toBe(1000000 * Number(m[1]));
      } else {
        applyKinds.add("혼합조립");
        m = apply.content.match(
          /^\$10000\$이 \$(\d+)\$개, \$1000\$이 \$(\d)\$개인 수를 쓰시오/,
        );
        expect(m, apply.content).toBeTruthy();
        expect(answerNum(apply.answer)).toBe(
          10000 * Number(m![1]) + 1000 * Number(m![2]),
        );
      }

      // 심화 — 자릿값을 **둘** 겹친다. 예전엔 환산 한 번이라 응용과 무게가 같았다.
      const deep = gen("1-1-3", seed, "심화하");
      m = deep.content.match(
        /^\$10000\$이 \$(\d+)\$개, \$1000\$이 \$(\d)\$개인 수는 \$100\$이 모두 몇 개/,
      );
      if (m) {
        deepKinds.add("두 자리 → 백");
        expect(answerNum(deep.answer), deep.content).toBe(
          100 * Number(m[1]) + 10 * Number(m[2]),
        );
      } else {
        deepKinds.add("백 → 두 자리 되짚기");
        m = deep.content.match(
          /^\$100\$이 \$(\d+)\$개인 수는 \$10000\$이 \$(\d+)\$개, \$1000\$이 몇 개/,
        );
        expect(m, deep.content).toBeTruthy();
        const rest = 100 * Number(m![1]) - 10000 * Number(m![2]);
        expect(rest, deep.content).toBeGreaterThan(0);
        expect(rest % 1000, deep.content).toBe(0);
        expect(answerNum(deep.answer), deep.content).toBe(rest / 1000);
      }
    }
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-1-4 — 억 단위 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-1-4", seed, "연산");
      let m = calc.content.match(/^\$1\$억은 \$(\d+)\$만보다/);
      expect(m, calc.content).toBeTruthy();
      expect(calc.answer).toBe(`$${10000 - Number(m![1])}$만`);

      const basic = gen("1-1-4", seed, "기본");
      m = basic.content.match(/^\$(\d)\$억 \$(\d+)\$만인 수를 숫자로/);
      if (m) {
        expect(answerNum(basic.answer)).toBe(
          Number(m[1]) * 100000000 + Number(m[2]) * 10000,
        );
      } else {
        m = basic.content.match(/^\$(\d+)\$은 몇 억 몇 만입니까/);
        expect(m, basic.content).toBeTruthy();
        const v = Number(m![1]);
        expect(v % 10000, "만 아래 자리가 남는다").toBe(0);
        expect(basic.answer).toBe(
          `$${Math.floor(v / 100000000)}$억 $${(v % 100000000) / 10000}$만`,
        );
      }

      const apply = gen("1-1-4", seed, "응용");
      m = apply.content.match(/^\$1\$억이 \$(\d)\$개, \$1000\$만이 \$(\d)\$개/);
      if (m) {
        expect(answerNum(apply.answer)).toBe(
          Number(m[1]) * 100000000 + Number(m[2]) * 10000000,
        );
      } else {
        m = apply.content.match(/수표 \$(\d+)\$장/);
        expect(m, apply.content).toBeTruthy();
        expect(answerNum(apply.answer)).toBe(Number(m![1]) * 10000000);
      }

      const deep = gen("1-1-4", seed, "심화하");
      m = deep.content.match(/\$1000\$만이 \$(\d)\$개 늘어나면 \$(\d)\$억/);
      if (m) {
        expect(answerNum(deep.answer)).toBe(
          Number(m[2]) * 100000000 - Number(m[1]) * 10000000,
        );
      } else {
        // **두 몫을 더한 뒤** 자리를 옮긴다 — 예전 「만이 $30000$개인 수는 몇 억」은
        // 나눗셈 한 번이라 응용(수표 $29$장)보다 쉬웠다.
        m = deep.content.match(
          /^\$1000\$만이 \$(\d+)\$개인 수보다 \$1000\$만이 \$(\d+)\$개 더 큰 수는 몇 억/,
        );
        expect(m, deep.content).toBeTruthy();
        const cnt = Number(m![1]) + Number(m![2]);
        expect(cnt % 10, `억으로 딱 떨어져야 한다: ${deep.content}`).toBe(0);
        expect(deep.answer, deep.content).toBe(`$${cnt / 10}$억`);
      }
    }
  });

  it("1-1-5 — 조 단위 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-1-5", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$억보다 \$(\d+)\$억 큰 수는 몇 조/);
      expect(m, calc.content).toBeTruthy();
      const total = Number(m![1]) + Number(m![2]);
      expect(total % 10000, "조로 딱 떨어져야 한다").toBe(0);
      expect(calc.answer).toBe(`$${total / 10000}$조`);

      const basic = gen("1-1-5", seed, "기본");
      m = basic.content.match(/예산은 \$(\d)\$조 \$(\d+)\$억 원/);
      if (m) {
        expect(answerNum(basic.answer)).toBe(
          Number(m[1]) * 1000000000000 + Number(m[2]) * 100000000,
        );
      } else {
        m = basic.content.match(/^\$(\d+)\$은 몇 조 몇 억/);
        expect(m, basic.content).toBeTruthy();
        const v = Number(m![1]);
        expect(v % 100000000).toBe(0);
        expect(basic.answer).toBe(
          `$${Math.floor(v / 1000000000000)}$조 $${(v % 1000000000000) / 100000000}$억`,
        );
      }

      const apply = gen("1-1-5", seed, "응용");
      m = apply.content.match(/^\$1000\$억이 \$(\d+)\$개인 수는 몇 조 몇 억/);
      if (m) {
        const cnt = Number(m[1]);
        expect(apply.answer).toBe(
          `$${Math.floor(cnt / 10)}$조 $${(cnt % 10) * 1000}$억`,
        );
      } else {
        m = apply.content.match(/^\$(\d)\$조 \$(\d+)\$억은 \$1000\$억이 몇 개/);
        expect(m, apply.content).toBeTruthy();
        expect(Number(m![2]) % 1000).toBe(0);
        expect(answerNum(apply.answer)).toBe(
          Number(m![1]) * 10 + Number(m![2]) / 1000,
        );
      }

      const deep = gen("1-1-5", seed, "심화하");
      m = deep.content.match(
        /\$1000\$억이 \$(\d)\$개 줄었더니 \$(\d)\$조 \$(\d+)\$억이 되었습니다/,
      );
      if (m) {
        const target =
          Number(m[2]) * 1000000000000 + (Number(m[3]) / 1000) * 100000000000;
        expect(answerNum(deep.answer)).toBe(
          target + Number(m[1]) * 100000000000,
        );
      } else {
        // 1-1-4 와 나란한 구조 — 자리만 조(兆)로 올렸다.
        m = deep.content.match(
          /^\$1000\$억이 \$(\d+)\$개인 수보다 \$1000\$억이 \$(\d+)\$개 더 큰 수는 몇 조/,
        );
        expect(m, deep.content).toBeTruthy();
        const cnt = Number(m![1]) + Number(m![2]);
        expect(cnt % 10, `조로 딱 떨어져야 한다: ${deep.content}`).toBe(0);
        expect(deep.answer, deep.content).toBe(`$${cnt / 10}$조`);
      }
    }
  });

  it("1-1-6 — 뛰어 세기 네 갈래의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-1-6", seed, "연산");
      let m = calc.content.match(
        /쓰면 \$(\d+)\$, \$(\d+)\$, \$(\d+)\$, \$(\d+)\$입니다/,
      );
      expect(m, calc.content).toBeTruthy();
      const seq = [1, 2, 3, 4].map((i) => Number(m![i]));
      const step = seq[1]! - seq[0]!;
      expect(seq[2]! - seq[1]!, "걸음이 고르지 않다").toBe(step);
      expect(seq[3]! - seq[2]!, "걸음이 고르지 않다").toBe(step);
      expect(calc.answer).toBe(`$${step}$씩`);

      const basic = gen("1-1-6", seed, "기본");
      m = basic.content.match(
        /저금통에 \$(\d+)\$원.*매달 \$(\d+)\$원씩.*\$(\d)\$달 뒤/,
      );
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(
        Number(m![1]) + Number(m![2]) * Number(m![3]),
      );

      const apply = gen("1-1-6", seed, "응용");
      m = apply.content.match(
        /^\$(\d+)\$에서 \$(\d+)\$씩 \$(\d)\$번 뛰어 센 다음, 이어서 \$(\d+)\$씩 \$(\d)\$번/,
      );
      expect(m, apply.content).toBeTruthy();
      const mid = Number(m![1]) + Number(m![2]) * Number(m![3]);
      expect(answerNum(apply.answer)).toBe(mid + Number(m![4]) * Number(m![5]));
      // 중간값이 해설에 실제로 있어야 「두 단계」다.
      expect(apply.solution, `중간값 ${mid} 이 해설에 없다`).toContain(
        `=${mid}$`,
      );

      const deep = gen("1-1-6", seed, "심화하");
      m = deep.content.match(
        /어떤 수에서 \$(\d+)\$씩 \$(\d)\$번 뛰어 세어야 할 것을 잘못하여 \$(\d+)\$씩 \$(\d)\$번 뛰어 세었더니 \$(\d+)\$/,
      );
      if (m) {
        deepKinds.add("잘못");
        expect(m[2], "두 횟수는 같아야 한다").toBe(m[4]);
        const start = Number(m[5]) - Number(m[3]) * Number(m[2]);
        expect(answerNum(deep.answer)).toBe(
          start + Number(m[1]) * Number(m[2]),
        );
      } else {
        deepKinds.add("몇씩");
        m = deep.content.match(
          /^\$(\d+)\$에서 \$(\d)\$번 뛰어 세었더니 \$(\d+)\$[이가]/,
        );
        expect(m, deep.content).toBeTruthy();
        const diff = Number(m![3]) - Number(m![1]);
        expect(diff % Number(m![2]), "걸음이 자연수가 아니다").toBe(0);
        expect(deep.answer).toBe(`$${diff / Number(m![2])}$씩`);
      }
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-1-7 — 비교 네 갈래의 답을 발문에서 다시 구한다 (□는 전수 대입)", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-1-7", seed, "연산");
      let m = calc.content.match(/^두 수 \$(\d+)\$, \$(\d+)\$ 중 더 (큰|작은)/);
      expect(m, calc.content).toBeTruthy();
      const pair = [Number(m![1]), Number(m![2])];
      const lens = pair.map((v) => String(v).length).sort();
      expect(lens, "자리 수가 달라야 한다").toEqual([4, 5]);
      expect(answerNum(calc.answer)).toBe(
        m![3] === "큰" ? Math.max(...pair) : Math.min(...pair),
      );

      const basic = gen("1-1-7", seed, "기본");
      m = basic.content.match(
        /^세 수 \$(\d+)\$, \$(\d+)\$, \$(\d+)\$ 중 가장 (큰|작은)/,
      );
      expect(m, basic.content).toBeTruthy();
      const three = [1, 2, 3].map((i) => Number(m![i]));
      expect(answerNum(basic.answer)).toBe(
        m![4] === "큰" ? Math.max(...three) : Math.min(...three),
      );

      const apply = gen("1-1-7", seed, "응용");
      m = apply.content.match(
        /^\$(\d)\$만 \$(\d+)\$인 수와 \$(\d+)\$ 중 더 큰/,
      );
      expect(m, apply.content).toBeTruthy();
      const a = Number(m![1]) * 10000 + Number(m![2]);
      expect(answerNum(apply.answer)).toBe(Math.max(a, Number(m![3])));

      // □ 부등식 — 발문의 식을 그대로 읽어 0~9 를 전수 대입한다.
      const deep = gen("1-1-7", seed, "심화하");
      m = deep.content.match(/\$(\d*)\\square(\d*)(<|>)(\d+)\$/);
      expect(m, deep.content).toBeTruthy();
      const numB = Number(m![4]);
      const count = Array.from({ length: 10 }, (_, x) => x).filter((x) => {
        const v = Number(`${m![1]}${x}${m![2]}`);
        return m![3] === "<" ? v < numB : v > numB;
      }).length;
      expect(count, deep.content).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(9);
      expect(answerNum(deep.answer), deep.content).toBe(count);
    }
  });

  // 카드 그림이 실제로 그려진다 — 발문이 「숫자 카드」를 가리키므로 그림이 없으면 거짓말이다.
  it("1-1-2 응용의 숫자 카드가 실제로 그려진다", async () => {
    const bad: string[] = [];
    for (const seed of SEEDS.slice(0, 4)) {
      const p = gen("1-1-2", seed, "응용");
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) bad.push(`씨앗 ${seed}: ${r.error}`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
