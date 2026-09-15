/**
 * 시청 규칙 (D-123 ⑥′) — 수맥 `LecturePlayer.tsx` 의 머리말·감시 틱과
 * `learning-material.ts` 의 `recordVideoWatch` 에서 **규칙만** 뽑아 온 것.
 * 컴포넌트는 옮기지 않았다(D-07 — 화면은 시안부터).
 *
 * 수맥 소유자 결정 둘을 그대로 가져왔다:
 *  - 목적은 부정 방지가 아니라 **보통의 학생이 무심코 건너뛰지 않고 끝까지 보게** 하는 것.
 *    그래서 서버는 보내온 진도를 받되 **뒤로만 가지 않게** 한다.
 *  - 인강에는 「다 봤어요」 버튼이 없다 — 완료는 95% 를 넘을 때 기록 규칙이 스스로 찍는다.
 *
 * 변이 ②(뒤로 안 간다)·③(한 번 완료면 완료)이 여기 🔴 사례를 겨눈다.
 */
import { describe, expect, it } from "vitest";

import {
  canSkipForward,
  clampSeek,
  isWatchComplete,
  mergeWatchRecord,
  resumePosition,
  watchPercent,
  watchTick,
  WATCH_COMPLETE_PERCENT,
  type WatchRecord,
} from "@/lib/concept/watchRules";

const T0 = new Date("2026-09-15T01:00:00Z");
const T1 = new Date("2026-09-15T02:00:00Z");

describe("앞으로 감기는 본 최대 지점까지", () => {
  it("본 곳 너머로 옮기려 하면 본 최대 지점에서 멈춘다", () => {
    expect(clampSeek(100, 50)).toBe(50);
  });

  it("뒤로 감기는 자유다 — 어려운 데를 다시 보는 것은 막을 이유가 없다", () => {
    expect(clampSeek(20, 50)).toBe(20);
    expect(clampSeek(-5, 50)).toBe(0);
  });

  it("10초 앞으로 단추는 그 10초가 본 곳 안일 때만 열린다", () => {
    expect(canSkipForward(30, 50)).toBe(true);
    expect(canSkipForward(45, 50)).toBe(false);
  });

  it("감시 틱 — 허용 폭(1.5초)을 넘게 튀면 본 최대 지점으로 되돌린다", () => {
    expect(watchTick(10, 5)).toEqual({ kind: "rewind", to: 5 });
  });

  it("감시 틱 — 자연 진행(허용 폭 안)은 최대 지점을 올린다", () => {
    expect(watchTick(6, 5)).toEqual({ kind: "advance", maxSeconds: 6 });
  });

  it("감시 틱 — 되감은 위치는 그대로 둔다", () => {
    expect(watchTick(3, 5)).toEqual({ kind: "hold" });
  });
});

describe("진도와 완료", () => {
  it("진도는 본 최대 지점 / 길이 — 길이를 모르면 0, 100 을 넘지 않는다", () => {
    expect(watchPercent(50, 100)).toBe(50);
    expect(watchPercent(120, 100)).toBe(100);
    expect(watchPercent(10, 0)).toBe(0);
  });

  it("완료 문턱은 95% 다", () => {
    expect(WATCH_COMPLETE_PERCENT).toBe(95);
    expect(isWatchComplete(94.9)).toBe(false);
    expect(isWatchComplete(95)).toBe(true);
  });
});

describe("시청 기록 (서버 쪽 규칙 — 수맥 recordVideoWatch)", () => {
  it("첫 기록 — 95% 미만이면 완료가 아니다", () => {
    expect(
      mergeWatchRecord(null, { seconds: 30.4, percent: 23.2 }, T0),
    ).toEqual({
      maxSeconds: 30,
      percent: 23,
      completedAt: null,
    });
  });

  it("첫 기록 — 95% 이상이면 그 시각에 완료가 찍힌다", () => {
    expect(mergeWatchRecord(null, { seconds: 125, percent: 96.9 }, T0)).toEqual(
      {
        maxSeconds: 125,
        percent: 97,
        completedAt: T0,
      },
    );
  });

  it("🔴 진도는 뒤로 안 간다 — 되감아 보낸 낮은 값이 최고 기록을 덮지 않는다", () => {
    const prev: WatchRecord = {
      maxSeconds: 100,
      percent: 80,
      completedAt: null,
    };
    expect(mergeWatchRecord(prev, { seconds: 10, percent: 8 }, T1)).toEqual({
      maxSeconds: 100,
      percent: 80,
      completedAt: null,
    });
  });

  it("🔴 한 번 완료면 완료 — 다시 보다 낮은 값을 보내도 처음 완료 시각 그대로", () => {
    // 되감아 다시 볼 때 미완료로 돌아가면 다음 단계가 도로 잠긴다(수맥 주석).
    // 시각까지 본다 — 「완료인가」만 보면 진도 최댓값이 완료를 다시 찍어 줘서
    // coalesce 를 지워도 초록이 된다(변이 ③ 이 그걸 잡으려고 여기를 겨눈다).
    const prev: WatchRecord = { maxSeconds: 125, percent: 97, completedAt: T0 };
    const next = mergeWatchRecord(prev, { seconds: 3, percent: 2 }, T1);
    expect(next.completedAt).toEqual(T0);
    expect(next.percent).toBe(97);
  });

  it("진도가 오르면 올린다", () => {
    const prev: WatchRecord = {
      maxSeconds: 30,
      percent: 23,
      completedAt: null,
    };
    expect(mergeWatchRecord(prev, { seconds: 60, percent: 46 }, T1)).toEqual({
      maxSeconds: 60,
      percent: 46,
      completedAt: null,
    });
  });

  it("범위를 벗어난 값은 접는다 — 음수·NaN 은 0, 100 넘는 진도는 100", () => {
    expect(mergeWatchRecord(null, { seconds: -3, percent: 130 }, T0)).toEqual({
      maxSeconds: 0,
      percent: 100,
      completedAt: T0,
    });
    expect(
      mergeWatchRecord(null, { seconds: Number.NaN, percent: Number.NaN }, T0),
    ).toEqual({
      maxSeconds: 0,
      percent: 0,
      completedAt: null,
    });
  });
});

describe("이어 보기", () => {
  it("🔴 끝까지 본 영상은 끝 지점에 두지 않는다 — 처음부터 (수맥 실측: 누르자마자 끝났다)", () => {
    expect(resumePosition(129, 129)).toBe(0);
    // 끝 5초 안도 «끝까지 본 것»으로 본다
    expect(resumePosition(125, 129)).toBe(0);
  });

  it("중간까지 본 영상은 거기서 잇는다", () => {
    expect(resumePosition(60, 129)).toBe(60);
  });

  it("1초도 안 봤으면 처음부터", () => {
    expect(resumePosition(0.8, 129)).toBe(0);
  });

  it("길이를 아직 모르면 본 데서 잇는다 (재생기가 준비되기 전)", () => {
    expect(resumePosition(60, 0)).toBe(60);
  });
});
