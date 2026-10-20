/**
 * 초4 1-2 「각도」 대단원 4단 확대 (D-72) — 여섯 소단원 전부.
 *
 * **참은 발문에서 온다.** 발문의 각도·시각·등분 수를 꺼내 여기서 다시 셈한다.
 * 경계 둘은 팀장 지침(2026-08-23)이다:
 *  · 시계 갈래의 시각은 6시(평각 180°)·12시(0°)를 내지 않는다 — 작은 쪽 각이
 *    0° 초과 180° 미만임을 잠근다.
 *  · 「삼각형을 그릴 수 있는가」의 «아니요» 표본은 합이 180°에서 10° 이상 벗어난다
 *    (179°·181° 같은 한 끗 차 금지).
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["1-2-1", "1-2-2", "1-2-3", "1-2-4", "1-2-5", "1-2-6"] as const;

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

/** `$48^\circ$` 에서 수를 꺼낸다. */
function answerDeg(answer: string): number {
  const m = answer.match(/^\$(\d+)\^\\circ\$$/);
  expect(m, `정답이 도(°) 꼴이 아니다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** `$6$`·`$70$` 맨 수 답. */
function answerNum(answer: string): number {
  const m = answer.match(/^\$(\d+)\$$/);
  expect(m, `정답이 KaTeX 수가 아니다: ${answer}`).toBeTruthy();
  return Number(m![1]);
}

/** 발문·해설의 도(°) 값을 나온 차례로. */
function degsOf(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) => Number(m[1]));
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

describe("[초4 4단] 1-2 각도 — 여섯 소단원", () => {
  it("여섯 소단원이 핵심 갈래를 전부 낸다", () => {
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

  it("각도 띠 — 모든 수가 360 이하이고, 도(°) 값은 0 초과 360 미만이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          for (const m of all.matchAll(/\d+/g)) {
            if (Number(m[0]) > 360)
              bad.push(`${code} ${tier} seed ${seed}: ${m[0]} > 360`);
          }
          // 360° 는 네 각의 합 서술(«네 각의 크기의 합은 $360^\circ$»)로만 허용된다.
          for (const d of degsOf(all)) {
            if (d <= 0 || d > 360)
              bad.push(`${code} ${tier} seed ${seed}: ${d}° 띠 밖`);
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

  it("표준·갈래 서른 문항의 발문이 겹치지 않는다 (R5)", () => {
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

  it("모든 수가 KaTeX 안에 있고, 수·도(°) 뒤 조사가 소리와 맞는다", () => {
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
            // «도»는 받침이 없다 — ° 뒤에 받침용 조사가 오면 틀린 말이다.
            if (/\^\\circ\$(은|이|을|과)(?![가-힣])/.test(text))
              bad.push(
                `${code} ${tier} seed ${seed} ${label}: ° 뒤 받침용 조사`,
              );
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

  // ── 소단원별 독립 재계산

  it("1-2-1 — 비교 네 갈래의 답을 발문에서 다시 구한다", () => {
    const calcKinds = new Set<string>();
    const applyKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-2-1", seed, "연산");
      let m = calc.content.match(/보다 더 (큰|작은) 각을 만들려면/);
      if (m) {
        calcKinds.add("벌림");
        expect(calc.answer).toBe(
          m[1] === "큰" ? "벌려야 한다" : "오므려야 한다",
        );
      } else {
        calcKinds.add("겹침");
        m = calc.content.match(
          /([가나]) 각의 두 변 사이에 ([가나]) 각이 꼭 들어갑니다/,
        );
        expect(m, calc.content).toBeTruthy();
        expect(calc.answer, calc.content).toBe(m![1]);
      }

      const basic = gen("1-2-1", seed, "기본");
      const degs = degsOf(basic.content);
      expect(degs.length, basic.content).toBe(3);
      const wantBig = /가장 큰/.test(basic.content);
      expect(answerDeg(basic.answer)).toBe(
        wantBig ? Math.max(...degs) : Math.min(...degs),
      );

      const apply = gen("1-2-1", seed, "응용");
      const chain = apply.content.match(
        /각 가는 각 나보다 (크|작)고, 각 나는 각 다보다 (큽니다|작습니다)\. 세 각 중 가장 (큰|작은) 각은/,
      );
      if (chain) {
        applyKinds.add("사슬");
        const asc = chain[1] === "크"; // 가>나>다
        expect(
          chain[2] === (asc ? "큽니다" : "작습니다"),
          "관계 방향이 갈린다",
        ).toBe(true);
        const wantB = chain[3] === "큰";
        expect(apply.answer).toBe(asc === wantB ? "가" : "다");
      } else {
        applyKinds.add("고르기");
        const am = apply.content.match(
          /각 가의 크기는 \$(\d+)\^\\circ\$입니다\. 각 나는 각 가보다 더 (큽니다|작습니다)\. \$(\d+)\^\\circ\$와 \$(\d+)\^\\circ\$ 중/,
        );
        expect(am, apply.content).toBeTruthy();
        const x = Number(am![1]);
        const cands = [Number(am![3]), Number(am![4])];
        const got = answerDeg(apply.answer);
        expect(cands, apply.content).toContain(got);
        expect(am![2] === "큽니다" ? got > x : got < x, apply.content).toBe(
          true,
        );
        // 다른 후보는 반대쪽이어야 답이 하나로 선다.
        const other = cands.find((c) => c !== got)!;
        expect(am![2] === "큽니다" ? other < x : other > x, apply.content).toBe(
          true,
        );
      }

      const deep = gen("1-2-1", seed, "심화하");
      const dm = deep.content.match(
        /네 각의 크기가 (.+)입니다\. \$(\d+)\^\\circ\$보다 크고 \$(\d+)\^\\circ\$보다 작은/,
      );
      expect(dm, deep.content).toBeTruthy();
      const four = degsOf(dm![1]!);
      expect(four.length).toBe(4);
      const cnt = four.filter(
        (v) => v > Number(dm![2]) && v < Number(dm![3]),
      ).length;
      expect(cnt, deep.content).toBeGreaterThanOrEqual(1);
      expect(answerNum(deep.answer)).toBe(cnt);
    }
    expect(calcKinds.size, `연산이 ${[...calcKinds]}뿐`).toBe(2);
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
  });

  it("1-2-2 — 1도·등분·역산의 답을 발문에서 다시 구한다", () => {
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-2-2", seed, "연산");
      let m = calc.content.match(/\$1\^\\circ\$가 \$(\d+)\$개 모인 각/);
      if (m) {
        expect(answerDeg(calc.answer)).toBe(Number(m[1]));
      } else {
        expect(
          /직각은 .*몇 개 모인 각인가/.test(calc.content),
          calc.content,
        ).toBe(true);
        expect(answerNum(calc.answer)).toBe(90);
      }

      const basic = gen("1-2-2", seed, "기본");
      m = basic.content.match(
        /(직각|직선이 이루는 각)을 똑같이 \$(\d+)\$개로 나누면/,
      );
      expect(m, basic.content).toBeTruthy();
      const base = m![1] === "직각" ? 90 : 180;
      expect(answerDeg(basic.answer) * Number(m![2])).toBe(base);

      const apply = gen("1-2-2", seed, "응용");
      m = apply.content.match(
        /(직각|직선이 이루는 각)을 똑같이 \$(\d+)\$개로 나눈 것 중 \$(\d+)\$개를/,
      );
      expect(m, apply.content).toBeTruthy();
      const base2 = m![1] === "직각" ? 90 : 180;
      const k = Number(m![2]);
      const cnt = Number(m![3]);
      expect(cnt, "조각 수는 등분 수보다 작아야 한다").toBeLessThan(k);
      expect(answerDeg(apply.answer)).toBe((base2 / k) * cnt);

      // 심화 — 예전엔 둘 다 **한 걸음**이었다($90\div d$ · $a+d$). 이제 한 걸음을 더 얹어
      // 응용(직선의 각을 나눠 몇 개를 잇는다)보다 위로 올린다.
      const deep = gen("1-2-2", seed, "심화하");
      m = deep.content.match(
        /한 각의 크기가 \$(\d+)\^\\circ\$가 되었습니다\. 나누어진 각 \$(\d+)\$개를 겹치지 않게 이어 붙이면/,
      );
      if (m) {
        deepKinds.add("등분역산+잇기");
        const one = Number(m[1]);
        const take = Number(m[2]);
        expect(90 % one, `직각을 등분한 각이 아니다: ${deep.content}`).toBe(0);
        expect(take, "이어 붙이는 조각은 등분 수보다 적어야 한다").toBeLessThan(
          90 / one,
        );
        expect(answerDeg(deep.answer), deep.content).toBe(one * take);
      } else {
        deepKinds.add("눈금역산+직각차");
        m = deep.content.match(
          /한 변이 눈금 \$(\d+)\$[을를] 가리키고 있습니다\. 각의 크기가 \$(\d+)\^\\circ\$라면/,
        );
        expect(m, deep.content).toBeTruthy();
        const mark = Number(m![1]) + Number(m![2]);
        expect(
          mark,
          `눈금이 반원을 넘는다: ${deep.content}`,
        ).toBeLessThanOrEqual(180);
        expect(
          mark,
          `직각 눈금을 안 넘으면 답이 음수다: ${deep.content}`,
        ).toBeGreaterThan(90);
        expect(answerNum(deep.answer), deep.content).toBe(mark - 90);
      }
    }
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-2-3 — 분류 네 갈래의 답을 발문에서 다시 구한다 (시계 경계 잠금)", () => {
    const applyKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-2-3", seed, "연산");
      let m = calc.content.match(/크기가 \$(\d+)\^\\circ\$인 각은 직각보다/);
      expect(m, calc.content).toBeTruthy();
      expect(calc.answer).toBe(Number(m![1]) > 90 ? "크다" : "작다");

      const basic = gen("1-2-3", seed, "기본");
      const four = degsOf(basic.content);
      expect(four.length, basic.content).toBe(4);
      const acute = four.filter((v) => v < 90);
      expect(acute.length, "예각이 하나는 있어야 답이 선다").toBeGreaterThan(0);
      expect(acute.length, "둔각도 있어야 가르기가 된다").toBeLessThan(4);
      expect(basic.answer).toBe(acute.map((v) => `$${v}^\\circ$`).join(", "));

      const apply = gen("1-2-3", seed, "응용");
      const spec = apply.figureSpec as {
        kind: string;
        items: { hour: number; minute: number }[];
      };
      expect(spec.kind, apply.content).toBe("clocks");
      for (const item of spec.items) {
        expect(item.minute, "정각이어야 한다").toBe(0);
        // 팀장 경계: 6시(평각)·12시(0°)는 내지 않는다 — 작은 쪽 각이 0°<각<180°.
        const angle = Math.min(item.hour, 12 - item.hour) * 30;
        expect(angle, `${item.hour}시`).toBeGreaterThan(0);
        expect(angle, `${item.hour}시`).toBeLessThan(180);
      }
      m = apply.content.match(/시계가 \$(\d+)\$시를 가리킬 때/);
      if (m) {
        applyKinds.add("분류");
        const h = Number(m[1]);
        expect(spec.items.length).toBe(1);
        expect(spec.items[0]!.hour).toBe(h);
        const angle = Math.min(h, 12 - h) * 30;
        expect(apply.answer).toBe(
          angle < 90 ? "예각" : angle === 90 ? "직각" : "둔각",
        );
      } else {
        applyKinds.add("비교");
        m = apply.content.match(/\$(\d+)\$시와 \$(\d+)\$시 중/);
        expect(m, apply.content).toBeTruthy();
        const h1 = Number(m![1]);
        const h2 = Number(m![2]);
        expect(spec.items.map((i) => i.hour)).toEqual([h1, h2]);
        const a1 = Math.min(h1, 12 - h1) * 30;
        const a2 = Math.min(h2, 12 - h2) * 30;
        expect(a1, "두 각이 같으면 답이 없다").not.toBe(a2);
        expect(apply.answer).toBe(`$${a1 > a2 ? h1 : h2}$시`);
      }

      const deep = gen("1-2-3", seed, "심화하");
      m = deep.content.match(
        /네 각의 크기가 (.+)입니다\. 예각이면서 \$(\d+)\^\\circ\$보다 큰/,
      );
      expect(m, deep.content).toBeTruthy();
      const cand = degsOf(m![1]!);
      expect(cand.length).toBe(4);
      const t = Number(m![2]);
      const cnt = cand.filter((v) => v < 90 && v > t).length;
      expect(cnt, deep.content).toBeGreaterThanOrEqual(1);
      expect(answerNum(deep.answer)).toBe(cnt);
    }
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
  });

  it("1-2-4 — 합·차 네 갈래의 답을 발문에서 다시 구한다", () => {
    const basicKinds = new Set<string>();
    const applyKinds = new Set<string>();
    const deepKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-2-4", seed, "연산");
      let d = degsOf(calc.content);
      expect(d.length, calc.content).toBe(2);
      expect(answerDeg(calc.answer)).toBe(d[0]! + d[1]!);

      const basic = gen("1-2-4", seed, "기본");
      d = degsOf(basic.content);
      expect(d.length, basic.content).toBe(1);
      if (/직각이 되는/.test(basic.content)) {
        basicKinds.add("직각");
        expect(answerDeg(basic.answer)).toBe(90 - d[0]!);
      } else {
        basicKinds.add("직선");
        expect(
          /직선이 이루는 각이 되는/.test(basic.content),
          basic.content,
        ).toBe(true);
        expect(answerDeg(basic.answer)).toBe(180 - d[0]!);
      }

      const apply = gen("1-2-4", seed, "응용");
      d = degsOf(apply.content);
      if (/만큼 줄이면/.test(apply.content)) {
        applyKinds.add("줄이기");
        expect(d.length, apply.content).toBe(3);
        expect(answerDeg(apply.answer)).toBe(d[0]! + d[1]! - d[2]!);
      } else {
        applyKinds.add("직선초과");
        expect(d.length, apply.content).toBe(2);
        expect(d[0]! + d[1]!, "직선을 넘어야 물을 수 있다").toBeGreaterThan(
          180,
        );
        expect(answerDeg(apply.answer)).toBe(d[0]! + d[1]! - 180);
      }

      const deep = gen("1-2-4", seed, "심화하");
      const dm = deep.content.match(
        /어떤 각도(?:에|에서) \$(\d+)\^\\circ\$를 (더해야|빼야) 할 것을 잘못하여 (?:뺐|더했)더니 \$(\d+)\^\\circ\$가/,
      );
      expect(dm, deep.content).toBeTruthy();
      const y = Number(dm![1]);
      const wrong = Number(dm![3]);
      const right = dm![2] === "더해야" ? wrong + 2 * y : wrong - 2 * y;
      deepKinds.add(dm![2]!);
      expect(answerDeg(deep.answer), deep.content).toBe(right);
    }
    expect(basicKinds.size, `기본이 ${[...basicKinds]}뿐`).toBe(2);
    expect(applyKinds.size, `응용이 ${[...applyKinds]}뿐`).toBe(2);
    expect(deepKinds.size, `심화가 ${[...deepKinds]}뿐`).toBe(2);
  });

  it("1-2-5 — 삼각형 네 갈래의 답을 발문에서 다시 구한다 (아니요는 10° 이상 벗어남)", () => {
    const applyKinds = new Set<string>();
    for (const seed of SEEDS) {
      const calc = gen("1-2-5", seed, "연산");
      let d = degsOf(calc.content);
      expect(d.length, calc.content).toBe(1);
      expect(answerDeg(calc.answer)).toBe(180 - d[0]!);

      const basic = gen("1-2-5", seed, "기본");
      d = degsOf(basic.content);
      expect(d.length, basic.content).toBe(1);
      expect(answerDeg(basic.answer)).toBe(90 - d[0]!);

      const apply = gen("1-2-5", seed, "응용");
      d = degsOf(apply.content);
      expect(d.length, apply.content).toBe(3);
      const sum = d[0]! + d[1]! + d[2]!;
      if (sum === 180) {
        applyKinds.add("예");
        expect(apply.answer).toBe("예");
      } else {
        applyKinds.add("아니요");
        expect(apply.answer).toBe("아니요");
        // 팀장 경계: 179°·181° 같은 한 끗 차는 지면 신뢰를 깎는다.
        expect(Math.abs(sum - 180), apply.content).toBeGreaterThanOrEqual(10);
      }

      // 심화 — 예전 둘째 갈래는 「세 각이 모두 같은 삼각형」이라 답이 늘 $60^\circ$ 였다.
      // 씨앗을 바꿔도 같은 문항이니 4단은커녕 갈래도 아니었다. 이제 두 각을 조건으로 엮는다.
      const deep = gen("1-2-5", seed, "심화하");
      const dGap = deep.content.match(
        /한 각의 크기는 \$(\d+)\^\\circ\$이고, 다른 한 각은 그보다 \$(\d+)\^\\circ\$ 더 큽니다/,
      );
      if (dGap) {
        const a = Number(dGap[1]);
        const rest = 180 - a - (a + Number(dGap[2]));
        expect(rest, `남는 각이 $0$ 이하다: ${deep.content}`).toBeGreaterThan(
          0,
        );
        expect(answerDeg(deep.answer), deep.content).toBe(rest);
      } else {
        const dm = deep.content.match(/한 각의 크기는 \$(\d+)\^\\circ\$이고/);
        expect(dm, deep.content).toBeTruthy();
        const a = Number(dm![1]);
        expect((180 - a) % 2, "두 각이 같으려면 짝수로 남아야 한다").toBe(0);
        expect(answerDeg(deep.answer)).toBe((180 - a) / 2);
      }
    }
    expect(
      applyKinds.size,
      `응용이 ${[...applyKinds]}뿐 — 예·아니요 다 나와야 한다`,
    ).toBe(2);
  });

  it("1-2-6 — 사각형 네 갈래의 답을 발문에서 다시 구한다", () => {
    for (const seed of SEEDS) {
      const calc = gen("1-2-6", seed, "연산");
      let d = degsOf(calc.content);
      expect(d.length, calc.content).toBe(1);
      expect(answerDeg(calc.answer)).toBe(360 - d[0]!);

      const basic = gen("1-2-6", seed, "기본");
      d = degsOf(basic.content);
      expect(d.length, basic.content).toBe(1);
      expect(/두 각이 직각인/.test(basic.content), basic.content).toBe(true);
      expect(answerDeg(basic.answer)).toBe(180 - d[0]!);

      const apply = gen("1-2-6", seed, "응용");
      d = degsOf(apply.content);
      expect(d.length, apply.content).toBe(3);
      const rest = 360 - d[0]! - d[1]! - d[2]!;
      expect(apply.answer).toBe(
        rest < 90 ? "예각" : rest === 90 ? "직각" : "둔각",
      );

      // 심화 — 예전 둘째 갈래는 「네 각이 모두 같은 사각형」이라 답이 늘 $90^\circ$ 였다.
      // 이제 한 각만 주고 **나머지 셋이 같다**로 되짚는다(두 걸음).
      const deep = gen("1-2-6", seed, "심화하");
      const dd = degsOf(deep.content);
      if (dd.length === 2) {
        const rest2 = 360 - dd[0]! - dd[1]!;
        expect(rest2 % 2, "두 각이 같으려면 짝수로 남아야 한다").toBe(0);
        expect(answerDeg(deep.answer)).toBe(rest2 / 2);
      } else {
        expect(
          /나머지 세 각의 크기는 서로 같습니다/.test(deep.content),
          deep.content,
        ).toBe(true);
        expect(dd.length, deep.content).toBe(1);
        const rest3 = 360 - dd[0]!;
        expect(rest3 % 3, "세 각이 같으려면 3으로 나누어떨어져야 한다").toBe(0);
        expect(answerDeg(deep.answer), deep.content).toBe(rest3 / 3);
      }
    }
  });

  // 발문이 시계를 가리키므로 그림이 실제로 그려져야 한다.
  it("1-2-3 응용의 시계가 실제로 그려진다", async () => {
    const bad: string[] = [];
    for (const seed of SEEDS.slice(0, 4)) {
      const p = gen("1-2-3", seed, "응용");
      const r = await renderFigureSpec(p.figureSpec);
      if (!r.ok) bad.push(`씨앗 ${seed}: ${r.error}`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
});
