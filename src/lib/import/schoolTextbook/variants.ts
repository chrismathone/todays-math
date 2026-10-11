/** Offline, source-matched textbook variants. No database, model, or unit-level fallback. */
import { createHash } from "node:crypto";

export const TEXTBOOK_VARIANT_VERSION = "textbook-exact-v1";
export type TextbookQuestionType = "객관식" | "단답형" | "서술형";
/** Accepts the read-only snapshot's snake_case problem fields. */
export interface TextbookVariantSource {
  id: string;
  source: string;
  content: string;
  answer: string;
  solution: string | null;
  question_type: string;
  direct_use_allowed: boolean;
  review_status: string;
  origin_problem_id: string | null;
  unit_id: string | null;
  source_material_id: string | null;
  external_id?: string | null;
  problem_code?: string;
  family_key?: string | null;
  source_file?: string | null;
  updated_at?: string | Date;
  figure_svg?: string | null;
  figure_urls?: readonly string[];
  figure_dims?: unknown;
  figure_source_mm?: unknown;
  choice_figure_index?: unknown;
  figure_source?: string | null;
  [field: string]: unknown;
}
export type TextbookVariantRecipe =
  | "exact-calculation"
  | "exact-factorization"
  | "exact-substitution"
  | "exact-linear-equation"
  | "exact-prime-factorization"
  | "exact-gcd"
  | "exact-lcm";
export interface TextbookVariantCandidate {
  sourceId: string;
  sourceDigest: string;
  originProblemId: string;
  sourceMaterialId: string | null;
  unitId: string | null;
  sourceExternalId: string | null;
  sourceFile: string | null;
  familyKey: string | null;
  externalId: string;
  source: "transformed";
  questionType: TextbookQuestionType;
  slot: 1 | 2;
  recipe: TextbookVariantRecipe;
  method: string;
  content: string;
  answer: string;
  solution: string;
  figureSvg: null;
  figureUrls: [];
  figureDims: [];
  figureSourceMm: [];
  choiceFigureIndex: [];
  validation: {
    version: typeof TEXTBOOK_VARIANT_VERSION;
    sourceAnswerVerified: true;
    exactStructure: string;
    checks: string[];
    computedAnswers: string[];
    changedLiterals: number;
  };
}
export type TextbookVariantResult =
  | {
      status: "matched";
      sourceId: string;
      sourceDigest: string;
      candidates: [TextbookVariantCandidate, TextbookVariantCandidate];
    }
  | {
      status: "unresolved";
      sourceId: string;
      sourceDigest: string;
      reason: string;
      detail: string;
    };

function stable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
/** Eligibility, provenance, answer, diagram metadata and update time all invalidate a candidate. */
export function textbookVariantSourceDigest(
  source: TextbookVariantSource,
): string {
  return createHash("sha256")
    .update(JSON.stringify(stable(source)))
    .digest("hex");
}

const ZERO = BigInt(0),
  ONE = BigInt(1);
type Rational = { n: bigint; d: bigint };
const abs = (n: bigint) => (n < ZERO ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== ZERO) [a, b] = [b, a % b];
  return a;
}
function rational(n: bigint, d = ONE): Rational {
  if (d === ZERO) throw new Error("zero-denominator");
  if (n.toString().length > 90 || d.toString().length > 90)
    throw new Error("arithmetic-limit");
  if (d < ZERO) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const plus = (a: Rational, b: Rational) =>
  rational(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Rational) => rational(-a.n, a.d);
const mul = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
const div = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
const int = (n: number | bigint) => rational(BigInt(n));
const eq = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
function decimal(text: string): Rational {
  const parts = text.split(".");
  const digits = (parts[1] ?? "").length;
  return rational(BigInt(parts.join("")), BigInt(10) ** BigInt(digits));
}
function latexR(a: Rational): string {
  const sign = a.n < ZERO ? "-" : "";
  return a.d === ONE ? a.n.toString() : `${sign}\\frac{${abs(a.n)}}{${a.d}}`;
}

type Ast =
  | {
      kind: "number";
      value: Rational;
      start: number;
      end: number;
      text: string;
    }
  | { kind: "variable"; name: string }
  | { kind: "negative"; child: Ast }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Ast; right: Ast };
type Token = { text: string; start: number; end: number };
function normalizedMath(math: string): string {
  return math
    .replace(/\\(?:left|right|bigl|bigr)\b/g, "")
    .replace(/\\(?:,|;|:|!|quad\b|qquad\b| )/g, " ")
    .replace(/\\dfrac\b/g, "\\frac")
    .replace(/[×·]/g, "\\times ")
    .replace(/÷/g, "\\div ")
    .replace(/[−–]/g, "-")
    .replace(/\\cdot\b/g, "\\times")
    .replace(/\\([{}])/g, "$1")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")");
}
function parse(math: string): { ast: Ast; text: string } {
  const text = normalizedMath(math);
  if (text.length > 1200) throw new Error("expression-limit");
  const tokens: Token[] = [];
  const pattern =
    /\s+|\\(?:frac|times|div)|(?:\d+(?:\.\d+)?)|[abcxyz i()+\-*/^{}]/gy;
  let offset = 0;
  while (offset < text.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(text);
    if (!match) throw new Error("unsupported-math-syntax");
    offset = pattern.lastIndex;
    if (match[0].trim())
      tokens.push({ text: match[0], start: match.index, end: offset });
  }
  if (tokens.length > 250) throw new Error("expression-limit");
  let cursor = 0,
    depth = 0;
  const peek = () => tokens[cursor]?.text;
  const take = () => {
    const t = tokens[cursor++];
    if (!t) throw new Error("incomplete-expression");
    return t;
  };
  const group = (): Ast => {
    if (++depth > 30) throw new Error("expression-depth");
    const token = take();
    let result: Ast;
    if (/^\d/.test(token.text))
      result = {
        kind: "number",
        value: decimal(token.text),
        start: token.start,
        end: token.end,
        text: token.text,
      };
    else if (/^[abcxyzi]$/.test(token.text))
      result = { kind: "variable", name: token.text };
    else if (token.text === "(" || token.text === "{") {
      result = sum();
      if (take().text !== (token.text === "(" ? ")" : "}"))
        throw new Error("unbalanced-expression");
    } else if (token.text === "\\frac") {
      if (peek() !== "{") throw new Error("fraction-needs-braces");
      const left = group();
      if (peek() !== "{") throw new Error("fraction-needs-braces");
      result = { kind: "binary", op: "/", left, right: group() };
    } else throw new Error("unsupported-math-syntax");
    depth--;
    return result;
  };
  const power = (): Ast => {
    let left = group();
    if (peek() === "^") {
      take();
      left = { kind: "binary", op: "^", left, right: signed() };
    }
    return left;
  };
  const signed = (): Ast => {
    if (peek() === "+") {
      take();
      return signed();
    }
    if (peek() === "-") {
      take();
      return { kind: "negative", child: signed() };
    }
    return power();
  };
  const product = (): Ast => {
    let left = signed();
    while (peek() && !["+", "-", ")", "}"].includes(peek()!)) {
      const next = peek()!;
      if (["*", "\\times", "/", "\\div"].includes(next)) {
        take();
        left = {
          kind: "binary",
          op: next === "/" || next === "\\div" ? "/" : "*",
          left,
          right: signed(),
        };
      } else if (/^(?:\d|[abcxyzi({]|\\frac)/.test(next))
        left = { kind: "binary", op: "*", left, right: signed() };
      else throw new Error("unsupported-math-syntax");
    }
    return left;
  };
  const sum = (): Ast => {
    let left = product();
    while (peek() === "+" || peek() === "-") {
      const op = take().text as "+" | "-";
      left = { kind: "binary", op, left, right: product() };
    }
    return left;
  };
  const ast = sum();
  if (cursor !== tokens.length) throw new Error("trailing-expression");
  return { ast, text };
}

/** Sparse exact polynomial ring over rationals, with i²=-1. */
type Poly = Map<string, Rational>;
const constant = (n: Rational): Poly =>
  n.n === ZERO ? new Map() : new Map([["", n]]);
function addPoly(a: Poly, b: Poly): Poly {
  const out = new Map(a);
  for (const [key, value] of b) {
    const next = plus(out.get(key) ?? int(0), value);
    if (next.n === ZERO) out.delete(key);
    else out.set(key, next);
  }
  return out;
}
const scale = (p: Poly, n: Rational): Poly =>
  new Map(
    [...p]
      .map(([k, v]) => [k, mul(v, n)])
      .filter(([, v]) => (v as Rational).n !== ZERO) as [string, Rational][],
  );
function multiplyPoly(a: Poly, b: Poly): Poly {
  let out: Poly = new Map();
  for (const [ka, va] of a)
    for (const [kb, vb] of b) {
      const letters = (ka + kb).split("").sort();
      const i = letters.filter((c) => c === "i").length;
      const key =
        letters.filter((c) => c !== "i").join("") + (i % 2 ? "i" : "");
      if (key.length > 100) throw new Error("degree-limit");
      out = addPoly(
        out,
        new Map([[key, mul(mul(va, vb), int(i % 4 >= 2 ? -1 : 1))]]),
      );
      if (out.size > 100) throw new Error("term-limit");
    }
  return out;
}
function inverse(p: Poly): Poly {
  if ([...p.keys()].some((k) => k !== "" && k !== "i"))
    throw new Error("variable-denominator");
  const a = p.get("") ?? int(0),
    b = p.get("i") ?? int(0);
  const norm = plus(mul(a, a), mul(b, b));
  return addPoly(
    constant(div(a, norm)),
    new Map(b.n === ZERO ? [] : [["i", neg(div(b, norm))]]),
  );
}
function evaluate(ast: Ast): Poly {
  if (ast.kind === "number") return constant(ast.value);
  if (ast.kind === "variable") return new Map([[ast.name, int(1)]]);
  if (ast.kind === "negative") return scale(evaluate(ast.child), int(-1));
  const left = evaluate(ast.left),
    right = evaluate(ast.right);
  if (ast.op === "+") return addPoly(left, right);
  if (ast.op === "-") return addPoly(left, scale(right, int(-1)));
  if (ast.op === "*") return multiplyPoly(left, right);
  if (ast.op === "/") return multiplyPoly(left, inverse(right));
  if (right.size > 1 || [...right.keys()].some((k) => k !== ""))
    throw new Error("non-integer-exponent");
  const exponent = right.get("") ?? int(0);
  if (exponent.d !== ONE || abs(exponent.n) > BigInt(1000))
    throw new Error("exponent-limit");
  let result = constant(int(1));
  let base = exponent.n < ZERO ? inverse(left) : left,
    power = abs(exponent.n);
  while (power > ZERO) {
    if (power % BigInt(2) === ONE) result = multiplyPoly(result, base);
    power /= BigInt(2);
    if (power > ZERO) base = multiplyPoly(base, base);
  }
  return result;
}
function polyLatex(p: Poly): string {
  const entries = [...p].sort(
    ([a], [b]) => b.length - a.length || a.localeCompare(b),
  );
  if (!entries.length) return "0";
  return entries
    .map(([key, value], index) => {
      const negative = value.n < ZERO;
      const coefficient = rational(abs(value.n), value.d);
      const powers = [...new Set(key)]
        .map((letter) => {
          const count = key.split(letter).length - 1;
          return letter + (count > 1 ? `^{${count}}` : "");
        })
        .join("");
      return (
        (negative ? "-" : index ? "+" : "") +
        (key && eq(coefficient, int(1)) ? "" : latexR(coefficient)) +
        powers
      );
    })
    .join("");
}
const samePoly = (a: Poly, b: Poly) =>
  a.size === b.size && [...a].every(([k, v]) => b.has(k) && eq(v, b.get(k)!));

function structure(ast: Ast): string {
  if (ast.kind === "number") return "N";
  if (ast.kind === "variable") return ast.name;
  if (ast.kind === "negative") return `neg(${structure(ast.child)})`;
  // The exponent is part of the method, not a replaceable data number.
  return `${ast.op}(${structure(ast.left)},${ast.op === "^" ? polyLatex(evaluate(ast.right)) : structure(ast.right)})`;
}
function leaves(
  ast: Ast,
  exponent = false,
): Extract<Ast, { kind: "number" }>[] {
  if (ast.kind === "number") return exponent ? [] : [ast];
  if (ast.kind === "variable") return [];
  if (ast.kind === "negative") return leaves(ast.child, exponent);
  return [
    ...leaves(ast.left, exponent),
    ...leaves(ast.right, exponent || ast.op === "^"),
  ];
}
function mutate(
  math: string,
  delta: number,
): { text: string; changed: number } {
  const { ast, text } = parse(math);
  const changes = leaves(ast).filter(
    (n) => n.value.n !== ZERO && !eq(n.value, int(1)),
  );
  let next = text;
  for (const leaf of changes.sort((a, b) => b.start - a.start)) {
    // Keep decimal place count and repeated constants; preserve all operators and powers.
    const places = leaf.text.split(".")[1]?.length ?? 0;
    const bump = rational(BigInt(delta), BigInt(10) ** BigInt(places));
    const value = plus(leaf.value, bump);
    const token = places
      ? `${(value.n * BigInt(10) ** BigInt(places)) / value.d}`.padStart(
          places + 1,
          "0",
        )
      : latexR(value);
    const replacement = places
      ? `${token.slice(0, -places)}.${token.slice(-places)}`
      : token;
    next = next.slice(0, leaf.start) + replacement + next.slice(leaf.end);
  }
  if (structure(parse(next).ast) !== structure(ast))
    throw new Error("structure-changed");
  return { text: next, changed: changes.length };
}

/** An invertible substitution preserves polynomial identities and factored methods. */
function scaleVariables(
  math: string,
  scaleBy: number,
): { text: string; changed: number } {
  const { text } = parse(math);
  const chosen = (
    text.replace(/\\[a-z]+/g, "").match(/[abcxyz]/g) ?? []
  ).sort()[0];
  // Supported identifiers are one-character tokens, never LaTeX command names.
  let changed = 0;
  const result = text.replace(/\\[a-z]+|[abcxyz]/g, (token) => {
    if (token !== chosen) return token;
    changed++;
    return `(${scaleBy}${token})`;
  });
  return { text: result, changed };
}
function substitute(ast: Ast, name: string, value: Rational): Ast {
  if (ast.kind === "variable" && ast.name === name)
    return { kind: "number", value, start: 0, end: 0, text: latexR(value) };
  if (ast.kind === "negative")
    return { ...ast, child: substitute(ast.child, name, value) };
  if (ast.kind === "binary")
    return {
      ...ast,
      left: substitute(ast.left, name, value),
      right: substitute(ast.right, name, value),
    };
  return ast;
}

type MathPart = { start: number; end: number; math: string };
const mathParts = (text: string): MathPart[] =>
  [...text.matchAll(/\$([^$\n]+)\$/g)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
    math: m[1]!,
  }));
const LABEL = /(?:\([1-9]\d?\)|[⑴-⒇㉠-㉻])/g;
function frameOnly(text: string): boolean {
  return text.replace(LABEL, "").replace(/[\s,，:：.;。]/g, "").length === 0;
}
function applyParts(text: string, parts: MathPart[], next: string[]): string {
  let output = text;
  for (let i = parts.length - 1; i >= 0; i--)
    output =
      output.slice(0, parts[i]!.start) +
      `$${next[i]}$` +
      output.slice(parts[i]!.end);
  return output;
}
function stripMath(text: string): string {
  return text.replace(/\$[^$\n]+\$/g, "");
}
function sourceAnswers(source: TextbookVariantSource, expected: Poly[]): void {
  const parts = mathParts(source.answer);
  if (parts.length !== expected.length || !frameOnly(stripMath(source.answer)))
    throw new Error("source-answer-shape");
  for (let i = 0; i < parts.length; i++) {
    const answer = parts[i]!.math.replace(/^[abcxyz]\s*=\s*/, "");
    if (!samePoly(evaluate(parse(answer).ast), expected[i]!))
      throw new Error("source-answer-mismatch");
  }
}
function integerValue(math: string): bigint {
  const p = evaluate(parse(math).ast);
  if ([...p.keys()].some((k) => k !== ""))
    throw new Error("not-positive-integer");
  const n = p.get("") ?? int(0);
  if (n.d !== ONE || n.n < BigInt(2) || n.n > BigInt(1000000))
    throw new Error("integer-range");
  return n.n;
}
function factor(n: bigint): [bigint, number][] {
  const out: [bigint, number][] = [];
  for (let p = BigInt(2); p * p <= n; p++) {
    let count = 0;
    while (n % p === ZERO) {
      n /= p;
      count++;
    }
    if (count) out.push([p, count]);
  }
  if (n > ONE) out.push([n, 1]);
  return out;
}
const factorsLatex = (n: bigint) =>
  factor(n)
    .map(([p, power]) => `${p}${power > 1 ? `^{${power}}` : ""}`)
    .join("\\times ");
function numberList(math: string): string[] {
  // Only commas at top level: fractions and parentheses cannot be split blindly.
  let depth = 0,
    from = 0;
  const values: string[] = [];
  const text = normalizedMath(math).replace(/~/g, " ");
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "(") depth++;
    if (text[i] === "}" || text[i] === ")") depth--;
    if (text[i] === "," && depth === 0) {
      values.push(text.slice(from, i));
      from = i + 1;
    }
  }
  values.push(text.slice(from));
  if (values.length < 2 || values.length > 3)
    throw new Error("number-list-shape");
  return values;
}
function equation(math: string): {
  answer: Poly;
  proof: string;
  shape: string;
} {
  const sides = math.split("=");
  if (sides.length !== 2) throw new Error("equation-shape");
  const left = parse(sides[0]!),
    right = parse(sides[1]!);
  const difference = addPoly(
    evaluate(left.ast),
    scale(evaluate(right.ast), int(-1)),
  );
  if ([...difference.keys()].some((k) => k !== "" && k !== "x"))
    throw new Error("not-linear-in-x");
  const a = difference.get("x") ?? int(0),
    b = difference.get("") ?? int(0);
  if (a.n === ZERO) throw new Error("degenerate-equation");
  const root = div(neg(b), a);
  // Independent substitution on the AST verifies both sides at the computed root.
  const substituted = (ast: Ast): Ast =>
    ast.kind === "variable" && ast.name === "x"
      ? { kind: "number", value: root, start: 0, end: 0, text: latexR(root) }
      : ast.kind === "negative"
        ? { ...ast, child: substituted(ast.child) }
        : ast.kind === "binary"
          ? {
              ...ast,
              left: substituted(ast.left),
              right: substituted(ast.right),
            }
          : ast;
  if (
    !samePoly(evaluate(substituted(left.ast)), evaluate(substituted(right.ast)))
  )
    throw new Error("substitution-failed");
  return {
    answer: constant(root),
    proof: `양변의 동류항을 정리하면 $${polyLatex(difference)}=0$이다. 따라서 $x=${latexR(root)}$이다. 이 값을 원래 식의 양변에 대입하면 두 값이 같다.`,
    shape: `${structure(left.ast)}=${structure(right.ast)}`,
  };
}

type Match = {
  recipe: TextbookVariantRecipe;
  parts: MathPart[];
  shape: string;
  answers: Poly[];
  factors?: string[];
  substitution?: { name: string; value: Rational };
  mcq?: {
    labels: string[];
    offsets: Rational[];
    correct: number;
    start: number;
    values: MathPart[];
  };
};
function matchSource(source: TextbookVariantSource): Match {
  const all = mathParts(source.content);
  if (!all.length || source.content.includes("$$"))
    throw new Error("no-exact-template");
  // A single computational expression followed by numeric alternatives, and nothing else.
  if (source.question_type === "객관식") {
    const markers = [...source.content.matchAll(/[①-⑩]/g)];
    if (markers.length < 3 || markers.length > 5)
      throw new Error("no-exact-template");
    const start = markers[0]!.index!;
    const stem = source.content.slice(0, start).trim();
    const values = all.filter((m) => m.start >= start),
      parts = all.filter((m) => m.start < start);
    if (
      parts.length !== 1 ||
      values.length !== markers.length ||
      !frameOnly(stripMath(source.content.slice(start)).replace(/[①-⑩]/g, ""))
    )
      throw new Error("no-exact-template");
    const skeleton = stripMath(stem).replace(/\s/g, "");
    if (
      !/^(?:다음식)?(?:의값은\?|을계산한값은\?|을계산하면\?|를계산하면\?|의값을구하면\?)$/.test(
        skeleton,
      )
    )
      throw new Error("no-exact-template");
    const parsed = parse(parts[0]!.math),
      answer = evaluate(parsed.ast);
    if ([...answer.keys()].some((k) => k !== ""))
      throw new Error("mcq-nonnumeric");
    const numeric = values.map((p) => evaluate(parse(p.math).ast));
    if (numeric.some((p) => [...p.keys()].some((k) => k !== "")))
      throw new Error("mcq-nonnumeric");
    const correct = numeric.findIndex((p) => samePoly(p, answer));
    if (
      correct < 0 ||
      numeric.filter((p) => samePoly(p, answer)).length !== 1 ||
      new Set(numeric.map(polyLatex)).size !== numeric.length
    )
      throw new Error("source-answer-mismatch");
    if (source.answer.trim() !== markers[correct]![0])
      throw new Error("source-answer-mismatch");
    const target = answer.get("") ?? int(0);
    return {
      recipe: "exact-calculation",
      parts,
      shape: structure(parsed.ast),
      answers: [answer],
      mcq: {
        labels: markers.map((m) => m[0]),
        offsets: numeric.map((p) => plus(p.get("") ?? int(0), neg(target))),
        correct,
        start,
        values,
      },
    };
  }
  if (source.question_type !== "단답형") throw new Error("no-exact-template");
  let recipe: TextbookVariantRecipe;
  const skeleton = stripMath(source.content)
    .replace(LABEL, "")
    .replace(/\s/g, "");
  if (/^일때[,，]?의값을구하시오\.$/.test(skeleton) && all.length === 2) {
    const assignment = /^([abcxyz])\s*=\s*(.+)$/.exec(
      normalizedMath(all[0]!.math),
    );
    if (!assignment) throw new Error("no-exact-template");
    const value = evaluate(parse(assignment[2]!).ast);
    if ([...value.keys()].some((key) => key !== ""))
      throw new Error("no-exact-template");
    const target = parse(all[1]!.math).ast,
      v = value.get("") ?? int(0);
    const answer = evaluate(substitute(target, assignment[1]!, v));
    if ([...answer.keys()].some((key) => key !== ""))
      throw new Error("no-exact-template");
    sourceAnswers(source, [answer]);
    return {
      recipe: "exact-substitution",
      parts: all,
      answers: [answer],
      shape: structure(target),
      substitution: { name: assignment[1]!, value: v },
    };
  }
  if (
    /^(?:(?:곱셈공식을|이항정리를|파스칼의삼각형을)이용하여)?다음(?:식|을|식을|다항식을|다항식)?(?:계산|간단히|전개)하시오\.[,.;]*$/.test(
      skeleton,
    ) ||
    /^(?:다음값을구하시오\.|의값을구하시오\.|을계산하시오\.|를계산하시오\.|를전개하시오\.|을전개하시오\.)[,.;]*$/.test(
      skeleton,
    ) ||
    /^다음식을이항정리를이용하여전개하시오\.$/.test(skeleton)
  )
    recipe = "exact-calculation";
  else if (
    /^(?:(?:다음)?(?:일차)?방정식을(?:푸시오|풀어라|풀어보시오)|(?:일차)?방정식의해를구하시오)\.[,.;]*$/.test(
      skeleton,
    )
  )
    recipe = "exact-linear-equation";
  else if (
    /^(?:다음(?:식|다항식)을|(?:다항식)?(?:을|를))인수분해하시오\.[,.;]*$/.test(
      skeleton,
    )
  )
    recipe = "exact-factorization";
  else if (
    /^(?:다음(?:수를)?소인수분해하시오\.|(?:을|를)소인수분해하시오\.)[,.;]*$/.test(
      skeleton,
    )
  )
    recipe = "exact-prime-factorization";
  else if (
    /^(?:다음(?:두|세)?수의|(?:두|세)수의|(?:과|와|,)*)최대공약수를구하시오\.[,.;]*$/.test(
      skeleton,
    )
  )
    recipe = "exact-gcd";
  else if (
    /^(?:다음(?:두|세)?수의|(?:두|세)수의|(?:과|와|,)*)최소공배수를구하시오\.[,.;]*$/.test(
      skeleton,
    )
  )
    recipe = "exact-lcm";
  else throw new Error("no-exact-template");
  const shapes: string[] = [];
  const factorParts = mathParts(source.answer);
  const answers = all.map((part) => {
    if (recipe === "exact-linear-equation") {
      const e = equation(part.math);
      shapes.push(e.shape);
      return e.answer;
    }
    if (recipe === "exact-prime-factorization") {
      const n = integerValue(part.math);
      shapes.push(structure(parse(part.math).ast));
      return constant(int(n));
    }
    if (recipe === "exact-gcd" || recipe === "exact-lcm") {
      const list = numberList(part.math);
      const ns = list.map(integerValue);
      shapes.push(list.map((s) => structure(parse(s).ast)).join(","));
      return constant(
        int(
          ns.reduce((a, b) =>
            recipe === "exact-gcd" ? gcd(a, b) : (a / gcd(a, b)) * b,
          ),
        ),
      );
    }
    const parsed = parse(part.math);
    if (recipe === "exact-factorization") {
      const factorAnswer = factorParts[shapes.length];
      if (!factorAnswer) throw new Error("source-answer-shape");
      const factored = parse(factorAnswer.math).ast;
      if (factored.kind !== "binary" || !["*", "^"].includes(factored.op))
        throw new Error("answer-not-factored");
      if (!samePoly(evaluate(factored), evaluate(parsed.ast)))
        throw new Error("source-answer-mismatch");
      shapes.push(structure(factored));
    } else shapes.push(structure(parsed.ast));
    return evaluate(parsed.ast);
  });
  // A list spread over separate $...$ fragments is deliberately not grouped by guesswork.
  sourceAnswers(source, answers);
  const sourceLabels = stripMath(source.content).match(LABEL) ?? [],
    answerLabels = stripMath(source.answer).match(LABEL) ?? [];
  if (
    sourceLabels.length !== answerLabels.length ||
    sourceLabels.some((v, i) => v !== answerLabels[i])
  )
    throw new Error("source-answer-labels");
  return {
    recipe,
    parts: all,
    shape: shapes.join(";"),
    answers,
    ...(recipe === "exact-factorization"
      ? { factors: factorParts.map((p) => p.math) }
      : {}),
  };
}

function build(
  source: TextbookVariantSource,
  match: Match,
  slot: 1 | 2,
  delta: number,
): TextbookVariantCandidate {
  let changed = 0;
  const next: string[] = [],
    answers: string[] = [],
    proofs: string[] = [];
  for (const part of match.parts) {
    if (match.recipe === "exact-substitution") {
      if (next.length === 0) {
        const info = match.substitution!,
          value = plus(info.value, int(delta));
        next.push(`${info.name}=${latexR(value)}`);
        changed++;
        continue;
      }
      const info = match.substitution!,
        value = plus(info.value, int(delta));
      const result = polyLatex(
        evaluate(substitute(parse(part.math).ast, info.name, value)),
      );
      next.push(part.math);
      answers.push(result);
      proofs.push(
        `$${info.name}=${latexR(value)}$을 식에 대입하여 계산하면 $${result}$이다.`,
      );
      continue;
    }
    if (match.recipe === "exact-factorization") {
      const original = parse(part.math),
        transformed = scaleVariables(part.math, delta);
      const factored = scaleVariables(match.factors![next.length]!, delta);
      const answer = evaluate(parse(transformed.text).ast),
        proofAnswer = evaluate(parse(factored.text).ast);
      if (!samePoly(answer, proofAnswer))
        throw new Error("factor-product-mismatch");
      // Restore an expanded question when the source was expanded; keep a structured
      // source question when it used grouped substitution or another factored operand.
      next.push(
        /[()]/.test(original.text) ? transformed.text : polyLatex(answer),
      );
      answers.push(factored.text);
      changed += transformed.changed;
      proofs.push(
        `공통인수와 인수분해 공식을 적용하면 $${next[next.length - 1]}=${factored.text}$이다. 오른쪽을 전개하여 원래 다항식과 같음을 확인할 수 있다.`,
      );
      continue;
    }
    if (match.recipe === "exact-prime-factorization") {
      const n = integerValue(part.math);
      // Preserve multiplicities and number of prime factors while changing one prime.
      const factors = factor(n),
        used = new Set(factors.map(([p]) => p.toString()));
      const alternatives = [
        BigInt(2),
        BigInt(3),
        BigInt(5),
        BigInt(7),
        BigInt(11),
        BigInt(13),
        BigInt(17),
        BigInt(19),
        BigInt(23),
        BigInt(29),
      ].filter((p) => !used.has(p.toString()));
      const replacement = alternatives[(delta - 2) % alternatives.length]!;
      const revised = factors.map(
        ([p, exp], i) =>
          [i === factors.length - 1 ? replacement : p, exp] as const,
      );
      const value = revised.reduce((a, [p, exp]) => a * p ** BigInt(exp), ONE);
      if (value > BigInt(1000000)) throw new Error("integer-range");
      const output = factorsLatex(value);
      if (integerValue(output) !== value)
        throw new Error("factor-product-mismatch");
      next.push(value.toString());
      answers.push(output);
      changed++;
      proofs.push(
        `$${value}=${output}$이다. 각 밑은 소수이므로 이것이 소인수분해이다.`,
      );
      continue;
    }
    if (match.recipe === "exact-gcd" || match.recipe === "exact-lcm") {
      const list = numberList(part.math),
        original = list.map(integerValue);
      // Common scaling preserves the relationship and recalculates the target exactly.
      const values = original.map((n) => n * BigInt(delta));
      if (values.some((n) => n > BigInt(1000000)))
        throw new Error("integer-range");
      const answer = values.reduce((a, b) =>
        match.recipe === "exact-gcd" ? gcd(a, b) : (a / gcd(a, b)) * b,
      );
      next.push(values.join(",\\,"));
      answers.push(answer.toString());
      changed += values.length;
      proofs.push(
        `각 수를 소인수분해하면 ${values.map((n) => `$${n}=${factorsLatex(n)}$`).join(", ")}이다. ${match.recipe === "exact-gcd" ? "공통인 소인수의 최소 지수를 택하여 최대공약수" : "모든 소인수의 최대 지수를 택하여 최소공배수"}를 구하면 $${answer}$이다.`,
      );
      continue;
    }
    if (match.recipe === "exact-linear-equation") {
      const sides = part.math.split("=").map((side) => mutate(side, delta));
      const expression = sides.map((s) => s.text).join("=");
      const solved = equation(expression);
      if (solved.shape !== match.shape.split(";")[next.length])
        throw new Error("structure-changed");
      next.push(expression);
      answers.push(`x=${polyLatex(solved.answer)}`);
      proofs.push(solved.proof);
      changed += sides.reduce((n, s) => n + s.changed, 0);
      continue;
    }
    const scaled = scaleVariables(part.math, delta);
    const modified = scaled.changed ? scaled : mutate(part.math, delta),
      answer = polyLatex(evaluate(parse(modified.text).ast));
    next.push(modified.text);
    answers.push(answer);
    changed += modified.changed;
    proofs.push(
      `계산의 순서에 따라 괄호와 거듭제곱, 곱셈·나눗셈을 먼저 계산하고 동류항을 정리하면 $${modified.text}=${answer}$이다.`,
    );
  }
  if (!changed) throw new Error("no-changeable-data");
  let content = applyParts(source.content, match.parts, next);
  let answer: string;
  if (match.mcq) {
    const correctValue = evaluate(parse(answers[0]!).ast).get("") ?? int(0);
    const alternatives = match.mcq.offsets.map((offset) =>
      latexR(plus(correctValue, offset)),
    );
    content = applyParts(
      content,
      mathParts(content).filter(
        (p) => p.start >= content.indexOf(match.mcq!.labels[0]!),
      ),
      alternatives,
    );
    answer = match.mcq.labels[match.mcq.correct]!;
    proofs.push(`따라서 정답은 ${answer}이다.`);
  } else answer = applyParts(source.answer, mathParts(source.answer), answers);
  const labels = stripMath(source.content).match(LABEL) ?? [];
  return {
    sourceId: source.id,
    sourceDigest: textbookVariantSourceDigest(source),
    originProblemId: source.id,
    sourceMaterialId: source.source_material_id,
    unitId: source.unit_id,
    sourceExternalId: source.external_id ?? null,
    sourceFile: source.source_file ?? null,
    familyKey: source.family_key ?? null,
    externalId: `tb-retry-v1:${source.id}:${slot}`,
    source: "transformed",
    questionType: source.question_type as TextbookQuestionType,
    slot,
    recipe: match.recipe,
    method:
      match.recipe === "exact-factorization"
        ? "verified source factors under invertible variable rescaling"
        : "source-matched exact rational/polynomial calculation; numerical data mutation or invertible variable rescaling",
    content,
    answer,
    solution: proofs
      .map((p, i) => (labels[i] ? `${labels[i]} ` : "") + p)
      .join("\n"),
    figureSvg: null,
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    choiceFigureIndex: [],
    validation: {
      version: TEXTBOOK_VARIANT_VERSION,
      sourceAnswerVerified: true,
      exactStructure: match.shape,
      checks: [
        "source-answer-exact",
        "question-type-preserved",
        "source-operation-or-invertible-substitution-preserved",
        "exact-rational-recalculation",
        ...(match.recipe === "exact-factorization"
          ? ["factor-product-expanded-exact"]
          : []),
        ...(match.recipe === "exact-linear-equation"
          ? ["root-substitution-both-sides"]
          : []),
        ...(match.mcq
          ? ["unique-numeric-choice", "distractor-offsets-preserved"]
          : []),
      ],
      computedAnswers: answers,
      changedLiterals: changed,
    },
  };
}

/** Fail closed. Two candidates are returned together, never partial or substituted from a unit. */
export function generateTextbookVariantPair(
  source: TextbookVariantSource,
): TextbookVariantResult {
  const digest = textbookVariantSourceDigest(source);
  const unresolved = (
    reason: string,
    detail = reason,
  ): TextbookVariantResult => ({
    status: "unresolved",
    sourceId: source.id,
    sourceDigest: digest,
    reason,
    detail,
  });
  if (source.source !== "school_textbook" || source.origin_problem_id !== null)
    return unresolved("not-textbook-original");
  if (!source.direct_use_allowed || source.review_status !== "approved")
    return unresolved(
      "source-held",
      "Needs source recovery and approval before variants can be trusted; remains in the denominator.",
    );
  if (
    source.figure_svg ||
    source.figure_urls?.length ||
    /\[그림\]|<svg|!\[/.test(source.content)
  )
    return unresolved(
      "figure-dependent",
      "Diagram transformation is not implemented; copying an old labelled diagram would be unsafe.",
    );
  if (!source.content.trim() || !source.answer.trim())
    return unresolved("source-incomplete");
  try {
    const match = matchSource(source),
      candidates: TextbookVariantCandidate[] = [];
    for (let delta = 2; delta <= 16 && candidates.length < 2; delta++) {
      try {
        const candidate = build(
          source,
          match,
          (candidates.length + 1) as 1 | 2,
          delta,
        );
        if (
          candidate.content === source.content ||
          candidates.some((c) => c.content === candidate.content)
        )
          continue;
        // Reparse the generated full question and verify its answer/format, not only metadata.
        const generatedMatch = matchSource({
          ...source,
          content: candidate.content,
          answer: candidate.answer,
          solution: candidate.solution,
        });
        if (generatedMatch.recipe !== match.recipe) continue;
        candidates.push(candidate);
      } catch {
        /* Invalid/degenerate seeds are skipped, never silently accepted. */
      }
    }
    if (candidates.length !== 2)
      return unresolved(
        "insufficient-distinct-pair",
        "Exact template matched, but two safe numerical variations could not be produced.",
      );
    return {
      status: "matched",
      sourceId: source.id,
      sourceDigest: digest,
      candidates: candidates as [
        TextbookVariantCandidate,
        TextbookVariantCandidate,
      ],
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "no-exact-template";
    return unresolved(reason);
  }
}

/** Validate at the write boundary against the current source, including all authored fields. */
export function validateTextbookVariantPair(
  source: TextbookVariantSource,
  candidates: readonly TextbookVariantCandidate[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (
    candidates.length !== 2 ||
    candidates[0]?.slot !== 1 ||
    candidates[1]?.slot !== 2
  )
    issues.push("requires-slots-1-and-2");
  const current = generateTextbookVariantPair(source);
  if (current.status !== "matched")
    issues.push(`source-unresolved:${current.reason}`);
  if (
    candidates.some(
      (c) =>
        c.sourceId !== source.id ||
        c.originProblemId !== source.id ||
        c.sourceDigest !== textbookVariantSourceDigest(source),
    )
  )
    issues.push("source-provenance-or-digest-mismatch");
  if (
    current.status === "matched" &&
    JSON.stringify(stable(candidates)) !==
      JSON.stringify(stable(current.candidates))
  )
    issues.push("candidate-does-not-match-verified-recipe");
  if (
    candidates.some((c) => c.content === source.content) ||
    (candidates.length === 2 &&
      candidates[0]!.content === candidates[1]!.content)
  )
    issues.push("duplicate-question");
  return { valid: issues.length === 0, issues };
}
