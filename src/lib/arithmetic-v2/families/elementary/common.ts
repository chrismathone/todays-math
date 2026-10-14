import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";

export type Domain = {
  size: number;
  at(index: number): number[];
  has(parameters: number[]): boolean;
};

export function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function inRange(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

export function grid(ranges: readonly (readonly [number, number])[]): Domain {
  const widths = ranges.map(([min, max]) => max - min + 1);
  return {
    size: widths.reduce((a, b) => a * b, 1),
    at(index) {
      const values = Array<number>(ranges.length);
      for (let j = ranges.length - 1; j >= 0; j--) {
        values[j] = ranges[j][0] + (index % widths[j]);
        index = Math.floor(index / widths[j]);
      }
      return values;
    },
    has: (p) =>
      p.length === ranges.length &&
      ranges.every(([min, max], j) => inRange(p[j], min, max)),
  };
}

/** Row i contains i+1 entries; integer binary search avoids sqrt rounding. */
export function triangleAt(index: number, width: number): [number, number] {
  let lo = 0;
  let hi = width - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (((mid + 1) * (mid + 2)) / 2 <= index) lo = mid + 1;
    else hi = mid;
  }
  return [lo, index - (lo * (lo + 1)) / 2];
}

export function triangle(min: number, max: number): Domain {
  const width = max - min + 1;
  return {
    size: (width * (width + 1)) / 2,
    at: (i) => triangleAt(i, width).map((n) => n + min),
    has: (p) =>
      p.length === 2 && p.every((n) => inRange(n, min, max)) && p[0] >= p[1],
  };
}

/** O(number of rows) counts, never a materialized table of all tasks. */
export function rows<T>(items: readonly T[], count: (item: T) => number) {
  let size = 0;
  const entries = items
    .map((item) => {
      const start = size;
      size += count(item);
      return { item, start, end: size };
    })
    .filter((row) => row.start < row.end);
  return {
    size,
    locate(index: number): [T, number] {
      let lo = 0;
      let hi = entries.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (entries[mid].end <= index) lo = mid + 1;
        else hi = mid;
      }
      const row = entries[lo];
      return [row.item, index - row.start];
    },
  };
}

export const integerAnswer = (n: number): ArithmeticV2Answer => ({
  kind: "integer",
  exact: [String(n)],
  text: String(n),
  latex: String(n),
});

export function fractionDisplay(n: number, d: number) {
  const whole = Math.floor(n / d);
  const part = n % d;
  if (!part) return { text: String(whole), latex: String(whole) };
  return {
    text: `${whole ? `${whole} ` : ""}${part}/${d}`,
    latex: `${whole || ""}\\frac{${part}}{${d}}`,
  };
}

export function rationalAnswer(n: number, d: number): ArithmeticV2Answer {
  const factor = gcd(n, d);
  n /= factor;
  d /= factor;
  return {
    kind: "rational",
    exact: [String(n), String(d)],
    ...fractionDisplay(n, d),
  };
}

export function decimalText(coefficient: number, scale: number): string {
  if (scale === 0) return String(coefficient);
  const digits = String(coefficient).padStart(scale + 1, "0");
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function decimalAnswer(
  coefficient: number,
  scale: number,
): ArithmeticV2Answer {
  while (scale > 0 && coefficient % 10 === 0) {
    coefficient /= 10;
    scale--;
  }
  const text = decimalText(coefficient, scale);
  return {
    kind: "decimal",
    exact: [String(coefficient), String(scale)],
    text,
    latex: text,
  };
}

export function remainderAnswer(q: number, r: number): ArithmeticV2Answer {
  return {
    kind: "remainder",
    exact: [String(q), String(r)],
    text: `몫 ${q}, 나머지 ${r}`,
    latex: `\\text{몫 }${q},\\;\\text{나머지 }${r}`,
  };
}

/** Only bounded, canonical nonnegative integer strings enter exact arithmetic. */
export function exactIntegers(
  answer: ArithmeticV2Answer,
  length: number,
): number[] | null {
  if (
    !Array.isArray(answer.exact) ||
    answer.exact.length !== length ||
    !answer.exact.every(
      (v) => typeof v === "string" && /^(0|[1-9]\d{0,11})$/.test(v),
    )
  )
    return null;
  return answer.exact.map(Number);
}

export function sameAnswer(
  a: ArithmeticV2Answer,
  b: ArithmeticV2Answer,
): boolean {
  return (
    a.kind === b.kind &&
    a.text === b.text &&
    a.latex === b.latex &&
    a.exact.length === b.exact.length &&
    a.exact.every((v, i) => v === b.exact[i])
  );
}

function samePrompt(
  actual: ArithmeticV2Prompt,
  expected: ArithmeticV2Prompt,
): boolean {
  if (typeof actual !== "object" || actual === null) return false;
  const a = actual as unknown as Record<string, unknown>;
  const b = expected as unknown as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(b).every((k) => a[k] === b[k])
  );
}

type DefinitionSpec = Omit<
  ArithmeticV2Definition,
  "domainSize" | "problemAt" | "verify"
> & {
  domain: Domain;
  prompt(parameters: number[]): ArithmeticV2Prompt;
  calculate(parameters: number[]): ArithmeticV2Answer;
  check(parameters: number[], answer: ArithmeticV2Answer): boolean;
};

export function define(spec: DefinitionSpec): ArithmeticV2Definition {
  const { domain, prompt, calculate, check, ...metadata } = spec;
  return {
    ...metadata,
    domainSize: domain.size,
    problemAt(index): ArithmeticV2Candidate {
      if (!inRange(index, 0, domain.size - 1))
        throw new RangeError(`${spec.id}: invalid domain index`);
      const parameters = domain.at(index);
      return {
        parameters,
        prompt: prompt(parameters),
        answer: calculate(parameters),
      };
    },
    verify(candidate) {
      // This path never calls problemAt, domain.at, or calculate. Check membership,
      // the exact displayed expression, and an independent arithmetic relation.
      if (
        !candidate ||
        !Array.isArray(candidate.parameters) ||
        !candidate.parameters.every(Number.isSafeInteger) ||
        !domain.has(candidate.parameters) ||
        !candidate.answer ||
        typeof candidate.answer !== "object" ||
        typeof candidate.answer.text !== "string" ||
        typeof candidate.answer.latex !== "string" ||
        !Array.isArray(candidate.answer.exact)
      )
        return false;
      return (
        samePrompt(candidate.prompt, prompt(candidate.parameters)) &&
        check(candidate.parameters, candidate.answer)
      );
    },
  };
}

/** Check a claimed reduced rational by cross multiplication, independently of generation. */
export function checkRational(
  answer: ArithmeticV2Answer,
  numerator: bigint,
  denominator: bigint,
): boolean {
  const pair = exactIntegers(answer, 2);
  if (answer.kind !== "rational" || !pair) return false;
  const [n, d] = pair;
  if (
    d <= 0 ||
    gcd(n, d) !== 1 ||
    BigInt(n) * denominator !== numerator * BigInt(d)
  )
    return false;
  const display = fractionDisplay(n, d);
  return answer.text === display.text && answer.latex === display.latex;
}

export function checkDecimal(
  answer: ArithmeticV2Answer,
  numerator: bigint,
  denominator: bigint,
): boolean {
  const pair = exactIntegers(answer, 2);
  if (answer.kind !== "decimal" || !pair) return false;
  const [n, scale] = pair;
  if (!inRange(scale, 0, 4) || (scale > 0 && n % 10 === 0)) return false;
  if (BigInt(n) * denominator !== numerator * BigInt(10 ** scale)) return false;
  const display = decimalText(n, scale);
  return answer.text === display && answer.latex === display;
}
