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
  unit,
  type CompleteSpec,
} from "./core";
const specs: CompleteSpec[] = [];
const ratios = {
  grade: "초6",
  strand: "비와 비율",
  semester: 1,
  unit: "비와 비율",
} as const;
specs.push({
  ...ratios,
  key: "g6-ratio-value",
  title: "비의 비율을 분수로",
  description:
    "비교하는 양 1~30, 기준량 2~30. 비율이 1보다 큰 경우도 포함합니다.",
  domain: grid([
    [1, 30],
    [2, 30],
  ]),
  kind: "rational",
  prompt: ([a, b]) =>
    math(
      `${a} : ${b}`,
      `${a}:${b}`,
      "앞의 수를 비교하는 양으로 하는 비율을 기약분수로 나타내세요. 자연수인 값은 자연수로, 그 밖의 1보다 큰 값은 대분수로 쓰세요.",
    ),
  calculate: ([a, b]) => rationalAnswer(a, b),
  holds: ([a, b], n, d) => n * BigInt(b) === BigInt(a) * d,
});
for (const decimal of [false, true])
  specs.push({
    ...ratios,
    key: `g6-percent-to-${decimal ? "decimal" : "fraction"}`,
    title: `백분율을 ${decimal ? "소수" : "분수"}로`,
    description: "1~200%를 정확한 소수 또는 기약분수로 나타냅니다.",
    domain: grid([[1, 200]]),
    kind: decimal ? "decimal" : "rational",
    prompt: ([p]) =>
      math(
        `${p}%`,
        `${p}\\%`,
        decimal
          ? "소수 또는 자연수로 나타내세요."
          : "기약분수로 나타내세요. 자연수인 값은 자연수로, 그 밖의 1보다 큰 값은 대분수로 쓰세요.",
      ),
    calculate: ([p]) =>
      decimal ? decimalAnswer(p, 2) : rationalAnswer(p, 100),
    holds: ([p], n, d) => n * BigInt(100) === BigInt(p) * d,
  });
specs.push({
  ...ratios,
  key: "g6-fraction-to-percent",
  title: "분수를 백분율로",
  description: "분모가 100의 약수인 기약분수를 1~200% 범위에서 계산합니다.",
  domain: table(
    [2, 4, 5, 10, 20, 25, 50, 100].flatMap((d) =>
      range(1, 2 * d)
        .filter((n) => gcd(n, d) === 1)
        .map((n) => [n, d]),
    ),
  ),
  prompt: ([n, d]) =>
    math(
      `${n}/${d}`,
      frac(n, d),
      "백분율을 구하세요. % 앞의 수를 쓰세요.",
      "%",
    ),
  calculate: ([n, d]) => integerAnswer((n * 100) / d),
  holds: ([n, d], value) => value * BigInt(d) === BigInt(n) * BigInt(100),
});
specs.push({
  ...ratios,
  key: "g6-decimal-to-percent",
  title: "소수를 백분율로",
  description: "0.01~2.00의 소수를 백분율로 바꿉니다.",
  domain: grid([[1, 200]]),
  prompt: ([n]) =>
    math(
      decimalAnswer(n, 2).text,
      decimalAnswer(n, 2).latex,
      "백분율을 구하세요. % 앞의 수를 쓰세요.",
      "%",
    ),
  calculate: ([n]) => integerAnswer(n),
  holds: ([n], value) => value === BigInt(n),
});
for (const mode of ["part", "whole", "rate"] as const)
  specs.push({
    ...ratios,
    key: `g6-percent-${mode}`,
    title:
      mode === "part"
        ? "기준량과 백분율에서 비교하는 양"
        : mode === "whole"
          ? "비교하는 양과 백분율에서 기준량"
          : "비교하는 양과 기준량에서 백분율",
    description: "기준량 20~400, 백분율 5~95%. 모든 양은 자연수입니다.",
    domain: table(product(range(1, 20), range(1, 19))),
    prompt: ([k, p]) => {
      const total = 20 * k,
        part = k * p,
        rate = 5 * p;
      return mode === "part"
        ? math(
            `${total}의 ${rate}%`,
            `${total}\\text{의 }${rate}\\%`,
            "비교하는 양을 구하세요.",
          )
        : mode === "whole"
          ? math(
              `어떤 수의 ${rate}%가 ${part}입니다.`,
              `\\text{어떤 수의 }${rate}\\%=${part}`,
              "기준량인 어떤 수를 구하세요.",
            )
          : math(
              `기준량 ${total}, 비교하는 양 ${part}`,
              `\\text{기준량 }${total},\\;\\text{비교하는 양 }${part}`,
              "백분율을 구하세요. % 앞의 수를 쓰세요.",
              "%",
            );
    },
    calculate: ([k, p]) =>
      integerAnswer(
        mode === "part" ? k * p : mode === "whole" ? 20 * k : 5 * p,
      ),
    holds: ([k, p], n) =>
      mode === "part"
        ? n * BigInt(100) === BigInt(20 * k * 5 * p)
        : mode === "whole"
          ? n * BigInt(5 * p) === BigInt(k * p) * BigInt(100)
          : n * BigInt(20 * k) === BigInt(k * p) * BigInt(100),
  });
const proportion = {
  ...ratios,
  semester: 2,
  unit: "비례식과 비례배분",
} as const;
for (const form of ["integer", "decimal", "fraction"] as const) {
  const inputs =
    form === "fraction"
      ? range(2, 6).flatMap((d) =>
          range(1, 9)
            .filter((n) => gcd(n, d) === 1)
            .map((n) => [n, d]),
        )
      : range(1, form === "integer" ? 30 : 29)
          .filter((n) => form !== "decimal" || n % 10 !== 0)
          .map((n) => [n, form === "integer" ? 1 : 10]);
  const dom = table(
    inputs.flatMap(([a, da]) =>
      inputs.flatMap(([b, db]) =>
        [0, 1].map((target) => [a, da, b, db, target]),
      ),
    ),
  );
  specs.push({
    ...proportion,
    key: `g6-simplest-ratio-${form}`,
    title: `${form === "integer" ? "자연수" : form === "decimal" ? "소수" : "분수"}의 비를 간단한 자연수의 비로`,
    description:
      "두 항이 서로소인 자연수의 비로 바꿉니다. 결과의 한 항은 주어지고 나머지 한 항을 구합니다.",
    domain: dom,
    prompt: ([a, da, b, db, target]) => {
      const g = gcd(a * db, b * da),
        x = (a * db) / g,
        y = (b * da) / g;
      const show = (n: number, d: number) =>
        form === "fraction"
          ? frac(n, d)
          : form === "decimal"
            ? decimalText(n, 1)
            : String(n);
      return math(
        `${form === "fraction" ? `${a}/${da}` : show(a, da)} : ${form === "fraction" ? `${b}/${db}` : show(b, db)} = ${target === 0 ? "□" : x} : ${target === 1 ? "□" : y}`,
        `${show(a, da)}:${show(b, db)}=${target === 0 ? blank : x}:${target === 1 ? blank : y}`,
        "가장 간단한 자연수의 비로 나타낼 때 빈칸에 들어갈 수를 구하세요.",
      );
    },
    calculate: ([a, da, b, db, target]) =>
      integerAnswer((target === 0 ? a * db : b * da) / gcd(a * db, b * da)),
    holds: ([a, da, b, db, target], n) => {
      const g = gcd(a * db, b * da);
      const x = target === 0 ? n : BigInt((a * db) / g),
        y = target === 1 ? n : BigInt((b * da) / g);
      return (
        x > BigInt(0) &&
        y > BigInt(0) &&
        x * BigInt(b * da) === y * BigInt(a * db) &&
        gcd(Number(x), Number(y)) === 1
      );
    },
  });
}
specs.push({
  ...proportion,
  key: "g6-proportion-blank",
  title: "비례식의 빈칸",
  description:
    "비례식의 네 항 중 한 항을 계산합니다. 모든 항은 양의 자연수입니다.",
  domain: table(
    product(range(2, 9), range(2, 9), range(2, 9), [0, 1, 2, 3]).filter(
      ([a, b]) => gcd(a, b) === 1,
    ),
  ),
  prompt: ([a, b, k, which]) => {
    const terms = [a, b, a * k, b * k].map((n, i) =>
      i === which ? blank : String(n),
    );
    const latex = `${terms[0]}:${terms[1]}=${terms[2]}:${terms[3]}`;
    return math(
      latex.replaceAll(blank, "□"),
      latex,
      "비례식이 성립하도록 빈칸의 수를 구하세요.",
    );
  },
  calculate: ([a, b, k, which]) => integerAnswer([a, b, a * k, b * k][which]),
  holds: ([a, b, k, which], n) => {
    const terms = [a, b, a * k, b * k].map(BigInt);
    terms[which] = n;
    return (
      terms.every((v) => v > BigInt(0)) &&
      terms[0] * terms[3] === terms[1] * terms[2]
    );
  },
});
for (const reverse of [false, true])
  specs.push({
    ...proportion,
    key: `g6-distribution-${reverse ? "whole" : "part"}`,
    title: reverse
      ? "비례배분한 양에서 전체 구하기"
      : "비례배분한 한 부분 구하기",
    description: "서로소인 1~9의 비, 전체는 비의 합의 2~15배입니다.",
    domain: table(
      product(range(1, 9), range(1, 9), range(2, 15)).filter(
        ([a, b]) => gcd(a, b) === 1,
      ),
    ),
    prompt: ([a, b, k]) =>
      reverse
        ? math(
            `전체를 ${a}:${b}로 나눈 첫째 양은 ${a * k}입니다.`,
            `${a}:${b}\\text{로 배분한 첫째 양 }${a * k}`,
            "전체 양을 구하세요.",
          )
        : math(
            `${(a + b) * k}을 ${a}:${b}로 나누기`,
            `${(a + b) * k}\\text{을 }${a}:${b}\\text{로 배분}`,
            "첫 번째 몫을 구하세요.",
          ),
    calculate: ([a, b, k]) => integerAnswer(reverse ? (a + b) * k : a * k),
    holds: ([a, b, k], n) =>
      reverse
        ? n * BigInt(a) === BigInt(a * k * (a + b))
        : n * BigInt(a + b) === BigInt((a + b) * k * a),
  });
specs.push({
  grade: "초6",
  strand: "소수",
  semester: 2,
  unit: "소수의 나눗셈",
  key: "g6-rounded-quotient",
  title: "나눗셈의 몫을 반올림",
  description:
    "1~99를 2~19로 나눈 몫을 소수 첫째 또는 둘째 자리까지 반올림합니다.",
  domain: grid([
    [1, 99],
    [2, 19],
    [1, 2],
  ]),
  kind: "decimal",
  prompt: ([a, b, places]) =>
    math(
      `${a} ÷ ${b}`,
      `${a}\\div${b}`,
      `몫을 반올림하여 소수 ${places === 1 ? "첫째" : "둘째"} 자리까지 나타내세요. 지정한 소수 자리의 0도 쓰세요.`,
    ),
  calculate: ([a, b, places]) => {
    const coefficient = Math.floor((2 * a * 10 ** places + b) / (2 * b));
    const text = decimalText(coefficient, places);
    return { ...decimalAnswer(coefficient, places), text, latex: text };
  },
  display: ([, , places], n, d) => {
    const text = decimalText((n * 10 ** places) / d, places);
    return { text, latex: text };
  },
  holds: ([a, b, places], n, d) => {
    const factor = BigInt(10 ** places);
    if ((n * factor) % d) return false;
    return (
      (BigInt(2) * n * factor - d) * BigInt(b) <=
        BigInt(2) * BigInt(a) * d * factor &&
      BigInt(2) * BigInt(a) * d * factor <
        (BigInt(2) * n * factor + d) * BigInt(b)
    );
  },
});
for (const remainder of [false, true])
  specs.push({
    grade: "초6",
    strand: "소수",
    semester: 2,
    unit: "소수의 나눗셈",
    key: `g6-decimal-sharing-${remainder ? "remainder" : "count"}`,
    title: remainder
      ? "소수인 양을 나누고 남는 양"
      : "소수인 양으로 가득 채울 수 있는 개수",
    description:
      "1.0~9.9 L를 0.2~0.9 L씩 가득 나누어 담습니다. 남는 양은 제수보다 작습니다.",
    domain: grid([
      [10, 99],
      [2, 9],
    ]),
    kind: remainder ? "decimal" : "integer",
    prompt: ([a, b]) =>
      math(
        `${decimalText(a, 1)} L를 한 병에 ${decimalText(b, 1)} L씩 담기`,
        `${unit(decimalText(a, 1), "L")}\\text{를 한 병에 }${unit(decimalText(b, 1), "L")}\\text{씩}`,
        remainder
          ? "최대한 많은 병을 가득 채운 뒤 남는 양을 구하세요."
          : "가득 채울 수 있는 병은 몇 개입니까?",
        remainder ? "L" : "개",
      ),
    calculate: ([a, b]) =>
      remainder ? decimalAnswer(a % b, 1) : integerAnswer(Math.floor(a / b)),
    holds: ([a, b], n, d) =>
      remainder
        ? n * BigInt(10) < BigInt(b) * d &&
          (BigInt(a) * d - n * BigInt(10)) % (BigInt(b) * d) === BigInt(0)
        : n * BigInt(b) <= BigInt(a) && (n + BigInt(1)) * BigInt(b) > BigInt(a),
  });
export const GRADE6_COMPLETE = specs.map(complete);
