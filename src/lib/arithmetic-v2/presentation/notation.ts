import { tokenizeMath } from "@/lib/math/segments";
import { arithmeticGeometryNames } from "./text";

type GeometryKind =
  "segment" | "line" | "ray" | "arc" | "angle" | "triangle" | "label";
type Atom = { end: number; latex: string };

const operators: Record<string, string> = {
  "=": "=",
  "+": "+",
  "-": "-",
  "−": "-",
  "×": "\\times",
  "÷": "\\div",
  "⊥": "\\perp",
  "∥": "\\parallel",
  "≠": "\\ne",
  "≤": "\\le",
  "≥": "\\ge",
  "<": "<",
  ">": ">",
  ":": ":",
  "/": "/",
  "·": "\\cdot",
  "≈": "\\approx",
};
const unitPattern = /^(km|cm|mm|mL|kg|m|L|g|t)([²³]|\^[23])?(?![A-Za-z])/;

function physicalUnit(raw: string): string {
  const power = /[²³]|\^[23]/.exec(raw)?.[0];
  return `\\mathrm{${raw.replace(/[²³]|\^[23]/, "")}}${power ? `^{${power === "²" ? 2 : power === "³" ? 3 : power.slice(1)}}` : ""}`;
}

function geometryLabel(label: string, kind: GeometryKind): string {
  const upright = `\\mathrm{${label}}`;
  if (kind === "arc") return `\\widehat{${label}}`;
  if (kind === "angle") return `\\angle ${upright}`;
  if (kind === "triangle") return `\\triangle ${upright}`;
  const command = {
    segment: "overline",
    line: "overleftrightarrow",
    ray: "overrightarrow",
  };
  return kind === "label" ? upright : `\\${command[kind]}{${upright}}`;
}

/** The noun applies to this occurrence, not every occurrence of those letters.
 * In particular a chord and an arc can both be named TP in the same prompt. */
function labelKind(before: string, after: string, label: string): GeometryKind {
  const prefix = before.replace(/\$+\s*$/, "");
  if (/(?:반직선)\s*$/.test(prefix)) return "ray";
  if (/(?:직선|평행선|접선)\s*(?:[A-Z]{2}\s*[,·]\s*)*$/.test(prefix)) {
    return /^\s*(?:의\s*길이|[=+:÷×])/.test(after) ? "segment" : "line";
  }
  if (/(?:같은\s*)?호\s*$/.test(prefix)) return "arc";
  if (/(?:∠|(?<!각)각)\s*$/.test(prefix)) return "angle";
  if (label.length === 2) return "segment";
  if (label.length === 3) return "triangle";
  return "label";
}

/** Read a single mathematical atom. Operators are joined only when another
 * complete atom follows, so a Korean explanation never becomes one long formula. */
function atomAt(
  text: string,
  at: number,
  geometry: boolean,
  prefix = "",
): Atom | undefined {
  const tail = text.slice(at);
  const before = prefix + text.slice(0, at);
  if (/^[+−-]/.test(tail)) {
    const next = atomAt(text, at + 1, geometry, prefix);
    if (next)
      return {
        end: next.end,
        latex: `${tail[0] === "+" ? "+" : "-"}${next.latex}`,
      };
  }
  const quantity = /^(?:(\d+(?:\.\d+)?)?π(?:\/(\d+))?|(\d+)\/(\d+))/.exec(tail);
  if (quantity) {
    let end = at + quantity[0].length;
    const numerator = quantity[3] ?? `${quantity[1] ?? ""}\\pi`;
    const denominator = quantity[4] ?? quantity[2];
    let latex = denominator
      ? `\\frac{${numerator}}{${denominator}}`
      : numerator;
    const unit =
      /^\s*((?:km|cm|mm|mL|kg|m|L|g|t)(?:[²³]|\^[23])?)(?![A-Za-z])/.exec(
        text.slice(end),
      );
    if (unit) {
      latex += `\\,${physicalUnit(unit[1])}`;
      end += unit[0].length;
    }
    return { end, latex };
  }
  const number = /^\d+(?:\.\d+)?/.exec(tail);
  if (number) {
    let end = at + number[0].length;
    let latex = number[0];
    const suffix =
      /^\s*(°|%|(?:km|cm|mm|mL|kg|m|L|g|t)(?:[²³]|\^[23])?)(?![A-Za-z])/.exec(
        text.slice(end),
      );
    if (suffix) {
      latex +=
        suffix[1] === "°"
          ? "^{\\circ}"
          : suffix[1] === "%"
            ? "\\,\\%"
            : `\\,${physicalUnit(suffix[1])}`;
      end += suffix[0].length;
    }
    return { end, latex };
  }
  const angle = /^∠\s*([A-Z]{1,3})(?![A-Za-z])/.exec(tail);
  if (angle)
    return {
      end: at + angle[0].length,
      latex: geometryLabel(angle[1], "angle"),
    };
  const trig = /^(sin|cos|tan)\s*([A-Z]|\d+(?:\.\d+)?°?)(?![A-Za-z\d])/.exec(
    tail,
  );
  if (trig)
    return {
      end: at + trig[0].length,
      latex: `\\${trig[1]} ${trig[2].replace("°", "^{\\circ}")}`,
    };
  const unit = unitPattern.exec(tail);
  if (
    unit &&
    (unit[1].length > 1 ||
      unit[2] ||
      /단위|바꾸|환산/.test(text) ||
      /^\([^)]*$/.test(before.slice(-1)))
  ) {
    return { end: at + unit[0].length, latex: physicalUnit(unit[0]) };
  }
  const label = /^(?:[A-Z]'*)+(?![A-Za-z])/.exec(tail);
  if (label) {
    const after = text.slice(at + label[0].length);
    const kind = labelKind(before, after, label[0]);
    const scalar =
      label[0].length === 1 && /(?:밑넓이|넓이|부피)\s*$/.test(before);
    return {
      end: at + label[0].length,
      latex: geometry && !scalar ? geometryLabel(label[0], kind) : label[0],
    };
  }
  const variable = /^[a-z](?![A-Za-z])/.exec(tail);
  if (variable) return { end: at + 1, latex: variable[0] };
  const symbol = {
    ℓ: "\\ell",
    π: "\\pi",
    θ: "\\theta",
    "□": "\\square",
    "%": "\\%",
    "°": "{}^{\\circ}",
  }[tail[0]];
  if (symbol) return { end: at + 1, latex: symbol };
  return undefined;
}

function plainNotation(
  text: string,
  geometry: boolean,
  prefix: string,
): string {
  let result = "",
    at = 0;
  while (at < text.length) {
    // Unknown Latin words are prose; never split them into one-letter variables.
    if (
      /[A-Za-z]/.test(text[at]) &&
      at > 0 &&
      /[A-Za-z\\]/.test(text[at - 1])
    ) {
      result += text[at++];
      continue;
    }
    let first = atomAt(text, at, geometry, prefix);
    if (!first && operators[text[at]]) {
      const nextAt = at + 1 + /^\s*/.exec(text.slice(at + 1))![0].length;
      const next = atomAt(text, nextAt, geometry, prefix);
      if (next)
        first = {
          end: next.end,
          latex: `${operators[text[at]]} ${next.latex}`,
        };
    }
    if (!first) {
      result +=
        operators[text[at]] && !["-", ":", "/", "."].includes(text[at])
          ? `$${operators[text[at++]]}$`
          : text[at++];
      continue;
    }
    let end = first.end,
      latex = first.latex;
    while (end < text.length) {
      const power = /^(?:([²³])|\^(\d+))/.exec(text.slice(end));
      if (power) {
        latex += `^{${power[1] === "²" ? 2 : power[1] === "³" ? 3 : power[2]}}`;
        end += power[0].length;
        continue;
      }
      const space = /^\s*/.exec(text.slice(end))![0];
      const opAt = end + space.length;
      const op = operators[text[opAt]];
      if (!op) {
        // A coefficient and its variable are one expression (2x), not adjacent
        // dollar pairs which the shared tokenizer would read as display math.
        const next =
          !space && /[A-Za-zπθℓ]/.test(text[end])
            ? atomAt(text, end, geometry, prefix)
            : undefined;
        if (!next) break;
        latex += ` ${next.latex}`;
        end = next.end;
        continue;
      }
      // A legend's "a: A의 맞은편" defines a name, unlike AE:EB=1:2.
      if (
        op === ":" &&
        /^[a-z]$/.test(latex) &&
        /^\s+[A-Z]의/.test(text.slice(opAt + 1))
      )
        break;
      const atomStart = opAt + 1 + /^\s*/.exec(text.slice(opAt + 1))![0].length;
      const next = atomAt(text, atomStart, geometry, prefix);
      if (!next) break;
      latex += ` ${op} ${next.latex}`;
      end = next.end;
    }
    result += `$${latex}$`;
    at = end;
  }
  return result;
}

function groupEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i - 1] === "\\") continue;
    if (text[i] === "{") depth++;
    if (text[i] === "}" && --depth === 0) return i + 1;
  }
  return text.length;
}

/** Existing TeX is parsed by commands/groups. Decorated objects and text are
 * opaque, preventing double bars or interpreting letters inside command names. */
function authoredGeometry(latex: string, context: string): string {
  let result = "",
    at = 0;
  let labelPrefix: GeometryKind | undefined;
  while (at < latex.length) {
    const command = /^\\([A-Za-z]+|.)/.exec(latex.slice(at));
    if (command) {
      const name = command[1];
      let end = at + command[0].length;
      const gap = /^\s*/.exec(latex.slice(end))![0];
      if (
        /^(?:overline|bar|overrightarrow|overleftarrow|overleftrightarrow|vec|widehat|overset|htmlClass|text|textrm|operatorname)$/.test(
          name,
        )
      ) {
        end += gap.length;
        const count = /^(?:overset|htmlClass)$/.test(name) ? 2 : 1;
        for (let n = 0; n < count && latex[end] === "{"; n++) {
          end = groupEnd(latex, end);
          if (n + 1 < count) end += /^\s*/.exec(latex.slice(end))![0].length;
        }
        result += latex.slice(at, end);
        at = end;
        labelPrefix = undefined;
        continue;
      }
      if (name === "mathrm" && latex[end + gap.length] === "{") {
        const start = end + gap.length;
        end = groupEnd(latex, start);
        const label = latex.slice(start + 1, end - 1);
        result +=
          /^[A-Z]{2,}$/.test(label) && !labelPrefix
            ? geometryLabel(
                label,
                labelKind(
                  context + latex.slice(0, at),
                  latex.slice(end),
                  label,
                ),
              )
            : latex.slice(at, end);
        at = end;
        labelPrefix = undefined;
        continue;
      }
      result += command[0];
      at = end;
      labelPrefix =
        /^(?:angle|measuredangle|triangle|square|sin|cos|tan)$/.test(name)
          ? "label"
          : undefined;
      continue;
    }
    const label = /^(?:[A-Z]'*)+(?![A-Za-z])/.exec(latex.slice(at));
    if (label) {
      const kind =
        labelPrefix ??
        labelKind(
          context + latex.slice(0, at),
          latex.slice(at + label[0].length),
          label[0],
        );
      // Single variables in a mathematical expression (S, B, A) retain their
      // authored role. A standalone named angle/point has a prose context.
      result +=
        label[0].length > 1 || /(?:각|점|중심|심은)\s*$/.test(context)
          ? geometryLabel(label[0], kind)
          : label[0];
      at += label[0].length;
      labelPrefix = undefined;
      continue;
    }
    result += latex[at++];
    if (!/[\s{]/.test(latex[at - 1])) labelPrefix = undefined;
  }
  return result;
}

function notation(text: string, geometry: boolean): string {
  const source = arithmeticGeometryNames(text);
  let position = 0;
  return tokenizeMath(source)
    .map((part) => {
      const prefix = source.slice(0, position);
      position +=
        part.value.length +
        (part.type === "text" ? 0 : part.type === "inline" ? 2 : 4);
      if (part.type === "text")
        return plainNotation(part.value, geometry, prefix);
      const delimiter = part.type === "inline" ? "$" : "$$";
      return `${delimiter}${geometry ? authoredGeometry(part.value, prefix) : part.value}${delimiter}`;
    })
    .join("");
}

/** Geometry-only display projection. Never use this on general algebra, or
 * persist its output as a canonical candidate/saved prompt. */
export function arithmeticGeometryNotation(text: string): string {
  return notation(text, true);
}

/** Arithmetic prose uses explicit formula boundaries; authored TeX is preserved. */
export function arithmeticProseNotation(text: string): string {
  return notation(text, false);
}
