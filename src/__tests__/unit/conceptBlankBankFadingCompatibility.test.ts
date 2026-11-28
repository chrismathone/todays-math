import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import {
  applyFadingAction,
  FADING_CONTENT_CHANGED,
} from "@/lib/fading/actions";
import { fadingCatalog } from "@/lib/fading/catalog";
import { chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { fadingContentKey, fadingSessionToken } from "@/lib/fading/contentKey";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { resumeFadingSession } from "@/lib/fading/session";
import { emptyFading, FadingConflict } from "@/lib/fading/state";
import { fadingTrapsFor } from "@/lib/fading/traps";

const today = "2026-11-28";
const fresh = { sessionId: "00000000-0000-4000-8000-000000000123", seed: 1367 };

function projection(concepts: readonly FadingConcept[]) {
  const sha = createHash("sha256");
  for (const concept of concepts) {
    const traps = fadingTrapsFor(concept);
    const digest = fadingConceptDigest(concept);
    const key = fadingContentKey(concept, traps);
    const token = fadingSessionToken(fresh.sessionId, key);
    const trays = ([2, 3, 4] as const).map((step) =>
      chipTray(concept, step, { seed: fresh.seed, traps }),
    );
    const opened = resumeFadingSession(concept, {
      startStep: 2,
      step: 3,
      phase: "steps",
      seed: fresh.seed,
      missedAtFour: [],
    });
    sha.update(JSON.stringify([digest, key, token, trays, opened]));
  }
  return sha.digest("hex");
}

describe("fading bank compatibility", () => {
  const authored = buildFadingConcepts(
    CONCEPT_BLANK_BANK.concepts,
    FADING_GROUPS,
  );
  it("keeps digest, token, chip order and restored session identical for all concepts", () => {
    const baseline = projection(authored);
    expect(projection(fadingCatalog())).toBe(baseline);
  });

  it("rejects a pre-change screen token when one definition changes", () => {
    const original = authored.find(
      (concept) => fadingTrapsFor(concept).length > 0,
    )!;
    const picked = applyFadingAction(
      emptyFading(),
      { action: "pick", conceptId: original.id },
      original,
      today,
      fresh,
    );
    const stored = applyFadingAction(
      picked,
      { action: "open", conceptId: original.id },
      original,
      today,
      fresh,
    );
    const sessionId = fadingSessionToken(
      stored.session!.id,
      fadingContentKey(original, fadingTrapsFor(original)),
    );
    const action = {
      action: "read",
      conceptId: original.id,
      sessionId,
    } as const;
    expect(
      applyFadingAction(
        stored,
        action,
        original,
        today,
        fresh,
        fadingTrapsFor(original),
      ).concepts[original.id]?.step,
    ).toBe(2);

    const sourceId = original.propositions[0].id;
    const changed = buildFadingConcepts(
      CONCEPT_BLANK_BANK.concepts.map((entry) =>
        entry.id === sourceId
          ? { ...entry, definition: entry.definition + " 다시 확인합니다." }
          : entry,
      ),
      FADING_GROUPS,
    ).find((concept) => concept.id === original.id)!;
    expect(() =>
      applyFadingAction(
        stored,
        action,
        changed,
        today,
        fresh,
        fadingTrapsFor(changed),
      ),
    ).toThrow(new FadingConflict(FADING_CONTENT_CHANGED));
  });
});
