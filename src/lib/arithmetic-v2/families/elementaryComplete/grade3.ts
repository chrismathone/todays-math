import {
  blank,
  complete,
  decimalAnswer,
  decimalText,
  frac,
  fractionForm,
  grid,
  integerAnswer,
  math,
  product,
  range,
  representedFraction,
  table,
  unit,
  type CompleteSpec,
} from "./core";

const specs: CompleteSpec[] = [];
specs.push({
  grade: "초3",
  semester: 1,
  unit: "곱셈",
  strand: "자연수",
  key: "g3-multiply-two-by-one",
  title: "두 자리 수 × 한 자리 수",
  description:
    "10~99와 2~9의 곱. 받아올림이 없는 경우와 있는 경우를 포함합니다.",
  domain: grid([
    [10, 99],
    [2, 9],
  ]),
  prompt: ([a, b]) => math(`${a} × ${b}`, `${a}\\times${b}`, "계산하세요."),
  calculate: ([a, b]) => integerAnswer(a * b),
  holds: ([a, b], n) =>
    n % BigInt(b) === BigInt(0) && n / BigInt(b) === BigInt(a),
});
const base = {
  grade: "초3",
  strand: "분수",
  semester: 2,
  unit: "분수",
} as const;
const fractions = table(
  range(2, 12).flatMap((d) => product([d], range(1, d - 1), range(1, 12))),
);
for (const inverse of [false, true])
  specs.push({
    ...base,
    key: `g3-fraction-${inverse ? "whole" : "amount"}`,
    title: inverse ? "분수만큼의 양에서 전체 구하기" : "전체의 분수만큼 구하기",
    description:
      "분모 2~12, 진분수와 그 분모의 배수인 전체. 주어진 양은 자연수입니다.",
    domain: fractions,
    prompt: ([d, n, k]) =>
      inverse
        ? math(
            `전체의 ${n}/${d}가 ${k * n}입니다.`,
            `\\text{전체의 }${frac(n, d)}=${k * n}`,
            "전체를 구하세요.",
          )
        : math(
            `${k * d}의 ${n}/${d}`,
            `${k * d}\\text{의 }${frac(n, d)}`,
            "분수만큼의 양을 구하세요.",
          ),
    calculate: ([d, n, k]) => integerAnswer(k * (inverse ? d : n)),
    holds: ([d, n, k], value) =>
      inverse
        ? value * BigInt(n) === BigInt(k * n * d)
        : value * BigInt(d) === BigInt(k * d * n),
  });
specs.push({
  ...base,
  key: "g3-fraction-part-representation",
  title: "전체와 부분을 분수로 나타내기",
  description: "전체 2~12개 중 일부를 지정한 분모의 분수로 나타냅니다.",
  domain: table(
    range(2, 12).flatMap((d) => range(1, d - 1).map((n) => [d, n])),
  ),
  prompt: ([d, n]) =>
    math(
      `전체 ${d}개 중 ${n}개`,
      `\\text{전체 }${d}\\text{개 중 }${n}\\text{개}`,
      `부분은 전체의 얼마인지, 전체 개수를 분모로 하는 분수로 나타내세요.`,
    ),
  kind: "rational",
  calculate: ([d, n]) => representedFraction(n, d, false),
  display: fractionForm(([d]) => d, false),
  holds: ([d, n], a, b) => a * BigInt(d) === b * BigInt(n),
});
for (const count of [false, true])
  specs.push({
    ...base,
    semester: count ? 2 : 1,
    unit: count ? "분수" : "분수와 소수",
    key: `g3-unit-fraction-${count ? "count" : "amount"}`,
    title: count
      ? "자연수에 들어 있는 단위분수의 개수"
      : "단위분수 여러 개의 크기",
    description:
      "분모 2~12인 단위분수의 묶음. 답은 지정한 분모 또는 개수입니다.",
    domain: count
      ? grid([
          [2, 12],
          [2, 12],
        ])
      : table(range(2, 12).flatMap((d) => range(1, d - 1).map((n) => [d, n]))),
    kind: count ? "integer" : "rational",
    prompt: ([d, n]) =>
      count
        ? math(
            `${n}은 1/${d}이 몇 개입니까?`,
            `${n}=${frac(1, d)}\\times${blank}`,
            "빈칸에 알맞은 개수를 구하세요.",
            "개",
          )
        : math(
            `1/${d}이 ${n}개인 수`,
            `${frac(1, d)}\\text{이 }${n}\\text{개인 수}`,
            `주어진 단위분수의 분모를 유지한 분수로 나타내세요.`,
          ),
    calculate: ([d, n]) =>
      count ? integerAnswer(n * d) : representedFraction(n, d, false),
    ...(count ? {} : { display: fractionForm(([d]) => d, false) }),
    holds: ([d, n], a, b) =>
      count ? a === BigInt(n * d) : a * BigInt(d) === b * BigInt(n),
  });
const mixed = table(
  range(2, 9).flatMap((d) => product(range(1, 5), range(1, d - 1), [d])),
);
for (const toMixed of [false, true])
  specs.push({
    ...base,
    key: `g3-${toMixed ? "improper-to-mixed" : "mixed-to-improper"}`,
    title: toMixed ? "가분수를 대분수로 바꾸기" : "대분수를 가분수로 바꾸기",
    description:
      "자연수 부분 1~5, 분모 2~9. 원래 분모를 유지하며 약분하지 않습니다.",
    domain: mixed,
    kind: "rational",
    prompt: ([w, r, d]) =>
      math(
        toMixed ? `${w * d + r}/${d}` : `${w} ${r}/${d}`,
        toMixed ? frac(w * d + r, d) : `${w}${frac(r, d)}`,
        `분모를 그대로 두고 ${toMixed ? "대분수" : "가분수"}로 나타내세요. 약분하지 마세요.`,
      ),
    calculate: ([w, r, d]) => representedFraction(w * d + r, d, toMixed),
    display: fractionForm((p) => p[2], toMixed),
    holds: ([w, r, d], n, q) =>
      (n - BigInt(w) * q) * BigInt(d) === BigInt(r) * q,
  });
for (const toDecimal of [false, true])
  specs.push({
    ...base,
    semester: 1,
    unit: "분수와 소수",
    strand: "소수",
    key: `g3-tenths-${toDecimal ? "decimal" : "fraction"}`,
    title: toDecimal ? "분모가 10인 분수를 소수로" : "소수 한 자리 수를 분수로",
    description:
      "0.1~0.9의 소수 한 자리 수. 1학기 진분수 범위에서 분모 10을 유지합니다.",
    domain: grid([[1, 9]]),
    kind: toDecimal ? "decimal" : "rational",
    prompt: ([n]) =>
      math(
        toDecimal ? `${n}/10` : decimalText(n, 1),
        toDecimal ? frac(n, 10) : decimalText(n, 1),
        toDecimal
          ? "소수로 나타내세요."
          : "분모가 10인 분수로 나타내세요. 약분하지 마세요.",
      ),
    calculate: ([n]) =>
      toDecimal ? decimalAnswer(n, 1) : representedFraction(n, 10, false),
    ...(toDecimal ? {} : { display: fractionForm(() => 10, false) }),
    holds: ([n], a, b) => a * BigInt(10) === BigInt(n) * b,
  });

for (const [key, large, small, factor, semester, chapter] of [
  ["hour-minute", "시간", "분", 60, 1, "길이와 시간"],
  ["minute-second", "분", "초", 60, 1, "길이와 시간"],
  ["hour-second", "시간", "초", 3600, 1, "길이와 시간"],
  ["kg-g", "kg", "g", 1000, 2, "들이와 무게"],
  ["t-kg", "t", "kg", 1000, 2, "들이와 무게"],
] as const) {
  for (const reverse of [false, true])
    specs.push({
      grade: "초3",
      strand: "측정",
      semester,
      unit: chapter,
      key: `g3-unit-${key}-${reverse ? "large" : "small"}`,
      title: `${large}·${small}: ${reverse ? large : small} 단위로 바꾸기`,
      description: `1~24 ${large} 범위의 정확한 단위 환산.`,
      domain: grid([[1, 24]]),
      prompt: ([n]) =>
        math(
          `${reverse ? n * factor : n} ${reverse ? small : large}`,
          unit(reverse ? n * factor : n, reverse ? small : large),
          `${reverse ? large : small} 단위의 수를 구하세요.`,
          reverse ? large : small,
        ),
      calculate: ([n]) => integerAnswer(reverse ? n : n * factor),
      holds: ([n], x) =>
        reverse
          ? x * BigInt(factor) === BigInt(n * factor)
          : x === BigInt(n) * BigInt(factor),
    });
}
for (const [key, large, small, factor, semester, chapter] of [
  ["hour-minute", "시간", "분", 60, 1, "길이와 시간"],
  ["minute-second", "분", "초", 60, 1, "길이와 시간"],
  ["kg-g", "kg", "g", 1000, 2, "들이와 무게"],
  ["t-kg", "t", "kg", 1000, 2, "들이와 무게"],
  ["capacity", "L", "mL", 1000, 2, "들이와 무게"],
] as const) {
  const dom = table(
    product(
      range(1, 8),
      factor === 60 ? [5, 15, 25, 35, 45, 55] : [50, 150, 350, 650, 950],
    ),
  );
  for (const mode of ["to-small", "large-blank", "small-blank"] as const) {
    if (key === "capacity" && mode === "to-small") continue;
    specs.push({
      grade: "초3",
      strand: "측정",
      semester,
      unit: chapter,
      key: `g3-compound-${key}-${mode}`,
      title: `${large}·${small} 복합 단위: ${mode === "to-small" ? "합친 양" : mode === "large-blank" ? large : small} 구하기`,
      description: "큰 단위 1~8, 작은 단위는 올림 전 범위. 빈칸은 하나입니다.",
      domain: dom,
      prompt: ([a, b]) =>
        mode === "to-small"
          ? math(
              `${a} ${large} ${b} ${small}`,
              `${unit(a, large)}\\;${unit(b, small)}`,
              `${small} 단위로 나타내세요.`,
              small,
            )
          : math(
              `${a * factor + b} ${small} = ${mode === "large-blank" ? "□" : a} ${large} ${mode === "small-blank" ? "□" : b} ${small}`,
              `${unit(a * factor + b, small)}=${unit(mode === "large-blank" ? blank : a, large)}\\;${unit(mode === "small-blank" ? blank : b, small)}`,
              "빈칸에 알맞은 수를 구하세요.",
            ),
      calculate: ([a, b]) =>
        integerAnswer(
          mode === "to-small" ? a * factor + b : mode === "large-blank" ? a : b,
        ),
      holds: ([a, b], n) =>
        mode === "to-small"
          ? n - BigInt(b) === BigInt(a * factor)
          : mode === "large-blank"
            ? n * BigInt(factor) + BigInt(b) === BigInt(a * factor + b)
            : BigInt(a * factor) + n === BigInt(a * factor + b),
    });
  }
}
for (const [key, large, small, factor, semester, chapter] of [
  ["hour-minute", "시간", "분", 60, 1, "길이와 시간"],
  ["minute-second", "분", "초", 60, 1, "길이와 시간"],
  ["capacity", "L", "mL", 1000, 2, "들이와 무게"],
  ["mass", "kg", "g", 1000, 2, "들이와 무게"],
] as const)
  for (const subtract of [false, true]) {
    const rows = product(
      range(1, 5),
      [factor / 10, factor / 2, (factor * 9) / 10],
      range(1, 5),
      [factor / 10, factor / 2, (factor * 9) / 10],
    ).filter(([a, b, c, d]) =>
      subtract
        ? a * factor + b >= c * factor + d
        : a * factor + b <= c * factor + d,
    );
    specs.push({
      grade: "초3",
      strand: "측정",
      semester,
      unit: chapter,
      key: `g3-${key}-${subtract ? "difference" : "sum"}`,
      title: `${large}·${small}의 ${subtract ? "차" : "합"}`,
      description:
        "복합 단위끼리 계산하며 받아올림·받아내림을 포함합니다. 답은 작은 단위 하나로 나타냅니다.",
      domain: table(rows),
      prompt: ([a, b, c, d]) =>
        math(
          `${a} ${large} ${b} ${small} ${subtract ? "-" : "+"} ${c} ${large} ${d} ${small}`,
          `(${unit(a, large)}\\;${unit(b, small)})${subtract ? "-" : "+"}(${unit(c, large)}\\;${unit(d, small)})`,
          `${small} 단위로 계산하세요.`,
          small,
        ),
      calculate: ([a, b, c, d]) =>
        integerAnswer(
          (a + (subtract ? -c : c)) * factor + b + (subtract ? -d : d),
        ),
      holds: ([a, b, c, d], n) =>
        subtract
          ? n + BigInt(c * factor + d) === BigInt(a * factor + b)
          : n - BigInt(a * factor + b) === BigInt(c * factor + d),
    });
  }
specs.push({
  grade: "초3",
  strand: "측정",
  semester: 1,
  unit: "길이와 시간",
  key: "g3-elapsed-time",
  title: "시작·끝 시각 사이의 시간",
  description:
    "같은 날 오전 시각, 시작 1~8시와 5~55분, 경과 5~115분. 시간 경계를 지나는 경우를 포함합니다.",
  domain: table(
    product(range(1, 8), [5, 25, 45, 55], [5, 25, 45, 65, 85, 115]),
  ),
  prompt: ([h, m, elapsed]) => {
    const end = h * 60 + m + elapsed;
    return math(
      `같은 날 오전 ${h}시 ${m}분부터 오전 ${Math.floor(end / 60)}시 ${end % 60}분까지`,
      `\\text{오전 }${h}\\text{시 }${m}\\text{분 }\\longrightarrow\\text{ 오전 }${Math.floor(end / 60)}\\text{시 }${end % 60}\\text{분}`,
      "지나간 시간을 분 단위로 구하세요.",
      "분",
    );
  },
  calculate: ([, , elapsed]) => integerAnswer(elapsed),
  holds: ([h, m, elapsed], n) =>
    BigInt(h * 60 + m) + n === BigInt(h * 60 + m + elapsed),
});
specs.push({
  ...base,
  key: "g3-unit-fraction-count-in-fraction",
  title: "분수에 들어 있는 단위분수의 개수",
  description:
    "분모 2~12, 분자는 1~분모의 3배. 진분수·가분수에 들어 있는 같은 분모의 단위분수 개수를 구합니다.",
  domain: table(
    range(2, 12).flatMap((d) => range(1, d * 3).map((n) => [n, d])),
  ),
  prompt: ([n, d]) =>
    math(
      `${n}/${d}은 1/${d}이 몇 개입니까?`,
      `${frac(n, d)}=${frac(1, d)}\\times${blank}`,
      "빈칸에 알맞은 개수를 구하세요.",
      "개",
    ),
  calculate: ([n]) => integerAnswer(n),
  holds: ([n, d], value) => value * BigInt(d) === BigInt(n) * BigInt(d),
});
export const GRADE3_COMPLETE = specs.map(complete);
