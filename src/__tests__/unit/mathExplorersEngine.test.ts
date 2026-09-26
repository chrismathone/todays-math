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
  const act = (action: ExplorerAction, requestId = randomUUID()) => {
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
    expect(() => f.act({ type: "upgrade" })).toThrow(ExplorerActionInvalid);
    expect(f.state.completedDays).toHaveLength(0);
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
