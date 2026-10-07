import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { buildFadingConcepts } from "@/lib/fading/concepts";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { fadingTrapMap } from "@/lib/fading/traps";
import { fadingFigureMap } from "@/lib/fading/figures";
import type { TeacherFadingPreviewData } from "./TeacherFadingStatus";

/** Imported only by the preview click. Uses the same library rules as the server catalog. */
export function createWorkspaceFadingPreview(
  today: string,
): TeacherFadingPreviewData {
  const concepts = buildFadingConcepts(
    CONCEPT_BLANK_BANK.concepts,
    FADING_GROUPS,
  );
  return {
    concepts,
    today,
    // Preview the new card flow in memory; this does not change the live rollout gate.
    cards: true,
    traps: fadingTrapMap(concepts),
    figures: fadingFigureMap(concepts, CONCEPT_BLANK_BANK.figures),
  };
}
