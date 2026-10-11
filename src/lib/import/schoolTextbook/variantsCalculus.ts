/** Pending, source-specific calculus drafts. No database writes or review promotion. */
import {
  textbookVariantSourceDigest,
  TEXTBOOK_VARIANT_VERSION,
  type TextbookVariantCandidate,
  type TextbookVariantSource,
} from "./variants";

export type TextbookCalculusRecipe =
  | "calculus-tangent-at-point"
  | "calculus-tangent-given-slope"
  | "calculus-tangent-parallel"
  | "calculus-cubic-no-extrema"
  | "calculus-interval-root-parameter"
  | "calculus-functional-identity"
  | "calculus-tangent-through-point"
  | "calculus-quadratic-mvt"
  | "calculus-monic-cubic-limit-extremum"
  | "calculus-closed-interval-extrema"
  | "calculus-velocity-parameter"
  | "calculus-antiderivative"
  | "calculus-ftc-parameter"
  | "calculus-integral-identity"
  | "calculus-continuity-cancel-limit"
  | "calculus-symmetric-difference"
  | "calculus-product-identity-derivative"
  | "calculus-braking-distance"
  | "calculus-reverse-bound-integral"
  | "calculus-primitive-root-sum";
export type TextbookCalculusCandidate = Omit<
  TextbookVariantCandidate,
  "recipe"
> & {
  recipe: TextbookCalculusRecipe;
};
export type TextbookCalculusResult =
  | {
      status: "matched";
      sourceId: string;
      sourceDigest: string;
      candidates: [TextbookCalculusCandidate, TextbookCalculusCandidate];
    }
  | {
      status: "unresolved";
      sourceId: string;
      sourceDigest: string;
      reason: string;
      detail: string;
    };

type R = { n: bigint; d: bigint };
type P = Map<string, R>;
const Z = BigInt(0),
  O = BigInt(1);
const abs = (n: bigint) => (n < Z ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== Z) [a, b] = [b, a % b];
  return a;
}
function r(n: bigint | number, d: bigint | number = 1): R {
  n = BigInt(n);
  d = BigInt(d);
  if (d === Z) throw new Error("zero-denominator");
  if (d < Z) {
    n = -n;
    d = -d;
  }
  if (abs(n).toString().length > 60 || d.toString().length > 60)
    throw new Error("arithmetic-limit");
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const add = (a: R, b: R) => r(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: R) => r(-a.n, a.d);
const sub = (a: R, b: R) => add(a, neg(b));
const mul = (a: R, b: R) => r(a.n * b.n, a.d * b.d);
const div = (a: R, b: R) => r(a.n * b.d, a.d * b.n);
const eq = (a: R, b: R) => a.n === b.n && a.d === b.d;
const cmp = (a: R, b: R) => (a.n * b.d < b.n * a.d ? -1 : eq(a, b) ? 0 : 1);
const texR = (v: R): string =>
  v.d === O ? `${v.n}` : `${v.n < Z ? "-" : ""}\\frac{${abs(v.n)}}{${v.d}}`;
const key = (s: string) => [...s].sort().join("");
const constant = (v: R): P => (v.n === Z ? new Map() : new Map([["", v]]));
const variable = (name: string): P => new Map([[name, r(1)]]);
function put(p: P, name: string, v: R): void {
  const value = add(p.get(name) ?? r(0), v);
  if (value.n === Z) p.delete(name);
  else p.set(name, value);
}
function pAdd(a: P, b: P): P {
  const out = new Map(a);
  for (const [k, v] of b) put(out, k, v);
  return out;
}
const scale = (a: P, b: R): P =>
  new Map(
    [...a]
      .map(([k, v]) => [k, mul(v, b)])
      .filter(([, v]) => (v as R).n !== Z) as [string, R][],
  );
const pSub = (a: P, b: P) => pAdd(a, scale(b, r(-1)));
function pMul(a: P, b: P): P {
  const out: P = new Map();
  for (const [ak, av] of a)
    for (const [bk, bv] of b) {
      if (ak.length + bk.length > 9) throw new Error("degree-limit");
      put(out, key(ak + bk), mul(av, bv));
    }
  if (out.size > 70) throw new Error("term-limit");
  return out;
}
function power(p: P, n: number): P {
  if (!Number.isInteger(n) || n < 0 || n > 8) throw new Error("exponent-limit");
  let out = constant(r(1));
  for (let i = 0; i < n; i++) out = pMul(out, p);
  return out;
}
function scalar(p: P): R {
  if ([...p.keys()].some((k) => k !== "")) throw new Error("not-a-scalar");
  return p.get("") ?? r(0);
}
function diff(p: P, name = "x"): P {
  const out: P = new Map();
  for (const [k, v] of p) {
    const n = [...k].filter((c) => c === name).length;
    if (n) put(out, k.replace(name, ""), mul(v, r(n)));
  }
  return out;
}
function substitute(p: P, name: string, value: P): P {
  let out: P = new Map();
  for (const [k, v] of p) {
    const n = [...k].filter((c) => c === name).length;
    out = pAdd(
      out,
      pMul(new Map([[k.replaceAll(name, ""), v]]), power(value, n)),
    );
  }
  return out;
}
const at = (p: P, value: R, name = "x") =>
  scalar(substitute(p, name, constant(value)));
const coeff = (p: P, k: string) => p.get(key(k)) ?? r(0);
function degree(p: P, name = "x"): number {
  if ([...p.keys()].some((k) => k.replaceAll(name, "") !== ""))
    throw new Error("unexpected-variable");
  return Math.max(0, ...[...p.keys()].map((k) => k.length));
}
function texP(p: P): string {
  const entries = [...p].sort(([a], [b]) => {
    for (const v of ["x", "t", "a", "k"]) {
      const d = b.split(v).length - a.split(v).length;
      if (d) return d;
    }
    return a.localeCompare(b);
  });
  return (
    entries
      .map(([k, v], i) => {
        const variables = [...new Set(k)]
          .map((c) => {
            const n = k.split(c).length - 1;
            return n === 1 ? c : `${c}^{${n}}`;
          })
          .join("");
        const magnitude = r(abs(v.n), v.d);
        const coefficient = k && eq(magnitude, r(1)) ? "" : texR(magnitude);
        return (v.n < Z ? "-" : i ? "+" : "") + coefficient + variables;
      })
      .join("") || "0"
  );
}
function norm(math: string): string {
  return math
    .replace(/\\(?:left|right|bigl|bigr)\b/g, "")
    .replace(/\\dfrac\b/g, "\\frac")
    .replace(/\\(?:,|;|!|:|quad\b|qquad\b| )/g, "")
    .replace(/[\s~]/g, "")
    .replace(/[−–]/g, "-")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\le(?![a-z])/g, "\\leq");
}
/** Small exact polynomial grammar; functions, radicals and variable division fail closed. */
function parse(math: string): P {
  const text = norm(math);
  let pos = 0;
  function group(): P {
    const opening = text[pos++],
      close = opening === "(" ? ")" : "}";
    const p = sum();
    if (text[pos++] !== close) throw new Error("unbalanced-math");
    return p;
  }
  function atom(): P {
    if (text.startsWith("\\frac", pos)) {
      pos += 5;
      if (text[pos] !== "{") throw new Error("fraction-shape");
      const numerator = group();
      if (text[pos] !== "{") throw new Error("fraction-shape");
      return scale(numerator, div(r(1), scalar(group())));
    }
    if (text[pos] === "(" || text[pos] === "{") return group();
    const m = /^\d+(?:\.\d+)?/.exec(text.slice(pos));
    if (m) {
      pos += m[0].length;
      const [whole, decimals = ""] = m[0].split(".");
      return constant(
        r(BigInt(whole! + decimals), BigInt(10) ** BigInt(decimals.length)),
      );
    }
    if (/[xtak]/.test(text[pos] ?? "") && pos < text.length)
      return variable(text[pos++]!);
    throw new Error("unsupported-calculus-math");
  }
  function raised(): P {
    let p = atom();
    if (text[pos] === "^") {
      pos++;
      const value = text[pos] === "{" ? scalar(group()) : scalar(atom());
      if (value.d !== O) throw new Error("noninteger-power");
      p = power(p, Number(value.n));
    }
    return p;
  }
  function unary(): P {
    if (text[pos] === "+") {
      pos++;
      return unary();
    }
    if (text[pos] === "-") {
      pos++;
      return scale(unary(), r(-1));
    }
    return raised();
  }
  function product(): P {
    let p = unary();
    while (pos < text.length) {
      if (text[pos] === "*") {
        pos++;
        p = pMul(p, unary());
      } else if (text[pos] === "/") {
        pos++;
        p = scale(p, div(r(1), scalar(unary())));
      } else if (/[\dxtak({\\]/.test(text[pos]!)) p = pMul(p, unary());
      else break;
    }
    return p;
  }
  function sum(): P {
    let p = product();
    while (text[pos] === "+" || text[pos] === "-") {
      const op = text[pos++];
      const q = product();
      p = op === "+" ? pAdd(p, q) : pSub(p, q);
    }
    return p;
  }
  const out = sum();
  if (pos !== text.length) throw new Error("unsupported-calculus-math");
  return out;
}
const number = (math: string) => scalar(parse(math));
function sqrtInteger(n: bigint): bigint | null {
  if (n < Z) return null;
  let lo = Z,
    hi = n + O;
  while (hi - lo > O) {
    const m = (hi + lo) / BigInt(2);
    if (m * m > n) hi = m;
    else lo = m;
  }
  return lo * lo === n ? lo : null;
}
function sqrtR(v: R): R | null {
  const n = sqrtInteger(v.n),
    d = sqrtInteger(v.d);
  return n === null || d === null ? null : r(n, d);
}
function divisors(n: bigint): bigint[] {
  n = abs(n);
  if (n > BigInt(2000000)) throw new Error("root-search-limit");
  const values: bigint[] = [];
  for (let i = O; i * i <= n; i++)
    if (n % i === Z) {
      values.push(i);
      if (i * i !== n) values.push(n / i);
    }
  return values;
}
/** Return ALL real roots, or reject if any real root cannot be represented exactly here. */
function roots(p: P, name = "x"): R[] {
  const n = degree(p, name);
  if (n === 0) {
    if (!p.size) throw new Error("nonunique-contact-equation");
    return [];
  }
  const a = coeff(p, name.repeat(n));
  if (n === 1) return [div(neg(coeff(p, "")), a)];
  if (n === 2) {
    const b = coeff(p, name),
      c = coeff(p, ""),
      disc = sub(mul(b, b), mul(r(4), mul(a, c)));
    if (disc.n < Z) return [];
    const s = sqrtR(disc);
    if (!s) throw new Error("irrational-contact-or-critical-point");
    return [
      ...new Map(
        [
          div(sub(neg(b), s), mul(r(2), a)),
          div(add(neg(b), s), mul(r(2), a)),
        ].map((v) => [texR(v), v]),
      ).values(),
    ].sort(cmp);
  }
  if (n !== 3) throw new Error("root-degree-limit");
  let root: R | undefined;
  if (coeff(p, "").n === Z) root = r(0);
  else {
    const denominator = [...p.values()].reduce(
      (d, v) => (d / gcd(d, v.d)) * v.d,
      O,
    );
    const numeratorFactors = divisors(mul(coeff(p, ""), r(denominator)).n);
    const denominatorFactors = divisors(mul(a, r(denominator)).n);
    search: for (const num of numeratorFactors)
      for (const den of denominatorFactors)
        for (const sign of [1, -1]) {
          const candidate = r(num * BigInt(sign), den);
          if (at(p, candidate, name).n === Z) {
            root = candidate;
            break search;
          }
        }
  }
  if (!root) throw new Error("unproved-real-roots");
  const quotient: P = new Map();
  let carry = a;
  put(quotient, name.repeat(n - 1), carry);
  for (let i = n - 1; i >= 1; i--) {
    carry = add(coeff(p, name.repeat(i)), mul(carry, root));
    put(quotient, name.repeat(i - 1), carry);
  }
  if (!eq(add(coeff(p, ""), mul(carry, root)), r(0)))
    throw new Error("root-division-failed");
  return [
    ...new Map(
      [root, ...roots(quotient, name)].map((v) => [texR(v), v]),
    ).values(),
  ].sort(cmp);
}
function primitive(p: P, name = "x"): P {
  const out: P = new Map();
  for (const [k, v] of p) {
    const n = k.split(name).length;
    put(out, key(k + name), div(v, r(n)));
  }
  if (pSub(diff(out, name), p).size)
    throw new Error("primitive-derivative-mismatch");
  return out;
}
const translate = (p: P, d: R, name = "x") =>
  substitute(p, name, pSub(variable(name), constant(d)));
function affineSolve(p: P, name: string): R {
  if (degree(p, name) !== 1) throw new Error("nonunique-parameter");
  const result = div(neg(coeff(p, "")), coeff(p, name));
  if (at(p, result, name).n !== Z)
    throw new Error("parameter-substitution-failed");
  return result;
}

const LABEL = /⑴|⑵|⑶|⑷|⑸|⑹|\([1-6]\)/g;
function labelParts(text: string): { text: string; start: number }[] {
  const prose = text.replace(/\$[^$]+\$/g, (m) => " ".repeat(m.length));
  return [...prose.matchAll(LABEL)].map((m) => ({
    text: m[0],
    start: m.index!,
  }));
}
const labels = (text: string) => labelParts(text).map((p) => p.text);
const labelOrdinal = (label: string) =>
  "⑴⑵⑶⑷⑸⑹".includes(label)
    ? "⑴⑵⑶⑷⑸⑹".indexOf(label) + 1
    : Number(label.slice(1, -1));
type Part = { math: string; start: number; end: number };
function parts(text: string): Part[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((m) => ({
    math: m[1]!,
    start: m.index!,
    end: m.index! + m[0].length,
  }));
}
function replaceParts(content: string, values: string[]): string {
  const pp = parts(content);
  if (pp.length !== values.length) throw new Error("math-part-count-changed");
  let out = content;
  for (let i = pp.length - 1; i >= 0; i--)
    out = out.slice(0, pp[i]!.start) + `$${values[i]}$` + out.slice(pp[i]!.end);
  return out;
}
const frame = (text: string) =>
  text
    .replace(/\$[^$]+\$/g, "§")
    .replace(/\s+/g, "")
    .replace(LABEL, "#");
const assignment = (text: string, prefix: string) => {
  const value = norm(text);
  if (!value.startsWith(prefix)) throw new Error("function-assignment-shape");
  return parse(value.slice(prefix.length));
};
function coordinate(text: string, opening = "(", closing = ")"): [R, R] {
  const normalized = norm(text);
  if (!normalized.startsWith(opening) || !normalized.endsWith(closing))
    throw new Error("coordinate-or-domain-shape");
  const pair = normalized.slice(1, -1).split(",");
  if (pair.length !== 2) throw new Error("coordinate-or-domain-shape");
  return [number(pair[0]!), number(pair[1]!)];
}
const pointTex = (a: R, b: R, open = "(", close = ")") =>
  `${open}${texR(a)},~${texR(b)}${close}`;
const tangent = (p: P, a: R): P =>
  pAdd(
    scale(variable("x"), at(diff(p), a)),
    constant(sub(at(p, a), mul(a, at(diff(p), a)))),
  );
type Answer = P | string;
type Draft = {
  recipe: TextbookCalculusRecipe;
  content: string;
  answers: Answer[][];
  solutions: string[];
  checks: string[];
  structure: string;
};
const mathAnswer = (answer: Answer) =>
  typeof answer === "string" ? answer : texP(answer);
function checkSourceAnswers(source: TextbookVariantSource, draft: Draft): void {
  const questionLabels = labels(source.content),
    answerLabels = labelParts(source.answer);
  if (
    questionLabels.length !== answerLabels.length ||
    questionLabels.some(
      (v, i) => labelOrdinal(v) !== labelOrdinal(answerLabels[i]!.text),
    )
  )
    throw new Error("source-answer-labels");
  const answerGroups = questionLabels.length
    ? answerLabels.map((p, i) =>
        source.answer.slice(
          p.start + p.text.length,
          answerLabels[i + 1]?.start,
        ),
      )
    : [source.answer];
  if (answerGroups.length !== draft.answers.length)
    throw new Error("source-answer-shape");
  for (let i = 0; i < answerGroups.length; i++) {
    const actual = parts(answerGroups[i]!).map((p) =>
      norm(p.math).replace(/^(?:y=|f\(x\)=|k=|a=)/, ""),
    );
    const expected = draft.answers[i]!;
    if (actual.length !== expected.length)
      throw new Error("source-answer-shape");
    const unmatched = [...actual];
    for (const v of expected) {
      const index = unmatched.findIndex((text) => {
        try {
          return typeof v === "string"
            ? norm(text) === norm(v)
            : pSub(parse(text), v).size === 0;
        } catch {
          return false;
        }
      });
      if (index < 0) throw new Error("source-answer-mismatch");
      unmatched.splice(index, 1);
    }
  }
}
function answerText(source: TextbookVariantSource, draft: Draft): string {
  const questionLabels = labels(source.content);
  const isLine =
    draft.recipe.startsWith("calculus-tangent-") &&
    draft.recipe !== "calculus-tangent-through-point" &&
    !source.content.includes("기울기를 구하시오");
  if (
    draft.recipe === "calculus-closed-interval-extrema" &&
    draft.answers[0]?.length === 2
  )
    return `최댓값 $${mathAnswer(draft.answers[0][0]!)}$, 최솟값 $${mathAnswer(draft.answers[0][1]!)}$`;
  return draft.answers
    .map(
      (group, i) =>
        (questionLabels[i] ? `${questionLabels[i]} ` : "") +
        group
          .map((v) => `$${isLine ? "y=" : ""}${mathAnswer(v)}$`)
          .join(" 또는 "),
    )
    .join(" ");
}

/** Match full prose frames and every mathematical field, never the chapter or source ID alone. */
function solve(source: TextbookVariantSource, slot: 0 | 1 | 2): Draft {
  const pp = parts(source.content).map((p) => norm(p.math)),
    skeleton = frame(source.content);
  const q = r(slot + 1),
    d = r(slot),
    revised = [...pp];
  const solutions: string[] = [],
    answers: Answer[][] = [],
    checks: string[] = [];
  let recipe: TextbookCalculusRecipe;
  const finish = (structure: string): Draft => ({
    recipe,
    content: slot ? replaceParts(source.content, revised) : source.content,
    answers,
    solutions,
    checks,
    structure,
  });
  const polynomial = (text: string, prefix: string, name = "x"): P => {
    const p = assignment(text, prefix);
    const n = degree(p, name);
    if (n < 1 || n > 4) throw new Error("unsupported-polynomial-degree");
    return p;
  };

  const atPoint =
    /^(?:다음곡선위의(?:주어진)?점에서의접선의(?:방정식을|기울기를)구하시오\.(?:#§,?§)+|곡선§위의점§에서의접선의(?:방정식을|기울기를)구하시오\.|다음접선의방정식을구하시오\.(?:#곡선§위의점§에서의접선)+)$/;
  if (atPoint.test(skeleton)) {
    recipe = "calculus-tangent-at-point";
    if (pp.length % 2) throw new Error("tangent-parts");
    for (let i = 0; i < pp.length; i += 2) {
      const p = polynomial(pp[i]!, "y="),
        [a, b] = coordinate(pp[i + 1]!);
      if (!eq(at(p, a), b)) throw new Error("source-point-off-curve");
      const f = scale(translate(p, d), q),
        contact = add(a, d),
        line = tangent(f, contact),
        slope = at(diff(f), contact);
      revised[i] = `y=${texP(f)}`;
      revised[i + 1] = pointTex(contact, mul(b, q));
      answers.push([
        source.content.includes("기울기를 구하시오") ? constant(slope) : line,
      ]);
      solutions.push(
        `$f(x)=${texP(f)}$이면 $f'(x)=${texP(diff(f))}$이다. $f(${texR(contact)})=${texR(at(f, contact))}$이므로 주어진 점은 곡선 위에 있다. 접선의 기울기는 $f'(${texR(contact)})=${texR(slope)}$이고, 접선은 $y=${texP(line)}$이다.`,
      );
    }
    checks.push("all-stated-points-on-curves", "tangent-value-and-derivative");
    return finish(`numeric-polynomial-tangent:${pp.length / 2}`);
  }
  const globalSlope =
    /^다음곡선에접하고기울기가§인직선의방정식을구하시오\.(?:#§)+$/;
  const localSlope =
    /^다음접선의방정식을구하시오\.(?:#곡선§에접하고기울기가§인접선)+$/;
  const singleSlope = /^곡선§에접하고기울기가§인접선의방정식을구하시오\.$/;
  const parallel =
    /^다음을구하시오\.(?:#곡선§에접하고직선§에평행한직선의방정식)+$/;
  if (
    globalSlope.test(skeleton) ||
    localSlope.test(skeleton) ||
    singleSlope.test(skeleton) ||
    parallel.test(skeleton)
  ) {
    const shared = globalSlope.test(skeleton),
      isParallel = parallel.test(skeleton);
    recipe = isParallel
      ? "calculus-tangent-parallel"
      : "calculus-tangent-given-slope";
    const groups = shared
      ? pp.slice(1).map((_, i) => [i + 1, 0])
      : pp.filter((_, i) => i % 2 === 0).map((_, i) => [2 * i, 2 * i + 1]);
    if (!shared && pp.length % 2) throw new Error("tangent-parts");
    for (const [pi, mi] of groups) {
      const p = polynomial(pp[pi!]!, "y="),
        line = isParallel ? assignment(pp[mi!]!, "y=") : undefined;
      if (line && degree(line) !== 1) throw new Error("parallel-line-shape");
      const slope = line ? coeff(line, "x") : number(pp[mi!]!);
      const f = scale(translate(p, d), q),
        nextSlope = mul(slope, q);
      const contacts = roots(pSub(diff(f), constant(nextSlope)));
      if (!contacts.length) throw new Error("no-real-contact");
      const lines = contacts.map((a) => tangent(f, a));
      revised[pi!] = `y=${texP(f)}`;
      revised[mi!] = line
        ? `y=${texP(scale(translate(line, d), q))}`
        : texR(nextSlope);
      answers.push(lines);
      solutions.push(
        `$f'(x)=${texP(diff(f))}$이다. 접선의 기울기가 $${texR(nextSlope)}$이므로 $f'(a)=${texR(nextSlope)}$을 풀면 모든 실수 접점의 $x$좌표는 ${contacts.map((a) => `$${texR(a)}$`).join(", ")}이다. 각 접점에서 $y=f'(a)(x-a)+f(a)$을 적용하면 ${lines.map((p) => `$y=${texP(p)}$`).join(" 또는 ")}이다.`,
      );
    }
    checks.push(
      "all-real-contact-roots",
      "contact-equation-exact",
      "tangent-value-and-derivative",
    );
    return finish(
      `polynomial-slope-contact:${answers.map((a) => a.length).join(",")}`,
    );
  }
  if (
    skeleton === "다음함수가극값을갖지않도록하는실수§의값의범위를구하시오.#§#§"
  ) {
    recipe = "calculus-cubic-no-extrema";
    if (pp[0] !== "a") throw new Error("parameter-shape");
    for (let i = 1; i < pp.length; i++) {
      const p = assignment(pp[i]!, "f(x)="),
        f = substitute(p, "a", scale(variable("a"), q));
      const derivative = diff(f),
        aa = xCoefficient(derivative, 2),
        bb = xCoefficient(derivative, 1),
        cc = xCoefficient(derivative, 0);
      if (
        !scalar(aa).n ||
        [...derivative.keys()].some((k) => k.split("x").length > 3)
      )
        throw new Error("not-a-cubic");
      const discriminant = pSub(pMul(bb, bb), scale(pMul(aa, cc), r(4)));
      const bounds = nonpositiveQuadratic(discriminant, "a");
      revised[i] = `f(x)=${texP(f)}`;
      answers.push([bounds]);
      solutions.push(
        `$f'(x)=${texP(derivative)}$이다. 삼차함수가 극값을 갖지 않으려면 이 이차 도함수의 판별식이 $0$ 이하이어야 한다. 판별식은 $D=${texP(discriminant)}$이므로 $D\\leq0$을 풀면 $${bounds}$이다. $D=0$인 경계에서는 도함수가 부호를 바꾸지 않으므로 극값이 생기지 않는다.`,
      );
    }
    checks.push(
      "cubic-leading-coefficient-nonzero",
      "derivative-discriminant-nonpositive-including-boundary",
    );
    return finish("cubic-discriminant-parameter:2");
  }
  if (
    skeleton ===
    "방정식§이열린구간§에서적어도하나의실근을갖도록하는실수§의값의범위를구하시오."
  ) {
    recipe = "calculus-interval-root-parameter";
    if (pp[2] !== "k" || !pp[0]!.endsWith("=0"))
      throw new Error("parameter-shape");
    const p = parse(pp[0]!.slice(0, -2)),
      coefficient = coeff(p, "k");
    const body = pSub(p, scale(variable("k"), coefficient));
    degree(body);
    if (!coefficient.n) throw new Error("parameter-shape");
    const [lower, upper] = coordinate(pp[1]!);
    if (cmp(lower, upper) >= 0) throw new Error("empty-domain");
    const f = scale(translate(body, d), q),
      lo = add(lower, d),
      hi = add(upper, d);
    const derivative = diff(f);
    if (
      degree(f) !== 2 ||
      cmp(at(derivative, lo), r(0)) * cmp(at(derivative, hi), r(0)) < 0 ||
      (!at(derivative, lo).n && !at(derivative, hi).n)
    )
      throw new Error("interval-not-monotone");
    const endpoints = [
      div(neg(at(f, lo)), coefficient),
      div(neg(at(f, hi)), coefficient),
    ].sort(cmp);
    const range = `${texR(endpoints[0]!)}<k<${texR(endpoints[1]!)}`;
    revised[0] = `${texP(pAdd(f, scale(variable("k"), coefficient)))}=0`;
    revised[1] = pointTex(lo, hi);
    answers.push([range]);
    solutions.push(
      `$${texP(pAdd(f, scale(variable("k"), coefficient)))}=0$을 $k=-(${texP(f)})/(${texR(coefficient)})$로 정리한다. 이 함수의 도함수는 열린구간에서 부호가 바뀌지 않으므로 엄격히 단조이다. 양 끝에서의 값은 $${texR(endpoints[0]!)}$, $${texR(endpoints[1]!)}$이고, 끝점은 포함되지 않으므로 필요한 범위는 $${range}$이다.`,
    );
    checks.push(
      "strict-monotone-image",
      "open-endpoints-excluded",
      "root-domain-equivalence",
    );
    return finish("quadratic-monotone-open-interval-parameter");
  }
  if (
    skeleton ===
    "이차함수§가모든실수§에대하여§를만족시키고§일때,§의값을구하시오."
  ) {
    recipe = "calculus-functional-identity";
    requireMath(pp, { 0: "f(x)", 1: "x", 2: "f(f'(x))=f'(f(x))" });
    const given = functionValue(pp[3]!),
      target = functionArgument(pp[4]!);
    const a = add(given.point, d),
      value = add(given.value, d),
      b = add(target, d);
    const f = pAdd(
      scale(power(variable("x"), 2), r(1, 2)),
      constant(sub(value, mul(r(1, 2), mul(a, a)))),
    );
    if (pSub(substitute(f, "x", diff(f)), substitute(diff(f), "x", f)).size)
      throw new Error("functional-identity-failed");
    revised[3] = `f(${texR(a)})=${texR(value)}`;
    revised[4] = `f(${texR(b)})`;
    answers.push([constant(at(f, b))]);
    solutions.push(
      `$f(x)=Ax^{2}+Bx+C$ $(A\\neq0)$로 놓는다. $f(f'(x))=f'(f(x))$의 $x^{2}$ 계수를 비교하면 $4A^{3}=2A^{2}$이므로 $A=\\frac12$이다. $x$ 계수를 비교하면 $B(2A+B)=2AB$이므로 $B^{2}=0$, $B=0$이다. 따라서 $f(x)=\\frac12x^{2}+C$이다. $f(${texR(a)})=${texR(value)}$를 대입하면 $f(x)=${texP(f)}$이고 $f(${texR(b)})=${texR(at(f, b))}$이다.`,
    );
    checks.push(
      "identity-coefficients-unique-quadratic",
      "functional-identity-expanded-exact",
      "given-value-substituted",
    );
    return finish("quadratic-derivative-composition-identity");
  }
  if (skeleton === "점§에서곡선§에그은접선의§절편을구하시오.") {
    recipe = "calculus-tangent-through-point";
    if (pp[2] !== "x") throw new Error("requested-intercept-shape");
    const [u, v] = coordinate(pp[0]!),
      p = polynomial(pp[1]!, "y=");
    const f = scale(translate(p, d), q),
      point = add(u, d),
      value = mul(v, q);
    const contactEquation = pSub(
      pAdd(f, pMul(diff(f), pSub(constant(point), variable("x")))),
      constant(value),
    );
    const contacts = roots(contactEquation);
    if (contacts.length !== 1) throw new Error("nonunique-tangent-intercept");
    const contact = contacts[0]!,
      line = tangent(f, contact),
      slope = coeff(line, "x");
    if (!slope.n || !eq(at(line, point), value))
      throw new Error("invalid-tangent-intercept");
    const intercept = div(neg(coeff(line, "")), slope);
    revised[0] = pointTex(point, value);
    revised[1] = `y=${texP(f)}`;
    answers.push([constant(intercept)]);
    solutions.push(
      `접점의 $x$좌표를 $a$라 하면 $f'(x)=${texP(diff(f))}$이고, 접선이 주어진 점을 지나려면 $f(a)+f'(a)(${texR(point)}-a)=${texR(value)}$이어야 한다. 이는 $${texP(contactEquation)}=0$이며 모든 실근을 구하면 $a=${texR(contact)}$ 하나이다. 따라서 접선은 $y=${texP(line)}$이다. 기울기가 $${texR(slope)}\\neq0$이므로 $y=0$을 대입한 $x$절편은 $${texR(intercept)}$이다.`,
    );
    checks.push(
      "all-real-contact-roots",
      "external-point-on-tangent",
      "nonzero-slope-for-intercept",
    );
    return finish("unique-real-tangent-through-point-intercept");
  }
  if (
    skeleton ===
    "함수§에대하여닫힌구간§에서§§가§를만족시킬때,§의값을구하시오.(단,§)"
  ) {
    recipe = "calculus-quadratic-mvt";
    requireMath(pp, {
      1: "[a-h,a]",
      2: "k",
      3: "(0<k<1)",
      4: "f(a)=f(a-h)+hf'(a-kh)",
      5: "k",
      6: "h>0",
    });
    const p = polynomial(pp[0]!, "f(x)=");
    if (degree(p) !== 2) throw new Error("not-quadratic");
    const f = scale(translate(p, d), q),
      aa = coeff(f, "xx");
    revised[0] = `f(x)=${texP(f)}`;
    answers.push([constant(r(1, 2))]);
    solutions.push(
      `$f(x)=${texP(f)}$이고 $f'(x)=${texP(diff(f))}$이다. $f(a)-f(a-h)=h(${texR(mul(r(2), aa))}a${signed(coeff(f, "x"))})${signed(neg(aa))}h^{2}$이다. 한편 $hf'(a-kh)=h(${texR(mul(r(2), aa))}a${signed(coeff(f, "x"))})${signed(neg(mul(r(2), aa)))}kh^{2}$이다. 두 식을 같게 놓으면 $${texR(aa)}h^{2}(2k-1)=0$이다. $h>0$이고 이차항 계수가 $0$이 아니므로 $k=\\frac12$이며 $0<k<1$을 만족한다.`,
    );
    checks.push(
      "quadratic-mvt-identity",
      "h-positive-and-k-in-open-unit-interval",
    );
    return finish("quadratic-mvt-center-fraction");
  }
  if (
    skeleton ===
    "최고차항의계수가§인삼차함수§가§에서극댓값을갖고,§를만족시킨다.이때§의값을구하시오."
  ) {
    recipe = "calculus-monic-cubic-limit-extremum";
    requireMath(pp, { 0: "1", 1: "f(x)" });
    if (!pp[2]!.startsWith("x=")) throw new Error("extremum-point-shape");
    const maximum = number(pp[2]!.slice(2)),
      info = monicLimit(pp[3]!),
      target = functionArgument(pp[4]!);
    const maxAt = add(maximum, d),
      limitAt = add(info.point, d),
      value = add(info.value, d),
      targetAt = add(target, d);
    if (eq(maxAt, limitAt)) throw new Error("nonunique-cubic-conditions");
    // f'(r)=0, f(z)=L, f'(z)=m determine A,B,C uniquely.
    const aa = div(
      sub(info.slope, mul(r(3), sub(mul(limitAt, limitAt), mul(maxAt, maxAt)))),
      mul(r(2), sub(limitAt, maxAt)),
    );
    const bb = neg(
      add(mul(r(3), mul(maxAt, maxAt)), mul(r(2), mul(aa, maxAt))),
    );
    const cc = sub(
      value,
      add(
        add(
          mul(mul(limitAt, limitAt), limitAt),
          mul(aa, mul(limitAt, limitAt)),
        ),
        mul(bb, limitAt),
      ),
    );
    const f = new Map(
      [
        ["xxx", r(1)],
        ["xx", aa],
        ["x", bb],
        ["", cc],
      ].filter(([, v]) => (v as R).n !== Z) as [string, R][],
    );
    if (
      at(diff(f), maxAt).n ||
      !eq(at(f, limitAt), value) ||
      !eq(at(diff(f), limitAt), info.slope) ||
      at(diff(diff(f)), maxAt).n >= Z
    )
      throw new Error("local-maximum-or-limit-failed");
    revised[2] = `x=${texR(maxAt)}`;
    revised[3] = `\\lim_{x\\to ${texR(limitAt)}}\\frac{f(x)${signed(neg(value))}}{${texP(pSub(variable("x"), constant(limitAt)))}}=${texR(info.slope)}`;
    revised[4] = `f(${texR(targetAt)})`;
    answers.push([constant(at(f, targetAt))]);
    solutions.push(
      `유한한 극한이 존재하므로 $f(${texR(limitAt)})=${texR(value)}$이고, 주어진 극한은 $f'(${texR(limitAt)})=${texR(info.slope)}$이다. 또 $x=${texR(maxAt)}$에서 극댓값을 가지므로 $f'(${texR(maxAt)})=0$이다. $f(x)=x^{3}+Ax^{2}+Bx+C$에 이 세 조건을 대입하여 연립하면 $A=${texR(aa)}$, $B=${texR(bb)}$, $C=${texR(cc)}$이다. 즉 $f(x)=${texP(f)}$이다. $f''(${texR(maxAt)})=${texR(at(diff(diff(f)), maxAt))}<0$이므로 실제로 극댓값을 갖는다. 따라서 $f(${texR(targetAt)})=${texR(at(f, targetAt))}$이다.`,
    );
    checks.push(
      "finite-limit-value-and-derivative",
      "unique-monic-cubic",
      "local-maximum-second-derivative-negative",
    );
    return finish("monic-cubic-value-slope-and-local-maximum");
  }
  const extremaDifference =
    "닫힌구간§에서함수§의최댓값을§,최솟값을§이라고할때,§의값을구하시오.";
  const extremaBoth = "닫힌구간§에서함수§의최댓값과최솟값을구하시오.";
  if (skeleton === extremaDifference || skeleton === extremaBoth) {
    recipe = "calculus-closed-interval-extrema";
    if (skeleton === extremaDifference)
      requireMath(pp, { 2: "M", 3: "m", 4: "M-m" });
    const [lower, upper] = coordinate(pp[0]!, "[", "]"),
      p = polynomial(pp[1]!, "f(x)=");
    if (cmp(lower, upper) >= 0) throw new Error("empty-domain");
    const f = scale(translate(p, d), q),
      lo = add(lower, d),
      hi = add(upper, d);
    const critical = roots(diff(f)).filter(
      (v) => cmp(v, lo) >= 0 && cmp(v, hi) <= 0,
    );
    const domainPoints = [
      ...new Map([lo, ...critical, hi].map((v) => [texR(v), v])).values(),
    ].sort(cmp);
    const values = domainPoints.map((v) => at(f, v)).sort(cmp),
      min = values[0]!,
      max = values[values.length - 1]!;
    revised[0] = pointTex(lo, hi, "[", "]");
    revised[1] = `f(x)=${texP(f)}`;
    answers.push(
      skeleton === extremaBoth
        ? [constant(max), constant(min)]
        : [constant(sub(max, min))],
    );
    solutions.push(
      `$f'(x)=${texP(diff(f))}$이다. 도함수의 모든 실근 중 닫힌구간 안의 점은 ${critical.length ? critical.map((v) => `$${texR(v)}$`).join(", ") : "없다"}. 양 끝점과 이 점을 모두 대입하면 ${domainPoints.map((v) => `$f(${texR(v)})=${texR(at(f, v))}$`).join(", ")}이다. 따라서 최댓값은 $${texR(max)}$, 최솟값은 $${texR(min)}$이며 그 차는 $${texR(sub(max, min))}$이다.`,
    );
    checks.push(
      "all-real-critical-points",
      "closed-endpoints-and-domain-filter",
      "extrema-from-all-domain-candidates",
    );
    return finish("closed-interval-polynomial-global-extrema");
  }
  if (
    skeleton ===
    "수직선위를움직이는점§의시각§에서의위치§가§이다.§에서의점§의속도가§일때,상수§의값을구하시오."
  ) {
    recipe = "calculus-velocity-parameter";
    requireMath(pp, {
      0: "\\mathrm{P}",
      1: "t",
      2: "x",
      5: "\\mathrm{P}",
      7: "k",
    });
    if (!pp[4]!.startsWith("t=")) throw new Error("time-shape");
    const p = assignment(pp[3]!, "x="),
      known = substitute(p, "k", constant(r(0))),
      parameter = pSub(p, known);
    if ([...parameter.keys()].some((k) => k.split("k").length !== 2))
      throw new Error("parameter-shape");
    const f = pAdd(scale(known, q), parameter),
      time = add(number(pp[4]!.slice(2)), d),
      velocity = mul(number(pp[6]!), q);
    if (time.n < Z) throw new Error("negative-time");
    const equation = pSub(
        substitute(diff(f, "t"), "t", constant(time)),
        constant(velocity),
      ),
      value = affineSolve(equation, "k");
    revised[3] = `x=${texP(f)}`;
    revised[4] = `t=${texR(time)}`;
    revised[6] = texR(velocity);
    answers.push([constant(value)]);
    solutions.push(
      `위치를 미분하면 속도는 $v(t)=${texP(diff(f, "t"))}$이다. $t=${texR(time)}$에서의 속도가 $${texR(velocity)}$이므로 $${texP(equation)}=0$이다. 이를 풀면 $k=${texR(value)}$이고, 다시 속도 식에 대입하면 주어진 속도와 일치한다.`,
    );
    checks.push(
      "velocity-is-position-derivative",
      "nonnegative-time",
      "unique-parameter-and-substitution",
    );
    return finish("polynomial-position-linear-parameter-velocity");
  }
  if (skeleton === "함수§의부정적분중하나가§일때,§의값을구하시오.") {
    recipe = "calculus-antiderivative";
    requireMath(pp, { 0: "f(x)" });
    const p = parse(pp[1]!);
    degree(p);
    const f = scale(translate(p, d), q),
      point = add(functionArgument(pp[2]!), d);
    revised[1] = texP(f);
    revised[2] = `f(${texR(point)})`;
    answers.push([constant(at(diff(f), point))]);
    solutions.push(
      `주어진 부정적분 중 하나를 $F(x)=${texP(f)}$라고 하면 $f(x)=F'(x)=${texP(diff(f))}$이다. 따라서 $f(${texR(point)})=${texR(at(diff(f), point))}$이다.`,
    );
    checks.push("antiderivative-differentiated-exact");
    return finish("given-polynomial-antiderivative-value");
  }
  if (skeleton === "함수§에대하여§일때,§의값을구하시오.(단,§는상수)") {
    recipe = "calculus-ftc-parameter";
    if (pp[3] !== "a") throw new Error("parameter-shape");
    const m = /^f\(x\)=\\frac\{d\}\{dx\}\\int_\{(.+)\}\^\{x\}\((.+)\)dt$/.exec(
      pp[0]!,
    );
    if (!m) throw new Error("ftc-shape");
    const p = parse(m[2]!),
      parameter = coeff(p, "a"),
      known = pSub(p, scale(variable("a"), parameter));
    degree(known, "t");
    if (!parameter.n) throw new Error("parameter-shape");
    const given = functionValue(pp[1]!),
      point = add(given.point, d),
      target = add(functionArgument(pp[2]!), d),
      value = add(mul(given.value, q), d);
    const integrand = pAdd(
      scale(translate(known, d, "t"), q),
      scale(variable("a"), parameter),
    );
    const parameterValue = div(
      sub(
        value,
        at(
          integrand.size
            ? substitute(integrand, "a", constant(r(0)))
            : integrand,
          point,
          "t",
        ),
      ),
      parameter,
    );
    const f = substitute(
      substitute(integrand, "a", constant(parameterValue)),
      "t",
      variable("x"),
    );
    if (!eq(at(f, point), value)) throw new Error("ftc-parameter-failed");
    revised[0] = `f(x)=\\frac{d}{dx}\\int_{${texR(add(number(m[1]!), d))}}^{x}(${texP(integrand)})dt`;
    revised[1] = `f(${texR(point)})=${texR(value)}`;
    revised[2] = `f(${texR(target)})`;
    answers.push([constant(at(f, target))]);
    solutions.push(
      `적분과 미분의 관계에 따라 $f(x)=${texP(substitute(integrand, "t", variable("x")))}$이다. $f(${texR(point)})=${texR(value)}$를 대입하면 $a=${texR(parameterValue)}$이다. 따라서 $f(x)=${texP(f)}$이고 $f(${texR(target)})=${texR(at(f, target))}$이다.`,
    );
    checks.push(
      "ftc-continuous-polynomial-integrand",
      "parameter-and-given-value-exact",
    );
    return finish("ftc-polynomial-additive-parameter");
  }
  if (skeleton === "함수§가모든실수§에대하여§를만족시킬때,§의값을구하시오.") {
    recipe = "calculus-integral-identity";
    requireMath(pp, { 0: "f(x)", 1: "x" });
    const m = /^\\int_\{(.+)\}\^\{x\}f\(t\)dt=(.+)$/.exec(pp[2]!);
    if (!m) throw new Error("integral-identity-shape");
    const lower = number(m[1]!),
      p = parse(m[2]!);
    degree(p);
    if (at(p, lower).n) throw new Error("integral-basepoint-inconsistent");
    const f = scale(translate(p, d), q),
      lo = add(lower, d),
      target = add(functionArgument(pp[3]!), d);
    if (at(f, lo).n) throw new Error("integral-basepoint-inconsistent");
    revised[2] = `\\int_{${texR(lo)}}^{x}f(t)dt=${texP(f)}`;
    revised[3] = `f(${texR(target)})`;
    answers.push([constant(at(diff(f), target))]);
    solutions.push(
      `$x=${texR(lo)}$에서 우변은 $0$이므로 적분의 아래끝 조건과 일치한다. 양변을 $x$에 대하여 미분하면 $f(x)=${texP(diff(f))}$이다. 따라서 $f(${texR(target)})=${texR(at(diff(f), target))}$이다.`,
    );
    checks.push("integral-basepoint-zero", "ftc-identity-differentiated");
    return finish("polynomial-integral-identity-value");
  }
  if (skeleton === "모든실수§에서연속인함수§가§을만족시킬때,§의값을구하시오.") {
    recipe = "calculus-continuity-cancel-limit";
    requireMath(pp, { 0: "x", 1: "f(x)" });
    const m = /^\\lim_\{x\\to(.+)\}\\frac\{\((.+)\)f\(x\)\}\{(.+)\}=(.+)$/.exec(
      pp[2]!,
    );
    if (!m) throw new Error("continuity-limit-shape");
    const limitAt = number(m[1]!),
      numerator = parse(m[2]!),
      denominator = parse(m[3]!);
    degree(numerator);
    if (
      degree(denominator) !== 1 ||
      at(numerator, limitAt).n ||
      at(denominator, limitAt).n ||
      !eq(functionArgument(pp[3]!), limitAt)
    )
      throw new Error("limit-cancellation-shape");
    const n = scale(translate(numerator, d), q),
      den = translate(denominator, d),
      point = add(limitAt, d),
      value = add(mul(number(m[4]!), q), d);
    const factor = div(at(diff(n), point), at(diff(den), point));
    if (!factor.n) throw new Error("zero-limit-factor");
    const result = div(value, factor);
    revised[2] = `\\lim_{x\\to ${texR(point)}}\\frac{(${texP(n)})f(x)}{${texP(den)}}=${texR(value)}`;
    revised[3] = `f(${texR(point)})`;
    answers.push([constant(result)]);
    solutions.push(
      `분자와 분모의 다항식은 모두 $x=${texR(point)}$에서 $0$이다. 분모가 일차식이므로 $x\\neq${texR(point)}$에서 그 인수를 약분하면 다항식의 비의 극한은 $${texR(factor)}$이다. 함수의 연속성으로 주어진 극한은 $${texR(factor)}f(${texR(point)})=${texR(value)}$이므로 $f(${texR(point)})=${texR(result)}$이다.`,
    );
    checks.push(
      "common-limit-root",
      "simple-denominator-root",
      "nonzero-cancelled-factor",
      "continuity-used",
    );
    return finish("continuous-function-times-removable-polynomial-factor");
  }
  if (skeleton === "함수§에대하여§을만족시키는§의값을구하시오.") {
    recipe = "calculus-symmetric-difference";
    if (pp[2] !== "a") throw new Error("parameter-shape");
    const m = /^\\lim_\{h\\to0\}\\frac\{f\(a\+h\)-f\(a-h\)\}\{h\}=(.+)$/.exec(
      pp[1]!,
    );
    if (!m) throw new Error("symmetric-difference-shape");
    const p = polynomial(pp[0]!, "f(x)=");
    if (degree(p) !== 2) throw new Error("not-quadratic");
    const f = scale(translate(p, d), q),
      rhs = add(mul(number(m[1]!), q), d),
      equation = pSub(scale(diff(f), r(2)), constant(rhs));
    const result = affineSolve(equation, "x");
    revised[0] = `f(x)=${texP(f)}`;
    revised[1] = `\\lim_{h\\to0}\\frac{f(a+h)-f(a-h)}{h}=${texR(rhs)}`;
    answers.push([constant(result)]);
    solutions.push(
      `$\\frac{f(a+h)-f(a-h)}{h}=\\frac{f(a+h)-f(a)}{h}+\\frac{f(a)-f(a-h)}{h}$이므로 극한은 $2f'(a)$이다. $f'(x)=${texP(diff(f))}$이므로 $2f'(a)=${texR(rhs)}$을 풀면 $a=${texR(result)}$이다. 분모가 $2h$가 아니라 $h$이므로 미분계수의 두 배를 사용한다.`,
    );
    checks.push(
      "symmetric-quotient-is-twice-derivative",
      "unique-parameter-and-substitution",
    );
    return finish("quadratic-symmetric-difference-quotient");
  }
  if (
    skeleton ===
    "두다항함수§,§가모든실수§에대하여등식§를만족시킨다.§일때,§의값을구하시오."
  ) {
    recipe = "calculus-product-identity-derivative";
    requireMath(pp, { 0: "f(x)", 1: "g(x)", 2: "x" });
    const identity = /^\((.+)\)f\(x\)=\((.+)\)g\(x\)$/.exec(pp[3]!);
    const given = /^f\((.+)\)=f'\((.+)\)=(.+)$/.exec(pp[4]!);
    const target = /^(.+)g\((.+)\)\+(.+)g'\((.+)\)$/.exec(pp[5]!);
    if (!identity || !given || !target)
      throw new Error("product-identity-shape");
    const point = number(given[1]!);
    if (![given[2], target[2], target[4]].every((v) => eq(number(v!), point)))
      throw new Error("product-identity-point-mismatch");
    const p = parse(identity[1]!),
      denominator = parse(identity[2]!);
    degree(p);
    degree(denominator);
    const a = scale(translate(p, d), q),
      b = translate(denominator, d),
      nextAt = add(point, d),
      value = number(given[3]!);
    const bValue = at(b, nextAt);
    if (!bValue.n) throw new Error("zero-product-identity-denominator");
    const g = div(mul(at(a, nextAt), value), bValue);
    const gp = div(
      sub(
        add(mul(at(diff(a), nextAt), value), mul(at(a, nextAt), value)),
        mul(at(diff(b), nextAt), g),
      ),
      bValue,
    );
    const result = add(mul(number(target[1]!), g), mul(number(target[3]!), gp));
    revised[3] = `(${texP(a)})f(x)=(${texP(b)})g(x)`;
    revised[4] = `f(${texR(nextAt)})=f'(${texR(nextAt)})=${texR(value)}`;
    revised[5] = `${texR(number(target[1]!))}g(${texR(nextAt)})+${texR(number(target[3]!))}g'(${texR(nextAt)})`;
    answers.push([constant(result)]);
    solutions.push(
      `원래 등식에 $x=${texR(nextAt)}$를 대입하면 $${texR(at(a, nextAt))}\\cdot${texR(value)}=${texR(bValue)}g(${texR(nextAt)})$이므로 $g(${texR(nextAt)})=${texR(g)}$이다. 양변을 미분하면 $(${texP(diff(a))})f(x)+(${texP(a)})f'(x)=(${texP(diff(b))})g(x)+(${texP(b)})g'(x)$이다. 다시 $x=${texR(nextAt)}$를 대입하고 정리하면 $g'(${texR(nextAt)})=${texR(gp)}$이다. 따라서 물은 식의 값은 $${texR(result)}$이다.`,
    );
    checks.push(
      "product-rule-identity",
      "nonzero-evaluation-denominator",
      "given-f-and-f-prime-used",
    );
    return finish("polynomial-product-identity-first-derivative-value");
  }
  if (
    skeleton ===
    "직선도로를달리는자동차가브레이크를작동시킨후§초동안달린거리를§라고하면§이다.브레이크를작동시킨순간의가속도를§,자동차가정지할때까지움직인거리를§라고할때,§의값을구하시오."
  ) {
    recipe = "calculus-braking-distance";
    requireMath(pp, {
      0: "t",
      1: "x\\mathrm{m}",
      3: "p\\mathrm{m}/\\mathrm{s}^{2}",
      4: "q\\mathrm{m}",
      5: "p+q",
    });
    const p = polynomial(pp[2]!, "x=", "t"),
      f = scale(p, q);
    if (
      degree(f, "t") !== 2 ||
      coeff(f, "").n ||
      coeff(f, "t").n <= Z ||
      coeff(f, "tt").n >= Z
    )
      throw new Error("braking-domain-shape");
    const velocity = diff(f, "t"),
      stop = roots(velocity, "t")[0]!;
    if (
      !stop ||
      stop.n <= Z ||
      at(velocity, stop, "t").n ||
      at(velocity, r(0), "t").n <= Z
    )
      throw new Error("invalid-first-stop");
    const acceleration = scalar(diff(velocity, "t")),
      distance = at(f, stop, "t"),
      result = add(acceleration, distance);
    revised[2] = `x=${texP(f)}`;
    answers.push([constant(result)]);
    solutions.push(
      `속도는 $v(t)=${texP(velocity)}$, 가속도는 $v'(t)=${texR(acceleration)}$이므로 $p=${texR(acceleration)}$이다. $v(t)=0$의 첫 양의 해는 $t=${texR(stop)}$이다. $0\\leq t\\leq${texR(stop)}$에서 속도가 음수가 아니므로 정지할 때까지 움직인 거리는 위치의 증가량과 같고, $q=x(${texR(stop)})-x(0)=${texR(distance)}$이다. 따라서 $p+q=${texR(result)}$이다.`,
    );
    checks.push(
      "positive-initial-speed-negative-acceleration",
      "first-positive-stop",
      "nonnegative-speed-until-stop",
      "distance-not-signed-after-stop",
    );
    return finish(
      "quadratic-braking-position-initial-acceleration-and-distance",
    );
  }
  if (skeleton === "§를만족시키는상수§의값을구하시오.") {
    recipe = "calculus-reverse-bound-integral";
    if (pp[1] !== "k") throw new Error("parameter-shape");
    const m =
      /^\\int_\{(.+)\}\^\{(.+)\}\((.+)\)dx-\\int_\{(.+)\}\^\{(.+)\}\((.+)\)dx=(.+)$/.exec(
        pp[0]!,
      );
    if (!m) throw new Error("reverse-bound-integral-shape");
    const lo = number(m[1]!),
      hi = number(m[2]!);
    if (eq(lo, hi) || !eq(number(m[4]!), hi) || !eq(number(m[5]!), lo))
      throw new Error("bounds-not-reversed");
    const p = parse(m[3]!);
    if (pSub(p, parse(m[6]!)).size) throw new Error("integrands-differ");
    const known = substitute(p, "k", constant(r(0))),
      parameter = pSub(p, known);
    degree(known);
    if ([...parameter.keys()].some((k) => k.split("k").length !== 2))
      throw new Error("parameter-shape");
    const f = pAdd(scale(known, q), parameter),
      prim = primitive(f),
      rhs = mul(number(m[7]!), q);
    const integrated = scale(
      pSub(
        substitute(prim, "x", constant(hi)),
        substitute(prim, "x", constant(lo)),
      ),
      r(2),
    );
    const equation = pSub(integrated, constant(rhs)),
      result = affineSolve(equation, "k");
    revised[0] = `\\int_{${texR(lo)}}^{${texR(hi)}}(${texP(f)})dx-\\int_{${texR(hi)}}^{${texR(lo)}}(${texP(f)})dx=${texR(rhs)}`;
    answers.push([constant(result)]);
    solutions.push(
      `적분 구간의 위끝과 아래끝을 바꾸면 부호가 바뀌므로 좌변은 $2\\int_{${texR(lo)}}^{${texR(hi)}}(${texP(f)})dx$이다. 한 원시함수는 $${texP(prim)}$이며 이를 미분하면 피적분함수와 같다. 양 끝의 차를 계산하면 좌변은 $${texP(integrated)}$이다. 따라서 $${texP(equation)}=0$이고 $k=${texR(result)}$이다. 대입하면 원래의 두 적분 차가 $${texR(rhs)}$임을 확인할 수 있다.`,
    );
    checks.push(
      "bounds-exactly-reversed",
      "identical-integrands",
      "primitive-derivative-exact",
      "unique-parameter-and-substitution",
    );
    return finish(
      "difference-of-reversed-polynomial-integrals-linear-parameter",
    );
  }
  if (
    skeleton ===
    "함수§에대하여곡선§는점§을지나고이곡선위의임의의점§에서의접선의기울기는§이다.방정식§의모든근의합이§일때,함수§를구하시오.(단,§는상수)"
  ) {
    recipe = "calculus-primitive-root-sum";
    requireMath(pp, {
      0: "f(x)",
      1: "y=f(x)",
      3: "(x,f(x))",
      5: "f(x)=0",
      7: "f(x)",
      8: "k",
    });
    const slope = parse(pp[4]!),
      aa = coeff(slope, "x");
    if (
      pSub(slope, pAdd(scale(variable("x"), aa), variable("k"))).size ||
      !aa.n
    )
      throw new Error("slope-parameter-shape");
    const [u, v] = coordinate(pp[2]!),
      A = div(mul(aa, q), r(2)),
      sum = add(number(pp[6]!), d),
      kValue = neg(mul(A, sum)),
      pointValue = mul(v, q);
    const C = sub(pointValue, add(mul(A, mul(u, u)), mul(kValue, u)));
    const f = pAdd(
      pAdd(scale(power(variable("x"), 2), A), scale(variable("x"), kValue)),
      constant(C),
    );
    if (sub(mul(kValue, kValue), mul(r(4), mul(A, C))).n < Z)
      throw new Error("no-real-roots-for-root-sum");
    if (
      !eq(div(neg(coeff(f, "x")), coeff(f, "xx")), sum) ||
      !eq(at(f, u), pointValue)
    )
      throw new Error("root-sum-or-point-failed");
    revised[2] = pointTex(u, pointValue);
    revised[4] = `${texR(mul(aa, q))}x+k`;
    revised[6] = texR(sum);
    answers.push([f]);
    solutions.push(
      `접선의 기울기가 도함수이므로 $f'(x)=${texR(mul(aa, q))}x+k$이다. 적분하면 $f(x)=${texR(A)}x^{2}+kx+C$이다. 이차방정식의 근과 계수의 관계에서 모든 근의 합은 $-k/(${texR(A)})=${texR(sum)}$이므로 $k=${texR(kValue)}$이다. 주어진 점 $${pointTex(u, pointValue)}$을 대입하면 $C=${texR(C)}$이다. 따라서 $f(x)=${texP(f)}$이다. 판별식이 $0$ 이상이고 주어진 점과 근의 합을 모두 만족한다.`,
    );
    checks.push(
      "slope-integrated-exact",
      "point-condition-exact",
      "vieta-root-sum",
      "real-root-discriminant-nonnegative",
    );
    return finish("quadratic-primitive-from-slope-point-and-root-sum");
  }
  throw new Error("no-exact-calculus-template");
}

function requireMath(pp: string[], fields: Record<number, string>): void {
  for (const [index, value] of Object.entries(fields))
    if (pp[Number(index)] !== norm(value))
      throw new Error("fixed-template-field-mismatch");
}
function functionArgument(math: string): R {
  const m = /^f\((.+)\)$/.exec(math);
  if (!m) throw new Error("function-value-shape");
  return number(m[1]!);
}
function functionValue(math: string): { point: R; value: R } {
  const m = /^f\((.+)\)=(.+)$/.exec(math);
  if (!m) throw new Error("function-value-shape");
  return { point: number(m[1]!), value: number(m[2]!) };
}
const signed = (value: R) => (value.n < Z ? texR(value) : `+${texR(value)}`);
function xCoefficient(p: P, n: number): P {
  return new Map(
    [...p]
      .filter(([k]) => k.split("x").length - 1 === n)
      .map(([k, v]) => [k.replaceAll("x", ""), v]),
  );
}
function radicalTex(value: R): string {
  if (value.n < Z) throw new Error("negative-radical");
  const exact = sqrtR(value);
  if (exact) return texR(exact);
  let inside = value.n * value.d,
    outside = O;
  if (inside > BigInt(2000000)) throw new Error("radical-limit");
  for (let p = BigInt(2); p * p <= inside; p++)
    while (inside % (p * p) === Z) {
      inside /= p * p;
      outside *= p;
    }
  const factor = r(outside, value.d),
    root = `\\sqrt{${inside}}`;
  if (factor.d === O) return (factor.n === O ? "" : `${factor.n}`) + root;
  return `\\frac{${factor.n === O ? "" : factor.n}${root}}{${factor.d}}`;
}
function nonpositiveQuadratic(p: P, name: string): string {
  if (degree(p, name) !== 2 || coeff(p, name.repeat(2)).n <= Z)
    throw new Error("unsupported-parameter-discriminant");
  const aa = coeff(p, name.repeat(2)),
    bb = coeff(p, name),
    cc = coeff(p, "");
  if (!bb.n && cc.n < Z) {
    const bound = radicalTex(div(neg(cc), aa));
    return `-${bound}\\leq ${name}\\leq ${bound}`;
  }
  const endpoints = roots(p, name);
  if (endpoints.length !== 2)
    throw new Error("unsupported-parameter-discriminant");
  return `${texR(endpoints[0]!)}\\leq ${name}\\leq ${texR(endpoints[1]!)}`;
}
function monicLimit(math: string): { point: R; value: R; slope: R } {
  const m = /^\\lim_\{x\\to(.+)\}\\frac\{f\(x\)([+-].+)\}\{(.+)\}=(.+)$/.exec(
    math,
  );
  if (!m) throw new Error("monic-cubic-limit-shape");
  const point = number(m[1]!),
    denominator = parse(m[3]!);
  if (pSub(denominator, pSub(variable("x"), constant(point))).size)
    throw new Error("limit-denominator-not-x-minus-point");
  return { point, value: neg(number(m[2]!)), slope: number(m[4]!) };
}
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

/** Source holds stay intact; a mathematical draft is not approval or direct-use authorization. */
export function generateTextbookCalculusPair(
  source: TextbookVariantSource,
): TextbookCalculusResult {
  const sourceDigest = textbookVariantSourceDigest(source);
  const unresolved = (reason: string): TextbookCalculusResult => ({
    status: "unresolved",
    sourceId: source.id,
    sourceDigest,
    reason,
    detail: reason,
  });
  if (source.source !== "school_textbook" || source.origin_problem_id !== null)
    return unresolved("not-textbook-original");
  if (!["approved", "pending"].includes(source.review_status))
    return unresolved("source-review-state-unsupported");
  if (!["단답형", "서술형"].includes(source.question_type))
    return unresolved("unsupported-calculus-question-format");
  if (
    source.figure_svg ||
    source.figure_urls?.length ||
    /\[그림\]|<svg|!\[/.test(source.content)
  )
    return unresolved("figure-dependent");
  if (!source.content.trim() || !source.answer.trim())
    return unresolved("source-incomplete");
  try {
    const original = solve(source, 0);
    checkSourceAnswers(source, original);
    const candidates = ([1, 2] as const).map((slot) => {
      const draft = solve(source, slot);
      const candidate: TextbookCalculusCandidate = {
        sourceId: source.id,
        sourceDigest,
        originProblemId: source.id,
        sourceMaterialId: source.source_material_id,
        unitId: source.unit_id,
        sourceExternalId: source.external_id ?? null,
        sourceFile: source.source_file ?? null,
        familyKey: source.family_key ?? null,
        externalId: `tb-retry-v1:${source.id}:${slot}`,
        source: "transformed",
        questionType: source.question_type as "단답형" | "서술형",
        slot,
        recipe: draft.recipe,
        method:
          "source-matched exact calculus conditions; invertible polynomial transformation or coherent numerical data variation; pending drafting only",
        content: draft.content,
        answer: answerText(source, draft),
        solution: draft.solutions
          .map(
            (s, i) =>
              (labels(source.content)[i]
                ? `${labels(source.content)[i]} `
                : "") + s,
          )
          .join("\n"),
        figureSvg: null,
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        choiceFigureIndex: [],
        validation: {
          version: TEXTBOOK_VARIANT_VERSION,
          sourceAnswerVerified: true,
          exactStructure: draft.structure,
          checks: [
            "source-answer-exact",
            "actual-source-fields-digest",
            "pending-draft-no-review-promotion",
            "question-type-and-subquestions-preserved",
            ...draft.checks,
          ],
          computedAnswers: draft.answers.flat().map(mathAnswer),
          changedLiterals: parts(source.content).filter(
            (p, i) => norm(p.math) !== norm(parts(draft.content)[i]!.math),
          ).length,
        },
      };
      // Re-match and recompute the COMPLETE emitted question, independently of its metadata.
      const generated = solve(
        {
          ...source,
          content: candidate.content,
          answer: candidate.answer,
          solution: candidate.solution,
        },
        0,
      );
      if (
        generated.recipe !== original.recipe ||
        generated.structure !== original.structure
      )
        throw new Error("calculus-method-or-domain-changed");
      checkSourceAnswers(
        { ...source, content: candidate.content, answer: candidate.answer },
        generated,
      );
      if (
        !candidate.validation.changedLiterals ||
        candidate.content === source.content
      )
        throw new Error("unchanged-calculus-question");
      return candidate;
    }) as [TextbookCalculusCandidate, TextbookCalculusCandidate];
    if (candidates[0].content === candidates[1].content)
      return unresolved("duplicate-question");
    return { status: "matched", sourceId: source.id, sourceDigest, candidates };
  } catch (error) {
    return unresolved(
      error instanceof Error ? error.message : "no-exact-calculus-template",
    );
  }
}

/** Exact regeneration binds every authored/proof field to the CURRENT untouched source. */
export function validateTextbookCalculusPair(
  source: TextbookVariantSource,
  candidates: readonly TextbookCalculusCandidate[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (
    candidates.length !== 2 ||
    candidates[0]?.slot !== 1 ||
    candidates[1]?.slot !== 2
  )
    issues.push("requires-slots-1-and-2");
  if (
    candidates.some(
      (c) =>
        c.sourceId !== source.id ||
        c.originProblemId !== source.id ||
        c.sourceDigest !== textbookVariantSourceDigest(source),
    )
  )
    issues.push("source-provenance-or-digest-mismatch");
  const current = generateTextbookCalculusPair(source);
  if (current.status !== "matched")
    issues.push(`source-unresolved:${current.reason}`);
  else if (
    JSON.stringify(stable(current.candidates)) !==
    JSON.stringify(stable(candidates))
  )
    issues.push("candidate-does-not-match-verified-calculus-recipe");
  if (
    candidates.some((c) => c.content === source.content) ||
    (candidates.length === 2 &&
      candidates[0]?.content === candidates[1]?.content)
  )
    issues.push("duplicate-question");
  return { valid: issues.length === 0, issues };
}
