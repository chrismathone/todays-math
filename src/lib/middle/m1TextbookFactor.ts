/**
 * Textbook T1 extensions of the existing prime-factor calculations.
 * Existing RPM keys and random streams stay untouched. These handlers construct
 * prime powers; the tests recover factors by trial division and solve the
 * displayed unknowns by exhaustive integer substitution.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { attempt, defType, pickDistinct, shuffle, type Body } from "./m1Shared";
import { eulReul } from "./m2Josa";
import type { TypeEntry } from "./types";

const BOOK = "textbook-20261125";
const MINOR = "교과서 수와 연산";
const PRIME_SECTION = "소수와 거듭제곱";
const FACTOR_SECTION = "소인수분해";
type Factors = [number, number][];
const value = (f: Factors) => f.reduce((n, [p, e]) => n * p ** e, 1);
const factorText = (f: Factors) =>
  [...f]
    .sort((a, b) => a[0] - b[0])
    .map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`))
    .join("\\times");
const symbolText = (f: [number, string][]) =>
  [...f]
    .sort((a, b) => a[0] - b[0])
    .map(([p, e]) => (e === "1" ? String(p) : `${p}^{${e}}`))
    .join("\\times");
const labeled = (values: string[]) =>
  values.map((s, i) => `(${i + 1}) $${s}$`).join("\n");
const numberFacts = (ns: number[]) =>
  Object.fromEntries(ns.map((n, i) => [`n${i}`, n]));

function randomFactors(rng: Rng, size?: number): Factors {
  return attempt(200, () => {
    const ps = pickDistinct(
      rng,
      [2, 3, 5, 7, 11],
      size ?? intBetween(rng, 1, 3),
    ).sort((a, b) => a - b);
    const f: Factors = ps.map((p) => [p, intBetween(rng, 1, 3)]);
    return f.reduce((n, [, e]) => n + e, 0) >= 2 && value(f) <= 900 ? f : null;
  });
}

const types: TypeEntry[] = [
  defType(
    BOOK,
    MINOR,
    "F01",
    "여러 자연수의 소인수분해",
    FACTOR_SECTION,
    "기본",
    (rng) => {
      const count = intBetween(rng, 2, 8);
      const fs = attempt(200, () => {
        const candidates = Array.from({ length: count }, () =>
          randomFactors(rng),
        );
        return new Set(candidates.map(value)).size === count
          ? candidates
          : null;
      });
      const ns = fs.map(value);
      return {
        content: `각 수를 소인수분해하시오.\n${labeled(ns.map(String))}`,
        answer: labeled(fs.map(factorText)),
        solution: `작은 소수부터 나누어 소수의 곱으로 나타낸다.\n${labeled(fs.map((f, i) => `${ns[i]}=${factorText(f)}`))}`,
        facts: { count, ...numberFacts(ns) },
      };
    },
  ),
  defType(
    BOOK,
    MINOR,
    "F02",
    "지정한 밑으로 거듭제곱 나타내기",
    PRIME_SECTION,
    "기본",
    (rng) => {
      const mode = intBetween(rng, 0, 2);
      const base = pick(
        rng,
        mode === 2 ? [2, 3] : [2, 3, 4, 5, 6, 7, 8, 9, 10],
      );
      const exponent = mode === 2 ? 6 : intBetween(rng, 2, base >= 5 ? 3 : 4);
      const power = base ** exponent;
      const fraction = mode === 1;
      const numerator = fraction ? 1 : power;
      const denominator = fraction ? power : 1;
      const given = fraction ? `\\dfrac{1}{${power}}` : String(power);
      const bases = mode === 2 ? [base, base ** 2, base ** 3] : [base];
      const baseTexts = bases.map((b) =>
        fraction ? `\\dfrac{1}{${b}}` : String(b),
      );
      const powers = bases.map(
        (b, i) =>
          `${fraction ? `\\left(\\dfrac{1}{${b}}\\right)` : b}^{${mode === 2 ? 6 / (i + 1) : exponent}}`,
      );
      return {
        content:
          mode === 2
            ? `$${given}$${eulReul(numerator)} 다음 각 수를 밑으로 하는 거듭제곱으로 나타내시오.\n${labeled(baseTexts)}`
            : `$${given}$${eulReul(numerator)} 밑이 $${baseTexts[0]}$인 거듭제곱으로 나타내시오.`,
        answer: mode === 2 ? labeled(powers) : `$${powers[0]}$`,
        solution:
          mode === 2
            ? `각 밑을 반복하여 곱하면 같은 수가 된다.\n${labeled(powers.map((p) => `${p}=${given}`))}`
            : `밑을 $${exponent}$번 곱하면 주어진 수가 된다. 따라서 $${given}=${powers[0]}$이다.`,
        facts: { mode, count: bases.length, numerator, denominator, base },
      };
    },
  ),
  defType(
    BOOK,
    MINOR,
    "F03",
    "소인수의 합·개수·지수의 합 비교",
    FACTOR_SECTION,
    "기본",
    (rng) =>
      attempt(500, () => {
        const mode = intBetween(rng, 0, 1); // sum of attributes, or unique maximum
        const metric = mode === 0 ? pick(rng, [0, 2]) : intBetween(rng, 0, 1);
        const count = mode === 1 ? 5 : metric === 2 ? 1 : 2;
        const fs = Array.from({ length: count }, () => randomFactors(rng));
        const ns = fs.map(value);
        if (new Set(ns).size !== count) return null;
        const scores = fs.map((f) =>
          metric === 0
            ? f.reduce((s, [p]) => s + p, 0)
            : metric === 1
              ? f.length
              : f.reduce((s, [, e]) => s + e, 0),
        );
        const max = Math.max(...scores);
        if (mode === 1 && scores.filter((s) => s === max).length !== 1)
          return null;
        const name =
          metric === 0
            ? "서로 다른 소인수의 합"
            : metric === 1
              ? "서로 다른 소인수의 개수"
              : "각 소인수의 지수의 합";
        const answer =
          mode === 1
            ? ns[scores.indexOf(max)]!
            : scores.reduce((a, b) => a + b, 0);
        const content =
          mode === 1
            ? `다음 수 중 ${name}${metric === 1 ? "가" : "이"} 가장 큰 수를 구하시오.\n${ns.map((n) => `$${n}$`).join(", ")}`
            : count === 1
              ? `$${ns[0]}$${eulReul(ns[0]!)} 소인수분해하여 지수의 합을 구하시오.`
              : `두 수 $${ns[0]}$, $${ns[1]}$의 서로 다른 소인수의 합을 각각 $a$, $b$라 하자. $a+b$의 값을 구하시오.`;
        return {
          content,
          answer: `$${answer}$`,
          solution:
            fs
              .map(
                (f, i) =>
                  `$${ns[i]}=${factorText(f)}$이므로 ${name}${metric === 1 ? "는" : "은"} $${scores[i]}$이다.`,
              )
              .join("\n") +
            (mode === 1
              ? `\n따라서 구하는 수는 $${answer}$이다.`
              : count === 1
                ? ""
                : `\n따라서 $a+b=${scores.join("+")}=${answer}$이다.`),
          facts: { mode, metric, count, ...numberFacts(ns) },
        };
      }),
  ),
  defType(
    BOOK,
    MINOR,
    "F04",
    "소인수 조건과 범위에서 자연수 찾기",
    FACTOR_SECTION,
    "응용",
    (rng) =>
      attempt(500, () => {
        const fs = randomFactors(rng, 2);
        const target = value(fs);
        if (target > 250) return null;
        const lo = Math.max(1, target - intBetween(rng, 2, 6)),
          hi = target + intBetween(rng, 2, 6);
        const total = fs[0]![0] + fs[1]![0];
        // The finite constructor enumerates possible prime-power products, not trial division.
        const matches = new Set<number>();
        for (const p of [2, 3, 5, 7, 11, 13, 17, 19])
          for (const q of [2, 3, 5, 7, 11, 13, 17, 19]) {
            if (p >= q || p + q !== total) continue;
            for (let pe = p; pe < hi; pe *= p)
              for (let qe = q; pe * qe < hi; qe *= q)
                if (pe * qe > lo) matches.add(pe * qe);
          }
        if (matches.size !== 1 || !matches.has(target)) return null;
        return {
          content: `$${lo}$보다 크고 $${hi}$보다 작은 자연수 중 서로 다른 소인수가 두 개이고, 그 합이 $${total}$인 수를 구하시오.`,
          answer: `$${target}$`,
          solution: `합이 $${total}$인 서로 다른 두 소수의 쌍을 찾고, 두 소수의 거듭제곱을 곱하여 범위를 확인한다.\n조건에 맞는 수는 $${target}=${factorText(fs)}$뿐이다.`,
          facts: { lo, hi, total },
        };
      }),
  ),
  defType(
    BOOK,
    MINOR,
    "F05",
    "최대공약수·최소공배수의 지수 조건",
    "공배수와 최소공배수",
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 4);
      const [p, q, r, s] = shuffle(rng, [2, 3, 5, 7]) as [
        number,
        number,
        number,
        number,
      ];
      const high = [
        intBetween(rng, 2, 3),
        intBetween(rng, 2, 3),
        intBetween(rng, 2, 3),
      ];
      const low = high.map((h) => intBetween(rng, 1, h - 1));
      if (mode === 3) {
        const { es, fs, n0, n1 } = attempt(200, () => {
          const es = [intBetween(rng, 1, 3), intBetween(rng, 1, 3)];
          const fs = [intBetween(rng, 1, 3), intBetween(rng, 1, 3)];
          const n0 = p ** es[0]! * q ** es[1]! * r;
          const n1 = p ** fs[0]! * q ** fs[1]! * r;
          return n0 !== n1 && Math.max(n0, n1) <= 1800
            ? { es, fs, n0, n1 }
            : null;
        });
        const a = Math.max(es[0]!, fs[0]!),
          b = Math.max(es[1]!, fs[1]!);
        return {
          content: `두 수 $${n0}$, $${n1}$의 최소공배수를 $${symbolText([
            [p, "a"],
            [q, "b"],
            [r, "1"],
          ])}$로 나타낼 때, 자연수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
          answer: `$${a + b}$`,
          solution: `$${n0}=${factorText([
            [p, es[0]!],
            [q, es[1]!],
            [r, 1],
          ])}$, $${n1}=${factorText([
            [p, fs[0]!],
            [q, fs[1]!],
            [r, 1],
          ])}$이다.\n소인수마다 큰 쪽 지수를 택하면 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$이다.`,
          facts: { mode, n0, n1, fixedPrime: r },
        };
      }
      let expressions: string[], g: Factors, l: Factors, answers: number[];
      let primeUnknown = -1,
        hasGcd = 1,
        lcmExpression = "";
      if (mode === 0) {
        expressions = [
          symbolText([
            [p, "a"],
            [q, String(low[1])],
            [r, "b"],
          ]),
          symbolText([
            [p, String(high[0])],
            [q, "c"],
            [r, String(low[2])],
          ]),
        ];
        g = [
          [p, low[0]!],
          [q, low[1]!],
          [r, low[2]!],
        ];
        l = [
          [p, high[0]!],
          [q, high[1]!],
          [r, high[2]!],
        ];
        answers = [low[0]!, high[2]!, high[1]!];
      } else if (mode === 1) {
        expressions = [
          symbolText([
            [p, "a"],
            [q, String(high[1])],
            [r, String(low[2])],
          ]),
          `${symbolText([
            [p, String(high[0])],
            [q, "b"],
          ])}\\times c`,
        ];
        g = [
          [p, low[0]!],
          [q, low[1]!],
        ];
        l = [
          [p, high[0]!],
          [q, high[1]!],
          [r, low[2]!],
          [s, 1],
        ];
        answers = [low[0]!, low[1]!, s];
        primeUnknown = 2;
      } else if (mode === 2) {
        hasGcd = 0;
        expressions =
          intBetween(rng, 0, 1) === 0
            ? [
                symbolText([
                  [p, "a"],
                  [q, "1"],
                ]),
                symbolText([
                  [p, "1"],
                  [q, "b"],
                  [r, "c"],
                ]),
              ]
            : [
                symbolText([
                  [p, "a"],
                  [q, "1"],
                  [r, "1"],
                ]),
                symbolText([
                  [p, "1"],
                  [q, "b"],
                ]),
                symbolText([
                  [q, "1"],
                  [r, "c"],
                ]),
              ];
        g = [[q, 1]];
        l = [
          [p, high[0]!],
          [q, high[1]!],
          [r, high[2]!],
        ];
        answers = [...high];
      } else {
        expressions = [
          symbolText([
            [p, String(low[0])],
            [q, "a"],
            [r, String(high[2])],
          ]),
          symbolText([
            [q, String(high[1])],
            [r, "b"],
            [s, "1"],
          ]),
        ];
        g = [
          [q, low[1]!],
          [r, low[2]!],
        ];
        l = [
          [p, low[0]!],
          [q, high[1]!],
          [r, high[2]!],
          [s, 1],
        ];
        lcmExpression = symbolText([
          [p, String(low[0])],
          [q, "c"],
          [r, "d"],
          [s, "1"],
        ]);
        answers = [low[1]!, low[2]!, high[1]!, high[2]!];
      }
      const variables = "abcd".slice(0, answers.length).split("");
      const request = variables.join("+");
      const total = answers.reduce((a, b) => a + b, 0);
      return {
        content: `${expressions.length === 2 ? "두" : "세"} 수 ${expressions.map((e) => `$${e}$`).join(", ")}의 ${hasGcd ? `최대공약수가 $${factorText(g)}$이고, ` : ""}최소공배수가 $${lcmExpression || factorText(l)}$이다. 자연수 ${variables.map((v) => `$${v}$`).join(", ")}에 대하여 $${request}$의 값을 구하시오.${primeUnknown >= 0 ? " (단, $c$는 소수이다.)" : ""}`,
        answer: `$${total}$`,
        solution: `${hasGcd ? "최대공약수에서는 공통인 소인수의 가장 작은 지수, " : ""}최소공배수에서는 소인수의 가장 큰 지수를 택한다.\n주어진 식의 소인수와 지수를 비교하면 ${variables.map((v, i) => `$${v}=${answers[i]}$`).join(", ")}이다.\n따라서 $${request}=${answers.join("+")}=${total}$이다.`,
        facts: {
          mode,
          rows: expressions.length,
          unknowns: answers.length,
          primeUnknown,
          hasGcd,
          G: value(g),
          L: value(l),
          lcmExpressionIndex: mode === 4 ? expressions.length + 1 : -1,
        },
      };
    },
  ),
  defType(
    BOOK,
    MINOR,
    "F06",
    "기준 수 양쪽의 소수·합성수",
    PRIME_SECTION,
    "응용",
    (rng) => {
      const bound = intBetween(rng, 10, 90);
      const primes = new Set<number>();
      const composite = new Set<number>();
      for (let n = 2; n < 110; n++) {
        if (!composite.has(n)) {
          primes.add(n);
          for (let multiple = n * 2; multiple < 110; multiple += n)
            composite.add(multiple);
        }
      }
      const a = [...primes].find((n) => n > bound)!;
      const b = [...composite]
        .filter((n) => n < bound)
        .sort((x, y) => y - x)[0]!;
      return {
        content: `$${bound}$에서 수를 하나씩 키우며 처음 만나는 소수를 $a$라 하자. $${bound}$에서 수를 하나씩 줄이며 처음 만나는 합성수를 $b$라 할 때, $a-b$의 값을 구하시오.`,
        answer: `$${a - b}$`,
        solution: `기준 수에서 한 수씩 확인하면 $a=${a}$, $b=${b}$이다.\n따라서 $a-b=${a}-${b}=${a - b}$이다.`,
        facts: { bound },
      };
    },
  ),
  defType(
    BOOK,
    MINOR,
    "F07",
    "소인수 집합이 다른 수",
    FACTOR_SECTION,
    "기본",
    (rng) => {
      const [p, q, r] = pickDistinct(rng, [2, 3, 5, 7], 3) as [
        number,
        number,
        number,
      ];
      const powers: [number, number][] = [
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
        [3, 1],
        [1, 3],
      ];
      const fs: Factors[] = pickDistinct(
        rng,
        powers.filter(([a, b]) => p ** a * q ** b <= 900),
        4,
      ).map(([a, b]) => [
        [p, a],
        [q, b],
      ]);
      const odd: Factors = [
        [p, intBetween(rng, 1, 2)],
        [r, intBetween(rng, 1, 2)],
      ];
      const list = shuffle(rng, [...fs, odd]);
      return {
        content: `다음 수 중 나머지 네 수와 소인수의 종류가 다른 수를 구하시오.\n${list.map((f) => `$${value(f)}$`).join(", ")}`,
        answer: `$${value(odd)}$`,
        solution:
          list.map((f) => `$${value(f)}=${factorText(f)}$이다.`).join("\n") +
          `\n따라서 구하는 수는 $${value(odd)}$이다.`,
        facts: { count: list.length, ...numberFacts(list.map(value)) },
      };
    },
  ),
];

export const M1_TEXTBOOK_FACTOR: TypeEntry[] = types;
