import {
  conceptBlankBankSchema,
  type ConceptBlankBank,
} from "@/contracts/conceptBlank.contract";

/** The worksheet editor loads the selected grade after workspace authorization. */
export async function loadGradeBank(grade: string): Promise<ConceptBlankBank> {
  const response = await fetch(
    `/api/concept-blank/bank?grade=${encodeURIComponent(grade)}`,
    { cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(`Concept blank bank request failed: ${response.status}`);
  return conceptBlankBankSchema.parse(await response.json());
}
