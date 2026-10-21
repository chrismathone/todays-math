// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  definitionCards,
  definitionSessionCard,
  definitionOptions,
} from "@/lib/math-explorers/definition-cards";

const ids = [
  "g5-decimal-multiply",
  "g5-at-least",
  "g5-more-than",
  "g5-round",
  "g5-round-up",
];
const date = "2026-10-22";
function dueState() {
  const state = createExplorerState("review-variants", 5);
  state.profile.definitions = {
    runs: 0,
    history: [],
    cards: Object.fromEntries(
      ids.map((id) => [
        id,
        {
          level: 1,
          due: date,
          lastDate: "2026-10-21",
          attemptedAt: "2026-10-21",
          missed: 0,
        },
      ]),
    ),
  };
  return state;
}
function start(state = dueState()) {
  return applyExplorerAction(
    state,
    { type: "start", route: "memory" },
    date,
    randomUUID(),
  ).state;
}
function exampleLabels(state: ReturnType<typeof start>, id: string) {
  state.profile.definitions!.session!.index =
    state.profile.definitions!.session!.queue.findIndex(
      (task) => task.cardId === id && task.kind === 1,
    );
  return explorerView(state, date)
    .currentActivity!.choices.map((choice) => choice.label)
    .sort();
}
describe("bounded grade-5 review variants", () => {
  it("marks only new memory sessions and only their already-studied supported cards", () => {
    const state = dueState();
    delete state.profile.definitions!.cards[ids[4]];
    const unit = applyExplorerAction(
      state,
      { type: "start", route: "unit", unitId: "g5-estimate" },
      date,
      randomUUID(),
    ).state;
    expect(unit.profile.definitions!.session).not.toHaveProperty(
      "reviewVariant",
    );
    const memory = start(state);
    expect(memory.profile.definitions!.session!.reviewVariant).toEqual({
      version: 1,
      seed: 1,
      cardIds: ids.slice(0, 4),
    });
    const opened = structuredClone(memory);
    delete opened.profile.definitions!.session!.reviewVariant;
    const resumed = start(opened);
    expect(resumed.profile.definitions).toEqual(opened.profile.definitions);
    expect(resumed.profile.definitions!.session).not.toHaveProperty(
      "reviewVariant",
    );
    const repair = applyExplorerAction(
      state,
      { type: "start", route: "repair", cardId: ids[0] },
      date,
      randomUUID(),
    ).state;
    expect(repair.profile.definitions!.session).not.toHaveProperty(
      "reviewVariant",
    );
  });
  it("retains frozen identity on completion/replay and varies successive actual due reviews", () => {
    let state = dueState();
    let day = date;
    let previous: string[] = [];
    for (let run = 0; run < 4; run++) {
      state = applyExplorerAction(
        state,
        { type: "start", route: "memory" },
        day,
        randomUUID(),
      ).state;
      const identity = structuredClone(
        state.profile.definitions!.session!.reviewVariant,
      );
      const examples = ids.map((id) =>
        JSON.stringify(
          definitionSessionCard(state.profile.definitions!.session, id)
            .examples,
        ),
      );
      if (run)
        examples.forEach((value, index) =>
          expect(value).not.toBe(previous[index]),
        );
      previous = examples;
      while (!state.profile.definitions!.session!.done) {
        const session = state.profile.definitions!.session!;
        const task = session.queue[session.index]!;
        const card = definitionSessionCard(session, task.cardId);
        const order = definitionOptions(session, task);
        const right =
          task.kind === 0
            ? [0, 1]
            : task.kind === 1
              ? card.examples.flatMap((e, i) => (e.yes ? [i] : []))
              : [Number(card.truth)];
        state = applyExplorerAction(
          state,
          {
            type: "answer",
            questionId: explorerView(state, day).currentActivity!.questionId,
            choiceIds: right.map((value) => order.indexOf(value)),
          },
          day,
          randomUUID(),
          { followUps: true },
        ).state;
      }
      expect(state.profile.definitions!.session!.first).toBe(15);
      expect(state.completedDays.at(-1)!.reviewVariant).toEqual(identity);
      const saved = structuredClone(state.profile.definitions!.history);
      const replay = applyExplorerAction(
        state,
        { type: "start", route: "unit", dayId: day },
        day,
        randomUUID(),
      ).state;
      expect(replay.profile.definitions!.session!.reviewVariant).toEqual(
        identity,
      );
      expect(replay.profile.definitions!.history).toEqual(saved);
      day = state.profile.definitions!.cards[ids[0]].due;
    }
  });
  it.each(ids)("changes numeric examples on the next new review: %s", (id) => {
    const first = start();
    const labels = exampleLabels(first, id);
    first.profile.definitions!.session!.done = true;
    const next = start(first);
    expect(exampleLabels(next, id)).not.toEqual(labels);
    expect(exampleLabels(next, id)).not.toEqual(
      definitionCards
        .find((card) => card.id === id)!
        .examples.map((example) => example.text)
        .sort(),
    );
  });
});
