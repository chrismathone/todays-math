// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EXPLORER_REVIEW_VARIANT_CARD_IDS as ids,
  explorerReviewVariantSchema,
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
  definitionCards,
  definitionOptions,
  definitionSessionCard,
} from "@/lib/math-explorers/definition-cards";
import { reviewVariantCard } from "@/lib/math-explorers/reviewVariants";

const date = "2026-10-22";
function marked(seed = 1) {
  let state = createExplorerState("variant-reader", 5);
  state = applyExplorerAction(
    state,
    { type: "start", route: "unit", unitId: "g5-estimate" },
    date,
    randomUUID(),
  ).state;
  const session = state.profile.definitions!.session!;
  session.seen = [...ids];
  session.reviewVariant = { version: 1, seed, cardIds: [...ids] };
  return state;
}
function answer(state: StoredExplorer, values: number[]) {
  const session = state.profile.definitions!.session!;
  const view = explorerView(state, date, { followUp: true });
  const order = definitionOptions(session, session.queue[session.index]!);
  return applyExplorerAction(
    state,
    {
      type: "answer",
      questionId: view.currentActivity!.questionId,
      choiceIds: values.map((value) => order.indexOf(value)),
    },
    date,
    randomUUID(),
    { followUps: true },
  );
}
function independentExample(cardId: string, prompt: string, text: string) {
  const nums = text.match(/\d+(?:\.\d+)?/g)!.map(Number);
  if (cardId === "g5-decimal-multiply")
    return Math.abs(nums[0] * nums[1] - nums[2]) < 1e-10;
  if (cardId === "g5-round") return Math.round(nums[0] / 10) * 10 === nums[1];
  if (cardId === "g5-round-up") return Math.ceil(nums[0] / 10) * 10 === nums[1];
  const boundary = Number(prompt.match(/\d+/)![0]);
  return prompt.includes("이상")
    ? nums[0] >= boundary
    : prompt.includes("이하")
      ? nums[0] <= boundary
      : prompt.includes("초과")
        ? nums[0] > boundary
        : nums[0] < boundary;
}
function independentTruth(cardId: string, statement: string) {
  const nums = statement.match(/\d+(?:\.\d+)?/g)!.map(Number);
  if (cardId === "g5-decimal-multiply")
    return Math.abs(nums[0] * nums[1] - nums[2]) < 1e-10;
  if (cardId === "g5-round") return Math.round(nums[0] / 10) * 10 === nums[1];
  if (cardId === "g5-round-up") return Math.ceil(nums[0] / 10) * 10 === nums[1];
  const includesBoundary =
    statement.includes("이상") || statement.includes("이하");
  return includesBoundary !== statement.includes("포함되지 않는다");
}
describe("review variant reader floor", () => {
  it("prints both tenths operands with one decimal place, matching the two-place explanation", () => {
    for (let seed = 0; seed < 640; seed++) {
      const card = reviewVariantCard(definitionCard("g5-decimal-multiply"), {
        version: 1,
        seed,
        cardIds: [...ids],
      });
      for (const example of card.examples)
        expect(example.text).toMatch(/^\d+\.\d × \d+\.\d = /);
      expect(card.trap).toMatch(/^\d+\.\d × \d+\.\d은 /);
      const [left, right] = card.examples[0].text
        .match(/\d+(?:\.\d+)?/g)!
        .map(Number);
      expect(card.explanation).toContain(
        `${Math.round(left * 10)} × ${Math.round(right * 10)} = ${Math.round(left * right * 100)}`,
      );
    }
    const boundary = reviewVariantCard(definitionCard("g5-decimal-multiply"), {
      version: 1,
      seed: 9,
      cardIds: [...ids],
    });
    expect(boundary.examples[0].text).toBe("2.0 × 0.2 = 0.4");
  });

  it.each(["g5-at-least", "g5-more-than"])(
    "does not reveal truth from the range direction: %s",
    (id) => {
      const combinations = new Set<string>();
      for (let seed = 0; seed < 4; seed++) {
        const card = reviewVariantCard(definitionCard(id), {
          version: 1,
          seed,
          cardIds: [...ids],
        });
        combinations.add(
          `${card.exampleTitle.match(/이상|이하|초과|미만/)![0]}:${card.truth}`,
        );
        expect(card.truth).toBe(independentTruth(id, card.trap));
      }
      expect([...combinations].sort()).toEqual(
        (id === "g5-at-least" ? ["이상", "이하"] : ["초과", "미만"])
          .flatMap((term) => [`${term}:false`, `${term}:true`])
          .sort(),
      );
    },
  );

  it.each(ids)(
    "changes the numeric choice set for adjacent seeds: %s",
    (id) => {
      const card = definitionCard(id);
      for (let seed = 0; seed < 640; seed++) {
        const labels = (value: number) =>
          reviewVariantCard(card, {
            version: 1,
            seed: value,
            cardIds: [...ids],
          })
            .examples.map((example) => example.text)
            .sort();
        expect(labels(seed), `${id} seed ${seed}`).not.toEqual(
          labels(seed + 1),
        );
      }
    },
  );

  it.each(ids)(
    "independently checks all choices and truth for 640 seeds: %s",
    (id) => {
      const original = definitionCard(id);
      const before = JSON.stringify(original);
      const outputs = new Set<string>();
      for (let seed = 0; seed < 640; seed++) {
        const card = reviewVariantCard(original, {
          version: 1,
          seed,
          cardIds: [...ids],
        });
        expect(card.definition).toBe(original.definition);
        expect(card.words).toEqual(original.words);
        expect(card.pieces).toEqual(original.pieces);
        expect(card.prerequisites).toEqual(original.prerequisites);
        for (const example of card.examples)
          expect(example.yes, example.text).toBe(
            independentExample(id, card.exampleTitle, example.text),
          );
        expect(card.truth, card.trap).toBe(independentTruth(id, card.trap));
        expect(new Set(card.examples.map((example) => example.text)).size).toBe(
          4,
        );
        expect(card.examples.filter((example) => example.yes)).toHaveLength(2);
        outputs.add(
          JSON.stringify([card.exampleTitle, card.examples, card.trap]),
        );
      }
      expect(outputs.size).toBeGreaterThanOrEqual(80);
      expect(JSON.stringify(original)).toBe(before);
    },
  );
  it("keeps all unsupported cards and absent identities byte-identical", () => {
    for (const card of definitionCards) {
      expect(reviewVariantCard(card)).toBe(card);
      if (!ids.some((id) => id === card.id))
        expect(
          reviewVariantCard(card, { version: 1, seed: 52, cardIds: [...ids] }),
        ).toBe(card);
    }
    const state = marked();
    delete state.profile.definitions!.session!.reviewVariant;
    const saved = JSON.stringify(state);
    expect(JSON.stringify(storedExplorerSchema.parse(JSON.parse(saved)))).toBe(
      saved,
    );
    const session = state.profile.definitions!.session!;
    for (const id of ids)
      expect(definitionSessionCard(session, id)).toBe(definitionCard(id));
  });
  it.each(ids)(
    "keeps public choices, grading, two wrong answers, solution and reload aligned: %s",
    (id) => {
      for (const seed of [0, 1, 37, 79, 80, 631])
        for (const kind of [1, 2] as const) {
          let state = marked(seed);
          state.profile.definitions!.session!.index =
            state.profile.definitions!.session!.queue.findIndex(
              (task) => task.cardId === id && task.kind === kind,
            );
          const session = state.profile.definitions!.session!;
          const card = definitionSessionCard(session, id);
          const view = explorerView(state, date, { followUp: true });
          const order = definitionOptions(
            session,
            session.queue[session.index]!,
          );
          expect(
            view.currentActivity!.choices.map((choice) => choice.label),
          ).toEqual(
            order.map((index) =>
              kind === 1
                ? card.examples[index].text
                : index === 1
                  ? "맞다"
                  : "아니다",
            ),
          );
          const correct =
            kind === 1
              ? card.examples.flatMap((example, index) =>
                  example.yes ? [index] : [],
                )
              : [Number(card.truth)];
          const wrong =
            kind === 1
              ? card.examples.flatMap((example, index) =>
                  !example.yes ? [index] : [],
                )
              : [Number(!card.truth)];
          expect(answer(state, correct).feedback.correct).toBe(true);
          state = answer(state, wrong).state;
          expect(
            explorerView(state, date, { followUp: true }).currentActivity!
              .followUp!.state,
          ).toBe("again");
          const retry = answer(state, correct);
          expect(retry.feedback.correct).toBe(true);
          expect(retry.state.profile.definitions!.session!.first).toBe(0);
          const second = answer(
            storedExplorerSchema.parse(JSON.parse(JSON.stringify(state))),
            wrong,
          );
          state = second.state;
          const reopened = explorerView(
            storedExplorerSchema.parse(JSON.parse(JSON.stringify(state))),
            date,
            { followUp: true },
          ).currentActivity!;
          expect(reopened.choices).toEqual(view.currentActivity!.choices);
          expect(reopened.questionId).toBe(view.currentActivity!.questionId);
          expect(reopened.solution).toEqual(second.feedback.solution);
          expect(reopened.solution!.examples).toEqual(
            card.examples.map((example) => ({
              label: example.text,
              correct: example.yes,
            })),
          );
          expect(reopened.solution!.statement).toBe(card.trap);
          expect(reopened.solution!.truth).toBe(card.truth);
          expect(reopened.solution!.explanation).toBe(card.explanation);
          expect(explorerView(state, date).currentActivity).not.toHaveProperty(
            "solution",
          );
          const moved = applyExplorerAction(
            state,
            { type: "understood", questionId: reopened.questionId },
            date,
            randomUUID(),
            { followUps: true },
          );
          expect(moved.state.profile.definitions!.session!.shown).toContain(
            `${id}:${kind}`,
          );
          expect(
            moved.state.profile.definitions!.session!.passed,
          ).not.toContain(`${id}:${kind}`);
          expect(
            moved.state.profile.definitions!.session!.reviewVariant,
          ).toEqual(session.reviewVariant);
        }
    },
  );
  it("reads versioned state, rejects unknown versions and duplicate/out-of-scope identities", () => {
    expect(
      storedExplorerSchema.parse(marked()).profile.definitions!.session!
        .reviewVariant!.version,
    ).toBe(1);
    for (const value of [
      { version: 2, seed: 1, cardIds: [ids[0]] },
      { version: 1, seed: -1, cardIds: [ids[0]] },
      { version: 1, seed: 1, cardIds: ["prime"] },
      { version: 1, seed: 1, cardIds: [ids[0], ids[0]] },
    ])
      expect(explorerReviewVariantSchema.safeParse(value).success).toBe(false);
  });
  it("replays a completed variant exactly and keeps an old day static without changing history or schedule", () => {
    for (const variant of [
      undefined,
      marked(33).profile.definitions!.session!.reviewVariant,
    ]) {
      let state = marked(70);
      state.profile.definitions!.session!.done = true;
      state.completedDays = [
        {
          date: "2026-10-21",
          unitId: "g5-estimate",
          sessionId: "original-day",
          cardIds: [...ids],
          route: "memory",
          ...(variant ? { reviewVariant: variant } : {}),
        },
      ];
      const saved = JSON.stringify({
        history: state.profile.definitions!.history,
        cards: state.profile.definitions!.cards,
        days: state.completedDays,
        stars: state.profile.stars,
      });
      state = applyExplorerAction(
        state,
        { type: "start", route: "unit", dayId: "2026-10-21" },
        date,
        randomUUID(),
      ).state;
      expect(state.profile.definitions!.session!.reviewVariant).toEqual(
        variant,
      );
      for (
        let limit = 0;
        !state.profile.definitions!.session!.done && limit < 30;
        limit++
      ) {
        const view = explorerView(state, date, { followUp: true });
        expect(view.completedDays[0]).not.toHaveProperty("reviewVariant");
        if (view.currentActivity!.kind === "read")
          state = applyExplorerAction(
            state,
            { type: "read", questionId: view.currentActivity!.questionId },
            date,
            randomUUID(),
          ).state;
        else {
          const opened = answer(state, []);
          expect(opened.feedback.solution!.examples).toEqual(
            reviewVariantCard(
              definitionCard(view.currentActivity!.cardId),
              variant,
            ).examples.map((example) => ({
              label: example.text,
              correct: example.yes,
            })),
          );
          state = applyExplorerAction(
            opened.state,
            {
              type: "understood",
              questionId: view.currentActivity!.questionId,
            },
            date,
            randomUUID(),
            { followUps: true },
          ).state;
        }
      }
      expect(state.profile.definitions!.session!.done).toBe(true);
      expect(
        JSON.stringify({
          history: state.profile.definitions!.history,
          cards: state.profile.definitions!.cards,
          days: state.completedDays,
          stars: state.profile.stars,
        }),
      ).toBe(saved);
    }
  });
});
