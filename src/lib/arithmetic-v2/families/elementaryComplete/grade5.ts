import {
  blank,
  complete,
  decimalAnswer,
  decimalText,
  frac,
  gcd,
  grid,
  integerAnswer,
  math,
  product,
  range,
  rationalAnswer,
  table,
  type CompleteSpec,
} from "./core";
const specs: CompleteSpec[] = [];
const numberTheory = {
  grade: "초5",
  strand: "자연수",
  semester: 1,
  unit: "약수와 배수",
} as const;
for (const sum of [false, true])
  specs.push({
    ...numberTheory,
    key: `g5-divisor-${sum ? "sum" : "count"}`,
    title: `약수의 ${sum ? "합" : "개수"}`,
    description: "2~120의 자연수의 약수를 찾아 합 또는 개수를 구합니다.",
    domain: grid([[2, 120]]),
    prompt: ([a]) =>
      math(
        `${a}의 약수`,
        `${a}\\text{의 약수}`,
        `약수의 ${sum ? "합" : "개수"}를 구하세요.`,
      ),
    calculate: ([a]) =>
      integerAnswer(
        range(1, a)
          .filter((n) => a % n === 0)
          .reduce((value, n) => value + (sum ? n : 1), 0),
      ),
    holds: ([a], n) => {
      let residual = n;
      for (let d = 1; d * d <= a; d++)
        if (a % d === 0)
          residual -= BigInt(
            sum ? d + (d * d === a ? 0 : a / d) : d * d === a ? 1 : 2,
          );
      return residual === BigInt(0);
    },
  });
for (const lcm of [false, true])
  specs.push({
    ...numberTheory,
    key: `g5-${lcm ? "lcm" : "gcd"}`,
    title: lcm ? "최소공배수" : "최대공약수",
    description: "2~60의 자연수 두 개. 같은 수와 서로소인 수를 포함합니다.",
    domain: table(
      product(range(2, 60), range(2, 60)).filter(([a, b]) => a <= b),
    ),
    prompt: ([a, b]) =>
      math(
        `${a}, ${b}`,
        `${a},\\;${b}`,
        `${lcm ? "최소공배수" : "최대공약수"}를 구하세요.`,
      ),
    calculate: ([a, b]) => integerAnswer(lcm ? (a / gcd(a, b)) * b : gcd(a, b)),
    holds: ([a, b], n) => {
      if (n < BigInt(1)) return false;
      if (lcm) {
        if (n % BigInt(a) || n % BigInt(b) || n > BigInt(a * b)) return false;
        for (let k = Math.max(a, b); BigInt(k) < n; k += Math.max(a, b))
          if (k % a === 0 && k % b === 0) return false;
        return true;
      }
      if (BigInt(a) % n || BigInt(b) % n) return false;
      for (let d = Number(n) + 1; d <= Math.min(a, b); d++)
        if (a % d === 0 && b % d === 0) return false;
      return true;
    },
  });
for (const count of [false, true])
  specs.push({
    ...numberTheory,
    key: `g5-multiple-${count ? "count" : "nth"}`,
    title: count ? "범위 안의 배수 개수" : "몇 번째 배수",
    description: "2~12의 배수. 양의 배수만 세며 상한 또는 순번이 명시됩니다.",
    domain: grid([
      [2, 12],
      [2, 30],
    ]),
    prompt: ([a, k]) =>
      count
        ? math(
            `${a * k + 1} 이하인 ${a}의 배수`,
            `${a * k + 1}\\text{ 이하인 }${a}\\text{의 배수}`,
            "양의 배수의 개수를 구하세요.",
          )
        : math(
            `${a}의 ${k}번째 배수`,
            `${a}\\text{의 }${k}\\text{번째 배수}`,
            "가장 작은 양의 배수부터 세어 구하세요.",
          ),
    calculate: ([a, k]) => integerAnswer(count ? k : a * k),
    holds: ([a, k], n) =>
      count
        ? n * BigInt(a) <= BigInt(a * k + 1) &&
          (n + BigInt(1)) * BigInt(a) > BigInt(a * k + 1)
        : n / BigInt(a) === BigInt(k) && n % BigInt(a) === BigInt(0),
  });
const fractions = {
  grade: "초5",
  strand: "분수",
  semester: 1,
  unit: "약분과 통분",
} as const;
const reduceRows = table(
  range(2, 12).flatMap((d) =>
    product(range(1, d - 1), [d], range(2, 9)).filter(
      ([n, den]) => gcd(n, den) === 1,
    ),
  ),
);
specs.push({
  ...fractions,
  key: "g5-reduce-fraction",
  title: "기약분수로 약분",
  description: "분모 2~12의 기약분수에 2~9를 곱해 만든 분수입니다.",
  domain: reduceRows,
  kind: "rational",
  prompt: ([n, d, k]) =>
    math(`${n * k}/${d * k}`, frac(n * k, d * k), "기약분수로 나타내세요."),
  calculate: ([n, d]) => rationalAnswer(n, d),
  holds: ([n, d, k], a, b) => a * BigInt(d * k) === b * BigInt(n * k),
});
for (const denominator of [false, true])
  specs.push({
    ...fractions,
    key: `g5-equivalent-fraction-${denominator ? "denominator" : "numerator"}`,
    title: `크기가 같은 분수의 ${denominator ? "분모" : "분자"}`,
    description:
      "주어진 분수와 같은 크기의 분수에서 숫자 빈칸 하나를 구합니다.",
    domain: reduceRows,
    prompt: ([n, d, k]) =>
      math(
        `${n}/${d} = ${denominator ? n * k : "□"}/${denominator ? "□" : d * k}`,
        `${frac(n, d)}=\\frac{${denominator ? n * k : blank}}{${denominator ? blank : d * k}}`,
        "빈칸에 알맞은 수를 구하세요.",
      ),
    calculate: ([n, d, k]) => integerAnswer((denominator ? d : n) * k),
    holds: ([n, d, k], x) =>
      denominator
        ? BigInt(n) * x === BigInt(n * k * d)
        : x * BigInt(d) === BigInt(n * d * k),
  });
const commonRows = table(
  product(range(2, 12), range(2, 12)).filter(([a, b]) => a < b),
);
for (const numerator of [false, true])
  specs.push({
    ...fractions,
    key: `g5-common-${numerator ? "numerator" : "denominator"}`,
    title: numerator ? "통분한 분자의 값" : "가장 작은 공통분모",
    description:
      "서로 다른 분모 2~12인 두 단위분수를 가장 작은 공통분모로 통분합니다.",
    domain: commonRows,
    prompt: ([a, b]) =>
      math(
        `1/${a}, 1/${b}`,
        `${frac(1, a)},\\;${frac(1, b)}`,
        numerator
          ? "가장 작은 공통분모로 통분했을 때 첫 번째 분수의 분자를 구하세요."
          : "통분할 수 있는 가장 작은 공통분모를 구하세요.",
      ),
    calculate: ([a, b]) =>
      integerAnswer(numerator ? b / gcd(a, b) : (a / gcd(a, b)) * b),
    holds: ([a, b], n) => {
      const claimed = numerator ? n * BigInt(a) : n;
      if (
        claimed < BigInt(1) ||
        claimed > BigInt(a * b) ||
        claimed % BigInt(a) ||
        claimed % BigInt(b)
      )
        return false;
      for (let d = Math.max(a, b); BigInt(d) < claimed; d++)
        if (d % a === 0 && d % b === 0) return false;
      return true;
    },
  });
specs.push({
  ...fractions,
  key: "g5-fraction-to-decimal",
  title: "분수를 소수로 나타내기",
  description:
    "분모 2·4·5·8·20·25·50·100. 소수 셋째 자리까지로 끝나는 분수입니다.",
  domain: table(
    [2, 4, 5, 8, 20, 25, 50, 100].flatMap((d) =>
      range(1, 2 * d - 1)
        .filter((n) => n % d !== 0 && gcd(n, d) === 1)
        .map((n) => [n, d]),
    ),
  ),
  kind: "decimal",
  prompt: ([n, d]) => math(`${n}/${d}`, frac(n, d), "소수로 나타내세요."),
  calculate: ([n, d]) => decimalAnswer((n * 1000) / d, 3),
  holds: ([n, d], a, b) => a * BigInt(d) === BigInt(n) * b,
});
specs.push({
  ...fractions,
  key: "g5-decimal-to-fraction",
  title: "소수를 기약분수로 나타내기",
  description: "0.01~0.99의 소수 두 자리 수를 기약분수로 나타냅니다.",
  domain: table(
    range(1, 99)
      .filter((n) => n % 10 !== 0)
      .map((n) => [n]),
  ),
  kind: "rational",
  prompt: ([n]) =>
    math(decimalText(n, 2), decimalText(n, 2), "기약분수로 나타내세요."),
  calculate: ([n]) => rationalAnswer(n, 100),
  holds: ([n], a, b) => a * BigInt(100) === BigInt(n) * b,
});
const rounding = {
  grade: "초5",
  strand: "자연수",
  semester: 2,
  unit: "수의 범위와 어림하기",
} as const;
specs.push({
  ...rounding,
  key: "g5-range-integer-count",
  title: "수의 범위에 속하는 자연수 개수",
  description: "양 끝의 이상·초과 및 이하·미만을 모두 포함합니다.",
  domain: table(product(range(1, 30), range(2, 12), [0, 1], [0, 1])),
  prompt: ([a, width, lower, upper]) =>
    math(
      `${a} ${lower ? "초과" : "이상"}, ${a + width} ${upper ? "미만" : "이하"}`,
      `${a}\\text{ ${lower ? "초과" : "이상"}, }${a + width}\\text{ ${upper ? "미만" : "이하"}}`,
      "이 범위에 속하는 자연수는 몇 개입니까?",
    ),
  calculate: ([, width, lower, upper]) =>
    integerAnswer(width + 1 - lower - upper),
  holds: ([a, width, lower, upper], n) =>
    n + BigInt(a + lower) - BigInt(1) === BigInt(a + width - upper),
});
for (const mode of ["up", "down", "nearest"] as const)
  specs.push({
    ...rounding,
    key: `g5-round-${mode}`,
    title: `${mode === "up" ? "올림" : mode === "down" ? "버림" : "반올림"}하여 나타내기`,
    description:
      "101~9999의 수를 십·백·천의 자리까지 나타냅니다. 경계와 자리 올림을 포함합니다.",
    domain: grid([
      [101, 9999],
      [1, 3],
    ]),
    prompt: ([a, power]) =>
      math(
        String(a),
        String(a),
        `${mode === "up" ? "올림" : mode === "down" ? "버림" : "반올림"}하여 ${["", "십", "백", "천"][power]}의 자리까지 나타내세요.`,
      ),
    calculate: ([a, power]) => {
      const f = 10 ** power;
      return integerAnswer(
        (mode === "up"
          ? Math.ceil(a / f)
          : mode === "down"
            ? Math.floor(a / f)
            : Math.floor((2 * a + f) / (2 * f))) * f,
      );
    },
    holds: ([a, power], n) => {
      const f = BigInt(10 ** power),
        x = BigInt(a);
      if (n % f) return false;
      return mode === "up"
        ? n >= x && n - f < x
        : mode === "down"
          ? n <= x && n + f > x
          : BigInt(2) * n - f <= BigInt(2) * x &&
            BigInt(2) * x < BigInt(2) * n + f;
    },
  });
for (const reverse of [false, true])
  specs.push({
    grade: "초5",
    strand: "자연수",
    semester: 1,
    unit: "규칙과 대응",
    key: `g5-correspondence-${reverse ? "input" : "output"}`,
    title: `대응 관계의 ${reverse ? "입력" : "결과"} 구하기`,
    description:
      "입력에 일정한 수를 곱하고 더하는 규칙이 명시됩니다. 표의 빈칸 하나를 계산합니다.",
    domain: grid([
      [2, 8],
      [0, 9],
      [3, 20],
    ]),
    prompt: ([a, b, x]) =>
      math(
        `입력 ${reverse ? "□" : x} → 결과 ${reverse ? a * x + b : "□"}`,
        `\\begin{array}{c|ccc}\\text{입력}&1&2&${reverse ? blank : x}\\\\\\hline\\text{결과}&${a + b}&${2 * a + b}&${reverse ? a * x + b : blank}\\end{array}`,
        `입력에 ${a}을 곱한 뒤 ${b}을 더하는 규칙입니다. 빈칸의 수를 구하세요.`,
      ),
    calculate: ([a, b, x]) => integerAnswer(reverse ? x : a * x + b),
    holds: ([a, b, x], n) =>
      reverse
        ? n * BigInt(a) + BigInt(b) === BigInt(a * x + b)
        : n - BigInt(b) === BigInt(a * x),
  });
const decimalRoundingDomain = {
  size: 27000,
  at: (i: number) => {
    const j = Math.floor(i / 3);
    return [j + 1 + Math.floor(j / 9), i % 3];
  },
  has: (p: number[]) =>
    p.length === 2 &&
    p[0] >= 1 &&
    p[0] <= 9999 &&
    p[0] % 10 !== 0 &&
    p[1] >= 0 &&
    p[1] <= 2,
};
for (const mode of ["up", "down", "nearest"] as const)
  specs.push({
    ...rounding,
    strand: "소수",
    key: `g5-round-decimal-${mode}`,
    title: `소수를 ${mode === "up" ? "올림" : mode === "down" ? "버림" : "반올림"}하여 나타내기`,
    description:
      "소수 셋째 자리 수를 일의 자리, 소수 첫째 또는 둘째 자리까지 나타냅니다.",
    domain: decimalRoundingDomain,
    kind: "decimal",
    prompt: ([a, places]) =>
      math(
        decimalText(a, 3),
        decimalText(a, 3),
        `${mode === "up" ? "올림" : mode === "down" ? "버림" : "반올림"}하여 ${places === 0 ? "일의 자리" : `소수 ${places === 1 ? "첫째" : "둘째"} 자리`}까지 나타내세요. 지정한 소수 자리의 0도 쓰세요.`,
      ),
    calculate: ([a, places]) => {
      const f = 10 ** (3 - places);
      const coefficient =
        mode === "up"
          ? Math.ceil(a / f)
          : mode === "down"
            ? Math.floor(a / f)
            : Math.floor((2 * a + f) / (2 * f));
      const text = decimalText(coefficient, places);
      return { ...decimalAnswer(coefficient, places), text, latex: text };
    },
    display: ([, places], n, d) => {
      const text = decimalText((n * 10 ** places) / d, places);
      return { text, latex: text };
    },
    holds: ([a, places], n, d) => {
      const scale = BigInt(10 ** places);
      if ((n * scale) % d) return false;
      const y = (n * scale) / d,
        f = BigInt(10 ** (3 - places)),
        x = BigInt(a);
      return mode === "up"
        ? y * f >= x && (y - BigInt(1)) * f < x
        : mode === "down"
          ? y * f <= x && (y + BigInt(1)) * f > x
          : BigInt(2) * y * f - f <= BigInt(2) * x &&
            BigInt(2) * x < BigInt(2) * y * f + f;
    },
  });
for (const grouping of ["precedence", "parentheses", "brackets"] as const)
  specs.push({
    grade: "초5",
    semester: 1,
    unit: "자연수의 혼합 계산",
    strand: "자연수",
    key: `g5-four-operations-${grouping}`,
    title: `네 연산의 혼합 계산: ${grouping === "precedence" ? "연산 순서" : grouping === "parentheses" ? "소괄호" : "중괄호와 소괄호"}`,
    description:
      "덧셈·뺄셈·곱셈·나눗셈이 모두 있는 식. 나눗셈은 나누어떨어지고 중간값은 0 이상입니다.",
    domain:
      grouping === "brackets"
        ? grid([
            [10, 15],
            [2, 5],
            [2, 5],
            [1, 5],
          ])
        : grid([
            [10, 15],
            [2, 5],
            [2, 5],
            [2, 5],
            [1, 5],
          ]),
    prompt: ([a, b, c, divisor, quotient]) => {
      const dividend = divisor * (quotient ?? 1);
      const text =
        grouping === "precedence"
          ? `${a} + ${b} × ${c} - ${dividend} ÷ ${divisor}`
          : grouping === "parentheses"
            ? `(${a} + ${b}) × ${c} - ${dividend} ÷ ${divisor}`
            : `{(${a} + ${b}) × ${c} - ${divisor * c}} ÷ ${c}`;
      return math(
        text,
        text
          .replaceAll("×", "\\times")
          .replaceAll("÷", "\\div")
          .replaceAll("{", "\\{")
          .replaceAll("}", "\\}"),
        "계산 순서를 지켜 계산하세요.",
      );
    },
    calculate: ([a, b, c, divisor, quotient]) =>
      integerAnswer(
        grouping === "precedence"
          ? a + b * c - quotient
          : grouping === "parentheses"
            ? (a + b) * c - quotient
            : a + b - divisor,
      ),
    holds: ([a, b, c, divisor, quotient], n) =>
      grouping === "brackets"
        ? (n + BigInt(divisor)) * BigInt(c) === BigInt((a + b) * c)
        : n + BigInt(quotient) - BigInt(grouping === "precedence" ? a : 0) ===
          BigInt(grouping === "precedence" ? b * c : (a + b) * c),
  });
export const GRADE5_COMPLETE = specs.map(complete);
