import { intervalAnswerKey } from "./intervalAnswerNotation";

const LIMIT = {
  answer: 8000,
  question: 16000,
  field: 1024,
  parts: 16,
  digits: 64,
  depth: 8,
};
const DECIMAL = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const UNSIGNED = `(?:\\d+/[+-]?\\d+|${DECIMAL})`;
const NUMBER = `[+-]?${UNSIGNED}`;
type Variable = "x" | "y";
type Parts = { numbered: boolean; bodies: string[] };

function unsupported(): never {
  throw new Error("unsupported-domain-range-notation");
}

function numeric(text: string): [bigint, bigint] {
  if (
    !new RegExp(`^${NUMBER}$`).test(text) ||
    text.replace(/\D/g, "").length > LIMIT.digits
  )
    unsupported();
  let n: bigint, d: bigint;
  if (text.includes("/")) {
    const pieces = text.split("/");
    n = BigInt(pieces[0]);
    d = BigInt(pieces[1]);
  } else {
    const [integer, decimal = ""] = text.split(".");
    n = BigInt(`${integer || "0"}${decimal}`);
    d = BigInt(10) ** BigInt(decimal.length);
  }
  if (d === BigInt(0)) unsupported();
  return d < BigInt(0) ? [-n, -d] : [n, d];
}

function unwrap(input: string): string {
  let text = input.trim();
  for (const [left, right] of [
    ["$$", "$$"],
    ["$", "$"],
    ["\\(", "\\)"],
    ["\\[", "\\]"],
  ]) {
    if (text.startsWith(left)) {
      if (!text.endsWith(right) || text.length <= left.length + right.length)
        unsupported();
      text = text.slice(left.length, -right.length).trim();
      break;
    }
  }
  if (text.includes("$") || /\\[()[\]]/.test(text)) unsupported();
  return text;
}

/** Closed spelling vocabulary; unknown commands, units and prose survive to rejection. */
function notation(input: string): string {
  let text = unwrap(input);
  const sizing: string[] = [];
  text = text.replace(
    /\\(left|right)\s*(\\[{}]|[()[\]{}])/g,
    (_, side: string, delimiter: string) => {
      const char = delimiter.replace("\\", "");
      if (side === "left") {
        if (!"([{".includes(char) || sizing.length >= LIMIT.depth)
          unsupported();
        sizing.push(char);
      } else {
        const open = sizing.pop();
        if (!open || !")]}".includes(char) || (open === "{") !== (char === "}"))
          unsupported();
      }
      return char;
    },
  );
  if (sizing.length) unsupported();
  let depth = 0;
  for (const char of text) {
    if ("([{".includes(char) && ++depth > LIMIT.depth) unsupported();
    if (")]}".includes(char) && --depth < 0) unsupported();
  }
  if (depth !== 0) unsupported();
  text = text
    .replace(
      /\\(?:dfrac|tfrac|frac)\s*\{\s*([+-]?\d+)\s*\}\s*\{\s*([+-]?\d+)\s*\}/g,
      (
        fraction: string,
        numerator: string,
        denominator: string,
        offset: number,
        source: string,
      ) => {
        // A fraction is one literal: concatenation must not turn 1\\frac{2}{3}
        // into 12/3, or \\frac{1}{2}3 into 1/23.
        const before = source.slice(0, offset).at(-1) ?? "";
        const after = offset + fraction.length;
        if (/[\d./]/.test(before) || /[\d./]/.test(source[after] ?? ""))
          unsupported();
        return `${numerator}/${denominator}`;
      },
    )
    .replace(/\\mathbb\s*(?:\{\s*R\s*\}|R(?![a-zA-Z]))/g, "ℝ")
    .replace(/실수\s*전체의\s*집합/g, "ℝ")
    .replace(/\\(?:leq|le)(?![a-zA-Z])|≤/g, "<=")
    .replace(/\\(?:geq|ge)(?![a-zA-Z])|≥/g, ">=")
    .replace(/\\(?:neq|ne)(?![a-zA-Z])|≠/g, "!=")
    .replace(/\\mid(?![a-zA-Z])/g, "|")
    .replace(/\\infty(?![a-zA-Z])/g, "∞")
    .replace(/\\cup(?![a-zA-Z])/g, "∪")
    .replace(/\\lor(?![a-zA-Z])|또는/g, "∨")
    .replace(/\\log(?![a-zA-Z])/g, "log")
    .replace(/\\([{}])/g, "$1")
    .replace(/\\(?:[,;:! ]|quad\b|qquad\b)/g, " ")
    .replace(/−/g, "-");
  // Do not turn two numeric literals or undeclared names into one token.
  if (/[\d.]\s+[\d.]|[a-zA-Z]\s+[a-zA-Z]/.test(text)) unsupported();
  return text.replace(/\s+/g, "");
}

function splitParts(input: string): Parts {
  const markers = [
    ...input.matchAll(
      /[⑴-⒇①-⑳]|\(\s*([1-9]\d?)\s*\)(?=\s*(?:정의역|치역|\$|\\\(|y\s*=))/g,
    ),
  ];
  if (!markers.length) return { numbered: false, bodies: [input.trim()] };
  if (markers.length > LIMIT.parts || input.slice(0, markers[0].index).trim())
    unsupported();
  const bodies = markers.map((marker, index) => {
    const code = marker[0].charCodeAt(0);
    const ordinal = marker[1]
      ? Number(marker[1])
      : code >= 0x2474
        ? code - 0x2473
        : code - 0x245f;
    if (ordinal !== index + 1) unsupported();
    return input
      .slice(marker.index! + marker[0].length, markers[index + 1]?.index)
      .trim();
  });
  return { numbered: true, bodies };
}

/** A deliberately small real-function context, not a general function parser. */
function supportedFunction(input: string): boolean {
  if (input.length > LIMIT.field) return false;
  const text = notation(input);
  if (!text.startsWith("y=")) return false;
  const expression = text.slice(2);
  // Affine x expressions, including the arguments of the supported logarithms.
  const coefficient = `(?:\\d+/[+-]?\\d+\\*|${DECIMAL}\\*?)`;
  const affine = `(?:[+-]?(?:${coefficient})?x(?:[+-]${UNSIGNED})?|${NUMBER}[+-](?:${coefficient})?x)`;
  const validAffine = (value: string) => {
    if (!new RegExp(`^${affine}$`).test(value)) return false;
    for (const match of value.matchAll(new RegExp(NUMBER, "g")))
      numeric(match[0]);
    // A zero x coefficient is a constant function, outside this range grammar.
    const coefficient = new RegExp(`(${NUMBER})\\*?x`).exec(value);
    return !coefficient || numeric(coefficient[1])[0] !== BigInt(0);
  };
  if (validAffine(expression)) return true;
  const exponential = new RegExp(
    `^(?:\\((${NUMBER})\\)|(${DECIMAL}))\\^(?:x|\\{x\\})([+-]${UNSIGNED})?$`,
  ).exec(expression);
  const logarithm = new RegExp(
    `^log_(?:\\{(${NUMBER})\\}|(${DECIMAL}))\\(([^()]+)\\)([+-]${UNSIGNED})?$`,
  ).exec(expression);
  const match = exponential ?? logarithm;
  if (!match) return false;
  const [n, d] = numeric(match[1] ?? match[2]);
  if (n <= BigInt(0) || n === d) return false;
  if (logarithm && !validAffine(logarithm[3])) return false;
  const shift = exponential ? exponential[3] : logarithm![4];
  if (shift) numeric(shift);
  return true;
}

function questionParts(question: string): number {
  if (question.length > LIMIT.question) unsupported();
  const prompt =
    /^\s*다음\s*(?:실수\s*)?함수의\s*정의역과\s*치역을\s*구하시오\s*[.:]?\s*([\s\S]+)$/.exec(
      question,
    );
  if (!prompt) unsupported();
  const parts = splitParts(prompt[1]);
  if (!parts.bodies.every(supportedFunction)) unsupported();
  return parts.bodies.length;
}

function intervalConstraints(text: string, variable: Variable): string[] {
  const match = /^([([])([^,]+),([^,]+)([)\]])$/.exec(text);
  if (!match) unsupported();
  const [, open, lower, upper, close] = match;
  const constraints: string[] = [];
  if (lower === "-∞") {
    if (open !== "(") unsupported();
  } else {
    numeric(lower);
    constraints.push(`${variable}${open === "[" ? ">=" : ">"}${lower}`);
  }
  if (upper === "∞" || upper === "+∞") {
    if (close !== ")") unsupported();
  } else {
    numeric(upper);
    constraints.push(`${variable}${close === "]" ? "<=" : "<"}${upper}`);
  }
  if (lower !== "-∞" && upper !== "∞" && upper !== "+∞") {
    const [ln, ld] = numeric(lower);
    const [un, ud] = numeric(upper);
    if (ln * ud >= un * ld) unsupported(); // No reversed, empty or singleton interval.
  }
  return constraints;
}

function conditionConstraints(text: string, variable: Variable): string[] {
  const terms = text.split(",");
  if (terms.length > 16) unsupported();
  const relation = new RegExp(
    `^(?:${variable}(?:<=|>=|!=|<|>)(${NUMBER})|(${NUMBER})(?:<=|>=|!=|<|>)${variable})$`,
  );
  const chain = new RegExp(
    `^(${NUMBER})(?:<=|<)${variable}(?:<=|<)(${NUMBER})$|^(${NUMBER})(?:>=|>)${variable}(?:>=|>)(${NUMBER})$`,
  );
  for (const term of terms) {
    const match = relation.exec(term) ?? chain.exec(term);
    if (!match) unsupported();
    for (const value of match.slice(1)) if (value !== undefined) numeric(value);
  }
  return terms;
}

function checkedIntervalKey(expression: string, variable: Variable): string {
  const key = intervalAnswerKey(expression);
  if (!key) unsupported();
  const pieces = key.slice(`interval:${variable}:`.length).split("|");
  if (!pieces[0]) unsupported();
  for (const piece of pieces) {
    const [lower, upper] = piece.split(",");
    if (lower.split(":")[0] === upper.split(":")[0]) unsupported();
  }
  return key;
}

function rangeKey(input: string, variable: Variable): string {
  if (input.length > LIMIT.field) unsupported();
  const text = notation(input);
  const set = new RegExp(`^\\{${variable}[|:]([^{}]+)\\}$`).exec(text);
  const intervals = !set && (/^[([]/.test(text) || text.startsWith("ℝ"));
  const bodies = (set ? set[1] : text).split(intervals ? "∪" : "∨");
  if (bodies.length > 8) unsupported();
  const branches: string[] = [];
  for (const body of bodies) {
    const constraints =
      body === "ℝ" && !set
        ? []
        : intervals
          ? intervalConstraints(body, variable)
          : conditionConstraints(body, variable);
    // The existing helper requires a bound per branch. Split an all-real or
    // exclusion-only range at zero, preserving every exclusion in both halves.
    if (constraints.every((constraint) => constraint.includes("!="))) {
      branches.push(
        [`${variable}<0`, ...constraints].join(","),
        [`${variable}>=0`, ...constraints].join(","),
      );
    } else branches.push(constraints.join(","));
  }
  // Reject empty/singleton branches before union can conceal them.
  for (const branch of branches) checkedIntervalKey(branch, variable);
  return checkedIntervalKey(branches.join("또는"), variable);
}

function answerKey(input: string, count: number): string {
  if (input.length > LIMIT.answer) unsupported();
  const parts = splitParts(input);
  if (parts.bodies.length !== count || (count > 1 && !parts.numbered))
    unsupported();
  return parts.bodies
    .map((body) => {
      const fields =
        /^정의역\s*:\s*([\s\S]+?)(?:\s*,\s*|\s+)치역\s*:\s*([\s\S]+)$/.exec(
          body,
        );
      if (!fields) unsupported();
      return `${rangeKey(fields[1], "x")}→${rangeKey(fields[2], "y")}`;
    })
    .join(";");
}

/**
 * true: exact equality of all supported labelled real ranges, in part order.
 * false: both answers parse but at least one range differs. null: unsupported,
 * incomplete, ambiguous, malformed or over budget. This never solves a function
 * or certifies that either answer is correct for the source question.
 */
export function compareDomainRangeAnswerNotation(
  left: string,
  right: string,
  question: string,
): boolean | null {
  try {
    const count = questionParts(question);
    return answerKey(left, count) === answerKey(right, count);
  } catch {
    return null;
  }
}
