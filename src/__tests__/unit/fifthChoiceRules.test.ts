/**
 * 🟢 「정답을 방해하지 않는 5번 보기」 규칙 — **보탠 보기가 정답을 바꾸지 않는가** (D-80).
 *
 * 원장님 지시 2026-08-25: 4지선다를 5지선다로 하되 **「정답을 방해하지 않는 5번 보기」**를
 * 우선한다. 그 「방해하지 않는다」가 이 시험이 지키는 전부다.
 *
 * ## 왜 이 시험이 필요한가
 *
 * 보탠 보기가 **또 하나의 정답이 되면** 아무도 신고하지 않는다 — 지면은 멀쩡하고
 * KaTeX 도 초록이고 값 검산 없이는 안 보인다. 이 저장소가 「그럴듯하게 틀린 값」으로
 * 여러 번 데인 자리다(CLAUDE.md 2026-08-19 「□ 보다 나쁜 그럴듯한 숫자」).
 *
 * ## 계수는 **손으로 적었다** — 규칙과 따로
 *
 * 아래 두 문항의 계수 목록은 공유 DB 실제 본문에서 **눈으로 읽어** 옮겼다.
 * `parseQuadCoef` 를 가져다 쓰면 파서가 틀려도 영원히 초록이다.
 */
import { describe, expect, it } from "vitest";

import {
  addFifthChoice,
  addFifthToCountType,
  addFifthToWidthType,
  cmpAbs,
  parseQuadCoef,
  parseRatAnswer,
  type Rat,
} from "../../../scripts/qa/fifthChoiceRules";
import { choiceCountOf } from "@/lib/problem/choiceCountRule";
import { FUNC_POOL } from "@/lib/middle/m2Func";

const KEY = "mid:3-1|이차함수의 그래프 ⑴|04";

/** 공유 DB 실측 본문 (2026-08-25) — `J30401-A04-001`. 정답 `$4$`. */
const P001 = [
  "다음 보기의 이차함수의 그래프 중 폭이 가장 좁은 것의 $x^2$의 계수를 구하시오.",
  "① $y=4x^2$",
  "② $y=\\dfrac{5}{2}x^2$",
  "③ $y=\\dfrac{1}{4}x^2$",
  "④ $y=\\dfrac{1}{3}x^2$",
].join("\n");
/** 그 문항의 계수를 **손으로** 적은 것 — 규칙과 독립인 참. */
const P001_COEFS: readonly Rat[] = [
  [4, 1],
  [5, 2],
  [1, 4],
  [1, 3],
];

/** 실측 본문 — `J30401-A04-002`. 정답 `$3$`. */
const P002 = [
  "다음 보기의 이차함수의 그래프 중 폭이 가장 좁은 것의 $x^2$의 계수를 구하시오.",
  "① $y=\\dfrac{3}{2}x^2$",
  "② $y=-\\dfrac{3}{4}x^2$",
  "③ $y=\\dfrac{1}{3}x^2$",
  "④ $y=3x^2$",
].join("\n");
const P002_COEFS: readonly Rat[] = [
  [3, 2],
  [-3, 4],
  [1, 3],
  [3, 1],
];

/** 엔진 계수 풀 — 규칙이 여기서만 고른다. */
const POOL: readonly Rat[] = [
  [1, 4],
  [1, 3],
  [1, 2],
  [2, 3],
  [3, 4],
  [3, 2],
  [4, 3],
  [2, 1],
  [5, 2],
  [3, 1],
  [4, 1],
  [5, 1],
];

/** 시험 쪽 «가장 좁은 것의 계수» — 규칙을 안 가져다 쓴다. */
function narrowest(coefs: readonly Rat[]): Rat | null {
  const abs = coefs.map((c) => Math.abs(c[0]) / c[1]);
  const max = Math.max(...abs);
  const winners = coefs.filter((_c, i) => abs[i] === max);
  return winners.length === 1 ? winners[0]! : null;
}

describe("계수·정답 파서 — 모르는 모양이면 지어내지 않는다", () => {
  it("아는 모양을 읽는다", () => {
    expect(parseQuadCoef("$y=4x^2$")).toEqual([4, 1]);
    expect(parseQuadCoef("$y=-3x^2$")).toEqual([-3, 1]);
    expect(parseQuadCoef("$y=\\dfrac{5}{2}x^2$")).toEqual([5, 2]);
    expect(parseQuadCoef("$y=-\\dfrac{2}{4}x^2$")).toEqual([-1, 2]); // 약분된다
    expect(parseQuadCoef("$y=x^2$")).toEqual([1, 1]);
    expect(parseQuadCoef("$y=-x^2$")).toEqual([-1, 1]);
  });

  it("모르는 모양은 null (음성 대조군)", () => {
    for (const bad of [
      "$y=2x^3$",
      "$y=2x^2+1$",
      "$y=ax^2$",
      "$x=2y^2$",
      "그림과 같이",
      "",
    ]) {
      expect(parseQuadCoef(bad), bad).toBeNull();
    }
  });

  it("정답 문자열도 아는 모양만 읽는다", () => {
    expect(parseRatAnswer("$4$")).toEqual([4, 1]);
    expect(parseRatAnswer("$-\\dfrac{1}{3}$")).toEqual([-1, 3]);
    expect(parseRatAnswer("$4$개")).toBeNull();
    expect(parseRatAnswer("③, ⑤")).toBeNull();
  });
});

describe("5번 보기 보태기 — 실제 두 문항", () => {
  it("보태고 나면 지면이 다섯을 그린다", () => {
    for (const [content, answer] of [
      [P001, "$4$"],
      [P002, "$3$"],
    ] as const) {
      const r = addFifthChoice(KEY, content, answer, "salt");
      expect(r.ok, content.slice(0, 30)).toBe(true);
      if (!r.ok) return;
      expect(choiceCountOf(r.content)).toBe(5);
      // **덧붙이기**여야 한다 — 앞 본문이 한 글자도 안 바뀐다.
      expect(r.content.startsWith(content)).toBe(true);
    }
  });

  it("🔴 보탠 보기가 정답을 바꾸지 않는다 — 손으로 적은 계수로 검산", () => {
    for (const [content, answer, coefs] of [
      [P001, "$4$", P001_COEFS],
      [P002, "$3$", P002_COEFS],
    ] as const) {
      const r = addFifthChoice(KEY, content, answer, "salt");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const addedTex = r.added.replace(/^⑤\s*/, "");
      const added = parseQuadCoef(addedTex)!;
      const before = narrowest(coefs)!;
      const after = narrowest([...coefs, added]);
      expect(after, "정답이 안 정해지게 됐다").not.toBeNull();
      expect(after).toEqual(before);
    }
  });

  it("같은 문항은 늘 같은 보기를 받는다 (결정적)", () => {
    const a = addFifthChoice(KEY, P001, "$4$", "J30401-A04-001");
    const b = addFifthChoice(KEY, P001, "$4$", "J30401-A04-001");
    expect(a).toEqual(b);
  });
});

describe("🔴 못 가르면 손대지 않는다 (음성 대조군)", () => {
  it("등록되지 않은 문항류는 안 건드린다", () => {
    const r = addFifthChoice("mid:2-1|연립일차방정식|01", P001, "$4$", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/보태기 규칙이 없다/);
  });

  it("정답을 안 건드릴 계수가 풀에 없으면 안 건드린다", () => {
    // 「가장 좁은」인데 정답이 풀의 **최소** 값이면, 더 작은 계수가 풀에 없다.
    const content = [
      "다음 보기의 이차함수의 그래프 중 폭이 가장 좁은 것의 $x^2$의 계수를 구하시오.",
      "① $y=\\dfrac{1}{4}x^2$",
      "② $y=\\dfrac{1}{5}x^2$",
      "③ $y=\\dfrac{1}{6}x^2$",
      "④ $y=\\dfrac{1}{7}x^2$",
    ].join("\n");
    const r = addFifthToWidthType(content, "$\\dfrac{1}{4}$", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/풀에 없다/);
  });

  it("저장된 정답이 지금 보기로 계산한 값과 다르면 안 건드린다", () => {
    const r = addFifthToWidthType(P001, "$\\dfrac{5}{2}$", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/저장된 정답과 다르다/);
  });

  it("계수를 못 읽는 보기가 있으면 안 건드린다", () => {
    const content = [
      "다음 보기의 이차함수의 그래프 중 폭이 가장 좁은 것의 $x^2$의 계수를 구하시오.",
      "① $y=4x^2$",
      "② $y=ax^2$",
      "③ $y=\\dfrac{1}{4}x^2$",
      "④ $y=\\dfrac{1}{3}x^2$",
    ].join("\n");
    const r = addFifthToWidthType(content, "$4$", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/계수를 못 읽는/);
  });

  it("발문이 «넓은»인지 «좁은»인지 안 갈리면 안 건드린다", () => {
    const r = addFifthToWidthType(P001.replace("좁은", "이상한"), "$4$", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/안 갈린다/);
  });

  it("|계수| 가 같은 보기가 이미 있으면 정답이 안 정해지므로 안 건드린다", () => {
    const content = [
      "다음 보기의 이차함수의 그래프 중 폭이 가장 좁은 것의 $x^2$의 계수를 구하시오.",
      "① $y=4x^2$",
      "② $y=-4x^2$",
      "③ $y=\\dfrac{1}{4}x^2$",
      "④ $y=\\dfrac{1}{3}x^2$",
    ].join("\n");
    const r = addFifthToWidthType(content, "$4$", "s");
    expect(r.ok).toBe(false);
  });
});

describe("🔴 풀 전량 × 두 문항 — 규칙이 받아들이는 계수는 **전부 무해하다**", () => {
  /**
   * ⚠️ 두 집합이 **같지는 않다.** 규칙이 더 좁다 — 이미 있는 |계수| 와 겹치는 값을
   *    거부한다. 그런 값은 정답을 안 바꾸지만 **보기 둘이 똑같아진다.** 그건 지면
   *    결함이라 값이 맞아도 안 쓴다(「값이 맞으면 시험이 다 초록이다」의 자리).
   *    그래서 여기서 잠그는 것은 «같다»가 아니라 **«받아들이면 반드시 무해하다»** 다.
   */
  it("받아들인 계수는 하나도 빠짐없이 정답을 안 바꾼다", () => {
    let accepted = 0;
    for (const [coefs, stored] of [
      [P001_COEFS, [4, 1] as Rat],
      [P002_COEFS, [3, 1] as Rat],
    ] as const) {
      for (const mag of POOL) {
        for (const sign of [1, -1] as const) {
          const cand: Rat = [sign * mag[0], mag[1]];
          const usable =
            cmpAbs(mag, stored) < 0 && !coefs.some((c) => cmpAbs(c, mag) === 0);
          if (!usable) continue;
          accepted += 1;
          // 시험 쪽 참 — 손으로 적은 계수로 따로 계산한다.
          const after = narrowest([...coefs, cand]);
          expect(after, `${mag[0]}/${mag[1]} 이 정답을 없앤다`).not.toBeNull();
          expect(after, `${mag[0]}/${mag[1]} sign=${sign}`).toEqual(stored);
          // 보기 둘이 똑같아지지도 않는다.
          expect(
            coefs.some((c) => cmpAbs(c, cand) === 0),
            `${mag[0]}/${mag[1]} 이 이미 있는 보기와 겹친다`,
          ).toBe(false);
        }
      }
    }
    // 🔴 축이 있어야 변이시킬 수 있다 — 하나도 안 받아들이면 위가 공짜로 초록이다.
    expect(accepted).toBeGreaterThanOrEqual(20);
  });

  it("거부한 계수 중에는 **실제로 정답을 바꾸는 것**이 있다 (양성 대조군)", () => {
    // 거부가 다 «겹침» 때문이면 극단 검사는 아무것도 안 지키는 셈이다.
    let harmful = 0;
    for (const mag of POOL) {
      const usable =
        cmpAbs(mag, [4, 1]) < 0 &&
        !P001_COEFS.some((c) => cmpAbs(c, mag) === 0);
      if (usable) continue;
      const after = narrowest([...P001_COEFS, mag]);
      if (after === null || after[0] !== 4 || after[1] !== 1) harmful += 1;
    }
    expect(harmful).toBeGreaterThan(0);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 「모두 몇 개인지」 유형 — ㉠~㉤ 목록
 * ──────────────────────────────────────────────────────────────────────── */

/** 실측 본문 (2026-08-25) — `J20401-A01-001`. 정답 `$2$개`. */
const COUNT4 = [
  "다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.",
  "㉠ 자연수 $x$보다 작은 홀수 $y$",
  "㉡ 한 개에 $500$원인 물건 $x$개의 값 $y$원",
  "㉢ 자연수 $x$를 $3$으로 나눈 나머지 $y$",
  "㉣ 절댓값이 $x$인 정수 $y$",
].join("\n");

/**
 * 🔴 **손으로 적은 진리표** — 위 네 보기가 함수인가. 규칙도 엔진 표도 안 쓴다.
 *   ㉠ $x=5$ 면 $y$ 는 $1,3$ — 여럿이다 → 거짓
 *   ㉡ 값은 $500x$ 하나 → 참
 *   ㉢ 나머지는 하나 → 참
 *   ㉣ $x=3$ 이면 $y=\pm3$ — 여럿이다 → 거짓
 */
const COUNT4_TRUTH = [false, true, true, false];

describe("「모두 몇 개인지」 유형 — 보태는 보기는 반드시 거짓이어야 한다", () => {
  it("보태면 다섯이 되고 «참의 개수»가 그대로다 (손 진리표로 검산)", () => {
    const r = addFifthToCountType(COUNT4, "$2$개", "J20401-A01-001");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.content.split("\n").length).toBe(6); // 발문 1 + 보기 5
    expect(r.content.startsWith(COUNT4)).toBe(true);
    // 손 진리표의 참 개수가 저장된 정답과 같다 — 그러니 거짓 하나를 보태도 그대로다.
    expect(COUNT4_TRUTH.filter(Boolean).length).toBe(2);
    // 보탠 문장이 이미 있던 보기와 겹치지 않는다.
    const bodies = COUNT4.split("\n").slice(1);
    expect(
      bodies.some((b) => b.slice(1).trim() === r.added.slice(1).trim()),
    ).toBe(false);
  });

  it("🔴 «함수인» 소재는 절대 안 보탠다 — 두 출처가 맞대야 한다", () => {
    // 규칙이 고르는 소재는 전부 엔진 표에서도 «함수 아님»이어야 한다.
    for (const salt of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const r = addFifthToCountType(COUNT4, "$2$개", salt);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const text = r.added.replace(/^㉤\s*/, "");
      const hit = FUNC_POOL.find((x) => x.text === text);
      expect(hit, `엔진 표에 없는 소재: ${text}`).toBeDefined();
      expect(hit!.isFunc, `함수인 소재를 보탰다: ${text}`).toBe(false);
    }
  });

  it("발문이 「모두 몇 개인지」가 아니면 안 건드린다 (음성 대조군)", () => {
    const r = addFifthToCountType(
      COUNT4.replace("모두 몇 개인지 구하시오", "모두 고르시오"),
      "$2$개",
      "s",
    );
    expect(r.ok).toBe(false);
  });

  it("정답이 «$N$개» 꼴이 아니면 안 건드린다", () => {
    const r = addFifthToCountType(COUNT4, "㉡, ㉢", "s");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/개» 꼴이 아니다/);
  });

  it("표식 차례가 ㉠부터 안 이어지면 안 건드린다", () => {
    const r = addFifthToCountType(
      COUNT4.replace("㉢ 자연수", "㉤ 자연수"),
      "$2$개",
      "s",
    );
    expect(r.ok).toBe(false);
  });
});
