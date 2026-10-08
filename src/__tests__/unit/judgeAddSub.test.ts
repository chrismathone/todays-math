/**
 * ① 중1 «유리수의 덧셈과 뺄셈» 계산 판정 (2026-10-08 엔진 보강 1단계) — 보기 다섯의 진위를 **시험 쪽에서 따로** 잰다.
 *
 * ## 동어반복을 피하는 법
 *
 * 생성기는 `m1Calc` 의 약분 셈으로 값을 만들고, 등록부의 관문은 지면 글을 **BigInt 교차곱**(약분 없음)으로 다시 잰다.
 * 이 시험은 세 번째 길로 잰다 — 지면 글을 다른 정규식으로 읽어 **매 걸음 gcd 로 약분**하며 더하고, 기약 꼴의 분자·분모를
 * 글자 그대로 견준다. 셋 중 하나라도 어긋나면 빨개진다.
 *
 * ```
 * ㉠ 등록 — 판정키 셋 · 원천이 같은 차시의 등록 유형 · 난이도는 리터럴로 못 박는다
 * ㉡ 진위 — 씨앗 수백 × 물음 둘: «다른 하나»가 정확히 하나 · 정답 번호가 그것 · 등록부의 truths 와 같다
 * ㉢ 꼴 — 왼쪽 식 · 오른쪽 값이 겹치지 않는다 · 분수 항 수 · 결과 종류가 같다 · 자릿수가 비슷하다
 * ㉣ 같은 유형 — 보기 왼쪽 식이 원천 유형 발문의 식과 글자까지 같다(어댑터가 facts 를 옳게 읽는다)
 * ㉤ 해설 — 보기마다 한 줄 · 순열을 따라간다 · 까닭 문장이 그 값에 대해 참이다
 * ㉥ 지면 — KaTeX 가 던지지 않는다 · 죽은 역슬래시 없음
 * ㉦ 재시도 상한 · 변이(틀린 보기를 참으로) · 적재 행 · 미적재 빚
 * ```
 */
import katex from "katex";
import { describe, expect, it } from "vitest";

import { buildJudgeRows } from "../../../scripts/import/load-engine-problems";
import {
  loadedFragments,
  unloaded,
} from "../../../scripts/qa/checkUnloadedTypes";
import { deadBackslashHits } from "../../../scripts/qa/probe-middle-raw-latex";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  ADD_SUB_JUDGES,
  buildCalcJudgeBody,
  drawAdd2,
  MAX_DRAWS,
  type Expr,
} from "@/lib/middle/judge/addSub";
import type { JudgeAsk } from "@/lib/middle/judge/contract";
import {
  assembleJudge,
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";

const MARKS = ["①", "②", "③", "④", "⑤"];
const SECTION = "유리수의 덧셈과 뺄셈";
const KEYS = {
  add2: `중1|${SECTION}|calc-add2`,
  sub2: `중1|${SECTION}|calc-sub2`,
  mix4: `중1|${SECTION}|calc-mix4`,
};
const SEEDS = 300;
const SEED0 = 20261008;
const STEP = 7919;

// ── 시험 쪽 셈 — 생성기 · 관문과 다른 길 ────────────────────────────────────────

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
type R = { n: number; d: number };
function red(n: number, d: number): R {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}
/** `\dfrac{a}{b}` → `a/b`, `\left(` `\right)` → `(` `)` — 다른 정규식으로 읽는다. */
function plain(tex: string): string {
  return tex
    .replace(/\\left\(/g, "(")
    .replace(/\\right\)/g, ")")
    .replace(/\\dfrac\{(\d+)\}\{(\d+)\}/g, "$1/$2");
}
function readRat(s: string): R {
  const m = /^(-?)(\d+)(?:\/(\d+))?$/.exec(s);
  if (!m) throw new Error(`시험 셈이 못 읽음: ${s}`);
  return red((m[1] ? -1 : 1) * Number(m[2]), Number(m[3] ?? 1));
}
type Side = { terms: { sign: number; v: R }[]; right: R };
function parseSide(choice: string): Side {
  const body = plain(choice.trim().replace(/^\$|\$$/g, ""));
  const [l, r] = body.split("=");
  const terms: Side["terms"] = [];
  let eaten = "";
  for (const m of l!.matchAll(/([+-]?)\(([+-])(\d+(?:\/\d+)?)\)/g)) {
    eaten += m[0];
    terms.push({
      sign: m[1] === "-" ? -1 : 1,
      v: readRat(`${m[2] === "-" ? "-" : ""}${m[3]}`),
    });
  }
  if (eaten !== l) throw new Error(`왼쪽을 다 못 읽음: ${l}`);
  return { terms, right: readRat(r!) };
}
function sumOf(terms: Side["terms"]): R {
  return terms.reduce(
    (acc, t) => red(acc.n * t.v.d + t.sign * t.v.n * acc.d, acc.d * t.v.d),
    { n: 0, d: 1 } as R,
  );
}
function truthBy3rdPath(choice: string): boolean {
  const s = parseSide(choice);
  const v = sumOf(s.terms);
  return v.n === s.right.n && v.d === s.right.d;
}
const choicesOf = (content: string) =>
  content
    .split("\n")
    .slice(1)
    .map((l) => l.slice(1).trim());
const isOdd = (ask: JudgeAsk, t: boolean) => (ask === "옳지 않은 것" ? !t : t);

describe("㉠ 등록 — 판정형 셋", () => {
  it("판정키 · 원천 · 난이도 · 규칙판 (리터럴로 못 박는다)", () => {
    const live = judgementDefinitions();
    expect(live.map((d) => d.key).sort()).toEqual(Object.values(KEYS).sort());
    const byKey = new Map(live.map((d) => [d.key, d]));
    expect(byKey.get(KEYS.add2)).toMatchObject({
      difficulty: "기본",
      ruleVersion: 1,
      sources: ["1-1|정수와 유리수의 계산|01"],
    });
    expect(byKey.get(KEYS.sub2)).toMatchObject({
      difficulty: "기본",
      ruleVersion: 1,
      sources: ["1-1|정수와 유리수의 계산|03"],
    });
    expect(byKey.get(KEYS.mix4)).toMatchObject({
      difficulty: "응용",
      ruleVersion: 1,
      sources: ["1-1|정수와 유리수의 계산|04"],
    });
    expect(ADD_SUB_JUDGES).toHaveLength(3);
  });

  it("원천은 같은 차시에 등록된 RPM 유형이고, 차시는 단원 시드에 있다", () => {
    const types = new Map(registeredTypes().map((t) => [t.key, t]));
    const seeded = new Set(
      CURRICULUM_UNITS.map((u) => `${u.grade}|${u.section}`),
    );
    for (const d of judgementDefinitions()) {
      expect(seeded.has(`${d.grade}|${d.unitSection}`), d.key).toBe(true);
      for (const s of d.sources) {
        const t = types.get(s);
        expect(t, `${d.key} 의 원천 ${s} 가 등록부에 없다`).toBeDefined();
        expect(`${t!.grade}|${t!.unitSection}`).toBe(
          `${d.grade}|${d.unitSection}`,
        );
      }
    }
  });
});

describe(`㉡ 진위 — 씨앗 ${SEEDS} × 물음 둘 × 판정형 셋, 시험 쪽 셈으로 다시 잰다`, () => {
  for (const key of Object.values(KEYS)) {
    it(key, () => {
      const asks = new Map<string, number>();
      for (let s = 0; s < SEEDS; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        asks.set(p.ask, (asks.get(p.ask) ?? 0) + 1);
        const choices = choicesOf(p.content);
        expect(choices).toHaveLength(5);
        const truths = choices.map(truthBy3rdPath);
        const odd = truths
          .map((t, i) => (isOdd(p.ask, t) ? i : -1))
          .filter((i) => i >= 0);
        expect(odd, p.content).toHaveLength(1);
        expect(p.answer).toBe(MARKS[odd[0]!]);
        expect(p.truths).toEqual(truths);
        expect(p.content.split("\n")[0]).toBe(
          p.ask === "옳지 않은 것"
            ? "다음 중 계산이 옳지 않은 것은?"
            : "다음 중 계산이 옳은 것은?",
        );
      }
      expect(asks.get("옳지 않은 것")).toBe(SEEDS / 2);
      expect(asks.get("옳은 것")).toBe(SEEDS / 2);
    });
  }
});

describe("㉢ 꼴 — 모양 단서가 없다", () => {
  for (const key of Object.values(KEYS)) {
    it(key, () => {
      for (let s = 0; s < 150; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        const sides = choicesOf(p.content).map(parseSide);
        const lefts = choicesOf(p.content).map((c) => c.split("=")[0]);
        expect(new Set(lefts).size, p.content).toBe(5);
        const rights = sides.map((x) => `${x.right.n}/${x.right.d}`);
        expect(new Set(rights).size, p.content).toBe(5);
        // 분수 항의 수 · 항 수 · 오른쪽이 정수인가가 다섯 다 같다.
        const shape = (x: Side) =>
          `${x.terms.filter((t) => t.v.d !== 1).length}/${x.terms.length}|${x.right.d === 1}`;
        expect(new Set(sides.map(shape)).size, p.content).toBe(1);
        // 틀린 값의 자릿수가 참값과 한 자리 넘게 다르지 않다.
        for (const x of sides) {
          const t = sumOf(x.terms);
          const len = (r: R) =>
            `${Math.abs(r.n)}${r.d === 1 ? "" : r.d}`.length;
          expect(
            Math.abs(len(t) - len(x.right)),
            p.content,
          ).toBeLessThanOrEqual(1);
        }
        // `numericMistakes` 의 `\frac` 이 그대로 새지 않는다 — 다섯 다 `\dfrac` 로 찍힌다.
        expect(p.content).not.toMatch(/\\frac/);
      }
    });
  }
});

describe("㉣ 같은 유형 — 보기의 왼쪽 식이 원천 유형 발문의 식 그대로다", () => {
  const cases: [keyof typeof KEYS, string][] = [
    ["add2", "1-1|정수와 유리수의 계산|01"],
    ["sub2", "1-1|정수와 유리수의 계산|03"],
    ["mix4", "1-1|정수와 유리수의 계산|04"],
  ];
  for (const [k, src] of cases) {
    it(`${KEYS[k]} ← ${src}`, () => {
      // 등록부가 부르는 그 어댑터를 같은 씨앗 흐름으로 다시 돌려, 원천 생성기 발문의 식과 맞댄다.
      const def = ADD_SUB_JUDGES.find((d) => d.familyId === `calc-${k}`)!;
      for (let s = 0; s < 120; s += 1) {
        const rng = createRng(SEED0 + s);
        const body = def.generate(rng, "옳지 않은 것");
        expect(body.facts.draws).toBeGreaterThanOrEqual(5);
        expect(body.facts.draws).toBeLessThanOrEqual(MAX_DRAWS);
      }
      // 원천 발문의 `$…$` 와 보기 왼쪽을 견준다 — 어댑터의 항 차례 · 부호가 원천과 같은가.
      for (let s = 0; s < 120; s += 1) {
        const seed = SEED0 + s * STEP;
        const p = generateMiddleProblem(src, seed, 0);
        const math = /\$([^$]+)\$/.exec(p.content)![1]!;
        const f = p.facts;
        const frac = (n: number, d: number) =>
          d === 1 ? `${Math.abs(n)}` : `\\dfrac{${Math.abs(n)}}{${d}}`;
        const signed = (pfx: string) =>
          `\\left(${f[`${pfx}n`]! < 0 ? "-" : "+"}${frac(f[`${pfx}n`]!, f[`${pfx}d`]!)}\\right)`;
        const want =
          k === "add2"
            ? `${signed("a")}+${signed("b")}`
            : k === "sub2"
              ? `${signed("a")}-${signed("b")}`
              : `${signed("a")}+${signed("b")}-${signed("c")}-${signed("d")}`;
        expect(math, `원천 ${src} 의 발문 식과 facts 가 세운 식이 다르다`).toBe(
          want,
        );
      }
    });
  }
});

describe("㉤ 해설 — 보기마다 한 줄, 순열을 따라간다, 까닭이 참이다", () => {
  for (const key of Object.values(KEYS)) {
    it(key, () => {
      const answerAt = new Set<string>();
      for (let s = 0; s < 200; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        answerAt.add(p.answer);
        const choices = choicesOf(p.content);
        const sol = p.solution.split("\n");
        expect(sol).toHaveLength(6);
        choices.forEach((c, i) => {
          const left = c.slice(1).split("=")[0]!; // `$` 를 뗀 왼쪽 식
          expect(
            sol[i]!.startsWith(`${MARKS[i]} $${left}=`),
            `${c} ↔ ${sol[i]}`,
          ).toBe(true);
          const t = truthBy3rdPath(c);
          expect(sol[i]).toContain(t ? "이므로 옳다." : "이므로 옳지 않다.");
          // 해설의 계산 끝 값은 참값이다.
          const side = parseSide(c);
          const v = sumOf(side.terms);
          const lastMath = /\$([^$]+)\$이므로/.exec(sol[i]!)![1]!;
          const tail = plain(lastMath.split("=").at(-1)!);
          expect(readRat(tail), sol[i]).toEqual(v);
          // 까닭 문장이 그 값에 대해 참인가 — 시험 쪽에서 그 실수를 다시 계산한다.
          if (!t) {
            const w = side.right;
            if (sol[i]!.includes("빼는 수의 부호를 바꾸지 않고")) {
              const ok = side.terms.some(
                (term, j) =>
                  term.sign === -1 &&
                  (() => {
                    const flipped = side.terms.map((u, k2) =>
                      k2 === j ? { ...u, sign: 1 } : u,
                    );
                    const r = sumOf(flipped);
                    return r.n === w.n && r.d === w.d;
                  })(),
              );
              expect(ok, sol[i]).toBe(true);
            }
            if (sol[i]!.includes("결과의 부호를 반대로")) {
              expect(red(-v.n, v.d), sol[i]).toEqual(w);
            }
            if (sol[i]!.includes("절댓값을 빼지 않고 더한")) {
              const [a, b] = side.terms.map((x) => red(x.sign * x.v.n, x.v.d));
              const abs = red(
                Math.abs(a!.n) * b!.d + Math.abs(b!.n) * a!.d,
                a!.d * b!.d,
              );
              const big =
                Math.abs(a!.n) * b!.d >= Math.abs(b!.n) * a!.d ? a! : b!;
              expect(big.n < 0 ? red(-abs.n, abs.d) : abs, sol[i]).toEqual(w);
            }
            if (sol[i]!.includes("분모는 분모끼리")) {
              const [a, b] = side.terms;
              const plus = b!.sign === 1;
              const n = plus ? a!.v.n + b!.v.n : a!.v.n - b!.v.n;
              const d = plus ? a!.v.d + b!.v.d : a!.v.d - b!.v.d;
              expect(red(n, d), sol[i]).toEqual(w);
            }
          }
        });
        expect(sol[5]).toBe(
          `따라서 계산이 ${p.ask === "옳지 않은 것" ? "옳지 않은" : "옳은"} 것은 ${p.answer}이다.`,
        );
      }
      expect([...answerAt].sort()).toEqual([...MARKS].sort());
    });
  }

  it("거짓 보기마다 «어디가 틀렸나»가 있고, 부호 반대는 한 문항에 하나까지 · 세 갈래가 다 쓰인다", () => {
    const REASONS = {
      실수: [
        "빼는 수의 부호를 바꾸지 않고 더한 값이 적혀 있다.",
        "분자는 분자끼리, 분모는 분모끼리 더한 값이 적혀 있다.",
        "분자는 분자끼리, 분모는 분모끼리 뺀 값이 적혀 있다.",
        "부호가 다른 두 수의 절댓값을 빼지 않고 더한 값이 적혀 있다.",
      ],
      부호: ["계산 결과의 부호를 반대로 적었다."],
      공용: ["오른쪽 값이 계산 결과와 다르다."],
    };
    const seen = new Set<string>();
    for (const key of Object.values(KEYS)) {
      for (let s = 0; s < 200; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        const falseLines = p.solution
          .split("\n")
          .filter((l) => l.includes("이므로 옳지 않다."));
        let signs = 0;
        for (const line of falseLines) {
          const reason = line.split("이므로 옳지 않다.")[1]!.trim();
          const kind = (Object.keys(REASONS) as (keyof typeof REASONS)[]).find(
            (k) => REASONS[k].includes(reason),
          );
          expect(kind, `까닭이 없거나 모르는 문장: ${line}`).toBeDefined();
          seen.add(kind!);
          if (kind === "부호") signs += 1;
        }
        expect(signs, p.solution).toBeLessThanOrEqual(1);
      }
    }
    expect([...seen].sort()).toEqual(["공용", "부호", "실수"]);
  });
});

describe("㉥ 지면 — KaTeX · 죽은 역슬래시", () => {
  it("발문 · 해설의 수식이 전부 그려진다", () => {
    for (const key of Object.values(KEYS)) {
      for (let s = 0; s < 40; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        for (const text of [p.content, p.solution]) {
          expect(deadBackslashHits(text), text).toEqual([]);
          for (const m of text.matchAll(/\$([^$]+)\$/g))
            expect(() =>
              katex.renderToString(m[1]!, { throwOnError: true }),
            ).not.toThrow();
        }
      }
    }
  });
});

describe("㉦ 재시도 상한 · 변이 · 적재", () => {
  it("재료가 늘 같으면 상한에서 사유를 달고 멈춘다", () => {
    const one = drawAdd2(createRng(1));
    const same = (): Expr => one;
    expect(() =>
      buildCalcJudgeBody(createRng(2), "옳지 않은 것", same),
    ).toThrow(
      new RegExp(
        `재료 ${MAX_DRAWS}번 뽑기 초과\\(가장 많이 찬 꼴이 1개까지\\)`,
      ),
    );
  });

  it("🔴 변이 — 틀린 보기의 오른쪽을 참값으로 바꾸면 관문이 멈춘다(씨앗 60 × 판정형 셋)", () => {
    for (const def of ADD_SUB_JUDGES) {
      for (let s = 0; s < 60; s += 1) {
        const ask: JudgeAsk = s % 2 === 0 ? "옳지 않은 것" : "옳은 것";
        const body = def.generate(createRng(SEED0 + s), ask);
        // 변이가 산출물을 실제로 바꾸는지부터 — 바뀐 글이 원래 글과 달라야 뜻이 있다.
        const wrong = body.options.findIndex((o) => !o.claimedTrue);
        const o = body.options[wrong]!;
        const side = parseSide(o.text);
        const v = sumOf(side.terms);
        const right =
          v.d === 1
            ? `${v.n}`
            : `${v.n < 0 ? "-" : ""}\\dfrac{${Math.abs(v.n)}}{${v.d}}`;
        const mutated = o.text.replace(/=[^=]+\$$/, `=${right}$`);
        expect(mutated).not.toBe(o.text);
        expect(truthBy3rdPath(mutated)).toBe(true);
        const options = body.options.map((x, i) =>
          i === wrong ? { ...x, text: mutated } : x,
        );
        expect(() =>
          assembleJudge(def, ask, { ...body, options }, createRng(s)),
        ).toThrow(/다시 재니/);
      }
    }
  });

  it("적재 행 — 판정형 셋 × 3벌, 전부 객관식 · 열쇠 모양 · 단원", () => {
    const rows = buildJudgeRows({ engine: "judge", variants: 3 }, SEED0);
    expect(rows).toHaveLength(9);
    for (const r of rows) {
      expect(r.questionType).toBe("객관식");
      expect(r.externalId).toMatch(
        /^engine-mid-judge:중1\|유리수의 덧셈과 뺄셈\|calc-(add2|sub2|mix4)\|r1\|s20261008\|v[0-2]\|객관식$/,
      );
      expect(r.familyKey).toMatch(
        /^mid:judge:중1\|유리수의 덧셈과 뺄셈\|calc-/,
      );
      expect(r.section).toBe(SECTION);
    }
  });

  it("미적재 빚 — 등록했으니 적재 전에는 셋 다 «안 나감»이다(pre-push 가 막는 자리)", () => {
    const left = unloaded(loadedFragments([]), [], []);
    expect(left.map((e) => e.key).sort()).toEqual(Object.values(KEYS).sort());
  });
});
