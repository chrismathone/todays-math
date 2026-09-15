/**
 * 🔴 ① 앞으로 감기는 **본 곳까지만** — 뒤로 감기 · 배속은 된다 · 한 번 끝까지 본 영상은 어디든 (D-124 ⑸).
 *
 * 규칙: src/lib/learn/seekGuard.ts — 재생기(`src/components/learn/LecturePlayer.tsx`)는 이 함수만 부른다.
 * 우회 방지가 목적은 아니다(D-124 ⑸) — 평범한 학생이 무심코 건너뛰지 않게 하는 정도다.
 *
 * 브리프 §3 ① 의 경계: 본 곳 ±1초 · 끝까지 본 뒤 · 뒤로 감기 · 배속.
 */
import { describe, expect, it } from "vitest";

import {
  clampSeekTarget,
  nextPlaybackRate,
  PLAYBACK_RATES,
  playbackTick,
  WATCH_REPORT_INTERVAL_MS,
  type SeekState,
} from "@/lib/learn/seekGuard";

const WATCHING: SeekState = { maxWatched: 60, completed: false, duration: 139 };
const DONE: SeekState = { maxWatched: 139, completed: true, duration: 139 };

describe("🔴 옮기려는 지점 → 옮길 지점 (clampSeekTarget)", () => {
  it("본 곳 ±1초 — 1초 앞은 본 곳으로 되돌리고, 1초 뒤·정확히 본 곳은 그대로", () => {
    expect(clampSeekTarget(61, WATCHING)).toBe(60);
    expect(clampSeekTarget(59, WATCHING)).toBe(59);
    expect(clampSeekTarget(60, WATCHING)).toBe(60);
  });

  it("안 본 곳 멀리(끝)로 가려 해도 본 곳까지만", () => {
    expect(clampSeekTarget(139, WATCHING)).toBe(60);
    expect(clampSeekTarget(10_000, WATCHING)).toBe(60);
  });

  it("뒤로 감기는 자유 — 처음까지. 0 밑 · 숫자 아님은 0", () => {
    expect(clampSeekTarget(5, WATCHING)).toBe(5);
    expect(clampSeekTarget(0, WATCHING)).toBe(0);
    expect(clampSeekTarget(-3, WATCHING)).toBe(0);
    expect(clampSeekTarget(Number.NaN, WATCHING)).toBe(0);
  });

  it("🔴 한 번 끝까지 본 영상은 어디든 — 영상 길이 안에서", () => {
    const rewatching: SeekState = { ...DONE, maxWatched: 20 };
    expect(clampSeekTarget(120, rewatching)).toBe(120);
    expect(clampSeekTarget(500, rewatching)).toBe(139);
    expect(clampSeekTarget(-1, rewatching)).toBe(0);
  });

  it("처음 보는 영상(본 곳 0)은 앞으로 한 칸도 못 간다", () => {
    expect(
      clampSeekTarget(1, { maxWatched: 0, completed: false, duration: 139 }),
    ).toBe(0);
  });
});

describe("🔴 감시 틱 — 저절로 흐른 것과 감은 것을 가른다 (배속 · 밀린 틱)", () => {
  const tick = (
    previous: number,
    current: number,
    elapsedSeconds: number,
    rate: number,
    s: SeekState = WATCHING,
  ) => playbackTick({ previous, current, elapsedSeconds, rate }, s);

  it("본 곳 안에서는 그대로 둔다 (되감아 다시 보는 중)", () => {
    expect(tick(10, 10.25, 0.25, 1)).toStrictEqual({ kind: "hold" });
  });

  it("본 곳을 넘어 저절로 흐르면 본 곳을 올린다", () => {
    expect(tick(60, 60.25, 0.25, 1)).toStrictEqual({
      kind: "advance",
      maxWatched: 60.25,
    });
  });

  it("🔴 배속 — 2배속으로 1초에 3초 흐른 것은 저절로 흐른 것, 1배속이면 감은 것", () => {
    expect(tick(60, 63, 1, 2)).toStrictEqual({
      kind: "advance",
      maxWatched: 63,
    });
    expect(tick(60, 63, 1, 1)).toStrictEqual({ kind: "rewind", to: 60 });
  });

  it("🔴 탭이 가려져 틱이 밀려도(10초) 1배속 10초 진행은 감은 것이 아니다", () => {
    expect(tick(60, 70, 10, 1)).toStrictEqual({
      kind: "advance",
      maxWatched: 70,
    });
  });

  it("안 본 곳으로 튀면 본 곳으로 되돌린다 — 되감아 보다가 앞으로 뛰어넘어도", () => {
    expect(tick(60, 100, 0.25, 2)).toStrictEqual({ kind: "rewind", to: 60 });
    expect(tick(20, 61.8, 0.25, 1)).toStrictEqual({ kind: "rewind", to: 60 });
  });

  it("되감아 본 곳까지 다시 와서 이어 넘기는 것은 저절로 흐른 것", () => {
    expect(tick(59.9, 60.15, 0.25, 1)).toStrictEqual({
      kind: "advance",
      maxWatched: 60.15,
    });
  });

  it("🔴 끝까지 본 영상은 되돌리지 않는다 — 어디로 튀어도", () => {
    const rewatching: SeekState = { ...DONE, maxWatched: 30 };
    expect(tick(10, 120, 0.25, 1, rewatching)).toStrictEqual({
      kind: "advance",
      maxWatched: 120,
    });
  });
});

describe("배속 · 보고 간격 — 상수는 한 곳", () => {
  it("배속 단추는 1 → 1.25 → 1.5 → 2 → 1 로 돈다", () => {
    expect(PLAYBACK_RATES).toStrictEqual([1, 1.25, 1.5, 2]);
    expect(nextPlaybackRate(1)).toBe(1.25);
    expect(nextPlaybackRate(2)).toBe(1);
    expect(nextPlaybackRate(0.5)).toBe(1);
  });

  it("시청 보고 간격은 15초", () => {
    expect(WATCH_REPORT_INTERVAL_MS).toBe(15_000);
  });
});
