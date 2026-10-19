import { gcd, m, q, range, rows, scalar, type Q, type Spec } from "./core";

export const PROBABILITY_SPECS: Spec[] = [];
const put = (s: Omit<Spec, "grade" | "semester" | "unit" | "strand">) =>
  PROBABILITY_SPECS.push({
    ...s,
    grade: "중2",
    semester: 2,
    unit: "확률과 그 기본 성질",
    strand: "자료·확률",
  });
const choose = (n: number, k: number) => {
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - i + 1)) / i;
  return v;
};
const falling = (n: number, k: number) => {
  let v = 1;
  for (let i = 0; i < k; i++) v *= n - i;
  return v;
};
const list = (n: number) => range(0, n - 1);
/** Enumerates distinct labeled outcomes, never only color/number categories. */
const sequences = (n: number, k: number, replacement: boolean): number[][] => {
  let result: number[][] = [[]];
  for (let i = 0; i < k; i++)
    result = result.flatMap((p) =>
      list(n)
        .filter((x) => replacement || !p.includes(x))
        .map((x) => [...p, x]),
    );
  return result;
};
type EventSpec = Omit<
  Spec,
  "grade" | "semester" | "unit" | "strand" | "solve" | "check"
> & {
  result(p: number[]): Q;
  outcomes(p: number[]): boolean[];
  count?: boolean;
};
const event = ({ result, outcomes, count, ...spec }: EventSpec) =>
  put({
    ...spec,
    solve: result,
    check: (p, v) => {
      const space = outcomes(p),
        [n, d] = scalar(v);
      return (
        space.length > 0 &&
        n * (count ? 1 : space.length) === space.filter(Boolean).length * d
      );
    },
  });
event({
  id: "m2-fd-count-addition",
  title: "서로 겹치지 않는 선택의 경우의 수",
  domain: rows(range(2, 8), range(2, 8)),
  count: true,
  view: ([a, b]) => ({
    text: `서로 다른 공책 ${m(a)}종류와 서로 다른 연필 ${m(b)}종류가 있다. 이 중 물건 한 종류를 고른다.`,
    instruction: "고르는 경우의 수를 구하세요.",
  }),
  result: ([a, b]) => q(a + b),
  outcomes: ([a, b]) =>
    [...list(a).map((i) => `N${i}`), ...list(b).map((i) => `P${i}`)].map(
      () => true,
    ),
});
event({
  id: "m2-fd-count-product",
  title: "두 단계 선택의 경우의 수",
  domain: rows(range(2, 7), range(2, 7)),
  count: true,
  view: ([a, b]) => ({
    text: `서로 다른 상의 ${m(a)}벌과 서로 다른 하의 ${m(b)}벌 중에서 상의 한 벌과 하의 한 벌을 고른다.`,
    instruction: "고르는 경우의 수를 구하세요.",
  }),
  result: ([a, b]) => q(a * b),
  outcomes: ([a, b]) => list(a).flatMap(() => list(b).map(() => true)),
});
event({
  id: "m2-fd-count-seating",
  title: "서로 다른 자리에 순서 있게 앉히기",
  domain: rows(range(3, 7), range(2, 4)).filter(([n, k]) => k <= n),
  count: true,
  view: ([n, k]) => ({
    text: `서로 다른 학생 ${m(n)}명 중 ${m(k)}명을 골라 번호가 $1$부터 ${m(k)}까지인 ${m(k)}개의 자리에 한 명씩 앉힌다.`,
    instruction: "앉히는 경우의 수를 구하세요.",
  }),
  result: ([n, k]) => q(falling(n, k)),
  outcomes: ([n, k]) => sequences(n, k, false).map(() => true),
});
event({
  id: "m2-fd-count-pair",
  title: "순서 없이 두 명 고르기",
  domain: rows(range(3, 15)),
  count: true,
  view: ([n]) => ({
    text: `서로 다른 학생 ${m(n)}명 중 대표 두 명을 뽑는다. 두 대표의 역할은 같고 뽑은 순서는 구별하지 않는다.`,
    instruction: "뽑는 경우의 수를 구하세요.",
  }),
  result: ([n]) => q(n * (n - 1), 2),
  outcomes: ([n]) =>
    list(n).flatMap((a) =>
      list(n)
        .filter((b) => a < b)
        .map(() => true),
    ),
});
for (const zero of [false, true])
  event({
    id: `m2-fd-count-digits-${zero ? "with-zero" : "nonzero"}`,
    title: `${zero ? "0을 포함한" : "0이 없는"} 숫자 카드로 자연수 만들기`,
    domain: rows(range(3, 6), [2, 3]),
    count: true,
    view: ([n, k]) => ({
      text: `${m(zero ? 0 : 1)}부터 ${m(zero ? n - 1 : n)}까지의 숫자가 하나씩 적힌 서로 다른 카드 ${m(n)}장 중 ${m(k)}장을 골라 한 번씩 사용하여 ${m(k)}자리 자연수를 만든다.`,
      instruction: "만들 수 있는 자연수의 개수를 구하세요.",
    }),
    result: ([n, k]) => q((zero ? n - 1 : n) * falling(n - 1, k - 1)),
    outcomes: ([n, k]) =>
      sequences(n, k, false).map((p) => !zero || p[0] !== 0),
  });
for (const count of [false, true])
  event({
    id: `m2-fd-coin-exact-${count ? "count" : "probability"}`,
    title: `동전에서 앞면 횟수의 ${count ? "경우의 수" : "확률"}`,
    domain: rows(range(2, 6), range(0, 6)).filter(([n, k]) => k <= n),
    count,
    view: ([n, k]) => ({
      text: `앞면과 뒷면이 나올 가능성이 같은 동전 한 개를 서로 독립적으로 ${m(n)}번 던진다. 각 시행의 순서를 구별한다.`,
      instruction: `앞면이 정확히 ${m(k)}번 나오는 ${count ? "경우의 수를" : "확률을"} 구하세요.`,
    }),
    result: ([n, k]) => q(choose(n, k), count ? 1 : 2 ** n),
    outcomes: ([n, k]) =>
      sequences(2, n, true).map((p) => p.filter((x) => x === 1).length === k),
  });
event({
  id: "m2-fd-coin-complement",
  title: "여사건으로 적어도 한 번 앞면의 확률",
  domain: rows(range(2, 8)),
  view: ([n]) => ({
    text: `앞면과 뒷면이 나올 가능성이 같은 동전을 서로 독립적으로 ${m(n)}번 던진다.`,
    instruction: "앞면이 적어도 한 번 나올 확률을 구하세요.",
  }),
  result: ([n]) => q(2 ** n - 1, 2 ** n),
  outcomes: ([n]) => sequences(2, n, true).map((p) => p.includes(1)),
});
for (const target of ["above", "multiple"] as const)
  event({
    id: `m2-fd-single-die-${target}`,
    title:
      target === "above"
        ? "주사위에서 정해진 수보다 큰 눈의 확률"
        : "주사위에서 배수인 눈의 확률",
    domain: rows(range(target === "above" ? 1 : 2, target === "above" ? 5 : 6)),
    view: ([k]) => ({
      text: "$1$부터 $6$까지의 눈이 나올 가능성이 같은 주사위 한 개를 한 번 던진다.",
      instruction: `${m(k)}${target === "above" ? "보다 큰 눈" : "의 배수인 눈"}이 나올 확률을 구하세요.`,
    }),
    result: ([k]) => q(target === "above" ? 6 - k : Math.floor(6 / k), 6),
    outcomes: ([k]) =>
      range(1, 6).map((n) => (target === "above" ? n > k : n % k === 0)),
  });
for (const target of [
  "sum",
  "difference",
  "product-multiple",
  "at-least-one-face",
  "sum-at-least",
] as const)
  for (const count of [false, true]) {
    const bounds =
      target === "sum"
        ? [2, 12]
        : target === "difference"
          ? [0, 5]
          : target === "product-multiple"
            ? [2, 6]
            : target === "at-least-one-face"
              ? [1, 6]
              : [3, 12];
    event({
      id: `m2-fd-two-dice-${target}-${count ? "count" : "probability"}`,
      title: `두 주사위 ${{ sum: "합", difference: "차의 절댓값", "product-multiple": "곱의 배수", "at-least-one-face": "특정 눈이 적어도 하나", "sum-at-least": "합의 범위" }[target]}의 ${count ? "경우의 수" : "확률"}`,
      domain: rows(range(bounds[0], bounds[1])),
      count,
      view: ([k]) => ({
        text: "$1$부터 $6$까지의 각 눈의 가능성이 같은 빨간 주사위와 파란 주사위를 서로 독립적으로 한 번씩 던진다.",
        instruction: `${target === "sum" ? `두 눈의 합이 ${m(k)}` : target === "difference" ? `두 눈의 차의 절댓값이 ${m(k)}` : target === "product-multiple" ? `두 눈의 곱이 ${m(k)}의 배수` : target === "at-least-one-face" ? `적어도 한 주사위의 눈이 ${m(k)}` : `두 눈의 합이 ${m(k)} 이상`}인 ${count ? "경우의 수를" : "확률을"} 구하세요.`,
      }),
      result: ([k]) => {
        const success =
          target === "sum"
            ? 6 - Math.abs(7 - k)
            : target === "difference"
              ? k === 0
                ? 6
                : 2 * (6 - k)
              : target === "product-multiple"
                ? range(1, 6).reduce(
                    (s, a) => s + Math.floor(6 / (k / gcd(k, a))),
                    0,
                  )
                : target === "at-least-one-face"
                  ? 11
                  : k <= 7
                    ? 36 - ((k - 2) * (k - 1)) / 2
                    : ((13 - k) * (14 - k)) / 2;
        return q(success, count ? 1 : 36);
      },
      outcomes: ([k]) =>
        range(1, 6).flatMap((a) =>
          range(1, 6).map((b) =>
            target === "sum"
              ? a + b === k
              : target === "difference"
                ? Math.abs(a - b) === k
                : target === "product-multiple"
                  ? (a * b) % k === 0
                  : target === "at-least-one-face"
                    ? a === k || b === k
                    : a + b >= k,
          ),
        ),
    });
  }
for (const count of [false, true])
  event({
    id: `m2-fd-card-multiple-${count ? "count" : "probability"}`,
    title: `숫자 카드의 배수 ${count ? "경우의 수" : "확률"}`,
    domain: rows(range(4, 20), range(2, 7)).filter(([n, k]) => k <= n),
    count,
    view: ([n, k]) => ({
      text: `$1$부터 ${m(n)}까지의 자연수가 하나씩 적힌 카드 ${m(n)}장을 잘 섞어 같은 가능성으로 한 장을 뽑는다.`,
      instruction: `${m(k)}의 배수가 적힌 카드를 뽑는 ${count ? "경우의 수를" : "확률을"} 구하세요.`,
    }),
    result: ([n, k]) => q(Math.floor(n / k), count ? 1 : n),
    outcomes: ([n, k]) => range(1, n).map((x) => x % k === 0),
  });
event({
  id: "m2-fd-card-union",
  title: "겹치는 카드 사건의 합의 확률",
  domain: rows(range(8, 24), range(2, 5), range(3, 7)).filter(
    ([, a, b]) => a < b,
  ),
  view: ([n, a, b]) => ({
    text: `$1$부터 ${m(n)}까지의 자연수가 하나씩 적힌 카드 ${m(n)}장을 잘 섞어 같은 가능성으로 한 장을 뽑는다.`,
    instruction: `적힌 수가 ${m(a)}의 배수 또는 ${m(b)}의 배수일 확률을 구하세요.`,
  }),
  result: ([n, a, b]) =>
    q(
      Math.floor(n / a) +
        Math.floor(n / b) -
        Math.floor(n / ((a * b) / gcd(a, b))),
      n,
    ),
  outcomes: ([n, a, b]) => range(1, n).map((x) => x % a === 0 || x % b === 0),
});
for (const replacement of [false, true])
  for (const target of ["both-red", "different", "at-least-one-red"] as const)
    event({
      id: `m2-fd-balls-${replacement ? "replace" : "no-replace"}-${target}`,
      title: `${replacement ? "복원" : "비복원"} 추출에서 ${target === "both-red" ? "둘 다 빨강" : target === "different" ? "서로 다른 색" : "적어도 하나 빨강"} 확률`,
      domain: rows(range(1, 6), range(1, 6)),
      view: ([r, b]) => ({
        text: `빨간 공 ${m(r)}개와 파란 공 ${m(b)}개가 있는 주머니에서 공 한 개를 같은 가능성으로 뽑고 ${replacement ? "다시 넣은 뒤 충분히 섞어" : "다시 넣지 않고"} 한 개를 더 뽑는다.`,
        instruction: `뽑은 두 공이 ${target === "both-red" ? "모두 빨간색" : target === "different" ? "서로 다른 색" : "적어도 하나는 빨간색"}일 확률을 구하세요.`,
      }),
      result: ([r, b]) => {
        const t = r + b,
          den = t * (replacement ? t : t - 1),
          rr = r * (replacement ? r : r - 1),
          bb = b * (replacement ? b : b - 1);
        return q(
          target === "both-red"
            ? rr
            : target === "different"
              ? 2 * r * b
              : den - bb,
          den,
        );
      },
      outcomes: ([r, b]) =>
        sequences(r + b, 2, replacement).map(([x, y]) =>
          target === "both-red"
            ? x < r && y < r
            : target === "different"
              ? x < r !== y < r
              : x < r || y < r,
        ),
    });
event({
  id: "m2-fd-balls-three-exact",
  title: "세 번 복원 추출에서 빨간 공의 횟수",
  domain: rows(range(1, 5), range(1, 5), range(0, 3)),
  view: ([r, b, k]) => ({
    text: `빨간 공 ${m(r)}개와 파란 공 ${m(b)}개가 있는 주머니에서 같은 가능성으로 한 개를 뽑아 다시 넣고 충분히 섞는 시행을 독립적으로 세 번 반복한다.`,
    instruction: `빨간 공을 정확히 ${m(k)}번 뽑을 확률을 구하세요.`,
  }),
  result: ([r, b, k]) => q(choose(3, k) * r ** k * b ** (3 - k), (r + b) ** 3),
  outcomes: ([r, b, k]) =>
    sequences(r + b, 3, true).map((p) => p.filter((x) => x < r).length === k),
});
event({
  id: "m2-fd-independent-different-bags",
  title: "서로 다른 주머니에서 독립 추출",
  domain: rows(range(1, 4), range(1, 4), range(1, 4), range(1, 4)),
  view: ([r, b, R, B]) => ({
    text: `$A$ 주머니에는 빨간 공 ${m(r)}개, 파란 공 ${m(b)}개, $B$ 주머니에는 빨간 공 ${m(R)}개, 파란 공 ${m(B)}개가 있다. 각 주머니에서 같은 가능성으로 공을 한 개씩 서로 독립적으로 뽑는다.`,
    instruction: "두 공이 모두 빨간색일 확률을 구하세요.",
  }),
  result: ([r, b, R, B]) => q(r * R, (r + b) * (R + B)),
  outcomes: ([r, b, R, B]) =>
    list(r + b).flatMap((a) => list(R + B).map((c) => a < r && c < R)),
});
