/**
 * **비교 문형의 등록부 관문** (2026-10-08 엔진 보강 2단계 — 합의안 §3-2 · §5 의 2단계).
 *
 * «나머지 넷과 다른 하나»는 **같은 값 넷**이 정답 구조다 — 참거짓 문형의 «값이 같은 보기 금지»와 부딪힌다.
 * 그래서 문형별로 따로 잰다: **식의 중복**(어느 문형이든 금지) · **값의 중복**(4+1 은 정확히 넷, 극값은 0) ·
 * **정답의 유일성**(4+1 은 혼자인 하나, 극값은 가장 큰/작은 하나).
 *
 * 살아 있는 등록부만 보면 «도장»이다 — 픽스처(`helpers/judgeFixture.ts`)로 관문을 직접 흔든다.
 *
 * ```
 * ㉠ 등록 검사 — 문형과 물음이 어긋나면 지을 때 던진다
 * ㉡ 4+1 — 다시 잰 값의 묶음이 정확히 4+1 · 정답이 혼자인 하나
 * ㉢ 4+1 변조 — 3+2 · 5+0 · 2+2+1 · 주장과 다름 · 식 겹침 · 못 읽음 · 발문 끝 · 해설 값
 * ㉣ 극값 — 다섯 값이 서로 다르고 정답이 가장 큰(작은) 하나
 * ㉤ 극값 변조 — 최댓값 동점 · 가운데 동점
 * ㉥ 보기 순열 — 정답 번호 · 해설 넉 줄이 보기와 같이 움직인다
 * ㉦ 지면의 발문 줄이 다시 재는 함수에 넘어간다(참거짓 문형도)
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import type {
  CompareAsk,
  CompareBody,
  CompareJudgeDefinition,
  CompareOption,
  JudgeReadContext,
} from "@/lib/middle/judge/contract";
import {
  assembleCompare,
  createJudgeRegistry,
} from "@/lib/middle/judge/registry";

import {
  COMPARE_LEAD,
  compareFixtureDefinition,
  compareFixtureValue,
  compareOption,
  fixtureDefinition,
} from "../helpers/judgeFixture";

const MARKS = ["①", "②", "③", "④", "⑤"];
const KEY = "중1|유리수의 덧셈과 뺄셈|fixture-compare";
const ODD: CompareAsk = "나머지 넷과 다른 하나";

/** 지면에서 보기 글을 다시 읽어 시험 쪽에서 값으로 — 등록부가 낸 `values` 를 믿지 않는다. */
const valuesOf = (content: string) =>
  content
    .split("\n")
    .slice(1)
    .map((l) => compareFixtureValue(l.slice(1).trim())!);

const body = (
  ask: CompareAsk,
  options: readonly CompareOption[],
  over: Partial<CompareBody> = {},
): CompareBody => ({
  lead: COMPARE_LEAD[ask],
  briefLead: "계산하면",
  options,
  facts: {},
  ...over,
});
const run = (ask: CompareAsk, b: CompareBody, seed = 7) =>
  assembleCompare(compareFixtureDefinition(), ask, b, createRng(seed));

/** 값이 10 인 식 넷 + 11 인 식 하나. */
const fourPlusOne = (): CompareOption[] => [
  compareOption(1, 10),
  compareOption(2, 8),
  compareOption(3, 7),
  compareOption(4, 6),
  compareOption(5, 5),
];

describe("㉠ 등록 검사 — 문형과 물음", () => {
  it("비교 문형에 참거짓 물음 · 참거짓 문형에 비교 물음이면 지을 때 던진다", () => {
    expect(() =>
      createJudgeRegistry([
        compareFixtureDefinition({
          asks: ["옳은 것"] as unknown as [CompareAsk],
        }),
      ]),
    ).toThrow(/물음.*문형/);
    expect(() =>
      createJudgeRegistry([
        fixtureDefinition({
          asks: ["가장 큰 것"] as unknown as ["옳은 것"],
        }),
      ]),
    ).toThrow(/물음.*문형/);
  });

  it("목록에 문형이 실린다 — 안 적은 등록은 참거짓", () => {
    const reg = createJudgeRegistry([
      fixtureDefinition(),
      compareFixtureDefinition(),
    ]);
    expect(reg.definitions().map((d) => [d.familyId, d.form])).toEqual([
      ["fixture-add", "truth"],
      ["fixture-compare", "compare"],
    ]);
  });
});

describe("㉡ 4+1 — 다시 잰 값의 묶음이 정확히 4+1", () => {
  const reg = createJudgeRegistry([compareFixtureDefinition({ asks: [ODD] })]);

  it("씨앗 300 — 묶음 4+1 · 정답이 혼자인 하나 · 식은 다섯 다 다르다", () => {
    const at = new Set<string>();
    for (let s = 0; s < 300; s += 1) {
      const p = reg.generate(KEY, 20261008 + s * 7919, s % 3);
      expect(p.form).toBe("compare");
      expect(p.ask).toBe(ODD);
      expect(p.truths).toEqual([]);
      const lines = p.content.split("\n");
      expect(lines[0]).toBe(COMPARE_LEAD[ODD]);
      expect(lines.slice(1).map((l) => l[0])).toEqual(MARKS);
      expect(new Set(lines.slice(1).map((l) => l.slice(1).trim())).size).toBe(
        5,
      );
      const vs = valuesOf(p.content);
      const count = new Map<number, number>();
      vs.forEach((v) => count.set(v, (count.get(v) ?? 0) + 1));
      expect([...count.values()].sort(), p.content).toEqual([1, 4]);
      const alone = vs.findIndex((v) => count.get(v) === 1);
      expect(p.answer).toBe(MARKS[alone]);
      expect(p.values).toEqual(vs.map(String));
      at.add(p.answer);
    }
    expect([...at].sort()).toEqual([...MARKS].sort());
  });

  it("같은 씨앗 · 같은 변형이면 글자까지 같다", () => {
    expect(reg.generate(KEY, 42, 1)).toEqual(reg.generate(KEY, 42, 1));
  });
});

describe("㉢ 4+1 변조 — 관문이 사유를 달고 멈춘다", () => {
  it("음성 대조 — 멀쩡한 4+1 은 지나간다", () => {
    expect(() => run(ODD, body(ODD, fourPlusOne()))).not.toThrow();
  });

  it("🔴 3+2 — 값이 다른 식이 둘이면 정답이 하나로 안 정해진다", () => {
    const o = fourPlusOne();
    o[1] = compareOption(2, 9); // 11 이 둘
    expect(() => run(ODD, body(ODD, o))).toThrow(/3\+2/);
  });

  it("🔴 5+0 — 다섯 값이 다 같으면 «다른 하나»가 없다", () => {
    const o = fourPlusOne();
    o[0] = compareOption(1, 9);
    expect(() => run(ODD, body(ODD, o))).toThrow(/5\+0/);
  });

  it("2+2+1 · 3+1+1 도 4+1 이 아니다", () => {
    const a = fourPlusOne();
    a[1] = compareOption(2, 9);
    a[2] = compareOption(3, 9); // 11·11·12·10·10
    expect(() => run(ODD, body(ODD, a))).toThrow(/2\+2\+1/);
    const b = fourPlusOne();
    b[1] = compareOption(2, 20);
    expect(() => run(ODD, body(ODD, b))).toThrow(/3\+1\+1/);
  });

  it("🔴 생성기의 주장과 지면이 다르면 멈춘다 — 주장만 4+1 이고 글은 3+2", () => {
    const o = fourPlusOne();
    // 주장은 10 인데 글은 2+9=11.
    o[1] = { ...compareOption(2, 8), text: "$2+9$" };
    expect(() => run(ODD, body(ODD, o))).toThrow(/다시 재니/);
  });

  it("주장부터 4+1 이 아니면 지면을 짓기 전에 멈춘다", () => {
    const o = fourPlusOne();
    o[1] = compareOption(2, 9);
    expect(() => run(ODD, body(ODD, o))).toThrow(/생성기가 주장한/);
  });

  it("식 겹침 · 보기 수 · 못 읽음 · 발문 끝 · 해설의 값", () => {
    const base = fourPlusOne();
    const dup = [...base];
    dup[2] = { ...dup[1]! };
    expect(() => run(ODD, body(ODD, dup))).toThrow(/겹친다/);
    expect(() => run(ODD, body(ODD, base.slice(0, 4)))).toThrow(/4개다/);
    const unread = [...base];
    unread[3] = { ...unread[3]!, text: "넷 더하기 여섯" };
    expect(() => run(ODD, body(ODD, unread))).toThrow(/다시 재지 못했다/);
    expect(() =>
      run(ODD, body(ODD, base, { lead: "다음 중 계산 결과가 다른 것은?" })),
    ).toThrow(/하나는\?/);
    // 해설 첫 줄에 서는 값이 그 보기의 값과 다르면 정답지가 거짓을 싣는다.
    const badBrief = [...base];
    badBrief[4] = { ...badBrief[4]!, brief: "$99$" };
    expect(() => run(ODD, body(ODD, badBrief))).toThrow(/해설.*값/);
    const noBrief = [...base];
    noBrief[4] = { ...noBrief[4]!, brief: "열" };
    expect(() => run(ODD, body(ODD, noBrief))).toThrow(/해설.*값/);
  });
});

describe("㉣ 극값 — 다섯 값이 서로 다르고 정답이 가장 큰(작은) 하나", () => {
  const reg = createJudgeRegistry([
    compareFixtureDefinition({ asks: ["가장 큰 것", "가장 작은 것"] }),
  ]);

  it("씨앗 300 × 물음 둘", () => {
    const asks = new Map<string, number>();
    const at = new Set<string>();
    for (let s = 0; s < 300; s += 1) {
      const p = reg.generate(KEY, 20261008 + s * 7919, s % 2);
      asks.set(p.ask, (asks.get(p.ask) ?? 0) + 1);
      const vs = valuesOf(p.content);
      expect(new Set(vs).size, p.content).toBe(5);
      const want = p.ask === "가장 큰 것" ? Math.max(...vs) : Math.min(...vs);
      expect(p.answer).toBe(MARKS[vs.indexOf(want)]);
      expect(p.content.split("\n")[0]).toBe(COMPARE_LEAD[p.ask as CompareAsk]);
      at.add(p.answer);
    }
    expect(asks.get("가장 큰 것")).toBe(150);
    expect(asks.get("가장 작은 것")).toBe(150);
    expect([...at].sort()).toEqual([...MARKS].sort());
  });
});

describe("㉤ 극값 변조 — 동점이면 멈춘다", () => {
  const five = (): CompareOption[] => [
    compareOption(1, 10),
    compareOption(2, 20),
    compareOption(3, 30),
    compareOption(4, 40),
    compareOption(5, 50),
  ];

  it("음성 대조", () => {
    expect(() => run("가장 큰 것", body("가장 큰 것", five()))).not.toThrow();
    expect(() =>
      run("가장 작은 것", body("가장 작은 것", five())),
    ).not.toThrow();
  });

  it("🔴 최댓값 동점 — 가장 큰 값이 둘이면 멈춘다", () => {
    const o = five();
    o[3] = compareOption(4, 51); // 55 가 둘
    expect(() => run("가장 큰 것", body("가장 큰 것", o))).toThrow(/동점/);
  });

  it("🔴 최솟값 동점", () => {
    const o = five();
    o[1] = compareOption(2, 9); // 11 이 둘
    expect(() => run("가장 작은 것", body("가장 작은 것", o))).toThrow(/동점/);
  });

  it("가운데 값이 같아도 멈춘다 — 다섯 값은 서로 달라야 한다", () => {
    const o = five();
    o[2] = compareOption(3, 19); // 22 가 둘, 극값은 그대로
    expect(() => run("가장 큰 것", body("가장 큰 것", o))).toThrow(/동점/);
  });

  it("지면에서만 동점이어도 멈춘다 — 주장은 서로 다른데 글이 같은 값", () => {
    const o = five();
    o[3] = { ...compareOption(4, 40), text: "$4+51$" };
    expect(() => run("가장 큰 것", body("가장 큰 것", o))).toThrow(/다시 재니/);
  });

  it("발문 끝 — 극값은 «…것은?»", () => {
    expect(() =>
      run(
        "가장 큰 것",
        body("가장 큰 것", five(), { lead: "가장 큰 값을 구하시오." }),
      ),
    ).toThrow(/것은\?/);
  });
});

describe("㉥ 보기 순열 — 정답 번호와 해설이 보기와 같이 움직인다", () => {
  it("4+1 — 첫 줄의 k 번째 값은 보기 k · 둘째 줄은 정답 보기의 계산 · 셋째 줄은 공통값", () => {
    const reg = createJudgeRegistry([
      compareFixtureDefinition({ asks: [ODD] }),
    ]);
    for (let s = 0; s < 200; s += 1) {
      const p = reg.generate(KEY, 1000 + s, 0);
      const vs = valuesOf(p.content);
      const sol = p.solution.split("\n");
      expect(sol).toHaveLength(4);
      expect(sol[0]).toBe(
        `계산하면 ${vs.map((v, i) => `${MARKS[i]} $${v}$`).join(", ")}이다.`,
      );
      const ai = MARKS.indexOf(p.answer);
      const choice = p.content.split("\n")[ai + 1]!.slice(1).trim();
      expect(sol[1]).toBe(
        `${p.answer} 더하면 ${choice.replace(/\$$/, "")}=${vs[ai]}$이다.`,
      );
      const common = vs[(ai + 1) % 5]!;
      expect(sol[2]).toBe(`나머지 넷은 모두 $${common}$이다.`);
      expect(sol[3]).toBe(
        `따라서 계산 결과가 나머지 넷과 다른 하나는 ${p.answer}이다.`,
      );
    }
  });

  it("극값 — 셋째 줄은 다섯 값을 작은 것부터 늘어놓는다", () => {
    const reg = createJudgeRegistry([
      compareFixtureDefinition({ asks: ["가장 큰 것", "가장 작은 것"] }),
    ]);
    for (let s = 0; s < 200; s += 1) {
      const p = reg.generate(KEY, 1000 + s, s % 2);
      const vs = valuesOf(p.content);
      const sol = p.solution.split("\n");
      expect(sol).toHaveLength(4);
      expect(sol[0]).toBe(
        `계산하면 ${vs.map((v, i) => `${MARKS[i]} $${v}$`).join(", ")}이다.`,
      );
      expect(sol[1]!.startsWith(`${p.answer} 더하면 $`)).toBe(true);
      expect(sol[2]).toBe(
        `크기를 비교하면 $${[...vs].sort((a, b) => a - b).join("<")}$이다.`,
      );
      expect(sol[3]).toBe(
        `따라서 계산 결과가 ${p.ask === "가장 큰 것" ? "가장 큰" : "가장 작은"} 것은 ${p.answer}이다.`,
      );
    }
  });
});

describe("㉦ 지면의 발문 줄이 다시 재는 함수에 넘어간다", () => {
  it("비교 문형 — `readValue` 가 받는 문맥은 지면 본문의 첫 줄이다", () => {
    const seen: JudgeReadContext[] = [];
    const def = compareFixtureDefinition({ asks: [ODD] });
    const spied: CompareJudgeDefinition = {
      ...def,
      readValue: (text, ctx) => {
        seen.push(ctx);
        return def.readValue(text, ctx);
      },
    };
    const reg = createJudgeRegistry([spied]);
    const p = reg.generate(KEY, 5, 0);
    expect(seen.length).toBeGreaterThanOrEqual(5);
    for (const c of seen) expect(c.lead).toBe(p.content.split("\n")[0]);
  });

  it("참거짓 문형 — `truthOf` 도 같은 문맥을 받는다", () => {
    const seen: JudgeReadContext[] = [];
    const def = fixtureDefinition();
    const reg = createJudgeRegistry([
      {
        ...def,
        truthOf: (text, ctx) => {
          seen.push(ctx);
          return def.truthOf(text, ctx);
        },
      },
    ]);
    const p = reg.generate("중1|유리수의 덧셈과 뺄셈|fixture-add", 5, 0);
    expect(p.form).toBe("truth");
    expect(p.values).toEqual([]);
    expect(seen).toHaveLength(5);
    for (const c of seen) expect(c.lead).toBe(p.content.split("\n")[0]);
  });

  it("발문에 «다음 중»이 가운데 있어도 끝줄이 선다 — «$x=-3$일 때, 다음 중 …»", () => {
    const o = fourPlusOne();
    const p = run(
      ODD,
      body(ODD, o, {
        lead: "$x=-3$일 때, 다음 중 식의 값이 나머지 넷과 다른 하나는?",
      }),
    );
    expect(p.solution.split("\n").at(-1)).toBe(
      `따라서 $x=-3$일 때, 식의 값이 나머지 넷과 다른 하나는 ${p.answer}이다.`,
    );
  });
});
