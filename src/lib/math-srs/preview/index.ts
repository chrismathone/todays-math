import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { PREVIEW_CARDS, type PreviewCard } from "./cards";
import { numberLineSvg } from "./numberLine";

export type { PreviewCard } from "./cards";

/** The «배우기» card shown before a learn session of this section, if one is written. */
export function previewCardFor(sectionId: string): PreviewCard | null {
  return PREVIEW_CARDS.find((card) => card.sectionId === sectionId) ?? null;
}

/** The meaning sentence — the explorer card's own, so both screens say the same thing. */
export function previewMeaning(card: PreviewCard): string {
  return "cardId" in card.meaning
    ? definitionCard(card.meaning.cardId).definition
    : card.meaning.text;
}

export function previewFigureSvg(card: PreviewCard): string {
  return numberLineSvg(card.figure);
}

/**
 * Practice is a check, not a graded attempt (nothing is stored). Spaces, digit-group commas
 * and the unit the box already shows («개») are ignored; the number must match exactly.
 */
export function checkPreviewAnswer(card: PreviewCard, input: string): boolean {
  const unit = card.practice.unit ?? "";
  let value = input.trim().replace(/\s+/g, "");
  if (unit && value.endsWith(unit)) value = value.slice(0, -unit.length);
  value = value.replace(/(\d),(?=\d{3}\b)/g, "$1");
  return /^\d+$/.test(value) && Number(value) === Number(card.practice.answer);
}
