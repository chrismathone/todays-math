/**
 * **판정형 등록부의 계약** (2026-10-08 엔진 보강 0단계 — 합의안 §1 Q1 · §5).
 *
 * 살아 있는 등록부는 0단계에서 비어 있다 — 그것만 보면 모든 검사가 «공허하게 참»이다. 그래서
 * **픽스처 등록부**(`helpers/judgeFixture.ts`)를 지어 배선과 관문을 잰다.
 *
 * ```
 * ㉠ 열쇠 — familyKey · externalId 의 모양, 정확한 읽기(비슷한 열쇠를 «같다»고 안 읽는다)
 * ㉡ 등록 검사 — 꼴이 틀린 등록은 지을 때 던진다
 * ㉢ 관문 — 지면 글을 다시 재서 «다른 하나가 정확히 하나» · 생성기 주장과 같다
 * ㉣ 보기 순열 — 정답 번호와 해설이 보기와 같이 움직인다
 * ㉤ 재시도 상한 — 못 만들면 사유를 달고 멈춘다
 * ㉥ 출처 판정 — `mid:judge:` 는 중등 엔진 · 형식은 객관식
 * ```
 */
import { describe, expect, it } from "vitest";

import { createRng } from "@/lib/elementary/rng";
import {
  JUDGE_FAMILY_PREFIX,
  judgeExternalId,
  judgeFamilyKey,
  judgeKeyOf,
  parseJudgeExternalId,
  type JudgeBody,
} from "@/lib/middle/judge/contract";
import {
  assembleJudge,
  createJudgeRegistry,
  judgementDefinitions,
} from "@/lib/middle/judge/registry";
import { classifyFormat, classifyOrigin } from "@/lib/problem/provenance";

import { fixtureDefinition, fixtureTruth } from "../helpers/judgeFixture";

const MARKS = ["①", "②", "③", "④", "⑤"];
const KEY = "중1|유리수의 덧셈과 뺄셈|fixture-add";

describe("㉠ 열쇠", () => {
  it("판정키 · 문항류 · 적재 열쇠의 모양이 합의안 표 그대로다", () => {
    expect(judgeKeyOf(fixtureDefinition())).toBe(KEY);
    expect(judgeFamilyKey(KEY)).toBe(`mid:judge:${KEY}`);
    expect(
      judgeExternalId({
        judgeKey: KEY,
        ruleVersion: 1,
        seed: 20261008,
        variant: 2,
        questionType: "객관식",
      }),
    ).toBe(`engine-mid-judge:${KEY}|r1|s20261008|v2|객관식`);
  });

  it("적재 열쇠를 정확히 되읽는다 — 판정키 안의 «|» 도", () => {
    const id = `engine-mid-judge:${KEY}|r3|s-5|v0|객관식`;
    expect(parseJudgeExternalId(id)).toEqual({
      judgeKey: KEY,
      ruleVersion: 3,
      seed: -5,
      variant: 0,
      questionType: "객관식",
    });
  });

  it("🔴 판정형 열쇠가 아닌 것은 안 읽는다 — 접두사 · 꼬리가 다르면 null", () => {
    for (const id of [
      `engine-mid:${KEY}|r1|s1|v0|객관식`,
      `engine-mid-combo:${KEY}|r1|s1|v0|객관식`,
      `xengine-mid-judge:${KEY}|r1|s1|v0|객관식`,
      `engine-mid-judge:${KEY}|s1|v0|객관식`, // 규칙판 없음
      `engine-mid-judge:${KEY}|r1|s1|v0`, // 형식 없음
      `engine-mid-judge:${KEY}`,
      KEY,
    ])
      expect(parseJudgeExternalId(id), id).toBeNull();
  });
});

describe("㉡ 등록 검사 — 꼴이 틀린 등록은 지을 때 던진다", () => {
  it("겹치는 키", () => {
    expect(() =>
      createJudgeRegistry([fixtureDefinition(), fixtureDefinition()]),
    ).toThrow(/겹친다/);
  });

  it("familyId 가 열쇠 구분자·규칙판 꼬리를 흉내 낼 수 있으면", () => {
    for (const familyId of ["a|b", "calc|r1", "Calc", "calc_add", "", "-a"])
      expect(
        () => createJudgeRegistry([fixtureDefinition({ familyId })]),
        familyId,
      ).toThrow(/familyId/);
  });

  it("학년 · 소단원 · 규칙판 · 난이도 근거", () => {
    expect(() =>
      createJudgeRegistry([fixtureDefinition({ grade: "초3" })]),
    ).toThrow(/학년/);
    expect(() =>
      createJudgeRegistry([fixtureDefinition({ unitSection: "가|나" })]),
    ).toThrow(/소단원/);
    expect(() =>
      createJudgeRegistry([fixtureDefinition({ ruleVersion: 0 })]),
    ).toThrow(/규칙판/);
    expect(() =>
      createJudgeRegistry([fixtureDefinition({ difficultyBasis: " " })]),
    ).toThrow(/근거/);
  });

  it("등록 안 된 키를 부르면 던진다 — 조용히 다른 문항을 내지 않는다", () => {
    const reg = createJudgeRegistry([fixtureDefinition()]);
    expect(() => reg.generate(`${KEY}x`, 1)).toThrow(/등록되지 않은 판정형/);
    expect(reg.has(KEY)).toBe(true);
    expect(reg.has(`${KEY}x`)).toBe(false);
  });

  it("목록에는 문항류 열쇠 · 원천 · 난이도 · 규칙판이 실린다", () => {
    const [e] = createJudgeRegistry([fixtureDefinition()]).definitions();
    expect(e).toMatchObject({
      key: KEY,
      familyKey: `${JUDGE_FAMILY_PREFIX}${KEY}`,
      grade: "중1",
      unitSection: "유리수의 덧셈과 뺄셈",
      difficulty: "기본",
      ruleVersion: 1,
      sources: ["1-1|정수와 유리수의 계산|01"],
    });
  });

  it("살아 있는 등록부도 같은 검사를 지나 지어진다 — 키는 서로 다르고 열쇠 모양을 지킨다", () => {
    const live = judgementDefinitions();
    expect(new Set(live.map((d) => d.key)).size).toBe(live.length);
    for (const d of live) {
      expect(d.familyKey).toBe(`mid:judge:${d.key}`);
      const id = judgeExternalId({
        judgeKey: d.key,
        ruleVersion: d.ruleVersion,
        seed: 1,
        variant: 0,
        questionType: "객관식",
      });
      expect(parseJudgeExternalId(id)?.judgeKey).toBe(d.key);
    }
  });
});

describe("㉢ 관문 — 지면 글을 다시 잰다", () => {
  const reg = createJudgeRegistry([fixtureDefinition()]);

  it("씨앗 300 · 물음 둘 — 다시 잰 «다른 하나»가 정확히 하나이고 정답 번호가 그것이다", () => {
    const asks = new Set<string>();
    for (let s = 0; s < 300; s += 1) {
      const p = reg.generate(KEY, 20261008 + s * 7919, s % 4);
      asks.add(p.ask);
      const lines = p.content.split("\n").slice(1);
      expect(lines.map((l) => l[0])).toEqual(MARKS);
      // 시험 쪽에서 **따로** 다시 잰다 — 등록부가 낸 `truths` 를 믿지 않는다.
      const truths = lines.map((l) => fixtureTruth(l.slice(1).trim()));
      const odd = truths
        .map((t, i) =>
          (p.ask === "옳지 않은 것" ? t === false : t === true) ? i : -1,
        )
        .filter((i) => i >= 0);
      expect(odd, p.content).toHaveLength(1);
      expect(p.answer).toBe(MARKS[odd[0]!]);
      expect(p.truths).toEqual(truths);
    }
    expect([...asks].sort()).toEqual(["옳은 것", "옳지 않은 것"]);
  });

  it("같은 씨앗 · 같은 변형이면 글자까지 같다", () => {
    expect(reg.generate(KEY, 42, 1)).toEqual(reg.generate(KEY, 42, 1));
  });

  const body = (over: Partial<JudgeBody> = {}): JudgeBody => ({
    lead: "다음 중 계산이 옳지 않은 것은?",
    options: [
      { text: "$1+2=4$", claimedTrue: false, explain: "가" },
      { text: "$1+3=4$", claimedTrue: true, explain: "나" },
      { text: "$2+3=5$", claimedTrue: true, explain: "다" },
      { text: "$4+4=8$", claimedTrue: true, explain: "라" },
      { text: "$5+1=6$", claimedTrue: true, explain: "마" },
    ],
    facts: {},
    ...over,
  });
  const run = (
    b: JudgeBody,
    ask: "옳지 않은 것" | "옳은 것" = "옳지 않은 것",
  ) => assembleJudge(fixtureDefinition(), ask, b, createRng(7));

  it("음성 대조 — 멀쩡한 산출물은 지나간다", () => {
    expect(() => run(body())).not.toThrow();
  });

  it("🔴 «거짓» 이라 주장한 보기가 실제로는 참이면 멈춘다 (거짓 보기를 참으로)", () => {
    const b = body();
    const options = [...b.options];
    options[0] = { ...options[0]!, text: "$1+2=3$" }; // 주장은 그대로 거짓
    expect(() => run({ ...b, options })).toThrow(/다시 재니/);
  });

  it("🔴 «참» 이라 주장한 보기가 실제로는 거짓이어도 멈춘다", () => {
    const b = body();
    const options = [...b.options];
    options[1] = { ...options[1]!, text: "$1+3=5$" };
    expect(() => run({ ...b, options })).toThrow(/다시 재니/);
  });

  it("주장한 «다른 하나»가 둘이거나 없으면 멈춘다", () => {
    const b = body();
    const two = [...b.options];
    two[1] = { text: "$1+3=9$", claimedTrue: false, explain: "나" };
    expect(() => run({ ...b, options: two })).toThrow(/정확히 하나/);
    const none = b.options.map((o) => ({
      ...o,
      text: o.text.replace("1+2=4", "1+2=3"),
      claimedTrue: true,
    }));
    expect(() => run({ ...b, options: none })).toThrow(/정확히 하나/);
  });

  it("보기 다섯 · 겹침 · 못 읽음 · 발문 끝", () => {
    const b = body();
    expect(() => run({ ...b, options: b.options.slice(0, 4) })).toThrow(
      /4개다/,
    );
    const dup = [...b.options];
    dup[2] = { ...dup[1]! };
    expect(() => run({ ...b, options: dup })).toThrow(/겹친다/);
    const unread = [...b.options];
    unread[3] = { ...unread[3]!, text: "넷 더하기 넷은 여덟" };
    expect(() => run({ ...b, options: unread })).toThrow(/다시 재지 못했다/);
    expect(() => run({ ...b, lead: "다음 계산을 하시오." })).toThrow(/것은\?/);
  });

  it("«옳은 것» 물음은 참이 정확히 하나여야 한다", () => {
    const b = body({
      lead: "다음 중 계산이 옳은 것은?",
      options: [
        { text: "$1+2=3$", claimedTrue: true, explain: "가" },
        { text: "$1+3=5$", claimedTrue: false, explain: "나" },
        { text: "$2+3=6$", claimedTrue: false, explain: "다" },
        { text: "$4+4=9$", claimedTrue: false, explain: "라" },
        { text: "$5+1=7$", claimedTrue: false, explain: "마" },
      ],
    });
    const p = run(b, "옳은 것");
    expect(p.content.split("\n")[MARKS.indexOf(p.answer) + 1]).toContain(
      "1+2=3",
    );
  });
});

describe("㉣ 보기 순열 — 정답 번호와 해설이 보기와 같이 움직인다", () => {
  it("정답 자리가 다섯 곳에 다 나오고, 해설 줄 k 는 보기 k 의 해설이다", () => {
    const reg = createJudgeRegistry([fixtureDefinition()]);
    const seen = new Set<string>();
    for (let s = 0; s < 200; s += 1) {
      const p = reg.generate(KEY, 1000 + s, 0);
      seen.add(p.answer);
      const choices = p.content.split("\n").slice(1);
      const sol = p.solution.split("\n");
      expect(sol).toHaveLength(6);
      choices.forEach((line, i) => {
        // 픽스처의 해설은 그 보기의 식을 다시 적는다 — 보기와 해설이 같은 줄을 가리키는지 본다.
        const [, a, b] = /^\S+ \$(\d+)\+(\d+)=/.exec(line)!;
        expect(sol[i], `${line} ↔ ${sol[i]}`).toMatch(
          new RegExp(`^${MARKS[i]} \\$${a}\\+${b}=`),
        );
      });
      const ansLine = sol[MARKS.indexOf(p.answer)]!;
      expect(ansLine).toContain("옳지 않다");
      expect(sol[5]).toBe(`따라서 계산이 옳지 않은 것은 ${p.answer}이다.`);
    }
    expect([...seen].sort()).toEqual([...MARKS].sort());
  });
});

describe("㉤ 재시도 상한 — 못 만들면 사유를 달고 멈춘다", () => {
  it("생성기가 던지면 판정키 · 씨앗 · 변형 · 사유를 실어 다시 던진다", () => {
    const reg = createJudgeRegistry([
      fixtureDefinition({
        generate: () => {
          throw new Error("보기 다섯을 같은 꼴로 못 채웠다 — 재시도 60회 초과");
        },
      }),
    ]);
    expect(() => reg.generate(KEY, 77, 3)).toThrow(
      /fixture-add \(씨앗 77 · v3 · 옳은 것\) 를 못 만들었다 — 보기 다섯을 같은 꼴로 못 채웠다 — 재시도 60회 초과/,
    );
  });
});

describe("㉥ 출처 판정 — `mid:judge:` 는 중등 엔진 · 형식은 객관식", () => {
  it("classifyOrigin · classifyFormat", () => {
    const p = createJudgeRegistry([fixtureDefinition()]).generate(KEY, 5, 0);
    expect(
      classifyOrigin({
        source: "manual",
        familyKey: p.familyKey,
        answer: p.answer,
        questionType: "객관식",
        problemType: "계산",
        content: p.content,
        originProblemId: null,
        figureUrls: [],
        figureSvg: null,
      }),
    ).toBe("middle_engine");
    expect(
      classifyFormat({
        familyKey: p.familyKey,
        answer: p.answer,
        questionType: "객관식",
        problemType: "계산",
        content: p.content,
      }),
    ).toBe("multiple_choice");
  });
});
