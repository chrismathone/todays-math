/** Pure, bounded notation comparison. This is not an algebra solver. */
const LIMIT = {
  answer: 2048,
  question: 16000,
  tokens: 512,
  depth: 32,
  digits: 96,
};
const ZERO = BigInt(0);
const ONE = BigInt(1);

type Rational = { kind: "number"; n: bigint; d: bigint; key: string };
type Node =
  | Rational
  | { kind: "variable"; key: string }
  | { kind: "sum" | "product"; children: Node[]; key: string }
  | { kind: "division" | "power" | "root"; key: string };
type Token = { kind: string; value: string };

function unsupported(): never {
  throw new Error("unsupported-scalar-notation");
}

function bounded(value: bigint): bigint {
  if (value.toString().replace("-", "").length > LIMIT.digits) unsupported();
  return value;
}

function rational(n: bigint, d: bigint = ONE): Rational {
  bounded(n);
  bounded(d);
  if (d === ZERO) unsupported();
  if (d < ZERO) [n, d] = [-n, -d];
  let a = n < ZERO ? -n : n;
  let b = d;
  while (b !== ZERO) [a, b] = [b, a % b];
  n /= a;
  d /= a;
  return { kind: "number", n, d, key: `n(${n}/${d})` };
}

function numeric(text: string): Rational {
  const [integer, decimal = ""] = text.split(".");
  if (integer.length + decimal.length > LIMIT.digits) unsupported();
  return rational(
    BigInt(`${integer || "0"}${decimal}`),
    BigInt(10) ** BigInt(decimal.length),
  );
}

function combine(kind: "sum" | "product", left: Node, right: Node): Node {
  const children = [left, right].flatMap((node) =>
    node.kind === kind ? node.children : [node],
  );
  let number = rational(kind === "sum" ? ZERO : ONE);
  const symbolic: Node[] = [];
  for (const node of children) {
    if (node.kind !== "number") symbolic.push(node);
    else if (kind === "sum") {
      number = rational(
        bounded(number.n * node.d) + bounded(node.n * number.d),
        bounded(number.d * node.d),
      );
    } else {
      number = rational(bounded(number.n * node.n), bounded(number.d * node.d));
    }
  }
  // Never remove symbolic operands, even in 0*x, x-x, or 0*(1/x).
  if (!symbolic.length) return number;
  const identity = kind === "sum" ? number.n === ZERO : number.n === number.d;
  if (!identity) symbolic.push(number);
  symbolic.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  if (symbolic.length === 1) return symbolic[0];
  return {
    kind,
    children: symbolic,
    key: `${kind}(${symbolic.map((node) => node.key).join(",")})`,
  };
}

function negate(node: Node): Node {
  return combine("product", rational(-ONE), node);
}

function divide(left: Node, right: Node): Node {
  if (right.kind === "number" && right.n === ZERO) unsupported();
  if (left.kind === "number" && right.kind === "number") {
    return rational(bounded(left.n * right.d), bounded(left.d * right.n));
  }
  // Retain every denominator and its position; no cancellation or hole removal.
  return { kind: "division", key: `div(${left.key},${right.key})` };
}

function power(base: Node, exponent: Node): Node {
  if (base.kind === "number" && exponent.kind === "number") {
    if (base.n === ZERO && exponent.n <= ZERO) unsupported();
    if (base.n < ZERO && exponent.d !== ONE) unsupported();
  }
  // No power evaluation or root/power conversion, including exponent zero.
  return { kind: "power", key: `pow(${base.key},${exponent.key})` };
}

function root(degree: Node, radicand: Node): Node {
  if (
    degree.kind !== "number" ||
    degree.d !== ONE ||
    degree.n < BigInt(2) ||
    degree.n > BigInt(64)
  )
    unsupported();
  if (
    radicand.kind === "number" &&
    radicand.n < ZERO &&
    degree.n % BigInt(2) === ZERO
  )
    unsupported();
  return { kind: "root", key: `root(${degree.key},${radicand.key})` };
}

function unwrap(text: string): string {
  if (text.length > LIMIT.answer) unsupported();
  let result = text.trim();
  for (const [left, right] of [
    ["$$", "$$"],
    ["$", "$"],
    ["\\(", "\\)"],
    ["\\[", "\\]"],
  ]) {
    if (
      result.startsWith(left) &&
      result.endsWith(right) &&
      result.length > left.length + right.length
    ) {
      result = result.slice(left.length, -right.length).trim();
      break;
    }
  }
  // A leading numbered answer part must never turn into multiplication.
  if (/^\(\s*\d+\s*\)\s*(?:[a-z0-9({\\√∛∜])/.test(result)) unsupported();
  return result;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < text.length) {
    if (tokens.length >= LIMIT.tokens) unsupported();
    const rest = text.slice(offset);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      offset += whitespace[0].length;
      continue;
    }
    const command = /^\\([a-z]+|[,;:! ])/.exec(rest);
    if (command) {
      offset += command[0].length;
      const name = command[1];
      if (/^(?:[,;:! ]|quad|qquad)$/.test(name)) continue;
      const commands: Record<string, string> = {
        frac: "frac",
        dfrac: "frac",
        tfrac: "frac",
        sqrt: "sqrt",
        times: "*",
        cdot: "*",
        div: "/",
        left: "left",
        right: "right",
      };
      if (!Object.hasOwn(commands, name)) unsupported();
      tokens.push({ kind: commands[name], value: name });
      continue;
    }
    const number = /^(?:\d+(?:\.\d+)?|\.\d+)/.exec(rest);
    if (number) {
      tokens.push({ kind: "number", value: number[0] });
      offset += number[0].length;
      continue;
    }
    const word = /^[a-z]+/.exec(rest);
    if (word) {
      // Bare words are never split into letters (cm, mm, kg, sin, log, ...).
      if (word[0].length !== 1 && word[0] !== "sqrt") unsupported();
      tokens.push({
        kind: word[0] === "sqrt" ? "sqrt" : "variable",
        value: word[0],
      });
      offset += word[0].length;
      continue;
    }
    const superscript = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/.exec(rest);
    if (superscript) {
      const value = [...superscript[0]]
        .map((char) =>
          char === "⁺"
            ? "+"
            : char === "⁻"
              ? "-"
              : "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(char).toString(),
        )
        .join("");
      if (!/^[+-]?\d+$/.test(value) || value.length > LIMIT.digits)
        unsupported();
      tokens.push({ kind: "superscript", value });
      offset += superscript[0].length;
      continue;
    }
    const char = rest[0];
    const glyphs: Record<string, string> = {
      "−": "-",
      "×": "*",
      "·": "*",
      "÷": "/",
      "√": "radical",
      "∛": "radical",
      "∜": "radical",
    };
    if (Object.hasOwn(glyphs, char))
      tokens.push({ kind: glyphs[char], value: char });
    else if ("+-*/^(){}[]".includes(char))
      tokens.push({ kind: char, value: char });
    else unsupported();
    offset++;
  }
  tokens.push({ kind: "end", value: "" });
  return tokens;
}

class Parser {
  private position = 0;
  private depth = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly variables: Set<string>,
  ) {}

  private peek(): Token {
    return this.tokens[this.position];
  }
  private take(kind: string): Token {
    const token = this.peek();
    if (token.kind !== kind) unsupported();
    this.position++;
    return token;
  }
  private nested<T>(parse: () => T): T {
    if (++this.depth > LIMIT.depth) unsupported();
    const result = parse();
    this.depth--;
    return result;
  }

  parse(): Node {
    const result = this.sum();
    this.take("end");
    return result;
  }
  private sum(): Node {
    let result = this.product();
    while (this.peek().kind === "+" || this.peek().kind === "-") {
      const sign = this.take(this.peek().kind).kind;
      const term = this.product();
      result = combine("sum", result, sign === "-" ? negate(term) : term);
    }
    return result;
  }
  private product(): Node {
    let result = this.unary();
    let lastFactor = result;
    while (true) {
      const kind = this.peek().kind;
      if (kind === "*" || kind === "/") {
        this.take(kind);
        lastFactor = this.unary();
        result =
          kind === "*"
            ? combine("product", result, lastFactor)
            : divide(result, lastFactor);
        // a/bc and a/b(c+d) have competing division conventions. Require '*'.
        if (kind === "/" && this.startsImplicit()) unsupported();
      } else if (this.startsImplicit()) {
        lastFactor = this.unary();
        result = combine("product", result, lastFactor);
      } else return result;
    }
  }
  private startsImplicit(): boolean {
    return ["variable", "(", "{", "left", "frac", "sqrt", "radical"].includes(
      this.peek().kind,
    );
  }
  private unary(): Node {
    return this.nested(() => {
      const kind = this.peek().kind;
      if (kind === "+" || kind === "-") {
        this.take(kind);
        const value = this.unary();
        return kind === "-" ? negate(value) : value;
      }
      const result = this.power();
      // f(x), -f(x), and f^2(x) could be functions. Use an explicit '*'
      // for variable coefficients; check before unary signs wrap the node.
      if (
        ["variable", "power"].includes(result.kind) &&
        ["(", "{", "left"].includes(this.peek().kind)
      )
        unsupported();
      return result;
    });
  }
  private power(): Node {
    const base = this.atom();
    if (this.peek().kind === "superscript") {
      const exponent = rational(BigInt(this.take("superscript").value));
      if (this.peek().kind === "radical") unsupported();
      return power(base, exponent);
    }
    if (this.peek().kind !== "^") return base;
    this.take("^");
    const exponent = this.nested(() => {
      const kind = this.peek().kind;
      if (kind === "+" || kind === "-") {
        this.take(kind);
        const value = this.atom();
        return kind === "-" ? negate(value) : value;
      }
      return this.atom();
    });
    return power(base, exponent);
  }
  private group(expected?: string): Node {
    return this.nested(() => {
      const sized = this.peek().kind === "left";
      if (sized) this.take("left");
      const open = this.peek().kind;
      if ((expected && open !== expected) || !["(", "{", "["].includes(open))
        unsupported();
      this.take(open);
      const result = this.sum();
      if (sized) this.take("right");
      this.take(open === "(" ? ")" : open === "{" ? "}" : "]");
      return result;
    });
  }
  private atom(): Node {
    const token = this.peek();
    if (token.kind === "number") {
      this.take("number");
      return numeric(token.value);
    }
    if (token.kind === "variable") {
      this.take("variable");
      if (!this.variables.has(token.value)) unsupported();
      return { kind: "variable", key: `v(${token.value})` };
    }
    if (["(", "{", "left"].includes(token.kind)) return this.group();
    if (token.kind === "frac") {
      this.take("frac");
      return divide(this.group("{"), this.group("{"));
    }
    if (token.kind === "sqrt") {
      this.take("sqrt");
      const degree =
        this.peek().kind === "[" ? this.group("[") : rational(BigInt(2));
      if (!["(", "{"].includes(this.peek().kind)) unsupported();
      return root(degree, this.group());
    }
    if (token.kind === "radical" || token.kind === "superscript") {
      let degree: Node;
      if (token.kind === "superscript") {
        degree = rational(BigInt(this.take("superscript").value));
        if (this.take("radical").value !== "√") unsupported();
      } else {
        const glyph = this.take("radical").value;
        degree = rational(BigInt(glyph === "√" ? 2 : glyph === "∛" ? 3 : 4));
      }
      const grouped = ["(", "{"].includes(this.peek().kind);
      if (!grouped && !["number", "variable"].includes(this.peek().kind))
        unsupported();
      const radicand = grouped ? this.group() : this.atom();
      // A glyph has no visible vinculum: require grouping for √a² or √3a.
      if (
        !grouped &&
        (this.startsImplicit() ||
          ["^", "superscript"].includes(this.peek().kind))
      )
        unsupported();
      return root(degree, radicand);
    }
    return unsupported();
  }
}

function scalarVariables(question: string): Set<string> {
  if (question.length > LIMIT.question || !question.trim()) unsupported();
  if (
    /행렬|벡터|좌표|순서|튜플|성분|사원수|복소수|각각|차례로|오름차순|내림차순|단위|센티미터|밀리미터|킬로그램|와트|미터|그램|길이|넓이|둘레|부피|질량|무게|거리|속력|속도|온도/.test(
      question,
    ) ||
    /\b(?:matri(?:x|ces)|vectors?|tensors?|quaternions?|complex|imaginary|coordinates?|tuples?|ordered\s+(?:pairs?|triples?)|respectively|subparts?|units?|length|area|volume|mass|weight|distance|speed|centimet(?:er|re)|millimet(?:er|re)|kilogram|watt|cm|mm|kg|km|mg|ml|hz|pa)\b/i.test(
      question,
    ) ||
    /\\(?:vec|overrightarrow|begin|[pbvBV]?matrix|langle|mathbf|boldsymbol)\b|[①-⑳⑴-⒇]|\(\s*(?:\d+|[a-z가-힣])\s*\)\s*[^+\-*/^=]/.test(
      question,
    ) ||
    /[([][^()[\]\n]{0,120},[^()[\]\n]{0,120}[)\]]/.test(question)
  )
    unsupported();
  // Context anchors single letters as variables; words/units in an answer cannot
  // invent fresh variables. No substitutions from question equations are made.
  const variables = new Set(
    [...question.matchAll(/(?<![a-zA-Z\\])[a-z](?![a-zA-Z])/g)].map(
      (match) => match[0],
    ),
  );
  // A bare m/g/s/l/h/t could be a unit. Require an explicit scalar declaration
  // for these letters rather than interpreting a measurement as multiplication.
  for (const name of ["m", "g", "s", "l", "h", "t"]) {
    const declaration = new RegExp(
      `(?:실수|정수|자연수|유리수|상수|변수|문자|\\b(?:real|scalar|integer|variable|constant)s?\\b)[^.;\\n]{0,40}(?<![a-zA-Z])${name}(?![a-zA-Z])|(?<![a-zA-Z])${name}(?![a-zA-Z])[^.;\\n]{0,40}(?:실수|정수|자연수|유리수|상수|변수|문자|\\b(?:real|scalar|integer|variable|constant)s?\\b)`,
      "i",
    );
    if (!declaration.test(question)) variables.delete(name);
  }
  return variables;
}

/**
 * true: the supported notation proves equality with the same symbolic domains.
 * false: both parse, but their conservative canonical forms differ (not a proof
 * of mathematical inequality). null: unsupported, ambiguous, malformed, or over
 * budget. Do not treat false/null as permission to edit either answer.
 */
export function compareScalarAnswerNotation(
  left: string,
  right: string,
  question: string,
): boolean | null {
  try {
    const variables = scalarVariables(question);
    const a = new Parser(tokenize(unwrap(left)), variables).parse();
    const b = new Parser(tokenize(unwrap(right)), variables).parse();
    return a.key === b.key;
  } catch {
    return null;
  }
}
