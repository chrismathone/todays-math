/**
 * 고등 수식 뒤 조사 — 제품(`src/lib/high/josa.ts`)과 시험 쪽 자(`helpers/highPage.ts`) **둘 다**.
 *
 * 🔴 2026-09-13 물결 1 준비 중에 찾았다: 제품 `finalOf` 는 `\dfrac{1}{2}` 의 끝 `}` 를 걷고
 * **분모 2** 로 읽었다. 분수는 「2분의 **1**」로 읽으므로 끝소리는 **분자**다 —
 * `$\dfrac{1}{2}$를` 이 나갈 자리였다. 시험 쪽 `roMismatches` 도 똑같이 분모를 읽어 **같이 눈이 멀어**
 * 있었다(2026-08-18 「세는 쪽과 고치는 쪽이 같이 눈이 먼다」). 본보기 14유형은 분수 뒤에 조사를
 * 붙이지 않아 안 드러났다 — 물결 1 의 복소수·이차방정식·부등식은 분수 답이 흔하다.
 *
 * 기대값은 손으로 읽은 소리다(제품·자 어느 쪽에서도 가져오지 않는다).
 */
import { describe, expect, it } from "vitest";

import { eul, eun, ga, gwa, ro } from "../../lib/high/josa";
import { highJosaMismatches, roMismatches } from "../helpers/highPage";

describe("제품 josa — 수식 끝소리", () => {
  it.each([
    // [수식, 을/를, (으)로, 읽기]
    ["\\dfrac{1}{2}", "을", "로", "2분의 일"],
    ["\\dfrac{3}{4}", "을", "으로", "4분의 삼"],
    ["\\dfrac{2}{3}", "를", "로", "3분의 이"],
    ["-\\dfrac{5}{2}", "를", "로", "마이너스 2분의 오"],
    ["\\frac{7}{3}", "을", "로", "3분의 칠"],
    ["\\dfrac{\\sqrt{3}}{2}", "을", "으로", "2분의 루트 삼"],
    ["\\dfrac{1+\\sqrt{5}}{2}", "를", "로", "2분의 1 더하기 루트 오"],
    ["\\dfrac{-1\\pm\\sqrt{3}i}{2}", "를", "로", "… 루트 3 아이"],
    ["x^{2}+\\dfrac{1}{4}", "을", "로", "… 4분의 일"],
    ["\\dfrac{a}{b}", "를", "로", "b분의 에이"],
    ["2i", "를", "로", "이 아이"],
    ["\\sqrt{2}", "를", "로", "루트 이"],
    ["x^{2}", "을", "으로", "엑스 제곱"],
    ["x-3", "을", "으로", "엑스 빼기 삼"],
    ["f(x)", "를", "로", "에프 엑스"],
    ["10", "을", "으로", "십"],
  ])("%s → %s · %s (%s)", (tex, wantEul, wantRo) => {
    expect(eul(tex)).toBe(wantEul);
    expect(ro(tex)).toBe(wantRo);
  });

  it("은/는 · 이/가 · 과/와 도 분자를 읽는다", () => {
    expect(eun("\\dfrac{1}{2}")).toBe("은");
    expect(ga("\\dfrac{2}{5}")).toBe("가");
    expect(gwa("\\dfrac{3}{2}")).toBe("과");
  });
});

describe("시험 쪽 자 — 분수 뒤 조사", () => {
  it("분모로 읽은 조사를 잡는다", () => {
    expect(highJosaMismatches("$\\dfrac{1}{2}$를 구하시오.")).toHaveLength(1);
    expect(highJosaMismatches("$\\dfrac{1}{2}$을 구하시오.")).toEqual([]);
    expect(highJosaMismatches("$\\dfrac{2}{3}$을 구하시오.")).toHaveLength(1);
    expect(roMismatches("$\\dfrac{1}{2}$으로 나누면")).toHaveLength(1);
    expect(roMismatches("$\\dfrac{1}{2}$로 나누면")).toEqual([]);
    expect(roMismatches("$\\dfrac{3}{4}$로 나누면")).toHaveLength(1);
  });

  it("문자·지수·허수 단위로 끝나도 판정한다", () => {
    expect(highJosaMismatches("$x^{2}$를 소거")).toHaveLength(1);
    expect(highJosaMismatches("$2i$을 더하면")).toHaveLength(1);
    expect(highJosaMismatches("$f(x)$을 구하시오")).toHaveLength(1);
    expect(highJosaMismatches("$z$와 $\\bar{z}$의")).toEqual([]);
  });

  it("「이」는 서술격과 겹쳐 판정하지 않는다 — 옳은 지면을 잡으면 가드가 꺼진다", () => {
    expect(highJosaMismatches("따라서 $\\dfrac{2}{3}$이다.")).toEqual([]);
  });
});
