/**
 * Offline review aid, never imported by the application: checks the numeric
 * statements written inside `$…$` by calculating both sides. It has no eval and
 * shares no code with the typesetter. Anything symbolic is reported as skipped,
 * never as checked.
 */
export type NumericStatementReport = {
  /** Relations whose every side was calculated and compared. */
  checked: string[];
  /** Relations that are false as written. */
  faults: string[];
  /** Relations with a side this checker cannot calculate (letters, lists, ellipses). */
  skipped: string[];
};

const UNIT_FACTORS: Record<string, [dimension: string, toBase: number]> = {
  mm: ["length", 0.001],
  cm: ["length", 0.01],
  m: ["length", 1],
  km: ["length", 1000],
  "cm^2": ["area", 0.0001],
  "m^2": ["area", 1],
  "km^2": ["area", 1_000_000],
  "cm^3": ["volume", 0.000001],
  "m^3": ["volume", 1],
  g: ["mass", 1],
  kg: ["mass", 1000],
  mL: ["capacity", 1],
  L: ["capacity", 1000],
};

type Side = { value: number; unit?: string };

function readArgument(text: string, at: number): [string, number] {
  if (text[at] !== "{") return [text[at] ?? "", at + 1];
  let depth = 1;
  let end = at + 1;
  while (end < text.length && depth) {
    if (text[end] === "{") depth += 1;
    if (text[end] === "}") depth -= 1;
    end += 1;
  }
  return [text.slice(at + 1, end - 1), end];
}

/** `\frac`, `\sqrt` and mixed numbers become plain bracketed arithmetic. */
function expandCommands(tex: string): string {
  let text = tex;
  for (let guard = 0; guard < 60; guard += 1) {
    const commands = [...text.matchAll(/\\(?:[dt]?frac|sqrt)/g)];
    const command = commands.at(-1);
    if (!command) break;
    let start = command.index!;
    const [first, end] = readArgument(text, start + command[0].length);
    let replacement: string;
    let finish = end;
    if (command[0] === "\\sqrt") replacement = `r(${first})`;
    else {
      const [second, next] = readArgument(text, end);
      replacement = `((${first})/(${second}))`;
      finish = next;
      const whole = text.slice(0, start).match(/\d+$/);
      if (whole) {
        replacement = `(${whole[0]}+${replacement})`;
        start -= whole[0].length;
      }
    }
    text = text.slice(0, start) + replacement + text.slice(finish);
  }
  return text;
}

function evaluate(expression: string): number | undefined {
  const text = expandCommands(expression)
    .replace(/\\times|\\cdot/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\[,;! ]/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s/g, "")
    .replace(/(\d|\))(?=r\()/g, "$1*")
    .replace(/\)(?=\()/g, ")*");
  if (!text || /[^0-9.+*/()^\-r]/.test(text)) return undefined;
  const tokens = text.match(/r|\d+(?:\.\d+)?|[()+*/^\-]/g) ?? [];
  if (tokens.join("") !== text) return undefined;
  let cursor = 0;
  const atom = (): number => {
    const token = tokens[cursor++];
    if (token === "-") return -atom();
    if (token === "+") return atom();
    if (token === "r") return Math.sqrt(atom());
    if (token === "(") {
      const value = sum();
      if (tokens[cursor++] !== ")") throw new Error("unclosed");
      return value;
    }
    if (!token || !/^\d/.test(token)) throw new Error("unsupported");
    return Number(token);
  };
  const power = (): number => {
    const value = atom();
    if (tokens[cursor] !== "^") return value;
    cursor += 1;
    return value ** power();
  };
  const product = (): number => {
    let value = power();
    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const operator = tokens[cursor++];
      const next = power();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  };
  function sum(): number {
    let value = product();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const operator = tokens[cursor++];
      const next = product();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }
  try {
    const value = sum();
    return cursor === tokens.length && Number.isFinite(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function readSide(tex: string): Side | undefined {
  const units = new Set<string>();
  let text = tex
    .replace(/\^\{?\\circ\}?/g, () => {
      units.add("deg");
      return "";
    })
    .replace(
      /\\,?\\(?:mathrm|text)\{([A-Za-z]+)\}(?:\^\{?([23])\}?)?/g,
      (_, unit: string, power?: string) => {
        units.add(power ? `${unit}^${power}` : unit);
        return "";
      },
    );
  const percent = /\\%/.test(text);
  text = text.replace(/\\%/g, "");
  if (units.size > 1) return undefined;
  const value = evaluate(text);
  if (value === undefined) return undefined;
  return { value: percent ? value / 100 : value, unit: [...units][0] };
}

const close = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const RELATION = /(=|<|>|\\leq?(?![a-z])|\\geq?(?![a-z])|\\neq?(?![a-z]))/;

function holds(left: number, relation: string, right: number): boolean {
  if (relation === "=") return close(left, right);
  if (relation === "<") return left < right && !close(left, right);
  if (relation === ">") return left > right && !close(left, right);
  if (relation.startsWith("\\le")) return left < right || close(left, right);
  if (relation.startsWith("\\ge")) return left > right || close(left, right);
  return !close(left, right);
}

/** Every relation between calculable sides in the `$…$` tokens of `text`. */
export function checkNumericStatements(text: string): NumericStatementReport {
  const report: NumericStatementReport = {
    checked: [],
    faults: [],
    skipped: [],
  };
  for (const match of text.matchAll(/\$([^$]*)\$/g)) {
    const parts = match[1]!.split(RELATION);
    if (parts.length < 3) continue;
    const sides = parts.filter((_, index) => index % 2 === 0).map(readSide);
    const relations = parts.filter((_, index) => index % 2 === 1);
    if (sides.some((side) => side === undefined)) {
      report.skipped.push(match[1]!);
      continue;
    }
    const named = new Set(sides.flatMap((side) => side!.unit ?? []));
    let values = sides.map((side) => side!.value);
    if (named.size > 1) {
      const converted = sides.map((side) => {
        const factor = side!.unit ? UNIT_FACTORS[side!.unit] : undefined;
        return factor ? ([factor[0], side!.value * factor[1]] as const) : null;
      });
      if (
        converted.some((side) => !side) ||
        new Set(converted.map((side) => side![0])).size !== 1
      ) {
        report.skipped.push(match[1]!);
        continue;
      }
      values = converted.map((side) => side![1]);
    }
    const ok = relations.every((relation, index) =>
      holds(values[index]!, relation, values[index + 1]!),
    );
    (ok ? report.checked : report.faults).push(match[1]!);
  }
  return report;
}
