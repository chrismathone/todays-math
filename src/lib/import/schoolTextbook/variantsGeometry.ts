/** Offline complete-template geometry/counting variants. Never calls a model or a database. */
import {
  TEXTBOOK_VARIANT_VERSION,
  textbookVariantSourceDigest,
  type TextbookVariantCandidate,
  type TextbookVariantSource,
} from "./variants";

export type TextbookGeometryRecipe =
  | "exact-point-distance"
  | "exact-point-midpoint"
  | "exact-point-centroid"
  | "exact-section-point"
  | "exact-point-line-distance"
  | "exact-parallel-line-distance"
  | "exact-coordinate-reflection"
  | "exact-coordinate-translation"
  | "exact-finite-count";
export type TextbookGeometryCandidate = Omit<
  TextbookVariantCandidate,
  "recipe"
> & {
  recipe: TextbookGeometryRecipe;
};
export type TextbookGeometryResult =
  | {
      status: "matched";
      sourceId: string;
      sourceDigest: string;
      candidates: [TextbookGeometryCandidate, TextbookGeometryCandidate];
    }
  | {
      status: "unresolved";
      sourceId: string;
      sourceDigest: string;
      reason: string;
      detail: string;
    };

type Rat = { n: bigint; d: bigint };
const abs = (n: bigint) => (n < BigInt(0) ? -n : n);
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function q(n: bigint | number, d: bigint | number = 1): Rat {
  let a = BigInt(n),
    b = BigInt(d);
  if (!b) throw new Error("zero-denominator");
  if (b < BigInt(0)) {
    a = -a;
    b = -b;
  }
  const g = gcd(a, b);
  if (abs(a).toString().length > 100 || b.toString().length > 100)
    throw new Error("arithmetic-limit");
  return { n: a / g, d: b / g };
}
const add = (a: Rat, b: Rat) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const neg = (a: Rat) => q(-a.n, a.d);
const sub = (a: Rat, b: Rat) => add(a, neg(b));
const mul = (a: Rat, b: Rat) => q(a.n * b.n, a.d * b.d);
const div = (a: Rat, b: Rat) => q(a.n * b.d, a.d * b.n);
const equal = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d;
const latexQ = (a: Rat): string =>
  a.d === BigInt(1)
    ? `${a.n}`
    : `${a.n < BigInt(0) ? "-" : ""}\\frac{${abs(a.n)}}{${a.d}}`;
type Radical = { c: Rat; r: bigint };
function radical(c: Rat, r: bigint): Radical {
  if (r < BigInt(0) || r > BigInt(100000000)) throw new Error("radical-range");
  if (!r || !c.n) return { c: q(0), r: BigInt(1) };
  let outside = BigInt(1);
  for (let p = BigInt(2); p * p <= r; p++)
    while (r % (p * p) === BigInt(0)) {
      r /= p * p;
      outside *= p;
    }
  return { c: mul(c, q(outside)), r };
}
const sqrtQ = (a: Rat): Radical => radical(q(1, a.d), a.n * a.d);
function latexRad(a: Radical): string {
  if (a.r === BigInt(1)) return latexQ(a.c);
  const numerator = `${abs(a.c.n) === BigInt(1) ? "" : abs(a.c.n)}\\sqrt{${a.r}}`;
  return `${a.c.n < BigInt(0) ? "-" : ""}${a.c.d === BigInt(1) ? numerator : `\\frac{${numerator}}{${a.c.d}}`}`;
}
function clean(text: string): string {
  return text
    .replace(/\\(?:left|right|bigl|bigr)\b/g, "")
    .replace(/\\(?:mathrm|text)\{([A-Za-z]+)\}/g, "$1")
    .replace(/\\dfrac/g, "\\frac")
    .replace(/\\(?:,|;|:|!|quad\b|qquad\b| )/g, "")
    .replace(/[\s~$]/g, "")
    .replace(/[−–]/g, "-");
}
/** Small exact scalar grammar: rational products/quotients, integer powers and square roots. */
function scalar(input: string): Radical {
  const text = clean(input);
  let i = 0;
  if (text.length > 300) throw new Error("answer-limit");
  const product = (): Radical => {
    let out = signed();
    while (i < text.length && !"})".includes(text[i]!)) {
      if (text.startsWith("\\times", i)) i += 6;
      else if (text[i] === "*") i++;
      else if (text[i] === "/") {
        i++;
        const b = signed();
        out = radical(div(out.c, mul(b.c, q(b.r))), out.r * b.r);
        continue;
      } else if (!/\d|[({\\]/.test(text[i]!)) break;
      const b = signed();
      out = radical(mul(out.c, b.c), out.r * b.r);
    }
    return out;
  };
  const group = (): Radical => {
    if (text[i] === "{" || text[i] === "(") {
      const end = text[i++] === "{" ? "}" : ")";
      const a = product();
      if (text[i++] !== end) throw new Error("answer-syntax");
      return a;
    }
    if (text.startsWith("\\frac", i)) {
      i += 5;
      if (text[i] !== "{") throw new Error("answer-syntax");
      const a = group();
      if (text[i] !== "{") throw new Error("answer-syntax");
      const b = group();
      return radical(div(a.c, mul(b.c, q(b.r))), a.r * b.r);
    }
    if (text.startsWith("\\sqrt", i)) {
      i += 5;
      if (text[i] !== "{") throw new Error("answer-syntax");
      const a = group();
      if (a.r !== BigInt(1)) throw new Error("nested-radical");
      return sqrtQ(a.c);
    }
    const m = /^\d+(?:\.\d+)?/.exec(text.slice(i));
    if (!m) throw new Error("answer-syntax");
    i += m[0].length;
    const [whole, fraction = ""] = m[0].split(".");
    return radical(
      q(BigInt(whole! + fraction), BigInt(10) ** BigInt(fraction.length)),
      BigInt(1),
    );
  };
  const power = (): Radical => {
    let a = group();
    if (text[i] === "^") {
      i++;
      const b = group();
      if (
        b.r !== BigInt(1) ||
        b.c.d !== BigInt(1) ||
        b.c.n < BigInt(0) ||
        b.c.n > BigInt(100)
      )
        throw new Error("power-range");
      const exponent = b.c.n;
      a = radical(q(a.c.n ** exponent, a.c.d ** exponent), a.r ** exponent);
    }
    return a;
  };
  const signed = (): Radical => {
    if (text[i] === "+" || text[i] === "-") {
      const sign = text[i++],
        a = signed();
      return { ...a, c: sign === "-" ? neg(a.c) : a.c };
    }
    return power();
  };
  const result = product();
  if (i !== text.length) throw new Error("answer-syntax");
  return result;
}
function rational(text: string): Rat {
  const a = scalar(text);
  if (a.r !== BigInt(1)) throw new Error("rational-required");
  if (abs(a.c.n) > BigInt(1000000) || a.c.d > BigInt(1000000))
    throw new Error("coordinate-range");
  return a.c;
}
type Point = { name: string; v: Rat[]; token: string };
function points(text: string): { points: Point[]; rest: string } {
  const out: Point[] = [];
  const rest = clean(text).replace(
    /([A-Z]?)\(([^()]*)\)/g,
    (token, name: string, coords: string) => {
      const parts = coords.split(",");
      if (parts.length < 1 || parts.length > 3) return token;
      try {
        const v = parts.map(rational);
        out.push({ name, v, token });
        return `@${out.length - 1}@`;
      } catch {
        return token;
      }
    },
  );
  return { points: out, rest };
}
const tuple = (v: Rat[]) =>
  v.length === 1 ? latexQ(v[0]!) : `(${v.map(latexQ).join(",\\,")})`;
function sameDimension(p: Point[], count: number): number {
  if (
    p.length !== count ||
    !p[0] ||
    p.some((x) => x.v.length !== p[0]!.v.length)
  )
    throw new Error("coordinate-shape");
  return p[0].v.length;
}
function centroid(p: Point[]): Rat[] {
  const d = sameDimension(p, 3);
  if (d < 2) throw new Error("triangle-dimension");
  // Reject collinear/identical vertices; homothety preserves the triangle condition.
  const u = p[1]!.v.map((v, i) => sub(v, p[0]!.v[i]!)),
    v = p[2]!.v.map((v, i) => sub(v, p[0]!.v[i]!));
  if (!u.some((a, i) => v.some((b, j) => !equal(mul(a, b), mul(u[j]!, v[i]!)))))
    throw new Error("degenerate-triangle");
  return p[0]!.v.map((_, i) =>
    div(
      p.reduce((a, x) => add(a, x.v[i]!), q(0)),
      q(3),
    ),
  );
}
function homothety(text: string, scale: number): string {
  return text.replace(
    /\$([^$]+)\$/g,
    (_, math: string) =>
      `$${math.replace(
        /(?:\\left\s*)?\(([^()]+)\)(?:\s*\\right)?/g,
        (token, coords: string) => {
          try {
            const v = clean(coords).split(",").map(rational);
            if (v.length > 3) return token;
            return `(${v.map((a) => latexQ(mul(a, q(scale)))).join(",\\,")})`;
          } catch {
            return token;
          }
        },
      )}$`,
  );
}
type Part = { label: string; text: string };
function parts(text: string): { head: string; parts: Part[] } {
  const masked = text.replace(/\$[^$]*\$/g, (s) => " ".repeat(s.length));
  const labels = [...masked.matchAll(/\([1-9]\d?\)|(?<!\d)[1-9]\d?\)|[⑴-⒇]/g)];
  if (!labels.length) return { head: "", parts: [{ label: "", text }] };
  const number = (s: string) =>
    s.charCodeAt(0) >= 0x2474
      ? s.charCodeAt(0) - 0x2473
      : Number(s.replace(/\D/g, ""));
  if (labels.some((m, i) => number(m[0]) !== i + 1))
    throw new Error("subquestion-label-order");
  return {
    head: text.slice(0, labels[0]!.index),
    parts: labels.map((m, i) => ({
      label: m[0],
      text: text.slice(
        m.index! + m[0].length,
        labels[i + 1]?.index ?? text.length,
      ),
    })),
  };
}
type Item = {
  recipe: TextbookGeometryRecipe;
  shape: string;
  answer: string;
  proof: string;
  mutate: (scale: number) => string;
};
type Solved = {
  recipe: TextbookGeometryRecipe;
  shape: string;
  answers: string[];
  proofs: string[];
  content: (scale: number) => string;
};
function coordItem(
  text: string,
  operation: "distance" | "midpoint" | "centroid" | "section",
  ratio?: [number, number],
): Item {
  const { points: p, rest } = points(text);
  if (!/^@0@[,，]?@1@(?:[,，]?@2@)?[.。]?$/.test(rest))
    throw new Error("coordinate-item-extra-condition");
  let answer: string, proof: string;
  const d = sameDimension(p, operation === "centroid" ? 3 : 2);
  if (p.some((x) => x.name === "O" && x.v.some((v) => v.n !== BigInt(0))))
    throw new Error("origin-coordinate-mismatch");
  if (p.length === 2 && p[0]!.v.every((v, i) => equal(v, p[1]!.v[i]!)))
    throw new Error("identical-points");
  if (operation === "distance") {
    const differences = p[1]!.v.map((a, i) => sub(a, p[0]!.v[i]!));
    const squared = differences.reduce((a, x) => add(a, mul(x, x)), q(0));
    if (!squared.n) throw new Error("identical-points");
    answer = latexRad(sqrtQ(squared));
    proof = `좌표의 차는 $${tuple(differences)}$이다. 거리 공식으로 $d=\\sqrt{${differences.map((a) => `(${latexQ(a)})^{2}`).join("+")}}=${answer}$이다.`;
  } else {
    const values =
      operation === "centroid"
        ? centroid(p)
        : p[0]!.v.map((a, i) =>
            operation === "section"
              ? div(
                  add(mul(q(ratio![1]), a), mul(q(ratio![0]), p[1]!.v[i]!)),
                  q(ratio![0] + ratio![1]),
                )
              : div(add(a, p[1]!.v[i]!), q(2)),
          );
    answer = tuple(values);
    const denominator =
      operation === "centroid"
        ? 3
        : operation === "section"
          ? ratio![0] + ratio![1]
          : 2;
    const calculations = values.map(
      (a, i) =>
        `\\frac{${p.map((x, j) => (operation === "section" ? `${ratio![j === 0 ? 1 : 0]}\\times(${latexQ(x.v[i]!)})` : `(${latexQ(x.v[i]!)})`)).join("+")}}{${denominator}}=${latexQ(a)}`,
    );
    proof = `${operation === "centroid" ? "무게중심" : operation === "section" ? `${ratio![0]}:${ratio![1]} 내분점` : "중점"} 공식으로 각 좌표를 계산하면 $${calculations.join(",\\;")}$이다. 따라서 좌표는 $${answer}$이다.`;
  }
  return {
    recipe:
      operation === "section"
        ? "exact-section-point"
        : `exact-point-${operation}`,
    shape: `${operation}:${d}:${ratio?.join(":") ?? ""}:${p.map((x) => x.name).join(",")}`,
    answer,
    proof,
    mutate: (scale) => homothety(text, scale),
  };
}

type Line = [Rat, Rat, Rat];
/** Parse both sides in the affine ring Q[x,y]; consume every symbol. */
function line(text: string): Line {
  const expr = clean(text),
    sides = expr.split("=");
  if (sides.length !== 2) throw new Error("line-syntax");
  const affine = (s: string): Line => {
    const out: Line = [q(0), q(0), q(0)];
    let i = 0;
    while (i < s.length) {
      let sign = 1;
      if (s[i] === "+" || s[i] === "-") sign = s[i++] === "-" ? -1 : 1;
      else if (i) throw new Error("line-syntax");
      const token = /^(?:\\frac\{\d+\}\{\d+\}|\d+(?:\.\d+)?)/.exec(s.slice(i));
      if (token) i += token[0].length;
      const variable = s[i] === "x" ? 0 : s[i] === "y" ? 1 : 2;
      if (variable < 2) i++;
      else if (!token) throw new Error("line-syntax");
      out[variable] = add(
        out[variable]!,
        mul(q(sign), token ? rational(token[0]) : q(1)),
      );
    }
    return out;
  };
  const a = affine(sides[0]!),
    b = affine(sides[1]!);
  const result = a.map((v, i) => sub(v, b[i]!)) as Line;
  if (!result[0].n && !result[1].n) throw new Error("degenerate-line");
  return result;
}
function lineLatex([a, b, c]: Line): string {
  const terms = [
    [a, "x"],
    [b, "y"],
    [c, ""],
  ] as const;
  return (
    terms
      .filter(([v]) => v.n)
      .map(
        ([v, x], i) =>
          `${v.n < BigInt(0) ? "-" : i ? "+" : ""}${x && abs(v.n) === v.d ? "" : latexQ(q(abs(v.n), v.d))}${x}`,
      )
      .join("") + "=0"
  );
}
function lineDistance(
  point: Rat[],
  l: Line,
): { answer: string; proof: string } {
  if (point.length !== 2) throw new Error("coordinate-shape");
  const numerator = add(add(mul(l[0], point[0]!), mul(l[1], point[1]!)), l[2]);
  const norm = add(mul(l[0], l[0]), mul(l[1], l[1]));
  const answer = latexRad(sqrtQ(div(mul(numerator, numerator), norm)));
  return {
    answer,
    proof: `직선을 $${lineLatex(l)}$으로 정리한다. 점과 직선 사이의 거리 공식에 대입하면 $d=\\frac{|${latexQ(l[0])}\\times(${latexQ(point[0]!)})+${latexQ(l[1])}\\times(${latexQ(point[1]!)})+(${latexQ(l[2])})|}{\\sqrt{(${latexQ(l[0])})^{2}+(${latexQ(l[1])})^{2}}}=${answer}$이다.`,
  };
}
function pointLineItem(text: string, origin = false): Item {
  const math = [...text.matchAll(/\$([^$]+)\$/g)];
  const c = clean(text);
  let p: Rat[], equation: string;
  if (origin) {
    if (math.length !== 1 || clean(math[0]![1]!) !== c)
      throw new Error("line-item-extra-condition");
    p = [q(0), q(0)];
    equation = math[0]![1]!;
  } else {
    if (math.length !== 2) throw new Error("line-item-shape");
    const found = points(math[0]![1]!);
    if (found.points.length !== 1 || found.rest !== "@0@")
      throw new Error("line-point-shape");
    p = found.points[0]!.v;
    equation = math[1]![1]!;
    if (
      !new RegExp(`^점@0@(?:와|과|,)직선@1@$`).test(
        c.replace(clean(math[0]![1]!), "@0@").replace(clean(equation), "@1@"),
      )
    )
      throw new Error("line-item-extra-condition");
  }
  const l = line(equation),
    answer = lineDistance(p, l);
  return {
    recipe: "exact-point-line-distance",
    shape: `point-line:${origin ? "origin" : 2}:${l[0].n === BigInt(0) ? "horizontal" : l[1].n === BigInt(0) ? "vertical" : "oblique"}`,
    ...answer,
    mutate: (scale) => {
      let result = homothety(text, scale);
      const scaled: Line = [l[0], l[1], mul(l[2], q(scale))];
      result = result.replace(`$${equation}$`, `$${lineLatex(scaled)}$`);
      return result;
    },
  };
}

function wholeGeometry(text: string): Item | null {
  const { points: p, rest } = points(text);
  // Complete single midpoint/centroid questions; no unconsumed diagram or qualifier.
  if (
    /^(?:좌표평면위의)?두점@0@,@1@을이은선분AB의중점M의좌표를구하시오\.$/.test(
      rest,
    )
  ) {
    const a = coordItem(p.map((x) => x.token).join(","), "midpoint");
    return { ...a, mutate: (scale) => homothety(text, scale) };
  }
  if (
    /^(?:좌표평면위의)?세점@0@,@1@,@2@을꼭짓점으로하는삼각형ABC의무게중심G의좌표를구하시오\.$/.test(
      rest,
    )
  ) {
    const a = coordItem(p.map((x) => x.token).join(","), "centroid");
    return { ...a, mutate: (scale) => homothety(text, scale) };
  }
  if (
    /^삼각형ABC의무게중심의좌표는@0@이고변AB의중점의좌표는@1@일때,점C의좌표를구하시오\.$/.test(
      rest,
    )
  ) {
    const d = sameDimension(p, 2),
      v = p[0]!.v.map((a, i) => sub(mul(q(3), a), mul(q(2), p[1]!.v[i]!)));
    if (d < 2) throw new Error("triangle-dimension");
    if (p[0]!.v.every((a, i) => equal(a, p[1]!.v[i]!)))
      throw new Error("degenerate-triangle");
    return {
      recipe: "exact-point-centroid",
      shape: `recover-vertex:${d}`,
      answer: tuple(v),
      proof: `무게중심을 $G$, 변의 중점을 $M$이라 하면 $C=3G-2M$이다. 각 좌표에 대입하면 $${v.map((a, i) => `3\\times(${latexQ(p[0]!.v[i]!)})-2\\times(${latexQ(p[1]!.v[i]!)})=${latexQ(a)}`).join(",\\;")}$이므로 $C${tuple(v)}$이다.`,
      mutate: (scale) => homothety(text, scale),
    };
  }
  const m = /^평행한두직선(.+),(.+)사이의거리를구하시오\.$/.exec(clean(text));
  if (m) {
    const math = [...text.matchAll(/\$([^$]+)\$/g)];
    if (math.length !== 2) throw new Error("line-item-shape");
    const l = line(m[1]!),
      r = line(m[2]!);
    if (!equal(mul(l[0], r[1]), mul(l[1], r[0])))
      throw new Error("non-parallel-lines");
    const factor = l[0].n ? div(r[0], l[0]) : div(r[1], l[1]);
    const c = sub(l[2], div(r[2], factor));
    const answer = latexRad(
      sqrtQ(div(mul(c, c), add(mul(l[0], l[0]), mul(l[1], l[1])))),
    );
    return {
      recipe: "exact-parallel-line-distance",
      shape: "parallel-lines",
      answer,
      proof: `두 직선의 $x$, $y$의 계수를 같게 맞추면 $${lineLatex(l)}$, $${lineLatex([l[0], l[1], div(r[2], factor)])}$이다. 평행선 사이의 거리는 $d=\\frac{|${latexQ(c)}|}{\\sqrt{(${latexQ(l[0])})^{2}+(${latexQ(l[1])})^{2}}}=${answer}$이다.`,
      mutate: (scale) =>
        text
          .replace(
            `$${math[0]![1]}$`,
            `$${lineLatex([l[0], l[1], mul(l[2], q(scale))])}$`,
          )
          .replace(
            `$${math[1]![1]}$`,
            `$${lineLatex([r[0], r[1], mul(r[2], q(scale))])}$`,
          ),
    };
  }
  return null;
}

function reflectionItem(text: string, target: string): Item {
  const found = points(text);
  sameDimension(found.points, 1);
  if (found.rest !== "@0@" || found.points[0]!.v.length !== 2)
    throw new Error("reflection-item-shape");
  const [x, y] = found.points[0]!.v;
  const v =
    target === "x"
      ? [x!, neg(y!)]
      : target === "y"
        ? [neg(x!), y!]
        : target === "origin"
          ? [neg(x!), neg(y!)]
          : [y!, x!];
  return {
    recipe: "exact-coordinate-reflection",
    shape: `reflection:${target}`,
    answer: tuple(v),
    proof: `${target === "origin" ? "원점" : target === "diagonal" ? "직선 y=x" : target + "축"}에 대한 대칭이동에서는 ${target === "diagonal" ? "두 좌표를 서로 바꾼다" : target === "origin" ? "두 좌표의 부호를 바꾼다" : target === "x" ? "y좌표의 부호를 바꾼다" : "x좌표의 부호를 바꾼다"}. 따라서 $${tuple(found.points[0]!.v)}\\mapsto${tuple(v)}$이다.`,
    mutate: (scale) => homothety(text, scale),
  };
}

function factorial(n: number): bigint {
  if (!Number.isInteger(n) || n < 0 || n > 60)
    throw new Error("counting-range");
  let a = BigInt(1);
  for (let i = 2; i <= n; i++) a *= BigInt(i);
  return a;
}
function perm(n: number, r: number): bigint {
  if (r < 0 || r > n) throw new Error("counting-range");
  return factorial(n) / factorial(n - r);
}
function countItem(text: string): Item {
  const c = clean(text);
  let m: RegExpExecArray | null;
  // Only complete notation, not expressions containing additional conditions.
  m = /^(?:\{\})?_\{?(\d+)\}?(P|C|H|∏|\\Pi)_\{?(\d+)\}?$/.exec(c);
  if (m) {
    const n = Number(m[1]),
      r = Number(m[3]),
      kind = m[2]!;
    if (n < 1 || n > 40 || r < 0 || r > 40) throw new Error("counting-range");
    const compute = (a: number) =>
      kind === "P"
        ? perm(a, r)
        : kind === "C"
          ? perm(a, r) / factorial(r)
          : kind === "H"
            ? perm(a + r - 1, r) / factorial(r)
            : BigInt(a) ** BigInt(r);
    const answer = compute(n).toString();
    return {
      recipe: "exact-finite-count",
      shape: `notation:${kind}:${r}`,
      answer,
      proof: `${kind === "P" ? "순열" : kind === "C" ? "조합" : kind === "H" ? "중복조합" : "중복순열"}의 공식으로 $${kind === "P" ? `\\frac{${n}!}{(${n}-${r})!}` : kind === "C" ? `\\frac{${n}!}{${r}!(${n}-${r})!}` : kind === "H" ? `\\frac{(${n}+${r}-1)!}{${r}!(${n}-1)!}` : `${n}^{${r}}`}=${answer}$이다.`,
      mutate: (scale) =>
        text.replace(/\$[^$]+\$/, `$ {}_{${n + scale - 1}}${kind}_{${r}} $`),
    };
  }
  m =
    /^서로다른모자(\d+)개와목도리(\d+)개를가지고눈사람을꾸미려고한다\.모자와목도리를각각한개씩선택하여눈사람을꾸미는경우의수를구하시오\.$/.exec(
      c,
    );
  if (m) return productWord(text, [Number(m[1]), Number(m[2])], "snowman");
  m =
    /^세아네반은체육대회에서사용할단체티셔츠와모자를구입하려고한다\.단체티셔츠(\d+)종류,모자(\d+)종류중에서각각한종류씩선택하는경우의수를구하시오\.$/.exec(
      c,
    );
  if (m) return productWord(text, [Number(m[1]), Number(m[2])], "shirt-hat");
  m =
    /^(\d+)종류의장미꽃과(\d+)종류의국화꽃이있을때,장미꽃과국화꽃을각각한종류씩택하는경우의수$/.exec(
      c,
    );
  if (m)
    return productWord(
      text,
      [Number(m[1]), Number(m[2])],
      "rose-chrysanthemum",
    );
  m =
    /^서로다른(\d+)개의흰공과(\d+)개의노란공이있을때,흰공과노란공을각각1개씩택하는경우의수$/.exec(
      c,
    );
  if (m)
    return productWord(text, [Number(m[1]), Number(m[2])], "white-yellow-ball");
  m =
    /^서로다른(?:종류의)?(?:책|사탕)(\d+)(?:권|개)을(\d+)명의학생([A-Z](?:,[A-Z])+)에게남김없이나누어주는경우의수는\?\(단,(?:책을|사탕을)?받지못하는학생이있을수있다\.\)$/.exec(
      c,
    );
  if (!m)
    m =
      /^서로다른(\d+)개의사탕을([A-Z](?:,[A-Z])+)(\d+)명의학생에게남김없이나누어주는방법의수는\?\(단,받지못하는학생이있을수있다\.\)$/
        .exec(c)
        ?.map((v, i, arr) =>
          i === 2 ? arr[3]! : i === 3 ? arr[2]! : v,
        ) as RegExpExecArray | null;
  if (m) {
    const k = Number(m[2]);
    if (m[3]!.split(",").length !== k || new Set(m[3]!.split(",")).size !== k)
      throw new Error("recipient-list-count-mismatch");
    return powerWord(text, c, m, k, "distinct-gifts-unrestricted-recipients");
  }
  m =
    /^(\d+)개의보기에서답을하나택하는객관식문제(\d+)개와[◯○],×형문제(\d+)개가있을때,이들(\d+)문제의답을택하는경우의수$/.exec(
      c,
    );
  if (m) {
    const [n, a, b, total] = m.slice(1).map(Number);
    if (a! + b !== total || n! < 2 || n! > 10 || a! > 20 || b! > 20)
      throw new Error("counting-inconsistent-total");
    const answer = (
      BigInt(n!) ** BigInt(a!) *
      BigInt(2) ** BigInt(b!)
    ).toString();
    return {
      recipe: "exact-finite-count",
      shape: `mixed-answers:${a}:${b}:${total}`,
      answer,
      proof: `객관식 답안은 $${n}^{${a}}$가지, ◯, ×형 답안은 $2^{${b}}$가지이다. 곱의 법칙으로 $${n}^{${a}}\\times2^{${b}}=${answer}$이다.`,
      mutate: (scale) => replaceNumericMath(text, n!, n! + scale - 1),
    };
  }
  m =
    /^(?:학생)?(\d+)명의학생이사진반,축구반,게임반중에서각자한반씩들어가는방법의수를구하시오\.\(단,빈반이있을수있다\.\)$/.exec(
      c,
    );
  if (m) return powerWord(text, c, m, 3, "students-three-clubs");
  m =
    /^(\d+)명의학생이라면과김밥중에서하나씩주문하는경우의수를구하시오\.$/.exec(
      c,
    );
  if (m) return powerWord(text, c, m, 2, "students-two-meals");
  m =
    /^오지선다형문제(\d+)개가있다\.각문제의답을하나씩고를때,고를수있는경우의수를구하시오\.$/.exec(
      c,
    );
  if (m) return powerWord(text, c, m, 5, "five-choice-answers");
  m =
    /^○,×로답하는(\d+)개의문제에답안을작성하는경우의수를구하시오\.\(단,비어있는답안은없다\.\)$/.exec(
      c,
    );
  if (m) return powerWord(text, c, m, 2, "binary-answers");
  m =
    /^(?:학생)?(\d+)명이(\d+)개의진로체험동아리중에서각각한동아리를택하는경우의수를구하시오\.\(단,선택을받지못하는동아리가있을수있다\.\)$/.exec(
      c,
    );
  if (m) return powerWord(text, c, m, Number(m[2]), "students-clubs");
  m = /^학생(\d+)명을일렬로세우는경우의수$/.exec(c);
  if (!m)
    m =
      /^뷔페식당에서요리사가서로다른음식(\d+)가지를일렬로배열하는경우의수$/.exec(
        c,
      );
  if (m) {
    const n = Number(m[1]),
      answer = factorial(n).toString();
    return {
      recipe: "exact-finite-count",
      shape: c.replace(m[1]!, "N"),
      answer,
      proof: `서로 다른 ${n}개를 일렬로 배열하므로 $${n}!=${Array.from({ length: n }, (_, i) => n - i).join("\\times")}=${answer}$이다.`,
      mutate: (scale) => replaceNumericMath(text, n, n + scale - 1),
    };
  }
  throw new Error("no-exact-geometry-template");
}
function productWord(text: string, values: number[], shape: string): Item {
  if (values.some((n) => n < 1 || n > 30)) throw new Error("counting-range");
  const answer = values.reduce((a, n) => a * BigInt(n), BigInt(1)).toString();
  return {
    recipe: "exact-finite-count",
    shape,
    answer,
    proof: `두 선택은 독립적이다. 곱의 법칙으로 $${values.join("\\times")}=${answer}$가지이다.`,
    mutate: (scale) =>
      replaceNumericMath(text, values[0]!, values[0]! + scale - 1),
  };
}
function replaceNumericMath(text: string, n: number, next: number): string {
  let changed = false;
  const output = text.replace(/\$([^$]+)\$/g, (token, math: string) => {
    if (!changed && clean(math) === `${n}`) {
      changed = true;
      return `$${next}$`;
    }
    return token;
  });
  if (!changed) throw new Error("no-changeable-data");
  return output;
}
function powerWord(
  text: string,
  _c: string,
  m: RegExpExecArray,
  base: number,
  shape: string,
): Item {
  const n = Number(m[1]);
  if (n < 1 || n > 30 || base < 2 || base > 20)
    throw new Error("counting-range");
  const answer = (BigInt(base) ** BigInt(n)).toString();
  return {
    recipe: "exact-finite-count",
    shape,
    answer,
    proof: `각각 ${base}가지 중 하나를 독립적으로 선택한다. 곱의 법칙으로 $${base}^{${n}}=${answer}$이다.`,
    mutate: (scale) => replaceNumericMath(text, n, n + scale - 1),
  };
}

function solve(source: TextbookVariantSource, verifyAnswer = true): Solved {
  if (!["단답형", "서술형"].includes(source.question_type))
    throw new Error("question-type-unsupported");
  if ((source.content.match(/\$/g)?.length ?? 0) % 2)
    throw new Error("unbalanced-math");
  const split = parts(source.content);
  if (!split.head && split.parts.length === 1) {
    const directive =
      /^(다음 두 점 사이의 거리를 구하시오\.|다음 점과 직선 사이의 거리를 구하시오\.|원점과 다음 직선 사이의 거리를 구하시오\.|다음 값을 구하시오\.|다음을 계산하시오\.|다음 식의 값을 구하시오\.)\s*/.exec(
        source.content,
      );
    if (directive) {
      split.head = directive[0];
      split.parts = [
        { label: "", text: source.content.slice(directive[0].length) },
      ];
    }
  }
  const head = clean(split.head);
  let items: Item[];
  const shared = points(split.head);
  let mutateHead = false;
  const translation =
    /^다음점을x축의방향으로(.+)만큼,y축의방향으로(.+)만큼평행이동한점의좌표를구하시오\.$/.exec(
      head,
    );
  if (translation) {
    const shift = [rational(translation[1]!), rational(translation[2]!)];
    items = split.parts.map((p) => {
      const found = points(p.text);
      sameDimension(found.points, 1);
      if (found.rest !== "@0@" || found.points[0]!.v.length !== 2)
        throw new Error("translation-item-shape");
      const v = found.points[0]!.v.map((a, i) => add(a, shift[i]!));
      return {
        recipe: "exact-coordinate-translation",
        shape: `translate:${shift.map(latexQ).join(",")}`,
        answer: tuple(v),
        proof: `평행이동은 두 좌표에 각각 이동량을 더한다. $${found.points[0]!.v.map((a, i) => `(${latexQ(a)})+(${latexQ(shift[i]!)})=${latexQ(v[i]!)}`).join(",\\;")}$이므로 좌표는 $${tuple(v)}$이다.`,
        mutate: (scale) => homothety(p.text, scale),
      };
    });
  } else if (
    /^(?:수직선|좌표평면)위의두점@0@,@1@에대하여다음점의좌표를구하시오\.$/.test(
      shared.rest,
    )
  ) {
    sameDimension(shared.points, 2);
    mutateHead = true;
    items = split.parts.map((p) => {
      const r = /^선분AB를(\d+):(\d+)(?:로|으로)내분하는점P$/.exec(
        clean(p.text),
      );
      if (!r) throw new Error("section-item-extra-condition");
      const ratio: [number, number] = [Number(r[1]), Number(r[2])];
      if (ratio.some((n) => n < 1 || n > 30)) throw new Error("ratio-range");
      const a = coordItem(
        shared.points.map((x) => x.token).join(","),
        "section",
        ratio,
      );
      return {
        ...a,
        recipe: "exact-section-point" as const,
        mutate: () => p.text,
      };
    });
  } else if (
    /^점@0@을다음점또는직선에대하여대칭이동한점의좌표를구하시오\.$/.test(
      shared.rest,
    )
  ) {
    sameDimension(shared.points, 1);
    mutateHead = true;
    items = split.parts.map((p) => {
      const target = clean(p.text);
      const targets: Record<string, string> = {
        x축: "x",
        y축: "y",
        원점: "origin",
        "직선y=x": "diagonal",
      };
      if (!targets[target]) throw new Error("reflection-item-extra-condition");
      return {
        ...reflectionItem(shared.points[0]!.token, targets[target]!),
        mutate: () => p.text,
      };
    });
  } else if (
    /^(?:다음두점사이의거리를구하시오\.|수직선위의두점A\(x_\{?1\}?\),B\(x_\{?2\}?\)가다음과같을때,두점사이의거리를구하시오\.|좌표평면위의두점A\(x_\{?1\}?,y_\{?1\}?\),B\(x_\{?2\}?,y_\{?2\}?\)가다음과같을때,두점사이의거리를구하시오\.)$/.test(
      head,
    )
  )
    items = split.parts.map((p) => coordItem(p.text, "distance"));
  else if (
    /^(?:수직선|좌표평면)위의다음두점A,B를이은선분AB의중점M의좌표를구하시오\.$/.test(
      head,
    )
  )
    items = split.parts.map((p) => coordItem(p.text, "midpoint"));
  else if (
    head ===
    "다음세점A,B,C를꼭짓점으로하는삼각형ABC의무게중심G의좌표를구하시오."
  )
    items = split.parts.map((p) => coordItem(p.text, "centroid"));
  else if (head === "다음점과직선사이의거리를구하시오.")
    items = split.parts.map((p) => pointLineItem(p.text));
  else if (head === "원점과다음직선사이의거리를구하시오.")
    items = split.parts.map((p) => pointLineItem(p.text, true));
  else if (
    /^다음점을(?:x축|y축|원점|직선y=x)에대하여대칭이동한점의좌표를구하시오\.$/.test(
      head,
    )
  ) {
    const target = head.includes("x축")
      ? "x"
      : head.includes("y축")
        ? "y"
        : head.includes("원점")
          ? "origin"
          : "diagonal";
    items = split.parts.map((p) => reflectionItem(p.text, target));
  } else {
    const ratio =
      /^다음두점A,B에대하여선분AB를(\d+):(\d+)(?:로|으로)내분하는점P의좌표를구하시오\.$/.exec(
        head,
      );
    if (ratio) {
      const r: [number, number] = [Number(ratio[1]), Number(ratio[2])];
      if (r.some((n) => n < 1 || n > 30)) throw new Error("ratio-range");
      items = split.parts.map((p) => ({
        ...coordItem(p.text, "section", r),
        recipe: "exact-section-point",
      }));
    } else if (head === "다음을구하시오.") {
      items = split.parts.map((p) => {
        const { points: ps, rest } = points(p.text);
        const midpoint = /^두점@0@,@1@을이은선분AB의중점M의좌표$/.test(rest);
        const center =
          /^세점@0@,@1@,@2@을꼭짓점으로하는삼각형ABC의무게중심G의좌표$/.test(
            rest,
          );
        if (midpoint || center) {
          const a = coordItem(
            ps.map((x) => x.token).join(","),
            midpoint ? "midpoint" : "centroid",
          );
          return { ...a, mutate: (scale) => homothety(p.text, scale) };
        }
        const section =
          /^두점@0@,@1@(?:을|를)이은선분AB를(\d+):(\d+)(?:로|으로)내분하는점P의좌표$/.exec(
            rest,
          );
        if (section) {
          const r: [number, number] = [Number(section[1]), Number(section[2])];
          if (r.some((n) => n < 1 || n > 30)) throw new Error("ratio-range");
          const a = coordItem(ps.map((x) => x.token).join(","), "section", r);
          return {
            ...a,
            recipe: "exact-section-point" as const,
            mutate: (scale) => homothety(p.text, scale),
          };
        }
        if (/^점.+사이의거리$/.test(clean(p.text)))
          return pointLineItem(p.text.replace(/\s*사이의 거리\s*$/, ""));
        if (/^원점과직선.+사이의거리$/.test(clean(p.text))) {
          const l = /^원점과\s*직선\s*(\$[^$]+\$)\s*사이의 거리\s*$/.exec(
            p.text.trim(),
          );
          if (l) {
            const a = pointLineItem(l[1]!, true);
            return {
              ...a,
              mutate: (scale) => p.text.replace(l[1]!, a.mutate(scale)),
            };
          }
        }
        return countItem(p.text);
      });
    } else if (
      [
        "다음값을구하시오.",
        "다음을계산하시오.",
        "다음식의값을구하시오.",
      ].includes(head)
    )
      items = split.parts.map((p) => countItem(p.text));
    else if (!split.head)
      items = [wholeGeometry(source.content) ?? countItem(source.content)];
    else throw new Error("no-exact-geometry-template");
  }
  if (items.some((i) => i.recipe !== items[0]!.recipe))
    throw new Error("mixed-template-recipes");
  const answers = parts(source.answer);
  if (
    verifyAnswer &&
    (answers.parts.length !== items.length || clean(answers.head))
  )
    throw new Error("source-answer-shape");
  if (verifyAnswer && items.length > 1 && answers.parts.some((p) => !p.label))
    throw new Error("source-answer-shape");
  for (let i = 0; verifyAnswer && i < items.length; i++) {
    const expected = clean(items[i]!.answer),
      actual = clean(answers.parts[i]!.text);
    const values = (s: string) =>
      s.startsWith("(") && s.endsWith(")")
        ? s.slice(1, -1).split(",").map(scalar)
        : [scalar(s)];
    const a = values(expected),
      b = values(actual);
    if (
      a.length !== b.length ||
      a.some((v, j) => v.r !== b[j]!.r || !equal(v.c, b[j]!.c))
    )
      throw new Error("source-answer-mismatch");
  }
  return {
    recipe: items[0]!.recipe,
    shape: items.map((i) => i.shape).join(";"),
    answers: items.map((i) => i.answer),
    proofs: items.map((i) => i.proof),
    content: (scale) =>
      (mutateHead ? homothety(split.head, scale) : split.head) +
      split.parts.map((p, i) => p.label + items[i]!.mutate(scale)).join(""),
  };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    );
  return value;
}
type Choices = {
  stem: string;
  values: Rat[];
  correct: number;
  labels: string[];
};
function choices(source: TextbookVariantSource): Choices {
  const labels = [...source.content.matchAll(/[①-⑤]/g)];
  if (
    labels.length !== 5 ||
    labels.some((m, i) => m[0] !== ["①", "②", "③", "④", "⑤"][i])
  )
    throw new Error("choice-shape");
  const values = labels.map((m, i) => {
    const body = source.content
      .slice(m.index! + 1, labels[i + 1]?.index ?? source.content.length)
      .trim();
    const math = /^\$([^$]+)\$$/.exec(body);
    return rational(math?.[1] ?? body);
  });
  if (new Set(values.map(latexQ)).size !== 5)
    throw new Error("duplicate-choice");
  const correct = ["①", "②", "③", "④", "⑤"].indexOf(source.answer.trim());
  if (correct < 0) throw new Error("choice-answer-shape");
  return {
    stem: source.content.slice(0, labels[0]!.index).trimEnd(),
    values,
    correct,
    labels: labels.map((m) => m[0]),
  };
}
export function generateTextbookGeometryPair(
  source: TextbookVariantSource,
): TextbookGeometryResult {
  const digest = textbookVariantSourceDigest(source);
  const unresolved = (reason: string): TextbookGeometryResult => ({
    status: "unresolved",
    sourceId: source.id,
    sourceDigest: digest,
    reason,
    detail: reason,
  });
  if (source.source !== "school_textbook" || source.origin_problem_id !== null)
    return unresolved("not-textbook-original");
  if (!source.direct_use_allowed || source.review_status !== "approved")
    return unresolved("source-held");
  if (
    source.figure_svg ||
    source.figure_urls?.length ||
    source.figure_source ||
    /\[그림\]|<svg|!\[/.test(source.content)
  )
    return unresolved("figure-dependent");
  if (!source.content.trim() || !source.answer.trim())
    return unresolved("source-incomplete");
  try {
    const mcq = source.question_type === "객관식" ? choices(source) : null;
    const working = mcq
      ? {
          ...source,
          content: mcq.stem,
          question_type: "단답형",
          answer: `$${latexQ(mcq.values[mcq.correct]!)}$`,
        }
      : source;
    const matched = solve(working),
      result: TextbookGeometryCandidate[] = [];
    if (mcq && matched.recipe !== "exact-finite-count")
      throw new Error("geometry-numeric-choices-unsupported");
    for (const scale of [2, 3]) {
      let content = matched
        .content(scale)
        .replace(/(\$[^$\n]+\$)(?=\$[^$\n]+\$)/g, (inline) => `${inline} `);
      if (
        content === source.content ||
        result.some((c) => c.content === content)
      )
        throw new Error("insufficient-distinct-pair");
      // Compute from the whole new question, never scale/copy the stored answer or solution.
      const generated = solveWithoutAnswer({ ...working, content });
      if (
        generated.recipe !== matched.recipe ||
        generated.shape !== matched.shape
      )
        throw new Error("structure-changed");
      const labels = parts(working.answer).parts.map((p) => p.label);
      let answer = generated.answers
        .map((a, i) => `${labels[i] ? labels[i] + " " : ""}$${a}$`)
        .join("\n");
      solve({ ...working, content, answer });
      if (mcq) {
        if (generated.answers.length !== 1)
          throw new Error("choice-subquestion-shape");
        const delta = sub(
          rational(generated.answers[0]!),
          mcq.values[mcq.correct]!,
        );
        content +=
          "\n" +
          mcq.values
            .map((v, i) => `${mcq.labels[i]} $${latexQ(add(v, delta))}$`)
            .join("\n");
        answer = mcq.labels[mcq.correct]!;
        const rebuilt = choices({ ...source, content, answer });
        solve({
          ...working,
          content: rebuilt.stem,
          answer: `$${latexQ(rebuilt.values[rebuilt.correct]!)}$`,
        });
      }
      const slot = (result.length + 1) as 1 | 2;
      result.push({
        sourceId: source.id,
        sourceDigest: digest,
        originProblemId: source.id,
        sourceMaterialId: source.source_material_id,
        unitId: source.unit_id,
        sourceExternalId: source.external_id ?? null,
        sourceFile: source.source_file ?? null,
        familyKey: source.family_key ?? null,
        externalId: `tb-retry-v1:${source.id}:${slot}`,
        source: "transformed",
        questionType:
          source.question_type as TextbookGeometryCandidate["questionType"],
        slot,
        recipe: matched.recipe,
        method:
          "complete original template; coordinate homothety or typed finite population change; independently recomputed source answer",
        content,
        answer,
        solution:
          generated.proofs
            .map((p, i) => `${labels[i] ? labels[i] + " " : ""}${p}`)
            .join("\n") + (mcq ? `\n따라서 정답은 ${answer}이다.` : ""),
        figureSvg: null,
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        choiceFigureIndex: [],
        validation: {
          version: TEXTBOOK_VARIANT_VERSION,
          sourceAnswerVerified: true,
          exactStructure: matched.shape,
          checks: [
            "complete-question-consumed",
            "source-answer-exact",
            "subquestion-order-and-count-preserved",
            "question-type-preserved",
            "exact-rational-radical-or-integer-recalculation",
            "generated-question-reparsed",
          ],
          computedAnswers: generated.answers,
          changedLiterals: (content.match(/\d+/g) ?? []).filter(
            (n, i) => n !== (source.content.match(/\d+/g) ?? [])[i],
          ).length,
        },
      });
    }
    return {
      status: "matched",
      sourceId: source.id,
      sourceDigest: digest,
      candidates: result as [
        TextbookGeometryCandidate,
        TextbookGeometryCandidate,
      ],
    };
  } catch (error) {
    return unresolved(
      error instanceof Error ? error.message : "no-exact-geometry-template",
    );
  }
}
// The parsing/computation path is shared, but the original answer is always checked by solve().
function solveWithoutAnswer(source: TextbookVariantSource): Solved {
  return solve(source, false);
}

export function validateTextbookGeometryPair(
  source: TextbookVariantSource,
  candidates: readonly TextbookGeometryCandidate[],
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (
    candidates.length !== 2 ||
    candidates[0]?.slot !== 1 ||
    candidates[1]?.slot !== 2
  )
    issues.push("requires-slots-1-and-2");
  const current = generateTextbookGeometryPair(source);
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
  return { valid: !issues.length, issues };
}
