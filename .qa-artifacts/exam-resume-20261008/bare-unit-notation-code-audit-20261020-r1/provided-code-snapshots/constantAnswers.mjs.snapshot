/** Bounded exact constants/units only. Never a solver, grade gate or approval. */
import assert from "node:assert/strict";

const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  while (b) [a, b] = [b, a % b];
  return a;
};
const q = (n, d = 1n) => {
  assert(d !== 0n, "Zero denominator");
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const sumQ = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const mulQ = (a, b) => q(a.n * b.n, a.d * b.d);
const put = (map, key, value) => {
  const next = sumQ(map.get(key) ?? q(0n), value);
  if (next.n) map.set(key, next);
  else map.delete(key);
};
const number = (value) => new Map(value.n ? [[1, value]] : []);
const squareFree = (value) => {
  assert(
    Number.isSafeInteger(value) && value >= 0 && value <= 1000000,
    "Unsupported radicand",
  );
  let outside = 1,
    inside = value;
  for (let p = 2; p * p <= inside; p++) {
    while (inside % (p * p) === 0) {
      outside *= p;
      inside /= p * p;
    }
  }
  return { outside, inside };
};
const add = (a, b, sign = 1n) => {
  const result = new Map(a);
  for (const [k, v] of b) put(result, k, q(v.n * sign, v.d));
  return result;
};
const multiply = (a, b) => {
  const result = new Map();
  for (const [ka, va] of a)
    for (const [kb, vb] of b) {
      const f = squareFree(ka * kb);
      put(result, f.inside, mulQ(mulQ(va, vb), q(BigInt(f.outside))));
    }
  assert(result.size <= 32, "Too many radical terms");
  return result;
};
const divide = (a, b) => {
  // A single radical denominator is rationalized exactly. A sum is unsupported.
  assert(b.size === 1, "Unsupported or zero denominator");
  const [radicand, coefficient] = [...b][0];
  const inverse = new Map([
    [radicand, q(coefficient.d, coefficient.n * BigInt(radicand))],
  ]);
  return multiply(a, inverse);
};

export function constantValue(source) {
  assert(
    typeof source === "string" && source.length <= 512,
    "Bounded expression required",
  );
  let sourceText = source.trim();
  if (sourceText.startsWith("$") && sourceText.endsWith("$"))
    sourceText = sourceText.slice(1, -1);
  assert(!sourceText.includes("$"), "One scalar math fragment required");
  assert(
    !/\d\s+\d/.test(sourceText),
    "Separated numerals are not a scalar expression",
  );
  assert(
    !/\d\s*\\d?frac/.test(sourceText),
    "Ambiguous mixed fraction; use an explicit sum",
  );
  let text = sourceText
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\(?:times|cdot)/g, "*")
    .replace(/\\(?:,|;|!| )/g, "")
    .replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)")
    .replace(/\\sqrt([0-9])/g, "sqrt($1)")
    .replace(/√(\d+)/g, "sqrt($1)");
  for (let i = 0; i < 16 && /\\(?:d?frac)\{[^{}]*\}\{[^{}]*\}/.test(text); i++)
    text = text.replace(/\\(?:d?frac)\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))");
  text = text.replace(/\s/g, "");
  const tokens = text.match(/sqrt|\d+(?:\.\d+)?|[()+\-*/]/g) ?? [];
  assert(
    tokens.length > 0 && tokens.length <= 128 && tokens.join("") === text,
    "Unsupported constant syntax",
  );
  let at = 0;
  const peek = () => tokens[at];
  const take = (token) => {
    assert.equal(tokens[at++], token, "Unexpected token");
  };
  function atom() {
    if (peek() === "+") {
      take("+");
      return atom();
    }
    if (peek() === "-") {
      take("-");
      return multiply(number(q(-1n)), atom());
    }
    if (peek() === "(") {
      take("(");
      const value = expression();
      take(")");
      return value;
    }
    if (peek() === "sqrt") {
      take("sqrt");
      take("(");
      const token = peek();
      assert(
        /^\d+$/.test(token ?? ""),
        "Integer nonnegative radicand required",
      );
      at++;
      take(")");
      const radicand = Number(token);
      if (radicand === 0) return new Map();
      const f = squareFree(radicand);
      return new Map([[f.inside, q(BigInt(f.outside))]]);
    }
    const token = peek();
    assert(
      /^\d{1,12}(?:\.\d{1,6})?$/.test(token ?? ""),
      "Bounded numeric token required",
    );
    at++;
    const [whole, decimal = ""] = token.split(".");
    return number(q(BigInt(whole + decimal), 10n ** BigInt(decimal.length)));
  }
  function product() {
    let value = atom();
    while (
      peek() === "*" ||
      peek() === "/" ||
      peek() === "sqrt" ||
      peek() === "(" ||
      /^\d/.test(peek() ?? "")
    ) {
      if (peek() === "/") {
        take("/");
        value = divide(value, atom());
      } else {
        if (peek() === "*") take("*");
        value = multiply(value, atom());
      }
    }
    return value;
  }
  function expression() {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const sign = peek() === "-" ? -1n : 1n;
      at++;
      value = add(value, product(), sign);
    }
    return value;
  }
  const value = expression();
  assert.equal(at, tokens.length, "Unconsumed expression");
  return [...value]
    .sort(([a], [b]) => a - b)
    .map(([radicand, coefficient]) => ({
      radicand,
      numerator: coefficient.n.toString(),
      denominator: coefficient.d.toString(),
    }));
}

const UNITS = {
  none: ["scalar", q(1n)],
  deg: ["angle", q(1n)],
  cm: ["length", q(1n, 100n)],
  m: ["length", q(1n)],
  "cm^2": ["area", q(1n, 10000n)],
  "m^2": ["area", q(1n)],
  "cm^3": ["volume", q(1n, 1000000n)],
  "m^3": ["volume", q(1n)],
  min: ["time", q(60n)],
  sec: ["time", q(1n)],
  points: ["points", q(1n)],
  count: ["count", q(1n)],
};
const normalizedPart = (part) => {
  assert(
    part && typeof part.role === "string" && part.role.length > 0,
    "Answer role required",
  );
  assert(Object.hasOwn(UNITS, part.unit), "Unknown unit; do not infer a unit");
  const unit = UNITS[part.unit];
  assert(unit, "Unknown unit; do not infer a unit");
  return {
    role: part.role,
    dimension: unit[0],
    value: constantValue(part.value).map((x) => {
      const v = mulQ(q(BigInt(x.numerator), BigInt(x.denominator)), unit[1]);
      return {
        radicand: x.radicand,
        numerator: v.n.toString(),
        denominator: v.d.toString(),
      };
    }),
  };
};

export function compareConstantParts(authorParts, independentParts) {
  try {
    assert(
      Array.isArray(authorParts) &&
        Array.isArray(independentParts) &&
        authorParts.length > 0 &&
        authorParts.length <= 32,
    );
    const left = authorParts.map(normalizedPart),
      right = independentParts.map(normalizedPart);
    assert.equal(
      new Set(left.map((x) => x.role)).size,
      left.length,
      "Duplicate answer role",
    );
    assert.equal(
      new Set(right.map((x) => x.role)).size,
      right.length,
      "Duplicate answer role",
    );
    const equal = JSON.stringify(left) === JSON.stringify(right);
    return {
      status: equal ? "equivalent" : "different",
      left,
      right,
      calculationOnly: true,
      permitsGradeOrQuestionApproval: false,
    };
  } catch (error) {
    return {
      status: "unsupported",
      reason: error.message,
      calculationOnly: true,
      permitsGradeOrQuestionApproval: false,
    };
  }
}

export function singleChoiceConclusion(answer) {
  if (typeof answer !== "string") return null;
  // This reads only the selected mark. Explanatory values must be reviewed separately.
  const match = /^\s*([①②③④⑤])(?:\s*[:：]\s*[^①②③④⑤]+)?\s*$/.exec(answer);
  return match
    ? {
        mark: match[1],
        annotation: answer.slice(answer.indexOf(match[1]) + 1).trim(),
        calculationOrApproval: false,
      }
    : null;
}
