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
import type { TestPrintProblem } from "@/components/print/types";
import { JASEUP_GEOMETRY, JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import { assessAnswerKeyRisk, estimateSolutionPx } from "@/lib/printOverflow";
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

/** 까닭 문장이 그 보기의 오른쪽 값에 대해 참인가 — 시험 쪽에서 그 실수를 다시 계산한다. 갈래도 돌려준다. */
const REASON_KIND: Record<string, "실수" | "부호" | "공용"> = {
  "빼는 수의 부호를 바꾸지 않고 더함": "실수",
  "분자끼리 분모끼리 더함": "실수",
  "분자끼리 분모끼리 뺌": "실수",
  "절댓값의 차가 아니라 합을 구함": "실수",
  "결과의 부호를 반대로 씀": "부호",
  "계산 결과와 다름": "공용",
};
function checkReason(choice: string, reason: string): "실수" | "부호" | "공용" {
  const kind = REASON_KIND[reason];
  expect(kind, `모르는 까닭: ${reason}`).toBeDefined();
  const side = parseSide(choice);
  const v = sumOf(side.terms);
  const w = side.right;
  const same = (r: R) => r.n === w.n && r.d === w.d;
  expect(same(v), `거짓이라는데 참: ${choice}`).toBe(false);
  if (reason === "빼는 수의 부호를 바꾸지 않고 더함") {
    const ok = side.terms.some(
      (term, j) =>
        term.sign === -1 &&
        same(
          sumOf(side.terms.map((u, k) => (k === j ? { ...u, sign: 1 } : u))),
        ),
    );
    expect(ok, `${reason} ↔ ${choice}`).toBe(true);
  }
  if (reason === "결과의 부호를 반대로 씀")
    expect(same(red(-v.n, v.d)), `${reason} ↔ ${choice}`).toBe(true);
  if (reason === "절댓값의 차가 아니라 합을 구함") {
    const [a, b] = side.terms.map((x) => red(x.sign * x.v.n, x.v.d));
    const abs = red(Math.abs(a!.n) * b!.d + Math.abs(b!.n) * a!.d, a!.d * b!.d);
    const big = Math.abs(a!.n) * b!.d >= Math.abs(b!.n) * a!.d ? a! : b!;
    expect(
      same(big.n < 0 ? red(-abs.n, abs.d) : abs),
      `${reason} ↔ ${choice}`,
    ).toBe(true);
  }
  if (reason.startsWith("분자끼리 분모끼리")) {
    const [a, b] = side.terms;
    const plus = b!.sign === 1;
    expect(reason.endsWith(plus ? "더함" : "뺌"), `${reason} ↔ ${choice}`).toBe(
      true,
    );
    const n = plus ? a!.v.n + b!.v.n : a!.v.n - b!.v.n;
    const d = plus ? a!.v.d + b!.v.d : a!.v.d - b!.v.d;
    expect(same(red(n, d)), `${reason} ↔ ${choice}`).toBe(true);
  }
  return kind!;
}

/** 해설을 넉 줄 짜임으로 읽는다(`JudgeBody` 머리말). */
function readSolution(p: { solution: string; answer: string; ask: JudgeAsk }) {
  const sol = p.solution.split("\n");
  const values = [...sol[0]!.matchAll(/([①②③④⑤]) \$([^$]+)\$/g)];
  const whyGroups =
    sol.length === 4
      ? [
          ...sol[2]!
            .replace(/^옳지 않은 까닭: /, "")
            .replace(/\.$/, "")
            .split(", "),
        ].map((g) => {
          const [marks, ...rest] = g.split(" ");
          return { marks: marks!.split("·"), why: rest.join(" ") };
        })
      : [];
  return { sol, values, whyGroups };
}

describe("㉤ 해설 — 넉 줄 짜임 · 보기 차례를 따라간다 · 까닭이 참이다", () => {
  for (const key of Object.values(KEYS)) {
    it(key, () => {
      const answerAt = new Set<string>();
      for (let s = 0; s < 200; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        answerAt.add(p.answer);
        const choices = choicesOf(p.content);
        const { sol, values, whyGroups } = readSolution(p);
        const ai = MARKS.indexOf(p.answer);
        expect(sol).toHaveLength(p.ask === "옳은 것" ? 4 : 3);
        // ⑴ 첫 줄 — 보기 k 의 자리에 보기 k 의 왼쪽을 계산한 값(시험 쪽 셈).
        expect(sol[0]!.startsWith("계산하면 ① "), sol[0]).toBe(true);
        expect(values.map((m) => m[1])).toEqual(MARKS);
        values.forEach((m, k) =>
          expect(readRat(plain(m[2]!)), `${sol[0]} ↔ ${choices[k]}`).toEqual(
            sumOf(parseSide(choices[k]!).terms),
          ),
        );
        // ⑵ 둘째 줄 — 정답 보기의 풀이. 첫 단계(통분한 항)의 합과 끝 값이 그 보기의 참값이다.
        const v = sumOf(parseSide(choices[ai]!).terms);
        expect(sol[1]!.startsWith(`${p.answer} `), sol[1]).toBe(true);
        const chain = /\$([^$]+)\$이므로/
          .exec(sol[1]!)![1]!
          .split("=")
          .map(plain);
        expect(readRat(chain.at(-1)!), sol[1]).toEqual(v);
        const first = [
          ...chain[0]!.matchAll(/([+-]?)(\d+)(?:\/(\d+))?/g),
        ].reduce(
          (acc, m) =>
            red(
              acc.n * Number(m[3] ?? 1) +
                (m[1] === "-" ? -1 : 1) * Number(m[2]) * acc.d,
              acc.d * Number(m[3] ?? 1),
            ),
          { n: 0, d: 1 } as R,
        );
        expect(first, sol[1]).toEqual(v);
        const answerTrue = truthBy3rdPath(choices[ai]!);
        if (answerTrue)
          expect(sol[1]!.endsWith("이므로 옳다."), sol[1]).toBe(true);
        else {
          const why = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
          expect(why, sol[1]).toBeDefined();
          checkReason(choices[ai]!, why!);
        }
        // ⑶ «옳은 것» 물음 — 나머지 넷이 전부 «옳지 않은 까닭»에 한 번씩, 까닭은 그 보기에 대해 참이다.
        const listed = whyGroups.flatMap((g) => g.marks).sort();
        const falses = MARKS.filter((_, k) => k !== ai).sort();
        expect(listed, sol.join(" / ")).toEqual(
          p.ask === "옳은 것" ? falses : [],
        );
        for (const g of whyGroups)
          for (const mark of g.marks)
            checkReason(choices[MARKS.indexOf(mark)]!, g.why);
        expect(sol.at(-1)).toBe(
          `따라서 계산이 ${p.ask === "옳지 않은 것" ? "옳지 않은" : "옳은"} 것은 ${p.answer}이다.`,
        );
      }
      expect([...answerAt].sort()).toEqual([...MARKS].sort());
    });
  }

  it("거짓 보기마다 «어디가 틀렸나»가 있고, 부호 반대는 한 문항에 하나까지 · 세 갈래가 다 쓰인다", () => {
    const seen = new Set<string>();
    for (const key of Object.values(KEYS)) {
      for (let s = 0; s < 200; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        const choices = choicesOf(p.content);
        const { sol, whyGroups } = readSolution(p);
        const kinds: string[] = [];
        const own = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
        if (own)
          kinds.push(checkReason(choices[MARKS.indexOf(p.answer)]!, own));
        for (const g of whyGroups)
          for (const mark of g.marks)
            kinds.push(checkReason(choices[MARKS.indexOf(mark)]!, g.why));
        // 거짓 보기 수만큼 까닭이 있다 — «옳지 않은 것» 1 · «옳은 것» 4.
        expect(kinds, p.solution).toHaveLength(
          p.ask === "옳지 않은 것" ? 1 : 4,
        );
        kinds.forEach((k) => seen.add(k));
        expect(
          kinds.filter((k) => k === "부호").length,
          p.solution,
        ).toBeLessThanOrEqual(1);
      }
    }
    expect([...seen].sort()).toEqual(["공용", "부호", "실수"]);
  });
});

describe("㉧ 정답지 — 제품의 정답지 자로 재서 해설이 통째로 빠지지 않는다", () => {
  /**
   * 정답지(`PrintAnswerKeyPage`)는 한 쪽에 8문항 · 2단이고, 두 단을 넘친 해설은 셋째 단으로 밀려
   * **통째로 사라진다**(`assessAnswerKeyRisk` 머리말). 2026-10-08 표본 20문항을 떠 보니 보기마다 식 전체를
   * 적은 해설로는 1쪽에 5문항만 들어가고 6~8번이 빠졌다. 그래서 해설을 넉 줄로 짰다(`JudgeBody` 머리말).
   * 자를 옮겨 적지 않는다 — 제품 함수(`estimateSolutionPx` · `assessAnswerKeyRisk`)를 그대로 부른다.
   */
  const SHARE =
    (JASEUP_MEASURED_PX.answerSolutionsFull *
      JASEUP_MEASURED_PX.solutionColumns) /
    JASEUP_GEOMETRY.answerEntriesPerPage;
  const short = (i: number): TestPrintProblem => ({
    id: `s${i}`,
    orderIndex: i,
    content: "다음을 계산하시오.",
    answer: "$1$",
    solution: "답은 $1$이다.",
    questionType: "단답형",
  });
  const judgeRow = (
    key: string,
    seed: number,
    v: number,
    i: number,
  ): TestPrintProblem => {
    const p = generateJudgeProblem(key, seed, v);
    return {
      id: `j${i}`,
      orderIndex: i,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
      questionType: "객관식",
    };
  };

  it(`해설 한 건이 정답지 한 칸의 평균 몫(2단 × 높이 ÷ 8)을 넘지 않는다 — 씨앗 300 × 셋`, () => {
    expect(SHARE).toBeGreaterThan(200); // 몫이 무너지면(기하가 바뀌면) 여기부터 본다
    for (const key of Object.values(KEYS))
      for (let s = 0; s < 300; s += 1) {
        const p = generateJudgeProblem(key, SEED0 + s * STEP, s % 2);
        expect(estimateSolutionPx(p.solution), p.solution).toBeLessThanOrEqual(
          SHARE,
        );
      }
  });

  it("판정형만 8문항이 둘째 쪽(빠른 정답 상자 없음)에 다 들어간다 × 40벌", () => {
    const keys = Object.values(KEYS);
    for (let set = 0; set < 40; set += 1) {
      const rows = Array.from({ length: 8 }, (_, i) => short(i));
      for (let i = 8; i < 16; i += 1)
        rows.push(
          judgeRow(
            keys[(set + i) % 3]!,
            SEED0 + set * 1009 + i * STEP,
            i % 4,
            i,
          ),
        );
      expect(assessAnswerKeyRisk(rows), `벌 ${set}`).toEqual([]);
    }
  });

  it("첫 쪽(빠른 정답 상자 있음)에 판정형 셋 — 한 시험지에 문항류 하나씩이면 셋이 최대다 × 40벌", () => {
    const keys = Object.values(KEYS);
    for (let set = 0; set < 40; set += 1) {
      const rows = Array.from({ length: 20 }, (_, i) => short(i));
      keys.forEach((k, j) => {
        const at = (set + j * 3) % 8;
        rows[at] = judgeRow(k, SEED0 + set * 7 + j, (set + j) % 2, at);
      });
      expect(assessAnswerKeyRisk(rows), `벌 ${set}`).toEqual([]);
    }
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
