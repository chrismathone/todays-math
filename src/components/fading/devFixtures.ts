import type { FadingState } from "@/contracts/fadingApi.contract";
import {
  createLocalFadingSource,
  type LocalFadingSource,
} from "@/lib/fading/local";
import { chipTray, type FadingTrap } from "@/lib/fading/chips";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FadingConcept } from "@/lib/fading/concepts";
import type { FadingFigure } from "@/lib/fading/figures";
import {
  FadingSourceError,
  newFadingId,
  type FadingSource,
} from "@/lib/fading/source";

export const FADING_DEV_SCENES = [
  "first",
  "daily",
  "done",
  "backlog",
  "return",
  "step1",
  "step2",
  "step3",
  "step4",
  "rating",
  "stats",
  "catalog",
  "offline",
  "loading",
  "save-error",
  "conflict",
  "risk-colors",
] as const;
export type FadingDevScene = (typeof FADING_DEV_SCENES)[number];
export type FadingDevOptions = {
  scene: FadingDevScene;
  conceptId: string;
  preview: boolean;
  cards?: boolean;
};

async function open(source: LocalFadingSource, concept: FadingConcept) {
  await source.act({ action: "pick", conceptId: concept.id });
  return source.act({ action: "open", conceptId: concept.id });
}
async function complete(
  source: LocalFadingSource,
  concept: FadingConcept,
  initial: FadingState,
) {
  let state = initial;
  const ref = { conceptId: concept.id, sessionId: state.session!.id };
  if (state.session!.step === 1)
    state = await source.act({ action: "read", ...ref });
  for (const step of [2, 3, 4] as const) {
    if (state.session!.step > step) continue;
    const tray = chipTray(concept, step, {
      seed: state.session!.seed,
      traps: state.opened!.traps,
    });
    const taken = new Set<string>();
    const placements = erasedTargets(concept, step).map((target) => {
      if (state.session!.mode === "cards" && step === 4)
        return { targetId: target.id, text: target.text };
      const chip = tray.find(
        (item) =>
          !taken.has(item.id) &&
          item.text === target.text.trim().replace(/\s+/g, " "),
      )!;
      taken.add(chip.id);
      return { targetId: target.id, chipId: chip.id };
    });
    state = await source.act({ action: "step", ...ref, step, placements });
  }
  return state;
}
export async function prepareFadingDev(
  concepts: readonly FadingConcept[],
  options: FadingDevOptions,
  traps: Readonly<Record<string, readonly FadingTrap[]>> = {},
  figures: Readonly<Record<string, FadingFigure>> = {},
) {
  const selected =
    concepts.find((c) => c.id === options.conceptId) ?? concepts[0]!;
  const source = createLocalFadingSource({
    concepts,
    cards: options.cards === true,
    traps,
    figures,
    today: "2026-10-06",
    defaultGrade: selected.section.split("::")[0],
    fresh: () => ({ sessionId: newFadingId(), seed: 42 }),
  });
  if (
    options.scene.startsWith("step") ||
    ["rating", "save-error", "conflict"].includes(options.scene)
  ) {
    let state = await open(source, selected);
    const step = ["rating", "save-error", "conflict"].includes(options.scene)
      ? 4
      : Number(options.scene.slice(-1));
    const ref = { conceptId: selected.id, sessionId: state.session!.id };
    if (step > 1) state = await source.act({ action: "read", ...ref });
    for (const previous of [2, 3] as const)
      if (previous < step)
        state = await source.act({
          action: "step",
          ...ref,
          step: previous,
          placements: [],
          gaveUp: true,
        });
    if (options.scene === "rating") await complete(source, selected, state);
    if (options.cards && options.scene === "step4") {
      // A due review starts cold at four, rather than showing stage-one backs first.
      state = await complete(source, selected, state);
      const rated = await source.act({
        action: "rate",
        ...ref,
        rating: "good",
        requestId: newFadingId(),
      });
      source.setToday(rated.receipt!.dueOn);
      await source.act({ action: "open", conceptId: selected.id });
    }
  } else if (options.scene === "risk-colors") {
    for (const [i, date] of [
      "2025-01-01",
      "2026-03-01",
      "2026-10-01",
    ].entries()) {
      source.setToday(date);
      const concept = concepts[i]!;
      const current = await complete(
        source,
        concept,
        await open(source, concept),
      );
      await source.act({
        action: "rate",
        conceptId: concept.id,
        sessionId: current.session!.id,
        rating: "good",
        requestId: newFadingId(),
      });
    }
    source.setToday("2026-10-06");
  } else if (
    ["daily", "done", "backlog", "return", "stats"].includes(options.scene)
  ) {
    source.setToday("2026-09-01");
    const count = options.scene === "backlog" ? 27 : 3;
    for (const concept of concepts.slice(0, count)) {
      const state = await complete(
        source,
        concept,
        await open(source, concept),
      );
      await source.act({
        action: "rate",
        conceptId: concept.id,
        sessionId: state.session!.id,
        rating: "good",
        requestId: newFadingId(),
      });
    }
    source.setToday(
      options.scene === "done"
        ? "2026-09-01"
        : options.scene === "daily"
          ? source.snapshot().receipts[0]!.dueOn
          : "2026-10-06",
    );
    if (options.scene === "daily")
      await source.act({ action: "pick", conceptId: concepts[3]!.id });
  }
  const state = await source.state();
  let failedOnce = false;
  const measured: FadingSource = ["save-error", "conflict"].includes(
    options.scene,
  )
    ? {
        ...source,
        async act(action) {
          if (!failedOnce && action.action === "step") {
            failedOnce = true;
            if (options.scene === "conflict") {
              await source.act(action);
              throw new FadingSourceError(
                "CONFLICT",
                "다른 곳에서 단계를 마쳤습니다.",
                409,
              );
            }
            throw new FadingSourceError(
              "OFFLINE",
              "연결되지 않았습니다. 다시 시도하세요.",
              0,
            );
          }
          return source.act(action);
        },
      }
    : source;
  return { source: measured, state };
}
