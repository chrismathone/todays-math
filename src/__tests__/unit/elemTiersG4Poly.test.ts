/**
 * 초4 2-6 「다각형」 4단 확대 (D-72) — 소단원 셋(2-6-1 다각형 · 2-6-2 정다각형 · 2-6-3 대각선).
 *
 * **참은 발문에서 온다.** 발문에 실린 수를 뽑아 답을 **독립 재도출**한다 — 생성기를
 * 되부르지 않고 제품 표(`DIAGONALS`)도 안 읽는다.
 *
 * 이 트랜치가 지켜야 하는 것 —
 *  ㉠ **대각선 수는 `n(n-3)/2` 다.** 값을 손으로 적지 않고 **여기서 다시 센다** — 손으로
 *     적으면 제품과 시험이 같은 표를 베끼는 것이라 둘이 같이 틀려도 안 보인다.
 *     그리고 $4$~$8$각형에서 **다섯 값이 서로 다름**을 시험이 직접 확인한다 —
 *     그래야 「전체 개수 → 도형」 되짚기가 하나로 정해진다(4단이 그것에 기댄다).
 *  ㉡ **`sino` 표가 십이까지다.** 그 위를 뽑으면 **던진다** — 전량으로 상한을 잰다.
 *  ㉢ **정다각형의 «한 각의 크기»를 한 갈래도 묻지 않는다.** $(n-2)\times180\div n$ 은
 *     **초4 범위 밖**이다(초4 는 삼각형 $180^\circ$·사각형 $360^\circ$ 까지). 전량으로 막는다.
 *     ⚠️ 이 금지의 까닭은 2-4-6(마름모)에서 각 축을 뺀 것과 **다르다** — 거기는 표준
 *     2-4-5 와의 겹침이었고 여기는 **교육과정 범위**다. 겹침이 풀려도 여기는 안 열린다.
 *  ㉣ **「예/아니요」 문형을 한 갈래도 안 쓴다.** 표준 2-6-1 이 그 문형을 쓴다.
 *  ㉤ **분모를 같이 센다.** 100% 는 **분모가 0일 때도 100%** 다.
 *
 * ⚠️ **그림은 이 트랜치에 없다.** ② 확장이 정n각형 모양은 그리지만 `sides`·`angles` 에
 * 값을 적으면 **던진다**(비율 수리 전 임시 차단). 2-6-2 는 한 변 길이를 적는 갈래가
 * 대부분이라 지금 붙이면 던진다. 수리 뒤 2-4 넷과 함께 얹는다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS, type ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["2-6-1", "2-6-2", "2-6-3", "2-6-4"] as const;
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

/** `$12$` 안의 수를 나온 차례대로. */
const numsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));

/** `$12\,\mathrm{cm}$` 에서 $12$ 를. */
const cmsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) => Number(m[1]));

/** 한자 수사 → 변의 수. **제품 `sino` 를 안 부르고** 여기서 다시 적는다. */
const SINO_TO_N: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
  구: 9,
  십: 10,
  십일: 11,
  십이: 12,
};

/** 「정칠각형」·「칠각형」에서 $7$ 을 꺼낸다. 못 읽으면 `null`. */
function sidesOfName(text: string): number | null {
  const m = text.match(/정?(십일|십이|삼|사|오|육|칠|팔|구|십)각형/);
  return m ? (SINO_TO_N[m[1]!] ?? null) : null;
}

/** 대각선 수 — **`n(n-3)/2` 를 여기서 센다.** 제품 표를 베끼지 않는다. */
const diagTotal = (n: number) => (n * (n - 3)) / 2;

/** 전량 검사의 **분모**를 같이 센다 — 0을 보고 「전부 통과」라고 읽지 않게. */
function counted(n: number, why: string) {
  expect(
    n,
    `${why} — 본 것이 0건이면 이 검사는 아무것도 안 지킨다`,
  ).toBeGreaterThan(0);
}

/** 수를 지운 뼈대 — 「상수만 바꾼 것은 같은 문항」(R5). */
function skeleton(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, "§")
    .replace(/§(\s*[,·]\s*§)+/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────── 대각선 표가 되짚기를 허락하는가 ─────────────────── */

describe("[초4 2-6] 대각선 수의 성질", () => {
  it("**$4$~$8$각형의 대각선 수가 서로 다르다** (㉠). 그래야 되짚기가 하나로 정해진다", () => {
    // 4단이 「전체 개수 → 도형」을 묻는다 — 값이 겹치면 그 물음은 답이 둘이 된다.
    const totals = [4, 5, 6, 7, 8].map(diagTotal);
    expect(new Set(totals).size, `겹치는 값이 있다: ${totals}`).toBe(
      totals.length,
    );
    // 값 자체도 못 박는다 — 식을 잘못 적으면 위 «서로 다름»만으로는 안 걸린다.
    expect(totals).toEqual([2, 5, 9, 14, 20]);
  });
});

/* ─────────────────────── 등록·겹침 ─────────────────────── */

describe("[초4 2-6] 등록", () => {
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

  it("**대단원 약속 셋을 전량으로 지킨다** (㉡㉢㉣)", () => {
    let looked = 0;
    for (const code of CODES) {
      for (const tier of ELEM_TIERS) {
        for (const s of SWEEP) {
          const p = gen(code, s, tier);
          const all = `${p.content} ${p.answer} ${p.solution}`;
          // ㉡ `sino` 표가 십이까지다 — 그 위를 부르면 던진다. 이름이 나오면 상한을 잰다.
          //
          // ⚠️ **「다각형」은 건너뛴다** — 그건 수사가 아니라 부류 이름이다. 그런데
          // **그 한 낱말만** 건너뛴다: 넓게 「못 읽으면 통과」로 두면 십삼각형처럼
          // 표에 없는 이름이 나와도 조용히 지나가 이 가드가 통째로 장식이 된다.
          for (const m of all.matchAll(/정?([가-힣]+)각형/g)) {
            if (m[1] === "다") continue;
            const got = SINO_TO_N[m[1]!];
            expect(
              got,
              `${code} «${tier}» 씨앗 ${s}: 못 읽는 이름 ${m[0]}`,
            ).toBeDefined();
            expect(
              got,
              `${code} «${tier}» 씨앗 ${s}: 십이각형을 넘는다`,
            ).toBeLessThanOrEqual(12);
          }
          // ㉢ 정다각형의 «한 각»은 초4 범위 밖이다.
          expect(p.content, `${code} «${tier}» 씨앗 ${s}`).not.toMatch(
            /정[가-힣]+각형의 한 각/,
          );
          // ㉣ 「예/아니요」 문형은 표준이 쓴다 — 갈래는 안 쓴다.
          expect(p.content, `${code} «${tier}» 씨앗 ${s}`).not.toContain(
            "아니요",
          );
          looked += 1;
        }
      }
    }
    counted(looked, "대단원 전량");
  });
});

/* ─────────────────────── 2-6-1 다각형 ─────────────────────── */

describe("[초4 2-6-1] 다각형", () => {
  it("1단 — 꼭짓점 수가 곧 변의 수이고, 이름이 그 수와 맞는다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-1", s, "연산");
      const [given] = numsIn(p.content);
      expect(
        sidesOfName(p.answer),
        `씨앗 ${s}: ${p.content} → ${p.answer}`,
      ).toBe(given);
      expect(
        given,
        `씨앗 ${s}: 변이 셋보다 적으면 다각형이 아니다`,
      ).toBeGreaterThanOrEqual(3);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("2단 — 합의 절반이 변의 수다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-1", s, "기본");
      const [sum] = numsIn(p.content);
      expect(sum! % 2, `씨앗 ${s}: 합이 홀수라 변의 수가 자연수가 아니다`).toBe(
        0,
      );
      expect(sidesOfName(p.answer), `씨앗 ${s}: ${p.content}`).toBe(sum! / 2);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("3단 — 두 다각형의 꼭짓점 수를 더한 값이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-1", s, "응용");
      const [a, b] = numsIn(p.content);
      expect(numsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(a! + b!);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 두 다각형이 «둘 다» 변이 셋 이상이다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-1", s, "심화");
      const [gap, sum] = numsIn(p.content);
      const big = sidesOfName(p.answer)!;
      const small = big - gap!;
      expect(small + big, `씨앗 ${s}: ${p.content}`).toBe(sum);
      // 합·차에서 유도하면 한쪽이 $2$ 이하가 되는 씨앗이 생긴다 — 구성으로 막았는지 잰다.
      expect(
        small,
        `씨앗 ${s}: 작은 쪽이 다각형이 아니다 — ${p.content}`,
      ).toBeGreaterThanOrEqual(3);
      expect((sum! - gap!) % 2, `씨앗 ${s}: 변의 수가 자연수가 아니다`).toBe(0);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-6-2 정다각형 ─────────────────────── */

describe("[초4 2-6-2] 정다각형", () => {
  it("1단 — 합을 한 변으로 나눈 값이 변의 수다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-2", s, "연산");
      const [total, side] = cmsIn(p.content);
      expect(total! % side!, `씨앗 ${s}: 변의 수가 자연수가 아니다`).toBe(0);
      expect(sidesOfName(p.answer), `씨앗 ${s}: ${p.content}`).toBe(
        total! / side!,
      );
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("2단 — 이름은 변의 수를 따르고 합은 한 변 곱하기 변의 수다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-2", s, "기본");
      const sides = numsIn(p.content)[0]!;
      const side = cmsIn(p.content)[0]!;
      expect(sidesOfName(p.answer), `씨앗 ${s}: ${p.content}`).toBe(sides);
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(side * sides);
      expect(p.answer.startsWith("정"), `씨앗 ${s}: 정다각형이 아니다`).toBe(
        true,
      );
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("**3단 — 두 정다각형의 모든 변의 합이 실제로 같고 둘 다 자연수다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-2", s, "응용");
      const [fromSide] = cmsIn(p.content);
      const names = [
        ...p.content.matchAll(/정(십일|십이|삼|사|오|육|칠|팔|구|십)각형/g),
      ];
      expect(names.length, `씨앗 ${s}: ${p.content}`).toBe(2);
      const from = SINO_TO_N[names[0]![1]!]!;
      const to = SINO_TO_N[names[1]![1]!]!;
      expect(from, `씨앗 ${s}: 두 도형이 같으면 물을 것이 없다`).not.toBe(to);
      const total = fromSide! * from;
      expect(
        total % to,
        `씨앗 ${s}: 한 변이 자연수가 아니다 — ${p.content}`,
      ).toBe(0);
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(total / to);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("4단 — 정삼각형의 한 변을 거쳐 변의 수까지 세 단계다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-2", s, "심화");
      const [triTotal, more, total] = cmsIn(p.content);
      expect(triTotal! % 3, `씨앗 ${s}: 정삼각형 한 변이 자연수가 아니다`).toBe(
        0,
      );
      const side = triTotal! / 3 + more!;
      expect(
        total! % side,
        `씨앗 ${s}: 변의 수가 자연수가 아니다 — ${p.content}`,
      ).toBe(0);
      expect(sidesOfName(p.answer), `씨앗 ${s}: ${p.content}`).toBe(
        total! / side,
      );
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-6-3 대각선 ─────────────────────── */

describe("[초4 2-6-3] 대각선", () => {
  it("1단 — 한 꼭짓점 대각선 수에 $3$ 을 더하면 꼭짓점 수다", () => {
    let looked = 0;
    const forms = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-6-3", s, "연산");
      const each = numsIn(p.content)[0]!;
      const asksName = p.content.includes("이름을 쓰시오");
      const want = each + 3;
      if (asksName) {
        expect(sidesOfName(p.answer), `씨앗 ${s}: ${p.content}`).toBe(want);
      } else {
        expect(numsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(want);
      }
      forms.add(asksName ? "이름" : "개수");
      looked += 1;
    }
    counted(looked, "1단 전량");
    expect([...forms].sort(), "두 문형").toEqual(["개수", "이름"]);
  });

  it("2단 — 두 다각형의 한 꼭짓점 대각선 수의 차다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-3", s, "기본");
      const names = [
        ...p.content.matchAll(/(십일|십이|삼|사|오|육|칠|팔|구|십)각형/g),
      ];
      expect(names.length, `씨앗 ${s}: ${p.content}`).toBe(2);
      const big = SINO_TO_N[names[0]![1]!]!;
      const small = SINO_TO_N[names[1]![1]!]!;
      expect(
        big,
        `씨앗 ${s}: 앞이 더 커야 «더 많은가»가 성립한다`,
      ).toBeGreaterThan(small);
      expect(numsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(
        big - 3 - (small - 3),
      );
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("**3단 — 전체 대각선 수를 $n(n-3)/2$ 로 다시 세어 맞춘다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-3", s, "응용");
      const each = numsIn(p.content)[0]!;
      const sides = each + 3;
      const wantsSum = p.content.includes("변의 수와 대각선의 수를 더하면");
      expect(numsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(
        wantsSum ? sides + diagTotal(sides) : diagTotal(sides),
      );
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 전체 대각선 수로 도형이 하나로 정해지고 둘레까지 간다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-3", s, "심화");
      const total = numsIn(p.content)[0]!;
      const side = cmsIn(p.content)[0]!;
      // 그 개수를 내는 도형을 **여기서 찾는다** — 하나여야 답이 정해진다.
      const found = [4, 5, 6, 7, 8].filter((v) => diagTotal(v) === total);
      expect(
        found.length,
        `씨앗 ${s}: 도형이 하나로 안 정해진다 — ${p.content}`,
      ).toBe(1);
      expect(cmsIn(p.answer)[0], `씨앗 ${s}: ${p.content}`).toBe(
        side * found[0]!,
      );
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────── 그림 (2026-08-23, 값 반영 확장 뒤) ─────────────────── */

describe("[초4 2-6] 그림", () => {
  /**
   * **㉠ 과 ㉡ 을 함께 본다** (09 §10.3):
   *  ㉠ 그림이 **값을 따르는가** — 씨앗마다 같으면 어느 값도 안 가리킨다.
   *  ㉡ 그림이 **답을 보여 주지 않는가** — 정n각형을 그려 주면 「변이 몇 개인가」는
   *     세기만 하면 된다.
   *
   * 그래서 2-6 에서 그림이 붙는 자리는 **2-6-2 «기본» 하나**다 — 변의 수도 한 변의
   * 길이도 **발문이 이미 말하므로** 그려도 답이 안 새고, 씨앗마다 도형과 라벨이 갈린다.
   */
  it("**2-6-2 «기본» 만 그림이 있고, 씨앗마다 갈린다** (㉠)", () => {
    const specs = new Set<string>();
    let looked = 0;
    for (const s of SWEEP.slice(0, 200)) {
      for (const code of CODES) {
        for (const tier of ELEM_TIERS) {
          const p = gen(code, s, tier);
          const has = p.figureSpec !== null;
          const want = code === "2-6-2" && tier === "기본";
          expect(has, `${code} «${tier}» 씨앗 ${s}: 그림 유무`).toBe(want);
          if (has) specs.add(JSON.stringify(p.figureSpec));
          looked += 1;
        }
      }
    }
    counted(looked, "그림 전량");
    // 씨앗마다 같은 그림이면 그 그림은 어느 값도 안 가리킨다 — R9-b 가 잡는 그 자리다.
    expect(specs.size, "그림이 갈리는 가짓수").toBeGreaterThan(8);
  });

  it("**그림의 변 수와 라벨이 발문과 맞는다** — 그림이 값을 배반하지 않는다", () => {
    // ⚠️ 「갈린다」는 「맞다」가 아니다. 스펙이 발문의 수와 실제로 맞는지 따로 잰다.
    const DRAWABLE: Record<number, string> = {
      5: "pentagon",
      6: "hexagon",
      7: "heptagon",
      8: "octagon",
      9: "nonagon",
    };
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-2", s, "기본");
      const spec = p.figureSpec as {
        shape: string;
        sides: (string | null)[];
      } | null;
      expect(spec, `씨앗 ${s}: 그림이 없다`).toBeTruthy();
      const sides = numsIn(p.content)[0]!;
      const side = cmsIn(p.content)[0]!;
      expect(spec!.shape, `씨앗 ${s}: ${p.content}`).toBe(DRAWABLE[sides]);
      expect(spec!.sides.length, `씨앗 ${s}: 변 수와 라벨 칸 수가 다르다`).toBe(
        sides,
      );
      expect(spec!.sides[0], `씨앗 ${s}: 한 변 라벨`).toBe(`${side} cm`);
      // 나머지 칸은 비어 있어야 한다 — 다 적으면 그림이 답(합)을 사실상 보여 준다.
      expect(
        spec!.sides.slice(1).every((v) => v === null),
        `씨앗 ${s}: 라벨이 하나보다 많다`,
      ).toBe(true);
      // 엔진에 `decagon` 이 없다 — 십각형을 뽑으면 렌더가 던진다.
      expect(sides, `씨앗 ${s}: 그릴 수 없는 변 수`).toBeLessThanOrEqual(9);
      looked += 1;
    }
    counted(looked, "2-6-2 기본 전량");
  });
});

/* ──────────────────── 2-6-4 모양 만들기와 채우기 ────────────────────
 *
 * **참은 발문에 적힌 조각 관계에서 온다** — 제품 표(`PIECE_TRIS`)를 안 읽는다.
 * 관계는 문항마다 발문에서 다시 뽑고, 답은 그 관계로 여기서 다시 셈한다.
 *
 * 이 소단원이 지켜야 하는 것 —
 *  ㉠ 🔴 **발문 자족.** 「사다리꼴」은 일반 사다리꼴도 가리키므로 그림 없이 관계를
 *     «상식»으로 두면 **답이 하나로 안 정해진다.** 발문에 나오는 조각마다 관계가
 *     적혀 있어야 한다. 전량으로 잰다 — 이 소단원 설계의 전부가 이 한 줄이다.
 *  ㉡ **주어지는 관계의 «자»는 언제나 정삼각형이다.** 그래야 2단이 묻는 «두 조각
 *     사이의 관계»가 발문에 없다 — 그것이 1단과 2단을 가르는 자리다(식을 그냥 주면
 *     1단이다). 조각끼리 직접 잇는 관계가 발문에 실리면 2단이 1단으로 내려앉는다.
 *  ㉢ **관계표가 문항마다 흔들리지 않는다.** 마름모 둘·사다리꼴 셋·정육각형 여섯이
 *     늘 같아야 하고, **세 값이 서로 달라야** 4단의 되짚기가 하나로 정해진다.
 *  ㉣ **나누어떨어진다.** 4단은 조각 종류를 바꾸므로 답이 정수가 아니면 그런 모양이
 *     아예 없다 — 값 검산으로는 안 잡히는 부류다(2-4-4 사다리꼴과 같은 자리).
 *  ㉤ **그림이 없다.** 그릴 수 있는 짝이 정삼각형↔정육각형 하나뿐이고 그 답은 늘
 *     여섯이라, 붙이면 **그림 붙은 문항의 정답이 하나**가 된다(09 §2.2 ⑥ · R9-c).
 *     표준 경로는 「한 변이 몇 배」라 비가 곧 값이므로 거기에는 붙어 있다.
 */
describe("[초4 2-6-4] 모양 만들기와 채우기", () => {
  const PIECE = "(?:마름모|사다리꼴|정육각형)";
  /** 발문이 준 관계 — 「X 모양 조각 한 개는 정삼각형 모양 조각 $t$개」. */
  const rulesIn = (t: string): Map<string, number> => {
    const out = new Map<string, number>();
    const re = new RegExp(
      `(${PIECE}) 모양 조각 한 개는 정삼각형 모양 조각 \\$(\\d+)\\$개`,
      "g",
    );
    for (const m of t.matchAll(re)) out.set(m[1]!, Number(m[2]));
    return out;
  };
  /** 발문에 이름이 나온 조각 — 정삼각형(자)은 뺀다. */
  const namesIn = (t: string): Set<string> =>
    new Set([...t.matchAll(new RegExp(PIECE, "g"))].map((m) => m[0]));

  it("**발문에 나온 조각은 관계가 적혀 있다** (㉠ 자족)", () => {
    let looked = 0;
    for (const tier of ELEM_TIERS) {
      for (const s of SWEEP) {
        const p = gen("2-6-4", s, tier);
        const rules = rulesIn(p.content);
        for (const name of namesIn(p.content)) {
          expect(
            rules.has(name),
            `«${tier}» 씨앗 ${s}: ${name} 관계가 발문에 없다 — 답이 안 정해진다`,
          ).toBe(true);
        }
        expect(
          rules.size,
          `«${tier}» 씨앗 ${s}: 관계가 하나도 없다`,
        ).toBeGreaterThan(0);
        looked += 1;
      }
    }
    counted(looked, "2-6-4 자족 전량");
  });

  it("**주어지는 관계의 자는 언제나 정삼각형이다** (㉡ 2단이 1단으로 안 내려앉게)", () => {
    let looked = 0;
    for (const tier of ELEM_TIERS) {
      for (const s of SWEEP) {
        const c = gen("2-6-4", s, tier).content;
        // 「한 개는 …」 로 주는 관계는 전부 정삼각형을 가리켜야 한다.
        for (const m of c.matchAll(/모양 조각 한 개는 ([가-힣]+) 모양 조각/g)) {
          expect(
            m[1],
            `«${tier}» 씨앗 ${s}: 조각끼리 직접 이은 관계가 실렸다`,
          ).toBe("정삼각형");
          looked += 1;
        }
      }
    }
    counted(looked, "2-6-4 관계 전량");
  });

  it("**관계표가 흔들리지 않고 세 값이 서로 다르다** (㉢)", () => {
    const table = new Map<string, number>();
    for (const tier of ELEM_TIERS) {
      for (const s of SWEEP) {
        for (const [name, t] of rulesIn(gen("2-6-4", s, tier).content)) {
          const had = table.get(name);
          if (had !== undefined) {
            expect(t, `${name} 관계가 문항마다 다르다`).toBe(had);
          } else {
            table.set(name, t);
          }
        }
      }
    }
    expect([...table.keys()].sort()).toEqual([
      "마름모",
      "사다리꼴",
      "정육각형",
    ]);
    // 값이 겹치면 4단의 「같은 모양을 다른 조각으로」가 답이 둘이 된다.
    expect(new Set(table.values()).size, `겹치는 값: ${[...table]}`).toBe(3);
  });

  it("**1단 — 준 관계를 한 번 곱한다**", () => {
    let looked = 0;
    const seen = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-6-4", s, "연산");
      const rules = rulesIn(p.content);
      expect(rules.size, `씨앗 ${s}: 1단은 관계를 하나만 준다`).toBe(1);
      const m = p.content.match(
        new RegExp(`(${PIECE}) 모양 조각 \\$(\\d+)\\$개는 정삼각형`),
      );
      expect(m, `씨앗 ${s}: 물음을 못 읽음`).toBeTruthy();
      const t = rules.get(m![1]!)!;
      expect(p.answer, `씨앗 ${s}`).toBe(`$${t * Number(m![2])}$개`);
      seen.add(m![1]!);
      looked += 1;
    }
    counted(looked, "1단 전량");
    expect(seen.size, "조각이 한 종류뿐이면 답이 한 줄로 굳는다").toBe(3);
  });

  it("**2단 — 발문에 없는 관계를 스스로 세운다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-4", s, "기본");
      const rules = rulesIn(p.content);
      expect(rules.size, `씨앗 ${s}: 관계 둘을 줘야`).toBe(2);
      const whole = rules.get("정육각형");
      expect(whole, `씨앗 ${s}: 큰 쪽은 정육각형이어야`).toBe(6);
      const part = [...rules].find(([nm]) => nm !== "정육각형")!;
      const m = p.content.match(/\$(\d+)\$개/);
      expect(m, `씨앗 ${s}: 개수를 못 읽음`).toBeTruthy();
      // 발문의 마지막 수가 곧 정육각형 개수다 — 앞 두 수는 관계다.
      const counts = [...p.content.matchAll(/\$(\d+)\$개/g)].map((x) =>
        Number(x[1]),
      );
      const k = counts[counts.length - 1]!;
      expect(p.answer, `씨앗 ${s}`).toBe(`$${(whole! / part[1]) * k}$개`);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("**3단 — 두 종류를 각각 바꾼 뒤 더한다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-6-4", s, "응용");
      const rules = rulesIn(p.content);
      expect(rules.size, `씨앗 ${s}: 관계 둘을 줘야`).toBe(2);
      const m = p.content.match(
        new RegExp(
          `(${PIECE}) 모양 조각 \\$(\\d+)\\$개와 (${PIECE}) 모양 조각 \\$(\\d+)\\$개를`,
        ),
      );
      expect(m, `씨앗 ${s}: 두 개수를 못 읽음`).toBeTruthy();
      const want =
        rules.get(m![1]!)! * Number(m![2]) + rules.get(m![3]!)! * Number(m![4]);
      expect(p.answer, `씨앗 ${s}`).toBe(`$${want}$개`);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 채운 모양은 그대로, 조각만 바꾼다** (㉣ 나누어떨어져야)", () => {
    let looked = 0;
    const pairs = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-6-4", s, "심화");
      const rules = rulesIn(p.content);
      expect(rules.size, `씨앗 ${s}: 관계 둘을 줘야`).toBe(2);
      const from = p.content.match(
        new RegExp(`^(${PIECE}) 모양 조각 \\$(\\d+)\\$개로 빈틈없이 채운`),
      );
      expect(from, `씨앗 ${s}: 준 조각을 못 읽음`).toBeTruthy();
      const to = p.content.match(
        new RegExp(`같은 모양을 (${PIECE}) 모양 조각만으로`),
      );
      expect(to, `씨앗 ${s}: 바꿀 조각을 못 읽음`).toBeTruthy();
      const tris = rules.get(from![1]!)! * Number(from![2]);
      const each = rules.get(to![1]!)!;
      expect(
        tris % each,
        `씨앗 ${s}: 정삼각형 ${tris}개를 ${to![1]}(${each})로 못 채운다 — 그런 모양이 없다`,
      ).toBe(0);
      expect(p.answer, `씨앗 ${s}`).toBe(`$${tris / each}$개`);
      expect(
        from![1],
        `씨앗 ${s}: 같은 조각으로 바꾸면 되짚기가 없다`,
      ).not.toBe(to![1]);
      pairs.add(`${from![1]}→${to![1]}`);
      looked += 1;
    }
    counted(looked, "4단 전량");
    expect(pairs.size, "짝이 하나뿐이면 되짚기 방향이 굳는다").toBeGreaterThan(
      2,
    );
  });

  it("**갈래에는 그림이 없고, 표준에는 `tiling` 이 붙는다** (㉤)", () => {
    let tiered = 0;
    const stdKinds = new Set<string>();
    const answers = new Set<string>();
    for (const s of SWEEP.slice(0, 200)) {
      for (const tier of ELEM_TIERS) {
        expect(
          gen("2-6-4", s, tier).figureSpec,
          `«${tier}» 씨앗 ${s}`,
        ).toBeFalsy();
        tiered += 1;
      }
      const std = gen("2-6-4", s);
      const spec = std.figureSpec as { kind?: string } | null;
      expect(spec, `표준 씨앗 ${s}: 그림이 없다`).toBeTruthy();
      stdKinds.add(String(spec!.kind));
      answers.add(std.answer);
    }
    counted(tiered, "2-6-4 갈래 그림 전량");
    expect(stdKinds).toEqual(new Set(["tiling"]));
    // 🔴 그림 붙은 문항의 답이 한 가지면 「그림이 있다」가 곧 답이다(09 §2.2 ⑥).
    expect(answers.size, `표준 답이 ${[...answers]} 뿐이다`).toBeGreaterThan(1);
  });
});
