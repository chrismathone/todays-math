import { storedExplorerSchema } from "@/contracts/mathExplorers.contract";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  storedFadingSchema,
  type StoredFading,
} from "@/contracts/fading.contract";
import { createLocalFadingSource } from "@/lib/fading/local";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import { chipFits, chipTray } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import { fadingTargets } from "@/lib/fading/concepts";
import {
  courseSummary,
  emptyCourseState,
  setCoursePlan,
  startAutomaticCourse,
  startRecommendedCourse,
  submitCourseAttempt,
} from "@/lib/math-srs/courseAutomation";
import { createExplorerState } from "@/lib/math-explorers/engine";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { startExpedition } from "@/lib/math-explorers/expeditionStart";
import {
  expeditionLearning,
  expeditionCourseRecommendation,
  updateExpedition,
} from "@/lib/math-explorers/expedition";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

import { concept } from "./content";
const longTerm = (value: StoredFading) => {
  const copy = structuredClone(value);
  delete copy.relearn;
  return copy;
};
const T0 = Date.parse("2026-10-22T03:00:00Z");

export async function simulateFourteenDays() {
  let now = T0;
  let main = createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-22",
    cards: true,
    now: () => now,
  });
  let short = createLocalFadingRelearnSource({ main, concepts: [concept] });
  await main.act({ action: "pick", conceptId: concept.id });
  const days = [];
  let mainRatings = 0,
    shortChecks = 0;
  for (let day = 0; day < 14; day++) {
    now = T0 + day * 86400000;
    const today = new Date(now).toISOString().slice(0, 10);
    main.setToday(today);
    const before = main.snapshot();
    const stored = before.concepts[concept.id]!;
    const due = !stored.dueOn || stored.dueOn <= today;
    if (due) {
      let view = await main.act({ action: "open", conceptId: concept.id });
      while (view.session!.phase !== "rating") {
        const session = view.session!;
        const ref = { conceptId: concept.id, sessionId: session.id };
        if (session.step === 1)
          view = await main.act({ action: "read", ...ref });
        else {
          const step = session.step;
          const tray = chipTray(concept, step, { seed: session.seed });
          const used = new Set<string>();
          const placements = erasedTargets(concept, step).map((target) => {
            if (step === 4) return { targetId: target.id, text: target.text };
            const chip = tray.find(
              (chip) =>
                !used.has(chip.id) && chipFits(concept, target.id, chip),
            )!;
            used.add(chip.id);
            return { targetId: target.id, chipId: chip.id };
          });
          view = await main.act({
            action: "step",
            ...ref,
            step,
            placements: day === 0 && step === 4 ? [] : placements,
            ...(day === 0 && step === 4 ? { gaveUp: true } : {}),
          });
        }
      }
      const rating = {
        action: "rate" as const,
        conceptId: concept.id,
        sessionId: view.session!.id,
        requestId: randomUUID(),
        rating: day === 0 ? ("again" as const) : ("good" as const),
      };
      await main.act(rating);
      mainRatings++;
      const saved = main.snapshot();
      await main.act(rating);
      assert.deepEqual(
        main.snapshot(),
        saved,
        "rating replay must be idempotent",
      );
    }
    const rated = longTerm(main.snapshot());
    if (day === 0) {
      now += 59999;
      assert.equal(
        (await short.queue()).counts.ready,
        0,
        "retry must wait one minute",
      );
      now++;
      assert.equal((await short.queue()).counts.ready, 3);
    }
    // Read/answer actual product queue at its own deadlines; never derive an alternative schedule.
    for (let pass = 0; pass < 6; pass++) {
      const queue = await short.queue();
      if (!queue.items.length) break;
      if (queue.counts.waiting && !queue.counts.ready) {
        assert.ok(queue.nextDueAt !== null);
        now = queue.nextDueAt!;
        continue;
      }
      for (const item of queue.items.filter((item) => item.state === "ready")) {
        const answers = fadingTargets({
          ...concept,
          propositions: concept.propositions.filter(
            (p) => p.id === item.propositionId,
          ),
        }).map((target) => ({ targetId: target.id, text: target.text }));
        const attempt = {
          conceptId: item.conceptId,
          propositionId: item.propositionId,
          token: item.token,
          attemptId: randomUUID(),
          answers,
        };
        const result = await short.grade(attempt);
        shortChecks++;
        if (item.stage === "retry")
          assert.equal(result.result.next?.dueAt, now + 300000);
        assert.deepEqual(
          longTerm(main.snapshot()),
          rated,
          "short check must preserve all long-term fields",
        );
        const snapshot = main.snapshot();
        await short.grade(attempt);
        assert.deepEqual(
          main.snapshot(),
          snapshot,
          "short receipt replay must be idempotent",
        );
      }
    }
    assert.equal((await short.queue()).items.length, 0);
    const snapshot = storedFadingSchema.parse(main.snapshot());
    assert.equal(snapshot.concepts[concept.id]!.reviews, mainRatings);
    if (!due) assert.deepEqual(longTerm(snapshot), longTerm(before));
    days.push({
      today,
      due,
      reviews: mainRatings,
      shortChecks,
      step: snapshot.concepts[concept.id]!.step,
      dueOn: snapshot.concepts[concept.id]!.dueOn,
      stability: snapshot.concepts[concept.id]!.stability,
      difficulty: snapshot.concepts[concept.id]!.difficulty,
    });
    // A reload resumes both domains exactly, including receipts; no reset/restore against a database.
    main = createLocalFadingSource({
      concepts: [concept],
      today,
      cards: true,
      fading: snapshot,
      now: () => now,
    });
    short = createLocalFadingRelearnSource({ main, concepts: [concept] });
    assert.deepEqual(main.snapshot(), snapshot);
  }
  assert.ok(mainRatings > 1 && mainRatings < 14);
  assert.ok(shortChecks > mainRatings);
  return { days, mainRatings, shortChecks, final: main.snapshot() };
}

export async function verifyQuotaPolicy() {
  const now = new Date(T0),
    studentId = "11111111-1111-4111-8111-111111111111";
  const course = setCoursePlan(
    emptyCourseState(),
    {
      startSectionId: "5-2-1-1",
      dailyQuestionCount: 5,
      enabled: true,
      expectedRevision: 0,
    },
    now,
  );
  let completed = startAutomaticCourse(course, now, 71, randomUUID);
  const session = completed.learner.session!;
  assert.equal(session.problems.length, 5);
  for (const p of session.problems)
    completed = submitCourseAttempt(
      completed,
      { sessionId: session.id, problemId: p.id, submittedAnswer: p.answer },
      now,
    );
  assert.equal(courseSummary(completed, now).todayAnswered, 5);
  assert.equal(courseSummary(completed, now).recommendation, null);
  const state = {
    ...emptySrsState(),
    course,
    explorers: createExplorerState(studentId, 5),
  };
  const first = expeditionLearning(state, studentId, now);
  state.explorers.profile.definitions = {
    courseGrade: 5,
    runs: 1,
    history: [],
    cards: Object.fromEntries(
      definitionCards
        .filter((card) => card.unit === first.unitId)
        .map((card) => [
          card.id,
          {
            level: 1,
            due: "2026-11-01",
            lastDate: "2026-10-21",
            attemptedAt: "2026-10-21",
            missed: 0,
          },
        ]),
    ),
  };
  const bank = expeditionLearning(state, studentId, now).plan;
  assert.equal(bank.kind, "elementary");
  assert.equal(bank.goal, 10);
  const preserved = structuredClone(state);
  const main = createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-22",
    daily: {
      workload: {
        ...bank,
        answered: 0,
        retryRemaining: 0,
        status: "next",
        canStart: true,
      },
      progressSections: [concept.section],
    },
  });
  const mixed = await main.dailyPlan();
  const courseOnly = await createLocalFadingSource({
    concepts: [],
    today: "2026-10-22",
    daily: {
      workload: {
        ...bank,
        answered: 0,
        retryRemaining: 0,
        status: "next",
        canStart: true,
      },
    },
  }).dailyPlan();
  const memoryOnly = await createLocalFadingSource({
    concepts: [concept],
    today: "2026-10-22",
    daily: { progressSections: [concept.section] },
  }).dailyPlan();
  assert.equal(mixed.quota.total, 15);
  assert.equal(mixed.units.question.planned, 10);
  assert.ok(mixed.units.prompt.planned > 0);
  assert.equal(courseOnly.units.question.planned, 10);
  assert.equal(courseOnly.units.prompt.planned, 0);
  assert.equal(memoryOnly.units.question.planned, 0);
  assert.ok(memoryOnly.units.prompt.planned > 0);
  assert.deepEqual(state, preserved);
  storedExplorerSchema.parse(state.explorers);
  parseSrsState(state);
  let integrated = startExpedition(
    state,
    studentId,
    now,
    randomUUID(),
    71,
    randomUUID,
  );
  for (let batch = 0; batch < 2; batch++) {
    const current = integrated.course!.learner.session!;
    assert.equal(current.problems.length, 5);
    for (const problem of current.problems) {
      const next = submitCourseAttempt(
        integrated.course!,
        {
          sessionId: current.id,
          problemId: problem.id,
          submittedAnswer: problem.answer,
        },
        now,
      );
      integrated = updateExpedition(
        integrated,
        { ...integrated, course: next },
        now,
      );
    }
    assert.equal(integrated.expedition!.mission!.answered, (batch + 1) * 5);
    if (batch === 0) {
      assert.equal(integrated.expedition!.mission!.status, "active");
      const next = startRecommendedCourse(
        integrated.course!,
        expeditionCourseRecommendation(integrated, now),
        now,
        72,
        randomUUID,
      );
      integrated = updateExpedition(
        integrated,
        { ...integrated, course: next },
        now,
      );
    }
  }
  assert.equal(integrated.expedition!.mission!.status, "complete");
  assert.equal(integrated.expedition!.mission!.sourceSessionIds.length, 2);
  assert.deepEqual(integrated.course!.plan, course.plan);
  parseSrsState(integrated);
  return {
    standalone: courseSummary(completed, now),
    integrated: bank,
    completedIntegrated: integrated.expedition!.mission,
    mixed,
    courseOnly,
    memoryOnly,
    teacherPlanPreserved: true,
  };
}
