// @vitest-environment node
/**
 * 선수 확인 연결의 회귀 — Claude 검토(integration-claude-review.md)의 막는 것 셋을 고친 뒤를 지킨다.
 *
 *   B2 켜짐 · 시범 **밖** 학생 · 열린 초등 미션 · 교사가 계획을 끔 → 기존 대체 가지로 미션이 끝난다
 *      (켜짐에서도 꺼짐과 같은 추천) · 시범 학생은 계획이 꺼지면 새 세션을 내지 않는다
 *   B3 공급 부족 → 탐험 DTO `canStart` 거짓 · 시작은 «모두 마쳤어요»가 아니라 공급 부족 사유로 거절 ·
 *      오늘 완료로 표시하지 않는다
 *   S1 탐험 DTO 의 `canStart` 와 실제 시작의 수락이 같다(같은 결정 함수)
 *
 * 문항은 실제 엔진이 낸다. 공급 부족만은 실제 엔진으로 만들 수 없어 공급 모듈을 한 겹 감싼다
 * (`supplyMode.exhausted` 가 참일 때만 «20후보 모두 실패»를 돌려준다).
 */
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const supplyMode = vi.hoisted(() => ({ exhausted: false }));
vi.mock("@/lib/math-prerequisite/supply", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/math-prerequisite/supply")>();
  return {
    ...actual,
    supplySafeSession: (
      ...args: Parameters<typeof actual.supplySafeSession>
    ): ReturnType<typeof actual.supplySafeSession> =>
      supplyMode.exhausted
        ? { ok: false, tried: 20 }
        : actual.supplySafeSession(...args),
  };
});

import {
  courseSummary,
  setCoursePlan,
  startRecommendedCourse,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import {
  expeditionCourseRecommendation,
  expeditionDto,
  updateExpedition,
} from "@/lib/math-explorers/expedition";
import { startExpedition } from "@/lib/math-explorers/expeditionStart";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import {
  emptySrsState,
  SrsConflict,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { coursePrerequisiteDecision } from "@/lib/math-prerequisite/courseIntegration";
import { PREREQUISITE_REASONS } from "@/lib/math-prerequisite/policy";
import {
  failedTargetCourse,
  finishPrerequisiteFixture,
  fixtureSession,
} from "../helpers/mathPrerequisiteIntegrationFixture";
import { DAY, plannedCourse } from "../helpers/mathPrerequisiteCourse";

/** 2026-10-03 12:00 KST */
const now = new Date("2026-10-03T03:00:00.000Z");
const studentId = "6f1d1c2e-4a5b-4c3d-9e8f-0a1b2c3d4e5f";
const OLD_FALLBACK = "오늘 시작한 학습의 남은 문제를 이어 풀어요.";
const COMPLETED_MESSAGE =
  "오늘의 탐험을 모두 마쳤어요. 지난 칸을 다시 풀어 볼 수 있어요.";

beforeEach(() => {
  vi.stubEnv("MATH_PREREQ_CHECK", "on");
  supplyMode.exhausted = false;
});
afterEach(() => {
  vi.unstubAllEnvs();
  supplyMode.exhausted = false;
});

/**
 * 탐험 기록 — g5-fractions 의 개념 카드를 다 모아 둔다. 안 모으면 그날은 개념 날(explorers)이라
 * 초등 은행 세션이 열리지 않고, 아래 시험이 은행 경로를 하나도 안 거친 채 초록이 된다
 * (처음 이 파일을 돌렸을 때 S1 다섯이 그렇게 헛통과했다).
 */
const srs = (course: StoredCourse): StoredSrsState => {
  const explorers = createExplorerState(studentId, 5);
  explorers.profile.definitions = {
    runs: 1,
    goalUnitId: "g5-fractions",
    history: [],
    cards: Object.fromEntries(
      definitionCards
        .filter((card) => card.unit === "g5-fractions")
        .map((card) => [
          card.id,
          {
            level: 1,
            due: "2026-11-03",
            lastDate: "2026-10-02",
            attemptedAt: "2026-10-02",
            missed: 0,
          },
        ]),
    ),
  };
  return { ...emptySrsState(), course, explorers };
};

function start(state: StoredSrsState): StoredSrsState {
  return startExpedition(state, studentId, now, randomUUID(), 11, randomUUID);
}

/** 미션을 열고 첫 세션을 끝낸 뒤(5/10) 교사가 계획을 끈 상태. */
function pausedAfterFirstSession(course: StoredCourse) {
  const opened = start(srs(course));
  expect(opened.expedition!.mission).toMatchObject({
    kind: "elementary",
    unitId: "g5-fractions",
    goal: 10,
    status: "active",
  });
  const answered = updateExpedition(
    opened,
    { ...opened, course: finishPrerequisiteFixture(opened.course!, now, 0) },
    now,
  );
  expect(answered.expedition!.mission!.answered).toBe(5);
  const plan = answered.course!.plan!;
  return updateExpedition(
    answered,
    {
      ...answered,
      course: setCoursePlan(
        answered.course!,
        {
          startSectionId: plan.startSectionId,
          dailyQuestionCount: plan.dailyQuestionCount,
          enabled: false,
          expectedRevision: 0,
        },
        now,
      ),
    },
    now,
    { teacher: true },
  );
}

describe("B2 — 계획을 끈 열린 미션", () => {
  it("켜짐에서도 시범 밖 학생은 기존 대체 가지로 미션을 끝낸다(꺼짐과 같은 추천)", () => {
    const paused = pausedAfterFirstSession(
      plannedCourse("5-2-2-3", new Date(now.getTime() - DAY)),
    );
    const onRecommendation = expeditionCourseRecommendation(paused, now);
    expect(onRecommendation).toEqual({
      sectionId: "5-2-2-3",
      mode: "review",
      reason: OLD_FALLBACK,
    });
    vi.stubEnv("MATH_PREREQ_CHECK", "off");
    expect(expeditionCourseRecommendation(paused, now)).toEqual(onRecommendation);
    vi.stubEnv("MATH_PREREQ_CHECK", "on");

    // 그 추천으로 둘째 세션을 시작하면 가드를 지나고, 끝내면 미션이 끝난다.
    const second = startRecommendedCourse(
      paused.course!,
      onRecommendation,
      now,
      23,
      randomUUID,
      [],
    );
    const guarded = updateExpedition(paused, { ...paused, course: second }, now);
    expect(guarded.expedition!.mission!.sourceSessionIds).toHaveLength(2);
    const finished = updateExpedition(
      guarded,
      { ...guarded, course: finishPrerequisiteFixture(guarded.course!, now, 0) },
      now,
    );
    expect(finished.expedition!.mission).toMatchObject({
      answered: 10,
      status: "complete",
    });
  });

  it("시범 학생은 계획이 꺼지면 새 세션을 내지 않는다 — 미션은 열린 채 완료로 보이지 않는다", () => {
    const paused = pausedAfterFirstSession(
      plannedCourse("5-2-2-1", new Date(now.getTime() - DAY)),
    );
    expect(expeditionCourseRecommendation(paused, now)).toBeNull();
    expect(courseSummary(paused.course!, now).recommendation).toBeNull();
    // 코스 시작 경로는 추천이 없으면 상태를 바꾸지 않는다.
    expect(
      startRecommendedCourse(paused.course!, null, now, 5, randomUUID, []),
    ).toBe(paused.course);
    expect(paused.expedition!.mission).toMatchObject({
      status: "active",
      answered: 5,
    });
    expect(expeditionDto(paused, studentId, now).completedToday).toBe(false);
    // 꺼짐이면 예전처럼 대체 가지가 남은 문제를 낸다.
    vi.stubEnv("MATH_PREREQ_CHECK", "off");
    expect(expeditionCourseRecommendation(paused, now)).toEqual({
      sectionId: "5-2-2-1",
      mode: "review",
      reason: OLD_FALLBACK,
    });
  });
});

describe("B3 — 공급 부족은 완료가 아니다", () => {
  it("미션 전: DTO 는 시작 불가와 공급 부족 사유, 시작은 그 사유로 거절, 오늘 완료 아님", () => {
    const course = failedTargetCourse(now, 10);
    supplyMode.exhausted = true;
    expect(coursePrerequisiteDecision(course, now)).toMatchObject({
      kind: "unavailable",
      canStart: false,
      session: null,
    });
    const dto = expeditionDto(srs(course), studentId, now);
    expect(dto.canStart).toBe(false);
    expect(dto.completedToday).toBe(false);
    expect(dto.prerequisiteContext).toMatchObject({
      kind: "unavailable",
      canStart: false,
      sectionId: null,
      reason: PREREQUISITE_REASONS.unavailable,
    });
    let thrown: unknown;
    try {
      start(srs(course));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SrsConflict);
    expect((thrown as Error).message).toBe(PREREQUISITE_REASONS.unavailable);
    expect((thrown as Error).message).not.toBe(COMPLETED_MESSAGE);
    const summary = courseSummary(course, now);
    expect(summary.recommendation).toBeNull();
    expect(["done", "complete"]).not.toContain(summary.status);
  });

  it("미션 중: 확인을 끝낸 뒤 목표 공급이 바닥나면 새 세션이 없고 미션은 열린 채다", () => {
    const opened = start(srs(failedTargetCourse(now, 10)));
    expect(opened.course!.learner.session).toMatchObject({
      sectionId: "5-1-5-4",
      mode: "review",
    });
    const checked = updateExpedition(
      opened,
      { ...opened, course: finishPrerequisiteFixture(opened.course!, now, 2) },
      now,
    );
    supplyMode.exhausted = true;
    expect(expeditionCourseRecommendation(checked, now)).toBeNull();
    const dto = expeditionDto(checked, studentId, now);
    expect(dto.canStart).toBe(false);
    expect(dto.completedToday).toBe(false);
    expect(dto.prerequisiteContext?.reason).toBe(PREREQUISITE_REASONS.unavailable);
    expect(checked.expedition!.mission!.status).not.toBe("complete");
  });
});

describe("S1 — 탐험 DTO 의 canStart 와 실제 시작의 수락이 같다", () => {
  /** [이름, 코스, 공급 부족, 기대하는 표시 문맥(없으면 undefined)] */
  const cases: [
    string,
    () => StoredCourse,
    boolean,
    "check" | "return" | "unavailable" | undefined,
  ][] = [
    ["발동(확인)", () => failedTargetCourse(now, 10), false, "check"],
    [
      "복귀 대기",
      () => {
        const failed = failedTargetCourse(now, 10);
        const at = new Date(now.getTime() - DAY);
        return finishPrerequisiteFixture(
          fixtureSession(failed, "5-1-5-4", "review", at, "s1-return"),
          at,
          2,
        );
      },
      false,
      "return",
    ],
    ["공급 부족", () => failedTargetCourse(now, 10), true, "unavailable"],
    [
      "시범 목표 · 발동 없음",
      () => plannedCourse("5-2-2-1", new Date(now.getTime() - DAY)),
      false,
      undefined,
    ],
    [
      "시범 밖",
      () => plannedCourse("5-2-2-3", new Date(now.getTime() - DAY)),
      false,
      undefined,
    ],
  ];

  for (const [name, build, exhausted, expectedKind] of cases)
    it(name, () => {
      const state = srs(build());
      supplyMode.exhausted = exhausted;
      const dto = expeditionDto(state, studentId, now);
      // 헛통과 막기: 그날이 초등 은행 날이고, 기대한 문맥이 실제로 나와야 한다.
      expect(dto.next).toMatchObject({ kind: "elementary", unitId: "g5-fractions" });
      expect(dto.prerequisiteContext?.kind).toBe(expectedKind);
      let started: StoredSrsState | null = null;
      let rejection: unknown = null;
      try {
        started = start(state);
      } catch (error) {
        rejection = error;
      }
      expect(started !== null).toBe(dto.canStart);
      if (!dto.canStart) {
        expect(rejection).toBeInstanceOf(SrsConflict);
        expect((rejection as Error).message).toBe(
          dto.prerequisiteContext?.reason ?? COMPLETED_MESSAGE,
        );
        return;
      }
      const context = dto.prerequisiteContext;
      const session = started!.course!.learner.session!;
      if (context?.canStart && context.sectionId) {
        // DTO 가 보인 범위와 모드로 세션이 열린다.
        expect(session.sectionId).toBe(context.sectionId);
        expect(session.mode).toBe(context.kind === "check" ? "review" : "learn");
      }
    });
});
