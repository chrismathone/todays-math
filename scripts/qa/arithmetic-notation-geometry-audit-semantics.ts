/** QA assertions over the real formatter's TeX, never a display implementation. */
import assert from "node:assert/strict";
import { tokenizeMath } from "../../src/lib/math/segments";
import fixtures from "./arithmetic-notation-geometry-audit-fixtures.json";
import type { ArithmeticV2Answer } from "../../src/lib/arithmetic-v2/types";

export const patternOf = (text: string) => text.replace(/\d+/g, "#");
const fixtureMap = new Map(
  fixtures.patterns.map((f) => [`${f.field}:${f.pattern}`, f]),
);
export const semanticFixtureCount = fixtures.patterns.length;
const mathOf = (text: string) =>
  tokenizeMath(text)
    .filter((s) => s.type !== "text")
    .map((s) => s.value)
    .join(" ");
const plainOf = (text: string) =>
  tokenizeMath(text)
    .filter((s) => s.type === "text")
    .map((s) => s.value)
    .join(" ");
const simplifyNames = (math: string) =>
  math.replace(/\\(?:mathrm|mathit|operatorname)\{([A-Za-z]+)\}/g, "$1");

export function namedObjects(display: string): string[] {
  const math = simplifyNames(mathOf(display));
  const objects: string[] = [];
  // The alternatives only recognize the finite output marks under test; there
  // is no TeX interpretation or replacement output here. KaTeX does the parsing.
  const names =
    /\\(overline|overleftrightarrow|overrightarrow|widehat)\{([A-Z]+)\}|\\angle\s*\{?([A-Z]+)\}?|(?<![A-Za-z])([A-Z]+)(?![A-Za-z])/g;
  for (const m of math.matchAll(names)) {
    if (m[1])
      objects.push(
        `${({ overline: "segment", overleftrightarrow: "line", overrightarrow: "ray", widehat: "arc" } as Record<string, string>)[m[1]]}:${m[2]}`,
      );
    else if (m[3]) objects.push(`angle:${m[3]}`);
    else if (m[4] !== "L") objects.push(`bare:${m[4]}`);
  }
  return objects;
}

export function assertSemanticObjects(
  field: string,
  source: string,
  display: string,
): void {
  const fixture = fixtureMap.get(`${field}:${patternOf(source)}`);
  if (!fixture) return;
  const expected = fixture.entities.map(
    ([label, role]) =>
      `${["segment", "line", "ray", "arc", "angle"].includes(role) ? role : "bare"}:${label}`,
  );
  const actual = namedObjects(display);
  // '각 A' may retain its noun or add an angle mark. Both identify the same
  // one-letter angle; this freedom never applies to segment/polygon labels.
  for (let index = 0; index < actual.length; index++)
    if (
      fixture.entities[index]?.[1] === "angle-variable" &&
      actual[index] === `angle:${fixture.entities[index][0]}`
    )
      actual[index] = `bare:${fixture.entities[index][0]}`;
  assert.deepEqual(actual, expected, "named object roles/order");
  const math = mathOf(display);
  for (const variable of new Set(fixture.variables)) {
    const needle =
      variable === "ℓ"
        ? /\\ell\b|ℓ/
        : new RegExp(`(?<![A-Za-z])${variable}(?![A-Za-z])`);
    assert.match(math, needle, `variable ${variable} must be in math`);
    assert.ok(
      !math.includes(`\\mathrm{${variable}}`),
      `variable ${variable} must not become a physical unit`,
    );
  }
  const commands: Record<string, string> = {
    "∥": "parallel",
    "⊥": "perp",
    π: "pi",
    "÷": "div",
    sin: "sin",
    cos: "cos",
    tan: "tan",
  };
  for (const op of fixture.operators)
    assert.match(math, new RegExp(`\\\\${commands[op]}\\b`), `operator ${op}`);
}

export function assertGeneralNotation(source: string, display: string): void {
  const plain = plainOf(display),
    math = mathOf(display);
  assert.doesNotMatch(
    plain,
    /\$|\\(?:frac|sqrt|mathrm|angle)|[∠∥⊥π√°]|(?<![A-Za-z])[A-Z]{2,}(?![A-Za-z])/,
    "raw mathematical notation outside math",
  );
  const rawUnits = [
    ...source.matchAll(
      /(?<![A-Za-z])(km|cm|mm|mL|m|L)(?:([²³])|\^\{?([23])\}?)?(?![A-Za-z])/g,
    ),
  ];
  for (const [whole, unit, unicodePower, texPower] of rawUnits) {
    if (unit === "m" && source.includes("ℓ∥m")) continue;
    const power = unicodePower ? (unicodePower === "²" ? "2" : "3") : texPower;
    assert.doesNotMatch(
      plain,
      new RegExp(`(?<![A-Za-z])${unit}(?![A-Za-z])`),
      `raw unit ${whole}`,
    );
    assert.match(
      math,
      new RegExp(`\\\\mathrm\\{${unit}(?:\\}|\\^\\{?${power ?? "[23]"}\\}?)`),
      `upright unit ${whole}`,
    );
    if (power)
      assert.match(
        math,
        new RegExp(`\\\\mathrm\\{${unit}\\}?\\^\\{?${power}\\}?`),
        `unit power ${whole}`,
      );
  }
  const expectedDegrees = (source.match(/°|\\circ\b/g) ?? []).length;
  assert.equal(
    (math.match(/\\circ\b/g) ?? []).length,
    expectedDegrees,
    "degree count",
  );
  for (const quantity of source.matchAll(
    /(?<=[가-힣])\s*=\s*(\d+(?:\.\d+)?)/g,
  )) {
    assert.ok(
      tokenizeMath(display).some(
        (part) =>
          part.type !== "text" &&
          new RegExp(`=\\s*${quantity[1].replace(".", "\\.")}(?![\\d.])`).test(
            part.value,
          ),
      ),
      "leading relation and quantity must share one math span",
    );
  }
  for (const m of source.matchAll(/(?<![\d.])(\d*)π\/(\d+)/g)) {
    const numerator = m[1] === "1" ? "" : m[1];
    assert.ok(
      math.replace(/\s/g, "").includes(`\\frac{${numerator}\\pi}{${m[2]}}`),
      "pi fraction numerator/denominator scope",
    );
  }
  for (const m of source.matchAll(/(?<![\d.])(\d+)\/(\d+)\s+(?:cm|m|km)/g)) {
    assert.ok(
      math.replace(/\s/g, "").includes(`\\frac{${m[1]}}{${m[2]}}`),
      "rational quantity fraction scope",
    );
  }
  for (const m of source.matchAll(
    /(?<![A-Za-z])(?:\\)?(sin|cos|tan)(?![A-Za-z])/g,
  ))
    assert.match(
      math,
      new RegExp(`\\\\${m[1]}(?![A-Za-z])`),
      "upright trig operator",
    );
  // Givens keep every digit and sign. Exponents move from Unicode to TeX;
  // numeric polygon names are the one intentional prose spelling projection.
  const digits = (s: string) =>
    [
      ...s
        .replace(/[²³]/g, (p) => (p === "²" ? "2" : "3"))
        .matchAll(/\d+(?:\.\d+)?/g),
    ].map((m) => m[0]);
  const withoutPolygonCounts = source.replace(
    /(?<!\d)([3-9]|[1-9]\d)(?=각(?:형|기둥|뿔))/g,
    "",
  );
  const displayWithoutPolygonCounts = display.replace(
    /(?<!\d)([3-9]|[1-9]\d)(?=각(?:형|기둥|뿔))/g,
    "",
  );
  assert.deepEqual(
    digits(displayWithoutPolygonCounts),
    digits(withoutPolygonCounts),
    "numeric values/order/powers preserved",
  );
}

export const contrastFixtures = [
  {
    source: "선분 AB, 직선 CD, 반직선 EF, 호 GH, ∠ABC, 점 P, 삼각형 XYZ",
    expected: [
      "segment:AB",
      "line:CD",
      "ray:EF",
      "arc:GH",
      "angle:ABC",
      "bare:P",
      "bare:XYZ",
    ],
  },
  { source: "현 TP와 호 TP", expected: ["segment:TP", "arc:TP"] },
  { source: "접선 TP와 PO가 이루는 각", expected: ["line:TP", "segment:PO"] },
  { source: "접선 PB의 길이", expected: ["segment:PB"] },
  {
    source: "세 평행선 AD, BE, CF, AB=3 cm",
    expected: ["line:AD", "line:BE", "line:CF", "segment:AB"],
  },
  {
    source: "AB=AC=22 cm, BC=34 cm, AD⊥BC",
    expected: [
      "segment:AB",
      "segment:AC",
      "segment:BC",
      "segment:AD",
      "segment:BC",
    ],
  },
  {
    source: "$\\mathrm{AB}=22\\,\\mathrm{cm}$, 변 $\\mathrm{AC}$",
    expected: ["segment:AB", "segment:AC"],
  },
];

export function assertContrasts(format: (s: string) => string): number {
  for (const fixture of contrastFixtures)
    assert.deepEqual(
      namedObjects(format(fixture.source)),
      fixture.expected,
      fixture.source,
    );
  // Mutation controls: these are deliberately wrong, renderable formulas.
  // They show the assertions detect semantic errors even when KaTeX succeeds.
  assert.notDeepEqual(namedObjects("$AB=22\\,\\mathrm{cm}$"), ["segment:AB"]);
  assert.notDeepEqual(namedObjects("$\\overline{TP}$"), ["arc:TP"]);
  assert.notDeepEqual(
    namedObjects("$\\overline{AD},\\overline{BE},\\overline{CF}$"),
    ["line:AD", "line:BE", "line:CF"],
  );
  assert.throws(() =>
    assertSemanticObjects(
      "text",
      "ℓ∥m이고 표시된 각은 45°이다. 아래 직선의 표시된 빈 각",
      "$\\ell\\parallel\\mathrm{m}$이고 표시된 각은 $45^{\\circ}$이다. 아래 직선의 표시된 빈 각",
    ),
  );
  assert.throws(() =>
    assertGeneralNotation("넓이 4 cm²", "넓이 $4\\,\\mathrm{cm}^{3}$"),
  );
  return contrastFixtures.length + 5;
}

/** Evaluate KaTeX's parsed answer MathML, not LaTeX or source prose. This small
 * numeric observer supports only the frozen geometry answer normal forms and
 * rejects every unknown operator/node. Units contribute no numeric multiplier. */
export function mathmlAnswerValue(node: Element): number {
  const children = [...node.children];
  const text = node.textContent?.trim() ?? "";
  switch (node.localName) {
    case "mn":
      return Number(text);
    case "mi":
      if (text === "π") return Math.PI;
      assert.match(text, /^[kcmLg]+$/, "answer identifier must be pi or unit");
      return 1;
    case "mtext":
      assert.match(text, /^(?:개)?$/, "answer text must be unit or whitespace");
      return 1;
    case "mspace":
      return 1;
    case "semantics":
      return mathmlAnswerValue(children[0]);
    case "mfrac":
      return mathmlAnswerValue(children[0]) / mathmlAnswerValue(children[1]);
    case "msqrt":
      return Math.sqrt(mathmlProductSum(children));
    case "msup":
      return children[1].textContent === "∘"
        ? mathmlAnswerValue(children[0])
        : mathmlAnswerValue(children[0]) ** mathmlAnswerValue(children[1]);
    case "math":
    case "mrow":
    case "mstyle":
      return mathmlProductSum(children);
    default:
      throw new Error(`Unhandled answer MathML ${node.localName}: ${text}`);
  }
}
function mathmlProductSum(children: Element[]): number {
  let sum = 0,
    term = 1,
    sign = 1;
  for (const node of children) {
    if (node.localName === "mo") {
      const operator = node.textContent;
      assert.ok(
        operator === "+" || operator === "−" || operator === "-",
        `Unexpected answer operator ${operator}`,
      );
      if (node !== children[0]) {
        sum += sign * term;
        term = 1;
      }
      sign = operator === "+" ? 1 : -1;
    } else term *= mathmlAnswerValue(node);
  }
  return sum + sign * term;
}
export function exactAnswerValue(answer: ArithmeticV2Answer): number {
  const [n, r, d, q] = answer.exact.map(Number);
  switch (answer.kind) {
    case "integer":
      return n;
    case "decimal":
      return n / 10 ** r;
    case "rational":
      return n / r;
    case "surd":
      return (n * Math.sqrt(r)) / d;
    case "polynomial":
      assert.equal(r, 1);
      return n + (d * Math.PI) / q;
    default:
      throw new Error(`Unexpected geometry answer ${answer.kind}`);
  }
}
