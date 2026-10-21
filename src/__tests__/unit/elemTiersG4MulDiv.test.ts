/**
 * 초4 1-3 「곱셈과 나눗셈」 대단원 4단 확대 (D-72) — 일곱 소단원 전부.
 *
 * **참은 발문에서 온다.** 발문의 수를 꺼내 여기서 다시 셈한다.
 *
 * **이름 약속 잠금이 이 파일의 알맹이다** (g3 a42ba6bb 선례): «몇십몇»(일의 자리 ≠ 0)
 * 을 표준까지 같은 잣대로 잠근다 — 수리 전 실측으로 표준 1-3-5 가 씨앗 2000 중 146건,
 * 1-3-6 이 120건에서 나누는 수 20·30 을 냈다. (1)/(2)의 몫 자리 수 약속도 잠근다.
 * 곁들이 둘도 여기서 지킨다: 표준 1-3-3 의 수식-아랫줄 문형, (으)로의 소리 규칙
 * (ㄹ 받침 일·칠·팔은 «로» — 받침표로는 못 정한다).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = [
  "1-3-1",
  "1-3-2",
  "1-3-3",
  "1-3-4",
  "1-3-5",
  "1-3-6",
  "1-3-7",
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

function answerNum(answer: string): number {
  const m = answer.match(/^(?:약 )?\$(\d+)\$/);
  expect(m, `정답이 KaTeX 수로 시작하지 않는다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** 해설 식 왼쪽을 여기서 계산한다 — 곱·나눗셈 먼저(1-1 시험과 같은 자). */
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

/** 십·일의 자리를 바꾼 수 — 심화 «자리 바꿔 잘못 계산» 검산용(독립 재구현). */
const swap2 = (v: number) => (v % 10) * 10 + Math.floor(v / 10);

/** 소단원 띠 상한 — 곱은 다섯 자리(9만)까지, 나눗셈 쪽은 표준 최댓값에 맞춘다. */
const SCALE_CAP: Record<Code, number> = {
  "1-3-1": 90000,
  "1-3-2": 90000,
  "1-3-3": 90000,
  "1-3-4": 25000,
  "1-3-5": 400,
  "1-3-6": 1100,
  "1-3-7": 900,
};

const SOUND_BATCHIM: Record<string, boolean> = {
  "0": true,
  "1": true,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": true,
  "8": true,
  "9": false,
};
const WITH_BATCHIM = new Set(["은", "이", "을", "과"]);
const WITHOUT_BATCHIM = new Set(["는", "가", "를", "와"]);
/** (으)로는 소리표가 따로 있다 — ㄹ 받침(일·칠·팔)은 받침이 있어도 «로»다. */
const RO_FORM: Record<string, string> = {
  "0": "으로",
  "1": "로",
  "2": "로",
  "3": "으로",
  "4": "로",
  "5": "로",
  "6": "으로",
  "7": "로",
  "8": "로",
  "9": "로",
};

describe("[초4 4단] 1-3 곱셈과 나눗셈 — 일곱 소단원", () => {
  it("일곱 소단원이 네 갈래를 전부 낸다", () => {
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

  it("해설의 셈이 하나도 빠짐없이 실제로 맞는다", () => {
    const bad: string[] = [];
    const eq = /\$([\d+\-\\a-z]+)=(\d+)\$/g;
    const pure = /^\d+(?:(?:\+|-|\\times|\\div)\d+)*$/;
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
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

  it("규모가 소단원 띠를 넘지 않는다", () => {
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

  // 이름 약속 ⑴ — «몇십몇»: 1-3-5·1-3-6 의 나누는 수는 일의 자리가 0이 아니다.
  // 표준까지 같은 잣대다(수리 전 실측: 표준이 씨앗 2000 중 146·120건 위반).
  it("1-3-5·1-3-6 의 나누는 수는 표준·갈래 모두 «몇십몇»이다", () => {
    const bad: string[] = [];
    const divisorsOf = (text: string): number[] => {
      const out: number[] = [];
      for (const m of text.matchAll(/\\div(\d+)/g)) out.push(Number(m[1]));
      for (const m of text.matchAll(/\\times\\square/g)) void m; // 곱셈 빈칸의 b 는 아래에서
      const head = text.match(/^\$(\d+)\\times\\square/);
      if (head) out.push(Number(head[1]));
      for (const m of text.matchAll(/\$(\d+)\$(?:으로|로) 나누/g))
        out.push(Number(m[1]));
      for (const m of text.matchAll(/(?:봉지|통|모둠)에 \$(\d+)\$[개명]씩/g))
        out.push(Number(m[1]));
      for (const m of text.matchAll(/하루에 \$(\d+)\$쪽씩/g))
        out.push(Number(m[1]));
      for (const m of text.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$씩/g))
        out.push(Number(m[1]));
      return out;
    };
    for (const code of ["1-3-5", "1-3-6"]) {
      // 표준은 씨앗을 넓게 — 위반이 7% 꼴이라 16개로는 놓칠 수 있다.
      for (let seed = 0; seed < 200; seed += 1) {
        const p = generateElementaryProblem(unitOf(code), seed);
        for (const b of divisorsOf(p.content)) {
          if (b < 11 || b > 99 || b % 10 === 0)
            bad.push(`${code} 표준 seed ${seed}: 나누는 수 ${b}`);
        }
      }
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          // 🔴 **«심화상»은 나누는 수를 일부러 감춘다** (D-113 되짚기 축 — 그 수를
          //    되찾는 것이 문항의 알맹이다). 그러면 발문에는 나누는 수가 없고 **답에**
          //    있다. 약속(«몇십몇»)은 그 수가 어디 적혀 있든 지켜져야 하므로, 감춘
          //    갈래에서만 답을 본다. 나머지 갈래는 여전히 **발문에서** 찾지 못하면 빨강 —
          //    그래야 다른 갈래가 조용히 나누는 수를 지우고 이 검사를 빠져나가지 못한다.
          const hides = tier === "심화상";
          const ds = divisorsOf(p.content);
          const from =
            ds.length > 0
              ? ds
              : hides
                ? [...p.answer.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]))
                : [];
          expect(
            from.length,
            `${code} ${tier} seed ${seed}: ${p.content}`,
          ).toBeGreaterThan(0);
          for (const b of from) {
            if (b < 11 || b > 99 || b % 10 === 0)
              bad.push(`${code} ${tier} seed ${seed}: 나누는 수 ${b}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // 이름 약속 ⑵ — (1)은 몫이 한 자리, (2)는 몫이 두 자리다.
  it("1-3-5 의 몫은 한 자리, 1-3-6 의 몫은 두 자리다", () => {
    for (const seed of SEEDS) {
      for (const tier of ["연산", "기본", "응용"] as const) {
        const p5 = gen("1-3-5", seed, tier);
        expect(
          answerNum(p5.answer),
          `1-3-5 ${tier}: ${p5.answer}`,
        ).toBeLessThan(10);
        const p6 = gen("1-3-6", seed, tier);
        expect(
          answerNum(p6.answer),
          `1-3-6 ${tier}: ${p6.answer}`,
        ).toBeGreaterThanOrEqual(10);
      }
    }
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

  it("모든 수가 KaTeX 안에 있고, 수 뒤 조사·(으)로가 소리와 맞는다", () => {
    const bad: string[] = [];
    const check = (
      where: string,
      p: { content: string; answer: string; solution: string },
    ) => {
      for (const [label, text] of [
        ["발문", p.content],
        ["정답", p.answer],
        ["해설", p.solution],
      ] as const) {
        const outside = text.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
        if (outside)
          bad.push(`${where} ${label}: 날 숫자 ${outside.join(",")}`);
        for (const m of text.matchAll(
          /\$(\d+)\$(은|는|이|가|을|를|과|와)(?![가-힣])/g,
        )) {
          const has = SOUND_BATCHIM[m[1]!.slice(-1)]!;
          const ok = has ? WITH_BATCHIM.has(m[2]!) : WITHOUT_BATCHIM.has(m[2]!);
          if (!ok) bad.push(`${where} ${label}: $${m[1]}$${m[2]} — 조사`);
        }
        for (const m of text.matchAll(/\$(\d+)\$(으로|로)(?![가-힣])/g)) {
          if (RO_FORM[m[1]!.slice(-1)] !== m[2])
            bad.push(`${where} ${label}: $${m[1]}$${m[2]} — (으)로 소리`);
        }
        // 식 뒤 조사는 붙인다(D-164 ①) — 끝을 «□(네모)»로 읽는 식은 받침 없는 조사다.
        if (/\\square\$(을|은|이|과|으로)(?![가-힣])/.test(text))
          bad.push(`${where} ${label}: «□» 뒤 조사 소리`);
      }
    };
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          check(`${code} ${tier} seed ${seed}`, gen(code, seed, tier));
        }
      }
    }
    // 곁들이 잠금 — 표준 1-3-3(수식 아랫줄)과 표준 2-1-1((으)로 소리).
    for (let seed = 0; seed < 100; seed += 1) {
      const std133 = generateElementaryProblem(unitOf("1-3-3"), seed);
      expect(std133.content, `표준 1-3-3 seed ${seed}`).toMatch(
        /구하시오\.\n\n\$/,
      );
      check(
        `표준 2-1-1 seed ${seed}`,
        generateElementaryProblem(unitOf("2-1-1"), seed),
      );
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  // ── 소단원별 독립 재계산

  it("1-3-1 — ×몇십 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-3-1", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$의 \$(\d+)\$배는/);
      expect(m, calc.content).toBeTruthy();
      expect(Number(m![2]) % 10, "몇십이어야 한다").toBe(0);
      expect(answerNum(calc.answer)).toBe(Number(m![1]) * Number(m![2]));

      const basic = gen("1-3-1", seed, "기본");
      m = basic.content.match(
        /\$(\d+)\$[가-힣]+씩 들어 있는 .+ \$(\d+)\$[가-힣]+ 있습니다/,
      );
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(Number(m![1]) * Number(m![2]));

      const apply = gen("1-3-1", seed, "응용");
      m = apply.content.match(
        /한 개에 \$(\d+)\$원인 물건을 \$(\d+)\$개 사고 \$(\d+)\$원을 냈습니다/,
      );
      expect(m, apply.content).toBeTruthy();
      const total = Number(m![1]) * Number(m![2]);
      const pay = Number(m![3]);
      expect(pay, "낸 돈은 물건값보다 커야 한다").toBeGreaterThan(total);
      expect(pay % 10000, "낸 돈은 만원 단위").toBe(0);
      expect(answerNum(apply.answer)).toBe(pay - total);

      const deep = gen("1-3-1", seed, "심화하");
      m = deep.content.match(
        /어떤 수에 \$(\d+)\$[을를] 곱해야 할 것을 잘못하여 더했더니 \$(\d+)\$[이가]/,
      );
      expect(m, deep.content).toBeTruthy();
      expect(answerNum(deep.answer)).toBe(
        (Number(m![2]) - Number(m![1])) * Number(m![1]),
      );
    }
  });

  it("1-3-2 — ×두 자리 네 갈래의 답을 발문에서 다시 구한다 (자리 바꿈 검산)", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-3-2", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$[을를] \$(\d+)\$번 더한 수/);
      expect(m, calc.content).toBeTruthy();
      expect(answerNum(calc.answer)).toBe(Number(m![1]) * Number(m![2]));

      const basic = gen("1-3-2", seed, "기본");
      m = basic.content.match(/\$(\d+)\$개씩 .*\$(\d+)\$일 동안/);
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(Number(m![1]) * Number(m![2]));

      const apply = gen("1-3-2", seed, "응용");
      m = apply.content.match(
        /\$(\d+)\$개씩 들어 있는 클립 \$(\d+)\$상자에서 클립 \$(\d+)\$개를/,
      );
      expect(m, apply.content).toBeTruthy();
      expect(answerNum(apply.answer)).toBe(
        Number(m![1]) * Number(m![2]) - Number(m![3]),
      );

      const deep = gen("1-3-2", seed, "심화하");
      m = deep.content.match(
        /\$(\d+)\$[을를] 곱해야 할 것을 잘못하여 .*바꾼 \$(\d+)\$[을를] 곱했더니 \$(\d+)\$[이가]/,
      );
      expect(m, deep.content).toBeTruthy();
      const b = Number(m![1]);
      const bs = Number(m![2]);
      const wrong = Number(m![3]);
      expect(bs, "자리를 바꾼 수여야 한다").toBe(swap2(b));
      expect(wrong % bs, "잘못 곱한 값이 안 떨어진다").toBe(0);
      expect(answerNum(deep.answer)).toBe((wrong / bs) * b);
    }
  });

  it("1-3-3 — 어림 네 갈래의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-3-3", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$[은는] 몇백에 가장 가깝습니까/);
      expect(m, calc.content).toBeTruthy();
      const a = Number(m![1]);
      expect(a % 100, "경계(…50)면 «가장 가까운»이 안 선다").not.toBe(50);
      expect(answerNum(calc.answer)).toBe(Math.round(a / 100) * 100);

      const basic = gen("1-3-3", seed, "기본");
      m = basic.content.match(/학생 \$(\d+)\$명에게 \$(\d+)\$원짜리/);
      expect(m, basic.content).toBeTruthy();
      const bb = Math.round(Number(m![1]) / 10) * 10;
      const aa = Math.round(Number(m![2]) / 100) * 100;
      expect(basic.answer.startsWith("약 "), basic.answer).toBe(true);
      expect(answerNum(basic.answer)).toBe(aa * bb);

      const apply = gen("1-3-3", seed, "응용");
      m = apply.content.match(/\n\n\$(\d+)\\times(\d+)\$/);
      expect(m, apply.content).toBeTruthy();
      const x = Number(m![1]);
      const y = Number(m![2]);
      const est = Math.round(x / 100) * 100 * (Math.round(y / 10) * 10);
      expect(answerNum(apply.answer)).toBe(Math.abs(est - x * y));

      const deep = gen("1-3-3", seed, "심화하");
      m = deep.content.match(
        /몇백으로 어림하면 \$(\d+)\$[이가] 되는 세 자리 수 중에서 가장 (큰|작은)/,
      );
      expect(m, deep.content).toBeTruthy();
      deepKinds.add(m![2]!);
      const aa2 = Number(m![1]);
      expect(answerNum(deep.answer)).toBe(m![2] === "큰" ? aa2 + 49 : aa2 - 50);
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-3-4 — ÷몇십 네 갈래의 답을 발문에서 다시 구한다", () => {
    const basicKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-3-4", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\$[을를] \$(\d+)\$씩 묶으면/);
      expect(m, calc.content).toBeTruthy();
      expect(Number(m![2]) % 10).toBe(0);
      expect(answerNum(calc.answer)).toBe(Number(m![1]) / Number(m![2]));

      const basic = gen("1-3-4", seed, "기본");
      m = basic.content.match(/색종이 \$(\d+)\$장을 한 명에게 \$(\d+)\$장씩/);
      if (m) {
        basicKinds.add("딱떨어짐");
        expect(answerNum(basic.answer)).toBe(Number(m[1]) / Number(m[2]));
      } else {
        basicKinds.add("남음");
        m = basic.content.match(/귤 \$(\d+)\$개를 한 봉지에 \$(\d+)\$개씩/);
        expect(m, basic.content).toBeTruthy();
        const a = Number(m![1]);
        const b = Number(m![2]);
        const am = basic.answer.match(/^\$(\d+)\$봉지, \$(\d+)\$개$/);
        expect(am, basic.answer).toBeTruthy();
        expect(Number(am![1])).toBe(Math.floor(a / b));
        expect(Number(am![2])).toBe(a % b);
      }

      const apply = gen("1-3-4", seed, "응용");
      m = apply.content.match(/학생 \$(\d+)\$명이 한 대에 \$(\d+)\$명씩/);
      expect(m, apply.content).toBeTruthy();
      const a2 = Number(m![1]);
      const b2 = Number(m![2]);
      expect(a2 % b2, "딱 떨어지면 «적어도»가 안 선다").toBeGreaterThan(0);
      expect(answerNum(apply.answer)).toBe(Math.floor(a2 / b2) + 1);

      const deep = gen("1-3-4", seed, "심화하");
      m = deep.content.match(
        /어떤 수를 \$(\d+)\$(?:으로|로) 나누어야 할 것을 잘못하여 \$(\d+)\$[을를] 곱했더니 \$(\d+)\$[이가]/,
      );
      expect(m, deep.content).toBeTruthy();
      const b3 = Number(m![1]);
      expect(Number(m![2])).toBe(b3);
      const wrong = Number(m![3]);
      expect(wrong % (b3 * b3), "잘못 곱한 값의 짜임이 어긋난다").toBe(0);
      expect(answerNum(deep.answer)).toBe(wrong / b3 / b3);
    }
    expect(basicKinds.size, `기본이 ${[...basicKinds]}뿐`).toBe(2);
  });

  it("1-3-5 — ÷몇십몇(1) 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-3-5", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\\times\\square=(\d+)\$/);
      expect(m, calc.content).toBeTruthy();
      expect(answerNum(calc.answer)).toBe(Number(m![2]) / Number(m![1]));

      const basic = gen("1-3-5", seed, "기본");
      m = basic.content.match(
        /\$(\d+)\\,\\mathrm\{cm\}\$인 색 테이프를 \$(\d+)\\,\\mathrm\{cm\}\$씩/,
      );
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(Number(m![1]) / Number(m![2]));

      const apply = gen("1-3-5", seed, "응용");
      m = apply.content.match(
        /구슬 \$(\d+)\$개 중에서 \$(\d+)\$개를 .*한 통에 \$(\d+)\$개씩/,
      );
      expect(m, apply.content).toBeTruthy();
      expect(answerNum(apply.answer)).toBe(
        (Number(m![1]) - Number(m![2])) / Number(m![3]),
      );

      const deep = gen("1-3-5", seed, "심화하");
      m = deep.content.match(
        /어떤 수를 \$(\d+)\$(?:으로|로) 나누었더니 몫이 \$(\d+)\$, 나머지가 \$(\d+)\$[이가]/,
      );
      expect(m, deep.content).toBeTruthy();
      const b = Number(m![1]);
      const r = Number(m![3]);
      expect(r, "나머지는 나누는 수보다 작다").toBeLessThan(b);
      expect(answerNum(deep.answer)).toBe(b * Number(m![2]) + r);
    }
  });

  it("1-3-6 — ÷몇십몇(2) 네 갈래의 답을 발문에서 다시 구한다 (잘못 나눔 복원 검산)", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-3-6", seed, "연산");
      let m = calc.content.match(/^\$(\d+)\\div(\d+)\$의 몫을 구하시오/);
      expect(m, calc.content).toBeTruthy();
      expect(Number(m![1]) % Number(m![2]), "연산은 딱 떨어져야 한다").toBe(0);
      expect(answerNum(calc.answer)).toBe(Number(m![1]) / Number(m![2]));

      const basic = gen("1-3-6", seed, "기본");
      m = basic.content.match(/사탕 \$(\d+)\$개를 한 봉지에 \$(\d+)\$개씩/);
      expect(m, basic.content).toBeTruthy();
      expect(answerNum(basic.answer)).toBe(Number(m![1]) / Number(m![2]));

      const apply = gen("1-3-6", seed, "응용");
      m = apply.content.match(/동화책 \$(\d+)\$쪽을 하루에 \$(\d+)\$쪽씩/);
      expect(m, apply.content).toBeTruthy();
      const a = Number(m![1]);
      const b = Number(m![2]);
      expect(a % b).toBeGreaterThan(0);
      expect(answerNum(apply.answer)).toBe(Math.floor(a / b) + 1);

      const deep = gen("1-3-6", seed, "심화하");
      m = deep.content.match(
        /어떤 수를 \$(\d+)\$(?:으로|로) 나누어야 할 것을 잘못하여 .*바꾼 \$(\d+)\$(?:으로|로) 나누었더니 몫이 \$(\d+)\$, 나머지가 \$(\d+)\$[이가]/,
      );
      expect(m, deep.content).toBeTruthy();
      const db = Number(m![1]);
      const dbs = Number(m![2]);
      expect(dbs, "자리를 바꾼 수여야 한다").toBe(swap2(db));
      const x = dbs * Number(m![3]) + Number(m![4]);
      const am = deep.answer.match(/^몫 \$(\d+)\$, 나머지 \$(\d+)\$$/);
      expect(am, deep.answer).toBeTruthy();
      expect(Number(am![1])).toBe(Math.floor(x / db));
      expect(Number(am![2])).toBe(x % db);
    }
  });

  // 잘못 나눈 쪽이 나누어떨어지면 «나머지가 $0$» 이 지면에 나간다 — 초등 표현이 아니다
  // (팀장 검수 2026-08-23: 보정 전 씨앗 3000 중 89건). 3% 꼴이라 씨앗을 넓게 쓴다.
  it("1-3-6 심화의 잘못 나눈 나머지는 0 이 아니다 (씨앗 200)", () => {
    const bad: string[] = [];
    for (let seed = 0; seed < 200; seed += 1) {
      const p = gen("1-3-6", seed, "심화하");
      const m = p.content.match(/나머지가 \$(\d+)\$[이가]/);
      expect(m, p.content).toBeTruthy();
      if (Number(m![1]) < 1) bad.push(`seed ${seed}: ${p.content}`);
    }
    expect(bad.slice(0, 4)).toEqual([]);
  });

  it("1-3-7 — 나눗셈 어림 네 갈래의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-3-7", seed, "연산");
      let m = calc.content.match(/나누는 수 \$(\d+)\$[을를] 몇십으로/);
      expect(m, calc.content).toBeTruthy();
      const b = Number(m![1]);
      expect(b % 10, "어림할 것이 남아야 한다").not.toBe(0);
      expect(answerNum(calc.answer)).toBe(Math.round(b / 10) * 10);

      const basic = gen("1-3-7", seed, "기본");
      m = basic.content.match(/귤 \$(\d+)\$개를 한 봉지에 \$(\d+)\$개씩/);
      expect(m, basic.content).toBeTruthy();
      const bb = Math.round(Number(m![2]) / 10) * 10;
      expect(Number(m![1]) % bb, "어림 몫이 딱 떨어지게 구성한다").toBe(0);
      expect(answerNum(basic.answer)).toBe(Number(m![1]) / bb);

      const apply = gen("1-3-7", seed, "응용");
      m = apply.content.match(/가 \$(\d+)\\div(\d+)\$ +나 \$(\d+)\\div(\d+)\$/);
      expect(m, apply.content).toBeTruthy();
      const k1 = Number(m![1]) / (Math.round(Number(m![2]) / 10) * 10);
      const k2 = Number(m![3]) / (Math.round(Number(m![4]) / 10) * 10);
      expect(Number.isInteger(k1) && Number.isInteger(k2), apply.content).toBe(
        true,
      );
      expect(k1, "어림 몫이 같으면 답이 없다").not.toBe(k2);
      expect(apply.answer).toBe(k1 > k2 ? "가" : "나");

      const deep = gen("1-3-7", seed, "심화하");
      m = deep.content.match(
        /몇십으로 어림하면 \$(\d+)\$[이가] 되는 두 자리 수/,
      );
      if (m) {
        deepKinds.add("원상");
        const t = Number(m[1]);
        expect(deep.answer).toBe(`$${t - 5}$, $${t + 4}$`);
      } else {
        // 예전 갈래는 「$85$는 몇십으로 어림하면 $80$이 되는가? 예/아니요」였다 —
        // **한 걸음 판정이고 찍어도 절반이 맞는다.** 이제 어림한 몫과 실제 몫을 둘 다 구한다.
        deepKinds.add("어림몫과 실제몫의 차");
        m = deep.content.match(
          /^\$(\d+)\\div(\d+)\$에서 나누는 수를 몇십으로 어림하여 몫을 어림했습니다/,
        );
        expect(m, deep.content).toBeTruthy();
        const a = Number(m![1]);
        const b = Number(m![2]);
        const rounded = Math.round(b / 10) * 10;
        expect(
          rounded,
          `몇십으로 어림한 값이 $0$ 이다: ${deep.content}`,
        ).toBeGreaterThan(0);
        expect(
          a % rounded,
          `어림한 몫이 자연수여야 한다: ${deep.content}`,
        ).toBe(0);
        expect(answerNum(deep.answer), deep.content).toBe(
          Math.abs(a / rounded - Math.floor(a / b)),
        );
      }
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });
});
