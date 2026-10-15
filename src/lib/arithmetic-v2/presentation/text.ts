import { tokenizeMath } from "@/lib/math/segments";

const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

/** Display spelling only: published prompts and saved candidate identities stay intact. */
export function arithmeticGeometryNames(text: string): string {
  return text.replace(/(?<!\d)([3-9]|[1-9]\d)(?=각(?:형|기둥|뿔))/g, (raw) => {
    const n = Number(raw);
    return n < 10
      ? digits[n]
      : `${n < 20 ? "" : digits[Math.floor(n / 10)]}십${digits[n % 10]}`;
  });
}

function unitLatex(unit: string): string {
  if (unit === "°") return "{}^{\\circ}";
  return `\\mathrm{${unit.replace(/[²³]/g, "")}}${unit.endsWith("²") ? "^{2}" : unit.endsWith("³") ? "^{3}" : ""}`;
}

/** Apply physical-unit typography only outside already-authored math. */
export function arithmeticGeometryText(text: string): string {
  return tokenizeMath(arithmeticGeometryNames(text))
    .map((part) => {
      if (part.type !== "text") {
        const delimiter = part.type === "inline" ? "$" : "$$";
        return `${delimiter}${part.value}${delimiter}`;
      }
      return part.value.replace(
        /(?<![A-Za-z\d])(?:(\d+(?:\.\d+)?)\s*)?(km|cm|mm|mL|m|L)([²³])?(?![A-Za-z])|(\d+(?:\.\d+)?)\s*°/g,
        (
          _match,
          number: string | undefined,
          unit: string | undefined,
          power: string | undefined,
          angle: string | undefined,
        ) =>
          angle !== undefined
            ? `$${angle}^{\\circ}$`
            : `$${number === undefined ? "" : `${number}\\,`}${unitLatex(`${unit}${power ?? ""}`)}$`,
      );
    })
    .join("");
}

export function arithmeticGeometryUnitText(unit: string): string {
  return unit === "°" ? "$^{\\circ}$" : arithmeticGeometryText(unit);
}

export function arithmeticGeometryAnswerBlank(unit: string): string {
  const blank = "\\underline{\\hspace{2em}}";
  return unit === "°"
    ? `$${blank}^{\\circ}$`
    : `$${blank}$${unit ? ` ${arithmeticGeometryUnitText(unit)}` : ""}`;
}
