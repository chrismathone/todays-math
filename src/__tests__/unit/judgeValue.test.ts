/**
 * ① 중1 «문자의 사용과 식의 값» 식의 값 판정 (2026-10-08 엔진 보강 2단계) — «$x=-3$일 때, 다음 중 식의 값이 옳지 않은 것은?»
 *
 * 대입값은 보기가 아니라 **발문 줄**에 있다. 이 시험은 지면의 발문에서 대입값을 따로 읽고(`envOf`), 보기의 식을
 * 다른 읽개 + 부동소수(`texFloat.ts`)로 계산한다. 까닭 문장도 그 실수를 **글을 바꿔 끼워** 다시 계산한다
 * (`helpers/judgeValueGrammar.ts` — `-x^{2}` 를 `\left(-x\right)^{2}` 로 …).
 *
 * ```
 * ㉠ 등록 — 판정키 · 허용 원천 둘(05 · 06) · 난이도
 * ㉡ 진위 — 씨앗 300 × 물음 둘: 대입값은 음의 정수 하나 · «다른 하나»가 정확히 하나
 * ㉢ 꼴 — 식이 이 문형의 꼴(알맹이 + 상수) · 같은 틀은 둘까지 · 값은 정수 · 원천의 낱말
 * ㉣ 해설 — 넉 줄 짜임 · 대입은 괄호로 · 사슬의 걸음이 전부 참값 · 까닭이 그 값에 대해 참이다
 * ㉤ 재시도 상한(같은 재료 · 같은 틀) · 변이(틀린 보기를 참으로 · 발문의 대입값을 바꿈)
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import { generateMiddleProblem } from "@/lib/middle/generate";
import {
  buildTruthBody,
  MAX_DRAWS,
  type CalcStyle,
  type Material,
} from "@/lib/middle/judge/calcJudge";
import type { JudgeAsk } from "@/lib/middle/judge/contract";
import {
  assembleJudge,
  generateJudgeProblem,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { MAX_PER_TEMPLATE } from "@/lib/middle/judge/valueForms";
import { VALUE_JUDGES } from "@/lib/middle/judge/valueJudge";
import { m1Rational } from "@/lib/middle/m1Calc";

import {
  valueBySlip,
  valueShape,
  type ValueSlip,
} from "../helpers/judgeValueGrammar";
import {
  envOf,
  floatOf,
  literal,
  MARKS,
  mathOf,
  near,
  readPaper,
} from "../helpers/texFloat";

const KEY = "중1|문자의 사용과 식의 값|calc-value";
const SOURCES = [
  "1-1|문자의 사용과 식의 계산|05",
  "1-1|문자의 사용과 식의 계산|06",
];
const SEEDS = 300;
const SEED0 = 20261008;
const STEP = 7919;
const LEAD =
  /^\$([xa])=(-[234])\$일 때, 다음 중 식의 값이 (옳지 않은|옳은) 것은\?$/;

const isOdd = (ask: JudgeAsk, t: boolean) => (ask === "옳지 않은 것" ? !t : t);

/** 지면 한 장 — 발문에서 읽은 문자 · 대입값, 보기마다 식 · 적힌 값 · 시험 셈으로 계산한 값. */
function paper(content: string) {
  const { lead, choices } = readPaper(content);
  const m = LEAD.exec(lead);
  if (!m) throw new Error(`발문이 이 문형의 꼴이 아니다: ${lead}`);
  const letter = m[1]!;
  const x0 = Number(m[2]);
  const env = envOf(lead);
  const sides = choices.map((c) => {
    const parts = mathOf(c).split("=");
    if (parts.length !== 2) throw new Error(`등식 하나가 아니다: ${c}`);
    const right = literal(parts[1]!);
    return {
      text: c,
      left: parts[0]!,
      right,
      shown: right.n / right.d,
      value: floatOf(parts[0]!, env),
    };
  });
  return { lead, letter, x0, env, sides };
}
type Side = ReturnType<typeof paper>["sides"][number];

const SLIP_OF: Record<string, ValueSlip> = {
  "거듭제곱에 음수를 괄호 없이 대입함": "bare",
  "음수의 부호를 빼고 대입함": "dropped",
  "거듭제곱 앞의 부호를 밑에 넣어 계산함": "signIntoBase",
  "괄호 안의 부호를 거듭제곱 밖에 둠": "signOutOfBase",
  "계수까지 거듭제곱함": "coefficientIntoPower",
};
type Kind = "실수" | "부호" | "공용";

/** 까닭 문장이 그 보기의 적힌 값에 대해 참인가 — 그 실수를 시험 쪽에서 다시 계산한다. */
function checkReason(
  s: Side,
  letter: string,
  x0: number,
  reason: string,
): Kind {
  const at = `${reason} ↔ ${s.text} (${letter}=${x0})`;
  expect(near(s.value, s.shown), `거짓이라는데 참: ${s.text}`).toBe(false);
  if (reason === "결과의 부호를 반대로 씀") {
    expect(near(s.shown, -s.value), at).toBe(true);
    return "부호";
  }
  if (reason === "계산 결과와 다름") return "공용";
  const slip = SLIP_OF[reason];
  if (!slip) throw new Error(`모르는 까닭: ${reason}`);
  const wrong = valueBySlip(s.left, letter, x0, slip);
  expect(wrong, `이 식에는 없는 실수다 — ${at}`).not.toBeNull();
  expect(near(s.shown, wrong!), at).toBe(true);
  return "실수";
}

function readSolution(solution: string) {
  const sol = solution.split("\n");
  const values = [...sol[0]!.matchAll(/([①②③④⑤]) \$([^$]+)\$/g)];
  const whyGroups =
    sol.length === 4
      ? sol[2]!
          .replace(/^옳지 않은 까닭: /, "")
          .replace(/\.$/, "")
          .split(", ")
          .map((g) => {
            const [marks, ...rest] = g.split(" ");
            return { marks: marks!.split("·"), why: rest.join(" ") };
          })
      : [];
  return { sol, values, whyGroups };
}

const each = (
  n: number,
  fn: (p: ReturnType<typeof generateJudgeProblem>) => void,
) => {
  for (let s = 0; s < n; s += 1)
    fn(generateJudgeProblem(KEY, SEED0 + s * STEP, s % 2));
};

describe("㉠ 등록 — 식의 값 판정", () => {
  it("판정키 · 허용 원천 둘 · 난이도 · 규칙판 (리터럴로 못 박는다)", () => {
    const d = judgementDefinitions().find((x) => x.key === KEY);
    expect(d).toMatchObject({
      form: "truth",
      asks: ["옳지 않은 것", "옳은 것"],
      difficulty: "기본",
      ruleVersion: 1,
      sources: SOURCES,
    });
    expect(VALUE_JUDGES).toHaveLength(1);
  });
});

describe(`㉡ 진위 — 씨앗 ${SEEDS} × 물음 둘, 발문의 대입값을 따로 읽어 다시 잰다`, () => {
  it(KEY, () => {
    const asks = new Map<string, number>();
    const answerAt = new Set<string>();
    const points = new Set<string>();
    each(SEEDS, (p) => {
      asks.set(p.ask, (asks.get(p.ask) ?? 0) + 1);
      const { lead, letter, x0, sides } = paper(p.content);
      points.add(`${letter}=${x0}`);
      expect(LEAD.exec(lead)![3]).toBe(
        p.ask === "옳지 않은 것" ? "옳지 않은" : "옳은",
      );
      expect(sides).toHaveLength(5);
      const truths = sides.map((s) => near(s.value, s.shown));
      const odd = truths
        .map((t, i) => (isOdd(p.ask, t) ? i : -1))
        .filter((i) => i >= 0);
      expect(odd, p.content).toHaveLength(1);
      expect(p.answer).toBe(MARKS[odd[0]!]);
      expect(p.truths).toEqual(truths);
      answerAt.add(p.answer);
    });
    expect(asks.get("옳지 않은 것")).toBe(SEEDS / 2);
    expect(asks.get("옳은 것")).toBe(SEEDS / 2);
    expect([...answerAt].sort()).toEqual([...MARKS].sort());
    // 문자 둘 × 대입값 셋이 다 나온다.
    expect([...points].sort()).toEqual(
      ["a=-2", "a=-3", "a=-4", "x=-2", "x=-3", "x=-4"].sort(),
    );
  });

  it("🔴 대입값은 발문에서 읽는다 — 발문의 수를 바꾸면 같은 보기의 참거짓이 달라진다", () => {
    const def = VALUE_JUDGES[0]!;
    let flipped = 0;
    each(60, (p) => {
      const { lead, choices } = readPaper(p.content);
      const { x0 } = paper(p.content);
      const other = lead.replace(`=${x0}$`, `=${x0 - 1}$`);
      expect(other).not.toBe(lead);
      const before = choices.map((c) => def.truthOf(c, { lead }));
      const after = choices.map((c) => def.truthOf(c, { lead: other }));
      expect(before).toEqual(p.truths);
      if (before.join() !== after.join()) flipped += 1;
      // 발문이 없으면(대입값을 모르면) 못 읽는다 — 조용히 «거짓»으로 읽지 않는다.
      expect(
        def.truthOf(choices[0]!, { lead: "다음 중 옳은 것은?" }),
      ).toBeNull();
    });
    expect(flipped).toBe(60);
  });
});

describe("㉢ 꼴 — 이 문형의 식 · 같은 틀은 둘까지 · 값은 정수", () => {
  it("보기 다섯 — 알맹이 + 상수의 꼴 · 식과 값이 겹치지 않는다 · 자릿수가 비슷하다", () => {
    const templates = new Set<string>();
    each(SEEDS, (p) => {
      const { letter, sides } = paper(p.content);
      expect(new Set(sides.map((s) => s.left)).size, p.content).toBe(5);
      // 적힌 값이 겹치지 않는다 — 계산 판정의 규칙이다.
      expect(new Set(sides.map((s) => s.shown)).size, p.content).toBe(5);
      const count = new Map<string, number>();
      for (const s of sides) {
        // 꼴이 아니면 `valueShape` 가 던진다.
        const shape = valueShape(s.left, letter);
        templates.add(shape.template);
        count.set(shape.template, (count.get(shape.template) ?? 0) + 1);
        // 참값 · 적힌 값 모두 정수다.
        expect(Number.isInteger(s.shown), p.content).toBe(true);
        expect(near(s.value, Math.round(s.value)), p.content).toBe(true);
        const len = (v: number) => `${Math.abs(Math.round(v))}`.length;
        expect(
          Math.abs(len(s.value) - len(s.shown)),
          p.content,
        ).toBeLessThanOrEqual(1);
      }
      // 한 문항에 같은 틀은 둘까지 — 다섯 다 일차식이면 대입만 다섯 번이다.
      expect(Math.max(...count.values()), p.content).toBeLessThanOrEqual(
        MAX_PER_TEMPLATE,
      );
      expect(p.content + p.solution).not.toMatch(/\\frac/);
    });
    expect([...templates].sort()).toEqual(
      ["계수 제곱", "분모", "세제곱", "일차", "제곱"].sort(),
    );
  });

  it("식의 낱말이 허용 원천의 것이다 — 05 의 일차 · 이차 · `-a^{n}`, 06 의 분모에 문자", () => {
    // 원천 생성기를 그대로 부를 수 없는 문형이다(보기 다섯이 같은 대입값을 쓴다) — 낱말이 원천에 있는지만 본다.
    const words = { 일차: 0, 이차: 0, 부호거듭제곱: 0, 분모: 0 };
    for (let s = 0; s < 200; s += 1) {
      const p05 = generateMiddleProblem(SOURCES[0]!, SEED0 + s * STEP, 0);
      if (/\d*x(?!\^)/.test(p05.content)) words.일차 += 1;
      if (/x\^\{2\}/.test(p05.content)) words.이차 += 1;
      if (/-a\^\{[23]\}/.test(p05.content)) words.부호거듭제곱 += 1;
      const p06 = generateMiddleProblem(SOURCES[1]!, SEED0 + s * STEP, 0);
      if (/\\dfrac\{\d+\}\{[a-z]\}/.test(p06.content)) words.분모 += 1;
    }
    for (const [word, n] of Object.entries(words))
      expect(n, `원천에 «${word}» 낱말이 없다`).toBeGreaterThan(0);
  });
});

describe("㉣ 해설 — 넉 줄 짜임 · 대입은 괄호로 · 까닭이 참이다", () => {
  it("첫 줄의 값 · 정답 보기의 대입 사슬 · «옳지 않은 까닭» · 끝줄", () => {
    const josa: Record<string, string> = { "-2": "를", "-3": "을", "-4": "를" };
    each(SEEDS, (p) => {
      const { lead, letter, x0, sides } = paper(p.content);
      const { sol, values, whyGroups } = readSolution(p.solution);
      const ai = MARKS.indexOf(p.answer);
      expect(sol).toHaveLength(p.ask === "옳은 것" ? 4 : 3);
      // ⑴ 첫 줄 — «$x=-3$을 대입하면 ① …» 조사까지.
      expect(
        sol[0]!.startsWith(`$${letter}=${x0}$${josa[`${x0}`]} 대입하면 ① `),
        sol[0],
      ).toBe(true);
      expect(values.map((m) => m[1])).toEqual(MARKS);
      values.forEach((m, k) => {
        const v = literal(m[2]!);
        expect(v.d).toBe(1);
        expect(
          near(v.n, sides[k]!.value),
          `${sol[0]} ↔ ${sides[k]!.text}`,
        ).toBe(true);
      });
      // ⑵ 둘째 줄 — 정답 보기에 대입한 사슬. 음수는 괄호로 넣고, 걸음마다 그 식의 참값이다.
      const answer = sides[ai]!;
      expect(sol[1]!.startsWith(`${p.answer} $`), sol[1]).toBe(true);
      const chain = /\$([^$]+)\$이므로/.exec(sol[1]!)![1]!.split("=");
      expect(chain.length, sol[1]).toBeGreaterThanOrEqual(2);
      expect(chain[0], sol[1]).toContain(`\\left(${x0}\\right)`);
      expect(chain[0], sol[1]).not.toContain(letter);
      for (const step of chain)
        expect(near(floatOf(step), answer.value), `${step} ↔ ${sol[1]}`).toBe(
          true,
        );
      if (near(answer.value, answer.shown))
        expect(sol[1]!.endsWith("이므로 옳다."), sol[1]).toBe(true);
      else {
        const why = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
        expect(why, sol[1]).toBeDefined();
        checkReason(answer, letter, x0, why!);
      }
      // ⑶ «옳은 것» 물음 — 나머지 넷이 전부 까닭 줄에 한 번씩.
      const listed = whyGroups.flatMap((g) => g.marks).sort();
      const falses = MARKS.filter((_, k) => k !== ai).sort();
      expect(listed, sol.join(" / ")).toEqual(
        p.ask === "옳은 것" ? falses : [],
      );
      for (const g of whyGroups)
        for (const mark of g.marks)
          checkReason(sides[MARKS.indexOf(mark)]!, letter, x0, g.why);
      // ⑷ 끝줄 — 발문에서 «다음 중»과 물음표를 뗀 것.
      expect(sol.at(-1)).toBe(
        `따라서 ${lead.replace("다음 중 ", "").replace(/\?$/, "")} ${p.answer}이다.`,
      );
    });
  });

  it("음수를 대입할 때의 실수 다섯이 다 쓰이고, «결과의 부호를 반대로 씀»은 한 문항에 하나까지", () => {
    const seen = new Set<string>();
    each(600, (p) => {
      const { letter, x0, sides } = paper(p.content);
      const { sol, whyGroups } = readSolution(p.solution);
      const kinds: Kind[] = [];
      const note = (mark: string, why: string) => {
        seen.add(why);
        kinds.push(checkReason(sides[MARKS.indexOf(mark)]!, letter, x0, why));
      };
      const own = /이므로 옳지 않다\((.+)\)\.$/.exec(sol[1]!)?.[1];
      if (own) note(p.answer, own);
      for (const g of whyGroups) for (const mark of g.marks) note(mark, g.why);
      expect(kinds, p.solution).toHaveLength(p.ask === "옳지 않은 것" ? 1 : 4);
      expect(
        kinds.filter((k) => k === "부호").length,
        p.solution,
      ).toBeLessThanOrEqual(1);
    });
    expect([...seen].sort()).toEqual(
      [
        ...Object.keys(SLIP_OF),
        "결과의 부호를 반대로 씀",
        "계산 결과와 다름",
      ].sort(),
    );
  });
});

describe("㉤ 재시도 상한 · 변이", () => {
  const { q } = m1Rational;
  const style: CalcStyle = {
    lead: () => "$x=-2$일 때, 다음 중 식의 값이 옳지 않은 것은?",
    briefLead: "$x=-2$를 대입하면",
    maxPerTemplate: MAX_PER_TEMPLATE,
  };
  /** 틀이 전부 «일차»인 재료 — 식은 매번 다르다. */
  const linear = (i: number): Material => ({
    left: `${i + 2}x+${i + 1}`,
    value: q(-2 * (i + 2) + i + 1),
    shape: "식의 값",
    work: () => "$0$",
    mistakes: () => [],
    denominatorBound: 1,
    template: "일차",
  });

  it("같은 틀만 나오면 둘에서 멈춘다 — 상한에서 사유를 달고 던진다", () => {
    let i = 0;
    expect(() =>
      buildTruthBody(
        createRng(3),
        "옳지 않은 것",
        () => linear((i += 1)),
        style,
      ),
    ).toThrow(
      new RegExp(
        `재료 ${MAX_DRAWS}번 뽑기 초과\\(가장 많이 찬 꼴이 ${MAX_PER_TEMPLATE}개까지\\)`,
      ),
    );
  });

  it("틀 상한을 안 적으면 세지 않는다 — 같은 재료 다섯이 찬다(1단계의 짓기 그대로)", () => {
    let i = 0;
    const body = buildTruthBody(
      createRng(3),
      "옳지 않은 것",
      () => linear((i += 1)),
      { ...style, maxPerTemplate: undefined },
    );
    expect(body.options).toHaveLength(5);
  });

  it("🔴 변이 — 틀린 보기의 오른쪽을 참값으로 바꾸면 관문이 멈춘다(씨앗 80)", () => {
    const def = VALUE_JUDGES[0]!;
    for (let s = 0; s < 80; s += 1) {
      const ask: JudgeAsk = s % 2 === 0 ? "옳지 않은 것" : "옳은 것";
      const body = def.generate(createRng(SEED0 + s), ask);
      const env = envOf(body.lead);
      const wrong = body.options.findIndex((o) => !o.claimedTrue);
      const o = body.options[wrong]!;
      const mutated = o.text.replace(/=[^=]+\$$/, `=${mathOf(o.brief)}$`);
      expect(mutated).not.toBe(o.text);
      // 변이가 산출물을 실제로 바꾸는지 — 시험 셈으로 «거짓 → 참».
      const truth = (text: string) => {
        const [l, r] = mathOf(text).split("=");
        return near(floatOf(l!, env), literal(r!).n);
      };
      expect(truth(o.text)).toBe(false);
      expect(truth(mutated)).toBe(true);
      const options = body.options.map((x, i) =>
        i === wrong ? { ...x, text: mutated } : x,
      );
      expect(() =>
        assembleJudge(def, ask, { ...body, options }, createRng(s)),
      ).toThrow(/다시 재니/);
    }
  });

  it("🔴 변이 — 발문의 대입값만 바꾸면(보기는 그대로) 관문이 멈춘다", () => {
    const def = VALUE_JUDGES[0]!;
    for (let s = 0; s < 40; s += 1) {
      const body = def.generate(createRng(SEED0 + s), "옳지 않은 것");
      const x0 = Number(/=(-\d)\$/.exec(body.lead)![1]);
      const lead = body.lead.replace(`=${x0}$`, `=${x0 - 1}$`);
      expect(lead).not.toBe(body.lead);
      expect(() =>
        assembleJudge(def, "옳지 않은 것", { ...body, lead }, createRng(s)),
      ).toThrow(/다시 재니/);
    }
  });
});
