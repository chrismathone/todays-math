/**
 * 보기 번호 배치 규칙 — 원장님 2026-09-20 확정(고르는 값 넷).
 *
 * 라벨(원장님 표) ↔ 값: 「5행」=5x1 · 「3열 2행」=2x3 · 「2열 3행」=3x2 · 「자동」=auto.
 * 값의 어휘는 **이미 있던 것**이다 — OCR 이 원본 배치를 기록하는
 * `OCRProblem.choicesLayout`(`src/lib/mathgen/contracts.ts:89`) 과 같은 «행x열» 표기.
 * 두 벌을 만들지 않으려고 그대로 쓴다.
 *
 * 🔴 여기서 잠그는 것은 **열 수 하나**다. 행 수는 보기 수를 열 수로 나눈 결과라
 * 라벨의 «행» 숫자는 **보기가 다섯일 때의 모습**을 가리킨다(보기 넷이면 「3열 2행」은
 * ①②③ / ④ 로 2행이 된다).
 */
import { describe, expect, it } from "vitest";

import {
  CHOICE_COLUMN_CLASS,
  choiceColumnCount,
  choiceColumnLimit,
} from "@/lib/math/choiceLayout";
import { displayWidth, TWO_COLUMN_WIDTH_LIMIT } from "@/lib/math/displayWidth";

const five = ["$1$", "$2$", "$3$", "$4$", "$5$"];
/** 실측 표본 — 표시폭 36 으로 2열 한 칸(24)도 넘는다. */
const LONG = "서로 다른 두 소수는 항상 서로소이다.";
/** 3열 한 칸(13)은 넘고 2열 한 칸(24)에는 들어가는 보기. */
const MEDIUM = "$x=2y+3z-1$";

describe("[보기 배치] 칸 폭 상한은 이미 있던 실측에서 이어 뽑는다", () => {
  it("2열 상한은 `TWO_COLUMN_WIDTH_LIMIT` 와 같은 수다", () => {
    // 새 상수를 지어내지 않았다는 증거 — 같은 실측(문항 열 364px)에서 나온다.
    expect(choiceColumnLimit(2)).toBe(TWO_COLUMN_WIDTH_LIMIT);
  });

  it("열이 늘수록 칸이 좁아진다", () => {
    expect(choiceColumnLimit(1)).toBeGreaterThan(choiceColumnLimit(2));
    expect(choiceColumnLimit(2)).toBeGreaterThan(choiceColumnLimit(3));
    expect(choiceColumnLimit(3)).toBeGreaterThan(choiceColumnLimit(5));
  });

  it("표본의 폭이 상한을 가르는 자리에 실제로 있다", () => {
    expect(displayWidth(MEDIUM)).toBeGreaterThan(choiceColumnLimit(3));
    expect(displayWidth(MEDIUM)).toBeLessThanOrEqual(choiceColumnLimit(2));
    expect(displayWidth(LONG)).toBeGreaterThan(choiceColumnLimit(2));
  });
});

describe("[보기 배치] 값 넷이 서로 다른 열 수를 낸다", () => {
  it("자동 — 오늘 그대로 (들어가면 2열, 아니면 1열)", () => {
    expect(choiceColumnCount("auto", five)).toBe(2);
    expect(choiceColumnCount("auto", [LONG, ...five])).toBe(1);
  });

  it("5행 — 언제나 1열", () => {
    expect(choiceColumnCount("5x1", five, true)).toBe(1);
    expect(choiceColumnCount("5x1", [LONG, ...five], true)).toBe(1);
  });

  it("2열 3행 — 언제나 2열. 넘쳐도 지킨다(«자동»과 갈리는 자리다)", () => {
    expect(choiceColumnCount("3x2", five, true)).toBe(2);
    // 자동이었다면 1열로 내려갔을 문항이다.
    expect(choiceColumnCount("auto", [LONG, ...five])).toBe(1);
    expect(choiceColumnCount("3x2", [LONG, ...five], true)).toBe(2);
  });

  it("3열 2행 — 3열. 3열 칸에 안 들어가면 그 문항만 한 단계씩 내린다", () => {
    expect(choiceColumnCount("2x3", five, true)).toBe(3);
    expect(choiceColumnCount("2x3", [MEDIUM, ...five], true)).toBe(2);
    expect(choiceColumnCount("2x3", [LONG, ...five], true)).toBe(1);
  });
});

describe("[보기 배치] 보기가 다섯이 아닐 때", () => {
  it("열 수만 정하고 행 수는 보기 수를 따라간다", () => {
    // 보기 넷 + 「3열 2행」 → ①②③ / ④ (열은 셋 그대로)
    expect(choiceColumnCount("2x3", five.slice(0, 4), true)).toBe(3);
    // 보기 여섯 + 「2열 3행」 → 2열 3행이 아니라 2열 **3행 초과**(열만 지킨다)
    expect(choiceColumnCount("3x2", [...five, "$6$"], true)).toBe(2);
  });

  it("보기 수보다 많은 열은 만들지 않는다 — 빈 칸이 남는다", () => {
    expect(choiceColumnCount("2x3", ["$1$", "$2$"], true)).toBe(2);
    expect(choiceColumnCount("3x2", ["$1$"], true)).toBe(1);
  });

  it("보기가 없으면 1열이다", () => {
    expect(choiceColumnCount("2x3", [], true)).toBe(1);
    expect(choiceColumnCount("auto", [])).toBe(1);
  });
});

describe("[보기 배치] OCR 원본 힌트는 오늘 그대로다", () => {
  /**
   * 🔴 원장님이 고른 값이 아닌 **OCR 힌트**로 들어온 배치는 넘침을 보지 않는다.
   * 지금 `NativeProblem` 이 그렇게 그리고 있고, 기본값(«자동»)에서 지면이 한 픽셀도
   * 달라지면 안 되기 때문이다.
   */
  it("힌트는 폭을 재지 않고 그대로 쓴다", () => {
    expect(choiceColumnCount("2x3", [LONG, ...five])).toBe(3);
    expect(choiceColumnCount("1x5", [LONG, ...five])).toBe(5);
  });

  it("힌트는 보기 수로 깎지도 않는다 — 오늘의 마크업 그대로", () => {
    expect(choiceColumnCount("1x5", ["$1$", "$2$"])).toBe(5);
  });
});

describe("[보기 배치] 열 수 → Tailwind 클래스", () => {
  it("정적 문자열이라 Tailwind 가 스캔에서 본다", () => {
    expect(CHOICE_COLUMN_CLASS[1]).toBe("grid-cols-1");
    expect(CHOICE_COLUMN_CLASS[2]).toBe("grid-cols-2");
    expect(CHOICE_COLUMN_CLASS[3]).toBe("grid-cols-3");
    expect(CHOICE_COLUMN_CLASS[5]).toBe("grid-cols-5");
  });
});
