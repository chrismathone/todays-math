/**
 * 원장님 발급 칸의 «잠김 — N분 뒤 풀림» 한 줄 — N 을 세는 곳 (D-127 Q5 · learn-screens 브리프 §6).
 *
 * 🔴 화면은 **«지금보다 뒤인가»만** 본다 — 잠금 규칙(5회 · 10분)을 화면에 다시 적지 않는다. 잠금이 언제
 *    끝나는지는 서버가 준 `lockedUntil` 이 정한다. N 은 **올림한 분**(1초 남아도 «1분», 끝나면 줄이 없다).
 */
import { describe, expect, it } from "vitest";

import { lockLineNextChangeMs, lockMinutesLeft } from "@/lib/class/accountLock";

const NOW = new Date("2026-09-15T05:00:00.000Z");
const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe("잠김 한 줄의 N — 올림한 분 · «지금보다 뒤»일 때만", () => {
  it("🔴 잠금이 없거나 · 끝났거나 · 지금 막 끝나면 줄이 없다(null)", () => {
    expect(lockMinutesLeft(null, NOW)).toBeNull();
    expect(lockMinutesLeft(at(-60_000), NOW)).toBeNull();
    expect(lockMinutesLeft(at(-1), NOW)).toBeNull();
    expect(lockMinutesLeft(at(0), NOW)).toBeNull();
  });

  it("🔴 끝 1ms · 1초 전은 «1분» — 내림하면 «0분 뒤 풀림»이 선다", () => {
    expect(lockMinutesLeft(at(1), NOW)).toBe(1);
    expect(lockMinutesLeft(at(1_000), NOW)).toBe(1);
  });

  it("분 경계 — 60초 남음은 1분, 60.001초는 2분 · 막 잠겼으면(10분) 10분", () => {
    expect(lockMinutesLeft(at(59_000), NOW)).toBe(1);
    expect(lockMinutesLeft(at(60_000), NOW)).toBe(1);
    expect(lockMinutesLeft(at(60_001), NOW)).toBe(2);
    expect(lockMinutesLeft(at(9 * 60_000 + 1_000), NOW)).toBe(10);
    expect(lockMinutesLeft(at(10 * 60_000), NOW)).toBe(10);
  });

  it("읽을 수 없는 시각은 줄을 세우지 않는다", () => {
    expect(lockMinutesLeft("not-a-date", NOW)).toBeNull();
  });
});

/**
 * 칸을 열어 둔 채 몇 분이 지나도 N 이 그대로이고, 잠금이 끝나도 줄이 남았다(보고서 §7-19).
 * 🔴 D-128 ⑶(리드) — 칸은 **N 이 바뀌는 순간**에 다시 센다. 그때까지 남은 시간을 여기서 센다(1분 간격이 아니다 —
 *    열어 둔 때가 분 가운데면 1분 간격은 최대 1분 늦다).
 */
describe("🔴 칸을 열어 둔 채 다시 센다 — N 이 바뀌는(또는 줄이 사라지는) 순간까지 (D-128 ⑶)", () => {
  it("5분 30초 남음 → 30초 뒤(6 → 5) · 딱 5분 → 1분 뒤(5 → 4) · 1초 남음 → 1초 뒤(줄이 사라진다)", () => {
    expect(lockLineNextChangeMs(at(330_000), NOW)).toBe(30_000);
    expect(lockLineNextChangeMs(at(300_000), NOW)).toBe(60_000);
    expect(lockLineNextChangeMs(at(1_000), NOW)).toBe(1_000);
  });

  it("🔴 그 순간에 N 이 정확히 하나 준다 — 1ms 전까지는 그대로 (늦지도 이르지도 않다)", () => {
    const later = (ms: number) => new Date(NOW.getTime() + ms);
    for (const left of [1, 999, 59_999, 60_000, 60_001, 330_000, 600_000]) {
      const n = lockMinutesLeft(at(left), NOW)!;
      const wait = lockLineNextChangeMs(at(left), NOW)!;
      expect(lockMinutesLeft(at(left), later(wait - 1)), `남음 ${left}`).toBe(
        n,
      );
      expect(lockMinutesLeft(at(left), later(wait)) ?? 0, `남음 ${left}`).toBe(
        n - 1,
      );
    }
  });

  it("잠금이 없거나 · 끝났거나 · 읽을 수 없으면 다시 셀 일이 없다(null)", () => {
    expect(lockLineNextChangeMs(null, NOW)).toBeNull();
    expect(lockLineNextChangeMs(at(0), NOW)).toBeNull();
    expect(lockLineNextChangeMs(at(-1), NOW)).toBeNull();
    expect(lockLineNextChangeMs("not-a-date", NOW)).toBeNull();
  });
});
