import { describe, expect, it } from "vitest";
import { exposedContents, normalizeContent } from "@/lib/math-prerequisite/evidence";
import {
  heldCheckSections,
  PREREQUISITE_REASONS,
  prerequisiteStep,
  type PrerequisiteBudget,
} from "@/lib/math-prerequisite/policy";
import type { SessionGenerator } from "@/lib/math-prerequisite/supply";
import { setCoursePlan, type StoredCourse } from "@/lib/math-srs/courseAutomation";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import {
  at,
  DAY,
  FAIL,
  later,
  MINUTE,
  PASS,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";

const T = "5-2-2-1";
const P1 = "5-1-5-4";
const P2 = "5-1-5-3";
const HOUR = 60 * MINUTE;
/** 2026-10-01 10:00 KST */
const t0 = at("2026-10-01T01:00:00.000Z");
const OPEN: PrerequisiteBudget = { answered: 0, goal: 20 };

function counting(base: SessionGenerator = generateCourseSession) {
  let calls = 0;
  const generate: SessionGenerator = (...args) => {
    calls += 1;
    return base(...args);
  };
  return { generate, count: () => calls };
}
const step = (
  course: StoredCourse,
  now: Date,
  options: { enabled?: boolean; budget?: PrerequisiteBudget; generate?: SessionGenerator } = {},
) =>
  prerequisiteStep(
    course,
    now,
    options.enabled ?? true,
    options.budget ?? OPEN,
    options.generate ? { generate: options.generate } : undefined,
  );

/** 목표의 learn 실패 → 같은 날 목표 review 실패(지금 코스의 둘째 세션이 그렇다). */
function twoFailures(base = plannedCourse(T, t0), start = t0) {
  const one = practise(base, T, "learn", start, FAIL);
  return practise(one, T, "review", later(start, 30 * MINUTE), FAIL);
}

describe("선수 확인 발동", () => {
  it("실패 한 세션으로는 아무것도 내지 않고 생성기도 부르지 않는다", () => {
    const course = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const { generate, count } = counting();
    expect(step(course, later(t0, HOUR), { generate })).toBeNull();
    expect(count()).toBe(0);
  });

  it("목표의 최근 끝낸 세션 둘(learn · review)이 모두 실패면 첫 확인 범위를 낸다", () => {
    const course = twoFailures();
    const decision = step(course, later(t0, HOUR));
    expect(decision).toMatchObject({
      kind: "check",
      targetSectionId: T,
      sectionId: P1,
      mode: "review",
      reason: PREREQUISITE_REASONS.check,
      canStart: true,
      overridesLearnedToday: false,
    });
    const problems = decision!.session!.problems;
    expect(problems).toHaveLength(5);
    expect(problems.every((p) => p.sectionId === P1)).toBe(true);
    const seen = exposedContents(course);
    expect(problems.some((p) => seen.has(normalizeContent(p.content)))).toBe(false);
  });

  it("두 실패 사이에 통과가 있으면 발동하지 않는다", () => {
    const one = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const ok = practise(one, T, "review", later(t0, 30 * MINUTE), PASS);
    const again = practise(ok, T, "review", later(t0, DAY), FAIL);
    expect(step(again, later(t0, DAY + HOUR))).toBeNull();
  });

  it("지금 계획을 저장하기 전의 실패는 이어받지 않는다", () => {
    const failed = twoFailures();
    const reconfigured = plannedCourse(T, later(t0, HOUR), 10, failed);
    expect(step(reconfigured, later(t0, 2 * HOUR))).toBeNull();
  });

  it("14일이 넘은 실패로는 발동하지 않는다", () => {
    const failed = twoFailures();
    const first = new Date(failed.history.at(-1)!.session.completedAt!);
    expect(step(failed, later(first, 14 * DAY))?.kind).toBe("check");
    expect(step(failed, later(first, 14 * DAY + 1))).toBeNull();
  });

  it("지금보다 뒤에 끝난 실패와, 진도가 더 새것인 기록으로는 발동하지 않는다", () => {
    const failed = twoFailures();
    const second = new Date(failed.learner.session!.completedAt!);
    expect(step(failed, later(second, -MINUTE))).toBeNull();
    expect(step(failed, later(second, HOUR))?.kind).toBe("check");
    const newer = structuredClone(failed);
    newer.learner.progress[T].lastReviewedAt = later(second, 10 * MINUTE).toISOString();
    expect(step(newer, later(second, HOUR))).toBeNull();
  });

  it("목표가 시범 밖이거나 기능 · 계획이 꺼졌으면 없다", () => {
    const failed = twoFailures();
    expect(step(failed, later(t0, HOUR), { enabled: false })).toBeNull();
    const disabled = setCoursePlan(
      failed,
      { startSectionId: T, dailyQuestionCount: 20, enabled: false, expectedRevision: 0 },
      later(t0, HOUR),
    );
    expect(step(disabled, later(t0, 2 * HOUR))).toBeNull();
    const elsewhere = practise(
      practise(plannedCourse("5-2-2-3", t0), "5-2-2-3", "learn", t0, FAIL),
      "5-2-2-3",
      "review",
      later(t0, 30 * MINUTE),
      FAIL,
    );
    expect(step(elsewhere, later(t0, HOUR))).toBeNull();
  });

  it("남은 분량이 5문항보다 적거나 진행 중인 세션이 있으면 새로 내지 않는다", () => {
    const failed = twoFailures();
    expect(step(failed, later(t0, HOUR), { budget: { answered: 16, goal: 20 } })).toBeNull();
    expect(step(failed, later(t0, HOUR), { budget: { answered: 5, goal: 10 } })?.kind).toBe(
      "check",
    );
    const active = practise(failed, T, "review", later(t0, HOUR), ["wrong"], {
      finishRetry: false,
    });
    expect(step(active, later(t0, 2 * HOUR))).toBeNull();
  });
});

describe("하루 한도와 확인 유예", () => {
  it("오늘(KST) 확인 범위를 풀었으면 다른 범위도 내지 않는다 · 자정이 지나면 다음 범위", () => {
    // 10:00 KST 목표 실패 → 23:40 KST 보통 복습으로 P1 → 23:46 KST 목표 실패(현재 세션은 목표)
    const one = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const reviewP1 = practise(one, P1, "review", at("2026-10-01T14:40:00.000Z"), PASS);
    const two = practise(reviewP1, T, "review", at("2026-10-01T14:46:00.000Z"), FAIL);
    expect(step(two, at("2026-10-01T14:59:59.000Z"))).toBeNull();
    const nextDay = step(two, at("2026-10-01T15:00:00.000Z"));
    expect(nextDay).toMatchObject({ kind: "check", sectionId: P2 });
  });

  it("P1 이 14일 유예 안이면 P2 · 정확히 14일이면 다시 P1 · 둘 다 유예면 없다", () => {
    const base = practise(plannedCourse(T, t0), P1, "review", t0, PASS);
    const p1At = new Date(base.memories[P1].lastReviewedAt);
    const start = later(p1At, 13 * DAY);
    const failed = twoFailures(base, start);
    expect(step(failed, later(start, HOUR))?.sectionId).toBe(P2);
    expect(step(failed, later(p1At, 14 * DAY))?.sectionId).toBe(P1);

    const both = practise(base, P2, "review", later(t0, HOUR), PASS);
    const failedBoth = twoFailures(both, later(t0, 3 * DAY));
    expect(step(failedBoth, later(t0, 3 * DAY + HOUR))).toBeNull();
  });
});

describe("목표 복귀", () => {
  it("확인을 끝내면(재도전까지) 만기 복습보다 먼저 목표 learn — learnedToday 를 한 번 넘긴다", () => {
    const failed = twoFailures();
    const checked = practise(failed, P1, "review", later(t0, HOUR), FAIL);
    const decision = step(checked, later(t0, 2 * HOUR));
    expect(decision).toMatchObject({
      kind: "return",
      targetSectionId: T,
      sectionId: T,
      mode: "learn",
      reason: PREREQUISITE_REASONS.return,
      canStart: true,
      overridesLearnedToday: true,
    });
    const seen = exposedContents(checked);
    expect(
      decision!.session!.problems.some((p) => seen.has(normalizeContent(p.content))),
    ).toBe(false);
  });

  it("재도전이 남은 확인 세션은 이어 풀기가 먼저다", () => {
    const failed = twoFailures();
    const pending = practise(failed, P1, "review", later(t0, HOUR), FAIL, {
      finishRetry: false,
    });
    expect(step(pending, later(t0, 2 * HOUR))).toBeNull();
  });

  it("보통 복습으로 푼 P 뒤에도 보수적으로 목표로 돌아간다", () => {
    const reviewed = practise(plannedCourse(T, t0), P2, "review", t0, PASS);
    expect(step(reviewed, later(t0, HOUR))).toMatchObject({ kind: "return", sectionId: T });
  });

  it("교사가 목표를 바꾸면 옛 목표로 돌아가지 않는다", () => {
    const checked = practise(twoFailures(), P1, "review", later(t0, HOUR), PASS);
    const moved = setCoursePlan(
      checked,
      { startSectionId: "5-1-1-1", dailyQuestionCount: 20, enabled: true, expectedRevision: 0 },
      later(t0, 2 * HOUR),
    );
    expect(step(moved, later(t0, 3 * HOUR))).toBeNull();
  });

  it("계획을 다시 저장하기 전의 P 세션 · 지금보다 뒤에 끝난 P 세션으로는 복귀하지 않는다", () => {
    const checked = practise(twoFailures(), P1, "review", later(t0, HOUR), PASS);
    const reconfigured = plannedCourse(T, later(t0, 2 * HOUR), 10, checked);
    expect(step(reconfigured, later(t0, 3 * HOUR))).toBeNull();
    const pDone = new Date(checked.learner.session!.completedAt!);
    expect(step(checked, later(pDone, -MINUTE))).toBeNull();
    expect(step(checked, pDone)?.kind).toBe("return");
  });

  it("이력이 잘려도 현재 세션으로 복귀한다", () => {
    const checked = practise(twoFailures(), P1, "review", later(t0, HOUR), PASS);
    const trimmed = structuredClone(checked);
    trimmed.history = [];
    expect(step(trimmed, later(t0, 2 * HOUR))?.kind).toBe("return");
  });
});

describe("공급이 바닥났을 때", () => {
  const corrupt =
    (sections: readonly string[]): SessionGenerator =>
    (sectionId, ...rest) => {
      const session = generateCourseSession(sectionId, ...rest);
      if (sections.includes(sectionId))
        session.problems[0] = {
          ...session.problems[0],
          input: { ...session.problems[0].input, mode: "self-check" },
          answerChoices: null,
        };
      return session;
    };

  it("확인 범위가 모두 바닥나면 같은 기준의 새 목표 연습으로 — 오늘 이미 learn 했으면 review", () => {
    const failed = twoFailures();
    const decision = step(failed, later(t0, HOUR), { generate: corrupt([P1, P2]) });
    expect(decision).toMatchObject({
      kind: "fallback",
      sectionId: T,
      mode: "review",
      reason: PREREQUISITE_REASONS.fallback,
      canStart: true,
    });
    expect(decision!.session!.problems.every((p) => p.sectionId === T)).toBe(true);
  });

  it("목표까지 바닥나면 아무 세션도 내지 않고 시작을 막는다(반복 문항 없음)", () => {
    const failed = twoFailures();
    const decision = step(failed, later(t0, HOUR), { generate: corrupt([P1, P2, T]) });
    expect(decision).toMatchObject({
      kind: "unavailable",
      targetSectionId: T,
      mode: null,
      reason: PREREQUISITE_REASONS.unavailable,
      teacherReason: PREREQUISITE_REASONS.unavailableTeacher,
      canStart: false,
      session: null,
    });
    const checked = practise(failed, P1, "review", later(t0, HOUR), PASS);
    expect(
      step(checked, later(t0, 2 * HOUR), { generate: corrupt([T]) }),
    ).toMatchObject({ kind: "unavailable", canStart: false, session: null });
  });

  it("같은 상태면 같은 결정 · 다른 학생의 기록이면 다른 씨앗", () => {
    const a = twoFailures();
    const b = twoFailures();
    const now = later(t0, HOUR);
    expect(step(a, now)).toEqual(step(a, now));
    expect(step(a, now)!.session!.seed).not.toBe(step(b, now)!.session!.seed);
  });
});

describe("조건 밖 학생", () => {
  it("발동도 복귀도 아닌 명단 100명에서 생성기 호출 0", () => {
    const { generate, count } = counting();
    const now = later(t0, 3 * DAY);
    const plain = plannedCourse(T, t0);
    const oneFail = practise(plain, T, "learn", t0, FAIL);
    const elsewhere = practise(plannedCourse("5-2-2-3", t0), "5-2-2-3", "learn", t0, PASS);
    const roster = Array.from({ length: 100 }, (_, i) =>
      i % 3 === 0 ? plain : i % 3 === 1 ? oneFail : elsewhere,
    );
    for (const course of roster) expect(step(course, now, { generate })).toBeNull();
    expect(count()).toBe(0);
  });
});

describe("유예 중 P 의 보통 만기 보류", () => {
  it("목표가 미완료이고 계획 뒤 14일 안에 푼 P 만 보류 · 사유는 숙달이 아니라고 말한다", () => {
    const reviewed = practise(plannedCourse(T, t0), P1, "review", t0, FAIL);
    const now = later(t0, 2 * DAY);
    expect(heldCheckSections(reviewed, now, true)).toEqual({
      sectionIds: [P1],
      reason: PREREQUISITE_REASONS.held,
    });
    expect(heldCheckSections(reviewed, now, false)).toEqual({ sectionIds: [], reason: null });
  });

  it("지금보다 뒤에 찍힌 P 기록으로는 보류하지 않는다", () => {
    const reviewed = practise(plannedCourse(T, t0), P1, "review", t0, FAIL);
    const p1At = new Date(reviewed.memories[P1].lastReviewedAt);
    expect(heldCheckSections(reviewed, later(p1At, -MINUTE), true).sectionIds).toEqual([]);
    expect(heldCheckSections(reviewed, p1At, true).sectionIds).toEqual([P1]);
  });

  it("계획을 다시 저장하면 · 14일이 지나면 · 목표를 끝내면 기존 만기 규칙으로", () => {
    const reviewed = practise(plannedCourse(T, t0), P1, "review", t0, FAIL);
    const p1At = new Date(reviewed.memories[P1].lastReviewedAt);
    const reconfigured = plannedCourse(T, later(t0, DAY), 10, reviewed);
    expect(heldCheckSections(reconfigured, later(t0, 2 * DAY), true).sectionIds).toEqual([]);
    expect(heldCheckSections(reviewed, later(p1At, 14 * DAY), true).sectionIds).toEqual([]);
    expect(heldCheckSections(reviewed, later(p1At, 14 * DAY - 1), true).sectionIds).toEqual([P1]);
    const t1Done = practise(reviewed, T, "learn", later(t0, DAY), PASS);
    // 다음 목표 5-2-2-2 도 시범 목표라 아직 보류
    expect(heldCheckSections(t1Done, later(t0, 2 * DAY), true).sectionIds).toEqual([P1]);
    const t2Done = practise(t1Done, "5-2-2-2", "learn", later(t0, DAY + HOUR), PASS);
    expect(heldCheckSections(t2Done, later(t0, 2 * DAY), true).sectionIds).toEqual([]);
  });
});
