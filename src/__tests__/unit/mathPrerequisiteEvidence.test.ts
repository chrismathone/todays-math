import { describe, expect, it } from "vitest";
import { prerequisiteSectionEvidenceSchema } from "@/contracts/mathPrerequisite.contract";
import {
  exposedContents,
  normalizeContent,
  pilotEvidence,
  sectionEvidence,
  sessionOutcome,
} from "@/lib/math-prerequisite/evidence";
import type { StoredCourse } from "@/lib/math-srs/courseAutomation";
import {
  at,
  DAY,
  FAIL,
  lastCompletedAt,
  later,
  MINUTE,
  PASS,
  plannedCourse,
  practise,
} from "../helpers/mathPrerequisiteCourse";

const T = "5-2-2-1";
const P1 = "5-1-5-4";
const t0 = at("2026-10-01T01:00:00.000Z");

const clone = (course: StoredCourse) => structuredClone(course);
const evidenceOf = (course: StoredCourse, sectionId: string, now: Date) =>
  prerequisiteSectionEvidenceSchema.parse(sectionEvidence(course, sectionId, now));

describe("직접 근거 — 끝낸 세션의 첫 풀이만", () => {
  it("기록이 없으면 미측정 · 늘 부분 확인", () => {
    const course = plannedCourse(T, t0);
    expect(evidenceOf(course, T, t0)).toEqual({
      unitId: "E56-N04",
      sectionId: T,
      title: "(분수)×(자연수)의 계산",
      status: "unassessed",
      outcome: "unknown",
      independentCorrect: 0,
      independentIncorrect: 0,
      lastObservedAt: null,
      sourceRetained: false,
      partial: true,
    });
  });

  it("스스로 맞음 넷 이상이면 통과 · 서버 채점 오답 둘 이상이면 실패", () => {
    const passed = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    expect(evidenceOf(passed, T, later(t0, DAY))).toMatchObject({
      status: "passed_recent",
      outcome: "passed",
      independentCorrect: 5,
      independentIncorrect: 0,
      sourceRetained: true,
    });
    const failed = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    expect(evidenceOf(failed, T, later(t0, DAY))).toMatchObject({
      status: "not_passed_recent",
      outcome: "failed",
      independentCorrect: 3,
      independentIncorrect: 2,
    });
  });

  it("포기는 실패로 세지 않고, 재도전의 정답은 첫 풀이를 바꾸지 않는다", () => {
    const course = practise(plannedCourse(T, t0), T, "learn", t0, [
      "giveup",
      "giveup",
      "giveup",
      "wrong",
      "right",
    ]);
    expect(course.learner.session!.retry!.completedAt).not.toBeNull();
    expect(evidenceOf(course, T, later(t0, DAY))).toMatchObject({
      outcome: "inconclusive",
      status: "inconclusive",
      independentCorrect: 1,
      independentIncorrect: 1,
    });
  });

  it("힌트 · 자기채점 문항은 성공에도 실패에도 세지 않는다", () => {
    const base = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    const hinted = clone(base);
    const session = hinted.learner.session!;
    session.hintedProblemIds = [session.problems[0].id];
    session.attempts[0].usedHint = true;
    session.problems[1].input = { ...session.problems[1].input, mode: "self-check" };
    session.attempts[1].selfAssessed = true;
    expect(sessionOutcome(hinted, session)).toMatchObject({
      outcome: "inconclusive",
      independentCorrect: 3,
      independentIncorrect: 0,
    });
  });

  it("앞선 세션에서 본 본문과 세션 안의 같은 본문은 한 번도 · 다시 세지 않는다", () => {
    const first = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const second = practise(first, T, "review", later(t0, 2 * DAY), PASS);
    const repeated = clone(second);
    const earlier = repeated.history.at(-1)!.session;
    const current = repeated.learner.session!;
    // 앞 세션의 본문 둘을 그대로 다시 낸 것 — 줄바꿈 · 앞뒤 공백만 다르다.
    current.problems[0].content = `\r\n  ${earlier.problems[0].content}  \n`;
    current.problems[1].content = earlier.problems[1].content;
    // 세션 안에서 같은 본문이 또 나온 것.
    current.problems[4].content = current.problems[3].content;
    expect(sessionOutcome(repeated, current)).toMatchObject({
      independentCorrect: 2,
      outcome: "inconclusive",
    });
    expect(normalizeContent("\r\n a\r\nb \n")).toBe("a\nb");
  });

  it("지금 계획을 저장하기 전의 세션은 근거가 아니다", () => {
    const failed = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const reconfigured = plannedCourse(T, later(t0, DAY), 10, failed);
    expect(evidenceOf(reconfigured, T, later(t0, DAY + MINUTE))).toMatchObject({
      status: "stale",
      outcome: "unknown",
      independentCorrect: 0,
      independentIncorrect: 0,
      sourceRetained: false,
    });
  });

  it("14일이 지나면 오래된 근거다 — 경계는 첫 풀이를 끝낸 때부터 14일 째까지 포함", () => {
    const failed = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    // 재도전이 끝난 때가 아니라 첫 풀이가 끝난 때(`completedAt`)가 관찰 시각이다.
    const done = new Date(failed.learner.session!.completedAt!);
    expect(lastCompletedAt(failed).getTime()).toBeGreaterThan(done.getTime());
    expect(evidenceOf(failed, T, later(done, 14 * DAY)).status).toBe(
      "not_passed_recent",
    );
    expect(evidenceOf(failed, T, later(done, 14 * DAY + 1))).toMatchObject({
      status: "stale",
      outcome: "unknown",
    });
  });

  it("기억이 보존된 끝낸 세션보다 새것이면 옛 통과를 쓰지 않는다", () => {
    const passed = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    const newer = clone(passed);
    newer.memories[T].lastReviewedAt = later(lastCompletedAt(passed), MINUTE).toISOString();
    expect(evidenceOf(newer, T, later(t0, DAY))).toMatchObject({
      status: "inconclusive",
      outcome: "unknown",
      sourceRetained: false,
      independentCorrect: 0,
    });
    // 끝내지 않은 세션이 진행 중이어도 같다(기억은 답마다 새로 찍힌다).
    const unfinished = practise(passed, T, "review", later(t0, DAY), ["wrong", "right"], {
      finishRetry: false,
    });
    expect(evidenceOf(unfinished, T, later(t0, DAY + 10 * MINUTE)).outcome).toBe(
      "unknown",
    );
  });

  it("지금보다 뒤에 찍힌 기록은 근거가 되지 않는다", () => {
    const failed = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const done = new Date(failed.learner.session!.completedAt!);
    expect(evidenceOf(failed, T, later(done, -MINUTE))).toMatchObject({
      outcome: "unknown",
      sourceRetained: false,
      independentCorrect: 0,
      independentIncorrect: 0,
    });
    expect(evidenceOf(failed, T, done).outcome).toBe("failed");
  });

  it("진도(progress)가 보존된 끝낸 세션보다 새것이어도 옛 결과를 쓰지 않는다", () => {
    const passed = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    const newer = clone(passed);
    newer.learner.progress[T].lastReviewedAt = later(
      lastCompletedAt(passed),
      MINUTE,
    ).toISOString();
    expect(evidenceOf(newer, T, later(t0, DAY))).toMatchObject({
      outcome: "unknown",
      sourceRetained: false,
    });
  });

  it("지금 계획을 저장하기 전에 시작한 세션은 저장 뒤에 끝나도 근거가 아니다", () => {
    const passed = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    const straddling = clone(passed);
    const session = straddling.learner.session!;
    straddling.plan!.configuredAt = new Date(
      (Date.parse(session.startedAt) + Date.parse(session.completedAt!)) / 2,
    ).toISOString();
    expect(evidenceOf(straddling, T, later(t0, DAY))).toMatchObject({
      outcome: "unknown",
      sourceRetained: false,
    });
  });

  it("이력에서 잘린 원천은 근거가 되지 않는다", () => {
    const passed = practise(plannedCourse(T, t0), T, "learn", t0, PASS);
    const trimmed = clone(passed);
    trimmed.history = [];
    trimmed.learner.session = null;
    expect(evidenceOf(trimmed, T, later(t0, DAY))).toMatchObject({
      outcome: "unknown",
      sourceRetained: false,
    });
  });

  it("시범 네 범위를 차례대로 · 다른 학생의 기록과 섞이지 않는다", () => {
    const a = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const b = plannedCourse(T, t0);
    const now = later(t0, DAY);
    const forA = pilotEvidence(a, now);
    expect(forA.map((e) => e.sectionId)).toEqual([
      "5-2-2-1",
      "5-2-2-2",
      "5-1-5-4",
      "5-1-5-3",
    ]);
    expect(forA.map((e) => e.unitId)).toEqual([
      "E56-N04",
      "E56-N04",
      "E56-N03",
      "E56-N03",
    ]);
    expect(forA.every((e) => e.partial)).toBe(true);
    expect(forA[0].status).toBe("not_passed_recent");
    expect(pilotEvidence(b, now).every((e) => e.status === "unassessed")).toBe(true);
    expect(evidenceOf(a, P1, now).status).toBe("unassessed");
  });

  it("본 본문의 모음 — 현재 · 보존 세션 · 최근 답안", () => {
    const course = practise(plannedCourse(T, t0), T, "learn", t0, FAIL);
    const seen = exposedContents(course);
    for (const p of course.learner.session!.problems)
      expect(seen.has(normalizeContent(p.content))).toBe(true);
    const onlyRecent = clone(course);
    onlyRecent.learner.session = null;
    onlyRecent.history = [];
    expect(exposedContents(onlyRecent).size).toBeGreaterThan(0);
  });
});
