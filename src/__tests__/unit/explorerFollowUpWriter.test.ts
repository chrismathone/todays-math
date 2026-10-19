// @vitest-environment node
/**
 * Writer side of «한 번 더 → 풀이» for explorer concept cards (plan §3.2 ②,
 * decisions 2 and 6). Ships only after `explorerFollowUpReader.test.ts` is in production.
 * The codex review's conditions are in AGENTS.md «Explorer card follow-ups».
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  explorerViewSchema,
  storedExplorerSchema,
  type ExplorerAction,
  type StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
  definitionTaskKey,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";

const date = "2026-10-20";
const unitId = definitionUnits.find((unit) => unit.grade === 5)!.id;
const asking = { followUps: true } as const;

function started(): StoredExplorer {
  return applyExplorerAction(
    createExplorerState(randomUUID(), 5),
    { type: "start", route: "unit", unitId },
    date,
    randomUUID(),
  ).state;
}
const sessionOf = (state: StoredExplorer) =>
  state.profile.definitions!.session!;
function act(
  state: StoredExplorer,
  action: ExplorerAction,
  options: { followUps?: boolean } = asking,
) {
  return applyExplorerAction(state, action, date, randomUUID(), options);
}
/** Reads the definition first when the card asks for it. */
function ready(state: StoredExplorer) {
  const session = sessionOf(state);
  return definitionNeedsRead(state.profile, session)
    ? act(state, { type: "read", questionId: definitionQuestionId(session) })
        .state
    : state;
}
/** Public choice positions for a right or a wrong answer to the current activity. */
function choices(state: StoredExplorer, how: "right" | "wrong") {
  const session = sessionOf(state);
  const task = session.queue[session.index]!;
  const card = definitionCard(task.cardId);
  const order = definitionOptions(session, task);
  const right =
    task.kind === 0
      ? [0, 1]
      : task.kind === 1
        ? card.examples.flatMap((example, i) => (example.yes ? [i] : []))
        : [Number(card.truth)];
  const wrong =
    task.kind === 0
      ? [0, 2]
      : task.kind === 1
        ? right.length === card.examples.length
          ? [right[0]]
          : card.examples.map((_, i) => i)
        : [1 - Number(card.truth)];
  return (how === "right" ? right : wrong).map((id) => order.indexOf(id));
}
function answer(
  state: StoredExplorer,
  how: "right" | "wrong" | "giveUp",
  options: { followUps?: boolean } = asking,
) {
  const prepared = ready(state);
  return act(
    prepared,
    {
      type: "answer",
      questionId: definitionQuestionId(sessionOf(prepared)),
      choiceIds: how === "giveUp" ? [] : choices(prepared, how),
    },
    options,
  );
}
const understood = (state: StoredExplorer) =>
  act(state, {
    type: "understood",
    questionId: definitionQuestionId(sessionOf(state)),
  });
const valid = (state: StoredExplorer) =>
  expect(storedExplorerSchema.safeParse(state).success).toBe(true);

describe("explorer card follow-ups (writer)", () => {
  it("keeps a wrong first answer on the same question for one more try", () => {
    const before = ready(started());
    const questionId = definitionQuestionId(sessionOf(before));
    const firstChoiceIds = choices(before, "wrong");
    const wrong = answer(before, "wrong");
    valid(wrong.state);
    const session = sessionOf(wrong.state);
    expect(wrong.feedback).toMatchObject({ correct: false, advance: false });
    expect(definitionQuestionId(session)).toBe(questionId);
    expect(session.followUp).toEqual({
      questionId,
      state: "again",
      firstChoiceIds,
    });
    expect(session.initialWrong).toContain(
      session.queue[session.index]!.cardId,
    );
    expect(session.first).toBe(0);
    expect(session.next).toEqual([]);

    const view = explorerView(wrong.state, date, { followUp: true });
    expect(explorerViewSchema.safeParse(view).success).toBe(true);
    expect(view.currentActivity?.followUp).toEqual({
      state: "again",
      firstChoiceIds,
    });
    expect("followUp" in explorerView(wrong.state, date).currentActivity!).toBe(
      false,
    );

    const right = answer(wrong.state, "right");
    valid(right.state);
    const after = sessionOf(right.state);
    expect(right.feedback).toMatchObject({ correct: true, advance: true });
    expect(after.followUp).toBeUndefined();
    expect(after.index).toBe(session.index + 1);
    expect(after.passed).toContain(
      definitionTaskKey(session.queue[session.index]!),
    );
    expect(after.first).toBe(0);
  });

  it("opens the solution on a second miss or «아직 모르겠어요», and moves on only on «알겠어요»", () => {
    for (const second of ["wrong", "giveUp"] as const) {
      const first = answer(started(), "wrong");
      const shown = answer(first.state, second);
      valid(shown.state);
      const session = sessionOf(shown.state);
      const task = session.queue[session.index]!;
      expect(session.followUp?.state).toBe("solution");
      expect(session.shown).toEqual([definitionTaskKey(task)]);
      expect(shown.feedback.solution?.cardId).toBe(task.cardId);
      expect(shown.feedback.advance).toBe(false);
      expect(
        explorerView(shown.state, date, { followUp: true }).currentActivity
          ?.solution?.cardId,
      ).toBe(task.cardId);
      expect(() => answer(shown.state, "right")).toThrow();

      const done = understood(shown.state);
      valid(done.state);
      const after = sessionOf(done.state);
      expect(after.followUp).toBeUndefined();
      expect(after.index).toBe(session.index + 1);
      expect(after.next).toEqual([]);
      expect(after.hinted).toEqual(session.hinted);
    }
    const gaveUp = answer(started(), "giveUp");
    expect(sessionOf(gaveUp.state).followUp).toMatchObject({
      state: "solution",
      firstChoiceIds: [],
    });
    expect(() => understood(answer(started(), "wrong").state)).toThrow();
  });

  it("lets the stored follow-up decide even for a tab that does not ask", () => {
    const wrong = answer(started(), "wrong");
    const legacySecond = answer(wrong.state, "wrong", {});
    expect(sessionOf(legacySecond.state).followUp?.state).toBe("solution");
    // Without the header and without an open follow-up the old rounds stay.
    const legacy = answer(started(), "wrong", {});
    const session = sessionOf(legacy.state);
    expect(session.followUp).toBeUndefined();
    expect(session.next).toHaveLength(1);
    expect(session.index).toBe(1);
  });

  it("ends the day with shown activities out of the retry rounds and the card left for review", () => {
    let state = started();
    let shownCard: string | null = null;
    let secondCard: string | null = null;
    for (let guard = 0; guard < 60 && !sessionOf(state).done; guard++) {
      state = ready(state);
      const session = sessionOf(state);
      const task = session.queue[session.index]!;
      if (!shownCard && task.kind === 2 && task.cardId !== secondCard) {
        shownCard = task.cardId;
        state = understood(
          answer(answer(state, "wrong").state, "wrong").state,
        ).state;
      } else if (!secondCard && task.kind === 1 && task.cardId !== shownCard) {
        secondCard = task.cardId;
        state = answer(answer(state, "wrong").state, "right").state;
      } else state = answer(state, "right").state;
      valid(state);
    }
    const session = sessionOf(state);
    expect(session.done).toBe(true);
    expect(session.unresolved).toEqual([]);
    expect(session.round).toBe(0);
    const cards = state.profile.definitions!.cards;
    expect(cards[shownCard!]).toMatchObject({ level: 0, missed: 1 });
    expect(cards[secondCard!].level).toBe(1);
    expect(cards[secondCard!].lastRecall).toBe("retry");
    expect(state.completedDays.map((day) => day.sessionId)).toContain(
      session.id,
    );
  });

  it("records the day when its last activity ends at «알겠어요»", () => {
    let state = started();
    for (let guard = 0; guard < 40; guard++) {
      state = ready(state);
      const session = sessionOf(state);
      if (session.index === session.queue.length - 1) break;
      state = answer(state, "right").state;
    }
    state = understood(
      answer(answer(state, "wrong").state, "giveUp").state,
    ).state;
    valid(state);
    const session = sessionOf(state);
    expect(session.done).toBe(true);
    expect(session.unresolved).toEqual([]);
    expect(state.completedDays.map((day) => day.sessionId)).toContain(
      session.id,
    );
  });

  it("keeps a past board's practice, «알겠어요» included, out of stars and card records", () => {
    let state = started();
    for (let guard = 0; guard < 40 && !sessionOf(state).done; guard++)
      state = answer(state, "right").state;
    let review = act(state, {
      type: "start",
      route: "unit",
      dayId: date,
    }).state;
    expect(sessionOf(review).reviewOnly).toBe(true);
    const stars = review.profile.stars;
    const cards = structuredClone(review.profile.definitions!.cards);
    for (let guard = 0; guard < 60 && !sessionOf(review).done; guard++) {
      review = answer(answer(review, "wrong").state, "wrong").state;
      review = understood(review).state;
      valid(review);
    }
    expect(sessionOf(review).done).toBe(true);
    expect(review.profile.stars).toBe(stars);
    expect(review.profile.definitions!.cards).toEqual(cards);
  });
});
