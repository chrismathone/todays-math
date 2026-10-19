import {
  blank,
  complete,
  decimalAnswer,
  decimalText,
  grid,
  integerAnswer,
  math,
  product,
  range,
  table,
  type CompleteSpec,
} from "./core";
const specs: CompleteSpec[] = [];
const large = {
  grade: "초4",
  strand: "자연수",
  semester: 1,
  unit: "큰 수",
} as const;
specs.push({
  ...large,
  key: "g4-large-place-value",
  title: "큰 수의 자리값",
  description:
    "만~조 자리의 숫자가 나타내는 값. 선택한 자리 아래에도 숫자가 있습니다.",
  domain: table(product(range(1, 9), range(4, 12), [123, 405, 780])),
  prompt: ([digit, power, tail]) =>
    math(
      `${digit * 10 ** power + tail}에서 ${10 ** power}의 자리 숫자가 나타내는 값`,
      `${digit * 10 ** power + tail}\\text{에서 }${10 ** power}\\text{의 자리값}`,
      "선택한 자리의 숫자가 나타내는 값을 구하세요.",
    ),
  calculate: ([digit, power]) => integerAnswer(digit * 10 ** power),
  holds: ([digit, power, tail], n) =>
    n + BigInt(tail) === BigInt(digit * 10 ** power + tail),
});
for (const reverse of [false, true])
  specs.push({
    ...large,
    key: `g4-large-unit-${reverse ? "count" : "value"}`,
    title: reverse ? "큰 수는 만·억·조의 몇 배인지" : "만·억·조 묶음의 수",
    description: "만·억·조를 2~90개씩 모은 수와 묶음 수를 구합니다.",
    domain: table(product([4, 8, 12], range(2, 90))),
    prompt: ([power, n]) =>
      reverse
        ? math(
            `${n * 10 ** power}는 ${10 ** power}이 몇 개인 수입니까?`,
            `${n * 10 ** power}=${10 ** power}\\times${blank}`,
            "빈칸의 수를 구하세요.",
          )
        : math(
            `${10 ** power}이 ${n}개인 수`,
            `${10 ** power}\\text{이 }${n}\\text{개인 수}`,
            "수를 숫자로 나타내세요.",
          ),
    calculate: ([power, n]) => integerAnswer(reverse ? n : n * 10 ** power),
    holds: ([power, n], x) =>
      reverse
        ? x * BigInt(10 ** power) === BigInt(n * 10 ** power)
        : x / BigInt(10 ** power) === BigInt(n) &&
          x % BigInt(10 ** power) === BigInt(0),
  });
for (const divide of [false, true])
  specs.push({
    ...large,
    key: `g4-large-scale-${divide ? "down" : "up"}`,
    title: `큰 수의 ${divide ? "1/10·1/100·1/1000" : "10·100·1000"}배`,
    description:
      "만~억 단위 수의 자릿값 변화를 계산합니다. 결과는 안전한 정수 범위입니다.",
    domain: table(product(range(11, 39), [4, 6, 8], [1, 2, 3])),
    prompt: ([a, p, k]) =>
      math(
        `${a * 10 ** p} ${divide ? "÷" : "×"} ${10 ** k}`,
        `${a * 10 ** p}${divide ? "\\div" : "\\times"}${10 ** k}`,
        "계산하세요.",
      ),
    calculate: ([a, p, k]) => integerAnswer(a * 10 ** (p + (divide ? -k : k))),
    holds: ([a, p, k], n) =>
      divide
        ? n * BigInt(10 ** k) === BigInt(a * 10 ** p)
        : n === BigInt(a * 10 ** p) * BigInt(10 ** k),
  });
specs.push({
  ...large,
  key: "g4-large-skip-count",
  title: "큰 수 뛰어 세기",
  description: "만·십만·억·십억 단위로 여러 번 뛰어 센 수를 구합니다.",
  domain: table(product(range(11, 29), [4, 5, 8, 9], range(2, 8))),
  prompt: ([a, p, steps]) =>
    math(
      `${a * 10 ** p}부터 ${10 ** p}씩 ${steps}번 뛰어 센 수`,
      `${a * 10 ** p}\\text{부터 }${10 ** p}\\text{씩 }${steps}\\text{번}`,
      "도착한 수를 구하세요.",
    ),
  calculate: ([a, p, steps]) => integerAnswer((a + steps) * 10 ** p),
  holds: ([a, p, steps], n) =>
    n - BigInt(a * 10 ** p) === BigInt(steps) * BigInt(10 ** p),
});
const decimal = {
  grade: "초4",
  strand: "소수",
  semester: 2,
  unit: "소수의 덧셈과 뺄셈",
} as const;
for (const mode of ["value", "count"] as const)
  specs.push({
    ...decimal,
    key: `g4-decimal-place-${mode}`,
    title:
      mode === "value"
        ? "소수의 자리 숫자가 나타내는 값"
        : "소수에 들어 있는 단위소수의 개수",
    description: "소수 첫째~셋째 자리와 0.1·0.01·0.001의 관계를 계산합니다.",
    domain: table(product(range(1, 9), [1, 2, 3], range(1, 8))),
    kind: mode === "value" ? "decimal" : "integer",
    prompt: ([digit, scale, whole]) =>
      mode === "value"
        ? math(
            `${decimalText(whole * 10 ** scale + digit, scale)}에서 소수 ${["", "첫째", "둘째", "셋째"][scale]} 자리의 값`,
            `${decimalText(whole * 10 ** scale + digit, scale)}\\text{의 소수 }${scale}\\text{번째 자리값}`,
            "그 자리 숫자가 나타내는 값을 소수로 쓰세요.",
          )
        : math(
            `${decimalText(whole * 10 ** scale + digit, scale)}는 ${decimalText(1, scale)}이 몇 개입니까?`,
            `${decimalText(whole * 10 ** scale + digit, scale)}=${decimalText(1, scale)}\\times${blank}`,
            "빈칸의 수를 구하세요.",
          ),
    calculate: ([digit, scale, whole]) =>
      mode === "value"
        ? decimalAnswer(digit, scale)
        : integerAnswer(whole * 10 ** scale + digit),
    holds: ([digit, scale, whole], n, d) =>
      mode === "value"
        ? n * BigInt(10 ** scale) === BigInt(digit) * d
        : n === BigInt(whole * 10 ** scale + digit),
  });
for (const divide of [false, true])
  specs.push({
    ...decimal,
    key: `g4-decimal-scale-${divide ? "down" : "up"}`,
    title: `소수의 ${divide ? "1/10·1/100" : "10·100"}배`,
    description: "0.1~9.9의 소수 한 자리 수에서 소수점 위치 관계를 계산합니다.",
    domain: table(
      product(
        range(1, 99).filter((n) => n % 10 !== 0),
        [1, 2],
      ),
    ),
    kind: "decimal",
    prompt: ([a, k]) =>
      math(
        `${decimalText(a, 1)} ${divide ? "÷" : "×"} ${10 ** k}`,
        `${decimalText(a, 1)}${divide ? "\\div" : "\\times"}${10 ** k}`,
        "소수 또는 자연수로 계산하세요.",
      ),
    calculate: ([a, k]) =>
      divide ? decimalAnswer(a, k + 1) : decimalAnswer(a * 10 ** k, 1),
    holds: ([a, k], n, d) =>
      divide
        ? n * BigInt(10 ** (k + 1)) === BigInt(a) * d
        : BigInt(10) * n === BigInt(a * 10 ** k) * d,
  });
for (const geometric of [false, true])
  for (const middle of [false, true])
    specs.push({
      grade: "초4",
      semester: 1,
      unit: "규칙 찾기",
      strand: "자연수",
      key: `g4-pattern-${geometric ? "multiply" : "add"}-${middle ? "missing" : "next"}`,
      title: `${geometric ? "일정한 수를 곱하는" : "일정한 수를 더하는"} 규칙: ${middle ? "가운데 수" : "다음 수"}`,
      description:
        "수 배열과 적용할 규칙이 명시됩니다. 유한 수열의 규칙을 임의로 추측하게 하지 않습니다.",
      domain: grid([
        [2, 19],
        [2, 7],
      ]),
      prompt: ([a, step]) => {
        const terms = range(0, 3).map((i) =>
          geometric ? a * step ** i : a + step * i,
        );
        const at = middle ? 2 : 3;
        const values = terms.map((n, i) => (i === at ? "□" : String(n)));
        return math(
          values.join(", "),
          values.join(",\\;").replace("□", blank),
          `${geometric ? "앞의 수에" : "앞의 수보다"} ${step}${geometric ? "씩 곱하는" : "씩 커지는"} 규칙입니다. 빈칸의 수를 구하세요.`,
        );
      },
      calculate: ([a, step]) =>
        integerAnswer(
          geometric
            ? a * step ** (middle ? 2 : 3)
            : a + step * (middle ? 2 : 3),
        ),
      holds: ([a, step], n) =>
        geometric
          ? n * BigInt(step ** (middle ? 1 : 0)) === BigInt(a * step ** 3)
          : n - BigInt(a) === BigInt(step * (middle ? 2 : 3)),
    });
for (const divide of [false, true])
  for (const middle of [false, true])
    specs.push({
      grade: "초4",
      semester: 1,
      unit: "규칙 찾기",
      strand: "자연수",
      key: `g4-pattern-${divide ? "divide" : "subtract"}-${middle ? "missing" : "next"}`,
      title: `${divide ? "일정한 수로 나누는" : "일정한 수를 빼는"} 규칙: ${middle ? "가운데 수" : "다음 수"}`,
      description:
        "각 단계의 규칙이 명시됩니다. 나눗셈은 나누어떨어지고 모든 항은 양의 자연수입니다.",
      domain: grid([
        [2, 19],
        [2, 7],
      ]),
      prompt: ([last, step]) => {
        const terms = range(0, 3).map((i) =>
          divide ? last * step ** (3 - i) : last + step * (3 - i),
        );
        const at = middle ? 2 : 3;
        const values = terms.map((n, i) => (i === at ? blank : String(n)));
        return math(
          values.join(", ").replaceAll(blank, "□"),
          values.join(",\\;"),
          `앞의 수${divide ? "를" : "에서"} ${step}${divide ? "로 나누는" : "씩 빼는"} 규칙입니다. 빈칸의 수를 구하세요.`,
        );
      },
      calculate: ([last, step]) =>
        integerAnswer(middle ? (divide ? last * step : last + step) : last),
      holds: ([last, step], n) =>
        divide
          ? n * BigInt(step ** (middle ? 2 : 3)) === BigInt(last * step ** 3)
          : n + BigInt(step * (middle ? 2 : 3)) === BigInt(last + step * 3),
    });
export const GRADE4_COMPLETE = specs.map(complete);
