/** Exact, bounded notation for one-variable ranges with rational endpoints. */
type Rational = { numerator: bigint; denominator: bigint };
type Bound = { value: Rational; closed: boolean };
type Interval = { lower: Bound | null; upper: Bound | null };

function rational(input: string): Rational | null {
  if (input.length > 100) return null;
  const fraction = /^([+-]?\d+)\/([+-]?\d+)$/.exec(input);
  let numerator: bigint, denominator: bigint;
  if (fraction) {
    numerator = BigInt(fraction[1]);
    denominator = BigInt(fraction[2]);
  } else if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(input)) {
    const [integer, decimal = ""] = input.split(".");
    numerator = BigInt(`${integer || "0"}${decimal}`);
    denominator = BigInt(10) ** BigInt(decimal.length);
  } else return null;
  if (denominator === BigInt(0)) return null;
  if (denominator < BigInt(0)) {
    numerator = -numerator;
    denominator = -denominator;
  }
  let a = numerator < BigInt(0) ? -numerator : numerator;
  let b = denominator;
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return { numerator: numerator / a, denominator: denominator / a };
}
function compare(a: Rational, b: Rational): number {
  const difference = a.numerator * b.denominator - b.numerator * a.denominator;
  return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
}
function tighter(current: Bound | null, next: Bound, lower: boolean): Bound {
  if (!current) return next;
  const order = compare(next.value, current.value);
  if (order === 0)
    return { value: next.value, closed: next.closed && current.closed };
  return (lower ? order > 0 : order < 0) ? next : current;
}
function nonempty(interval: Interval): boolean {
  if (!interval.lower || !interval.upper) return true;
  const order = compare(interval.lower.value, interval.upper.value);
  return (
    order < 0 || (order === 0 && interval.lower.closed && interval.upper.closed)
  );
}
const number = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:/[+-]?\\d+)?";
const relation = new RegExp(
  `^([a-z]|${number})(<=|>=|!=|<|>)([a-z]|${number})$`,
);
const chain = new RegExp(
  `^(${number})(<=|<|>=|>)([a-z])(<=|<|>=|>)(${number})$`,
);

export function intervalAnswerKey(input: string): string | null {
  if (input.length > 2000) return null;
  const text = input
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\\(?:dfrac|tfrac)\b/g, "\\frac")
    .replace(/\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}/g, "$1/$2")
    .replace(/\\(?:neq|ne)(?![a-zA-Z])|≠/g, "!=")
    .replace(/\\(?:leq|le)(?![a-zA-Z])|≤/g, "<=")
    .replace(/\\(?:geq|ge)(?![a-zA-Z])|≥/g, ">=")
    .replace(/\\(?:[,;:!]|quad\b|qquad\b| )/g, " ")
    .replace(/−/g, "-")
    .replace(/\s+/g, "");
  const branches = text.split(/또는|\\lor\b/);
  if (branches.length > 16) return null;
  let variable: string | null = null;
  const intervals: Interval[] = [];
  for (const branch of branches) {
    const interval: Interval = { lower: null, upper: null };
    const excluded: Rational[] = [];
    let constraints = 0;
    const terms = branch.split(",");
    if (terms.length > 16) return null;
    for (const term of terms) {
      const chained = chain.exec(term);
      const expressions = chained
        ? [
            `${chained[1]}${chained[2]}${chained[3]}`,
            `${chained[3]}${chained[4]}${chained[5]}`,
          ]
        : [term];
      for (const expression of expressions) {
        const match = relation.exec(expression);
        if (!match) return null;
        const leftVariable = /^[a-z]$/.test(match[1]);
        const rightVariable = /^[a-z]$/.test(match[3]);
        if (leftVariable === rightVariable) return null;
        const name = leftVariable ? match[1] : match[3];
        if (variable !== null && name !== variable) return null;
        variable = name;
        const value = rational(leftVariable ? match[3] : match[1]);
        if (!value) return null;
        const operator = match[2];
        if (operator === "!=") {
          excluded.push(value);
          continue;
        }
        constraints++;
        const lower = leftVariable
          ? operator.startsWith(">")
          : operator.startsWith("<");
        const bound = { value, closed: operator.endsWith("=") };
        if (lower) interval.lower = tighter(interval.lower, bound, true);
        else interval.upper = tighter(interval.upper, bound, false);
      }
    }
    if (!constraints) return null;
    let pieces = nonempty(interval) ? [interval] : [];
    for (const point of excluded) {
      pieces = pieces.flatMap((piece) => {
        const lowerOrder = piece.lower ? compare(point, piece.lower.value) : 1;
        const upperOrder = piece.upper ? compare(point, piece.upper.value) : -1;
        if (lowerOrder < 0 || upperOrder > 0) return [piece];
        return [
          { lower: piece.lower, upper: { value: point, closed: false } },
          { lower: { value: point, closed: false }, upper: piece.upper },
        ].filter(nonempty);
      });
    }
    intervals.push(...pieces);
  }
  if (!variable) return null;
  intervals.sort((a, b) => {
    if (!a.lower) return b.lower ? -1 : 0;
    if (!b.lower) return 1;
    return (
      compare(a.lower.value, b.lower.value) ||
      Number(b.lower.closed) - Number(a.lower.closed)
    );
  });
  const union: Interval[] = [];
  for (const interval of intervals) {
    const last = union.at(-1);
    const order =
      last?.upper && interval.lower
        ? compare(last.upper.value, interval.lower.value)
        : null;
    if (
      last &&
      (order === null ||
        order > 0 ||
        (order === 0 && (last.upper!.closed || interval.lower!.closed)))
    ) {
      if (!last.upper || !interval.upper) last.upper = null;
      else {
        const endOrder = compare(last.upper.value, interval.upper.value);
        if (endOrder < 0) last.upper = interval.upper;
        else if (endOrder === 0) last.upper.closed ||= interval.upper.closed;
      }
    } else union.push({ ...interval });
  }
  const boundKey = (bound: Bound | null, infinity: string) =>
    bound
      ? `${bound.value.numerator}/${bound.value.denominator}:${bound.closed ? "closed" : "open"}`
      : infinity;
  return `interval:${variable}:${union.map((i) => `${boundKey(i.lower, "-inf")},${boundKey(i.upper, "+inf")}`).join("|")}`;
}
