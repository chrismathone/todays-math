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

/** Remove drawing commentary from the display, including already-saved prompts. */
export function arithmeticGeometryWording(text: string): string {
  const named = arithmeticGeometryNames(text);
  if (!named.includes("겨냥도")) return named;
  return named
    .replace(/\s*\(겨냥도\)/g, "")
    .replace(/이며\s*그림은 겨냥도입니다\./g, "입니다.")
    .replace(/\s*그림은 겨냥도입니다\./g, "")
    .replace(/겨냥도/g, "")
    .trim();
}

function unitLatex(unit: string): string {
  if (unit === "°") return "{}^{\\circ}";
  return `\\mathrm{${unit.replace(/[²³]/g, "")}}${unit.endsWith("²") ? "^{2}" : unit.endsWith("³") ? "^{3}" : ""}`;
}

/** Unit suffix inside an already-open formula. Never insert raw TeX control characters. */
export function arithmeticAnswerUnitLatex(unit: string): string {
  if (!unit) return "";
  if (unit === "°") return "^{\\circ}";
  if (unit === "%") return "\\,\\%";
  if (/^[A-Za-z]+[²³]?$/.test(unit)) return `\\,${unitLatex(unit)}`;
  return `\\,\\text{${unit.replace(/[{}\\%_$#&]/g, (char) => `\\${char}`)}}`;
}

/** Apply physical-unit typography only outside already-authored math. */
export function arithmeticGeometryText(text: string): string {
  return tokenizeMath(arithmeticGeometryWording(text))
    .map((part) => {
      if (part.type !== "text") {
        const delimiter = part.type === "inline" ? "$" : "$$";
        return `${delimiter}${part.value}${delimiter}`;
      }
      return part.value.replace(
        /(?<![A-Za-z\d])(?:(\d+(?:\.\d+)?)\s*)?(km|cm|mm|mL|kg|m|L|g|t)([²³])?(?![A-Za-z])|(\d+(?:\.\d+)?)\s*°/g,
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

/** Short catalog titles may contain literal variable powers from immutable families. */
export function arithmeticTypeTitle(text: string): string {
  return tokenizeMath(arithmeticGeometryText(text))
    .map((part) => {
      if (part.type !== "text") {
        const delimiter = part.type === "inline" ? "$" : "$$";
        return `${delimiter}${part.value}${delimiter}`;
      }
      return part.value
        .replace(
          /(?<!\d)(\d+)\/(\d+)(?!\d)/g,
          (_match, n: string, d: string) => `$\\frac{${n}}{${d}}$`,
        )
        .replace(
          /[+×÷−]/g,
          (operator) =>
            `$${operator === "×" ? "\\times" : operator === "÷" ? "\\div" : operator === "−" ? "-" : "+"}$`,
        )
        .replace(
          /(?<![A-Za-z\\])([a-z])([²³]|\^\d+)?(?![A-Za-z\d])/g,
          (_match, variable: string, power: string | undefined) =>
            `$${variable}${power ? `^{${power === "²" ? "2" : power === "³" ? "3" : power.slice(1)}}` : ""}$`,
        )
        .replace(/(?<=\s)-(?=\s)/g, "$-$");
    })
    .join("");
}

export function arithmeticGeometryUnitText(unit: string): string {
  return unit === "°"
    ? "$^{\\circ}$"
    : unit === "%"
      ? "$\\%$"
      : arithmeticGeometryText(unit);
}

export function arithmeticGeometryAnswerBlank(unit: string): string {
  const blank = "\\underline{\\hspace{2em}}";
  return `$${blank}${arithmeticAnswerUnitLatex(unit)}$`;
}
