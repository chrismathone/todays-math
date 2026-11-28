import "server-only";
import { getConceptBlankBank } from "@/lib/concept-blank/bank/runtime";
import { fadingCatalog } from "./catalog";
import { fadingTrapMap } from "./traps";
import { fadingFigureMap } from "./figures";

let preview: ReturnType<typeof buildWorkspaceFadingPreview> | undefined;

function buildWorkspaceFadingPreview() {
  const concepts = fadingCatalog();
  return {
    concepts,
    cards: true,
    traps: fadingTrapMap(concepts),
    figures: fadingFigureMap(concepts, getConceptBlankBank().figures),
  };
}

export function createWorkspaceFadingPreview(today: string) {
  return { ...(preview ??= buildWorkspaceFadingPreview()), today };
}
