/**
 * Test-only blind solver. Inputs are key + displayed content, never MidProblem,
 * facts, answer, generator functions, or the module's arithmetic helpers.
 * Finite searches/evaluation below are independent of the author's construction.
 */
import { parseProblemContent } from "../../../../../src/lib/problem/parseProblemContent";

const marks = ["①", "②", "③", "④", "⑤"];
const requireMatch = (s: string, re: RegExp): RegExpMatchArray => {
  const match = s.match(re);
  if (!match)
    throw new Error("독립 풀이가 발문을 읽지 못함: " + re + " / " + s);
  return match;
};
const formulas = (s: string) =>
  [...s.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const number = (s: string) =>
  Number(requireMatch(s, /^(-?\d+(?:\.\d+)?)(?:\\|$)/)[1]);
const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);
const isSquare = (n: number) => n >= 0 && range(0, n).some((k) => k * k === n);

function sole<T>(items: T[]): T {
  if (items.length !== 1)
    throw new Error("독립 풀이의 해가 유일하지 않음: " + JSON.stringify(items));
  return items[0]!;
}
const math = (n: number) => "$" + n + "$";

/** Tiny evaluator: integers, + - * implicit products, ^, parentheses, x/k/r. No eval. */
export function evaluate(
  text: string,
  vars: Record<string, number> = {},
): number {
  const clean = text.replace(/\s|\\,/g, "");
  const tokens = clean.match(/\d+|[xkr()+\-*^]/g) ?? [];
  if (tokens.join("") !== clean)
    throw new Error("독립 식 파서 범위 밖: " + text);
  let at = 0;
  const peek = () => tokens[at];
  function atom(): number {
    if (peek() === "+") {
      at += 1;
      return atom();
    }
    if (peek() === "-") {
      at += 1;
      return -atom();
    }
    if (peek() === "(") {
      at += 1;
      const value = sum();
      if (tokens[at++] !== ")") throw new Error("닫는 괄호 없음");
      return value;
    }
    const token = tokens[at++];
    if (token === undefined) throw new Error("식이 중간에 끝남");
    if (/^\d+$/.test(token)) return Number(token);
    if (vars[token] !== undefined) return vars[token]!;
    throw new Error("알 수 없는 변수: " + token);
  }
  function power(): number {
    let value = atom();
    if (peek() === "^") {
      at += 1;
      value **= atom();
    }
    return value;
  }
  function product(): number {
    let value = power();
    while (
      peek() === "*" ||
      peek() === "(" ||
      /^[xkr\d]$/.test(peek() ?? "") ||
      /^\d+$/.test(peek() ?? "")
    ) {
      if (peek() === "*") at += 1;
      value *= power();
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[at++];
      const right = product();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  const value = sum();
  if (at !== tokens.length)
    throw new Error("식의 끝에 읽지 않은 문자: " + text);
  return value;
}

/** A quadratic's exact integer coefficient vector, reconstructed by evaluation. */
const coefficients = (s: string) => {
  const c = evaluate(s, { x: 0 });
  const right = evaluate(s, { x: 1 });
  const left = evaluate(s, { x: -1 });
  return [(right + left - 2 * c) / 2, (right - left) / 2, c];
};
const equationCoefficients = (s: string) => {
  const sides = s.split("=");
  if (sides.length !== 2) throw new Error("등식이 아님");
  const l = coefficients(sides[0]!);
  const r = coefficients(sides[1]!);
  return l.map((v, i) => v - r[i]!);
};
const mean = (values: number[]) =>
  values.reduce((s, v) => s + v, 0) / values.length;
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const varianceNumerator = (values: number[]) => {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0);
};
const list = (s: string) => s.split(",").map((v) => Number(v.trim()));

function radical(s: string): {
  rational: number;
  irrational: number;
  radicand: number;
} {
  const roots = [...s.matchAll(/\\sqrt\{(\d+)\}/g)];
  const d = Number(sole(roots)[1]);
  const normalized = s.replace(/\\sqrt\{\d+\}/, "r");
  // r is formal here: evaluate at 0/1 recovers the exact two coefficients.
  return {
    rational: evaluate(normalized, { r: 0 }),
    irrational: evaluate(normalized, { r: 1 }) - evaluate(normalized, { r: 0 }),
    radicand: d,
  };
}

export type BlindResult = {
  expected: string;
  evidence: Record<string, unknown>;
};

export function solveBlind(key: string, content: string): BlindResult {
  const id = key.split("|").at(-1);
  const parsed = parseProblemContent(content);
  const q = parsed.question;
  const f = formulas(q);
  const options = parsed.choices;
  const choose = (
    truth: boolean[],
    evidence: Record<string, unknown>,
  ): BlindResult => {
    if (
      truth.length !== 5 ||
      options.length !== 5 ||
      new Set(options).size !== 5
    ) {
      throw new Error("독립 검산에서 5개 보기 계약 위반");
    }
    const index = sole(truth.flatMap((v, i) => (v ? [i] : [])));
    return { expected: marks[index]!, evidence: { ...evidence, truth } };
  };

  switch (id) {
    case "R01": {
      const n = Number(requireMatch(q, /\\sqrt\{(\d+)\}/)[1]);
      const digits = Number(requireMatch(q, /아래 \$(\d+)\$자리/)[1]);
      const approximation = requireMatch(q, /반올림되어 \$([\d.]+)\$/)[1]!;
      const numerator = Number(approximation.replace(".", ""));
      const denominator = 10 ** digits;
      // Prove rounding by rational interval squared, without Math.sqrt/toFixed.
      const low = (2 * numerator - 1) ** 2;
      const high = (2 * numerator + 1) ** 2;
      if (
        !(low <= 4 * denominator ** 2 * n && 4 * denominator ** 2 * n < high) ||
        isSquare(n)
      ) {
        throw new Error("근삿값 또는 무리수 전제 오류");
      }
      return choose(
        options.map(
          (s) =>
            /완전제곱수가 아니므로/.test(s) && /정확한 값은 다르다/.test(s),
        ),
        { n, digits, approximation, squaredBounds: [low, high] },
      );
    }
    case "R02": {
      const target = Number(f.at(-1));
      const givenRadicand = Number(requireMatch(q, /\\sqrt\{(\d+)\}/)[1]);
      const pairs = options.map((s) => {
        const [a, b] = formulas(s).map(radical);
        if (!a || !b || a.radicand !== b.radicand || isSquare(a.radicand))
          throw new Error("무리수 쌍 조건 위반");
        return [a, b] as const;
      });
      if (new Set(pairs.map((pair) => JSON.stringify(pair))).size !== 5)
        throw new Error("동치인 무리수 쌍 보기");
      return choose(
        pairs.map(
          ([a, b]) =>
            a.radicand === givenRadicand &&
            a.rational === 0 &&
            a.irrational === 1 &&
            b.irrational !== 0 &&
            a.irrational + b.irrational === 0 &&
            a.rational + b.rational === target,
        ),
        { target, givenRadicand, pairs },
      );
    }
    case "R03": {
      const equation = sole(f.filter((s) => s.includes("=")));
      const [left, right] = equation.split("=");
      const affineConstant = evaluate(left!, { x: 0 });
      const affineScale = evaluate(left!, { x: 1 }) - affineConstant;
      const rhs = radical(right!);
      if (affineScale === 0 || isSquare(rhs.radicand))
        throw new Error("분류를 확정할 수 없는 조건");
      const x = {
        rational: (rhs.rational - affineConstant) / affineScale,
        irrational: rhs.irrational / affineScale,
      };
      return choose(
        options.map(
          (s) =>
            x.irrational !== 0 &&
            /유리수라면.*모순/.test(s) &&
            /따라서 \$x\$는 무리수/.test(s),
        ),
        { affineScale, affineConstant, rhs, x },
      );
    }
    case "F01": {
      const [left, right] = f[0]!.split("=");
      if (!left || !right) throw new Error("등식 없음");
      const candidates = f
        .slice(1)
        .filter((s) => /^-?\d+$/.test(s))
        .map(Number);
      if (candidates.length !== 5) throw new Error("대입 후보는 5개");
      const residuals = candidates.map(
        (x) => evaluate(right, { x }) - evaluate(left, { x }),
      );
      if (residuals.every((v) => v === 0))
        throw new Error("잘못된 항등식이어야 함");
      return {
        expected: math(sole(candidates.filter((_, i) => residuals[i] === 0))),
        evidence: { candidates, residuals },
      };
    }
    case "F02": {
      const givenSum = Number(requireMatch(q, /합이 \$(-?\d+)\$/)[1]);
      const vectors = options.map((s) => coefficients(sole(formulas(s))));
      if (new Set(vectors.map((v) => JSON.stringify(v))).size !== 5)
        throw new Error("동치인 다항식 보기");
      const pairs = vectors.map(([a, b, c]) => {
        if (a !== 1 || b === undefined || c === undefined)
          throw new Error("최고차항 계수가 1이 아님");
        const bound = Math.abs(c) + 1;
        return range(-bound, bound).flatMap((p) =>
          p * (b - p) === c ? [[p, b - p]] : [],
        );
      });
      return choose(
        pairs.map((p, i) => p.length > 0 && vectors[i]![1] === givenSum),
        { givenSum, vectors, integerFactorPairs: pairs },
      );
    }
    case "F03": {
      const first = f[0]!;
      const second = f[1]!;
      const positiveRoots = range(1, 100).filter(
        (x) => evaluate(first, { x }) === 0,
      );
      const root = sole(positiveRoots);
      const constant = evaluate(second, { x: root, k: 0 });
      const k = -constant;
      if (evaluate(second, { x: root, k }) !== 0)
        throw new Error("공통 인수 불일치");
      return {
        expected: math(k),
        evidence: {
          first,
          second,
          positiveRoots,
          substitutedConstant: constant,
        },
      };
    }
    case "Q01": {
      const a = number(f[0]!);
      const b = number(f[1]!);
      const area = number(f[2]!);
      const vectors = options.map((s) =>
        equationCoefficients(sole(formulas(s))),
      );
      const normalized = vectors.map((v) => {
        const first = v.find((n) => n !== 0);
        if (first === undefined) throw new Error("항등식인 보기");
        return JSON.stringify(v.map((n) => n / first));
      });
      if (new Set(normalized).size !== 5) throw new Error("동치인 방정식 보기");
      // Reconstruct area through actual corner coordinates for three x values.
      const residualAt = (x: number) => {
        const points = [
          [0, 0],
          [a + x, 0],
          [a + x, b + x],
          [0, b + x],
        ];
        const twiceArea = points.reduce((sum, p, i) => {
          const next = points[(i + 1) % 4]!;
          return sum + p[0]! * next[1]! - p[1]! * next[0]!;
        }, 0);
        return twiceArea / 2 - area;
      };
      const c = residualAt(0);
      const expected = [
        (residualAt(1) + residualAt(-1) - 2 * c) / 2,
        (residualAt(1) - residualAt(-1)) / 2,
        c,
      ];
      return choose(
        vectors.map((v) => v.every((n, i) => n === expected[i])),
        { a, b, area, vectors, expected },
      );
    }
    case "Q02": {
      const perimeter = number(f[0]!);
      const areas = options.map((s) => number(sole(formulas(s))));
      // Solve x+y=P/2, xy=S. Negative discriminant independently rules it out.
      const discriminants = areas.map((s) => (perimeter / 2) ** 2 - 4 * s);
      const feasible = areas.map((s, i) => s > 0 && discriminants[i]! >= 0);
      return choose(
        feasible.map((v) => !v),
        { perimeter, areas, discriminants },
      );
    }
    case "Q03": {
      const extra = Number(requireMatch(q, /학생 수보다 \$(\d+)\$/)[1]);
      const stock = Number(requireMatch(q, /공책 \$(\d+)\$권/)[1]);
      const low = Number(requireMatch(q, /남는 공책이 \$(\d+)\$권 이상/)[1]);
      const high = Number(requireMatch(q, /이상 \$(\d+)\$권 이하/)[1]);
      // Complete enumeration, independent of the author's adjacent-count proof.
      const witnesses = range(1, stock)
        .map((n) => ({ n, r: stock - n * (n + extra) }))
        .filter(({ r }) => low <= r && r <= high);
      return {
        expected: math(sole(witnesses).r),
        evidence: { extra, stock, low, high, studentCountWitnesses: witnesses },
      };
    }
    case "S01": {
      const original = list(f[0]!);
      const old = number(f[1]!);
      const replacement = number(f[2]!);
      const revised = [...original];
      const at = revised.indexOf(old);
      if (at < 0 || old !== Math.max(...original))
        throw new Error("최댓값 한 개 수정 조건 오류");
      revised[at] = replacement;
      const deltaMean = mean(revised) - mean(original);
      const deltaMedian = median(revised) - median(original);
      const truth = options.map((s) => {
        const amounts = formulas(s).map(number);
        if (/평균과 중앙값이 모두 변하지/.test(s))
          return deltaMean === 0 && deltaMedian === 0;
        if (/평균은 변하지 않고/.test(s))
          return deltaMean === 0 && deltaMedian === amounts[0];
        const claimedDelta = /작아지고/.test(s) ? -amounts[0]! : amounts[0]!;
        return deltaMean === claimedDelta && deltaMedian === 0;
      });
      return choose(truth, { original, revised, deltaMean, deltaMedian });
    }
    case "S02": {
      const [m, sd, , , newM, newSd] = f.map((s) =>
        /^-?\d+$/.test(s) ? Number(s) : null,
      );
      if (
        m === null ||
        sd === null ||
        newM === null ||
        newSd === null ||
        m === undefined ||
        sd === undefined ||
        newM === undefined ||
        newSd === undefined
      )
        throw new Error("자료 조건을 읽지 못함");
      // A concrete independent dataset realizes exactly the old summary.
      const original = [m - sd, m + sd];
      const matches: Array<{ a: number; b: number; revised: number[] }> = [];
      // The observed ratio gives a finite upper bound; test integer transforms.
      for (let a = 1; a <= newSd / sd + 1; a += 1) {
        for (let b = -100; b <= 100; b += 1) {
          const revised = original.map((v) => a * v + b);
          if (
            mean(revised) === newM &&
            varianceNumerator(revised) / revised.length === newSd ** 2
          ) {
            matches.push({ a, b, revised });
          }
        }
      }
      const match = sole(matches);
      // Also certify uniqueness for real a>0 via a²*oldVariance=newVariance.
      if (match.a ** 2 * sd ** 2 !== newSd ** 2 || !(match.a > 0))
        throw new Error("역변환 부호 조건 위반");
      return {
        expected: math(match.b),
        evidence: { original, newM, newSd, match },
      };
    }
    case "S03": {
      const a = list(f[0]!);
      const b = list(f[1]!);
      const am = mean(a),
        bm = mean(b);
      const av = varianceNumerator(a) / a.length,
        bv = varianceNumerator(b) / b.length;
      const truth = options.map((s) => {
        if (/평균은 A가 B보다 크다/.test(s)) return am > bm;
        if (/평균은 A가 B보다 작다/.test(s)) return am < bm;
        if (/평균과 분산이 모두 같다/.test(s)) return am === bm && av === bv;
        if (/분산은 A가 B보다 크다/.test(s)) return am === bm && av > bv;
        if (/분산은 A가 B보다 작다/.test(s)) return am === bm && av < bv;
        throw new Error("비교 문장 범위 밖");
      });
      return choose(truth, { a, b, means: [am, bm], variances: [av, bv] });
    }
    default:
      throw new Error("미등록 독립 풀이: " + key);
  }
}
