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
  explorerView,
  ExplorerActionConflict,
  ExplorerActionInvalid,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  workshopOptions,
  workshopQuestionId,
} from "@/lib/math-explorers/workshop";

function fixture() {
  let state = createExplorerState("workshop-student", 5),
    date = "2026-09-26";
  const act = (action: ExplorerAction, requestId = randomUUID()) => {
    const result = applyExplorerAction(state, action, date, requestId);
    state = result.state;
    return result;
  };
  const session = () => state.profile.definitions!.session!;
  const lab = () => state.profile.workshop!.session!;
  const answer = () => {
    if (definitionNeedsRead(state.profile, session()))
      act({ type: "read", questionId: definitionQuestionId(session()) });
    const current = session(),
      task = current.queue[current.index]!,
      card = definitionCard(task.cardId);
    const source =
      task.kind === 0
        ? [0, 1]
        : task.kind === 1
          ? card.examples.flatMap((item, index) => (item.yes ? [index] : []))
          : [card.truth ? 1 : 0];
    act({
      type: "answer",
      questionId: definitionQuestionId(current),
      choiceIds: source.map((id) =>
        definitionOptions(current, task).indexOf(id),
      ),
    });
  };
  const enter = () => {
    act({
      type: "start",
      route: "unit",
      unitId: definitionCard("g5-common-denominator").unit,
    });
    while (session().queue[session().index]!.cardId !== "g5-common-denominator")
      answer();
    if (definitionNeedsRead(state.profile, session()))
      act({ type: "read", questionId: definitionQuestionId(session()) });
  };
  const investigate = () => {
    act({
      type: "lab-predict",
      questionId: workshopQuestionId(lab()),
      choiceId: workshopOptions(lab()).indexOf(0),
    });
    act({
      type: "lab-split",
      questionId: workshopQuestionId(lab()),
      factor: 3,
    });
    act({
      type: "lab-match",
      questionId: workshopQuestionId(lab()),
      factors: [6, 4],
    });
    act({
      type: "lab-rule",
      questionId: workshopQuestionId(lab()),
      choiceId: workshopOptions(lab()).indexOf(1),
    });
  };
  const check = (wrong = false, requestId = randomUUID()) => {
    const question = lab().questions[lab().checkIndex]!;
    const parts = question.fractions.map(
      (fraction) =>
        (fraction.numerator * question.denominator) / fraction.denominator,
    );
    if (wrong) parts[0] = 0;
    return act(
      { type: "lab-check", questionId: workshopQuestionId(lab()), parts },
      requestId,
    );
  };
  const finish = () => {
    while (!session().done) answer();
  };
  return {
    act,
    enter,
    investigate,
    check,
    finish,
    session,
    lab,
    get state() {
      return state;
    },
    get view() {
      return explorerView(state, date);
    },
    date: (next: string) => {
      date = next;
    },
    reload: () => {
      state = storedExplorerSchema.parse(JSON.parse(JSON.stringify(state)));
    },
  };
}

describe("embedded fraction manipulation", () => {
  it("starts inside the common-denominator concept after reading, keeping the daily activity index", () => {
    const f = fixture();
    expect(
      explorerActionSchema.safeParse({ type: "lab-start", route: "explore" })
        .success,
    ).toBe(false);
    expect(() =>
      f.act({ type: "lab-predict", questionId: "made-up", choiceId: 1 }),
    ).toThrow(ExplorerActionConflict);
    f.enter();
    expect(f.lab().stage).toBe("predict");
    expect(f.lab().attachedTo).toEqual({
      sessionId: f.session().id,
      questionId: definitionQuestionId(f.session()),
      cardId: "g5-common-denominator",
    });
    expect(f.view.currentActivity?.kind).toBe("assemble");
    const index = f.session().index;
    expect(() =>
      f.act({
        type: "answer",
        questionId: definitionQuestionId(f.session()),
        choiceIds: [0, 1],
      }),
    ).toThrow(ExplorerActionConflict);
    const result = f.act({
      type: "lab-predict",
      questionId: workshopQuestionId(f.lab()),
      choiceId: workshopOptions(f.lab()).indexOf(0),
    });
    expect(result.feedback.correct).toBeUndefined();
    expect(result.feedback.workshopSolution).toBeUndefined();
    expect(f.lab().stage).toBe("split");
    expect(f.session().index).toBe(index);
    expect(f.state.completedDays).toHaveLength(0);
  });

  it("validates stage/payload, accepts any valid common denominator and resumes without leaking keys", () => {
    const f = fixture();
    f.enter();
    const stale = workshopQuestionId(f.lab());
    f.act({ type: "lab-predict", questionId: stale, choiceId: 0 });
    expect(() =>
      f.act({ type: "lab-predict", questionId: stale, choiceId: 0 }),
    ).toThrow(ExplorerActionConflict);
    expect(() =>
      f.act({
        type: "lab-split",
        questionId: workshopQuestionId(f.lab()),
        factor: 0,
      }),
    ).toThrow(ExplorerActionInvalid);
    const wrong = f.act({
      type: "lab-split",
      questionId: workshopQuestionId(f.lab()),
      factor: 2,
    });
    expect(wrong.feedback.correct).toBe(false);
    expect(wrong.feedback.message).not.toMatch(/3|6|분자|분모/);
    expect(f.lab().stage).toBe("split");
    f.act({
      type: "lab-split",
      questionId: workshopQuestionId(f.lab()),
      factor: 3,
    });
    expect(
      f.act({
        type: "lab-match",
        questionId: workshopQuestionId(f.lab()),
        factors: [2, 2],
      }).feedback.correct,
    ).toBe(false);
    f.act({
      type: "lab-match",
      questionId: workshopQuestionId(f.lab()),
      factors: [6, 4],
    });
    expect(f.lab().factors).toEqual([6, 4]);
    f.reload();
    expect(f.lab().stage).toBe("rule");
    const payload = JSON.stringify(f.view.workshop);
    expect(payload).not.toMatch(
      /"answers"|"passed"|"questions"|"correct"|"numerators"/,
    );
    const correctId = workshopOptions(f.lab()).indexOf(1);
    expect(
      f.view.workshop?.session?.choices.find(
        (choice) => choice.id === correctId,
      )?.label,
    ).toBe("분자와 분모에 같은 수를 곱했어요");
    f.act({
      type: "lab-rule",
      questionId: workshopQuestionId(f.lab()),
      choiceId: correctId,
    });
    expect(() =>
      f.act({
        type: "lab-check",
        questionId: workshopQuestionId(f.lab()),
        parts: [99],
      }),
    ).toThrow(ExplorerActionInvalid);
    expect(() =>
      f.act({
        type: "lab-check",
        questionId: workshopQuestionId(f.lab()),
        parts: [1, 2],
      }),
    ).toThrow(ExplorerActionInvalid);
  });

  it("stores wrong checks, rewards the original discovery activity once, and resumes the same concept", () => {
    const f = fixture();
    f.enter();
    const index = f.session().index;
    f.investigate();
    const requestId = randomUUID(),
      questionId = workshopQuestionId(f.lab());
    f.act({ type: "lab-check", questionId, parts: [0] }, requestId);
    const duplicate = f.act(
      { type: "lab-check", questionId, parts: [0] },
      requestId,
    );
    expect(duplicate.duplicate).toBe(true);
    expect(f.lab().checkIndex).toBe(1);
    const completed = f.check();
    expect(completed.feedback.workshopSolution).toBeUndefined();
    expect(f.lab().passed).toEqual([false, true]);
    expect(f.state.profile.workshop?.blueprintAt).toBe("2026-09-26");
    expect(f.state.profile.workshop?.discoveredAt).toBeUndefined();
    expect(f.state.profile.stars).toBe(1);
    expect(f.session().index).toBe(index);
    expect(f.view.currentActivity?.kind).toBe("assemble");
    expect(f.state.completedDays).toHaveLength(0);
    expect(() => f.act({ type: "lab-solution" })).toThrow(
      ExplorerActionInvalid,
    );
    f.finish();
    expect(f.state.completedDays).toHaveLength(1);
    const solution = f.act({ type: "lab-solution" }).feedback.workshopSolution;
    expect(solution?.examples).toHaveLength(2);
    expect(solution?.examples[0]?.numerators).toEqual([8]);
    expect(JSON.stringify(f.view.workshop)).not.toContain("numerators");
    f.enter();
    expect(f.lab().route).toBe("check");
    f.check();
    f.check();
    f.finish();
    expect(f.state.profile.stars).toBe(6);
    expect(f.state.completedDays).toHaveLength(1);
  });

  it("uses the server completion day for three-day memory, allows one memory attempt per day, and awards no duplicate star", () => {
    const f = fixture();
    f.enter();
    f.investigate();
    f.date("2026-09-27");
    f.reload();
    f.check();
    f.check();
    f.finish();
    expect(f.view.workshop?.memoryDate).toBe("2026-09-30");
    f.date("2026-09-29");
    f.enter();
    expect(f.lab().route).toBe("check");
    f.check();
    f.check();
    f.finish();
    f.date("2026-09-30");
    f.enter();
    expect(f.lab().route).toBe("memory");
    f.check(true);
    f.check();
    f.finish();
    expect(f.state.profile.workshop?.rememberedAt).toBeUndefined();
    f.enter();
    expect(f.lab().route).toBe("check");
    f.check();
    f.check();
    f.finish();
    expect(f.state.profile.workshop?.rememberedAt).toBeUndefined();
    f.date("2026-10-01");
    f.enter();
    expect(f.lab().route).toBe("memory");
    f.check();
    f.check();
    f.finish();
    expect(f.state.profile.workshop?.rememberedAt).toBe("2026-10-01");
    expect(f.state.profile.workshop?.session?.stars).toBe(0);
    expect(f.state.profile.workshop?.blueprintAt).toBe("2026-09-27");
  });

  it("keeps historical board replay read-only and does not insert the manipulation again", () => {
    const f = fixture();
    f.enter();
    f.investigate();
    f.check();
    f.check();
    f.finish();
    const runs = f.state.profile.workshop!.runs,
      stars = f.state.profile.stars;
    f.date("2026-09-30");
    f.act({ type: "start", route: "unit", dayId: "2026-09-26" });
    f.finish();
    expect(f.state.profile.workshop?.runs).toBe(runs);
    expect(f.state.profile.stars).toBe(stars);
    expect(f.state.completedDays).toHaveLength(1);
  });
});
