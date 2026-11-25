/**
 * T1 textbook number extensions. Existing RPM handlers and seeded outputs stay
 * untouched. All arithmetic below uses bounded integer numerators/denominators;
 * displayed decimal digits are composed from integers, never rounded values.
 * Labels use the existing (1) convention, not multiple-choice circled digits.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { attempt, defType, type Body } from "./m1Shared";
import type { TypeEntry } from "./types";
import { eulReul } from "./m2Josa";

type Token = { n: number; d: number; tex: string; form: number };
const BOOK = "1-1";
const MINOR = "교과서 수와 연산";
const CLASS_SECTION = "정수와 유리수";
const ORDER_SECTION = "수의 대소관계";
function gcd(a: number, b: number): number {
  let x = Math.abs(a),
    y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}
function fraction(n: number, d = 1): string {
  if (d <= 0) throw new Error("분모는 양수여야 합니다");
  const g = gcd(n, d),
    nn = n / g,
    dd = d / g;
  if (dd === 1) return String(nn);
  return `${nn < 0 ? "-" : ""}\\frac{${Math.abs(nn)}}{${dd}}`;
}
function compare(a: Token, b: Token): number {
  return a.n * b.d - b.n * a.d;
}
function token(rng: Rng, extended = false): Token {
  const form = intBetween(rng, 0, extended ? 6 : 3);
  const sign = pick(rng, [-1, 1]);
  if (form === 0) {
    const n = intBetween(rng, -8, 8);
    return { n, d: 1, tex: String(n), form };
  }
  if (form === 1) {
    const d = intBetween(rng, 2, 9),
      n = sign * (intBetween(rng, 0, 4) * d + intBetween(rng, 1, d - 1));
    return { n, d, tex: fraction(n, d), form };
  }
  if (form === 2) {
    const whole = intBetween(rng, 0, 6),
      digit = intBetween(rng, 1, 9);
    return {
      n: sign * (whole * 10 + digit),
      d: 10,
      tex: `${sign < 0 ? "-" : ""}${whole}.${digit}`,
      form,
    };
  }
  if (form === 3) {
    const d = intBetween(rng, 2, 6),
      value = sign * intBetween(rng, 1, 7);
    return {
      n: value * d,
      d,
      tex: `${sign < 0 ? "-" : ""}\\frac{${Math.abs(value) * d}}{${d}}`,
      form,
    };
  }
  if (form === 4) {
    const d = intBetween(rng, 2, 5),
      whole = intBetween(rng, 1, 4);
    // Proper fractional part in mixed notation: negative sign applies to all.
    return {
      n: sign * (whole * d + 1),
      d,
      tex: `${sign < 0 ? "-" : ""}${whole}\\frac{1}{${d}}`,
      form,
    };
  }
  if (form === 5) {
    const d = intBetween(rng, 2, 5),
      n = intBetween(rng, 1, 4) * d + 1;
    return {
      n: sign * n,
      d,
      tex: `${sign < 0 ? "-" : ""}|${fraction(-n, d)}|`,
      form,
    };
  }
  const base = intBetween(rng, 2, 3),
    exponent = intBetween(rng, 2, 3);
  return {
    n: sign * base ** exponent,
    d: 1,
    tex: `${sign < 0 ? "-" : ""}${base}^{${exponent}}`,
    form,
  };
}
function tokens(rng: Rng, count: number, extended = false): Token[] {
  return attempt(200, () => {
    const values = Array.from({ length: count }, () => token(rng, extended));
    if (
      values.some((v, i) => values.slice(0, i).some((w) => compare(v, w) === 0))
    )
      return null;
    return values;
  });
}
function shown(values: readonly Token[]): string {
  return values.map((v) => `$${v.tex}$`).join(", ");
}
function facts(values: readonly Token[]): Record<string, number> {
  return Object.fromEntries(
    values.flatMap((v, i) => [
      [`n${i}`, v.n],
      [`d${i}`, v.d],
      [`form${i}`, v.form],
    ]),
  );
}
function numbered(lines: string[]): string {
  return lines.map((line, i) => `(${i + 1}) ${line}`).join("\n");
}
const CATEGORIES = [
  "양의 정수",
  "음의 정수",
  "정수가 아닌 유리수",
  "양의 유리수",
  "음의 유리수",
  "음수가 아닌 정수",
  "자연수가 아닌 정수",
] as const;
function classified(v: Token, category: number): boolean {
  const integer = v.n % v.d === 0;
  switch (category) {
    case 0:
      return integer && v.n > 0;
    case 1:
      return integer && v.n < 0;
    case 2:
      return !integer;
    case 3:
      return v.n > 0;
    case 4:
      return v.n < 0;
    case 5:
      return integer && v.n >= 0;
    case 6:
      return integer && v.n <= 0;
    default:
      throw new Error("알 수 없는 수의 분류");
  }
}

function classify(rng: Rng): Body {
  return attempt(400, () => {
    const mode = intBetween(rng, 0, 4);
    const category = mode === 4 ? pick(rng, [1, 6]) : intBetween(rng, 0, 6);
    const otherCategory = category === 0 ? 1 : 0;
    const count = intBetween(rng, 6, 8),
      values = tokens(rng, count);
    const selected = values.filter((v) => classified(v, category));
    const other = values.filter((v) => classified(v, otherCategory));
    const nonint = values.filter((v) => classified(v, 2));
    if (
      selected.length === 0 ||
      selected.length === count ||
      nonint.length < 1 ||
      other.length === 0
    )
      return null;
    if (
      mode === 3 &&
      (!values.some((v) => v.n > 0) || !values.some((v) => v.n < 0))
    )
      return null;
    const target = CATEGORIES[category]!;
    const base = { count, mode, category, otherCategory, ...facts(values) };
    const intro =
      "분수는 약분한 값으로 판단하고, $0$은 양수도 음수도 아님에 유의한다.";
    if (mode === 0)
      return {
        content: `다음 수에서 ${target}를 모두 찾아 쓰시오.\n${shown(values)}`,
        answer: shown(selected),
        solution: `${intro}\n${target}는 ${shown(selected)}이다.`,
        facts: base,
      };
    if (mode === 1)
      return {
        content: `다음 수에서 ${target}의 개수를 구하시오.\n${shown(values)}`,
        answer: `$${selected.length}$개`,
        solution: `${intro}\n해당하는 수는 ${shown(selected)}이며, 모두 $${selected.length}$개이다.`,
        facts: base,
      };
    if (mode === 2)
      return {
        content: `다음 수를 보고 각 물음에 답하시오.\n${shown(values)}\n${numbered([`${target}를 모두 쓰시오.`, `${CATEGORIES[otherCategory]}를 모두 쓰시오.`])}`,
        answer: numbered([shown(selected), shown(other)]),
        solution: `${intro}\n${numbered([`${target}: ${shown(selected)}`, `${CATEGORIES[otherCategory]}: ${shown(other)}`])}`,
        facts: base,
      };
    if (mode === 3) {
      const positive = values.filter((v) => v.n > 0),
        negative = values.filter((v) => v.n < 0);
      return {
        content: `다음 수에서 양의 유리수와 음의 유리수의 개수를 차례로 구하시오.\n${shown(values)}`,
        answer: `$${positive.length}$개, $${negative.length}$개`,
        solution: `${intro}\n양의 유리수는 ${shown(positive)}, 음의 유리수는 ${shown(negative)}이므로 각각 $${positive.length}$개, $${negative.length}$개이다.`,
        facts: base,
      };
    }
    return {
      content: `다음 수에서 ${target}의 개수를 $a$, 정수가 아닌 유리수의 개수를 $b$라 할 때, $a+b$를 구하시오.\n${shown(values)}`,
      answer: `$${selected.length + nonint.length}$`,
      solution: `${target}는 ${shown(selected)}이고, 정수가 아닌 유리수는 ${shown(nonint)}이다.\n따라서 $a=${selected.length}$, $b=${nonint.length}$이므로 $a+b=${selected.length + nonint.length}$이다.`,
      facts: base,
    };
  });
}

function rangeNotation(rng: Rng): Body {
  const count = intBetween(rng, 1, 4),
    content: string[] = [],
    answer: string[] = [];
  const f: Record<string, number> = { count };
  for (let i = 0; i < count; i++) {
    const variable = String.fromCharCode(97 + i),
      kind = intBetween(rng, 0, 3);
    const pair = tokens(rng, 2)
        .map((t) => (t.form === 3 ? { ...t, tex: fraction(t.n, t.d) } : t))
        .sort(compare),
      loClosed = intBetween(rng, 0, 1),
      hiClosed = intBetween(rng, 0, 1);
    let lo = pair[0]!;
    if (kind === 3) {
      const d = intBetween(rng, 1, 5),
        n = intBetween(rng, 1, 6) * d + intBetween(rng, 0, d - 1);
      lo = { n, d, tex: fraction(n, d), form: 1 };
    }
    const hi = pair[1]!;
    f[`kind${i}`] = kind;
    f[`loN${i}`] = lo.n;
    f[`loD${i}`] = lo.d;
    f[`hiN${i}`] = hi.n;
    f[`hiD${i}`] = hi.d;
    f[`loClosed${i}`] = loClosed;
    f[`hiClosed${i}`] = hiClosed;
    if (kind === 0) {
      content.push(
        `$${variable}$의 값은 $${lo.tex}$ ${loClosed ? "이상" : "초과"}, $${hi.tex}$ ${hiClosed ? "이하" : "미만"}이다.`,
      );
      answer.push(
        `$${lo.tex}${loClosed ? "\\le " : "<"}${variable}${hiClosed ? "\\le" : "<"}${hi.tex}$`,
      );
    } else if (kind === 1) {
      content.push(
        `$${variable}$의 값은 $${lo.tex}$ ${loClosed ? "이상" : "초과"}이다.`,
      );
      answer.push(`$${variable}${loClosed ? "\\ge" : ">"}${lo.tex}$`);
    } else {
      content.push(
        `$${variable}$${kind === 3 ? "의 절댓값" : "의 값"}은 $${lo.tex}$ ${hiClosed ? "이하" : "미만"}이다.`,
      );
      answer.push(
        `$${kind === 3 ? `|${variable}|` : variable}${hiClosed ? "\\le" : "<"}${lo.tex}$`,
      );
    }
  }
  const form = (lines: string[]) => (count === 1 ? lines[0]! : numbered(lines));
  return {
    content: `각 조건을 부등호로 나타내시오.\n${form(content)}`,
    answer: form(answer),
    solution: `이상과 이하는 경계값을 포함하고, 초과와 미만은 경계값을 포함하지 않는다.\n${form(answer)}`,
    facts: f,
  };
}
function orderList(rng: Rng): Body {
  const mode = intBetween(rng, 0, 3),
    count = intBetween(rng, 4, 6),
    values = tokens(rng, count, true);
  const ascending = [...values].sort(compare);
  const prompts = [
    "작은 수부터 차례로 모두 쓰시오.",
    "큰 수부터 차례로 모두 쓰시오.",
    "가장 큰 수와 가장 작은 수를 차례로 쓰시오.",
    "가장 큰 수를 쓰시오.",
  ];
  const result =
    mode === 0
      ? ascending
      : mode === 1
        ? [...ascending].reverse()
        : mode === 2
          ? [ascending.at(-1)!, ascending[0]!]
          : [ascending.at(-1)!];
  return {
    content: `다음 수를 비교하여 ${prompts[mode]}\n${shown(values)}`,
    answer: shown(result),
    solution: `작은 수부터 나열하면 ${shown(ascending)}이다.\n따라서 구하는 수는 ${shown(result)}이다.`,
    facts: { mode, count, ...facts(values) },
  };
}
/** floor for signed integers, without using a floating rational quotient. */
function floorRatio(n: number, d: number): number {
  const remainder = n % d;
  const quotient = (n - remainder) / d;
  return remainder < 0 ? quotient - 1 : quotient;
}
function interval(rng: Rng): Body {
  const mode = intBetween(rng, 0, 5);
  if (mode === 2) {
    const ad = intBetween(rng, 2, 6),
      bd = intBetween(rng, 2, 6);
    const ai = intBetween(rng, 1, 6),
      bi = intBetween(rng, 1, 7);
    const an = ai * ad + intBetween(rng, 1, ad - 1),
      bn = bi * bd + intBetween(rng, 1, bd - 1);
    const a = 2 * ai + 1,
      b = bi;
    return {
      content: `절댓값이 $${fraction(an, ad)}$ 이하인 정수의 개수를 $a$, 절댓값이 $${fraction(bn, bd)}$ 미만인 자연수의 개수를 $b$라 할 때, $a-b$를 구하시오.`,
      answer: `$${a - b}$`,
      solution: `첫째 조건의 정수는 $-${ai}$부터 $${ai}$까지이므로 $a=${a}$이다. 둘째 조건의 자연수는 $1$부터 $${bi}$까지이므로 $b=${b}$이다.\n따라서 $a-b=${a}-${b}=${a - b}$이다.`,
      facts: { mode, an, ad, bn, bd },
    };
  }
  if (mode === 3)
    return attempt(100, () => {
      const first = -intBetween(rng, 2, 8),
        last = intBetween(rng, 1, 7);
      if (-first === last) return null;
      const ld = intBetween(rng, 2, 6),
        hd = intBetween(rng, 2, 6);
      const ln = first * ld - 1,
        hn = last * hd + 1;
      const answer = -first > last ? first : last;
      return {
        content: `두 수 $${fraction(ln, ld)}$, $${fraction(hn, hd)}$ 사이에 있는 정수 중 절댓값이 가장 큰 수를 구하시오.`,
        answer: `$${answer}$`,
        solution: `두 수 사이의 정수는 $${first}$부터 $${last}$까지이다. 양끝의 절댓값은 각각 $${-first}$, $${last}$이다. 따라서 절댓값이 가장 큰 수는 $${answer}$이다.`,
        facts: { mode, ln, ld, hn, hd },
      };
    });
  if (mode === 4) {
    const added = intBetween(rng, 1, 7),
      subtracted = intBetween(rng, 1, 7);
    const count = added + subtracted - 1;
    return {
      content: `어떤 정수에 $${added}$${eulReul(added)} 더한 값은 양수이고 $${subtracted}$${eulReul(subtracted)} 뺀 값은 음수이다. 조건을 만족하는 정수의 개수를 구하시오.`,
      answer: `$${count}$개`,
      solution: `어떤 정수를 $x$라 하면 $x+${added}>0$, $x-${subtracted}<0$이므로 $-${added}<x<${subtracted}$이다.\n가능한 정수는 $${1 - added}$부터 $${subtracted - 1}$까지의 $${count}$개이다.`,
      facts: { mode, added, subtracted },
    };
  }
  if (mode === 5) {
    const limit = intBetween(rng, 2, 8),
      lower = -intBetween(rng, 1, 7),
      upper = intBetween(rng, 2, 10);
    const nonpositive = -lower,
      aboveLimit = Math.max(0, upper - limit),
      count = nonpositive + aboveLimit;
    return {
      content: `정수 $a$는 $1$ 이상 $${limit}$ 이하이고, 정수 $b$는 $${lower}$ 초과 $${upper}$ 이하이다. $b$의 값 중 $a$의 값이 될 수 없는 수의 개수를 구하시오.`,
      answer: `$${count}$개`,
      solution: `$b$의 범위에서 $0$ 이하인 정수는 $${lower + 1}$부터 $0$까지의 $${nonpositive}$개이다. $${limit}$보다 큰 정수는 $${aboveLimit}$개이다.\n따라서 $a$의 범위 밖에 있는 정수는 모두 $${count}$개이다.`,
      facts: { mode, limit, lower, upper },
    };
  }
  const loClosed = intBetween(rng, 0, 1),
    hiClosed = intBetween(rng, 0, 1);
  const ld = intBetween(rng, 1, 5),
    hd = intBetween(rng, 1, 5);
  const lower = mode === 1 ? intBetween(rng, 0, 4) : intBetween(rng, -7, 1);
  const upper = lower + intBetween(rng, 2, 5);
  const ln = lower * ld + intBetween(rng, 0, ld - 1),
    hn = upper * hd + intBetween(rng, 0, hd - 1);
  const lo = fraction(ln, ld),
    hi = fraction(hn, hd);
  const first = floorRatio(ln, ld) + (loClosed && ln % ld === 0 ? 0 : 1);
  const last = floorRatio(hn, hd) - (!hiClosed && hn % hd === 0 ? 1 : 0);
  const magnitude = Array.from(
    { length: last - first + 1 },
    (_, i) => first + i,
  );
  const result =
    mode === 0
      ? magnitude
      : [
          ...magnitude
            .filter((n) => n > 0)
            .map((n) => -n)
            .reverse(),
          ...magnitude,
        ];
  return {
    content: `${mode === 1 ? "절댓값이" : "값이"} $${lo}$ ${loClosed ? "이상" : "초과"}이고 $${hi}$ ${hiClosed ? "이하" : "미만"}인 정수의 개수를 구하시오.`,
    answer: `$${result.length}$개`,
    solution: `조건을 만족하는 정수는 ${result.map((n) => `$${n}$`).join(", ")}이다.\n따라서 모두 $${result.length}$개이다.`,
    facts: { mode, loClosed, hiClosed, ln, ld, hn, hd },
  };
}
function absoluteValue(rng: Rng): Body {
  const mode = intBetween(rng, 0, 2);
  if (mode === 2) {
    const count = intBetween(rng, 3, 5);
    const values = tokens(rng, count).map((t) =>
      t.form === 3 ? { ...t, tex: fraction(t.n, t.d) } : t,
    );
    const results = values.map((t) => fraction(Math.abs(t.n), t.d));
    return {
      content: `각 수의 절댓값을 구하시오.\n${numbered(values.map((t) => `$${t.tex}$`))}`,
      answer: numbered(results.map((t) => `$${t}$`)),
      solution: `각 수와 원점 사이의 거리를 구한다.\n${numbered(values.map((t, i) => `$|${t.tex}|=${results[i]}$`))}`,
      facts: { mode, count, ...facts(values) },
    };
  }
  const input = attempt(100, () => {
    const t = token(rng);
    return t.form === 3 ? null : t;
  });
  const n = Math.abs(input.n),
    positive = fraction(n, input.d);
  if (mode === 0)
    return {
      content: `$${input.tex}$의 절댓값을 구하시오.`,
      answer: `$${positive}$`,
      solution: `절댓값은 원점에서 떨어진 거리이므로 $|${input.tex}|=${positive}$이다.`,
      facts: { mode, ...facts([input]) },
    };
  const result = n === 0 ? "$0$" : `$${fraction(-n, input.d)}$, $${positive}$`;
  return {
    content: `절댓값이 $${positive}$인 수를 모두 쓰시오.`,
    answer: result,
    solution:
      n === 0
        ? "원점에서의 거리가 $0$인 수는 $0$뿐이다."
        : `원점에서 양쪽으로 같은 거리만큼 떨어진 수를 찾으면 ${result}이다.`,
    facts: { mode, ...facts([{ ...input, n }]) },
  };
}
function reciprocals(rng: Rng): Body {
  const count = intBetween(rng, 3, 5);
  const values = attempt(100, () => {
    const ts = tokens(rng, count).map((t) =>
      t.form === 3 ? { ...t, tex: fraction(t.n, t.d) } : t,
    );
    return ts.some((t) => t.n === 0) ? null : ts;
  });
  const result = values.map((t) =>
    fraction(t.n < 0 ? -t.d : t.d, Math.abs(t.n)),
  );
  return {
    content: `각 수의 역수를 구하시오.\n${numbered(values.map((t) => `$${t.tex}$`))}`,
    answer: numbered(result.map((t) => `$${t}$`)),
    solution: `두 수의 곱이 $1$이면 서로 역수이다.\n${numbered(
      values.map((t, i) => {
        const left = t.n < 0 ? `\\left(${t.tex}\\right)` : t.tex;
        const right = t.n < 0 ? `\\left(${result[i]}\\right)` : result[i];
        return `$${left}\\times${right}=1$`;
      }),
    )}`,
    facts: { count, ...facts(values) },
  };
}

export const M1_TEXTBOOK_ORDER: TypeEntry[] = [
  defType(
    BOOK,
    MINOR,
    "O01",
    "유리수 목록의 분류와 선택",
    CLASS_SECTION,
    "기본",
    classify,
  ),
  defType(
    BOOK,
    MINOR,
    "O02",
    "유리수 범위의 부등호 표기",
    ORDER_SECTION,
    "기본",
    rangeNotation,
  ),
  defType(
    BOOK,
    MINOR,
    "O03",
    "유리수 목록의 정렬과 최대·최소",
    ORDER_SECTION,
    "기본",
    orderList,
  ),
  defType(
    BOOK,
    MINOR,
    "O04",
    "유리수 경계의 정수·절댓값 구간",
    ORDER_SECTION,
    "응용",
    interval,
  ),
  defType(
    BOOK,
    MINOR,
    "O05",
    "절댓값의 직접 계산과 수 찾기",
    CLASS_SECTION,
    "기본",
    absoluteValue,
  ),
  defType(
    BOOK,
    MINOR,
    "O06",
    "여러 유리수의 역수",
    "유리수의 나눗셈",
    "기본",
    reciprocals,
  ),
];
