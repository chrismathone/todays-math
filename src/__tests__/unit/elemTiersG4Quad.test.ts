/**
 * 초4 2-4 「사각형」 4단 확대 (D-72) — 소단원 셋(2-4-4 사다리꼴 · 2-4-6 마름모 · 2-4-7 여러 가지).
 *
 * **참은 발문에서 온다.** 발문에 실린 길이를 뽑아 답을 **독립 재도출**한다 — 생성기를
 * 되부르지 않고 제품 상수도 안 쓴다.
 *
 * 이 트랜치가 지켜야 하는 것 —
 *  ㉠ **그 네 변으로 사다리꼴이 실제로 그려져야 한다.** 평행한 두 변의 **차**를 밑변으로
 *     삼고 나머지 두 변을 두 변으로 하는 삼각형이 서야 한다(`|a-b| < 차 < a+b`).
 *     첫 판이 `11, 4, 14, 8` 을 냈다 — 네 수의 합도 맞고 「한 쌍만 평행」도 맞는데
 *     **그런 사다리꼴은 없다.** 산술이 옳아 **값 검산으로는 구조적으로 안 잡힌다.**
 *     2-2-1 의 겹친 삼각형 $(10,5,5)$ 와 **같은 부류**다. 전량으로 잰다.
 *  ㉡ **이름이 하나로 정해져야 한다.** 포함 관계 때문에 「가진 성질」만 나열하면 안 갈린다 —
 *     「두 쌍 평행 + 이웃한 두 변이 다름」은 **직사각형도** 만족한다(첫 판의 결함).
 *     그래서 2-4-7 2단은 «아닌 것»을 함께 말한다. 그 배제절이 있는지 전량으로 잰다.
 *  ㉢ **「예/아니요」 문형을 한 갈래도 안 쓴다.** 표준 2-4-4·2-4-7 이 그 문형을 셋 쓰므로
 *     낱말만 바꾸면 「상수만 바꾼 것은 같은 문항」(R5)이 된다. 전량으로 막는다.
 *  ㉣ **분모를 같이 센다.** 100% 는 **분모가 0일 때도 100%** 다.
 *
 * ⚠️ **그림은 이 트랜치에 없다.** 엔진의 «그린 도형이 라벨과 무관하게 고정» 결함이
 * 안 고쳐졌다(실측 2026-08-23). 그림 세션이 「값을 적으면 던지게」를 넣는 중이고
 * 그게 서면 실수로 치수를 적어도 조용히 안 나간다 — 그때 얹는다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS, type ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["2-4-4", "2-4-6", "2-4-7"] as const;
const SWEEP = Array.from({ length: 600 }, (_, i) => i * 7919 + 13);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `초4 ${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier?: ElemTier) {
  return generateElementaryProblem(unitOf(code), seed, tier);
}

/* ─────────────────────── 도구 (제품을 안 쓴다) ─────────────────────── */

/** `$12\,\mathrm{cm}$` 에서 $12$ 를 나온 차례대로. */
const cmsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) => Number(m[1]));

/** `$3$가지` 에서 $3$ 을. */
const countIn = (t: string): number | null => {
  const m = t.match(/\$(\d+)\$가지/);
  return m ? Number(m[1]) : null;
};

/**
 * 그 네 변으로 **사다리꼴이 그려지는가** — 제품 `isTrapezoid` 를 부르지 않고 다시 정한다.
 * 제품 함수를 부르면 그 함수가 틀렸을 때 시험도 같이 틀린다(동어반복).
 */
function drawableTrapezoid(
  parallelA: number,
  parallelB: number,
  legA: number,
  legB: number,
): boolean {
  const gap = Math.abs(parallelA - parallelB);
  return gap > 0 && Math.abs(legA - legB) < gap && gap < legA + legB;
}

/** 수를 지운 뼈대 — 「상수만 바꾼 것은 같은 문항」(R5). */
function skeleton(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, "§")
    .replace(/§(\s*[,·]\s*§)+/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

/** 전량 검사의 **분모**를 같이 센다 — 0을 보고 「전부 통과」라고 읽지 않게. */
function counted(n: number, why: string) {
  expect(
    n,
    `${why} — 본 것이 0건이면 이 검사는 아무것도 안 지킨다`,
  ).toBeGreaterThan(0);
}

/** 포함 관계의 **정본** — 제품 표를 안 읽고 여기서 다시 적는다. */
const ALSO: Record<string, string[]> = {
  정사각형: ["사다리꼴", "평행사변형", "마름모", "직사각형"],
  마름모: ["사다리꼴", "평행사변형"],
  직사각형: ["사다리꼴", "평행사변형"],
  평행사변형: ["사다리꼴"],
};

/* ─────────────────────── 등록·겹침 ─────────────────────── */

describe("[초4 2-4] 등록", () => {
  it("세 소단원에 네 갈래가 다 붙어 있다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual([...ELEM_TIERS]);
    }
  });

  it("표준과 뼈대가 겹치는 갈래가 없다 (R5)", () => {
    let looked = 0;
    for (const code of CODES) {
      const std = new Set(SWEEP.map((s) => skeleton(gen(code, s).content)));
      expect(std.size, `${code} 표준 뼈대`).toBeGreaterThan(0);
      for (const tier of ELEM_TIERS) {
        for (const s of SWEEP) {
          const k = skeleton(gen(code, s, tier).content);
          expect(
            std.has(k),
            `${code} «${tier}» 가 표준과 같은 뼈대: ${k}`,
          ).toBe(false);
          looked += 1;
        }
      }
    }
    counted(looked, "표준 겹침");
  });

  it("갈래마다 변형이 여덟 가지 이상이다 (R4)", () => {
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        const forms = new Set(SWEEP.map((s) => gen(code, s, tier).content));
        expect(forms.size, `${code} «${tier}» 변형`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("**「예/아니요」 문형을 한 갈래도 안 쓴다** (㉢)", () => {
    // 표준 2-4-4·2-4-7 이 그 문형을 셋 쓴다 — 낱말만 바꾸면 R5 가 말하는 그 자리다.
    let looked = 0;
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const s of SWEEP) {
          const c = gen(code, s, tier).content;
          expect(c, `${code} «${tier}»`).not.toContain("아니요");
          expect(c, `${code} «${tier}»`).not.toContain("할 수 있는가? 맞으면");
          looked += 1;
        }
      }
    }
    counted(looked, "문형 전량");
  });
});

/* ─────────────────────── 2-4-4 사다리꼴 ─────────────────────── */

describe("[초4 2-4-4] 사다리꼴", () => {
  it("**1단 — 그 네 변으로 사다리꼴이 실제로 그려진다** (㉠)", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-4", s, "연산");
      const [pa, pb, la, lb] = cmsIn(p.content);
      expect(cmsIn(p.content).length, `씨앗 ${s}`).toBe(4);
      expect(
        drawableTrapezoid(pa!, pb!, la!, lb!),
        `씨앗 ${s}: 그릴 수 없는 사다리꼴 — ${p.content}`,
      ).toBe(true);
      expect(cmsIn(p.answer)[0], `씨앗 ${s}`).toBe(pa! + pb! + la! + lb!);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("2단 — 이름이 사다리꼴이고 네 변의 합이 맞는다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-4", s, "기본");
      const sides = cmsIn(p.content);
      expect(sides.length, `씨앗 ${s}`).toBe(4);
      expect(p.answer.startsWith("사다리꼴,"), `씨앗 ${s}: ${p.answer}`).toBe(
        true,
      );
      expect(cmsIn(p.answer)[0], `씨앗 ${s}`).toBe(
        sides.reduce((a, b) => a + b, 0),
      );
      // 발문이 적는 차례는 «평행, 나머지, 평행, 나머지» 다 — 그 짝으로 그려져야 한다.
      expect(
        drawableTrapezoid(sides[0]!, sides[2]!, sides[1]!, sides[3]!),
        `씨앗 ${s}: 그릴 수 없는 사다리꼴 — ${p.content}`,
      ).toBe(true);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("3단 — 합에서 평행하지 않은 두 변을 뺀 값이 답이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-4", s, "응용");
      const [total, la, lb] = cmsIn(p.content);
      const got = cmsIn(p.answer)[0];
      expect(got, `씨앗 ${s}: ${p.content}`).toBe(total! - la! - lb!);
      expect(got, `씨앗 ${s}: 평행한 두 변의 합이 0 이하다`).toBeGreaterThan(0);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 세 조건이 모두 서고 그릴 수 있는 사다리꼴이다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-4", s, "심화");
      const [total, leg, gap] = cmsIn(p.content);
      const long = cmsIn(p.answer)[0]!;
      const short = long - gap!;
      expect(short + long + leg! * 2, `씨앗 ${s}: ${p.content}`).toBe(total);
      expect(short, `씨앗 ${s}: 짧은 변이 0 이하다`).toBeGreaterThan(0);
      expect(
        drawableTrapezoid(short, long, leg!, leg!),
        `씨앗 ${s}: 그릴 수 없는 사다리꼴 — ${p.content}`,
      ).toBe(true);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-4-6 마름모 ─────────────────────── */

describe("[초4 2-4-6] 마름모", () => {
  it("1단 — 합을 넷으로 나눈 값이 한 변이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-6", s, "연산");
      const total = cmsIn(p.content)[0]!;
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(total / 4);
      expect(total % 4, `씨앗 ${s}: 한 변이 자연수가 아니다`).toBe(0);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("**2단 — 더 긴 쪽이 실제로 더 길고, 두 답이 «둘 다» 나온다**", () => {
    let looked = 0;
    const answers = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-4-6", s, "기본");
      const [rhombus, triangle] = cmsIn(p.content);
      const want = rhombus! * 4 > triangle! * 3 ? "마름모" : "정삼각형";
      expect(p.answer, `씨앗 ${s}: ${p.content}`).toBe(want);
      // 두 합이 같으면 「더 긴 쪽」이 없다 — 그런 짝을 내면 안 된다.
      expect(rhombus! * 4, `씨앗 ${s}: 두 합이 같아 답이 없다`).not.toBe(
        triangle! * 3,
      );
      answers.add(p.answer);
      looked += 1;
    }
    counted(looked, "2단 전량");
    // 한쪽만 나오면 사실상 고정답이다 — 음성 대조.
    expect([...answers].sort(), "두 답이 다 나온다").toEqual([
      "마름모",
      "정삼각형",
    ]);
  });

  it("3단 — 마름모의 한 변을 거쳐 정삼각형의 세 변의 합으로", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-6", s, "응용");
      const total = cmsIn(p.content)[0]!;
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(
        (total / 4) * 3,
      );
      expect(total % 4, `씨앗 ${s}: 한 변이 자연수가 아니다`).toBe(0);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 늘인 뒤의 합에서 처음 한 변을 되짚는다** (역산이라 지름길이 없다)", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-6", s, "심화");
      const [more, grown] = cmsIn(p.content);
      const first = cmsIn(p.answer)[0]!;
      expect((first + more!) * 4, `씨앗 ${s}: ${p.content}`).toBe(grown);
      expect(first, `씨앗 ${s}: 처음 한 변이 0 이하다`).toBeGreaterThan(0);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-4-7 여러 가지 사각형 ─────────────────────── */

describe("[초4 2-4-7] 여러 가지 사각형", () => {
  it("1단 — 포함 관계가 정본과 맞는다", () => {
    let looked = 0;
    const forms = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-4-7", s, "연산");
      const subject = Object.keys(ALSO).find((k) => p.content.startsWith(k));
      expect(subject, `씨앗 ${s}: 주어를 못 읽음 — ${p.content}`).toBeTruthy();
      const want = ALSO[subject!]!;
      const asksCount = p.content.includes("몇 가지");
      if (asksCount) {
        expect(countIn(p.answer), `씨앗 ${s}: ${p.content}`).toBe(want.length);
      } else {
        expect(p.answer.split(", ").sort(), `씨앗 ${s}: ${p.content}`).toEqual(
          [...want].sort(),
        );
      }
      forms.add(asksCount ? "개수" : "이름");
      looked += 1;
    }
    counted(looked, "1단 전량");
    // 두 문형이 다 나와야 이 검사가 둘 다 지킨다.
    expect([...forms].sort(), "두 문형").toEqual(["개수", "이름"]);
  });

  it("**2단 — 배제절이 있어야 이름이 하나로 정해진다** (㉡)", () => {
    let looked = 0;
    const names = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-4-7", s, "기본");
      // 「가진 성질」만 나열하면 포함 관계 때문에 답이 갈린다 — «아닌 것»이 반드시 있어야 한다.
      expect(p.content, `씨앗 ${s}: 배제절이 없다 — ${p.content}`).toContain(
        "지만",
      );
      expect(p.content, `씨앗 ${s}: 배제절이 없다 — ${p.content}`).toMatch(
        /않습니다|같지 않습니다|같지는 않습니다/,
      );
      expect(Object.keys(ALSO).concat("사다리꼴"), `씨앗 ${s}`).toContain(
        p.answer,
      );
      names.add(p.answer);
      looked += 1;
    }
    counted(looked, "2단 전량");
    // 네 이름이 다 나와야 「이름을 가른다」가 뜻을 가진다.
    expect(names.size, "이름").toBe(4);
  });

  it("3단 — 이름은 정사각형이고 한 변은 합을 넷으로 나눈 값이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-7", s, "응용");
      const total = cmsIn(p.content)[0]!;
      expect(p.answer.startsWith("정사각형,"), `씨앗 ${s}: ${p.answer}`).toBe(
        true,
      );
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(total / 4);
      expect(total % 4, `씨앗 ${s}: 한 변이 자연수가 아니다`).toBe(0);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 반례 조건이 정사각형을 지우고, 다른 마름모를 거쳐 되짚는다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-7", s, "심화");
      // 배제 조건이 없으면 마름모와 정사각형이 안 갈린다.
      expect(p.content, `씨앗 ${s}: 반례 조건이 없다`).toContain("아닙니다");
      const [other, gap] = cmsIn(p.content);
      const side = cmsIn(p.answer)[0]!;
      expect(p.answer.startsWith("마름모,"), `씨앗 ${s}: ${p.answer}`).toBe(
        true,
      );
      expect(side * 4, `씨앗 ${s}: ${p.content}`).toBe(other! * 4 + gap!);
      expect(
        gap! % 4,
        `씨앗 ${s}: 차가 $4$의 배수가 아니라 한 변이 자연수가 아니다`,
      ).toBe(0);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});
