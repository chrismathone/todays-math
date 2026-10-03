// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  courseSummary,
  setCoursePlan,
  startAutomaticCourse,
  storedCourseSchema,
  type StoredCourse,
} from "@/lib/math-srs/courseAutomation";
import {
  bindExpedition,
  expeditionCourseRecommendation,
  expeditionCoursePrerequisiteDecision,
  expeditionDto,
  updateExpedition,
} from "@/lib/math-explorers/expedition";
import {
  emptySrsState,
  parseSrsState,
  SrsConflict,
} from "@/lib/math-srs/serverState";
import { startExpedition } from "@/lib/math-explorers/expeditionStart";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import {
  coursePrerequisiteContext,
  teacherPrerequisiteEvidence,
} from "@/lib/math-prerequisite/display";
import { coursePrerequisiteDecision } from "@/lib/math-prerequisite/courseIntegration";
import { requestIdAllocator } from "@/lib/math-prerequisite/requestIds";
import {
  failedTargetCourse,
  finishPrerequisiteFixture,
} from "../helpers/mathPrerequisiteIntegrationFixture";

const now = new Date("2026-10-03T03:00:00.000Z");
const studentId = "ea587b9b-bb07-45b3-a689-7fd0050f68b2";
beforeEach(() => vi.stubEnv("MATH_PREREQ_CHECK", "on"));
afterEach(() => vi.unstubAllEnvs());

describe("선수 확인과 기존 코스/미션 연결", () => {
  it.each([5, 10, 15, 20] as const)(
    "하루 %i문항: 직접 review 실패도 발동하고 확인 후 목표 learn으로 복귀",
    (goal) => {
      let course = failedTargetCourse(now, goal);
      expect(courseSummary(course, now).recommendation).toMatchObject({
        sectionId: "5-1-5-4",
        mode: "review",
      });
      const choice = coursePrerequisiteDecision(course, now)!.session!;
      course = startAutomaticCourse(course, now, 1234, randomUUID);
      expect(course.learner.session!.problems.map((p) => p.content)).toEqual(
        choice.problems.map((p) => p.content),
      );
      expect(coursePrerequisiteContext(course, now, null)?.kind).toBe("check");
      course = finishPrerequisiteFixture(course, now, 2);
      if (goal === 5) {
        expect(courseSummary(course, now).recommendation).toBeNull();
        expect(coursePrerequisiteContext(course, now, null)).toMatchObject({
          kind: "return",
          canStart: false,
        });
      } else {
        expect(courseSummary(course, now).recommendation).toMatchObject({
          sectionId: "5-2-2-1",
          mode: "learn",
        });
        course = startAutomaticCourse(course, now, 9876, randomUUID);
        expect(coursePrerequisiteContext(course, now, null)?.kind).toBe(
          "return",
        );
      }
      expect(storedCourseSchema.safeParse(course).success).toBe(true);
      expect(JSON.stringify(course)).not.toContain('"prerequisite');
    },
  );

  it("코스 한도5와 열린 미션10이 달라도 두 번째 세션은 목표 learn이고 guard를 통과", () => {
    const course = failedTargetCourse(now, 5);
    const previous = {
      ...emptySrsState(),
      course,
      explorers: createExplorerState(studentId, 5),
    };
    previous.explorers.profile.definitions = {
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
    let state = startExpedition(
      previous,
      studentId,
      now,
      randomUUID(),
      22,
      randomUUID,
    );
    expect(state.expedition!.mission).toMatchObject({
      kind: "elementary",
      unitId: "g5-fractions",
      goal: 10,
    });
    expect(state.course!.learner.session!.sectionId).toBe("5-1-5-4");
    state = updateExpedition(
      state,
      { ...state, course: finishPrerequisiteFixture(state.course!, now, 2) },
      now,
    );
    expect(state.expedition!.mission!.answered).toBe(5);
    expect(courseSummary(state.course!, now).recommendation).toBeNull();
    expect(expeditionCourseRecommendation(state, now)).toMatchObject({
      sectionId: "5-2-2-1",
      mode: "learn",
    });
    const decision = expeditionCoursePrerequisiteDecision(state, now)!;
    const returned = startAutomaticForMission(state.course!, decision);
    const guarded = updateExpedition(
      state,
      { ...state, course: returned },
      now,
    );
    expect(guarded.course!.learner.session!.mode).toBe("learn");
    expect(parseSrsState(guarded).course!.learner.session!.sectionId).toBe(
      "5-2-2-1",
    );
    expect(guarded.expedition!.mission!.sourceSessionIds).toHaveLength(2);
  });

  it("다른 엔진의 열린 미션은 확인 코스 쓰기를 허용하지 않음", () => {
    const course = failedTargetCourse(now);
    const state = {
      ...emptySrsState(),
      course,
      explorers: createExplorerState(studentId, 5),
    };
    // Binding needs a real retained source, while the kind guard is independent of supply.
    const bound = bindExpedition(
      state,
      state,
      {
        kind: "elementary",
        route: "bank",
        unitId: "g5-fractions",
        title: "분수",
        subtitle: "fixture",
        goal: 10,
      },
      now,
      randomUUID(),
      randomUUID(),
    );
    const blocked = {
      ...bound,
      expedition: {
        ...bound.expedition!,
        mission: { ...bound.expedition!.mission!, kind: "middle" as const },
      },
    };
    expect(expeditionCoursePrerequisiteDecision(blocked, now)).toBeNull();
    expect(() =>
      updateExpedition(
        blocked,
        {
          ...blocked,
          course: startAutomaticCourse(course, now, 2, randomUUID),
        },
        now,
      ),
    ).toThrow(SrsConflict);
  });

  it("기능 해제/계획 변경은 예전 확인 복귀와 due 보류를 복원하지 않음", () => {
    let course = failedTargetCourse(now, 10);
    course = startAutomaticCourse(course, now, 3, randomUUID);
    course = finishPrerequisiteFixture(course, now, 2);
    expect(
      teacherPrerequisiteEvidence(
        course,
        now,
        coursePrerequisiteDecision(course, now),
      ).heldSectionIds,
    ).toContain("5-1-5-4");
    vi.stubEnv("MATH_PREREQ_CHECK", "off");
    expect(coursePrerequisiteContext(course, now, null)).toBeUndefined();
    expect(courseSummary(course, now).recommendation?.sectionId).toBe(
      "5-2-2-1",
    );
    expect(courseSummary(course, now).recommendation?.mode).toBe("review");
    vi.stubEnv("MATH_PREREQ_CHECK", "on");
    const changed = setCoursePlan(
      course,
      {
        startSectionId: "5-2-2-1",
        dailyQuestionCount: 10,
        enabled: true,
        expectedRevision: 0,
      },
      new Date(now.getTime() + 1000),
    );
    expect(
      teacherPrerequisiteEvidence(changed, new Date(now.getTime() + 1000), null)
        .heldSectionIds,
    ).toEqual([]);
    expect(
      coursePrerequisiteDecision(changed, new Date(now.getTime() + 1000)),
    ).toBeNull();
  });

  it("요청 안 CAS 재계산은 같은 session/problem UUID를 재사용", () => {
    const raw = vi.fn(randomUUID);
    const attempt = requestIdAllocator(raw);
    const first = attempt();
    const firstIds = Array.from({ length: 6 }, () => first());
    const retry = attempt();
    expect(Array.from({ length: 6 }, () => retry())).toEqual(firstIds);
    expect(raw).toHaveBeenCalledTimes(6);
  });

  it("부분 근거만 내고 일반 학생의 탐험 시작 가능 상태를 유지", () => {
    const course = failedTargetCourse(now);
    const evidence = teacherPrerequisiteEvidence(
      course,
      now,
      coursePrerequisiteDecision(course, now),
    );
    expect(evidence.sections).toHaveLength(4);
    expect(evidence.sections.every((entry) => entry.partial)).toBe(true);
    expect(
      evidence.sections.find((entry) => entry.sectionId === "5-2-2-1"),
    ).toMatchObject({ outcome: "failed", independentIncorrect: 2 });
    expect(
      expeditionDto(
        {
          ...emptySrsState(),
          course,
          explorers: createExplorerState(studentId, 5),
        },
        studentId,
        now,
      ).canStart,
    ).toBe(true);
  });
});

import { startRecommendedCourse } from "@/lib/math-srs/courseAutomation";
function startAutomaticForMission(
  course: StoredCourse,
  decision: NonNullable<ReturnType<typeof coursePrerequisiteDecision>>,
) {
  return startRecommendedCourse(
    course,
    {
      sectionId: decision.sectionId,
      mode: decision.mode!,
      reason: decision.reason,
    },
    now,
    0,
    randomUUID,
    [],
    decision.session!,
  );
}
