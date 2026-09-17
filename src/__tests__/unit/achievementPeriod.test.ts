/**
 * 🔴 RED → 🟢 — **성취 리포트의 기간 경계** (D-134 트랙 2, 브리프 §1.1 «주 시작은 월요일 00:00»).
 *
 * 구현: src/lib/achievement/period.ts
 *
 * 무엇을 잠그나
 * 1. 🔴 **일요일 23:59(KST)와 월요일 00:00(KST)는 다른 주다.** UTC 로 읽으면 둘 다 일요일이라
 *    한 주로 뭉개진다 — 채점 시각(`TestResult.takenAt`)이 timestamp 라 실제로 걸리는 자리다.
 * 2. 주의 첫날은 **월요일**이다(일요일이 아니다 — 매쓰플랫도 그렇다, 23 §2.1).
 * 3. 「지난 같은 길이 기간」은 **이번 기간 바로 앞날에서 끝나고 길이가 같다**(비교군 ①).
 */
import { describe, expect, it } from "vitest";

import {
  addDays,
  diffDays,
  kstWeekOf,
  periodDays,
  previousPeriod,
  recentWeeks,
  startOfWeek,
  WEEK_START_WEEKDAY,
  weekdayOf,
  withinPeriod,
} from "@/lib/achievement/period";

describe("성취 기간 — 주 경계", () => {
  it("주의 첫 요일은 월요일(1)이다", () => {
    expect(WEEK_START_WEEKDAY).toBe(1);
  });

  it("월~일 어느 날을 물어도 그 주의 월요일을 낸다", () => {
    // 2026-09-14 는 월요일
    expect(weekdayOf("2026-09-14")).toBe(1);
    for (const [day, monday] of [
      ["2026-09-14", "2026-09-14"], // 월
      ["2026-09-15", "2026-09-14"], // 화
      ["2026-09-18", "2026-09-14"], // 금
      ["2026-09-20", "2026-09-14"], // 일 — 🔴 다음 주가 아니다
      ["2026-09-21", "2026-09-21"], // 월
    ] as const) {
      expect(startOfWeek(day)).toBe(monday);
    }
  });

  it("🔴 일요일 23:59(KST)와 월요일 00:00(KST)는 다른 주다", () => {
    // 2026-09-20(일) 23:59 KST = 2026-09-20T14:59Z
    expect(kstWeekOf(new Date("2026-09-20T14:59:59.000Z"))).toBe("2026-09-14");
    // 2026-09-21(월) 00:00 KST = 2026-09-20T15:00Z — UTC 로는 아직 일요일이다
    expect(kstWeekOf(new Date("2026-09-20T15:00:00.000Z"))).toBe("2026-09-21");
  });

  it("KST 로 읽지 않으면 새벽이 어제 주로 샌다", () => {
    // 2026-09-21(월) 08:00 KST = 2026-09-20T23:00Z — UTC 날짜는 아직 일요일(20일)이다
    expect(kstWeekOf(new Date("2026-09-20T23:00:00.000Z"))).toBe("2026-09-21");
  });
});

describe("성취 기간 — 길이와 직전 기간", () => {
  it("기간의 날 수는 양끝을 포함한다", () => {
    expect(periodDays({ from: "2026-09-14", to: "2026-09-14" })).toBe(1);
    expect(periodDays({ from: "2026-09-14", to: "2026-09-20" })).toBe(7);
  });

  it("직전 기간은 길이가 같고 이번 기간 바로 앞날에서 끝난다", () => {
    const now = { from: "2026-09-14", to: "2026-09-27" };
    const prev = previousPeriod(now);
    expect(prev).toEqual({ from: "2026-08-31", to: "2026-09-13" });
    expect(periodDays(prev)).toBe(periodDays(now));
    expect(addDays(prev.to, 1)).toBe(now.from);
  });

  it("최근 N주는 그 주의 월요일에서 거꾸로 센다", () => {
    expect(recentWeeks("2026-09-17", 4)).toEqual({
      from: "2026-08-24",
      to: "2026-09-17",
    });
  });

  it("기간 판정은 양끝을 포함한다", () => {
    const p = { from: "2026-09-14", to: "2026-09-20" };
    expect(withinPeriod(p, "2026-09-14")).toBe(true);
    expect(withinPeriod(p, "2026-09-20")).toBe(true);
    expect(withinPeriod(p, "2026-09-13")).toBe(false);
    expect(withinPeriod(p, "2026-09-21")).toBe(false);
  });

  it("날짜 셈은 달력 날짜끼리다", () => {
    expect(diffDays("2026-09-14", "2026-09-20")).toBe(6);
    expect(diffDays("2026-09-20", "2026-09-14")).toBe(-6);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});
