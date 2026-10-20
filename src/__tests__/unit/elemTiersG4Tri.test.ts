/**
 * 초4 2-2 「삼각형」 4단 확대 (D-72) — 소단원 다섯.
 *
 * **참은 발문에서 온다.** 발문에 실린 길이·각도를 뽑아 답을 **독립 재도출**한다 —
 * 생성기를 되부르지 않고, 제품 상수도 안 쓴다(그러면 상수를 바꿔도 기대값이 따라가
 * 영원히 초록이다, CLAUDE.md 2026-08-18).
 *
 * 이 트랜치가 지켜야 하는 것 —
 *  ㉠ **「정삼각형도 이등변삼각형인가」를 묻는 자리를 안 만든다.** 교과서마다 다뤄지는
 *     방식이 갈려 답이 하나로 안 정해진다. 그래서 세 각이 모두 $60^\circ$ 인 삼각형을
 *     「이등변삼각형」이라 부르는 문항이 **한 건도 없어야** 한다 — 전량으로 잰다.
 *  ㉡ **삼각형이 되는 조건은 초4 범위 밖이다.** 「나머지 한 변이 될 수 있는 길이를 모두」는
 *     두 경우가 **다 성립할 때만** 물을 수 있다. 안 그러면 답이 하나인데 학생은 그것을
 *     가려낼 방법이 없다. 구성이 100% 를 보장하므로 문턱이 아니라 **전량**으로 잰다.
 *  ㉢ **3단은 중간값이 필요해야 3단이다.** 2-2-4 3단은 첫 판에 「나머지 한 각이 $90^\circ$」를
 *     낼 수 있었는데, 그러면 계산 없이 답이 보여 **1단이 된다.** 표본을 눈으로 보고서야
 *     드러났다 — 「세 부류가 다 나온다」만 세면 구조적으로 안 보인다. 그 자리를 잠근다.
 *  ㉣ **4단의 잘못된 근거는 «참이면서 쓸모없어야» 한다.** 2-2-4 4단은 「예각이 두 개니까
 *     예각삼각형」을 바로잡는 갈래인데, 표본이 예각삼각형이면 **틀린 근거로도 답이 맞아**
 *     아무것도 안 묻는다. 예각삼각형이 안 나오는 것을 전량으로 잠근다.
 *  ㉤ **분모를 같이 센다.** 100% 는 **분모가 0일 때도 100%** 다.
 *
 * ⚠️ **그림(`markedShape`)은 이 트랜치에 없다.** 렌더되는 것은 확인했지만
 * ⑴ 꼭짓점 이름이 없어 「그림에서 ㉠은?」을 못 묻고, ⑵ 변 라벨을 준 대로 도형 비율이
 * 따라가는지 안 재 봤다 — 안 따라가면 「$5$ cm, $5$ cm, $9$ cm」가 밑변이 짧은 그림으로
 * 나가 **그림이 수를 배반한다.** 재고 나서 얹는다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["2-2-1", "2-2-2", "2-2-3", "2-2-4", "2-2-5"] as const;
/**
 * **전량으로 잰다.** 이 트랜치의 약속은 대부분 «구성이 100% 를 보장하는» 것이라
 * 문턱으로 재면 절반이 무너져도 안 운다(g5 실측 2026-08-23: 구성 100% 를
 * 「200 중 100 초과」로 재던 가드가 119/200 으로 그냥 통과했다).
 */
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

/** `$12\,\mathrm{cm}$` 에서 $12$를 뽑는다. 순서를 지킨다 — 발문의 차례가 뜻을 가진다. */
const cmsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\\,\\mathrm\{cm\}\$/g)].map((m) => Number(m[1]));

/** `$46^\circ$` 에서 $46$을 뽑는다. */
const degsIn = (t: string): number[] =>
  [...t.matchAll(/\$(\d+)\^\\circ\$/g)].map((m) => Number(m[1]));

/** `$3$개` 에서 $3$을 뽑는다. 「개」가 붙은 것만 — 길이·각도와 섞이지 않게. */
const countIn = (t: string): number | null => {
  const m = t.match(/\$(\d+)\$개/);
  return m ? Number(m[1]) : null;
};

/** 각의 크기로 삼각형을 가른다 — 제품 `triClass` 를 부르지 않고 여기서 다시 정한다. */
function classOf(angles: readonly number[]): string {
  const big = Math.max(...angles);
  return big > 90 ? "둔각삼각형" : big === 90 ? "직각삼각형" : "예각삼각형";
}

/** 수를 지운 뼈대 — 「상수만 바꾼 것은 같은 문항」(R5)을 견주는 자리. */
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

/* ─────────────────────── 등록 ─────────────────────── */

describe("[초4 2-2] 등록", () => {
  it("다섯 소단원에 네 갈래가 다 붙어 있다", () => {
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
});

/* ───────────────── 대단원 전체를 가로지르는 약속 ───────────────── */

describe("[초4 2-2] 대단원 약속", () => {
  it("**세 각이 모두 $60^\\circ$ 인 삼각형을 «이등변삼각형»이라 부르지 않는다** (㉠)", () => {
    let looked = 0;
    let ambiguous = 0;
    for (const code of CODES) {
      for (const tier of [undefined, ...tiersOf(unitOf(code))]) {
        for (const s of SWEEP) {
          const p = gen(code, s, tier);
          looked += 1;
          if (!p.content.includes("이등변삼각형")) continue;
          // 발문·정답·해설을 통틀어 세 각이 다 $60^\circ$ 로 드러나면 그 문항은 흔들린다.
          const all = degsIn(`${p.content} ${p.answer} ${p.solution}`);
          const sixties = all.filter((v) => v === 60).length;
          if (sixties >= 3) ambiguous += 1;
        }
      }
    }
    counted(looked, "대단원 전량");
    expect(ambiguous, "정삼각형을 이등변삼각형이라 부른 문항").toBe(0);
  });

  it("**세 각을 다 적은 자리는 합이 늘 $180^\\circ$ 다** — 그림이 없어도 성립해야 한다", () => {
    let checked = 0;
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const s of SWEEP) {
          const p = gen(code, s, tier);
          const m = p.content.match(
            /세 각의 크기가 \$(\d+)\^\\circ\$, \$(\d+)\^\\circ\$, \$(\d+)\^\\circ\$/,
          );
          if (!m) continue;
          const sum = Number(m[1]) + Number(m[2]) + Number(m[3]);
          expect(sum, `${code} «${tier}» 씨앗 ${s}: ${p.content}`).toBe(180);
          checked += 1;
        }
      }
    }
    counted(checked, "세 각을 적은 발문");
  });
});

/* ─────────────────────── 2-2-1 변의 길이 ─────────────────────── */

describe("[초4 2-2-1] 변의 길이에 따라 분류", () => {
  it("1단 — 길이가 같은 변의 «개수»가 실제 개수와 맞는다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-1", s, "연산");
      const sides = cmsIn(p.content);
      expect(sides.length, `씨앗 ${s}: ${p.content}`).toBe(3);
      const want = sides.filter((v, i) =>
        sides.some((w, j) => i !== j && v === w),
      ).length;
      expect(countIn(p.answer), `씨앗 ${s}: ${p.content}`).toBe(want);
      // 세 변으로 삼각형이 되어야 한다 — 두 짧은 변의 합이 가장 긴 변보다 길다.
      const [a, b, c] = [...sides].sort((x, y) => x - y);
      expect(
        a! + b!,
        `씨앗 ${s}: 삼각형이 안 되는 세 변 ${sides}`,
      ).toBeGreaterThan(c!);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("**2단 — 두 답이 «모두» 삼각형이 된다** (㉡). 아니면 답이 하나인데 못 가려낸다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-1", s, "기본");
      const given = cmsIn(p.content);
      expect(given.length, `씨앗 ${s}`).toBe(2);
      const [small, big] = [...given].sort((x, y) => x - y);
      expect(
        cmsIn(p.answer).sort((x, y) => x - y),
        `씨앗 ${s}`,
      ).toEqual([small, big]);
      // 나머지가 작은 쪽이면 (small, small, big) — 이것이 삼각형이 되는 쪽이 빡빡하다.
      expect(
        small! * 2,
        `씨앗 ${s}: (${small}, ${small}, ${big}) 는 삼각형이 아니다`,
      ).toBeGreaterThan(big!);
      expect(
        small,
        `씨앗 ${s}: 두 변이 같으면 «될 수 있는 길이»가 하나다`,
      ).not.toBe(big);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("3단 — 답의 두 배에 나머지 한 변을 더하면 둘레다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-1", s, "응용");
      const [total, other] = cmsIn(p.content);
      const [leg] = cmsIn(p.answer);
      expect(leg! * 2 + other!, `씨앗 ${s}: ${p.content}`).toBe(total);
      expect(
        leg,
        `씨앗 ${s}: 세 변이 다 같으면 이등변이 아니라 정삼각형이다`,
      ).not.toBe(other);
      expect(leg! * 2, `씨앗 ${s}: 삼각형이 안 된다`).toBeGreaterThan(other!);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 두 조건이 «둘 다» 있어야 답이 하나로 정해진다**", () => {
    let looked = 0;
    const ways = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-1", s, "심화하");
      const [total, d] = cmsIn(p.content);
      const three = cmsIn(p.answer);
      expect(three.length, `씨앗 ${s}`).toBe(3);
      const [other, leg1, leg2] = three;
      expect(leg1, `씨앗 ${s}: 같은 두 변이 다르다`).toBe(leg2);
      expect(other! + leg1! + leg2!, `씨앗 ${s}: ${p.content}`).toBe(total);
      const longer = p.content.includes("깁니다");
      expect(leg1! - other!, `씨앗 ${s}: 차가 발문과 다르다`).toBe(
        longer ? d! : -d!,
      );
      expect(
        other,
        `씨앗 ${s}: 같은 두 변과 나머지가 같으면 정삼각형이다`,
      ).not.toBe(leg1);
      expect(leg1! * 2, `씨앗 ${s}: 삼각형이 안 된다`).toBeGreaterThan(other!);
      expect(leg1, `씨앗 ${s}: 변의 길이가 0 이하다`).toBeGreaterThan(0);
      ways.add(longer ? "길다" : "짧다");
      looked += 1;
    }
    counted(looked, "4단 전량");
    // 두 방향이 다 나와야 이 검사가 둘 다 지킨다.
    expect([...ways].sort(), "두 방향").toEqual(["길다", "짧다"]);
  });
});

/* ─────────────────────── 2-2-2 이등변삼각형 ─────────────────────── */

describe("[초4 2-2-2] 이등변삼각형의 성질", () => {
  it("1단 — 답이 발문에 적힌 그 각이다 (두 밑각은 같다)", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-2", s, "연산");
      const given = degsIn(p.content);
      expect(given.length, `씨앗 ${s}`).toBe(1);
      expect(degsIn(p.answer), `씨앗 ${s}`).toEqual(given);
      // 밑각이 $60^\circ$ 면 세 각이 다 $60^\circ$ 다 — ㉠ 이 막는 자리.
      expect(given[0], `씨앗 ${s}: 밑각 60 은 정삼각형이다`).not.toBe(60);
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("2단 — 두 밑각의 합에 답을 더하면 $180^\\circ$ 다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-2", s, "기본");
      const [sum] = degsIn(p.content);
      const [apex] = degsIn(p.answer);
      expect(sum! + apex!, `씨앗 ${s}: ${p.content}`).toBe(180);
      expect(sum! % 2, `씨앗 ${s}: 밑각이 자연수가 아니다`).toBe(0);
      expect(sum! / 2, `씨앗 ${s}: 밑각 60 은 정삼각형이다`).not.toBe(60);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("**3단 — 세 각이 $180^\\circ$ 이고 차가 발문의 그 값이다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-2", s, "응용");
      const [d] = degsIn(p.content);
      const [apex] = degsIn(p.answer);
      const smaller = p.content.includes("작습니다");
      const baseAngle = smaller ? apex! + d! : apex! - d!;
      expect(baseAngle * 2 + apex!, `씨앗 ${s}: ${p.content}`).toBe(180);
      expect(Math.abs(baseAngle - apex!), `씨앗 ${s}: 차가 발문과 다르다`).toBe(
        d,
      );
      expect(apex, `씨앗 ${s}: 각이 0 이하다`).toBeGreaterThan(0);
      expect(
        Number.isInteger(baseAngle),
        `씨앗 ${s}: 밑각이 자연수가 아니다`,
      ).toBe(true);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 배 관계가 실제로 성립하고 정삼각형이 아니다**", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-2", s, "심화하");
      const k = Number(p.content.match(/\$(\d+)\$배/)![1]);
      const apexIsBig = p.content.startsWith(
        "이등변삼각형에서 꼭지각의 크기가 한 밑각",
      );
      // 해설 마지막에 세 각이 다 적힌다 — 거기서 재도출한다.
      const three = degsIn(p.solution).slice(-4, -1);
      expect(three.length, `씨앗 ${s}`).toBe(3);
      expect(
        three[0]! + three[1]! + three[2]!,
        `씨앗 ${s}: ${p.solution}`,
      ).toBe(180);
      const [b1, b2, apex] = three;
      expect(b1, `씨앗 ${s}: 두 밑각이 다르다`).toBe(b2);
      expect(apexIsBig ? apex : b1, `씨앗 ${s}: 배 관계가 안 맞는다`).toBe(
        (apexIsBig ? b1! : apex!) * k,
      );
      expect(b1, `씨앗 ${s}: $1$배면 정삼각형이다`).not.toBe(apex);
      expect(degsIn(p.answer)[0], `씨앗 ${s}: 답이 세 각 중에 없다`).toBe(
        p.content.includes("꼭지각의 크기는 몇 도입니까") ? apex : b1,
      );
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-2-3 정삼각형 ─────────────────────── */

describe("[초4 2-2-3] 정삼각형의 성질", () => {
  it("1단 — 나머지 두 변이 준 변과 같다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-3", s, "연산");
      expect(cmsIn(p.answer), `씨앗 ${s}`).toEqual(cmsIn(p.content));
      looked += 1;
    }
    counted(looked, "1단 전량");
  });

  it("2단 — 묻는 변의 개수만큼 곱한 값이다 (셋이면 $3$배, 나머지 둘이면 $2$배)", () => {
    let looked = 0;
    const seen = new Set<number>();
    for (const s of SWEEP) {
      const p = gen("2-2-3", s, "기본");
      const [side] = cmsIn(p.content);
      const [answer] = cmsIn(p.answer);
      const times = p.content.includes("세 변의 길이의 합") ? 3 : 2;
      expect(answer, `씨앗 ${s}: ${p.content}`).toBe(side! * times);
      seen.add(times);
      looked += 1;
    }
    counted(looked, "2단 전량");
    // 두 문형이 다 나와야 이 검사가 둘 다 지킨다 — 한쪽만 나오면 나머지는 가드 밖이다.
    expect([...seen].sort(), "두 문형").toEqual([2, 3]);
  });

  it("3단 — 쓴 길이와 남은 길이를 더하면 처음 길이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-3", s, "응용");
      const [total, side] = cmsIn(p.content);
      const [left] = cmsIn(p.answer);
      expect(side! * 3 + left!, `씨앗 ${s}: ${p.content}`).toBe(total);
      expect(left, `씨앗 ${s}: 남은 길이가 0 이하다`).toBeGreaterThan(0);
      looked += 1;
    }
    counted(looked, "3단 전량");
  });

  it("**4단 — 남김없이 나누어떨어진다**. 안 떨어지면 「남김없이」가 거짓말이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-3", s, "심화하");
      const [total, side] = cmsIn(p.content);
      const count = countIn(p.answer);
      expect(side! * 3 * count!, `씨앗 ${s}: ${p.content}`).toBe(total);
      expect(count, `씨앗 ${s}: 「여러 개」인데 한 개다`).toBeGreaterThan(1);
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-2-4 각의 크기 ─────────────────────── */

describe("[초4 2-2-4] 각의 크기에 따라 분류", () => {
  it("1단 — 그 부류의 각을 실제로 센 값이 답이다", () => {
    let looked = 0;
    const asked = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-4", s, "연산");
      const three = degsIn(p.content);
      expect(three.length, `씨앗 ${s}`).toBe(3);
      const ask = p.content.match(/이 삼각형에서 (예각|직각|둔각)은/)![1]!;
      const want = three.filter((v) =>
        ask === "예각" ? v < 90 : ask === "직각" ? v === 90 : v > 90,
      ).length;
      expect(countIn(p.answer), `씨앗 ${s}: ${p.content}`).toBe(want);
      asked.add(ask);
      looked += 1;
    }
    counted(looked, "1단 전량");
    expect([...asked].sort(), "세 부류를 다 묻는다").toEqual([
      "둔각",
      "예각",
      "직각",
    ]);
  });

  it("2단 — 직각을 뺀 나머지가 답이다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-4", s, "기본");
      const given = degsIn(p.content);
      const [answer] = degsIn(p.answer);
      // 수가 없는 문형(「두 각의 합」)은 답이 $90^\circ$ 다.
      expect(answer, `씨앗 ${s}: ${p.content}`).toBe(
        given.length === 0 ? 90 : 90 - given[0]!,
      );
      expect(answer, `씨앗 ${s}: 각이 0 이하다`).toBeGreaterThan(0);
      looked += 1;
    }
    counted(looked, "2단 전량");
  });

  it("**3단 — 준 각이 $90^\\circ$ 가 아니다** (㉢). 그러면 계산 없이 답이 보인다", () => {
    let looked = 0;
    const answers = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-4", s, "응용");
      const [given] = degsIn(p.content);
      expect(
        given,
        `씨앗 ${s}: 답이 발문에 그대로 있다 — 3단이 1단이 된다`,
      ).not.toBe(90);
      const same = (180 - given!) / 2;
      expect(
        Number.isInteger(same),
        `씨앗 ${s}: 같은 두 각이 자연수가 아니다`,
      ).toBe(true);
      expect(same, `씨앗 ${s}: 각이 0 이하다`).toBeGreaterThan(0);
      expect(p.answer, `씨앗 ${s}: ${p.content}`).toBe(
        classOf([given!, same, same]),
      );
      answers.add(p.answer);
      looked += 1;
    }
    counted(looked, "3단 전량");
    // 답이 한 가지뿐이면 고를 것이 없다.
    expect(answers.size, "부류가 갈린다").toBeGreaterThan(1);
  });

  it("**4단 — 큰 각이 감춰져 있고, 잘못된 근거가 «참이면서 쓸모없다»** (㉣)", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-4", s, "심화하");
      const shown = degsIn(p.content);
      // **두 각만 보인다.** 셋을 다 보여 주면 셈이 한 단계도 없어 3단보다 가벼워진다.
      expect(shown.length, `씨앗 ${s}: ${p.content}`).toBe(2);
      // 발문이 내세우는 근거(보이는 두 각이 예각)가 실제로 참이어야 한다 — 거짓이면 딴 문항이다.
      expect(
        shown.every((v) => v < 90),
        `씨앗 ${s}: ${p.content}`,
      ).toBe(true);
      const hidden = 180 - shown[0]! - shown[1]!;
      expect(
        hidden,
        `씨앗 ${s}: 감춘 각이 예각이면 답이 예각삼각형이 된다`,
      ).toBeGreaterThanOrEqual(90);
      // 그 근거로 얻는 답(예각삼각형)이 정답이면 이 갈래는 아무것도 안 묻는다.
      expect(p.answer, `씨앗 ${s}: 틀린 근거로도 답이 맞는다`).not.toBe(
        "예각삼각형",
      );
      expect(p.answer, `씨앗 ${s}: ${p.content}`).toBe(
        classOf([shown[0]!, shown[1]!, hidden]),
      );
      // 해설이 감춘 각을 실제로 구해 보여야 한다 — 답만 적으면 학생이 못 따라온다.
      expect(p.solution, `씨앗 ${s}: 해설에 나머지 한 각이 없다`).toContain(
        `=${hidden}`,
      );
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});

/* ─────────────────────── 2-2-5 두 가지 기준 ─────────────────────── */

describe("[초4 2-2-5] 두 가지 기준으로 분류", () => {
  it("**1단 — 한 기준을 주고 다른 기준을 읽는다**. 두 축이 다 선다", () => {
    let looked = 0;
    const answers = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-5", s, "연산");
      const three = degsIn(p.content);
      expect(three.length, `씨앗 ${s}`).toBe(3);
      // 두 각만 같다 — 셋이 다 같으면 「정삼각형인가 이등변삼각형인가」가 되어 흔들린다.
      expect(new Set(three).size, `씨앗 ${s}: ${p.content}`).toBe(2);
      expect(p.answer, `씨앗 ${s}: ${p.content}`).toBe(classOf(three));
      answers.add(p.answer);
      looked += 1;
    }
    counted(looked, "1단 전량");
    // 세 부류가 다 나와야 「분류하면 무엇인가」가 고를 것이 있는 물음이 된다.
    expect(answers.size, "부류").toBe(3);
  });

  it("**모든 갈래에 두 기준이 «둘 다» 선다** — 한 축만 있으면 딴 소단원이다", () => {
    // 이 소단원 이름이 내건 것이 「두 가지 기준」이다. 1단이 실제로 각 축을 안 써서
    // 새로 붙인 소단원 조건 검사에 걸렸다(2026-08-23) — 그 자리를 여기서도 잠근다.
    // 「각의 크기**가**」(자료)와 「각의 크기**에 따라**」(기준)는 다른 말이라 뒤엣것만 센다.
    // 표준은 「**변의 길이와 각의 크기** 두 가지 기준으로」처럼 **이름 없이 기준만** 말한다 —
    // 좁게 잡으면 표준이 걸린다. 그렇게 말하는 문항은 스스로 둘 다 한다고 선언한 것이라
    // 「두 가지 기준」을 양쪽에 둔다.
    const bySide =
      /이등변삼각형|정삼각형|세 변의 길이|변의 길이에 따라|변의 길이와|두 가지 기준/;
    const byAngle = /예각|직각|둔각|각의 크기에 따라|두 가지 기준/;
    let looked = 0;
    for (const tier of [undefined, ...tiersOf(unitOf("2-2-5"))]) {
      for (const s of SWEEP) {
        const c = gen("2-2-5", s, tier).content;
        expect(bySide.test(c), `«${tier ?? "표준"}» 변 기준이 없다: ${c}`).toBe(
          true,
        );
        expect(
          byAngle.test(c),
          `«${tier ?? "표준"}» 각 기준이 없다: ${c}`,
        ).toBe(true);
        looked += 1;
      }
    }
    counted(looked, "두 기준 전량");
  });

  it("2단 — 그 각이 꼭지각이고 나머지 두 각이 답이다", () => {
    let looked = 0;
    const shapes = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-5", s, "기본");
      const isRight = p.content.includes("직각삼각형인");
      const apex = isRight ? 90 : degsIn(p.content)[0]!;
      const [base] = degsIn(p.answer);
      expect(base! * 2 + apex, `씨앗 ${s}: ${p.content}`).toBe(180);
      // 크기가 같은 두 각이 둘 다 직각·둔각일 수는 없다 — 그것이 이 갈래의 알맹이다.
      expect(
        base,
        `씨앗 ${s}: 밑각이 $90^\\circ$ 이상이면 세 각의 합이 넘는다`,
      ).toBeLessThan(90);
      expect(apex, `씨앗 ${s}: 직각·둔각이 아니다`).toBeGreaterThanOrEqual(90);
      shapes.add(isRight ? "직각" : "둔각");
      looked += 1;
    }
    counted(looked, "2단 전량");
    expect([...shapes].sort(), "두 부류가 다 나온다").toEqual(["둔각", "직각"]);
  });

  it("**3단 — 밑각에서 꼭지각을 구해야 부류가 정해진다**", () => {
    let looked = 0;
    const answers = new Set<string>();
    for (const s of SWEEP) {
      const p = gen("2-2-5", s, "응용");
      const [base] = degsIn(p.content);
      const apex = 180 - base! * 2;
      expect(apex, `씨앗 ${s}: 꼭지각이 0 이하다`).toBeGreaterThan(0);
      expect(base, `씨앗 ${s}: 밑각 60 은 정삼각형이다`).not.toBe(60);
      expect(p.answer, `씨앗 ${s}: ${p.content}`).toBe(
        classOf([base!, base!, apex]),
      );
      answers.add(p.answer);
      looked += 1;
    }
    counted(looked, "3단 전량");
    expect(answers.size, "세 부류가 다 나온다").toBe(3);
  });

  it("**4단 — 두 경우의 «부류가 서로 다르다»**. 같으면 경우를 나눈 보람이 없다", () => {
    let looked = 0;
    for (const s of SWEEP) {
      const p = gen("2-2-5", s, "심화하");
      const [given] = degsIn(p.content);
      const apexCase = [given!, (180 - given!) / 2, (180 - given!) / 2];
      const baseCase = [given!, given!, 180 - given! * 2];
      expect(
        apexCase.reduce((x, y) => x + y),
        `씨앗 ${s}`,
      ).toBe(180);
      expect(
        baseCase.reduce((x, y) => x + y),
        `씨앗 ${s}`,
      ).toBe(180);
      expect(
        Number.isInteger(apexCase[1]!),
        `씨앗 ${s}: 밑각이 자연수가 아니다`,
      ).toBe(true);
      // 두 경우가 정말 다른 부류여야 「모두 구하라」가 뜻을 가진다.
      expect(
        classOf(apexCase),
        `씨앗 ${s}: 두 경우의 부류가 같다 — ${p.content}`,
      ).not.toBe(classOf(baseCase));
      // 답에 두 부류가 다 적혀 있다.
      expect(p.answer, `씨앗 ${s}`).toContain(classOf(apexCase));
      expect(p.answer, `씨앗 ${s}`).toContain(classOf(baseCase));
      looked += 1;
    }
    counted(looked, "4단 전량");
  });
});
