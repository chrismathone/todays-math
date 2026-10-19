// @vitest-environment node
/**
 * Reader side of «한 번 더 → 풀이» for explorer concept cards (plan §3.2 ②, decisions
 * 2 and 6, 2026-10-19). The writer ships only after this is in production: the stored
 * explorer record and the public activity are strict, so an older reader rejects
 * every session the writer touches.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  explorerActivitySchema,
  storedExplorerSchema,
  type StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import {
  definitionCard,
  definitionQuestionId,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const date = "2026-10-20";
const unitId = definitionUnits.find((unit) => unit.grade === 5)!.id;

function started(): StoredExplorer {
  return applyExplorerAction(
    createExplorerState(randomUUID(), 5),
    { type: "start", route: "unit", unitId },
    date,
    randomUUID(),
  ).state;
}
function withSession(
  state: StoredExplorer,
  extra: Record<string, unknown>,
): StoredExplorer {
  const definitions = state.profile.definitions!;
  return {
    ...state,
    profile: {
      ...state.profile,
      definitions: {
        ...definitions,
        session: { ...definitions.session!, ...extra },
      },
    },
  } as StoredExplorer;
}
const accepts = (state: StoredExplorer) => {
  expect(storedExplorerSchema.safeParse(state).success).toBe(true);
  expect(() =>
    parseSrsState({ ...emptySrsState(), explorers: state }),
  ).not.toThrow();
};
const rejects = (state: StoredExplorer) =>
  expect(storedExplorerSchema.safeParse(state).success).toBe(false);

describe("explorer card follow-ups (reader)", () => {
  it("stores a question waiting for a second try or showing its solution", () => {
    const state = started();
    const session = state.profile.definitions!.session!;
    const questionId = definitionQuestionId(session);
    const task = session.queue[session.index]!;
    accepts(
      withSession(state, {
        followUp: { questionId, state: "again", firstChoiceIds: [1] },
      }),
    );
    accepts(
      withSession(state, {
        followUp: { questionId, state: "solution", firstChoiceIds: [] },
        shown: [`${task.cardId}:${task.kind}`],
      }),
    );
    accepts(withSession(state, { shown: [] }));
    // The view still reads such a session (and does not send the field yet).
    const view = explorerView(
      withSession(state, {
        followUp: { questionId, state: "again", firstChoiceIds: [0] },
      }),
      date,
    );
    expect(view.currentActivity?.questionId).toBe(questionId);
    expect(view.currentActivity && "followUp" in view.currentActivity).toBe(
      false,
    );
  });

  it("rejects malformed follow-up records", () => {
    const state = started();
    const questionId = definitionQuestionId(
      state.profile.definitions!.session!,
    );
    rejects(
      withSession(state, {
        followUp: { questionId, state: "later", firstChoiceIds: [] },
      }),
    );
    rejects(
      withSession(state, {
        followUp: { questionId, state: "again", firstChoiceIds: [4] },
      }),
    );
    rejects(
      withSession(state, {
        followUp: { questionId, state: "again", firstChoiceIds: [], extra: 1 },
      }),
    );
    rejects(
      withSession(state, { shown: Array.from({ length: 16 }, () => "x") }),
    );
  });

  it("the public activity reads the follow-up and its solution before the server sends them", () => {
    const state = started();
    const activity = explorerView(state, date).currentActivity!;
    const card = definitionCard(activity.cardId);
    const solution = {
      cardId: card.id,
      name: card.name,
      definition: card.definition,
      explanation: card.explanation,
      note: card.note,
      examples: card.examples.map((example) => ({
        label: example.text,
        correct: example.yes,
      })),
      statement: card.trap,
      truth: card.truth,
    };
    expect(explorerActivitySchema.safeParse(activity).success).toBe(true);
    expect(
      explorerActivitySchema.safeParse({
        ...activity,
        followUp: { state: "again", firstChoiceIds: [2] },
      }).success,
    ).toBe(true);
    expect(
      explorerActivitySchema.safeParse({
        ...activity,
        followUp: { state: "solution", firstChoiceIds: [] },
        solution,
      }).success,
    ).toBe(true);
    expect(
      explorerActivitySchema.safeParse({
        ...activity,
        followUp: { state: "again", firstChoiceIds: [9] },
      }).success,
    ).toBe(false);
  });
});
