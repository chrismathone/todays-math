import { describe, expect, it } from "vitest";

import {
  TEST_CLOCK_COOKIE,
  clockOffsetFromRequest,
  isTestConsoleLoginId,
  parseClockOffset,
  shiftedNow,
} from "@/lib/learn/testConsole";
import {
  patchExplorerProfile,
  resetSrsPart,
} from "@/lib/math-srs/testConsoleActions";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { emptyCourseState } from "@/lib/math-srs/courseAutomation";
import { emptyFading, pickFadingConcept } from "@/lib/fading/state";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const studentId = "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2";

describe("테스트 도구판 — 누구에게 열리나", () => {
  it("test_s 만 연다 — 대소문자·공백은 로그인 정규화와 같이 본다", () => {
    expect(isTestConsoleLoginId("test_s")).toBe(true);
    expect(isTestConsoleLoginId(" TEST_S ")).toBe(true);
    expect(isTestConsoleLoginId("test_t")).toBe(false);
    expect(isTestConsoleLoginId("test_s2")).toBe(false);
    expect(isTestConsoleLoginId("")).toBe(false);
    expect(isTestConsoleLoginId(null)).toBe(false);
    expect(isTestConsoleLoginId(undefined)).toBe(false);
  });
});

describe("시간 이동 — 쿠키의 날 수", () => {
  it("정수 날 수만 받고, 범위 밖·이상한 값은 0(지금)이다", () => {
    expect(parseClockOffset("3")).toBe(3);
    expect(parseClockOffset("-2")).toBe(-2);
    expect(parseClockOffset("60")).toBe(60);
    expect(parseClockOffset("61")).toBe(0);
    expect(parseClockOffset("-31")).toBe(0);
    expect(parseClockOffset("1.5")).toBe(0);
    expect(parseClockOffset("abc")).toBe(0);
    expect(parseClockOffset("")).toBe(0);
    expect(parseClockOffset(undefined)).toBe(0);
  });

  it("요청의 쿠키 머리에서 읽는다", () => {
    const req = (cookie?: string) =>
      new Request("http://localhost/api/learn/test-console", {
        headers: cookie ? { cookie } : {},
      });
    expect(clockOffsetFromRequest(req())).toBe(0);
    expect(
      clockOffsetFromRequest(req(`a=1; ${TEST_CLOCK_COOKIE}=5; b=2`)),
    ).toBe(5);
    expect(clockOffsetFromRequest(req(`${TEST_CLOCK_COOKIE}=zz`))).toBe(0);
  });

  it("날 수만큼 정확히 옮긴다(시각은 그대로)", () => {
    const real = new Date("2026-09-28T03:15:00.000Z");
    expect(shiftedNow(real, 0)).toBe(real);
    expect(shiftedNow(real, 2).toISOString()).toBe("2026-09-30T03:15:00.000Z");
    expect(shiftedNow(real, -1).toISOString()).toBe("2026-09-27T03:15:00.000Z");
  });

  it.each(["%", "%ZZ", "%E0%A4%A"])(
    "깨진 쿠키 인코딩 %s 는 학습 요청을 실패시키지 않고 실제 시각을 쓴다",
    (value) => {
      const request = new Request("http://localhost/api/learn/test-console", {
        headers: { cookie: `${TEST_CLOCK_COOKIE}=${value}` },
      });
      expect(clockOffsetFromRequest(request)).toBe(0);
    },
  );
});

describe("부분 초기화", () => {
  const filled = () => ({
    ...emptySrsState(),
    course: emptyCourseState(),
    explorers: createExplorerState(studentId, 5),
  });

  it("탐험만 지우면 탐험만 없어지고 나머지는 그대로다", () => {
    const state = filled();
    const next = resetSrsPart(state, "explorers");
    expect(next.explorers).toBeUndefined();
    expect(next.course).toBe(state.course);
    expect(next.memories).toBe(state.memories);
  });

  it("오늘의 기억(새 앱)의 칸만 지우면 그 칸만 없어지고 나머지는 그대로다", () => {
    const state = {
      ...filled(),
      fading: pickFadingConcept(emptyFading(), "m2-01-01-c1", "2026-10-06"),
    };
    const next = resetSrsPart(state, "fading");
    expect(next.fading).toBeUndefined();
    expect(next.explorers).toBe(state.explorers);
    expect(next.course).toBe(state.course);
    expect(parseSrsState(next).fading).toBeUndefined();
    // 다른 칸을 지워도 새 칸은 남는다.
    expect(resetSrsPart(state, "explorers").fading).toBe(state.fading);
  });

  it("코스·하루 여정·원정도 각자 제 칸만", () => {
    const state = filled();
    expect(resetSrsPart(state, "course").course).toBeUndefined();
    expect(resetSrsPart(state, "course").explorers).toBe(state.explorers);
    expect(resetSrsPart(state, "journey").dailyJourney).toBeUndefined();
    expect(resetSrsPart(state, "expedition").expedition).toBeUndefined();
  });

  it("기억 학습은 기억·미션을 처음 값으로 — 검증을 통과한다", () => {
    const next = resetSrsPart(filled(), "memory");
    expect(next.missions).toEqual([]);
    expect(next.memories).toEqual(emptySrsState().memories);
    expect(() => parseSrsState(next)).not.toThrow();
  });
});

describe("탐험 값 바꾸기", () => {
  const explorer = () => createExplorerState(studentId, 3);

  it("별을 올리면 누적(earned)도 그 아래로 내려가지 않는다", () => {
    const next = patchExplorerProfile(explorer(), { stars: 120 });
    expect(next.profile.stars).toBe(120);
    expect(next.profile.earned).toBeGreaterThanOrEqual(120);
  });

  it("별을 줄여도 누적은 그대로 둔다", () => {
    const rich = patchExplorerProfile(explorer(), { stars: 50 });
    const next = patchExplorerProfile(rich, { stars: 5 });
    expect(next.profile.stars).toBe(5);
    expect(next.profile.earned).toBe(rich.profile.earned);
  });

  it("기지 단계를 바꾼다", () => {
    expect(patchExplorerProfile(explorer(), { level: 4 }).profile.level).toBe(
      4,
    );
  });

  it("개념 카드 기록 지우기 — 카드·진행 중 세션을 비운다", () => {
    const base = explorer();
    base.profile.definitions = {
      courseGrade: 3,
      runs: 2,
      cards: {
        a: {
          level: 2,
          due: "2026-09-30",
          lastDate: "2026-09-27",
          attemptedAt: "2026-09-27",
          missed: 0,
        },
      },
      history: [],
    };
    const next = patchExplorerProfile(base, { clearCards: true });
    expect(next.profile.definitions?.cards).toEqual({});
    expect(next.profile.definitions?.session).toBeUndefined();
    expect(next.profile.definitions?.courseGrade).toBe(3);
  });

  it("원래 상태를 바꾸지 않는다", () => {
    const base = explorer();
    const before = structuredClone(base);
    patchExplorerProfile(base, { stars: 9, level: 2 });
    expect(base).toEqual(before);
  });
});
