import "server-only";
import { getConceptBlankCoreGradeBank } from "@/lib/concept-blank/bank/runtime";
import { conceptScriptFor } from "./conceptScripts";

export const QUICK_CREATE_CORE_MAPPING_VERSION =
  "quick-create.unit-triple.v2.core";
export function getTextbookCoreGradeBank(grade: string) {
  return getConceptBlankCoreGradeBank(grade);
}

export function coreConceptsForSection(sectionKey: string) {
  const grade = sectionKey.split("::", 1)[0];
  const entries = getTextbookCoreGradeBank(grade).concepts.filter(
    (entry) => entry.section === sectionKey,
  );
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
