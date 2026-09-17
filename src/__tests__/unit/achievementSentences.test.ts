/**
 * 🔴 RED → 🟢 — **리포트가 학부모에게 하는 말** (D-134 트랙 2, 브리프 §1.3).
 *
 * 구현: src/lib/achievement/sentences.ts
 *
 * 무엇을 잠그나
 * 1. 🔴 **근거가 모자라면 말하지 않는다**(`null`) — 애매한 문장을 지어내지 않는다.
 * 2. 사다리 순서(연산 → 기본 → 응용 → 심화)가 곧 뜻이다 — 「어디까지 되고 어디서 막히나」.
 * 3. 문구는 **전문용어 없이**(「10문제 중 6문제」) · **느낌표·이모지 없이**(D-08).
 * 4. 밀림은 **못 재면 말하지 않는다** — 「0일 밀림」으로 적지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  bandSentence,
  driftSentence,
  outOfPhrase,
  scoreSentence,
} from "@/lib/achievement/sentences";
import type { AchievementBand, BandAccuracy } from "@/lib/achievement/types";

const band = (accuracy: number, total = 10): BandAccuracy => ({
  correct: Math.round((accuracy / 100) * total),
  total,
  accuracy,
});

const bands = (
  over: Partial<Record<AchievementBand, BandAccuracy | null>>,
): Record<AchievementBand, BandAccuracy | null> => ({
  연산: null,
  기본: null,
  응용: null,
  심화: null,
  ...over,
});

describe("난이도 4단 — 한 문장", () => {
  it("🔴 잰 밴드가 없으면 말하지 않는다", () => {
    expect(bandSentence(null)).toBeNull();
    expect(bandSentence(bands({}))).toBeNull();
  });

  it("🔴 「기본까지는 되는데 응용에서 무너진다」 — 우리만 댈 수 있는 문장", () => {
    expect(
      bandSentence(
        bands({
          연산: band(95),
          기본: band(88),
          응용: band(40),
          심화: band(20),
        }),
      ),
    ).toBe("기본까지는 잘 풀고, 응용에서 막힙니다.");
  });

  it("전부 잘 풀면 그렇게 말한다", () => {
    expect(
      bandSentence(
        bands({
          연산: band(95),
          기본: band(90),
          응용: band(80),
          심화: band(75),
        }),
      ),
    ).toBe("심화까지 고르게 잘 풀고 있습니다.");
  });

  it("첫 단부터 막히면 «어디까지»를 지어내지 않는다", () => {
    expect(bandSentence(bands({ 연산: band(30), 기본: band(20) }))).toBe(
      "연산부터 많이 어려워합니다.",
    );
  });

  it("어중간하면(70 미만 50 이상) 말하지 않는다 — 지어내지 않는다", () => {
    expect(bandSentence(bands({ 연산: band(60), 기본: band(55) }))).toBeNull();
  });

  it("문항이 0인 밴드는 사다리에서 건너뛴다 — 0% 로 읽지 않는다", () => {
    expect(
      bandSentence(bands({ 기본: band(90), 응용: null, 심화: band(20) })),
    ).toBe("기본까지는 잘 풀고, 심화에서 막힙니다.");
  });
});

describe("문구 — 전문용어·느낌표 없이 (D-08)", () => {
  it("「10문제 중 6문제」", () => {
    expect(outOfPhrase(6, 10)).toBe("10문제 중 6문제");
  });

  it("평균을 문제 수로 바꿔 말한다", () => {
    expect(scoreSentence(62)).toBe("평균 10문제 중 6문제를 맞았습니다.");
  });

  it("🔴 평균이 없으면 말하지 않는다", () => {
    expect(scoreSentence(null)).toBeNull();
  });

  it("느낌표·이모지가 없다", () => {
    const all = [
      bandSentence(bands({ 연산: band(95), 기본: band(90), 응용: band(30) })),
      scoreSentence(62),
      driftSentence(-3),
      driftSentence(0),
      driftSentence(2),
    ].join(" ");
    expect(all).not.toMatch(/[!！]/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("계획 대비 밀림 — 못 재면 말하지 않는다", () => {
  it("🔴 null 이면 문장이 없다 — 「0일 밀림」으로 적지 않는다", () => {
    expect(driftSentence(null)).toBeNull();
  });

  it("0 이면 계획대로다 — 이때만 0이 참이다", () => {
    expect(driftSentence(0)).toBe("계획한 진도대로 나가고 있습니다.");
  });

  it("음수는 늦음 · 양수는 앞섬", () => {
    expect(driftSentence(-3)).toBe("계획보다 3일 늦습니다.");
    expect(driftSentence(2)).toBe("계획보다 2일 앞서 있습니다.");
  });
});
