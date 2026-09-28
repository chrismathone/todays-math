import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  explorerActionSchema,
  storedExplorerSchema,
  type ExplorerAction,
} from "@/contracts/mathExplorers.contract";
import {
  applyExplorerAction,
  createExplorerState,
  explorerReceipt,
  explorerView,
  ExplorerActionConflict,
  ExplorerActionInvalid,
} from "@/lib/math-explorers/engine";
import {
  applyDefinitionAction,
  cardGrade,
  definitionCard,
  definitionCards,
  definitionChests,
  definitionMemoryCards,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
  definitionRepairCards,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import {
  workshopOptions,
  workshopQuestionId,
} from "@/lib/math-explorers/workshop";

function fixture(grade = 3) {
  let state = createExplorerState("student-a", grade);
  let date = "2026-09-26";
  const session = () => state.profile.definitions!.session!;
  const act = (action: ExplorerAction, requestId: string = randomUUID()) => {
    const result = applyExplorerAction(state, action, date, requestId);
    state = result.state;
    return result;
  };
  const answer = (wrong = false) => {
    let current = session();
    if (definitionNeedsRead(state.profile, current)) {
      act({ type: "read", questionId: definitionQuestionId(current) });
      current = session();
    }
    while (
      state.profile.workshop?.session &&
      state.profile.workshop.session.stage !== "complete"
    ) {
      const lab = state.profile.workshop.session;
      const questionId = workshopQuestionId(lab);
      if (lab.stage === "predict")
        act({
          type: "lab-predict",
          questionId,
          choiceId: workshopOptions(lab).indexOf(1),
        });
      else if (lab.stage === "split")
        act({ type: "lab-split", questionId, factor: 3 });
      else if (lab.stage === "match")
        act({ type: "lab-match", questionId, factors: [3, 2] });
      else if (lab.stage === "rule")
        act({
          type: "lab-rule",
          questionId,
          choiceId: workshopOptions(lab).indexOf(1),
        });
      else {
        const question = lab.questions[lab.checkIndex]!;
        act({
          type: "lab-check",
          questionId,
          parts: question.fractions.map(
            (fraction) =>
              (fraction.numerator * question.denominator) /
              fraction.denominator,
          ),
        });
      }
    }
    current = session();
    const task = current.queue[current.index]!;
    const card = definitionCard(task.cardId);
    const sourceIds =
      task.kind === 0
        ? wrong
          ? [1, 0]
          : [0, 1]
        : task.kind === 1
          ? wrong
            ? []
            : card.examples.flatMap((example, index) =>
                example.yes ? [index] : [],
              )
          : [wrong ? (card.truth ? 0 : 1) : card.truth ? 1 : 0];
    const options = definitionOptions(current, task);
    return act({
      type: "answer",
      questionId: definitionQuestionId(current),
      choiceIds: sourceIds.map((id) => options.indexOf(id)),
    });
  };
  const finish = (
    wrong: (current: ReturnType<typeof session>) => boolean = () => false,
  ) => {
    let safety = 0;
    while (!session().done) {
      if (++safety > 60) throw new Error("unbounded retry");
      answer(wrong(session()));
    }
  };
  return {
    act,
    answer,
    finish,
    session,
    start: (unitId = "factors") =>
      act({ type: "start", route: "unit", unitId }),
    date: (day: string) => {
      date = day;
    },
    reload: () => {
      state = storedExplorerSchema.parse(JSON.parse(JSON.stringify(state)));
    },
    get state() {
      return state;
    },
    get view() {
      return explorerView(state, date);
    },
  };
}

describe("Math Explorers imported curriculum", () => {
  it("preserves 46 units, 230 stable IDs, 690 activities and acyclic prerequisites", () => {
    expect(definitionUnits).toHaveLength(46);
    expect(definitionCards).toHaveLength(230);
    expect(new Set(definitionCards.map((card) => card.id)).size).toBe(230);
    const visit = (id: string, path: string[] = []) => {
      expect(path).not.toContain(id);
      for (const prior of definitionCard(id).prerequisites ?? [])
        visit(prior, [...path, id]);
    };
    for (const unit of definitionUnits)
      expect(
        definitionCards.filter((card) => card.unit === unit.id),
      ).toHaveLength(5);
    for (const card of definitionCards) {
      visit(card.id);
      expect(card.pieces).toHaveLength(3);
      expect(new Set(card.words).size).toBe(4);
      expect(card.examples.some((example) => example.yes)).toBe(true);
      expect(card.examples.some((example) => !example.yes)).toBe(true);
      expect(new Set(card.examples.map((example) => example.text)).size).toBe(
        card.examples.length,
      );
    }
    for (let grade = 3; grade <= 9; grade++)
      expect(
        definitionCards.filter((card) => cardGrade(card) === grade),
      ).toHaveLength(grade < 7 ? 30 : grade === 7 ? 40 : 35);
  });

  it("grades all 690 authored activities through shuffled public choice IDs", () => {
    for (const unit of definitionUnits) {
      const f = fixture(unit.grade);
      f.start(unit.id);
      f.finish();
      expect(f.session().first, unit.id).toBe(15);
      expect(f.state.profile.stars, unit.id).toBe(
        5 + (f.state.profile.workshop?.blueprintAt ? 1 : 0),
      );
      expect(f.state.completedDays, unit.id).toHaveLength(1);
    }
  });

  it("builds unique 15-task repair plans with the target and direct prerequisites", () => {
    const f = fixture();
    for (const card of definitionCards) {
      const plan = definitionRepairCards(f.state.profile, card.id);
      expect(plan).toHaveLength(5);
      expect(new Set(plan.map((item) => item.id)).size).toBe(5);
      expect(plan.map((item) => item.id)).toContain(card.id);
    }
    const ids = definitionRepairCards(f.state.profile, "factorization").map(
      (card) => card.id,
    );
    expect(ids).toContain("g5-divisor");
    expect(ids.indexOf("g5-divisor")).toBeLessThan(ids.indexOf("prime"));
    expect(ids.indexOf("prime-factor")).toBeLessThan(
      ids.indexOf("factorization"),
    );
  });
});

describe("account-owned concept transitions", () => {
  it("grows the base for 3/6/12 stars once per request without spending lifetime earnings", () => {
    const f = fixture();
    expect(() => f.act({ type: "upgrade" })).toThrow(ExplorerActionInvalid);
    f.state.profile.stars = 21;
    f.state.profile.earned = 21;
    const requestId = randomUUID();
    f.act({ type: "upgrade" }, requestId);
    f.act({ type: "upgrade" }, requestId);
    expect(f.state.profile.level).toBe(1);
    expect(f.state.profile.stars).toBe(18);
    f.act({ type: "upgrade" });
    f.act({ type: "upgrade" });
    expect(f.state.profile.level).toBe(3);
    expect(f.state.profile.stars).toBe(0);
    expect(f.state.profile.earned).toBe(21);
    expect(() => f.act({ type: "upgrade" })).toThrow(
      "별 12개를 더 모아 주세요.",
    );
    expect(f.state.completedDays).toHaveLength(0);
  });

  it("keeps growing the base past the third stage for 12 stars each, with no end (D-144)", () => {
    const f = fixture();
    // 옛 판에서 «성장 완료»였던 학생 — 쌓인 별이 새 단계에 바로 쓰인다(누를 때마다 한 단계, 자동으로 쓰지 않음)
    f.state.profile.level = 3;
    f.state.profile.stars = 30;
    f.state.profile.earned = 51;
    const first = f.act({ type: "upgrade" });
    expect(first.feedback.message).toBe("별 12개로 기지가 4단계로 자랐어요.");
    expect(f.state.profile).toMatchObject({ level: 4, stars: 18, earned: 51 });
    f.act({ type: "upgrade" });
    expect(f.state.profile).toMatchObject({ level: 5, stars: 6 });
    expect(() => f.act({ type: "upgrade" })).toThrow(
      "별 6개를 더 모아 주세요.",
    );
    f.state.profile.level = 40;
    f.state.profile.stars = 12;
    f.act({ type: "upgrade" });
    expect(f.state.profile).toMatchObject({ level: 41, stars: 0 });
    expect(storedExplorerSchema.parse(f.state).profile.level).toBe(41);
    expect(explorerView(f.state, "2026-09-26").profile.level).toBe(41);
  });

  it("replays the original five mixed-route concepts and keeps independent chest transactions", () => {
    const f = fixture();
    f.act({ type: "start", route: "repair", cardId: "factorization" });
    f.finish();
    const cards = [...f.session().cardIds!];
    f.date("2026-09-27");
    f.act({ type: "start", route: "unit", dayId: "2026-09-26" });
    expect(f.session().cardIds).toEqual(cards);
    expect(f.session().route).toBe("repair");
    expect(f.session().targetCardId).toBe("factorization");
    f.finish();
    expect(f.state.completedDays).toHaveLength(1);
    f.start();
    f.finish();
    f.date("2026-09-28");
    f.act({ type: "start", route: "unit", dayId: "2026-09-27" });
    const stars = f.state.profile.stars;
    f.act({ type: "chest", chestId: "factors:2" });
    expect(f.state.profile.stars).toBe(stars + 1);
    expect(f.state.profile.definitions?.claimedChests).toContain("factors:2");
    f.answer();
    expect(f.state.profile.stars).toBe(stars + 1);
  });

  it("requires educational reading, redacts solutions, preserves the input and rejects stale answers", () => {
    const f = fixture();
    const before = structuredClone(f.state);
    const started = f.start();
    expect(before.profile.definitions).toBeUndefined();
    expect(started.state).not.toBe(before);
    expect(f.view.currentActivity?.kind).toBe("read");
    const questionId = f.view.currentActivity!.questionId;
    expect(() =>
      f.act({ type: "answer", questionId, choiceIds: [0, 1] }),
    ).toThrow(ExplorerActionInvalid);
    f.act({ type: "read", questionId });
    const view = f.view;
    expect(view.currentActivity?.kind).toBe("assemble");
    expect(view.currentActivity?.reading).toBeUndefined();
    expect(view.currentActivity?.choices.map((choice) => choice.id)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(JSON.stringify(view)).not.toContain('"truth"');
    expect(JSON.stringify(view)).not.toContain('"yes"');
    expect(JSON.stringify(view)).not.toContain('"explanation"');
    expect(() => f.act({ type: "solution", cardId: "prime" })).toThrow(
      ExplorerActionInvalid,
    );
    expect(
      explorerActionSchema.safeParse({ type: "hint", questionId }).success,
    ).toBe(false);
    f.answer();
    expect(() =>
      f.act({ type: "answer", questionId, choiceIds: [0, 1] }),
    ).toThrow(ExplorerActionConflict);
  });

  it("handles uncertain network retries once and conflicts on changed reuse", () => {
    const f = fixture();
    const requestId = randomUUID();
    const action: ExplorerAction = {
      type: "start",
      route: "unit",
      unitId: "factors",
    };
    const first = f.act(action, requestId);
    const second = f.act(action, requestId);
    expect(second.duplicate).toBe(true);
    expect(second.feedback).toEqual(first.feedback);
    expect(second.state.profile.definitions?.runs).toBe(1);
    expect(explorerReceipt(second.state, action, requestId)).toEqual(
      first.feedback,
    );
    expect(() => f.act({ ...action, unitId: "numbers" }, requestId)).toThrow(
      ExplorerActionConflict,
    );
  });

  it("retries only wrong tasks up to three rounds and advances only after a whole solved day", () => {
    const f = fixture();
    f.start();
    for (let index = 0; index < 14; index++) f.answer(index === 0);
    expect(f.state.completedDays).toHaveLength(0);
    f.answer();
    expect(f.session().round).toBe(1);
    expect(f.session().queue).toHaveLength(1);
    expect(f.state.completedDays).toHaveLength(0);
    f.answer();
    expect(f.session().done).toBe(true);
    expect(f.session().first).toBe(14);
    expect(f.state.completedDays).toHaveLength(1);
    f.start("numbers");
    f.finish();
    expect(f.state.completedDays).toHaveLength(1);
    const g = fixture();
    g.start();
    g.finish((session) => session.queue[session.index]?.cardId === "prime");
    expect(g.session().round).toBe(3);
    expect(g.session().unresolved).toHaveLength(3);
    expect(g.state.completedDays).toHaveLength(0);
    expect(g.view.currentActivity).toBeNull();
    const solution = g.act({ type: "solution", cardId: "prime" }).feedback
      .solution;
    expect(solution?.explanation).toBe(definitionCard("prime").explanation);
    expect(g.state.completedDays).toHaveLength(0);
    expect(JSON.stringify(g.view)).not.toContain('"explanation"');
  });

  it("requires an explicit unresolved-only retry and preserves the original session and first score", () => {
    const f = fixture();
    expect(explorerActionSchema.parse({ type: "retry-unresolved" })).toEqual({
      type: "retry-unresolved",
    });
    expect(() => f.act({ type: "retry-unresolved" })).toThrow(
      ExplorerActionInvalid,
    );
    f.start();
    expect(() => f.act({ type: "retry-unresolved" })).toThrow(
      ExplorerActionInvalid,
    );
    const staleQuestionId = f.view.currentActivity!.questionId;
    f.finish((session) => session.queue[session.index]?.cardId === "prime");
    const paused = structuredClone(f.session());
    const record = structuredClone(f.state.profile.definitions!);
    expect(paused).toMatchObject({ round: 3, first: 12, done: true, stars: 4 });
    expect(f.state.receipts.at(-1)!.feedback.complete).toBe(false);
    expect(f.state.completedDays).toEqual([]);
    f.start("numbers");
    expect(f.state.profile.definitions).toEqual(record);
    expect(() => f.act({ type: "course", grade: 5 })).toThrow(
      ExplorerActionInvalid,
    );

    const requestId = randomUUID();
    f.act({ type: "retry-unresolved" }, requestId);
    expect(f.act({ type: "retry-unresolved" }, requestId).duplicate).toBe(true);
    expect(f.session()).toMatchObject({
      id: paused.id,
      date: paused.date,
      cardIds: paused.cardIds,
      first: paused.first,
      initialWrong: paused.initialWrong,
      passed: paused.passed,
      eligible: paused.eligible,
      continuation: 1,
      queue: paused.unresolved,
      index: 0,
      round: 0,
      done: false,
      unresolved: [],
    });
    expect(f.state.profile.definitions!.runs).toBe(1);
    expect(f.view.session).toMatchObject({
      total: 3,
      first: 12,
      continuation: 1,
    });
    expect(f.view.session!.cardIds).toHaveLength(5);
    expect(f.view.currentActivity!.kind).toBe("assemble");
    expect(() => f.act({ type: "retry-unresolved" })).toThrow(
      ExplorerActionInvalid,
    );
    expect(() =>
      f.act({ type: "answer", questionId: staleQuestionId, choiceIds: [0, 1] }),
    ).toThrow(ExplorerActionConflict);
    expect(() => f.act({ type: "solution", cardId: "prime" })).toThrow(
      ExplorerActionInvalid,
    );

    f.date("2026-09-27");
    f.reload();
    f.finish();
    expect(f.session()).toMatchObject({
      id: paused.id,
      first: 12,
      stars: 5,
      unresolved: [],
    });
    expect(f.state.profile.definitions!.history).toEqual([
      {
        ...record.history[0],
        unresolved: 0,
        stars: 5,
      },
    ]);
    expect(f.state.completedDays).toEqual([
      {
        date: "2026-09-27",
        unitId: "factors",
        sessionId: paused.id,
        cardIds: paused.cardIds,
        route: "unit",
      },
    ]);
    for (const cardId of paused.cardIds!.filter((id) => id !== "prime")) {
      expect(f.state.profile.definitions!.cards[cardId]).toEqual(
        record.cards[cardId],
      );
    }
    expect(f.state.profile.definitions!.cards.prime).toMatchObject({
      level: 1,
      due: "2026-09-28",
      lastRecall: "retry",
      missed: 0,
    });
    const receipt = f.state.receipts.at(-1)!;
    expect(receipt.feedback).toMatchObject({ complete: true, stars: 1 });
    const completed = structuredClone(f.state);
    expect(
      f.act(JSON.parse(receipt.actionKey), receipt.requestId).duplicate,
    ).toBe(true);
    expect(f.state).toEqual(completed);
    expect(() => f.act({ type: "retry-unresolved" })).toThrow(
      ExplorerActionInvalid,
    );
  });

  it("can pause and resume repeatedly without duplicating history, rewards or schedules", () => {
    const f = fixture();
    f.start();
    f.finish((session) =>
      ["prime", "factorization"].includes(session.queue[session.index]!.cardId),
    );
    const original = structuredClone(f.session());
    expect(original.first).toBe(9);
    f.date("2026-09-27");
    f.act({ type: "retry-unresolved" });
    f.finish(
      (session) => session.queue[session.index]!.cardId === "factorization",
    );
    expect(f.session()).toMatchObject({
      first: 9,
      stars: 4,
      continuation: 1,
      round: 3,
    });
    expect(f.session().unresolved).toHaveLength(3);
    expect(f.state.profile.definitions!.history).toHaveLength(1);
    expect(f.state.receipts.at(-1)!.feedback).toMatchObject({
      stars: 1,
      complete: false,
    });
    const progress = structuredClone(f.state.profile.definitions!.cards);

    f.date("2026-09-28");
    f.act({ type: "retry-unresolved" });
    const staleQuestionId = f.view.currentActivity!.questionId;
    f.finish(() => true);
    expect(f.state.receipts.at(-1)!.feedback).toMatchObject({
      stars: 0,
      complete: false,
    });
    // 시도한 날(attemptedAt)은 세션을 시작한 날이라 이어 풀기로는 안 바뀐다(D-143 ⑦ · 리드 검토 ③).
    expect(f.state.profile.definitions!.cards.factorization).toEqual(
      progress.factorization,
    );
    expect(f.state.profile.definitions!.cards.prime).toEqual(progress.prime);
    expect(f.state.profile.definitions!.history).toHaveLength(1);
    expect(f.state.completedDays).toEqual([]);

    f.date("2026-09-29");
    f.act({ type: "retry-unresolved" });
    expect(f.view.currentActivity!.questionId).not.toBe(staleQuestionId);
    expect(() =>
      f.act({ type: "answer", questionId: staleQuestionId, choiceIds: [0, 1] }),
    ).toThrow(ExplorerActionConflict);
    f.reload();
    f.finish();
    expect(f.session()).toMatchObject({
      id: original.id,
      cardIds: original.cardIds,
      first: 9,
      stars: 5,
      continuation: 3,
    });
    expect(f.state.profile.stars).toBe(5);
    expect(f.state.profile.earned).toBe(5);
    expect(f.state.profile.definitions!.runs).toBe(1);
    expect(f.state.profile.definitions!.cards.prime).toEqual(progress.prime);
    expect(f.state.profile.definitions!.cards.factorization).toMatchObject({
      level: 1,
      due: "2026-09-30",
    });
    expect(f.state.profile.definitions!.history).toHaveLength(1);
    expect(f.state.profile.definitions!.history[0]).toMatchObject({
      first: 9,
      stars: 5,
      unresolved: 0,
      date: "2026-09-26",
    });
    expect(f.state.completedDays).toHaveLength(1);
    expect(f.state.completedDays[0]!.date).toBe("2026-09-29");
  });

  it("does not advance an existing card's memory schedule or reward its continued recall", () => {
    const f = fixture();
    f.start();
    f.finish();
    f.date("2026-09-27");
    f.act({ type: "start", route: "memory" });
    f.finish((session) => session.queue[session.index]!.cardId === "prime");
    const record = structuredClone(f.state.profile.definitions!);
    const stars = f.state.profile.stars;
    expect(record.cards.prime).toMatchObject({
      level: 1,
      reviewStep: 0,
      due: "2026-09-28",
      lastRecall: "retry",
    });
    f.date("2026-09-28");
    f.act({ type: "retry-unresolved" });
    f.finish();
    expect(f.state.profile.definitions!.cards).toEqual({
      ...record.cards,
      // 시도한 날은 기억 복습을 시작한 09-27 그대로(이어 풀기로 안 바뀐다 — D-143 ⑦ · 리드 검토 ③)
      prime: { ...record.cards.prime, missed: 0 },
    });
    expect(f.state.profile.stars).toBe(stars);
    expect(f.state.receipts.at(-1)!.feedback).toMatchObject({
      complete: true,
      stars: 0,
    });
    expect(f.state.profile.definitions!.history).toHaveLength(2);
    expect(f.state.completedDays.at(-1)).toMatchObject({
      date: "2026-09-28",
      route: "memory",
      sessionId: record.session!.id,
    });
  });

  it.each(["memory", "repair"] as const)(
    "retains the original five mixed-unit cards in a %s retry",
    (route) => {
      const f = fixture();
      if (route === "memory") {
        f.start("factors");
        f.finish();
        f.start("numbers");
        f.finish();
        for (const progress of Object.values(
          f.state.profile.definitions!.cards,
        ))
          progress.due = "2026-10-01";
        f.state.profile.definitions!.cards.prime!.due = "2026-09-27";
        f.state.profile.definitions!.cards[
          definitionCards.find((card) => card.unit === "numbers")!.id
        ]!.due = "2026-09-27";
      }
      f.date("2026-09-27");
      f.act({
        type: "start",
        route,
        ...(route === "repair" ? { cardId: "factorization" } : {}),
      });
      const original = structuredClone(f.session());
      expect(
        new Set(original.cardIds!.map((id) => definitionCard(id).unit)).size,
      ).toBeGreaterThan(1);
      const unresolvedCard = original.cardIds![0]!;
      f.finish(
        (session) => session.queue[session.index]!.cardId === unresolvedCard,
      );
      f.act({ type: "retry-unresolved" });
      f.reload();
      f.finish();
      expect(f.session()).toMatchObject({
        id: original.id,
        route,
        cardIds: original.cardIds,
        first: 12,
      });
      expect(f.session().targetCardId).toBe(original.targetCardId);
      expect(f.state.completedDays.at(-1)).toMatchObject({
        sessionId: original.id,
        route,
        cardIds: original.cardIds,
      });
    },
  );

  it("resumes common-denominator misses without repeating the embedded workshop", () => {
    const f = fixture(5);
    f.start(definitionCard("g5-common-denominator").unit);
    f.finish(
      (session) =>
        session.queue[session.index]!.cardId === "g5-common-denominator",
    );
    const workshop = structuredClone(f.state.profile.workshop);
    const stars = f.state.profile.stars;
    f.date("2026-09-30");
    f.act({ type: "retry-unresolved" });
    expect(f.view.currentActivity!.kind).toBe("assemble");
    f.finish();
    expect(f.state.profile.workshop).toEqual(workshop);
    expect(f.state.profile.stars).toBe(stars + 1);
    expect(f.state.completedDays.at(-1)!.date).toBe("2026-09-30");
  });

  it("adopts a legacy history row and keeps the original five cards when reopening", () => {
    const f = fixture();
    f.start();
    f.finish((session) => session.queue[session.index]!.cardId === "prime");
    const cardIds = f.session().cardIds;
    delete f.session().cardIds;
    delete f.state.profile.definitions!.history[0]!.sessionId;
    f.reload();
    f.act({ type: "retry-unresolved" });
    expect(f.session().cardIds).toEqual(cardIds);
    f.finish();
    expect(f.state.profile.definitions!.history).toHaveLength(1);
    expect(f.state.profile.definitions!.history[0]).toMatchObject({
      sessionId: f.session().id,
      first: 12,
      unresolved: 0,
    });
  });

  it("keeps unresolved historical replay and its retry read-only", () => {
    const f = fixture();
    f.start();
    f.finish();
    const original = structuredClone(f.state);
    f.date("2026-09-27");
    f.act({ type: "start", route: "unit", dayId: "2026-09-26" });
    f.finish((session) => session.queue[session.index]!.cardId === "prime");
    const id = f.session().id;
    f.act({ type: "retry-unresolved" });
    f.reload();
    f.finish();
    expect(f.session()).toMatchObject({
      id,
      reviewOnly: true,
      first: 12,
      stars: 0,
    });
    expect(f.state.profile.definitions!.cards).toEqual(
      original.profile.definitions!.cards,
    );
    expect(f.state.profile.definitions!.history).toEqual(
      original.profile.definitions!.history,
    );
    expect(f.state.profile.stars).toBe(original.profile.stars);
    expect(f.state.profile.earned).toBe(original.profile.earned);
    expect(f.state.completedDays).toEqual(original.completedDays);
  });

  it("keeps 1/3/7/14/30-day recall separate from capped card stars and prevents early farming", () => {
    const f = fixture();
    f.start();
    f.finish();
    expect(f.state.profile.definitions!.cards.prime!.due).toBe("2026-09-27");
    f.start();
    f.finish();
    expect(f.state.profile.stars).toBe(5);
    for (const [day, due, stars] of [
      ["2026-09-27", "2026-09-30", 10],
      ["2026-09-30", "2026-10-07", 15],
      ["2026-10-07", "2026-10-21", 15],
      ["2026-10-21", "2026-11-20", 15],
      ["2026-11-25", "2026-12-25", 15],
    ] as const) {
      f.date(day);
      f.start();
      f.finish();
      expect(f.state.profile.definitions!.cards.prime!.due).toBe(due);
      expect(f.state.profile.stars).toBe(stars);
    }
    f.date("2026-11-26");
    f.start();
    f.finish();
    expect(f.state.profile.definitions!.cards.prime!.due).toBe("2026-12-25");
    f.date("2026-11-27");
    f.start();
    f.finish(
      (session) =>
        session.round === 0 && session.queue[session.index]?.cardId === "prime",
    );
    expect(f.state.profile.definitions!.cards.prime!.due).toBe("2026-11-28");
    expect(f.state.profile.definitions!.cards.prime!.reviewStep).toBe(0);
    expect(f.state.profile.stars).toBe(15);
  });

  it("retains source hint reset behavior without offering first-round hints through the API", () => {
    const f = fixture();
    f.start();
    f.finish();
    f.date("2026-09-27");
    f.start();
    applyDefinitionAction(
      f.state.profile,
      {
        definitionAction: "hint",
        questionId: definitionQuestionId(f.session()),
      },
      "2026-09-27",
    );
    f.finish();
    expect(f.state.profile.definitions!.cards.prime!.lastRecall).toBe(
      "supported",
    );
    expect(f.state.profile.definitions!.cards.prime!.due).toBe("2026-09-28");
    expect(f.state.profile.definitions!.cards.prime!.level).toBe(1);
  });

  it("awards each chest once and blocks unreached chests", () => {
    const f = fixture();
    f.start();
    expect(() => f.act({ type: "chest", chestId: "factors:2" })).toThrow(
      ExplorerActionInvalid,
    );
    for (let index = 0; index < 6; index++) f.answer();
    expect(
      definitionChests(f.state.profile).find(
        (chest) => chest.id === "factors:2",
      )?.ready,
    ).toBe(true);
    expect(f.act({ type: "chest", chestId: "factors:2" }).feedback.stars).toBe(
      1,
    );
    f.act({ type: "chest", chestId: "factors:2" });
    expect(f.state.profile.stars).toBe(1);
    expect(f.state.completedDays).toHaveLength(0);
  });

  it("replays a previous completed day without altering progress, schedules, rewards or today's position", () => {
    const f = fixture();
    f.start();
    f.finish();
    const saved = structuredClone(f.state);
    f.date("2026-09-27");
    f.act({
      type: "start",
      route: "unit",
      dayId: "2026-09-26",
      unitId: "numbers",
    });
    expect(f.session().unit).toBe("factors");
    expect(f.view.session?.reviewOnly).toBe(true);
    f.finish();
    expect(f.state.completedDays).toEqual(saved.completedDays);
    expect(f.state.profile.stars).toBe(saved.profile.stars);
    expect(f.state.profile.earned).toBe(saved.profile.earned);
    expect(f.state.profile.definitions!.cards).toEqual(
      saved.profile.definitions!.cards,
    );
    expect(f.state.profile.definitions!.history).toEqual(
      saved.profile.definitions!.history,
    );
  });

  it("preserves mixed-route card IDs and unrelated schedules after restart", () => {
    const f = fixture();
    f.start();
    f.finish();
    const unrelated = structuredClone(
      f.state.profile.definitions!.cards.coprime,
    );
    f.date("2026-09-27");
    expect(definitionMemoryCards(f.state.profile, "2026-09-27")).toHaveLength(
      5,
    );
    f.act({ type: "start", route: "repair", cardId: "factorization" });
    const cards = [...f.session().cardIds!];
    f.finish((session) => session.round === 0 && session.index === 0);
    expect(f.session().cardIds).toEqual(cards);
    expect(f.state.profile.definitions!.cards.coprime).toEqual(unrelated);
    const restored = storedExplorerSchema.parse(
      JSON.parse(JSON.stringify(f.state)),
    );
    expect(restored.profile.definitions!.session!.cardIds).toEqual(cards);
    expect(explorerView(restored, "2026-09-27").session?.done).toBe(true);
  });
});
