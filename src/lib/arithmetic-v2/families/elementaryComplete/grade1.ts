import type { ArithmeticV2Prompt } from "../../types";
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

/* 초1 core drills (gap audit Track A, 2026-10-16). Unit names are the seed's
 * 2022 textbook titles (src/lib/lab/units.json). Screening: no 0 operand, no
 * a−a, no 0 answer where the drill is about a nonzero quantity. Two-digit
 * sums/differences use the vertical layout like the existing 초2 families.
 */
const specs: CompleteSpec[] = [];
const B = BigInt;
const vertical = (
  operator: "+" | "-",
  [left, right]: number[],
): ArithmeticV2Prompt => ({ layout: "vertical", operator, left, right });
/** Korean number readings end in a consonant for …1·3·6·7·8 and for …0 (십·백). */
const batchim = (n: number) =>
  n === 0 || n % 10 === 0 || [1, 3, 6, 7, 8].includes(n % 10);
const eun = (n: number) => (batchim(n) ? "은" : "는");
const gwa = (n: number) => (batchim(n) ? "과" : "와");
const first = { grade: "초1", strand: "자연수", semester: 1 } as const;
const second = { grade: "초1", strand: "자연수", semester: 2 } as const;

specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g1-add-within-9",
  title: "합이 9 이하인 덧셈",
  description: "1~8끼리 더해 합이 9 이하인 덧셈. 0을 더하는 경우는 뺍니다.",
  domain: table(range(1, 8).flatMap((a) => range(1, 9 - a).map((b) => [a, b]))),
  prompt: ([a, b]) => math(`${a} + ${b}`, `${a}+${b}`, "계산하세요."),
  calculate: ([a, b]) => integerAnswer(a + b),
  holds: ([a, b], n) => n - B(a) === B(b),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g1-sub-within-9",
  title: "9 이하 수의 뺄셈",
  description:
    "2~9에서 그보다 작은 1~8을 빼는 뺄셈. 0을 빼거나 같은 수를 빼는 경우는 뺍니다.",
  domain: table(range(2, 9).flatMap((a) => range(1, a - 1).map((b) => [a, b]))),
  prompt: ([a, b]) => math(`${a} - ${b}`, `${a}-${b}`, "계산하세요."),
  calculate: ([a, b]) => integerAnswer(a - b),
  holds: ([a, b], n) => n + B(b) === B(a),
});
specs.push({
  ...first,
  unit: "덧셈과 뺄셈",
  key: "g1-decompose",
  title: "가르기",
  description:
    "2~9를 두 수로 가릅니다. 한쪽이 주어지고 다른 한쪽을 구합니다. 0으로 가르는 경우는 뺍니다.",
  domain: table(range(2, 9).flatMap((t) => range(1, t - 1).map((a) => [t, a]))),
  prompt: ([t, a]) =>
    math(
      `${t}${eun(t)} ${a}${gwa(a)} □로 가르기`,
      `${t}\\text{${eun(t)} }${a}\\text{${gwa(a)} }${blank}\\text{로 가르기}`,
      "빈칸에 알맞은 수를 구하세요.",
    ),
  calculate: ([t, a]) => integerAnswer(t - a),
  holds: ([t, a], n) => B(a) + n === B(t),
});

specs.push({
  ...first,
  unit: "50까지의 수",
  key: "g1-tens-ones-value",
  title: "10개씩 묶음과 낱개로 나타낸 수",
  description: "10개씩 1~4묶음과 낱개 1~9개가 모두 몇 개인지 구합니다.",
  domain: grid([
    [1, 4],
    [1, 9],
  ]),
  prompt: ([t, o]) =>
    math(
      `10개씩 ${t}묶음과 낱개 ${o}개`,
      `10\\text{개씩 }${t}\\text{묶음과 낱개 }${o}\\text{개}`,
      "모두 몇 개인지 구하세요.",
      "개",
    ),
  calculate: ([t, o]) => integerAnswer(10 * t + o),
  holds: ([t, o], n) => n - B(o) === B(10 * t),
});
for (const tens of [true, false])
  specs.push({
    ...first,
    unit: "50까지의 수",
    key: `g1-tens-ones-${tens ? "tens" : "ones"}`,
    title: tens ? "10개씩 묶음의 수 구하기" : "낱개의 수 구하기",
    description: `11~49를 10개씩 묶음과 낱개로 나타낼 때 ${tens ? "묶음" : "낱개"}의 수를 구합니다.`,
    domain: grid([
      [1, 4],
      [1, 9],
    ]),
    prompt: ([t, o]) =>
      math(
        `${10 * t + o}${eun(o)} 10개씩 ${tens ? "□" : t}묶음과 낱개 ${tens ? o : "□"}개`,
        `${10 * t + o}=10\\text{개씩 }${tens ? blank : t}\\text{묶음과 낱개 }${tens ? o : blank}\\text{개}`,
        "빈칸에 알맞은 수를 구하세요.",
      ),
    calculate: ([t, o]) => integerAnswer(tens ? t : o),
    holds: ([t, o], n) =>
      tens
        ? n * B(10) + B(o) === B(10 * t + o)
        : B(10 * t) + n === B(10 * t + o),
  });

const neighborDelta = [1, -1, 10, -10] as const;
specs.push({
  ...second,
  unit: "100까지의 수",
  key: "g1-neighbor",
  title: "1·10 큰 수와 작은 수",
  description: "10~99보다 1 또는 10만큼 큰 수와 작은 수. 결과는 0~100입니다.",
  domain: table(
    product(range(10, 99), [0, 1, 2, 3]).filter(
      ([n, mode]) => n + neighborDelta[mode] <= 100,
    ),
  ),
  prompt: ([n, mode]) => {
    const size = Math.abs(neighborDelta[mode]);
    const word = mode % 2 ? "작은" : "큰";
    return math(
      `${n}보다 ${size} ${word} 수`,
      `${n}\\text{보다 }${size}\\text{ ${word} 수}`,
      "수를 구하세요.",
    );
  },
  calculate: ([n, mode]) => integerAnswer(n + neighborDelta[mode]),
  holds: ([n, mode], x) => x - B(neighborDelta[mode]) === B(n),
});

for (const [key, title, description, rows] of [
  [
    "g1-add-2x1-no-carry",
    "받아올림이 없는 (몇십몇) + (몇)",
    "10~99에 1~9를 더하며 일의 자리 합이 9 이하인 덧셈.",
    range(10, 99).flatMap((l) => range(1, 9 - (l % 10)).map((r) => [l, r])),
  ],
  [
    "g1-add-2x2-no-carry",
    "받아올림이 없는 (몇십몇) + (몇십몇)",
    "두 자리 수끼리 더하며 각 자리의 합이 9 이하인 덧셈. (몇십) + (몇십)을 포함합니다.",
    range(10, 99).flatMap((l) =>
      range(10, 99)
        .filter((r) => (l % 10) + (r % 10) <= 9 && l + r <= 99)
        .map((r) => [l, r]),
    ),
  ],
] as const)
  specs.push({
    ...second,
    unit: "덧셈과 뺄셈 (1)",
    key,
    title,
    description,
    domain: table(rows.map((p) => [...p])),
    prompt: (p) => vertical("+", p),
    calculate: ([l, r]) => integerAnswer(l + r),
    holds: ([l, r], n) => n - B(l) === B(r),
  });
for (const [key, title, description, rows] of [
  [
    "g1-sub-2x1-no-borrow",
    "받아내림이 없는 (몇십몇) - (몇)",
    "10~99에서 일의 자리 숫자 이하의 1~9를 빼는 뺄셈.",
    range(10, 99).flatMap((l) => range(1, l % 10).map((r) => [l, r])),
  ],
  [
    "g1-sub-2x2-no-borrow",
    "받아내림이 없는 (몇십몇) - (몇십몇)",
    "두 자리 수끼리 각 자리에서 빼는 뺄셈. (몇십) - (몇십)을 포함하고 같은 수끼리의 뺄셈은 뺍니다.",
    range(10, 99).flatMap((l) =>
      range(10, l - 1)
        .filter((r) => r % 10 <= l % 10)
        .map((r) => [l, r]),
    ),
  ],
] as const)
  specs.push({
    ...second,
    unit: "덧셈과 뺄셈 (1)",
    key,
    title,
    description,
    domain: table(rows.map((p) => [...p])),
    prompt: (p) => vertical("-", p),
    calculate: ([l, r]) => integerAnswer(l - r),
    holds: ([l, r], n) => n + B(r) === B(l),
  });

specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (2)",
  key: "g1-add-three",
  title: "세 수의 덧셈",
  description: "1 이상인 세 수를 더해 합이 9 이하인 덧셈.",
  domain: table(
    product(range(1, 7), range(1, 7), range(1, 7)).filter(
      ([a, b, c]) => a + b + c <= 9,
    ),
  ),
  prompt: ([a, b, c]) =>
    math(
      `${a} + ${b} + ${c}`,
      `${a}+${b}+${c}`,
      "앞에서부터 차례로 계산하세요.",
    ),
  calculate: ([a, b, c]) => integerAnswer(a + b + c),
  holds: ([a, b, c], n) => n - B(a) - B(b) === B(c),
});
specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (2)",
  key: "g1-sub-three",
  title: "세 수의 뺄셈",
  description:
    "9 이하의 수에서 1 이상인 두 수를 차례로 빼는 뺄셈. 결과는 1 이상입니다.",
  domain: table(
    product(range(3, 9), range(1, 7), range(1, 7)).filter(
      ([a, b, c]) => a - b - c >= 1,
    ),
  ),
  prompt: ([a, b, c]) =>
    math(
      `${a} - ${b} - ${c}`,
      `${a}-${b}-${c}`,
      "앞에서부터 차례로 계산하세요.",
    ),
  calculate: ([a, b, c]) => integerAnswer(a - b - c),
  holds: ([a, b, c], n) => n + B(b) + B(c) === B(a),
});
specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (2)",
  key: "g1-make-ten",
  title: "10이 되는 더하기",
  description: "1~9에 더해 10이 되는 수. 빈칸은 앞 또는 뒤에 있습니다.",
  domain: grid([
    [0, 1],
    [1, 9],
  ]),
  prompt: ([mode, a]) =>
    math(
      mode === 0 ? `${a} + □ = 10` : `□ + ${a} = 10`,
      mode === 0 ? `${a}+${blank}=10` : `${blank}+${a}=10`,
      "빈칸에 알맞은 수를 구하세요.",
    ),
  calculate: ([, a]) => integerAnswer(10 - a),
  holds: ([, a], n) => n + B(a) === B(10),
});
specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (2)",
  key: "g1-sub-from-ten",
  title: "10에서 빼기",
  description: "10에서 1~9를 빼는 뺄셈.",
  domain: grid([[1, 9]]),
  prompt: ([a]) => math(`10 - ${a}`, `10-${a}`, "계산하세요."),
  calculate: ([a]) => integerAnswer(10 - a),
  holds: ([a], n) => n + B(a) === B(10),
});
specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (2)",
  key: "g1-make-ten-three",
  title: "10을 만들어 세 수 더하기",
  description:
    "1~9인 세 수 가운데 앞의 두 수 또는 뒤의 두 수의 합이 10인 덧셈.",
  domain: table(
    product(range(1, 9), range(1, 9), range(1, 9)).filter(
      ([x, y, z]) => x + y === 10 || y + z === 10,
    ),
  ),
  prompt: ([x, y, z]) =>
    math(`${x} + ${y} + ${z}`, `${x}+${y}+${z}`, "10을 만들어 계산하세요."),
  calculate: ([x, y, z]) => integerAnswer(x + y + z),
  holds: ([x, y, z], n) => n - B(x) - B(y) === B(z),
});

specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (3)",
  key: "g1-add-carry",
  title: "받아올림이 있는 (몇) + (몇)",
  description: "2~9끼리 더해 합이 11 이상인 덧셈.",
  domain: table(
    product(range(2, 9), range(2, 9)).filter(([a, b]) => a + b >= 11),
  ),
  prompt: ([a, b]) => math(`${a} + ${b}`, `${a}+${b}`, "계산하세요."),
  calculate: ([a, b]) => integerAnswer(a + b),
  holds: ([a, b], n) => n - B(a) === B(b),
});
specs.push({
  ...second,
  unit: "덧셈과 뺄셈 (3)",
  key: "g1-sub-borrow",
  title: "받아내림이 있는 (십몇) - (몇)",
  description: "11~18에서 2~9를 빼 결과가 한 자리 수인 뺄셈.",
  domain: table(
    product(range(11, 18), range(2, 9)).filter(([m, b]) => m - b < 10),
  ),
  prompt: ([m, b]) => math(`${m} - ${b}`, `${m}-${b}`, "계산하세요."),
  calculate: ([m, b]) => integerAnswer(m - b),
  holds: ([m, b], n) => n + B(b) === B(m),
});

export const GRADE1_COMPLETE = specs.map(complete);
