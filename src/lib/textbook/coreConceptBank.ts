import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import { bank as e3 } from "@/lib/concept-blank/bank/e3";
import { bank as e4 } from "@/lib/concept-blank/bank/e4";
import { bank as e5 } from "@/lib/concept-blank/bank/e5";
import { bank as e6 } from "@/lib/concept-blank/bank/e6";
import { bank as m1 } from "@/lib/concept-blank/bank/m1";
import { bank as m2 } from "@/lib/concept-blank/bank/m2";
import { bank as m3 } from "@/lib/concept-blank/bank/m3";
import { conceptScriptFor } from "./conceptScripts";

export const QUICK_CREATE_CORE_MAPPING_VERSION =
  "quick-create.unit-triple.v2.core";
const parts = [e3, e4, e5, e6, m1, m2, m3];
/** The automatic book and its prepared script use exactly the same original card IDs. */
export const TEXTBOOK_CORE_BANK: ConceptBlankBank = {
  concepts: parts.flatMap((part) => part.concepts),
  ox: parts.flatMap((part) => part.ox),
  apply: parts.flatMap((part) => part.apply),
  figures: parts.flatMap((part) => part.figures),
};
const bySection = new Map<string, ConceptBlankBank["concepts"]>();
for (const entry of TEXTBOOK_CORE_BANK.concepts) {
  const entries = bySection.get(entry.section) ?? [];
  entries.push(entry);
  bySection.set(entry.section, entries);
}
export function coreConceptsForSection(sectionKey: string) {
  const entries = bySection.get(sectionKey) ?? [];
  const script = conceptScriptFor(sectionKey);
  if (
    script &&
    (script.conceptIds.length !== entries.length ||
      entries.some((entry, index) => entry.id !== script.conceptIds[index]))
  ) {
    throw new Error(`개념 카드와 준비된 대본의 범위가 다릅니다: ${sectionKey}`);
  }
  return entries;
}
