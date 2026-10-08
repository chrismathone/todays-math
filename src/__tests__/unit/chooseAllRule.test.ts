/**
 * 「모두 고르시오」의 정답은 **정확히 2개** — 규칙 + 그 규칙이 지금 잡는 집합을 잠근다.
 * (원장님 지시 2026-08-25, D-79)
 *
 * ## 무엇이 이 시험을 «장식»으로 만들 수 있나
 *
 * ㉠ **축이 없으면 변이시킬 수 없다.** 판정기가 한 건도 안 잡으면 「전부 2개다」가
 *    공짜로 초록이 된다. 그래서 **몇 유형·몇 건을 잡았는지에 바닥을 깐다** —
 *    유형이 사라지거나 발문이 바뀌어 판정 밖으로 나가면 여기가 먼저 빨개진다.
 * ㉡ **참이 제품에서 오면 안 된다.** 기대값 `2` 를 `CHOOSE_ALL_ANSWER_COUNT` 에서
 *    가져오면 그 상수를 3으로 바꿔도 초록이다. 그래서 **숫자 2를 리터럴로 못 박고**,
 *    상수가 그와 다르면 그 자리에서 빨개지게 한다.
 * ㉢ **음성 대조군이 없으면 지어냄이 0으로 보인다**(2026-08-20). 「모두 몇 개인지
 *    구하시오」·「가장 큰 것을 고르시오」·「…을 모두 쓰시오」를 **일부러** 대어
 *    판정기가 «아니오»를 낼 수 있음을 회차마다 보인다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  generateElementaryProblem,
  elementaryUnits,
  supportedTiers,
} from "@/lib/elementary/generate";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  answerShape,
  assertChooseAllAnswerCount,
  choiceLineCount,
  chooseAllAnswerCount,
  CHOOSE_ALL_ANSWER_COUNT,
  instructionTail,
  isChooseAll,
  UNCOUNTABLE,
} from "@/lib/problem/chooseAllRule";

/** 🔴 기대값은 **리터럴**이다 — 제품 상수를 그대로 쓰면 상수를 바꿔도 초록이다. */
const EXPECTED = 2;

/** 중등 엔진 훑기 — 브리프가 요구한 씨앗 수(≥200). */
const SEEDS = 200;
const SEED0 = 20260825;
const SEED_STEP = 7919;

const choiceBlock = [
  "① $2x+1>3$",
  "② $x=4$",
  "③ $x^2\\ge0$",
  "④ $3x-2$",
  "⑤ $x+1\\le7$",
].join("\n");

describe("「모두 고르시오」 판정기", () => {
  it("제품 상수가 원장님 확정값과 같다", () => {
    expect(CHOOSE_ALL_ANSWER_COUNT).toBe(EXPECTED);
  });

  it("보기에서 여럿을 고르는 발문을 잡는다 (양성 대조군)", () => {
    for (const stem of [
      "다음 보기 중 부등식인 것을 모두 고르시오.",
      "다음 보기에서 옳은 것을 모두 고르시오.",
      "이차함수의 그래프에 대한 다음 보기의 설명 중 옳은 것을 모두 고르시오.",
      "다음 중 옳은 것을 모두 고르면?",
    ]) {
      expect(isChooseAll(`${stem}\n${choiceBlock}`), stem).toBe(true);
    }
  });

  it("정답이 하나인 부류는 안 잡는다 (음성 대조군)", () => {
    // ⚠️ 첫 둘이 이 시험의 핵심이다 — 낱말 「모두」로 묶으면 여기가 빨개진다.
    for (const stem of [
      "다음 보기의 설명 중 옳은 것은 모두 몇 개인지 구하시오.",
      "$30$ 이상 $40$ 이하인 수를 모두 쓰시오.",
      "다음 보기의 설명 중 옳지 않은 것을 고르시오.",
      "두 분수 가운데 큰 것을 고르시오.",
    ]) {
      expect(isChooseAll(`${stem}\n${choiceBlock}`), stem).toBe(false);
    }
  });

  it("「모두」가 「고르」보다 **뒤**면 같은 문장이 아니다 (음성 대조군)", () => {
    // 2026-08-25 변이 시험이 찾아 준 구멍 — 이 자리를 가르는 픽스처가 **없었다.**
    // 순서 요구를 지워도 위 대조군은 전부 그대로라 시험이 초록이었다.
    expect(
      isChooseAll(
        `가장 큰 것을 고르시오. 그리고 그 수의 약수를 모두 쓰시오.\n${choiceBlock}`,
      ),
    ).toBe(false);
  });

  /**
   * 🔴 ㄱㄴㄷ **조합형**은 정답이 **하나**다 — «옳은 것을 모두 고른 것»(조합 하나)을 고른다
   * (2026-10-08 엔진 보강 3자 합의 §3-1 · 0단계).
   *
   * ⚠️ 합의안이 적은 예문 «옳은 것을 모두 **고른** 것은?» 은 이 규칙이 **이미** 안 잡는다 —
   *    «고른»(U+B978)은 «고르»(U+B974)를 품지 않는다(2026-10-08 실측). 진짜로 새던 자리는 둘이다:
   *    ⑴ 같은 문장에 «…모두 고른 것을 **고르시오**» 처럼 고르는 지시가 한 번 더 붙은 것
   *    ⑵ 발문은 «모두 고르면?» 인데 **보기가 ㄱㄴㄷ 조합**인 것(보기 하나가 조합 하나다)
   */
  describe("ㄱㄴㄷ 조합형 — 조합 하나를 고르는 발문은 «모두 고르기»가 아니다", () => {
    const box = "> <보기>\n> ㄱ. 첫째 진술\n> ㄴ. 둘째 진술\n> ㄷ. 셋째 진술";
    const jamo = ["① ㄱ", "② ㄴ", "③ ㄱ, ㄴ", "④ ㄴ, ㄷ", "⑤ ㄱ, ㄴ, ㄷ"].join(
      "\n",
    );
    const circled = [
      "① ㉠",
      "② ㉡",
      "③ ㉠, ㉡",
      "④ ㉡, ㉢",
      "⑤ ㉠, ㉡, ㉢",
    ].join("\n");
    const paren = [
      "① (가)",
      "② (나)",
      "③ (가), (나)",
      "④ (나), (다)",
      "⑤ (가), (나), (다)",
    ].join("\n");

    it("⑴ «모두 고른 것을 고르시오» — 고르는 지시가 한 번 더 붙어도 조합 하나다", () => {
      const content = `보기에서 옳은 것을 모두 고른 것을 고르시오.\n${box}\n${jamo}`;
      expect(isChooseAll(content)).toBe(false);
      // 그래서 관문이 정답 하나를 막지 않는다.
      expect(() =>
        assertChooseAllAnswerCount(content, "③", "시험"),
      ).not.toThrow();
      // 🔴 보기가 «ㄱ과 ㄴ» 처럼 이름표 조합으로 **안 읽히는** 꼴이어도 구절만으로 가른다 —
      //    위 예문은 보기 규칙(⑵)에도 걸려 구절 규칙을 못 잰다(2026-10-08 변이 [5] 가 «판정 거부»였다).
      const joined = [
        "① ㄱ",
        "② ㄱ과 ㄴ",
        "③ ㄴ과 ㄷ",
        "④ ㄱ과 ㄷ",
        "⑤ ㄱ, ㄴ과 ㄷ",
      ].join("\n");
      expect(
        isChooseAll(
          `보기에서 옳은 것을 모두 고른 것을 고르시오.\n${box}\n${joined}`,
        ),
      ).toBe(false);
      // 음성 대조 — 같은 보기라도 구절이 없으면 «모두 고르시오»는 그대로 잡는다.
      expect(
        isChooseAll(`보기에서 옳은 것을 모두 고르시오.\n${box}\n${joined}`),
      ).toBe(true);
      // «바르게» 가 사이에 끼어도 같다.
      expect(
        isChooseAll(
          `보기에서 옳은 것을 모두 바르게 고른 것을 고르시오.\n${box}\n${jamo}`,
        ),
      ).toBe(false);
    });

    it("⑵ 보기가 ㄱㄴㄷ 조합이면 «모두 고르면?» 이어도 조합 하나를 고른다", () => {
      for (const choices of [jamo, circled, paren]) {
        const content = `다음 보기 중 옳은 것을 모두 고르면?\n${box}\n${choices}`;
        expect(isChooseAll(content), choices.split("\n")[2]).toBe(false);
      }
    });

    it("이미 안 잡던 꼴은 그대로다 — «모두 고른 것은?» · «있는 대로 고른 것은?»", () => {
      for (const stem of [
        "<보기>에서 옳은 것을 모두 고른 것은?",
        "옳은 것만을 있는 대로 고른 것은?",
      ]) {
        expect(isChooseAll(`${stem}\n${box}\n${jamo}`), stem).toBe(false);
      }
    });

    it("음성 대조 — 보기가 **진술·식**이면 «모두 고르면?» 은 여전히 모두 고르기다", () => {
      // 위 둘을 넓게 걸면 진짜 «모두 고르기»까지 놓친다. 가르는 축은 «보기가 조합인가»다.
      expect(
        isChooseAll(`다음 중 옳은 것을 모두 고르면?\n${choiceBlock}`),
      ).toBe(true);
      expect(
        isChooseAll(
          `다음 보기 중 옳은 것을 모두 고르시오.\n${box}\n${choiceBlock}`,
        ),
      ).toBe(true);
      // 보기 가운데 하나만 조합처럼 생겼으면 조합형이 아니다 — 전부여야 한다.
      const mixed = ["① ㄱ", "② $x=4$", "③ ㄱ, ㄴ", "④ ㄴ", "⑤ ㄷ"].join("\n");
      expect(isChooseAll(`다음 중 옳은 것을 모두 고르면?\n${mixed}`)).toBe(
        true,
      );
      // «모두 고른 것»을 지워도 그 뒤에 진짜 «모두 고르시오» 가 남으면 잡는다.
      expect(
        isChooseAll(
          `ㄱ을 모두 고른 것과 같이, 옳은 것을 모두 고르시오.\n${choiceBlock}`,
        ),
      ).toBe(true);
    });
  });

  it("「모두 고르시오」라 적혀 있어도 고를 보기가 없으면 안 잡는다", () => {
    // 본문 밖 열쇠 ㉢ — 낱말 둘만으로는 이것을 못 가른다.
    expect(isChooseAll("다음 중 옳은 것을 모두 고르시오.")).toBe(false);
    expect(isChooseAll("다음 중 옳은 것을 모두 고르시오.\n① $x>1$")).toBe(
      false,
    );
  });

  it("정답 개수는 보기 표식으로만 센다 — 못 세면 «판정 불가»", () => {
    expect(chooseAllAnswerCount("①, ②")).toBe(2);
    expect(chooseAllAnswerCount("③")).toBe(1);
    expect(chooseAllAnswerCount("①, ③, ④, ⑤")).toBe(4);
    expect(chooseAllAnswerCount("㉠, ㉡")).toBe(2);
    // 0 으로 뭉개지 않는다 — 「없다」와 「못 센다」는 다른 말이다.
    expect(chooseAllAnswerCount("$x=3$, $y=4$")).toBe(UNCOUNTABLE);
  });

  it("정답 «모양» 축은 «여러 부분으로 된 한 답»을 개수로 읽지 않는다", () => {
    // 연립방정식의 해는 답이 **하나**다. 「조각」으로 이름이 달라야 표에서 안 섞인다.
    expect(answerShape("$x=3$, $y=4$")).toEqual({ kind: "조각", n: 2 });
    expect(answerShape("$1,\\ 2,\\ 8,\\ 16$")).toEqual({ kind: "나열", n: 4 });
    expect(answerShape("①, ②")).toEqual({ kind: "표식", n: 2 });
    expect(answerShape("$24$")).toEqual({ kind: "단일", n: 1 });
    // 좌표의 쉼표는 나열이 아니다.
    expect(answerShape("$(5, 8)$")).toEqual({ kind: "단일", n: 1 });
  });

  it("발문 꼬리는 보기 줄을 걷어내고 마지막 지시 문장을 본다", () => {
    expect(
      instructionTail(
        `다음 보기 중 부등식인 것을 모두 고르시오.\n${choiceBlock}`,
      ),
    ).toBe("… 보기 중 부등식인 것을 모두 고르시오.");
    expect(choiceLineCount(`발문\n${choiceBlock}`)).toBe(5);
  });
});

describe("관문 assertChooseAllAnswerCount", () => {
  it("정답이 2개가 아니면 던진다", () => {
    const content = `다음 보기 중 부등식인 것을 모두 고르시오.\n${choiceBlock}`;
    expect(() =>
      assertChooseAllAnswerCount(content, "①, ②, ③", "시험"),
    ).toThrow(/3개짜리/);
    expect(() => assertChooseAllAnswerCount(content, "①", "시험")).toThrow(
      /1개짜리/,
    );
    expect(() =>
      assertChooseAllAnswerCount(content, "$x=3$, $y=4$", "시험"),
    ).toThrow(/셀 수 없는/);
  });

  it("정답이 2개면 지나간다 — 그리고 다른 부류는 아예 안 본다 (음성 대조군)", () => {
    const content = `다음 보기 중 부등식인 것을 모두 고르시오.\n${choiceBlock}`;
    expect(() =>
      assertChooseAllAnswerCount(content, "②, ⑤", "시험"),
    ).not.toThrow();
    // 「모두 몇 개인지」는 정답이 하나여도 통과해야 한다.
    expect(() =>
      assertChooseAllAnswerCount(
        `옳은 것은 모두 몇 개인지 구하시오.\n${choiceBlock}`,
        "$3$",
        "시험",
      ),
    ).not.toThrow();
  });
});

describe("관문이 **엔진 진입점에 배선돼 있다**", () => {
  /**
   * ⚠️ 이것은 **텍스트 검사**다 — 이 저장소가 「LOOP 가 있나」로 데인 부류다
   * (2026-08-18). 그때의 결함은 «흔한 낱말»을 셌다는 것이었다. 여기서는
   * 그 함수 이름이 저장소에서 이 두 자리와 규칙 모듈·발견기에만 나오고,
   * **호출의 모양 그대로**(`(content, …)`) 를 찾는다.
   *
   * 왜 행동으로 못 재나: 관문이 무는 것은 «규칙을 어긴 생성기»인데, 지금은
   * 열한 유형이 모두 규칙을 지키므로 그런 산출물이 **하나도 없다.** 관문 자체의
   * 행동은 위 `assertChooseAllAnswerCount` 시험이 직접 부르며 재고, 여기서는
   * 「그 관문이 **나가는 자리에 걸려 있나**」만 본다. 지우면 빨개진다.
   */
  it("중등·초등 엔진이 나가는 자리에서 관문을 부른다", () => {
    const middle = readFileSync(
      resolve(__dirname, "../../lib/middle/generate.ts"),
      "utf-8",
    );
    const elem = readFileSync(
      resolve(__dirname, "../../lib/elementary/generate.ts"),
      "utf-8",
    );
    expect(middle).toContain("assertChooseAllAnswerCount(content, p.answer,");
    expect(elem).toContain("assertChooseAllAnswerCount(content, p.answer,");
  });
});

describe(`중등 엔진 — 「모두 고르시오」는 언제나 정답 ${EXPECTED}개 (씨앗 ${SEEDS})`, () => {
  const perType = new Map<string, number[]>();
  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      const p = generateMiddleProblem(t.key, SEED0 + s * SEED_STEP);
      if (!isChooseAll(p.content)) continue;
      const arr = perType.get(t.key) ?? [];
      arr.push(chooseAllAnswerCount(p.answer));
      perType.set(t.key, arr);
    }
  }
  const total = [...perType.values()].reduce((a, b) => a + b.length, 0);

  it("훑기가 실제로 그 부류를 만났다 — 축이 있어야 변이시킬 수 있다", () => {
    // 실측 2026-08-25: 11유형 × 씨앗마다 1건 = 2,200건. 유형이 줄거나 발문이
    // 판정 밖으로 나가면 여기가 **먼저** 빨개진다(그때 «전부 2개»는 공짜 초록이다).
    expect(perType.size).toBeGreaterThanOrEqual(11);
    expect(total).toBeGreaterThanOrEqual(11 * SEEDS);
  });

  it(`정답이 ${EXPECTED}개가 아닌 산출물이 하나도 없다`, () => {
    const bad: string[] = [];
    for (const [key, counts] of perType) {
      for (const n of counts) {
        if (n !== EXPECTED) {
          bad.push(`${key} → ${n === UNCOUNTABLE ? "판정불가" : `${n}개`}`);
        }
      }
    }
    const summary = [...new Set(bad)].slice(0, 12).join(" · ");
    expect(bad.length, `어긋난 산출물 ${bad.length}건: ${summary}`).toBe(0);
  });
});

describe("초등 엔진 — 「모두 고르시오」 부류를 내지 않는다", () => {
  it("소단원 전량 × 갈래 × 씨앗 12 에서 0건 (내기 시작하면 여기가 빨개진다)", () => {
    const seeds = 12;
    const hits: string[] = [];
    let generated = 0;
    for (const unit of elementaryUnits()) {
      const tiers = supportedTiers(unit);
      const asks =
        tiers.length > 0 ? tiers.map((t) => t) : [undefined as undefined];
      for (const tier of asks) {
        for (let s = 0; s < seeds; s += 1) {
          const p = generateElementaryProblem(
            unit,
            SEED0 + s * SEED_STEP,
            tier,
          );
          generated += 1;
          if (isChooseAll(p.content)) {
            hits.push(`${unit.grade} ${unit.section} ${tier ?? ""}`);
          }
        }
      }
    }
    // 분모를 같이 잠근다 — 훑기가 조용히 줄면 «0건»이 «못 셈»이 된다.
    expect(generated).toBeGreaterThanOrEqual(230 * seeds);
    expect([...new Set(hits)]).toEqual([]);
  });
});
