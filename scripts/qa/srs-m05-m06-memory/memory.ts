import type { FadingState } from "@/contracts/fadingApi.contract";
import type { FadingConcept } from "@/lib/fading/concepts";
import { erasedTargets } from "@/lib/fading/erasure";
import { chipTray } from "@/lib/fading/chips";
import { createLocalFadingSource } from "@/lib/fading/local";
import {
  placeAnswer,
  resumeFadingSession,
  type FadingAnswer,
} from "@/lib/fading/session";
import { newFadingId } from "@/lib/fading/source";

// Synthetic display fixture only. The first sentence's math target is not erased
// at steps 2/3; the real erasure/session functions choose and complete the blanks.
export function memoryConcept(count: 3 | 4 = 4): FadingConcept {
  const rows = [
    ["기준 수", "기준 수가 ", "$3$", "인 경우를 살펴봅니다."],
    ["이상", "이상인 수의 범위에는 기준 수가 ", "포함", "됩니다."],
    ["초과", "초과인 수는 기준 수보다 ", "큰", " 수입니다."],
    ["미만", "미만인 수는 기준 수보다 ", "작은", " 수입니다."],
  ];
  return {
    id: `memory-status-${count}`,
    section: "초5::수의 범위와 어림하기::이상과 이하 알아보기",
    level: "하",
    ordinal: 1,
    siblings: 1,
    propositions: rows
      .slice(0, count)
      .map(([term, before, answer, after], i) => ({
        id: `memory-${i}`,
        term: term!,
        kind: "정의",
        pieces: [
          { kind: "text", text: before! },
          {
            kind: "target",
            target: {
              id: `memory-${i}#1`,
              text: answer!,
              tier: i === 0 ? "math" : "text",
            },
          },
          { kind: "text", text: after! },
        ],
      })),
  };
}

export async function completeMemoryStep(
  source: ReturnType<typeof createLocalFadingSource>,
  state: FadingState,
) {
  const concept = state.opened!.concept;
  let session = resumeFadingSession(concept, state.session!);
  const step = session.step as 2 | 3 | 4;
  const tray = chipTray(concept, step, {
    seed: session.seed,
    traps: state.opened!.traps,
  });
  const taken = new Set<string>();
  const placements: FadingAnswer[] = [];
  for (const target of erasedTargets(concept, step)) {
    const chip = tray.find(
      (item) => !taken.has(item.id) && item.text === target.text,
    )!;
    const answer =
      session.mode === "cards" && step === 4
        ? { targetId: target.id, text: target.text }
        : { targetId: target.id, chipId: chip.id };
    taken.add(chip.id);
    session = placeAnswer(
      session,
      concept,
      answer,
      state.opened!.traps,
    ).session;
    placements.push(answer);
  }
  if (session.results.at(-1)?.step !== step)
    throw new Error("Fixture did not finish the step");
  return source.act({
    action: "step",
    conceptId: concept.id,
    sessionId: state.session!.id,
    step,
    placements,
  });
}

export async function prepareMemory({
  cards = true,
  count = 4,
  step = 2,
  practice = false,
  rating = false,
}: {
  cards?: boolean;
  count?: 3 | 4;
  step?: 2 | 3 | 4;
  practice?: boolean;
  rating?: boolean;
} = {}) {
  const concept = memoryConcept(count);
  const source = createLocalFadingSource({
    concepts: [concept],
    cards,
    today: "2026-10-21",
    traps: { [concept.id]: [{ text: "오답" }] },
    fresh: () => ({ sessionId: newFadingId(), seed: 42 }),
    now: () => Date.UTC(2026, 9, 21, 3),
  });
  await source.act({ action: "pick", conceptId: concept.id });
  let state = await source.act({ action: "open", conceptId: concept.id });
  state = await source.act({
    action: "read",
    conceptId: concept.id,
    sessionId: state.session!.id,
    ...(cards ? { seen: "1".repeat(count) } : {}),
  });
  while (state.session!.step < step)
    state = await completeMemoryStep(source, state);
  if (rating || practice) state = await completeMemoryStep(source, state);
  if (practice) {
    state = await source.act({
      action: "rate",
      conceptId: concept.id,
      sessionId: state.session!.id,
      rating: "good",
      requestId: newFadingId(),
    });
  }
  return {
    concept,
    source,
    state,
    practice: practice ? await source.concept(concept.id) : undefined,
  };
}
