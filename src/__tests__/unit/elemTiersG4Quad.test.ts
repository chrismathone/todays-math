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

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = [
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
  "2-4-6",
  "2-4-7",
] as const;
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

/** `$12\,\mathrm{cm}$` 에서 $12$를 나온 차례대로. */
const cmsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) => Number(m[1]));

/** `$46^\circ$` 에서 $46$을 나온 차례대로. */
const degsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) => Number(m[1]));

/** `$3$가지` 에서 $3$을. */
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("표준과 뼈대가 겹치는 갈래가 없다 (R5)", () => {
    let looked = 0;
    for (const code of CODES) {
      const std = new Set(SWEEP.map((s) => skeleton(gen(code, s).content)));
      expect(std.size, `${code} 표준 뼈대`).toBeGreaterThan(0);
      for (const tier of tiersOf(unitOf(code))) {
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
      for (const tier of tiersOf(unitOf(code))) {
        const forms = new Set(SWEEP.map((s) => gen(code, s, tier).content));
        expect(forms.size, `${code} «${tier}» 변형`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("**「예/아니요」 문형을 한 갈래도 안 쓴다** (㉢)", () => {
    // 표준 2-4-4·2-4-7 이 그 문형을 셋 쓴다 — 낱말만 바꾸면 R5 가 말하는 그 자리다.
    let looked = 0;
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const s of SWEEP) {
          const c = gen(code, s, tier).content;
          expect(c, `${code} «${tier}»`).not.toContain("아니요");
          expect(c, `${code} «${tier}»`).not.toContain("할 수 있습니까? 맞으면");
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
      const p = gen("2-4-4", s, "심화하");
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
      const p = gen("2-4-6", s, "심화하");
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
      const p = gen("2-4-7", s, "심화하");
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

/* ─────────────────────── 2-4-5 평행사변형 ─────────────────────── */

describe("[초4 2-4-5] 평행사변형", () => {
  it("1단 — 마주 보는 변의 길이가 준 변과 같다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-5", s, "연산");
      const [side] = cmsIn(p.content);
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(side);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("**2단 — 네 각이 $180^\circ$ 짝으로 서고 직각이 아니다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-5", s, "기본");
      const given = degsIn(p.content)[0]!;
      const four = degsIn(p.answer);
      expect(four.length, `씨앗 ${s}: ${p.answer}`).toBe(4);
      expect(four[0], `씨앗 ${s}`).toBe(given);
      expect(four[2], `씨앗 ${s}: 마주 보는 각이 다르다`).toBe(given);
      expect(four[1], `씨앗 ${s}: 이웃한 각의 합이 $180^\circ$가 아니다`).toBe(
        180 - given,
      );
      expect(four[3], `씨앗 ${s}`).toBe(180 - given);
      // 직각이면 직사각형이라 「평행사변형」이라 부르는 것이 흔들린다.
      expect(given, `씨앗 ${s}: $90^\circ$는 직사각형이다`).not.toBe(90);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("3단 — 합의 절반에서 준 변을 뺀 값이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-5", s, "응용");
      const [total, a] = cmsIn(p.content);
      const b = cmsIn(p.answer)[0]!;
      expect((a! + b) * 2, `씨앗 ${s}: ${p.content}`).toBe(total);
      expect(b, `씨앗 ${s}: 이웃한 변이 0 이하다`).toBeGreaterThan(0);
      // 두 변이 같으면 마름모라 「이웃한 변」을 따로 묻는 뜻이 옅어진다.
      expect(b, `씨앗 ${s}: 이웃한 두 변이 같다`).not.toBe(a);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 합 $180^\circ$ 와 차를 함께 써야 정해진다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-4-5", s, "심화하");
      const gap = degsIn(p.content)[0]!;
      const big = degsIn(p.answer)[0]!;
      const small = big - gap;
      expect(small + big, `씨앗 ${s}: ${p.content}`).toBe(180);
      expect(small, `씨앗 ${s}: 작은 각이 0 이하다`).toBeGreaterThan(0);
      expect(gap % 2, `씨앗 ${s}: 차가 홀수면 각이 자연수가 아니다`).toBe(0);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });

  it("**그림은 값을 배반하지 않는 갈래에만 붙는다**", () => {
    // ⚠️ 3·4단에 기본 비율로 그리면 **그림이 답을 배반한다** — 「합 34·한 변 9 → 이웃 8」인데
    // 기본 그림은 이웃을 $1.5$배로 그린다. 그래서 그 둘은 그림 없이 낸다.
    // 1·2단은 적힌 값(변 하나 / 각 하나)을 엔진이 그대로 그린다(실측: 각 115° → 115.0°).
    let withFig = 0;
    let without = 0;
    for (const s of SWEEP.slice(0, 120)) {
      for (const tier of tiersOf(unitOf("2-4-5"))) {
        const p = gen("2-4-5", s, tier);
        const has = p.figureSpec !== null;
        if (tier === "연산" || tier === "기본") {
          expect(has, `«${tier}» 씨앗 ${s}: 그림이 있어야 한다`).toBe(true);
          const spec = p.figureSpec as Record<string, unknown>;
          expect(spec.kind, `«${tier}»`).toBe("markedShape");
          expect(spec.shape, `«${tier}»`).toBe("para");
          withFig += 1;
        } else {
          expect(
            has,
            `«${tier}» 씨앗 ${s}: 그림이 답을 배반한다 — 붙이면 안 된다`,
          ).toBe(false);
          without += 1;
        }
      }
    }
    counted(withFig, "그림 있는 갈래");
    counted(without, "그림 없는 갈래");
  });
});

/* ──────────────────── 2-4-3 평행선 사이의 거리 ────────────────────
 *
 * 이 소단원은 **그림 없이** 섰다(2026-08-24). 그래서 지켜야 하는 것이 하나 늘었다 —
 * **발문이 자족하는가.** 「직선 가·나·다가 **이 순서로**」가 배치를 못 박지 못하면
 * 직선 나가 바깥에 놓일 수 있고, 그러면 답이 둘이다. 값 검산은 그것을 **구조적으로
 * 못 본다** — 어느 배치를 잡아도 산술은 맞기 때문이다.
 *
 * ③ 두 직선 관계 그림이 오면 이 갈래에 그림을 **얹게** 된다. 그때 이 검사들이 거짓으로
 * 빨개지면 안 되므로 **「그림이 없다」는 안 잠근다** — 잠그면 로드맵과 싸우는 가드가 된다.
 * 대신 그림이 있든 없든 참이어야 하는 것(배치 낱말·값·사다리)만 잠근다.
 */
describe("[초4 2-4-3] 평행선 사이의 거리", () => {
  /** `$3$개` 에서 $3$을. */
  const perpCountIn = (t: string): number | null => {
    const m = t.match(/\$(\d+)\$개/);
    return m ? Number(m[1]) : null;
  };

  it("**1단 — 성질을 한 번 적용할 뿐이고, 두 방향이 둘 다 나온다**", () => {
    let counted = 0;
    const dirs = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-3", seed, "연산");
      const asked = cmsIn(p.content);
      const ans = cmsIn(p.answer);
      expect(asked, `씨앗 ${seed} 발문에 길이가 하나여야`).toHaveLength(1);
      expect(ans, `씨앗 ${seed} 답이 길이 하나여야`).toHaveLength(1);
      // 성질을 한 번 적용하면 **답이 준 값 그대로**다 — 산술이 없다(D-72 ⑶).
      expect(ans[0], `씨앗 ${seed}`).toBe(asked[0]);
      dirs.add(/거리는 몇 cm입니까/.test(p.content) ? "수선→거리" : "거리→수선");
      counted += 1;
    }
    expect(counted, "분모가 0이면 위의 100% 는 아무것도 아니다").toBe(
      SWEEP.length,
    );
    expect(
      dirs,
      "두 방향이 둘 다 나와야 — 한쪽이 죽으면 변형이 절반이다",
    ).toEqual(new Set(["수선→거리", "거리→수선"]));
  });

  it("**2단 — 두 거리의 합이고, 배치를 정하는 낱말이 발문에 있다**", () => {
    let counted = 0;
    for (const seed of SWEEP) {
      const p = gen("2-4-3", seed, "기본");
      const given = cmsIn(p.content);
      const ans = cmsIn(p.answer);
      expect(given, `씨앗 ${seed}`).toHaveLength(2);
      expect(ans, `씨앗 ${seed}`).toHaveLength(1);
      expect(ans[0], `씨앗 ${seed} 합이 아니다`).toBe(given[0]! + given[1]!);
      counted += 1;
    }
    expect(counted).toBe(SWEEP.length);
  });

  it("**3단 — 중간값을 거쳐야 답이 나오고, 두 방향이 둘 다 선다**", () => {
    let counted = 0;
    const dirs = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-3", seed, "응용");
      const given = cmsIn(p.content);
      expect(given, `씨앗 ${seed} 발문에 길이 둘(한 칸 · 차)`).toHaveLength(2);
      const [near, diff] = given as [number, number];
      const longer = /더 깁니다/.test(p.content);
      expect(
        longer || /더 짧습니다/.test(p.content),
        `씨앗 ${seed} 길다/짧다 중 하나를 말해야`,
      ).toBe(true);
      // **중간값**을 먼저 세운다 — 이것이 3단을 2단과 가르는 자리다.
      const far = longer ? near + diff : near - diff;
      expect(
        far,
        `씨앗 ${seed} 거리가 $0$ 이하다 — 뽑고 거르면 이 자리가 난다`,
      ).toBeGreaterThan(0);
      expect(cmsIn(p.answer)[0], `씨앗 ${seed}`).toBe(near + far);
      dirs.add(longer ? "길다" : "짧다");
      counted += 1;
    }
    expect(counted).toBe(SWEEP.length);
    expect(dirs).toEqual(new Set(["길다", "짧다"]));
  });

  it("**4단 — 합에서 한 칸을 되짚고, 그 되짚은 값이 답과 다르다**", () => {
    let counted = 0;
    const sides = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-3", seed, "심화하");
      const given = cmsIn(p.content);
      expect(given, `씨앗 ${seed} 발문에 길이 둘(수선 합 · 전체)`).toHaveLength(
        2,
      );
      const [sum, total] = given as [number, number];
      const count = perpCountIn(p.content);
      expect(count, `씨앗 ${seed} 수선 개수를 못 읽음`).toBeTruthy();
      // 「어디에서 재어도 같다」를 쓰려면 딱 떨어져야 한다 — 안 떨어지면 초4 가 못 푼다.
      expect(sum % count!, `씨앗 ${seed} 수선 합이 개수로 안 나누어진다`).toBe(
        0,
      );
      const measured = sum / count!;
      expect(cmsIn(p.answer)[0], `씨앗 ${seed}`).toBe(total - measured);
      // ⚠️ **이것이 이 갈래의 급소다.** 되짚은 값과 답이 같으면 「합에서 되찾기」를
      //    건너뛰고도 답이 맞아 그 씨앗에서 4단이 3단보다 가볍다.
      expect(
        measured,
        `씨앗 ${seed} 중간값과 답이 같아 지름길이 생긴다`,
      ).not.toBe(total - measured);
      sides.add(
        /직선 가와 직선 나 사이에 수선을/.test(p.content) ? "앞칸" : "뒷칸",
      );
      counted += 1;
    }
    expect(counted).toBe(SWEEP.length);
    expect(sides).toEqual(new Set(["앞칸", "뒷칸"]));
  });

  it("**세 직선을 쓰는 갈래는 배치를 발문이 못 박는다** (그림이 없어도 답이 하나)", () => {
    let counted = 0;
    for (const tier of ["기본", "응용", "심화하"] as const) {
      for (const seed of SWEEP) {
        const t = gen("2-4-3", seed, tier).content;
        // 「이 순서로」가 없으면 직선 나가 바깥에 놓일 수 있어 **답이 둘**이 된다.
        expect(t, `${tier} 씨앗 ${seed} 배치를 정하는 말이 없다`).toContain(
          "이 순서로",
        );
        expect(
          t,
          `${tier} 씨앗 ${seed} 세 직선이 평행하다는 말이 없다`,
        ).toMatch(/세 직선은 모두 서로 평행/);
        counted += 1;
      }
    }
    expect(counted).toBe(SWEEP.length * 3);
  });

  it("**각도로 사다리를 세우지 않는다** (1-2-4 와 같은 산술이 되는 자리)", () => {
    const tiers = tiersOf(unitOf("2-4-3"));
    let counted = 0;
    for (const tier of tiers) {
      for (const seed of SWEEP) {
        const p = gen("2-4-3", seed, tier);
        // 1-2-4(각도의 합과 차)가 이미 그 산술을 쓴다. 직각 옷만 입히면 같은 문형이다.
        // R5 는 소단원 **안**에서만 견주므로 이 겹침을 구조적으로 못 본다.
        expect(
          degsIn(p.content).length + degsIn(p.solution).length,
          `${tier} 씨앗 ${seed} 각도가 들어왔다`,
        ).toBe(0);
        counted += 1;
      }
    }
    expect(counted).toBe(SWEEP.length * tiers.length);
  });

  /**
   * **소단원의 약속이 지면에 남는가.**
   *
   * ⚠️ **첫 판은 네 갈래 모두에 「수선」을 요구해 빨개졌다 — 시험이 틀렸다.**
   * 이 소단원은 축이 둘이다: 1·4단은 **수선의 성질**(어디에서 재어도 같다)을 쓰고,
   * 2·3단은 **거리의 합**을 쓴다. 둘 다 「평행선 사이의 거리」다. 네 갈래에 같은
   * 낱말을 요구하면 그건 약속이 아니라 **내가 기대한 문형**이다.
   */
  it("**소단원의 약속이 지면에 남는다** — 평행과 거리, 그리고 수선은 제 갈래에", () => {
    const tiers = tiersOf(unitOf("2-4-3"));
    let counted = 0;
    for (const tier of tiers) {
      for (const seed of SWEEP) {
        const p = gen("2-4-3", seed, tier);
        const page = `${p.content} ${p.solution}`;
        expect(page, `${tier} 씨앗 ${seed} 평행을 안 말한다`).toMatch(/평행/);
        expect(page, `${tier} 씨앗 ${seed} 거리를 안 말한다`).toContain("거리");
        // 수선의 성질을 쓰는 갈래는 그 낱말이 반드시 지면에 있어야 한다.
        if (tier === "연산" || tier === "심화하") {
          expect(page, `${tier} 씨앗 ${seed} 수선을 안 말한다`).toContain(
            "수선",
          );
        }
        counted += 1;
      }
    }
    expect(counted).toBe(SWEEP.length * tiers.length);
  });
});

/* ──────────────────── 2-4-2 평행과 평행선 ────────────────────
 *
 * **참은 「수직으로 꺾인 횟수의 홀짝」에서 온다** — 제품 함수를 안 부르고 발문에 적힌
 * 직선 이름을 세어 다시 정한다. 생성기를 되부르면 홀짝을 거꾸로 넣어도 시험이 같이 틀린다.
 *
 * 이 소단원이 지켜야 하는 것 —
 *  ㉠ **홀짝이 답을 정한다.** 짝수 번 꺾이면 평행, 홀수 번이면 수직. 전량으로 잰다.
 *  ㉡ **각도가 한 자리도 안 나온다.** 1-2-3(각의 크기 분류)·1-2-4(각도의 합과 차)가
 *     이미 그 산술을 쓴다. 「수직으로 만나 생긴 네 각」류로 새면 낱말만 바뀐 같은 문항이다.
 *  ㉢ **1-4-3(뒤집기) 심화의 「$N$번보다 많고 $M$번보다 적다면」 문형을 안 쓴다.**
 *     홀짝을 쓰는 소단원이라 저절로 떠오르는 문형이라 **막아 둔다**.
 *  ㉣ **조사.** 직선 이름 가~자는 **모두 받침이 없다** — 「직선 가과」·「직선 나은」이
 *     지면에 나가면 안 된다. 첫 판 해설 네 자리가 실제로 그랬다.
 */
describe("[초4 2-4-2] 평행과 평행선", () => {
  /** 발문 맨 앞의 「직선 가, 직선 나, … 」 목록에서 직선 수를. 없으면 `null`. */
  const listedLines = (t: string): number | null => {
    const m = t.match(
      /^((?:직선 [가-힣], )+직선 [가-힣])가 (있습니다|차례로 있습니다)/,
    );
    return m ? m[1]!.split(", ").length : null;
  };
  /** 「직선 $7$개가 가, 나, … 순서로」에서 개수를. */
  const orderedCount = (t: string): number | null => {
    const m = t.match(/직선 \$(\d+)\$개가 ([가-힣, ]+) 순서로/);
    return m ? Number(m[1]) : null;
  };

  it("**1단 — 직선 셋으로 규칙을 한 번만 쓴다**", () => {
    let counted0 = 0;
    const answers = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-2", seed, "연산");
      const names = new Set(
        [...p.content.matchAll(/직선 ([가-힣])/g)].map((m) => m[1]),
      );
      expect(names.size, `씨앗 ${seed} 직선이 셋이어야`).toBe(3);
      // ⚠️ **「이름이 셋인가」만으로는 못 잡는다.** 물음에만 나오고 **관계가 안 적힌**
      //    직선이 있어도 이름 수는 그대로 셋이다 — 그런데 그 발문은 답을 못 정한다.
      //    변이(「나와 나도 서로 수직」)가 **초록**으로 그것을 짚어 줬다. 세 직선이
      //    모두 관계 문장과 물음에 나와야 하므로 **저마다 두 번 이상** 나와야 한다.
      for (const nm of names) {
        const times = p.content.split(`직선 ${nm}`).length - 1;
        expect(
          times,
          `씨앗 ${seed} 직선 ${nm}이 ${times}번뿐 — 관계가 안 적힌 직선이 있다`,
        ).toBeGreaterThanOrEqual(2);
      }
      expect(["평행", "수직"], `씨앗 ${seed}`).toContain(p.answer);
      answers.add(p.answer);
      counted0 += 1;
    }
    expect(counted0).toBe(SWEEP.length);
    expect(answers, "두 답이 둘 다 나와야 — 한쪽만이면 찍어도 맞는다").toEqual(
      new Set(["평행", "수직"]),
    );
  });

  it("**2단 — 꺾인 횟수의 홀짝이 답이다** (㉠)", () => {
    let counted0 = 0;
    const seen = new Set<number>();
    for (const seed of SWEEP) {
      const p = gen("2-4-2", seed, "기본");
      const lines = listedLines(p.content);
      expect(lines, `씨앗 ${seed} 직선 목록을 못 읽음`).toBeTruthy();
      const links = lines! - 1;
      expect(
        links,
        `씨앗 ${seed} 1단(꺾임 둘)보다 길어야`,
      ).toBeGreaterThanOrEqual(3);
      // **참을 여기서 다시 정한다** — 짝수 번 꺾이면 방향이 돌아온다.
      expect(p.answer, `씨앗 ${seed} 꺾임 ${links}번`).toBe(
        links % 2 === 0 ? "평행" : "수직",
      );
      seen.add(links);
      counted0 += 1;
    }
    expect(counted0).toBe(SWEEP.length);
    expect(
      seen.size,
      "꺾임 횟수가 한 가지뿐이면 답도 한 가지다",
    ).toBeGreaterThan(1);
  });

  it("**3단 — 훑어서 세고, 짝·홀 두 물음이 둘 다 선다**", () => {
    let counted0 = 0;
    const asks = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-2", seed, "응용");
      const total = orderedCount(p.content);
      expect(total, `씨앗 ${seed} 직선 개수를 못 읽음`).toBeTruthy();
      const wantParallel = /서로 평행한 직선은/.test(p.content);
      expect(
        wantParallel || /서로 수직인 직선은/.test(p.content),
        `씨앗 ${seed} 무엇을 세는지 안 적혀 있다`,
      ).toBe(true);
      // 첫 직선에서 $i$ 번 꺾인 것이 $i$ 번째 — 짝수면 평행, 홀수면 수직.
      let want = 0;
      for (let i = 1; i < total!; i += 1) {
        if ((i % 2 === 0) === wantParallel) want += 1;
      }
      expect(p.answer, `씨앗 ${seed} 직선 ${total}개`).toBe(`$${want}$개`);
      asks.add(wantParallel ? "평행" : "수직");
      counted0 += 1;
    }
    expect(counted0).toBe(SWEEP.length);
    expect(asks).toEqual(new Set(["평행", "수직"]));
  });

  it("**4단 — 가운데 관계가 양 끝의 관계와 같다** (되짚기)", () => {
    let counted0 = 0;
    const answers = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-2", seed, "심화하");
      const m = p.content.match(/서로 (평행|수직)하려면/);
      expect(m, `씨앗 ${seed} 양 끝에 요구된 관계를 못 읽음`).toBeTruthy();
      // 앞뒤에서 수직으로 한 번씩 꺾이므로 그 둘은 서로 지운다 —
      // **가운데 관계가 곧 양 끝의 관계**다. 이 항등이 이 갈래의 전부다.
      expect(p.answer, `씨앗 ${seed}`).toBe(m![1]);
      expect(listedLines(p.content), `씨앗 ${seed} 직선 넷`).toBe(4);
      answers.add(p.answer);
      counted0 += 1;
    }
    expect(counted0).toBe(SWEEP.length);
    expect(answers).toEqual(new Set(["평행", "수직"]));
  });

  it("**각도로 사다리를 세우지 않는다** (㉡ 1-2-3 · 1-2-4 와 같은 산술이 되는 자리)", () => {
    let counted0 = 0;
    for (const tier of tiersOf(unitOf("2-4-2"))) {
      for (const seed of SWEEP) {
        const p = gen("2-4-2", seed, tier);
        expect(
          degsIn(p.content).length + degsIn(p.solution).length,
          `${tier} 씨앗 ${seed} 각도가 들어왔다`,
        ).toBe(0);
        counted0 += 1;
      }
    }
    counted(counted0, "각도 전량");
  });

  it("**1-4-3(뒤집기)의 「$N$번보다 많고」 문형을 안 쓴다** (㉢)", () => {
    let counted0 = 0;
    for (const tier of tiersOf(unitOf("2-4-2"))) {
      for (const seed of SWEEP) {
        const c = gen("2-4-2", seed, tier).content;
        // 홀짝을 쓰는 소단원이라 저절로 떠오르는 문형이다 — 그대로 가면 뒤집기와 같은 문항.
        expect(c, `${tier} 씨앗 ${seed}`).not.toMatch(/번보다 (많고|적)/);
        expect(c, `${tier} 씨앗 ${seed}`).not.toContain("뒤집");
        counted0 += 1;
      }
    }
    counted(counted0, "문형 전량");
  });

  it("**직선 이름 뒤 조사가 맞는다** (㉣ 가~자는 모두 받침이 없다)", () => {
    let counted0 = 0;
    for (const tier of tiersOf(unitOf("2-4-2"))) {
      for (const seed of SWEEP) {
        const p = gen("2-4-2", seed, tier);
        for (const page of [p.content, p.solution]) {
          // 「직선 가과」·「직선 나은」·「직선 다이」 — 첫 판 해설 네 자리가 그랬다.
          expect(page, `${tier} 씨앗 ${seed}`).not.toMatch(
            /직선 [가나다라마바사아자](과|은|이)(?![가-힣])/,
          );
        }
        counted0 += 1;
      }
    }
    counted(counted0, "조사 전량");
  });
});

/* ────── 「그림에서 ○○의 기호를 쓰시오」 — 정답 자리가 씨앗마다 섞이는가 ──────
 *
 * 🔴 **옛 판은 정답이 «언제나 가» 였다.** 발문을 안 읽고 「가」라고 써도 맞는다
 *    (실측 2026-08-24: 2-2-1 51건 · 2-4-4 65건 · 2-4-6 58건, 전량 «가»).
 *
 * ⚠️ **왜 아무 검사도 못 봤나 — 세 겹이다.**
 *   ㉠ R9 는 «발문 + 그림»만 본다. **정답 축이 아예 없다.**
 *   ㉡ 그림이 일부 씨앗에만 붙으면 스펙 집합에 `null` 이 섞여 크기가 $2$ 가 되고
 *      「고정 아님」으로 통과한다 — **붙을 때는 늘 같은 그림인데도.**
 *   ㉢ 셀 전체로 세면 그림 없는 씨앗들이 답을 갈라 **0건**이 된다.
 *      그래서 **「그림이 붙은 씨앗 안에서」**로 좁혀야 드러난다.
 *   그리고 **값 검산은 이 부류를 구조적으로 못 본다** — 답이 늘 맞기 때문이다.
 *
 * ⚠️ 2-2-1 은 **그림 스펙이 6가지로 갈리는데도** 답이 늘 「가」였다. 「그림을 씨앗마다
 *    다르게」로는 안 갚아진다 — **정답 자리 자체**를 섞어야 한다.
 */
describe("[초4 표준] 그림에서 기호를 고르는 문항", () => {
  const PICK_CODES = ["2-2-1", "2-4-4", "2-4-6"] as const;

  it("**정답이 «언제나 가» 가 아니다** — 그림이 붙은 문항 안에서 센다", () => {
    for (const code of PICK_CODES) {
      const answers = new Map<string, number>();
      let withFig = 0;
      for (const seed of SWEEP) {
        const p = gen(code, seed);
        // ㉡·㉢ — **그림이 붙은 씨앗만** 모은다. 안 좁히면 0건이 된다.
        if (!p.figureSpec) continue;
        if (!/기호를 쓰시오/.test(p.content)) continue;
        withFig += 1;
        answers.set(p.answer, (answers.get(p.answer) ?? 0) + 1);
      }
      counted(withFig, `${code} 그림 붙은 «기호» 문항`);
      expect(
        answers.size,
        `${code}: 정답이 «${[...answers.keys()].join("·")}» 하나뿐 — 발문을 안 읽어도 맞는다`,
      ).toBeGreaterThan(1);
      // 한쪽으로 심하게 쏠려도 찍기가 통한다. 가장 흔한 답이 8할을 넘으면 막는다.
      const top = Math.max(...answers.values());
      expect(
        top / withFig,
        `${code}: 정답이 «${[...answers].sort((a, b) => b[1] - a[1])[0]![0]}» 로 쏠렸다`,
      ).toBeLessThan(0.8);
    }
  });

  it("**해설이 가리키는 기호가 정답과 같다**", () => {
    let looked = 0;
    for (const code of PICK_CODES) {
      for (const seed of SWEEP) {
        const p = gen(code, seed);
        if (!p.figureSpec || !/기호를 쓰시오/.test(p.content)) continue;
        // 해설 첫 문장이 「○는 …」 으로 시작한다 — 그 ○ 가 정답이어야 한다.
        const head = /^([가나다])는/.exec(p.solution);
        expect(
          head,
          `${code} 씨앗 ${seed} 해설이 기호로 시작하지 않는다`,
        ).toBeTruthy();
        expect(head![1], `${code} 씨앗 ${seed} 해설이 딴 기호를 짚는다`).toBe(
          p.answer,
        );
        looked += 1;
      }
    }
    counted(looked, "해설-정답 대조");
  });

  it("**그림의 라벨이 정답 기호를 담고 있다**", () => {
    let looked = 0;
    for (const code of PICK_CODES) {
      for (const seed of SWEEP) {
        const p = gen(code, seed);
        if (!p.figureSpec || !/기호를 쓰시오/.test(p.content)) continue;
        const spec = p.figureSpec as { items?: { label?: string }[] };
        const labels = (spec.items ?? []).map((x) => String(x.label));
        expect(
          labels,
          `${code} 씨앗 ${seed} 그림에 정답 기호가 없다`,
        ).toContain(p.answer);
        // 라벨은 자리 순서 그대로 가·나·다 여야 한다(건너뛰면 지면이 이상해진다).
        expect(labels, `${code} 씨앗 ${seed} 라벨 차례가 어긋난다`).toEqual(
          ["가", "나", "다"].slice(0, labels.length),
        );
        looked += 1;
      }
    }
    counted(looked, "그림 라벨 대조");
  });
});

/* ────── 2-4-2 · 2-4-3 그림 배선 (2026-08-24) ──────
 *
 * 09 §2.2 **규칙 ①(묻는 값을 그림에 적지 마라)은 무는 판정기가 없다.** 값 검산도
 * 렌더 검사도 다 초록이다 — 여기서 잠근다.
 */
describe("[초4 2-4-2·2-4-3] 그림 배선", () => {
  it("**2-4-3 그림에 치수가 없다** — 그 값이 곧 답이다 (09 §2.2 ①)", () => {
    let withFig = 0;
    for (const seed of SWEEP) {
      const p = gen("2-4-3", seed);
      const spec = p.figureSpec as Record<string, unknown> | undefined;
      if (!spec) continue;
      withFig += 1;
      expect(spec.kind, `씨앗 ${seed}`).toBe("lineRelation");
      // `distance` 를 실으면 발문이 준 길이가 그림에 찍히고, 그게 곧 정답이다.
      expect(
        spec.distance,
        `씨앗 ${seed} 그림에 치수가 실렸다 — 그 값이 답이다`,
      ).toBeUndefined();
      expect(spec.relation, `씨앗 ${seed}`).toBe("parallel");
    }
    counted(withFig, "2-4-3 그림 붙은 문항");
  });

  it("**2-4-1 도 그림을 하나도 안 붙인다** — 직각 기호가 곧 답이라 (09 §2.2 ①②)", () => {
    // 이 소단원은 「직각이 몇 개인가」를 센다. 수선을 그리면 직각 기호를 함께 그려야
    // 하고, 그러면 **세기만 해도 답이 나온다.** 엔진의 `lineRelation` 이 `parallel`
    // 하나만 그리는 까닭이 바로 이것이다(`_line_relation` 머리말).
    let looked = 0;
    for (const seed of SWEEP) {
      for (const tier of [undefined, ...tiersOf(unitOf("2-4-1"))]) {
        expect(
          gen("2-4-1", seed, tier).figureSpec,
          `«${tier}» 씨앗 ${seed}`,
        ).toBeFalsy();
        looked += 1;
      }
    }
    counted(looked, "2-4-1 전량");
  });

  it("**2-4-2 는 그림을 하나도 안 붙인다** — 붙일 수 있는 갈래의 답이 고정이라", () => {
    // 🔴 한 번 붙였다가 **R9-c 가 물었다**: 「그림 붙은 26문항에서 «평행선» 100%」.
    //    나머지 세 갈래는 답을 보여 줘서 못 붙이므로, **그림의 있고 없음 자체가
    //    답을 알려 준다.** 되살리려면 답이 갈리는 발문을 먼저 만들어야 한다.
    let looked = 0;
    for (const seed of SWEEP) {
      const p = gen("2-4-2", seed);
      expect(p.figureSpec, `씨앗 ${seed}`).toBeFalsy();
      looked += 1;
    }
    counted(looked, "2-4-2 표준 전량");
  });
});

/* ──────────────────── 2-4-1 수직과 수선 ────────────────────
 *
 * **참은 「수선 한 개마다 직각이 넷」에서 온다** — 발문에 적힌 수선·직각의 수를 뽑아
 * 답을 다시 정한다. 곱하는 수 $4$ 는 제품에서 읽어 오지 않고 **여기서 다시 적는다**.
 *
 * 이 소단원이 지켜야 하는 것 —
 *  ㉠ **직각 수 = 수선 수 × $4$.** 2·3단이 그 곱을 앞으로 쓰고 4단이 거꾸로 쓴다.
 *  ㉡ 🔴 **4단이 묻는 것의 단위가 «직각»이 아니다.** 관계가 곱셈 하나뿐이라 앞뒤가
 *     선형이다 — 「직각이 모두 몇 개가 되는가」로 물으면 답이 $\bigcirc+4\triangle$ 이라
 *     **되짚기를 건너뛰고도 나온다.** 그러면 4단인 척하는 3단이다. 처음 판이 실제로
 *     그랬고 전량으로 막는다.
 *  ㉢ **각도가 한 자리도 안 나온다.** 표준 2-4-1 이 $90\times k$ 로 각도를 **더하고**,
 *     1-2-4(각도의 합과 차)가 그 산술을 쓴다. 갈래가 세는 것은 **직각의 개수**다.
 *  ㉣ **조사.** 직선 이름 가~자는 모두 받침이 없다(2-4-2 와 같은 자리).
 */
describe("[초4 2-4-1] 수직과 수선", () => {
  /** 「수선을 $5$개 그었습니다/그은」 — 처음 그은 수. */
  const drawn = (t: string): number | null => {
    const m = t.match(/수선을 \$(\d+)\$개 그(었습니다|은)/);
    return m ? Number(m[1]) : null;
  };
  /** 「직각이 모두 $20$개 생겼습니다」 — 되짚을 값. */
  const madeRight = (t: string): number | null => {
    const m = t.match(/직각이 모두 \$(\d+)\$개 생겼습니다/);
    return m ? Number(m[1]) : null;
  };

  it("**1단 — 정의를 한 번 쓴다. 세 갈래가 다 선다**", () => {
    const kinds = { 직각수: 0, 이름: 0, 맞바뀜: 0 };
    const answers = new Set<string>();
    for (const seed of SWEEP) {
      const p = gen("2-4-1", seed, "연산");
      if (/직각은 몇 개입니까/.test(p.content)) {
        expect(p.answer, `씨앗 ${seed}`).toBe("$4$개");
        kinds.직각수 += 1;
      } else if (/만나서 이루는 각이 직각입니다/.test(p.content)) {
        expect(p.answer, `씨앗 ${seed}`).toBe("수선");
        kinds.이름 += 1;
      } else {
        expect(p.content, `씨앗 ${seed}`).toMatch(/에 대한 수선입니다/);
        expect(p.answer, `씨앗 ${seed}`).toBe("수선");
        kinds.맞바뀜 += 1;
      }
      // 세 직선이 아니라 **두 직선**만 본다 — 이어 붙이기는 2-4-2 의 일이다.
      const names = new Set(
        [...p.content.matchAll(/직선 ([가-힣])/g)].map((m) => m[1]),
      );
      expect(names.size, `씨앗 ${seed} 직선이 둘이어야`).toBe(2);
      answers.add(p.answer);
    }
    for (const [why, got] of Object.entries(kinds)) counted(got, `1단 ${why}`);
    expect(answers).toEqual(new Set(["$4$개", "수선"]));
  });

  it("**2단 — 직각 수 = 수선 수 × $4$** (㉠)", () => {
    let looked = 0;
    const seen = new Set<number>();
    for (const seed of SWEEP) {
      const p = gen("2-4-1", seed, "기본");
      const k = drawn(p.content);
      expect(k, `씨앗 ${seed} 수선 개수를 못 읽음`).toBeTruthy();
      // **참을 여기서 다시 정한다** — 만나는 점마다 직각이 넷.
      expect(p.answer, `씨앗 ${seed} 수선 ${k}개`).toBe(`$${k! * 4}$개`);
      seen.add(k!);
      looked += 1;
    }
    counted(looked, "2단 전량");
    expect(seen.size, "수선 수가 한 가지뿐이면 답도 한 가지다").toBeGreaterThan(
      1,
    );
  });

  it("**3단 — 곱한 뒤 한 번 더 셈한다. 두 문형이 둘 다 선다**", () => {
    let painted = 0;
    let added = 0;
    for (const seed of SWEEP) {
      const p = gen("2-4-1", seed, "응용");
      const k = drawn(p.content);
      expect(k, `씨앗 ${seed} 수선 개수를 못 읽음`).toBeTruthy();
      const pm = p.content.match(/직각 중 \$(\d+)\$개에 색칠/);
      if (pm) {
        const c = Number(pm[1]);
        expect(c, `씨앗 ${seed} 색칠한 수가 전체 이상이다`).toBeLessThan(
          k! * 4,
        );
        expect(p.answer, `씨앗 ${seed}`).toBe(`$${k! * 4 - c}$개`);
        painted += 1;
      } else {
        const mm = p.content.match(/수선을 \$(\d+)\$개 더 그었습니다/);
        expect(mm, `씨앗 ${seed} 더 그은 수를 못 읽음`).toBeTruthy();
        expect(p.answer, `씨앗 ${seed}`).toBe(
          `$${(k! + Number(mm![1])) * 4}$개`,
        );
        added += 1;
      }
    }
    counted(painted, "3단 색칠 갈래");
    counted(added, "3단 더 긋기 갈래");
  });

  it("**4단 — 되짚어 «수선·점»의 수를 구한다. «직각이 몇 개»로 묻지 않는다** (㉡)", () => {
    let byPoints = 0;
    let byMore = 0;
    for (const seed of SWEEP) {
      const p = gen("2-4-1", seed, "심화하");
      const had = madeRight(p.content);
      expect(had, `씨앗 ${seed} 되짚을 직각 수를 못 읽음`).toBeTruthy();
      expect(
        had! % 4,
        `씨앗 ${seed} 직각 ${had}개가 $4$로 안 나누어떨어진다`,
      ).toBe(0);
      // 🔴 ㉡ — 묻는 단위가 «직각»이면 $\div4$ 없이도 답이 나온다.
      expect(p.content, `씨앗 ${seed} 4단이 직각 수를 묻고 있다`).not.toMatch(
        /직각은 (모두 )?몇 개/,
      );
      // 되짚기가 해설에도 보여야 한다 — 답만 맞고 걸음이 없으면 학생이 못 따라간다.
      expect(p.solution, `씨앗 ${seed}`).toMatch(/\\div4/);
      if (/만나는 점은 모두 몇 개/.test(p.content)) {
        const em = p.content.match(/수선을 \$(\d+)\$개 더 그으면/);
        expect(em, `씨앗 ${seed} 더 그을 수를 못 읽음`).toBeTruthy();
        expect(p.answer, `씨앗 ${seed}`).toBe(
          `$${had! / 4 + Number(em![1])}$개`,
        );
        byPoints += 1;
      } else {
        const wm = p.content.match(/직각이 모두 \$(\d+)\$개가 되게/);
        expect(wm, `씨앗 ${seed} 목표 직각 수를 못 읽음`).toBeTruthy();
        const want = Number(wm![1]);
        expect(want, `씨앗 ${seed} 목표가 지금보다 커야`).toBeGreaterThan(had!);
        expect((want - had!) % 4, `씨앗 ${seed}`).toBe(0);
        expect(p.answer, `씨앗 ${seed}`).toBe(`$${(want - had!) / 4}$개`);
        byMore += 1;
      }
    }
    counted(byPoints, "4단 점 갈래");
    counted(byMore, "4단 더 긋기 갈래");
  });

  it("**각도가 한 자리도 안 나온다** (㉢ 표준은 $90\\times k$ 를 쓴다)", () => {
    let looked = 0;
    for (const tier of tiersOf(unitOf("2-4-1"))) {
      for (const seed of SWEEP) {
        const p = gen("2-4-1", seed, tier);
        expect(
          degsIn(p.content).length + degsIn(p.solution).length,
          `«${tier}» 씨앗 ${seed} 각도가 들어왔다`,
        ).toBe(0);
        looked += 1;
      }
    }
    counted(looked, "2-4-1 각도 전량");
  });

  it("**직선 이름 뒤 조사가 맞는다** (㉣ 가~자는 모두 받침이 없다)", () => {
    let looked = 0;
    for (const tier of tiersOf(unitOf("2-4-1"))) {
      for (const seed of SWEEP) {
        const p = gen("2-4-1", seed, tier);
        for (const page of [p.content, p.solution]) {
          expect(page, `«${tier}» 씨앗 ${seed}`).not.toMatch(
            /직선 [가나다라마바사아자](과|은|이)(?![가-힣])/,
          );
        }
        looked += 1;
      }
    }
    counted(looked, "2-4-1 조사 전량");
  });
});
