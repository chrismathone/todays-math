import {
  blank,
  complete,
  grid,
  integerAnswer,
  math,
  product,
  range,
  table,
  type CompleteSpec,
} from "./core";
const specs: CompleteSpec[] = [];
const valuesTable = (a: number, b: number, c: number) =>
  `\\begin{array}{c|ccc}\\text{항목}&\\mathrm{A}&\\mathrm{B}&\\mathrm{C}\\\\\\hline\\text{수량}&${a}&${b}&${c}\\end{array}`;
for (const [grade, semester, chapter, key] of [
  ["초3", 2, "자료의 정리", "g3-data"],
  ["초4", 1, "막대그래프", "g4-bar-data"],
] as const) {
  for (const mode of ["total", "difference", "missing"] as const)
    specs.push({
      grade,
      semester,
      unit: chapter,
      strand: "자료·확률",
      key: `${key}-${mode}`,
      title: `${chapter}: 자료의 ${mode === "total" ? "합계" : mode === "difference" ? "차" : "빠진 값"}`,
      description:
        "그래프로 나타낼 세 항목의 수치가 표로 주어집니다. 그래프를 읽거나 그리는 능력을 대신 평가하지 않습니다.",
      domain: grid([
        [2, 20],
        [1, 9],
        [1, 9],
      ]),
      prompt: ([rawA, rawB, rawC]) => {
        const factor = grade === "초4" ? 10 : 1;
        const [a, b, c] = [rawA, rawB, rawC].map((n) => n * factor);
        return mode === "missing"
          ? math(
              `A ${a}, B ${a + b}, C □, 합계 ${3 * a + 2 * b + c}`,
              `\\begin{array}{c|cccc}\\text{항목}&\\mathrm{A}&\\mathrm{B}&\\mathrm{C}&\\text{합계}\\\\\\hline\\text{수량}&${a}&${a + b}&${blank}&${3 * a + 2 * b + c}\\end{array}`,
              "C 항목의 수량을 구하세요.",
            )
          : math(
              `A ${a}, B ${a + b}, C ${a + b + c}`,
              valuesTable(a, a + b, a + b + c),
              mode === "total"
                ? "세 항목의 수량을 모두 더하세요."
                : "C 항목과 A 항목의 수량의 차를 구하세요.",
            );
      },
      calculate: ([a, b, c]) =>
        integerAnswer(
          (mode === "total"
            ? 3 * a + 2 * b + c
            : mode === "difference"
              ? b + c
              : a + b + c) * (grade === "초4" ? 10 : 1),
        ),
      holds: ([rawA, rawB, rawC], n) => {
        const factor = grade === "초4" ? 10 : 1;
        const [a, b, c] = [rawA, rawB, rawC].map((n) => n * factor);
        return mode === "total"
          ? n - BigInt(a) - BigInt(a + b) === BigInt(a + b + c)
          : mode === "difference"
            ? n + BigInt(a) === BigInt(a + b + c)
            : n + BigInt(2 * a + b) === BigInt(3 * a + 2 * b + c);
      },
    });
}
specs.push({
  grade: "초3",
  semester: 2,
  unit: "자료의 정리",
  strand: "자료·확률",
  key: "g3-pictogram-quantity",
  title: "그림그래프의 단위로 수량 계산",
  description:
    "그림 한 개가 나타내는 수량과 그림 개수를 수치로 제시합니다. 임의 도형을 생성하지 않습니다.",
  domain: table(product([5, 10, 20, 100], range(2, 15), range(1, 4))),
  prompt: ([value, groups, singles]) =>
    math(
      `큰 그림 1개는 ${value}명, 작은 그림 1개는 1명. 큰 그림 ${groups}개, 작은 그림 ${singles}개`,
      `\\begin{array}{c|cc}\\text{그림}&\\text{큰 그림}&\\text{작은 그림}\\\\\\hline\\text{한 개의 수량}&${value}&1\\\\\\text{그림 개수}&${groups}&${singles}\\end{array}`,
      "표가 나타내는 사람 수를 구하세요.",
      "명",
    ),
  calculate: ([value, groups, singles]) =>
    integerAnswer(value * groups + singles),
  holds: ([value, groups, singles], n) =>
    n - BigInt(singles) === BigInt(value) * BigInt(groups),
});
for (const decrease of [false, true])
  specs.push({
    grade: "초4",
    semester: 2,
    unit: "꺾은선그래프",
    strand: "자료·확률",
    key: `g4-line-data-${decrease ? "decrease" : "increase"}`,
    title: `시간에 따른 수량의 ${decrease ? "감소량" : "증가량"}`,
    description:
      "오전과 오후의 수치를 표로 제시합니다. 변화량을 직접 계산합니다.",
    domain: grid([
      [10, 99],
      [1, 30],
    ]),
    prompt: ([a, delta]) => {
      const first = decrease ? a + delta : a,
        last = decrease ? a : a + delta;
      return math(
        `오전 ${first}, 오후 ${last}`,
        `\\begin{array}{c|cc}\\text{시각}&\\text{오전}&\\text{오후}\\\\\\hline\\text{수량}&${first}&${last}\\end{array}`,
        `${decrease ? "줄어든" : "늘어난"} 수량을 구하세요.`,
      );
    },
    calculate: ([, delta]) => integerAnswer(delta),
    holds: ([a, delta], n) => BigInt(a) + n === BigInt(a + delta),
  });
const average = {
  grade: "초5",
  semester: 2,
  unit: "평균과 가능성",
  strand: "자료·확률",
} as const;
specs.push({
  ...average,
  key: "g5-average",
  title: "세 자료의 평균",
  description: "세 자연수 자료의 평균이 자연수가 되는 경우를 계산합니다.",
  domain: grid([
    [2, 20],
    [1, 6],
    [1, 6],
  ]),
  prompt: ([a, b, c]) =>
    math(
      `${a}, ${a + b}, ${a + 2 * b + 3 * c}`,
      `${a},\\;${a + b},\\;${a + 2 * b + 3 * c}`,
      "세 수의 평균을 구하세요.",
    ),
  calculate: ([a, b, c]) => integerAnswer(a + b + c),
  holds: ([a, b, c], n) =>
    BigInt(3) * n === BigInt(a) + BigInt(a + b) + BigInt(a + 2 * b + 3 * c),
});
specs.push({
  ...average,
  key: "g5-average-total",
  title: "평균과 개수에서 합계",
  description: "자료 개수 2~12, 평균 2~40. 합계를 계산합니다.",
  domain: grid([
    [2, 12],
    [2, 40],
  ]),
  prompt: ([count, mean]) =>
    math(
      `자료 ${count}개의 평균 ${mean}`,
      `\\text{자료 }${count}\\text{개의 평균 }${mean}`,
      "자료의 합계를 구하세요.",
    ),
  calculate: ([count, mean]) => integerAnswer(count * mean),
  holds: ([count, mean], n) =>
    n / BigInt(count) === BigInt(mean) && n % BigInt(count) === BigInt(0),
});
specs.push({
  ...average,
  key: "g5-average-missing",
  title: "평균에서 빠진 자료",
  description: "세 자료 중 두 값과 평균이 주어집니다. 빠진 값은 자연수입니다.",
  domain: table(
    product(range(1, 12), range(1, 12), range(5, 20)).filter(
      ([a, b, mean]) => a <= b && 3 * mean > a + b,
    ),
  ),
  prompt: ([a, b, mean]) =>
    math(
      `자료 ${a}, ${b}, □의 평균은 ${mean}`,
      `${a},\\;${b},\\;${blank}\\quad\\text{평균 }${mean}`,
      "빈칸에 들어갈 수를 구하세요.",
    ),
  calculate: ([a, b, mean]) => integerAnswer(3 * mean - a - b),
  holds: ([a, b, mean], n) => n + BigInt(a + b) === BigInt(3) * BigInt(mean),
});
const chart = {
  grade: "초6",
  semester: 1,
  unit: "여러 가지 그래프",
  strand: "자료·확률",
} as const;
for (const mode of ["count", "percent", "missing-percent"] as const)
  specs.push({
    ...chart,
    key: `g6-chart-${mode}`,
    title: `띠·원그래프 자료: ${mode === "count" ? "항목의 수량" : mode === "percent" ? "항목의 백분율" : "남은 백분율"}`,
    description:
      "세 항목의 합계와 수치 표를 사용합니다. 원그래프 중심각이나 그래프 작도 문제는 포함하지 않습니다.",
    domain: table(
      product(range(2, 20), range(1, 8), range(1, 9)).filter(
        ([, a, b]) => a + b < 20,
      ),
    ),
    prompt: ([k, a, b]) => {
      const total = 20 * k;
      return mode === "count"
        ? math(
            `전체 ${total}명, A ${5 * a}%, B ${5 * b}%, C ${100 - 5 * (a + b)}%`,
            `\\text{전체 }${total}\\text{명}\\quad\\begin{array}{c|ccc}\\text{항목}&\\mathrm{A}&\\mathrm{B}&\\mathrm{C}\\\\\\hline\\text{백분율}&${5 * a}\\%&${5 * b}\\%&${100 - 5 * (a + b)}\\%\\end{array}`,
            "A 항목의 사람 수를 구하세요.",
            "명",
          )
        : mode === "percent"
          ? math(
              `A ${a * k}명, B ${b * k}명, C ${(20 - a - b) * k}명`,
              valuesTable(a * k, b * k, (20 - a - b) * k),
              "A 항목의 백분율을 구하세요. % 앞의 수를 쓰세요.",
              "%",
            )
          : math(
              `전체 ${total}명, A ${5 * a}%, B ${5 * b}%, C □%`,
              `\\text{전체 }${total}\\text{명}\\quad\\mathrm{A}: ${5 * a}\\%,\\;\\mathrm{B}: ${5 * b}\\%,\\;\\mathrm{C}: ${blank}\\%`,
              "C 항목의 백분율을 구하세요. % 앞의 수를 쓰세요.",
              "%",
            );
    },
    calculate: ([k, a, b]) =>
      integerAnswer(
        mode === "count"
          ? a * k
          : mode === "percent"
            ? 5 * a
            : 100 - 5 * (a + b),
      ),
    holds: ([k, a, b], n) =>
      mode === "count"
        ? n * BigInt(100) === BigInt(20 * k * 5 * a)
        : mode === "percent"
          ? n * BigInt(20 * k) === BigInt(a * k) * BigInt(100)
          : n + BigInt(5 * a + 5 * b) === BigInt(100),
  });
export const DATA_COMPLETE = specs.map(complete);
