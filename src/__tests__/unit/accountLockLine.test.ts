/**
 * 원장님 발급 칸의 «잠김 — N분 뒤 풀림» 한 줄 — N 을 세는 곳 (D-127 Q5 · learn-screens 브리프 §6).
 *
 * 🔴 화면은 **«지금보다 뒤인가»만** 본다 — 잠금 규칙(5회 · 10분)을 화면에 다시 적지 않는다. 잠금이 언제
 *    끝나는지는 서버가 준 `lockedUntil` 이 정한다. N 은 **올림한 분**(1초 남아도 «1분», 끝나면 줄이 없다).
 */
import { describe, expect, it } from "vitest";

import { lockMinutesLeft } from "@/lib/class/accountLock";

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
