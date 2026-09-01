/**
 * 초3 물결 4 — **비운 세 대단원의 «근거»를 잠근다** (D-115 ⑹, 2026-09-01).
 *
 * `1-2 평면도형`(5) · `1-6 분수와 소수`(7) · `2-3 원`(3) — 열다섯 소단원이다.
 * 토대 17 §3 은 셋 다 「없다」라 적었지만, **어느 회차도 그것을 잰 적이 없다.**
 * 이 파일은 「없다」를 **지금 돌려서** 다시 세운다. 근거가 무너지면 빨개진다.
 *
 * ## 🔴 왜 «없음»을 시험으로 잠그나
 *
 * 「비운다」는 `supportedTiers` 에 갈래가 **안 나타나는 것**으로만 드러난다. 그건
 * 아무 검사도 안 받는 상태다 — 다음 사람이 근거를 안 보고 채우면 그대로 지면에 나간다.
 * 그래서 **근거 자체를 재는 검사**를 둔다. 근거가 바뀌면(계산이 생기거나, 발문이 더는
 * 낱말을 안 말해 주면) 빨개지고, 그때 비로소 「채울 수 있나」를 다시 물을 수 있다.
 *
 * ## 무엇을 재나 — **전부 살아 있는 엔진에서 나온 값이다**
 *
 *   ⑴ `1-6-4·1-6-5·1-6-7` — 네 갈래 **전부 계산 걸음 0**. 되짚을 셈이 아예 없으므로
 *      심화상의 「그 소단원의 계산으로 나올 값들을 실제로 만들어 견준다」가 **성립 불가**다.
 *   ⑵ `2-3-2·2-3-3` — 발문이 「지름/반지름」을 **전량** 직접 말해 준다. 이 대단원에서
 *      후보가 될 수 있는 것은 「이 길이가 지름인가 반지름인가」 하나뿐인데, 그것을 발문이
 *      주면 **되짚기가 후보를 만드는 것이 아니다**(심화상 정의의 뒷문장).
 *   ⑶ `1-2-1·1-2-2·1-2-3` — 연산·기본의 계산 걸음이 **0**. 이름 짓기·분류라 값이 없다.
 *   ⑷ `1-2-4·1-2-5` — 둘레만 주면 후보가 여럿이지만, 그것을 하나로 만드는 이 대단원의
 *      성질은 「정사각형인가」 하나이고 그 답은 늘 $P\div4$ 다 — **한 걸음 순방향**이라
 *      반증 ⑥ 이고, 그 문항은 **이미 1-2-5 심화하**다. 여기서 전수로 다시 센다.
 *   ⑸ 열다섯 소단원 전부에 확대 갈래가 **없다**.
 *
 * ## ⚠️ 이 파일이 **못 보는 것**
 *
 * 1. 「계산이 없으면 어려운 문항을 못 만든다」는 **이 잣대 안에서만** 참이다.
 *    D-115 ⑽ 이 적어 둔 「되짚기가 없는데 어려운 통찰형」은 이 축 밖이고, 그 자리는
 *    비워 둔다(지어내지 않는다).
 * 2. `1-2-2` 의 「직각이 모두 $14$ 개」류를 못 잰다 — 미지수 둘을 겹치는 연립이라
 *    초3 지면 밖이라는 판단은 **사람이 한 것**이다(토대 17 §3).
 */
import { describe, expect, it } from "vitest";

import { countCalcSteps } from "@/lib/elementary/make";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 40 }, (_, i) => i * 977 + 7);

/** 이 회차가 비운 열다섯 — 「없다」를 적은 자리 전부다. */
const EMPTIED = [
  "1-2-1",
  "1-2-2",
  "1-2-3",
  "1-2-4",
  "1-2-5",
  "1-6-1",
  "1-6-2",
  "1-6-3",
  "1-6-4",
  "1-6-5",
  "1-6-6",
  "1-6-7",
  "2-3-1",
  "2-3-2",
  "2-3-3",
] as const;

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** 그 소단원의 **모든 갈래·모든 씨앗**에서 가장 큰 계산 걸음. */
function maxSteps(code: string): number {
  const u = unitOf(code);
  let max = 0;
  for (const tier of supportedTiers(u))
    for (const seed of SEEDS)
      max = Math.max(
        max,
        countCalcSteps(generateElementaryProblem(u, seed, tier).solution ?? ""),
      );
  return max;
}

describe("초3 물결 4 — 비운 열다섯의 근거 (1-2 · 1-6 · 2-3)", () => {
  it("🔴 눈금 — 걸음을 세는 자가 «0 이 아님»도 낼 수 있다", () => {
    // 0 이 «깨끗»인지 «못 셈»인지 갈려야 한다. 같은 자를 셈이 있는 소단원에 대 본다.
    expect(countCalcSteps("$2\\times9=18$ 이고 $18\\div3=6$ 입니다.")).toBe(2);
    expect(
      maxSteps("2-3-3"),
      "2-3-3 은 셈이 있다 — 여기서 0 이면 자가 눈멀었다",
    ).toBeGreaterThan(1);
    expect(countCalcSteps("지름은 원의 중심을 지납니다.")).toBe(0);
  });

  it("⑴ 1-6-4·1-6-5·1-6-7 — 네 갈래가 **전부 계산 걸음 0** 이다", () => {
    // 되짚을 셈이 아예 없으면 「실제로 만들어 견준다」가 성립할 수 없다(심화상 정의).
    for (const code of ["1-6-4", "1-6-5", "1-6-7"])
      expect(
        maxSteps(code),
        `${code}: 계산이 생겼다 — 「되짚을 셈이 없다」는 근거가 무너졌다. 채울 수 있는지 다시 물어라`,
      ).toBe(0);
  });

  it("⑵ 2-3-2·2-3-3 — 발문이 「지름/반지름」을 **전량** 직접 말해 준다", () => {
    // 이 대단원에서 후보가 될 수 있는 것은 그 낱말 하나뿐이다. 발문이 주면
    // 되짚기가 후보를 만드는 것이 아니라 **발문이 주는** 것이다(심화상 정의의 뒷문장).
    for (const code of ["2-3-2", "2-3-3"]) {
      const u = unitOf(code);
      for (const tier of supportedTiers(u)) {
        let said = 0;
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(u, seed, tier);
          if (/지름|반지름/.test(p.content)) said += 1;
        }
        expect(
          said,
          `${code} ${tier}: 발문이 낱말을 안 말해 주는 자리가 생겼다 — 후보가 열렸는지 다시 보라`,
        ).toBe(SEEDS.length);
      }
    }
  });

  it("⑶ 1-2-1·1-2-2·1-2-3 — 연산·기본에 **계산이 없다**(이름 짓기·분류다)", () => {
    for (const code of ["1-2-1", "1-2-2", "1-2-3"]) {
      const u = unitOf(code);
      for (const tier of ["연산", "기본"] as const) {
        let max = 0;
        for (const seed of SEEDS)
          max = Math.max(
            max,
            countCalcSteps(
              generateElementaryProblem(u, seed, tier).solution ?? "",
            ),
          );
        expect(
          max,
          `${code} ${tier}: 계산이 생겼다 — 「되짚을 값이 없다」는 근거가 흔들린다`,
        ).toBe(0);
      }
    }
  });

  it("⑷ 1-2-4·1-2-5 — 둘레를 되짚는 판은 **한 걸음 순방향**이라 반증 ⑥ 이다", () => {
    // 「네 변의 합만 주고 가로·세로를 되짚는다」로 마디를 열면 후보가 여럿 생긴다.
    // 그것을 하나로 만드는 이 대단원의 성질은 「정사각형인가」 하나뿐인데,
    // 그때 답은 **늘 $P\div4$** 다 — 지면의 수 하나를 한 번 나누면 나온다.
    let opened = 0;
    let bySquare = 0;
    for (let P = 8; P <= 60; P += 2) {
      const half = P / 2;
      const pairs: [number, number][] = [];
      for (let w = 1; w * 2 <= P - 2; w += 1) {
        const h = half - w;
        if (h >= 1 && w >= h) pairs.push([w, h]);
      }
      if (pairs.length < 2) continue;
      opened += 1;
      const squares = pairs.filter(([w, h]) => w === h);
      if (squares.length !== 1) continue;
      bySquare += 1;
      // 🔴 그 하나는 **반드시** $P\div4$ 다 — 여기서 다시 센다(주장이 아니라 계산이다).
      expect(
        squares[0]![0],
        `둘레 ${P}: 정사각형의 한 변이 $P\\div4$ 가 아니다`,
      ).toBe(P / 4);
    }
    expect(opened, "둘레가 후보를 둘 이상 내는 자리를 하나도 못 셌다").toBe(27);
    expect(bySquare, "「정사각형」이 하나를 남기는 자리").toBe(14);
  });

  it("⑸ 열다섯 소단원 전부에 확대 갈래가 없다", () => {
    for (const code of EMPTIED) {
      const tiers = supportedTiers(unitOf(code));
      expect(
        tiers,
        `${code}: 심화중이 생겼다 — 보고서 tier-fill-g3-w4.md §4 의 수를 다시 대라`,
      ).not.toContain("심화중");
      expect(
        tiers,
        `${code}: 심화상이 생겼다 — 보고서 tier-fill-g3-w4.md §4 의 수를 다시 대라`,
      ).not.toContain("심화상");
    }
  });
});
