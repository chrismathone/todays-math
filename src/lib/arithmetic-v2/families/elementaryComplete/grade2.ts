import type { ArithmeticV2Prompt } from "../../types";
import { inRange, rows } from "../elementary/common";
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
  type Domain,
} from "./core";

/* 초2 core drills (gap audit Track A, 2026-10-16). Unit names are the seed's
 * 2022 textbook titles (src/lib/lab/units.json). Screening: 곱셈구구 never uses
 * ×0/×1, place values are never 0, subtraction never reaches a−a. The large
 * three-number and skip-count domains are closed-form row domains, never a
 * materialized table.
 */
const specs: CompleteSpec[] = [];
const B = BigInt;
const vertical = (
  operator: "+" | "-",
  [left, right]: number[],
): ArithmeticV2Prompt => ({ layout: "vertical", operator, left, right });
const first = { grade: "초2", strand: "자연수", semester: 1 } as const;
const second = { grade: "초2", strand: "자연수", semester: 2 } as const;
const twoDigit = range(10, 99);
const ones = (n: number) => n % 10;
const tens = (n: number) => Math.floor(n / 10);
const carries = (l: number, r: number) => {
  const carry = ones(l) + ones(r) >= 10 ? 1 : 0;
  return carry + (tens(l) + tens(r) + carry >= 10 ? 1 : 0);
};

/** Closed-form domain from row counts; `has` is written independently of `at`. */
function rowDomain<T>(
  items: readonly T[],
  count: (item: T) => number,
  at: (item: T, offset: number) => number[],
  has: (p: number[]) => boolean,
): Domain {
  const index = rows(items, count);
  return {
    size: index.size,
    at(i) {
      const [item, offset] = index.locate(i);
      return at(item, offset);
    },
    has,
  };
}

const placeNames = ["일", "십", "백", "천"];
function digitAt(n: number, p: number) {
  return Math.floor(n / 10 ** p) % 10;
}
/** [n, p]: every number of the width whose digit at place p is not 0. */
function placeValueDomain(width: number): Domain {
  const min = 10 ** (width - 1),
    max = 10 ** width - 1;
  const grids = range(0, width - 1).map((p) =>
    grid(
      range(0, width - 1).map((place) =>
        place === width - 1 || place === p ? [1, 9] : [0, 9],
      ),
    ),
  );
  return rowDomain(
    range(0, width - 1),
    (p) => grids[p].size,
    (p, offset) => [
      grids[p]
        .at(offset)
        .reduce((n, digit, place) => n + digit * 10 ** place, 0),
      p,
    ],
    (p) =>
      p.length === 2 &&
      inRange(p[0], min, max) &&
      inRange(p[1], 0, width - 1) &&
      digitAt(p[0], p[1]) !== 0,
  );
}
function placeValuePrompt([n, p]: number[]) {
  return math(
    `${n}에서 ${placeNames[p]}의 자리 숫자가 나타내는 값`,
    `${n}\\text{에서 ${placeNames[p]}의 자리 숫자가 나타내는 값}`,
    "선택한 자리의 숫자가 나타내는 값을 구하세요.",
  );
}

specs.push({
  ...first,
  unit: "세 자리 수",
  key: "g2-place-value-3",
  title: "세 자리 수의 자릿값",
  description:
    "100~999에서 일·십·백의 자리 숫자가 나타내는 값. 그 자리의 숫자가 0인 경우는 뺍니다.",
  domain: placeValueDomain(3),
  prompt: placeValuePrompt,
  calculate: ([n, p]) => integerAnswer(digitAt(n, p) * 10 ** p),
  holds: ([n, p], x) => x === B(digitAt(n, p)) * B(10 ** p),
});
specs.push({
  ...second,
  unit: "네 자리 수",
  key: "g2-place-value-4",
  title: "네 자리 수의 자릿값",
  description:
    "1000~9999에서 일·십·백·천의 자리 숫자가 나타내는 값. 그 자리의 숫자가 0인 경우는 뺍니다.",
  domain: placeValueDomain(4),
  prompt: placeValuePrompt,
  calculate: ([n, p]) => integerAnswer(digitAt(n, p) * 10 ** p),
  holds: ([n, p], x) => x === B(digitAt(n, p)) * B(10 ** p),
});
for (const width of [3, 4] as const) {
  const min = 10 ** (width - 1),
    max = 10 ** width - 1,
    steps = range(0, width - 1).map((e) => 10 ** e);
  specs.push({
    ...(width === 3 ? first : second),
    unit: width === 3 ? "세 자리 수" : "네 자리 수",
    key: `g2-skip-count-${width}`,
    title: `${width === 3 ? "세" : "네"} 자리 수 뛰어 세기`,
    description: `${min}~${max}부터 ${steps.join("·")}씩 2~5번 뛰어 센 수. 도착한 수도 ${width === 3 ? "세" : "네"} 자리 수입니다.`,
    domain: rowDomain(
      product(steps, range(2, 5)),
      ([step, times]) => max - min + 1 - step * times,
      ([step, times], offset) => [min + offset, step, times],
      (p) =>
        p.length === 3 &&
        steps.includes(p[1]) &&
        inRange(p[2], 2, 5) &&
        inRange(p[0], min, max - p[1] * p[2]),
    ),
    prompt: ([start, step, times]) =>
      math(
        `${start}부터 ${step}씩 ${times}번 뛰어 센 수`,
        `${start}\\text{부터 }${step}\\text{씩 }${times}\\text{번 뛰어 센 수}`,
        "도착한 수를 구하세요.",
      ),
    calculate: ([start, step, times]) => integerAnswer(start + step * times),
    holds: ([start, step, times], x) => x - B(start) === B(step) * B(times),
  });
}

for (const [key, title, description, keep] of [
  [
    "g2-add-2x2-carry-once",
    "받아올림이 한 번 있는 (두 자리 수) + (두 자리 수)",
    "10~99끼리의 덧셈 가운데 일의 자리 또는 십의 자리에서 한 번만 받아올림하는 경우.",
    (l: number, r: number) => carries(l, r) === 1,
  ],
  [
    "g2-add-2x2-carry-twice",
    "받아올림이 두 번 있는 (두 자리 수) + (두 자리 수)",
    "10~99끼리의 덧셈 가운데 일의 자리와 십의 자리에서 모두 받아올림하는 경우. 합은 세 자리 수입니다.",
    (l: number, r: number) => carries(l, r) === 2,
  ],
] as const)
  specs.push({
    ...first,
    unit: "덧셈과 뺄셈",
    key,
    title,
    description,
    domain: table(product(twoDigit, twoDigit).filter(([l, r]) => keep(l, r))),
    prompt: (p) => vertical("+", p),
    calculate: ([l, r]) => integerAnswer(l + r),
    holds: ([l, r], n) => n - B(l) === B(r),
  });
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g2-sub-2x2-borrow",
  title: "받아내림이 있는 (두 자리 수) - (두 자리 수)",
  description:
    "10~99끼리의 뺄셈 가운데 일의 자리에서 받아내림하는 경우. (몇십) - (몇십몇)을 포함합니다.",
  domain: table(
    product(twoDigit, twoDigit).filter(([l, r]) => l > r && ones(l) < ones(r)),
  ),
  prompt: (p) => vertical("-", p),
  calculate: ([l, r]) => integerAnswer(l - r),
  holds: ([l, r], n) => n + B(r) === B(l),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g2-three-add-sub",
  title: "세 수의 계산: 더하고 빼기",
  description:
    "두 자리 수 세 개로 (가) + (나) - (다)를 앞에서부터 계산합니다. 결과는 0 이상입니다.",
  domain: rowDomain(
    product(twoDigit, twoDigit),
    ([a, b]) => Math.min(99, a + b) - 9,
    ([a, b], offset) => [a, b, 10 + offset],
    (p) =>
      p.length === 3 &&
      p.every((n) => inRange(n, 10, 99)) &&
      p[2] <= p[0] + p[1],
  ),
  prompt: ([a, b, c]) =>
    math(
      `${a} + ${b} - ${c}`,
      `${a}+${b}-${c}`,
      "앞에서부터 차례로 계산하세요.",
    ),
  calculate: ([a, b, c]) => integerAnswer(a + b - c),
  holds: ([a, b, c], n) => n + B(c) - B(b) === B(a),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g2-three-sub-add",
  title: "세 수의 계산: 빼고 더하기",
  description:
    "두 자리 수 세 개로 (가) - (나) + (다)를 앞에서부터 계산합니다. (가)는 (나)보다 큽니다.",
  domain: rowDomain(
    range(11, 99),
    (a) => (a - 10) * 90,
    (a, offset) => [a, 10 + Math.floor(offset / 90), 10 + (offset % 90)],
    (p) =>
      p.length === 3 &&
      inRange(p[0], 11, 99) &&
      inRange(p[1], 10, p[0] - 1) &&
      inRange(p[2], 10, 99),
  ),
  prompt: ([a, b, c]) =>
    math(
      `${a} - ${b} + ${c}`,
      `${a}-${b}+${c}`,
      "앞에서부터 차례로 계산하세요.",
    ),
  calculate: ([a, b, c]) => integerAnswer(a - b + c),
  holds: ([a, b, c], n) => n + B(b) - B(c) === B(a),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g2-missing-add",
  title: "□가 있는 덧셈식",
  description:
    "두 자리 수끼리의 덧셈식에서 빈칸 하나를 구합니다. 빈칸은 앞 또는 뒤에 있습니다.",
  domain: grid([
    [0, 1],
    [10, 99],
    [10, 99],
  ]),
  prompt: ([mode, a, b]) =>
    math(
      mode === 0 ? `□ + ${b} = ${a + b}` : `${a} + □ = ${a + b}`,
      mode === 0 ? `${blank}+${b}=${a + b}` : `${a}+${blank}=${a + b}`,
      "빈칸에 알맞은 수를 구하세요.",
    ),
  calculate: ([mode, a, b]) => integerAnswer(mode === 0 ? a : b),
  holds: ([mode, a, b], n) => n + B(mode === 0 ? b : a) === B(a + b),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g2-missing-sub",
  title: "□가 있는 뺄셈식",
  description:
    "두 자리 수끼리의 뺄셈식에서 빈칸 하나를 구합니다. 빈칸은 빼지는 수 또는 빼는 수 자리에 있습니다.",
  domain: rowDomain(
    product([0, 1], range(11, 99)),
    ([, a]) => a - 10,
    ([mode, a], offset) => [mode, a, 10 + offset],
    (p) =>
      p.length === 3 &&
      (p[0] === 0 || p[0] === 1) &&
      inRange(p[1], 11, 99) &&
      inRange(p[2], 10, p[1] - 1),
  ),
  prompt: ([mode, a, b]) =>
    math(
      mode === 0 ? `□ - ${b} = ${a - b}` : `${a} - □ = ${a - b}`,
      mode === 0 ? `${blank}-${b}=${a - b}` : `${a}-${blank}=${a - b}`,
      "빈칸에 알맞은 수를 구하세요.",
    ),
  calculate: ([mode, a, b]) => integerAnswer(mode === 0 ? a : b),
  holds: ([mode, a, b], n) =>
    mode === 0 ? n - B(b) === B(a - b) : B(a) - n === B(a - b),
});

specs.push({
  ...first,
  unit: "곱셈",
  key: "g2-groups-count",
  title: "몇씩 몇 묶음",
  description: "2~9씩 2~9묶음이 모두 몇 개인지 구합니다.",
  domain: grid([
    [2, 9],
    [2, 9],
  ]),
  prompt: ([m, k]) =>
    math(
      `${m}씩 ${k}묶음`,
      `${m}\\text{씩 }${k}\\text{묶음}`,
      "모두 몇 개인지 구하세요.",
      "개",
    ),
  calculate: ([m, k]) => integerAnswer(m * k),
  holds: ([m, k], n) => n % B(m) === B(0) && n / B(m) === B(k),
});
specs.push({
  ...first,
  unit: "곱셈",
  key: "g2-times-as-many",
  title: "몇의 몇 배",
  description: "2~9의 2~9배를 구합니다.",
  domain: grid([
    [2, 9],
    [2, 9],
  ]),
  prompt: ([m, k]) =>
    math(`${m}의 ${k}배`, `${m}\\text{의 }${k}\\text{배}`, "수를 구하세요."),
  calculate: ([m, k]) => integerAnswer(m * k),
  holds: ([m, k], n) => n % B(m) === B(0) && n / B(m) === B(k),
});

const timesTable = (
  key: string,
  title: string,
  description: string,
  dan?: number,
) =>
  specs.push({
    ...second,
    unit: "곱셈구구",
    key,
    title,
    description,
    domain: grid([dan ? [dan, dan] : [2, 9], [2, 9]] as const),
    prompt: ([a, b]) => math(`${a} × ${b}`, `${a}\\times${b}`, "계산하세요."),
    calculate: ([a, b]) => integerAnswer(a * b),
    holds: ([a, b], n) => n % B(a) === B(0) && n / B(a) === B(b),
  });
timesTable(
  "g2-times-table",
  "곱셈구구 2~9단",
  "2~9단의 곱셈구구. ×0과 ×1은 뺍니다.",
);
for (const dan of range(2, 9))
  timesTable(
    `g2-times-table-${dan}`,
    `곱셈구구 ${dan}단`,
    `${dan}단의 곱셈구구 ${dan}×2부터 ${dan}×9까지. ×0과 ×1은 뺍니다.`,
    dan,
  );
specs.push({
  ...second,
  unit: "곱셈구구",
  key: "g2-times-table-missing",
  title: "곱셈구구 □ 구하기",
  description:
    "2~9단 곱셈식에서 빈칸의 수를 구합니다. 빈칸은 앞 또는 뒤에 있고 ×0과 ×1은 뺍니다.",
  domain: grid([
    [0, 1],
    [2, 9],
    [2, 9],
  ]),
  prompt: ([mode, a, b]) =>
    math(
      mode === 0 ? `${a} × □ = ${a * b}` : `□ × ${b} = ${a * b}`,
      mode === 0
        ? `${a}\\times${blank}=${a * b}`
        : `${blank}\\times${b}=${a * b}`,
      "빈칸에 알맞은 수를 구하세요.",
    ),
  calculate: ([mode, a, b]) => integerAnswer(mode === 0 ? b : a),
  holds: ([mode, a, b], n) => n * B(mode === 0 ? a : b) === B(a * b),
});

export const GRADE2_COMPLETE = specs.map(complete);
