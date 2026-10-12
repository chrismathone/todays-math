import { compareScalarAnswerNotation } from "./scalarAnswerNotation";

/** Bounded notation evidence only. Never evaluates a trig function or drops a unit. */
function clean(value: string): string {
  return value
    .trim()
    .normalize("NFC")
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/[⑴-⒇]/g, (x) => `(${x.charCodeAt(0) - 0x2474 + 1})`)
    .replace(/−/g, "-")
    .replace(/\\(?:dfrac|tfrac)\b/g, "\\frac")
    .replace(/\\(?:left|right)\b/g, "")
    .replace(/\\(?:[,;:!]|quad\b|qquad\b| )/g, " ")
    .replace(/~/g, " ")
    .replace(/\\pi\b/g, "π")
    .replace(/\\theta\b/g, "θ")
    .replace(/\\(sin|cos|tan)\b/g, "$1")
    .replace(/\^\s*(?:\{\s*\\circ\s*\}|\\circ\b)/g, "°")
    .replace(/\\(?:mathrm|text)\{\s*rad\s*\}/g, "rad")
    .replace(/\s+/g, " ")
    .trim();
}

function parts(value: string): string[] | null {
  const labels = [...value.matchAll(/\((\d+)\)/g)];
  if (
    !value.startsWith("(1)") ||
    labels.length < 2 ||
    labels.length > 20 ||
    labels.some((m, i) => Number(m[1]) !== i + 1)
  )
    return null;
  return labels.map((m, i) =>
    value
      .slice(m.index! + m[0].length, labels[i + 1]?.index)
      .trim()
      .replace(/[,;]+$/, "")
      .trim(),
  );
}

/** Only a numeric coefficient times exactly one pi; no sums, variables or pi denominators. */
function piKey(value: string): string | null {
  let s = value.replace(/\s/g, "");
  let sign = BigInt(1);
  if (s.startsWith("-")) {
    sign = -sign;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  const m =
    /^(\d{1,40})?π(?:\/(\d{1,40}))?$/.exec(s) ??
    /^\\frac\{(\d{1,40})?π\}\{(\d{1,40})\}$/.exec(s) ??
    /^\\frac\{(\d{1,40})\}\{(\d{1,40})\}π$/.exec(s) ??
    /^\((\d{1,40})\/(\d{1,40})\)π$/.exec(s);
  if (!m) return null;
  let n = BigInt(m[1] ?? "1") * sign,
    d = BigInt(m[2] ?? "1");
  if (!d) return null;
  let a = n < BigInt(0) ? -n : n,
    b = d;
  while (b) [a, b] = [b, a % b];
  n /= a;
  d /= a;
  return `${n}/${d}:π`;
}

function numericOnly(value: string): boolean {
  // The existing scalar parser receives no invented variables. This allowlist
  // prevents prose, units, labels and symbolic domains from entering that path.
  return /^[\d\s.{}()[\]+*/^−\-√∛∜]+$/.test(
    value.replace(/\\(?:frac|sqrt)\b/g, ""),
  );
}

function leaf(left: string, right: string, radians: boolean): boolean {
  // Whitespace may surround a token, but must not join separate numeric tokens.
  if (/\d\s+\d/.test(left) || /\d\s+\d/.test(right)) return false;
  const quantity = (s: string) => {
    const m = /^(.*?)(rad|°)$/.exec(s.trim());
    return {
      value: (m?.[1] ?? s).trim(),
      unit: m?.[2] ?? (radians ? "rad" : ""),
    };
  };
  const a = quantity(left),
    b = quantity(right);
  if (a.unit !== b.unit || !a.value || !b.value) return false;
  const ap = piKey(a.value),
    bp = piKey(b.value);
  if (ap !== null || bp !== null) return ap !== null && ap === bp;
  if (numericOnly(a.value) && numericOnly(b.value))
    return compareScalarAnswerNotation(a.value, b.value, "수의 값") === true;
  // Trig atoms are syntax, not single-letter scalar stand-ins. Function,
  // argument, sign, order and every operator must match. No trig identities.
  const compact = (s: string) => s.replace(/\s/g, "");
  const x = compact(a.value),
    y = compact(b.value);
  const trig =
    /^[+-]?\s*\d*\s*(?:sin|cos|tan)\s*(?:θ|[a-z])(?:\s*[+-]\s*\d*\s*(?:sin|cos|tan)\s*(?:θ|[a-z]))*$/;
  return trig.test(a.value) && trig.test(b.value) && x === y;
}

function explicitRadians(question: string): boolean {
  return (
    /(?:중심각(?:의 크기)?|각의 크기)(?:를|은)\s*호도법으로\s*나타내시오[.)\s]*$/.test(
      question,
    ) && !/육십분법으로/.test(question)
  );
}

function trigTriplet(left: string, right: string, question: string): boolean {
  // The requested list is the only authority for mapping numbered answers.
  const request =
    /(?<![a-zA-Z\\])((?:sin|cos|tan)\s*(?:θ|[a-z]))\s*,\s*((?:sin|cos|tan)\s*(?:θ|[a-z]))\s*,\s*((?:sin|cos|tan)\s*(?:θ|[a-z]))의\s*값을\s*구하시오\.?$/.exec(
      question,
    );
  if (!request) return false;
  const names = request.slice(1).map((s) => s.replace(/\s/g, ""));
  if (new Set(names).size !== 3) return false;
  const values = (s: string): string[] | null => {
    const numbered = parts(s);
    const assignments = numbered ?? s.split(/\s*,\s*/);
    if (assignments.length !== 3) return null;
    const matches = assignments.map((v) =>
      /^((?:sin|cos|tan)\s*(?:θ|[a-z]))\s*=\s*(.+)$/.exec(v),
    );
    if (numbered && matches.every((m) => m === null)) return numbered;
    if (matches.some((m, i) => !m || m[1].replace(/\s/g, "") !== names[i]))
      return null;
    return matches.map((m) => m![2]);
  };
  const a = values(left),
    b = values(right);
  return !!a && !!b && a.every((v, i) => leaf(v, b[i], false));
}

function compare(
  left: string,
  right: string,
  question: string,
  depth: number,
  radians = false,
): boolean {
  if (depth > 2) return false;
  if (trigTriplet(left, right, question)) return true;
  // A two-value conversion request without question part labels still has
  // explicit order. Require exactly the two conversion clauses, not a mention
  // of these units elsewhere in a question about lengths or several values.
  const twoConversions =
    /^[+-]?\d+°를 호도법으로, (.+?)[을를] 육십분법으로 나타내시오\.?$/.exec(
      question,
    );
  if (twoConversions && piKey(twoConversions[1]) !== null) {
    const values = (s: string) => parts(s) ?? s.split(/\s*,\s*/);
    const x = values(left),
      y = values(right);
    if (x.length === 2 && y.length === 2)
      return leaf(x[0], y[0], true) && leaf(x[1], y[1], false);
  }
  const a = parts(left),
    b = parts(right);
  if (a || b) {
    if (!a || !b || a.length !== b.length) return false;
    const questions = parts(question.slice(question.indexOf("(1)")));
    const conversion =
      /육십분법으로 나타낸 각은 호도법으로, 호도법으로 나타낸 각은 육십분법으로 나타내시오/.test(
        question,
      );
    if (conversion && (!questions || questions.length !== a.length))
      return false;
    return a.every((v, i) => {
      if (conversion) {
        // Infer omitted rad only in a degree-to-radian subpart. Never convert
        // degree answers to radians or borrow another part's unit context.
        const input = questions![i];
        const radians = /^[+-]?\d+°$/.test(input.replace(/\s/g, ""));
        return leaf(v, b[i], radians);
      }
      const radianPart =
        !!questions &&
        questions.length === a.length &&
        explicitRadians(question.slice(0, question.indexOf("(1)"))) &&
        /중심각의 크기를 θ/.test(question) &&
        /일 때,?\s*θ$/.test(questions[i]);
      // Do not let a global angle instruction supply rad to a radius/area part.
      return compare(v, b[i], question, depth + 1, radianPart);
    });
  }
  const extrema = (s: string) =>
    /^주기\s*:?\s*(.+?),\s*최댓값\s*:?\s*(.+?),\s*최솟값\s*:?\s*(.+)$/.exec(s);
  if (/주기,\s*최댓값,\s*최솟값을 각각 구하/.test(question)) {
    const x = extrema(left),
      y = extrema(right);
    if (x && y) return x.slice(1).every((v, i) => leaf(v, y[i + 1], false));
  }
  return leaf(
    left,
    right,
    radians || (depth === 0 && explicitRadians(question)),
  );
}

export function compareAngleAnswerNotation(
  left: string,
  right: string,
  question: string,
): boolean {
  if (
    !left ||
    !right ||
    left.length > 2048 ||
    right.length > 2048 ||
    question.length > 16000
  )
    return false;
  return compare(clean(left), clean(right), clean(question), 0);
}
