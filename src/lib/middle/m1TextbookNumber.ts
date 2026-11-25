/**
 * 교과서 엔진 T1 자연수 보강. 기존 키의 rng 흐름을 바꾸지 않고 새 키만 더한다.
 * 소인수 지수로 만든 수를 지면에 내고, 시험은 지면을 읽어 약수/배수를 전수 탐색한다.
 * 원문 숫자나 문장을 저장하지 않는다. 복수 소문항은 기존 텍스트 `(1)` 형식이다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { attempt, defType, pickDistinct, shuffle, type Body } from "./m1Shared";
import type { TypeEntry } from "./types";

const BOOK = "textbook-20261125";
const MINOR = "교과서 수와 연산";
const MARKS = ["①", "②", "③", "④", "⑤"];
const PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
];
const SEC = {
  prime: "소수와 거듭제곱",
  factor: "소인수분해",
  gcd: "공약수와 최대공약수",
  lcm: "공배수와 최소공배수",
};

type Factors = [number, number][];
const factoredValue = (f: Factors) => f.reduce((n, [p, e]) => n * p ** e, 1);
const factorText = (f: Factors) =>
  f
    .filter(([, e]) => e > 0)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`))
    .join("\\times") || "1";
const mathList = (ns: number[]) => ns.map((n) => `$${n}$`).join(", ");

function factors(n: number): Factors {
  const f: Factors = [];
  let rest = n;
  for (let p = 2; p <= rest; p++) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e++;
    }
    if (e) f.push([p, e]);
  }
  return f;
}

/** 지수 조합으로 약수를 만든다. 시험은 후보가 나누어떨어지는지 전수 탐색한다. */
function factorDivisors(f: Factors): number[] {
  let ds = [1];
  for (const [p, e] of f)
    ds = ds.flatMap((d) => Array.from({ length: e + 1 }, (_, k) => d * p ** k));
  return ds.sort((a, b) => a - b);
}

function numberSet(rng: Rng, count = intBetween(rng, 2, 3)) {
  return attempt(300, () => {
    const ps = pickDistinct(rng, [2, 3, 5, 7], intBetween(rng, 2, 3)).sort(
      (a, b) => a - b,
    );
    const fs: Factors[] = Array.from({ length: count }, () =>
      ps.map((p) => [p, intBetween(rng, 0, p >= 5 ? 2 : 3)]),
    );
    const ns = fs.map(factoredValue);
    const gf: Factors = ps.map((p, i) => [
      p,
      Math.min(...fs.map((f) => f[i]![1])),
    ]);
    const lf: Factors = ps.map((p, i) => [
      p,
      Math.max(...fs.map((f) => f[i]![1])),
    ]);
    const g = factoredValue(gf),
      l = factoredValue(lf);
    if (
      ns.some((n) => n < 4 || n > 900) ||
      new Set(ns).size !== count ||
      g < 2 ||
      l > 3600
    )
      return null;
    const shown = fs.map((f, i) =>
      pick(rng, [false, true]) ? factorText(f) : String(ns[i]),
    );
    return { ns, fs, gf, lf, g, l, shown };
  });
}

function flatFacts(items: number[][]): Record<string, number> {
  const result: Record<string, number> = { count: items.length };
  items.forEach((ns, i) => {
    result[`size${i}`] = ns.length;
    ns.forEach((n, j) => {
      result[`n${i}_${j}`] = n;
    });
  });
  return result;
}

function batch(rng: Rng, kind: "gcd" | "lcm" | "divisors"): Body {
  const sets = Array.from({ length: intBetween(rng, 1, 4) }, () =>
    numberSet(rng),
  );
  const ask =
    kind === "gcd" ? "최대공약수" : kind === "lcm" ? "최소공배수" : "공약수";
  const answer = (s: (typeof sets)[number]) =>
    kind === "gcd"
      ? `$${s.g}$`
      : kind === "lcm"
        ? `$${s.l}$`
        : mathList(factorDivisors(s.gf));
  return {
    content: `각 묶음에 주어진 수들의 ${ask}${kind === "divisors" ? "를 모두" : "를"} 구하시오.\n${sets.map((s, i) => `(${i + 1}) ${s.shown.map((n) => `$${n}$`).join(", ")}`).join("\n")}`,
    answer: sets.map((s, i) => `(${i + 1}) ${answer(s)}`).join("\n"),
    solution: sets
      .map((s, i) => {
        const decomposed = s.ns
          .map((n, j) =>
            factorText(s.fs[j]!) === String(n)
              ? `$${n}$`
              : `$${n}=${factorText(s.fs[j]!)}$`,
          )
          .join(", ");
        const method =
          kind === "lcm"
            ? "모든 소인수에서 가장 큰 지수를 택한다."
            : "공통 소인수에서 가장 작은 지수를 택한다.";
        return `(${i + 1}) ${decomposed}이다. ${method} ${kind === "divisors" ? `최대공약수 $${s.g}$의 약수는 ${answer(s)}이다.` : `따라서 ${ask}는 ${answer(s)}이다.`}`;
      })
      .join("\n"),
    facts: flatFacts(sets.map((s) => s.ns)),
  };
}

/** 범위의 양 끝 포함 여부를 글과 같은 정수 경계로 유지한다. */
function integerWindow(rng: Rng, upperOnly = false) {
  const lo = upperOnly ? 1 : intBetween(rng, 2, 30);
  const hi = lo + intBetween(rng, 12, 65);
  const includeLo = upperOnly || pick(rng, [false, true]);
  const includeHi = pick(rng, [false, true]);
  return {
    first: lo + (includeLo ? 0 : 1),
    last: hi - (includeHi ? 0 : 1),
    text: `${upperOnly ? "" : `$${lo}$ ${includeLo ? "이상" : "초과"} `}$${hi}$ ${includeHi ? "이하인" : "미만인"}`,
  };
}

function givenMultipleCount(rng: Rng): Body {
  return attempt(150, () => {
    const lcm = intBetween(rng, 6, 48);
    const twoDigits = pick(rng, [false, true]);
    const window = twoDigits
      ? { first: 10, last: 99, text: "두 자리의" }
      : integerWindow(rng, pick(rng, [false, true]));
    const count =
      Math.floor(window.last / lcm) - Math.floor((window.first - 1) / lcm);
    if (count < 1) return null;
    return {
      content: `두 자연수의 최소공배수가 $${lcm}$일 때, 두 수의 공배수 중 ${window.text} 자연수의 개수를 구하시오.`,
      answer: `$${count}$개`,
      solution: `공배수는 최소공배수 $${lcm}$의 배수이다. $${window.first}$부터 $${window.last}$까지에서 그 배수를 세면 $${count}$개이다.`,
      facts: {
        lcm,
        first: window.first,
        last: window.last,
        twoDigits: Number(twoDigits),
      },
    };
  });
}

function nearestMultiple(rng: Rng): Body {
  return attempt(200, () => {
    const s = numberSet(rng, 2);
    if (s.l > 150) return null;
    const lower = s.l * intBetween(rng, 2, 5);
    const offset = intBetween(rng, 1, s.l - 1);
    if (offset * 2 === s.l) return null;
    const target = lower + offset;
    const upper = lower + s.l;
    const answer = offset * 2 < s.l ? lower : upper;
    return {
      content: `두 수 ${s.shown.map((n) => `$${n}$`).join(", ")}의 공배수 중 $${target}$에 가장 가까운 자연수를 구하시오.`,
      answer: `$${answer}$`,
      solution: `최소공배수는 $${s.l}$이다. 목표 수 양쪽의 공배수 $${lower}$, $${upper}$까지의 차는 각각 $${offset}$, $${s.l - offset}$이므로 더 가까운 수는 $${answer}$이다.`,
      facts: { ...flatFacts([s.ns]), target },
    };
  });
}

function kthMultipleFactors(rng: Rng): Body {
  return attempt(200, () => {
    const s = numberSet(rng, 3);
    if (s.l > 900) return null;
    const k = intBetween(rng, 2, 5);
    const answer = factorText(factors(s.l * k));
    return {
      content: `세 수 ${s.shown.map((n) => `$${n}$`).join(", ")}의 공배수 중 작은 수부터 $${k}$번째 수를 소인수분해하여 나타내시오.`,
      answer: `$${answer}$`,
      solution: `최소공배수는 $${s.l}$이므로 구하는 공배수는 $${s.l}\\times${k}=${s.l * k}$이다. 이를 소인수분해하면 $${answer}$이다.`,
      facts: { ...flatFacts([s.ns]), k },
    };
  });
}

function commonDivisorCount(rng: Rng): Body {
  return attempt(200, () => {
    const even = pick(rng, [false, true]);
    const s = numberSet(rng, 2);
    const twoExponent = s.gf.find(([p]) => p === 2)?.[1] ?? 0;
    if (even && twoExponent === 0) return null;
    const count = s.gf.reduce(
      (n, [p, e]) => n * (even && p === 2 ? e : e + 1),
      1,
    );
    return {
      content: `${s.shown.map((n) => `$${n}$`).join(", ")}의 ${even ? "공약수 중 짝수의" : "공약수의"} 개수를 구하시오.`,
      answer: `$${count}$개`,
      solution: `공약수는 최대공약수 $${s.g}$의 약수이다. ${even ? `짝수인 약수에는 소인수 $2$가 있어야 하므로 $2$의 지수는 $1$부터 $${twoExponent}$까지 택한다. ` : "각 소인수의 지수는 $0$부터 그 소인수의 지수까지 택한다. "}가능한 지수의 조합을 세면 $${count}$개이다.`,
      facts: { ...flatFacts([s.ns]), even: Number(even) },
    };
  });
}

function divisorChoice(rng: Rng, common: boolean): Body {
  return attempt(200, () => {
    const set = numberSet(rng, 2);
    const ns = common
      ? set.ns
      : [
          pick(
            rng,
            [
              60, 72, 84, 90, 96, 108, 120, 126, 144, 150, 168, 180, 210, 240,
              252, 270, 300, 360,
            ],
          ),
        ];
    const good = factorDivisors(common ? set.gf : factors(ns[0]!));
    const not = pick(rng, [false, true]);
    const goodCount = not ? 4 : 2;
    if (good.length < goodCount) return null;
    const bad = Array.from({ length: 71 }, (_, i) => i + 2).filter(
      (n) => !good.includes(n),
    );
    const choices = shuffle(rng, [
      ...pickDistinct(rng, good, goodCount),
      ...pickDistinct(rng, bad, 5 - goodCount),
    ]);
    const valid = (n: number) => good.includes(n) !== not;
    const answer = choices
      .flatMap((n, i) => (valid(n) ? [MARKS[i]!] : []))
      .join(", ");
    const term = common ? "공약수" : "약수";
    const shown = common
      ? set.shown
      : [pick(rng, [String(ns[0]), factorText(factors(ns[0]!))])];
    return {
      content: `${shown.map((n) => `$${n}$`).join(", ")}의 ${term}${not ? "가 아닌 것을 고르시오." : "를 모두 고르시오. (정답 2개)"}\n${choices.map((n, i) => `${MARKS[i]} $${pick(rng, [String(n), factorText(factors(n))])}$`).join("\n")}`,
      answer,
      solution: `${common ? `두 수의 최대공약수는 $${set.g}$이다. ` : ""}${term}는 ${mathList(good)}이다. 따라서 정답은 ${answer}이다.`,
      facts: { ...flatFacts([ns, choices]), not: Number(not) },
    };
  });
}

function powers(rng: Rng): Body {
  const count = intBetween(rng, 1, 4);
  const rows = Array.from({ length: count }, () => {
    const form = intBetween(rng, 0, 2);
    const ps = pickDistinct(rng, [2, 3, 5, 7], intBetween(rng, 1, 3)).sort(
      (a, b) => a - b,
    );
    const fs: Factors = ps.map((p, i) => [
      p,
      i === 0 ? intBetween(rng, 2, 3) : intBetween(rng, 1, 2),
    ]);
    const repeated = shuffle(
      rng,
      fs.flatMap(([p, e]) => Array<number>(e).fill(p)),
    );
    const chain = repeated.join("\\times");
    const compressed = factorText(fs);
    const reciprocal = (p: number) => `\\left(\\dfrac{1}{${p}}\\right)`;
    const content =
      form === 0
        ? chain
        : form === 1
          ? `\\dfrac{1}{${chain}}`
          : repeated.map(reciprocal).join("\\times");
    const answer =
      form === 0
        ? compressed
        : form === 1
          ? `\\dfrac{1}{${compressed}}`
          : fs
              .map(([p, e]) => `${reciprocal(p)}${e === 1 ? "" : `^{${e}}`}`)
              .join("\\times");
    return { form, fs, content, answer };
  });
  return {
    content: `각 곱을 같은 밑끼리 모아 거듭제곱으로 나타내시오.\n${rows.map((r, i) => `(${i + 1}) $${r.content}$`).join("\n")}`,
    answer: rows.map((r, i) => `(${i + 1}) $${r.answer}$`).join("\n"),
    solution: rows
      .map(
        (r, i) =>
          `(${i + 1}) 같은 수가 곱해진 횟수를 지수로 쓰면 $${r.answer}$이다.`,
      )
      .join("\n"),
    facts: Object.fromEntries(
      rows.flatMap((r, i) => [
        [`form${i}`, r.form],
        ...r.fs.flatMap(([p, e], j) => [
          [`base${i}_${j}`, p],
          [`exponent${i}_${j}`, e],
        ]),
      ]),
    ),
  };
}

function primeChoice(rng: Rng): Body {
  const mode = intBetween(rng, 0, 2); // 소수 / 합성수 / 소수가 아닌 수
  const all = mode === 0 && pick(rng, [false, true]);
  const wanted = all ? 2 : 1;
  const composites = Array.from({ length: 70 }, (_, i) => i + 2).filter(
    (n) => !PRIMES.includes(n),
  );
  const yes =
    mode === 0 ? PRIMES : mode === 1 ? composites : [1, ...composites];
  const no =
    mode === 0 ? [1, ...composites] : mode === 1 ? [1, ...PRIMES] : PRIMES;
  const nums = shuffle(rng, [
    ...pickDistinct(rng, yes, wanted),
    ...pickDistinct(rng, no, 5 - wanted),
  ]);
  const answer = nums
    .flatMap((n, i) => (yes.includes(n) ? [MARKS[i]!] : []))
    .join(", ");
  const ask = mode === 0 ? "소수" : mode === 1 ? "합성수" : "소수가 아닌 수";
  return {
    content: `다음 수에서 ${ask}를 ${all ? "모두 " : ""}고르시오.${all ? " (정답 2개)" : ""}\n${nums.map((n, i) => `${MARKS[i]} $${n}$`).join("\n")}`,
    answer,
    solution: `소수는 약수가 $1$과 자기 자신뿐이고, 합성수는 $1$보다 큰 자연수 중 소수가 아닌 수이다. $1$은 어느 쪽에도 속하지 않는다. 따라서 정답은 ${answer}이다.`,
    facts: { ...flatFacts([nums]), mode },
  };
}

function primeListCount(rng: Rng): Body {
  const mode = intBetween(rng, 0, 2); // 소수 / 합성수 / 각각
  const primeCount = intBetween(rng, 2, 4);
  const compositeCount = intBetween(rng, 2, 4);
  const composites = Array.from({ length: 70 }, (_, i) => i + 2).filter(
    (n) => !PRIMES.includes(n),
  );
  const nums = shuffle(rng, [
    1,
    ...pickDistinct(rng, PRIMES, primeCount),
    ...pickDistinct(rng, composites, compositeCount),
  ]);
  return {
    content: `다음 목록에서 ${mode === 0 ? "소수의 개수를" : mode === 1 ? "합성수의 개수를" : "소수와 합성수의 개수를 각각"} 구하시오.\n${mathList(nums)}`,
    answer:
      mode === 2
        ? `소수 $${primeCount}$개, 합성수 $${compositeCount}$개`
        : `$${mode === 0 ? primeCount : compositeCount}$개`,
    solution: `$1$은 소수도 합성수도 아니다. 목록의 소수는 ${mathList(nums.filter((n) => PRIMES.includes(n)))}, 합성수는 ${mathList(nums.filter((n) => n > 1 && !PRIMES.includes(n)))}이다. 따라서 소수는 $${primeCount}$개, 합성수는 $${compositeCount}$개이다.`,
    facts: { ...flatFacts([nums]), mode: mode + 3 },
  };
}

/** 생성기는 소인수 배수의 포함·배제로 센다. 시험은 각 후보의 공약수를 열거한다. */
function coprimeThrough(last: number, primes: number[]): number {
  let count = last;
  for (let mask = 1; mask < 2 ** primes.length; mask++) {
    let product = 1;
    let size = 0;
    primes.forEach((p, i) => {
      if ((mask & (1 << i)) !== 0) {
        product *= p;
        size++;
      }
    });
    count += (size % 2 === 1 ? -1 : 1) * Math.floor(last / product);
  }
  return count;
}

function coprimeIntervalCount(rng: Rng): Body {
  const even = pick(rng, [false, true]);
  const target = even
    ? pick(rng, [9, 15, 21, 25, 27, 35, 45, 49, 63, 81])
    : pick(rng, [12, 15, 18, 20, 21, 24, 27, 30, 35, 45]);
  const ps = factors(target).map(([p]) => p);
  const window = integerWindow(rng, pick(rng, [false, true]));
  // 목표 수가 홀수일 때 gcd(2k, N) = gcd(k, N)이다.
  const first = even ? Math.ceil(window.first / 2) : window.first;
  const last = even ? Math.floor(window.last / 2) : window.last;
  const count = coprimeThrough(last, ps) - coprimeThrough(first - 1, ps);
  const shownTarget = pick(rng, [String(target), factorText(factors(target))]);
  return {
    content: `기준 수가 $${shownTarget}$일 때, ${window.text} ${even ? "짝수" : "자연수"} 중 이 수와 서로소인 수의 개수를 구하시오.`,
    answer: `$${count}$개`,
    solution: `기준 수의 소인수는 ${mathList(ps)}이다. 주어진 범위의 ${even ? "짝수" : "자연수"}에서 이 소인수의 배수를 제외하면 서로소인 수는 $${count}$개이다.`,
    facts: {
      target,
      first: window.first,
      last: window.last,
      even: Number(even),
      paired: -1,
    },
  };
}

function coprimeChoice(rng: Rng): Body {
  return attempt(200, () => {
    const paired = pick(rng, [false, true]);
    const all = pick(rng, [false, true]);
    const target = pick(rng, [12, 15, 18, 20, 21, 24, 30, 35, 45]);
    const targetPrimes = factors(target).map(([p]) => p);
    const pool = Array.from({ length: 59 }, (_, i) => i + 2);
    const good = pool.filter((n) => targetPrimes.every((p) => n % p !== 0));
    const bad = pool.filter((n) => targetPrimes.some((p) => n % p === 0));
    const rows = shuffle(rng, [true, all, false, false, false]).map((yes) => {
      if (!paired) return { ns: [pick(rng, yes ? good : bad)], yes };
      const p = pick(rng, [2, 3, 5, 7]);
      const q = pick(rng, [11, 13, 17, 19]);
      const left = p ** intBetween(rng, 1, 2);
      const right = q * (yes ? 1 : p);
      return { ns: [left, right], yes };
    });
    if (new Set(rows.map((r) => r.ns.join(","))).size !== 5) return null;
    const answer = rows
      .flatMap((r, i) => (r.yes ? [MARKS[i]!] : []))
      .join(", ");
    const shownTarget = pick(rng, [
      String(target),
      factorText(factors(target)),
    ]);
    return {
      content: `${paired ? "두 수가 서로소인 쌍을" : `기준 수가 $${shownTarget}$일 때, 이 수와 서로소인 수를`} ${all ? "모두 " : ""}고르시오.${all ? " (정답 2개)" : ""}\n${rows.map((r, i) => `${MARKS[i]} ${r.ns.map((n) => `$${pick(rng, [String(n), factorText(factors(n))])}$`).join(", ")}`).join("\n")}`,
      answer,
      solution: `공통인 소인수가 없으면 최대공약수가 $1$이므로 서로소이다. 각 보기의 수를 소인수분해하여 비교하면 정답은 ${answer}이다.`,
      facts: {
        ...flatFacts(rows.map((r) => r.ns)),
        paired: Number(paired),
        target,
      },
    };
  });
}

export const M1_TEXTBOOK_NUMBER: TypeEntry[] = [
  defType(
    BOOK,
    MINOR,
    "N01",
    "여러 묶음의 최대공약수",
    SEC.gcd,
    "기본",
    (rng) => batch(rng, "gcd"),
  ),
  defType(
    BOOK,
    MINOR,
    "N02",
    "최소공배수와 범위 공배수",
    SEC.lcm,
    "기본",
    (rng) => {
      const mode = intBetween(rng, 0, 5);
      return mode === 0
        ? givenMultipleCount(rng)
        : mode === 1
          ? nearestMultiple(rng)
          : mode === 2
            ? kthMultipleFactors(rng)
            : batch(rng, "lcm");
    },
  ),
  defType(
    BOOK,
    MINOR,
    "N03",
    "최대공약수와 최소공배수 함께 구하기",
    SEC.gcd,
    "기본",
    (rng) => {
      const s = numberSet(rng);
      return {
        content: `주어진 수들의 최대공약수와 최소공배수를 각각 구하시오.\n${s.shown.map((n) => `$${n}$`).join(", ")}`,
        answer: `최대공약수 $${s.g}$, 최소공배수 $${s.l}$`,
        solution: `공통 소인수의 가장 작은 지수를 택하면 최대공약수 $${s.g}$, 모든 소인수의 가장 큰 지수를 택하면 최소공배수 $${s.l}$이다.`,
        facts: flatFacts([s.ns]),
      };
    },
  ),
  defType(
    BOOK,
    MINOR,
    "N04",
    "후보에서 공약수 고르기",
    SEC.gcd,
    "기본",
    (rng) => divisorChoice(rng, true),
  ),
  defType(
    BOOK,
    MINOR,
    "N05",
    "여러 곱을 거듭제곱으로 나타내기",
    SEC.prime,
    "기본",
    powers,
  ),
  defType(
    BOOK,
    MINOR,
    "N06",
    "소수와 합성수의 선택과 개수",
    SEC.prime,
    "기본",
    (rng) =>
      pick(rng, [false, true]) ? primeChoice(rng) : primeListCount(rng),
  ),
  defType(
    BOOK,
    MINOR,
    "N07",
    "서로소의 선택과 구간 개수",
    SEC.gcd,
    "기본",
    (rng) =>
      intBetween(rng, 0, 2) === 0
        ? coprimeIntervalCount(rng)
        : coprimeChoice(rng),
  ),
  defType(
    BOOK,
    MINOR,
    "N08",
    "공약수의 나열과 조건별 개수",
    SEC.gcd,
    "기본",
    (rng) =>
      intBetween(rng, 0, 2) === 0
        ? commonDivisorCount(rng)
        : batch(rng, "divisors"),
  ),
  defType(
    BOOK,
    MINOR,
    "N09",
    "후보에서 약수 고르기",
    SEC.factor,
    "기본",
    (rng) => divisorChoice(rng, false),
  ),
];
