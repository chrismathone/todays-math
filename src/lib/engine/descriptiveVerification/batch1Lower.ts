/** Printed-only oracles. No runtime imports, author data, helper facts or shared arithmetic. */
import type {
  NativePrintedProblem,
  NativeFact,
} from "../../../contracts/nativeDescriptive.contract";
import type { NativeVerification } from "./types";

function printed(p: NativePrintedProblem, required: string[]) {
  if (p.figureSpec !== null)
    throw new Error("그림 없는 정의에 예상 밖 인쇄 그림");
  if (required.some((s) => !p.content.includes(s)))
    throw new Error("인쇄 요구·단위 누락");
  return p.content.split("\n")[0]!.replace(/\$/g, "");
}
const fact = (
  factKey: string,
  kind: NativeFact["kind"],
  value: string | number,
  unit?: string,
): NativeFact => ({
  factKey,
  kind,
  value: String(value),
  ...(unit ? { unit } : {}),
});
function check(
  criterionId: string,
  witnesses: string[],
  answer?: string,
): NativeVerification["criterionChecks"][number] {
  return {
    criterionId,
    expectedContains: witnesses,
    modelContains: witnesses,
    ...(answer ? { answerContains: [answer] } : {}),
  };
}
export function verifyLcmExponent(p: NativePrintedProblem): NativeVerification {
  const q = printed(p, [
    "지수를 비교표로",
    "작은 지수",
    "더 큰 지수",
    "최소공배수를 자연수로",
  ]);
  const m =
    /^(연습|탐구) 카드에 두 자연수 A=(\d+), B=(\d+)가 적혀 있다\.$/.exec(q);
  if (!m) throw new Error("자연수 표기·부호·단위 조건 불완전");
  const a = Number(m[2]),
    b = Number(m[3]);
  if (a < 2 || a > 400 || b < 2 || b > 400) throw new Error("자연수 범위 오류");
  if (a === b) throw new Error("서로 다른 두 수가 아님");
  // Enumerate prime divisors and test divisibility by powers, without factoring by repeated division.
  const primes: number[] = [];
  for (let n = 2; n <= Math.max(a, b); n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (prime && (a % n === 0 || b % n === 0)) primes.push(n);
  }
  const powerCount = (n: number, prime: number) => {
    let e = 0,
      power = prime;
    while (n % power === 0) {
      e++;
      power *= prime;
    }
    return e;
  };
  const table = primes.map((prime) => [
    prime,
    powerCount(a, prime),
    powerCount(b, prime),
  ]);
  const selection = table.map(([prime, x, y]) => [prime!, x! >= y! ? x! : y!]);
  // First common multiple by walking the multiples of A. This does not use selected exponents.
  let lcm = a;
  while (lcm % b !== 0 && lcm <= 6000) lcm += a;
  if (lcm > 6000) throw new Error("공배수 범위 오류");
  const product = selection
    .map(([prime, e]) => (e === 1 ? String(prime) : `${prime}^{${e}}`))
    .join("\\times");
  const factored = (index: number) =>
    table
      .filter((row) => row[index]! > 0)
      .map((row) =>
        row[index] === 1 ? String(row[0]) : `${row[0]}^{${row[index]}}`,
      )
      .join("\\times");
  return {
    derived: [
      fact("A", "given", a),
      fact("B", "given", b),
      fact(
        "exponents",
        "intermediate",
        table.map((t) => t.join(":")).join(";"),
      ),
      fact(
        "selection",
        "intermediate",
        selection.map(([prime, e]) => `${prime}:${e}`).join(";"),
      ),
      fact("lcm", "answer", lcm),
    ],
    criterionChecks: [
      check("exponents", [
        `A=${factored(1)}`,
        `B=${factored(2)}`,
        ...table.map(([prime, x, y]) => `${prime}:(${x},${y})`),
      ]),
      check("selection", [
        ...selection.map(([prime, e]) => `${prime}:${e}`),
        "나누어떨어",
        "최소",
      ]),
      check("lcm", [`${product}=${lcm}`], String(lcm)),
    ],
    coverage: {
      combination: `${a},${b}`,
      context: m[1] === "연습" ? "0" : "1",
      presentation: "number",
      order: a < b ? "A<B" : "A>B",
      "common-exponents": table.some(([, x, y]) => x! > 0 && y! > 0 && x !== y)
        ? "different"
        : "equal",
      "A-boundary": a === 6 ? "min" : a === 400 ? "max" : "interior",
      "B-boundary": b === 6 ? "min" : b === 396 ? "max" : "interior",
      "lcm-boundary": lcm === 30 ? "min" : lcm === 5940 ? "max" : "interior",
    },
  };
}

/** Trial divisors, not the author's Euclidean reduction. Exact integer arithmetic throughout. */
function reduced(n: number, d: number): [number, number] {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0)
    throw new Error("분수 범위 오류");
  for (let divisor = Math.min(Math.abs(n), d); divisor > 1; divisor--) {
    if (n % divisor === 0 && d % divisor === 0)
      return [n / divisor, d / divisor];
  }
  return n === 0 ? [0, 1] : [n, d];
}
const canonical = ([n, d]: [number, number]) => `${n}/${d}`;
const tex = ([n, d]: [number, number]) =>
  d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`;
function readRational(text: string): [number, number] {
  if (/^-?\d+$/.test(text)) return [Number(text), 1];
  const m = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(text);
  if (!m || Number(m[3]) < 2) throw new Error("유리수 표기·단위 오류");
  const raw: [number, number] = [
    Number(m[2]) * (m[1] === "-" ? -1 : 1),
    Number(m[3]),
  ];
  if (canonical(raw) !== canonical(reduced(...raw)))
    throw new Error("기약분수 아님");
  return raw;
}
export function verifyRationalRepair(
  p: NativePrintedProblem,
): NativeVerification {
  const q = printed(p, [
    "잘못 계산한 기록의 관계식",
    "되돌리는 계산",
    "(바른 결과)−(잘못한 결과)",
    "기약분수 또는 정수",
  ]);
  const m =
    /^(민서|지우)는 어떤 유리수에 대해 다음 기록을 남겼다\. 원래는 (.+)(?:을|를) (빼야|더해야) 하는데, 잘못하여 (더했더니|뺐더니) 결과가 (.+)이었다\.$/.exec(
      q,
    );
  if (!m || (m[3] === "빼야") !== (m[4] === "더했더니"))
    throw new Error("연산 기록 조건 불완전");
  const a = readRational(m[2]!),
    r = readRational(m[5]!);
  if (!a[0] || !r[0] || a[1] < 2 || a[1] > 12 || r[1] > 60)
    throw new Error("유리수 범위 오류");
  const add = m[4] === "더했더니";
  // Find a common integer grid and search X on it against the printed erroneous operation.
  let grid = Math.max(a[1], r[1]);
  while (grid % a[1] || grid % r[1]) grid++;
  const aTick = a[0] * (grid / a[1]),
    rTick = r[0] * (grid / r[1]);
  const candidates: number[] = [];
  for (let candidate = -9 * grid; candidate <= 9 * grid; candidate++)
    if ((add ? candidate + aTick : candidate - aTick) === rTick)
      candidates.push(candidate);
  if (candidates.length !== 1 || candidates[0] === 0)
    throw new Error("원 수가 유일하지 않음");
  const xTick = candidates[0]!,
    sTick = add ? xTick - aTick : xTick + aTick;
  if (sTick === 0) throw new Error("보조 영역 밖 0 결과");
  const x = reduced(xTick, grid),
    s = reduced(sTick, grid),
    delta = reduced(sTick - rTick, grid);
  const op = add ? "+" : "-",
    undo = add ? "-" : "+";
  const relation = `x${op}(${tex(a)})=${tex(r)}`;
  const repair = `x${undo}(${tex(a)})`;
  const xBoundary = canonical(x);
  const aBoundary = canonical(a);
  return {
    derived: [
      fact("operand", "given", canonical(a)),
      fact("wrong-result", "given", canonical(r)),
      fact("wrong-operation", "given", add ? "add" : "subtract"),
      fact("wrong-relation", "intermediate", relation),
      fact("original", "intermediate", canonical(x)),
      fact("repair-gap", "intermediate", `${repair};delta=${canonical(delta)}`),
      fact("correct", "answer", canonical(s)),
    ],
    criterionChecks: [
      check("wrong-relation", [relation, add ? "덧셈" : "뺄셈"]),
      check("original", [`x=${tex(r)}${undo}(${tex(a)})=${tex(x)}`]),
      check("repair-gap", [
        repair,
        `${add ? "-" : ""}2\\times(${tex(a)})=${tex(delta)}`,
        "소거",
      ]),
      check("correct", [`${tex(x)}${undo}(${tex(a)})=${tex(s)}`], tex(s)),
    ],
    coverage: {
      combination: `${canonical(a)},${canonical(r)},${add ? "add" : "subtract"}`,
      context: m[1] === "민서" ? "0" : "1",
      "operation-sign": `${add ? "add" : "subtract"}:${a[0] > 0 ? "+" : "-"}`,
      "x-boundary": ["-9/1", "9/1", "-1/12", "1/12"].includes(xBoundary)
        ? x[1] === 1
          ? String(x[0])
          : xBoundary
        : "interior",
      "a-boundary": ["-13/2", "13/2", "-1/12", "1/12"].includes(aBoundary)
        ? aBoundary
        : "interior",
      "operand-denominator": String(a[1]),
      "original-denominator": String(x[1]),
      "denominator-pair-operation": `${a[1]},${x[1]},${add ? "add" : "subtract"}`,
      "sign-pattern": `${add ? "add" : "subtract"}:${[x[0], a[0], r[0], s[0]].map((n) => (n > 0 ? "+" : "-")).join("")}`,
    },
  };
}

export function verifyDiscountModel(
  p: NativePrintedProblem,
): NativeVerification {
  const q = printed(p, [
    "정가를 x원",
    "기준량",
    "방정식을 세우고",
    "계산하여 확인",
  ]);
  const m =
    /^(문구|미술) 용품 한 개를 정가에서 (\d+)\\% 할인하여 (\d+)원에 판매했다\.$/.exec(
      q,
    );
  if (!m) throw new Error("할인율·판매가·원 단위 조건 불완전");
  const rate = Number(m[2]),
    sale = Number(m[3]);
  if (![10, 20, 25, 40].includes(rate) || sale < 1 || sale > 20000)
    throw new Error("할인 범위 오류");
  // Search the price satisfying the integer cross-product of the printed percentage relation.
  const prices: number[] = [];
  for (let candidate = 1; candidate <= 2 * sale; candidate++)
    if (candidate * 100 - candidate * rate === sale * 100)
      prices.push(candidate);
  if (prices.length !== 1) throw new Error("정가가 유일하지 않음");
  const price = prices[0]!,
    discount = price - sale;
  if (price < 4000 || price > 20000 || price % 1000)
    throw new Error("정가 범위 오류");
  return {
    derived: [
      fact("rate", "given", rate, "%"),
      fact("sale", "given", sale, "원"),
      fact("discount", "intermediate", `${rate}x/100`, "원"),
      fact(
        "equation",
        "intermediate",
        `x-${rate}x/100=${sale};${100 - rate}x=${100 * sale};x=${price}`,
      ),
      fact("price", "answer", price, "원"),
    ],
    criterionChecks: [
      check("discount", [`\\frac{${rate}}{100}x`, "기준량은 정가"]),
      check("equation", [
        `x-\\frac{${rate}}{100}x=${sale}`,
        `${100 - rate}x=${100 * sale}`,
        `x=${price}`,
      ]),
      check(
        "price",
        [
          `${price}\\times\\frac{${rate}}{100}=${discount}`,
          `${price}-${discount}=${sale}`,
          "원",
        ],
        `${price}원`,
      ),
    ],
    coverage: {
      combination: `${rate},${price}`,
      context: m[1] === "문구" ? "0" : "1",
      rate: String(rate),
    },
  };
}

export function verifyIntegerBudget(
  p: NativePrintedProblem,
): NativeVerification {
  const q = printed(p, [
    "전체 비용의 부등식",
    "나누는 수의 부호",
    "1개 많은",
    "최대 개수를 단위와 함께",
  ]);
  const m =
    /^(준비물|꾸러미) 물품은 한 개에 (\d+)원이다\. 물품을 한 상자에 담을 때 상자값 (\d+)원을 한 번 내야 한다\. 전체 비용을 (\d+)원 이하로 하며 물품은 쪼개어 살 수 없다\.$/.exec(
      q,
    );
  if (!m) throw new Error("단가·고정비·예산·단위·정수 조건 불완전");
  const price = Number(m[2]),
    fixed = Number(m[3]),
    budget = Number(m[4]);
  if (
    ![800, 1000, 1200, 1500].includes(price) ||
    ![2000, 2500, 3000].includes(fixed) ||
    budget <= fixed ||
    budget > 30000
  )
    throw new Error("예산 범위 오류");
  // Repeated purchases establish the integer maximum and next cost independently of division/floor.
  let count = 0,
    cost = fixed;
  while (cost + price <= budget) {
    count++;
    cost += price;
  }
  const next = cost + price,
    remainder = budget - cost;
  if (count < 5 || count > 15 || remainder % 100)
    throw new Error("구매 개수·잔액 범위 오류");
  const bound = reduced(budget - fixed, price);
  return {
    derived: [
      fact("unit-price", "given", price, "원/개"),
      fact("fixed-cost", "given", fixed, "원"),
      fact("budget", "given", budget, "원"),
      fact("inequality", "intermediate", `${price}x+${fixed}<=${budget}`),
      fact(
        "bound",
        "intermediate",
        `${price}x<=${budget - fixed};x<=${canonical(bound)}`,
      ),
      fact(
        "boundary-check",
        "intermediate",
        `n=${count};cost=${cost};next=${next}`,
      ),
      fact("maximum", "answer", count, "개"),
    ],
    criterionChecks: [
      check("inequality", [
        `${price}x+${fixed}\\le${budget}`,
        "상자값",
        "등호",
      ]),
      check("bound", [
        `${price}x\\le${budget - fixed}`,
        `x\\le${tex(bound)}`,
        `양수인 ${price}`,
      ]),
      check("boundary-check", [
        `${price}\\times${count}+${fixed}=${cost}\\le${budget}`,
        `${price}\\times${count + 1}+${fixed}=${next}>${budget}`,
        "비용이 증가",
      ]),
      check("maximum", [`최대 ${count}개`], `${count}개`),
    ],
    coverage: {
      combination: `${price},${fixed},${count},${remainder}`,
      context: m[1] === "준비물" ? "0" : "1",
      "integer-boundary": remainder === 0 ? "exact" : "fractional",
      "remainder-boundary":
        remainder === 0
          ? "zero"
          : remainder === price - 100
            ? "highest"
            : "interior",
    },
  };
}
