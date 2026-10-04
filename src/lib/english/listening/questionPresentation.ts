import type { ListeningQuestionImage } from "@/contracts/englishListeningSource.contract";

export const listeningChoiceMarks = ["①", "②", "③", "④", "⑤"] as const;

/** Legacy crops contain the stem and choices. Visual crops contain only figures. */
export function hasFullListeningQuestionImage(image?: ListeningQuestionImage) {
  return Boolean(image && image.role !== "visual");
}

export function listeningChoiceBody(text: string, index: number) {
  const mark = listeningChoiceMarks[index];
  const value = text.trim();
  return mark && value.startsWith(mark)
    ? value.slice(mark.length).trim()
    : value;
}

/** A picture-choice figure already carries its circled numbers. */
export function hasListeningChoiceText(choices: readonly string[]) {
  return choices.some((text, index) => listeningChoiceBody(text, index));
}
