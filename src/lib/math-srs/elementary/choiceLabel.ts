import { parseCourseAnswerQuantity } from "./answers";

/** Read the displayed numeric notation, without rounding or changing the submitted value. */
export function courseChoiceLabel(value: string): string {
  const quantity = parseCourseAnswerQuantity(value);
  if (!quantity)
    return value
      .replaceAll("$", "")
      .trim()
      .replace(/^([+-])\s+/, "$1");
  const notation = quantity.notation
    .replace(/\\(?:dfrac|tfrac|frac)\{([^{}]+)\}\{([^{}]+)\}/g, " $1/$2")
    .trim()
    .replace(/^([+-])\s+/, "$1");
  const mixed = /^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(notation);
  const fraction = /^([+-]?[\d.]+)\s*\/\s*([+-]?[\d.]+)$/.exec(notation);
  const number = mixed
    ? `${mixed[1]}과 ${mixed[3]}분의 ${mixed[2]}`
    : fraction
      ? `${fraction[2]}분의 ${fraction[1]}`
      : notation;
  return quantity.unit ? `${number} ${quantity.unit.name}` : number;
}
