/**
 * 2026-10-18 R2 계획 B: 중3 네 차시의 자작 보강 12유형.
 *
 * RPM 이관물이 아니다. TypeEntry의 역사적 rpm* 필드를 인터페이스 호환에만
 * 사용하며 책/유형 키는 manual-20261018 네임스페이스다. 적재 source는 manual.
 * 기존 RNG/유형/중등 judge 등록부는 바꾸지 않는다.
 *
 * 승인: 계획 실행만 승인됨(eb5d6e285). 최종 문항·배치 SHA·DB 쓰기는 별도 관문.
 * 독립 검산은 발문을 다시 읽으며 facts/생성기 정답을 oracle로 삼지 않는다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { CHOICE_MARKS } from "../problem/choiceCountRule";
import type { MidProblem, TypeEntry } from "./types";

const BOOK = "manual-20261018";
const GRADE = "중3";
type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "distractors"
>;

function def(
  section: string,
  id: string,
  title: string,
  difficulty: MidProblem["difficulty"],
  make: (rng: Rng) => Body,
): TypeEntry {
  const meta = {
    grade: GRADE,
    unitSection: section,
    rpmBook: BOOK,
    rpmMinor: section,
    rpmType: id,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${section}|${id}`,
    ...meta,
    handler: (rng) => ({ ...meta, difficulty, figureSpec: null, ...make(rng) }),
  };
}

/** 보기 순서만 섞는다. 정답의 자리는 내용과 함께 이동한다. */
function choices(rng: Rng, texts: readonly string[], correct: number) {
  if (texts.length !== 5 || new Set(texts).size !== 5) {
    throw new Error("자작 유형의 보기는 서로 다른 다섯 개여야 합니다");
  }
  const order = texts.map((text, index) => ({ text, index }));
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {
    content: order
      .map((entry, i) => `${CHOICE_MARKS[i]} ${entry.text}`)
      .join("\n"),
    answer: CHOICE_MARKS[order.findIndex((entry) => entry.index === correct)]!,
  };
}

const math = (value: string | number) => `$${value}$`;
const signed = (value: number) => (value < 0 ? String(value) : `+${value}`);
const coefficient = (value: number) =>
  value === 0
    ? ""
    : value === 1
      ? "+x"
      : value === -1
        ? "-x"
        : `${signed(value)}x`;
const polynomial = (b: number, c: number) =>
  `x^2${coefficient(b)}${c === 0 ? "" : signed(c)}`;

function numeric(answer: number, wrong: readonly number[]) {
  if (wrong.length !== 4 || new Set([answer, ...wrong]).size !== 5) {
    throw new Error("수치 정답과 오답 넷은 서로 달라야 합니다");
  }
  return { answer: math(answer), distractors: wrong.map(math) };
}

export const M3_REINFORCEMENT_20261018: TypeEntry[] = [
  def(
    "무리수와 실수",
    "R01",
    "유한한 근삿값으로 무리수를 분류한 오류",
    "기본",
    (rng) => {
      const n = pick(rng, [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]);
      const digits = intBetween(rng, 2, 4);
      const approximation = Math.sqrt(n).toFixed(digits);
      const options = choices(
        rng,
        [
          `$\\sqrt{${n}}$의 근삿값이 유한소수이므로 정확한 값도 유리수이다.`,
          `근호 안의 수가 완전제곱수가 아니므로 $\\sqrt{${n}}$는 무리수이며, 근삿값과 정확한 값은 다르다.`,
          `$\\sqrt{${n}}$는 양수이므로 유리수이다.`,
          `$\\sqrt{${n}}$는 무리수이므로 실수가 아니다.`,
          `$\\sqrt{${n}}$는 소수로 나타낼 수 없으므로 무리수이다.`,
        ],
        1,
      );
      return {
        content: `계산기에 $\\sqrt{${n}}$의 값이 소수점 아래 $${digits}$자리까지 반올림되어 $${approximation}$로 표시되었다. 민수는 “화면의 값이 유한소수이므로 $\\sqrt{${n}}$도 유리수이다.”라고 말했다. 이 주장에 대한 설명으로 옳은 것을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `완전제곱수가 아닌 자연수의 제곱근이므로 정확한 값은 무리수이다. 화면에 표시된 값은 유리수인 근삿값이며 정확한 값과 같지 않다. 무리수도 실수이고, 순환하지 않는 무한소수로 나타낼 수 있다.`,
        facts: { n, digits },
      };
    },
  ),

  def(
    "무리수와 실수",
    "R02",
    "두 무리수의 합에 관한 주장의 반례",
    "기본",
    (rng) => {
      const d = pick(rng, [2, 3, 5, 6, 7, 10, 11, 13]);
      const c = intBetween(rng, 2, 12);
      const options = choices(
        rng,
        [
          `$\\sqrt{${d}}$, $${c}-\\sqrt{${d}}$`,
          `$\\sqrt{${d}}$, $${c}+\\sqrt{${d}}$`,
          `$\\sqrt{${d}}$, $2\\sqrt{${d}}$`,
          `$\\sqrt{${d}}$, $${c}+2\\sqrt{${d}}$`,
          `$\\sqrt{${d}}$, $3\\sqrt{${d}}$`,
        ],
        0,
      );
      return {
        content: `“두 무리수의 합은 언제나 무리수이다.”라는 주장이 틀렸음을 보이려 한다. 첫째 수가 $\\sqrt{${d}}$이고 두 수의 합이 유리수 $${c}$가 되는 반례를 만들 때, 조건에 맞는 두 무리수의 쌍을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `첫 수 $\\sqrt{${d}}$와 둘째 수 $${c}-\\sqrt{${d}}$는 각각 무리수이지만 합은 $${c}$인 유리수이다. 나머지 쌍의 합에는 $\\sqrt{${d}}$의 계수가 $0$이 아닌 정수로 남으므로 무리수이다.`,
        facts: { d, c },
      };
    },
  ),

  def(
    "무리수와 실수",
    "R03",
    "유리수 변환의 결과에서 원래 실수 분류",
    "기본",
    (rng) => {
      const a = intBetween(rng, 2, 5);
      const b = intBetween(rng, 2, 9);
      const d = pick(rng, [2, 3, 5, 6, 7, 10, 11, 13]);
      const options = choices(
        rng,
        [
          `$x$가 유리수라면 좌변도 유리수가 되어 모순이다. 따라서 $x$는 무리수이다.`,
          `$x$에 유리수를 곱했으므로 $x$도 유리수이다.`,
          `좌변에 근호 기호가 없으므로 $x$는 유리수이다.`,
          `우변이 무리수이므로 $x$는 실수가 아니다.`,
          `좌변에서 정수를 더했으므로 $x$는 정수이다.`,
        ],
        0,
      );
      return {
        content: `실수 $x$가 $${a}x+${b}=\\sqrt{${d}}$를 만족한다. $x$에 대한 설명으로 옳은 것을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `정수에 유리수를 곱하고 정수를 더한 값은 유리수이다. 만약 $x$가 유리수라면 $${a}x+${b}$도 유리수여야 하지만, 우변은 완전제곱수가 아닌 자연수의 제곱근으로 무리수이다. 이는 모순이므로 $x$는 무리수이다.`,
        facts: { a, b, d },
      };
    },
  ),

  def(
    "인수분해",
    "F01",
    "한 값 대입 검산이 오류를 드러내지 못하는 경우",
    "기본",
    (rng) => {
      const a = intBetween(rng, 2, 9);
      const b = intBetween(rng, 1, 6);
      const c = b + intBetween(rng, 1, 4);
      return {
        content: `서연이는 $${polynomial(b - a, -a * b)}=(x-${a})(x+${c})$가 모든 실수 $x$에 대해 성립한다고 잘못 주장했다. 다음 다섯 수 $${a - 2}$, $${a - 1}$, $${a}$, $${a + 1}$, $${a + 2}$ 중에서, 양변에 대입해도 값이 같아 이 오류를 드러내지 못하는 $x$의 값을 구하시오.`,
        ...numeric(a, [a - 2, a - 1, a + 1, a + 2]),
        solution: `좌변은 $(x-${a})(x+${b})$이다. 우변에서 좌변을 빼면 $${c - b}(x-${a})$이므로 두 값이 같은 것은 $x=${a}$일 때뿐이다. 한 값에서 같다는 사실만으로 모든 실수에서 성립하는 인수분해라고 할 수 없다.`,
        facts: { a, b, c },
      };
    },
  ),

  def(
    "인수분해",
    "F02",
    "정수 계수 일차식의 곱으로 나타낼 수 있는 조건",
    "응용",
    (rng) => {
      const center = intBetween(rng, 4, 10);
      const halfGap = intBetween(rng, 1, 3);
      const q = [halfGap * halfGap, 2, 3, 5, 6];
      const options = choices(
        rng,
        q.map((n) => math(polynomial(-2 * center, center * center - n))),
        0,
      );
      return {
        content: `두 정수 $p$, $q$의 합이 $${-2 * center}$이다. 다음 중 $(x+p)(x+q)$ 꼴로 인수분해할 수 있는 식을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `$x^2-${2 * center}x+c=(x-${center})^2-(${center * center}-c)$이다. 정수 $p$, $q$로 인수분해되려면 $${center * center}-c$가 정수의 제곱이어야 한다. $${halfGap * halfGap}$만 제곱수이므로 $${polynomial(-2 * center, center * center - halfGap * halfGap)}=(x-${center - halfGap})(x-${center + halfGap})$이다. 나머지의 $${center * center}-c$는 각각 $2$, $3$, $5$, $6$으로 제곱수가 아니다.`,
        facts: { center, halfGap },
      };
    },
  ),

  def(
    "인수분해",
    "F03",
    "공통 일차인수 조건에서 누락된 계수 복원",
    "응용",
    (rng) => {
      const a = intBetween(rng, 2, 8);
      let b = intBetween(rng, 1, 6);
      const c = intBetween(rng, 1, 6);
      if (b === a + c) b += 7;
      const target = -a * a - c * a;
      return {
        content: `두 다항식 $${polynomial(b - a, -a * b)}$와 $${polynomial(c, 0)}+k$가 공통으로 $x-r$을 인수로 가진다. $r$이 양수일 때, 상수 $k$의 값을 구하시오.`,
        ...numeric(target, [target - 2, target - 1, target + 1, target + 2]),
        solution: `첫째 다항식은 $(x-${a})(x+${b})$이다. $r>0$이므로 공통인수는 $x-${a}$이다. 둘째 다항식을 $(x-${a})(x+t)$로 놓으면 $t-${a}=${c}$에서 $t=${a + c}$이다. 따라서 상수항 $k=-${a}\\times ${a + c}=${target}$이다.`,
        facts: { a, b, c },
      };
    },
  ),

  def(
    "이차방정식의 활용",
    "Q01",
    "미지수의 뜻에 맞는 넓이 모델 선택",
    "기본",
    (rng) => {
      const a = intBetween(rng, 3, 8);
      const b = a + intBetween(rng, 1, 5);
      const increase = intBetween(rng, 2, 6);
      const area = (a + increase) * (b + increase);
      const options = choices(
        rng,
        [
          `$(x+${a})(x+${b})=${area}$`,
          `$(x+${a})(x+${b})=${area + a * b}$`,
          `$x(x+${b - a})=${area}$`,
          `$(x-${a})(x-${b})=${area}$`,
          `$${a * b}+2x=${area}$`,
        ],
        0,
      );
      return {
        content: `가로가 $${a}\\,\\mathrm{m}$, 세로가 $${b}\\,\\mathrm{m}$인 직사각형의 가로와 세로를 각각 같은 길이만큼 늘였다. 늘인 뒤의 넓이는 $${area}\\,\\mathrm{m^2}$이다. 늘인 길이를 $x\\,\\mathrm{m}$라고 할 때, 상황에 맞게 세운 방정식을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `늘인 뒤의 가로와 세로는 각각 $(${a}+x)\\,\\mathrm{m}$, $(${b}+x)\\,\\mathrm{m}$이다. $${area}\\,\\mathrm{m^2}$는 증가한 넓이가 아니라 늘인 뒤의 전체 넓이이므로 $(x+${a})(x+${b})=${area}$이다.`,
        facts: { a, b, area },
      };
    },
  ),

  def(
    "이차방정식의 활용",
    "Q02",
    "둘레와 넓이 조건이 양립할 수 없는 경우",
    "기본",
    (rng) => {
      const half = intBetween(rng, 5, 10);
      const extra = intBetween(rng, 1, 6);
      const values = [
        half * half + extra,
        ...[1, 2, 3, 4].map((d) => half * half - d * d),
      ];
      const options = choices(
        rng,
        values.map((n) => math(`${n}\\,\\mathrm{cm^2}`)),
        0,
      );
      return {
        content: `가로와 세로의 길이가 양수이고 둘레가 $${4 * half}\\,\\mathrm{cm}$인 직사각형을 만들려고 한다. 이 직사각형의 넓이가 될 수 없는 것을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `한 변을 $x\\,\\mathrm{cm}$라 하면 다른 변은 $(${2 * half}-x)\\,\\mathrm{cm}$이고 $0<x<${2 * half}$이다. 넓이를 $S\\,\\mathrm{cm^2}$라 하면 $(x-${half})^2=${half * half}-S$이다. 제곱은 음수가 될 수 없으므로 $S\\le ${half * half}$이다. 따라서 $${half * half + extra}\\,\\mathrm{cm^2}$는 불가능하다. 다른 네 넓이는 양의 두 변 $${half}-d$, $${half}+d$ ($d=1,2,3,4$)로 만들 수 있다.`,
        facts: { half, extra },
      };
    },
  ),

  def(
    "이차방정식의 활용",
    "Q03",
    "정수 배분과 남는 수의 범위에서 나머지 복원",
    "응용",
    (rng) => {
      const count = intBetween(rng, 4, 12);
      const extra = intBetween(rng, 1, 4);
      const total = count * (count + extra);
      const remainder = intBetween(rng, 0, 4);
      const stock = total + remainder;
      return {
        content: `공책 $${stock}$권을 몇 명의 학생에게 같은 수씩 나누어 주려고 한다. 한 학생이 받는 공책의 수는 학생 수보다 $${extra}$ 많아야 한다. 나누어 주고 남는 공책이 $0$권 이상 $4$권 이하가 되도록 할 때, 남는 공책의 수를 구하시오.`,
        ...numeric(
          remainder,
          [0, 1, 2, 3, 4].filter((n) => n !== remainder),
        ),
        solution: `학생 수를 자연수 $n$, 남는 수를 $r$이라 하면 $n^2+${extra}n-(${stock}-r)=0$이다. 남는 수 $r$은 정수이므로 $0,1,2,3,4$를 각각 대입하여 이차방정식 다섯 개를 살핀다. 근의 공식의 근호 안에 있는 수의 값을 차례로 계산하면 $${[0, 1, 2, 3, 4].map((r) => extra * extra + 4 * (stock - r)).join(", ")}$이다. 이 중 완전제곱수는 $r=${remainder}$일 때의 $${(2 * count + extra) ** 2}$뿐이므로 이때만 자연수 해가 가능하다. 그 방정식의 두 해는 $${count}$, $-${count + extra}$이고 학생 수는 $${count}$명이다. 나누어 준 총수 $${total}$권을 원래 수에서 빼면 $${stock}-${total}=${remainder}$이므로 남는 수는 $${remainder}$권이다.`,
        facts: { count, extra, stock },
      };
    },
  ),

  def(
    "대푯값과 산포도",
    "S01",
    "한 변량을 수정했을 때 평균과 중앙값 비교",
    "기본",
    (rng) => {
      const center = intBetween(rng, 20, 60);
      const gap = intBetween(rng, 1, 5);
      const rise = intBetween(rng, 1, 5);
      const values = [-2, -1, 0, 1, 2].map((d) => center + d * gap);
      const options = choices(
        rng,
        [
          `평균은 $${rise}$만큼 커지고, 중앙값은 변하지 않는다.`,
          `평균은 $${5 * rise}$만큼 커지고, 중앙값은 변하지 않는다.`,
          `평균은 변하지 않고, 중앙값은 $${rise}$만큼 커진다.`,
          "평균과 중앙값이 모두 변하지 않는다.",
          `평균은 $${rise}$만큼 작아지고, 중앙값은 변하지 않는다.`,
        ],
        0,
      );
      return {
        content: `다섯 변량이 $${values.join(", ")}$이다. 이 중 가장 큰 변량 $${values[4]}$ 하나만 $${values[4]! + 5 * rise}$로 수정하였다. 수정 전후를 비교한 설명으로 옳은 것을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `총합이 $${5 * rise}$만큼 증가하고 변량은 여전히 $5$개이므로 평균은 $${rise}$만큼 커진다. 가장 큰 변량만 더 커지고 가운데인 셋째 변량이 그대로 남으므로 중앙값은 변하지 않는다.`,
        facts: { center, gap, rise },
      };
    },
  ),

  def(
    "대푯값과 산포도",
    "S02",
    "평균과 표준편차 변화에서 이동량 복원",
    "응용",
    (rng) => {
      const mean = intBetween(rng, 10, 30);
      const sd = intBetween(rng, 1, 5);
      const scale = intBetween(rng, 2, 4);
      const shift = intBetween(rng, 2, 9);
      return {
        content: `어떤 자료의 평균은 $${mean}$, 표준편차는 $${sd}$이다. 각 변량을 모두 $a$배 한 뒤 $b$를 더한 새로운 자료의 평균은 $${scale * mean + shift}$이고, 표준편차는 $${scale * sd}$이다. $a>0$일 때, $b$의 값을 구하시오.`,
        ...numeric(shift, [shift - 2, shift - 1, shift + 1, shift + 2]),
        solution: `상수를 더해도 표준편차는 변하지 않고, 양수 $a$배 하면 표준편차는 $a$배가 된다. 따라서 $a=${scale * sd}\\div ${sd}=${scale}$이다. 평균도 $a$배 한 뒤 $b$를 더하므로 $${scale}\\times ${mean}+b=${scale * mean + shift}$에서 $b=${shift}$이다.`,
        facts: { mean, sd, scale, shift },
      };
    },
  ),

  def(
    "대푯값과 산포도",
    "S03",
    "평균과 최댓값 최솟값이 같아도 분산이 다른 자료",
    "기본",
    (rng) => {
      const center = intBetween(rng, 20, 60);
      const gap = intBetween(rng, 1, 5);
      const a = [-2, -1, 0, 1, 2].map((d) => center + d * gap);
      const b = [-2, 0, 0, 0, 2].map((d) => center + d * gap);
      const options = choices(
        rng,
        [
          "평균은 A가 B보다 크다.",
          "평균은 A가 B보다 작다.",
          "평균과 분산이 모두 같다.",
          "평균은 같고, 분산은 A가 B보다 크다.",
          "평균은 같고, 분산은 A가 B보다 작다.",
        ],
        3,
      );
      return {
        content: `두 자료 A, B가 다음과 같다.\nA: $${a.join(", ")}$\nB: $${b.join(", ")}$\n이 두 자료를 비교한 설명으로 옳은 것을 고르시오.\n${options.content}`,
        answer: options.answer,
        solution: `두 자료의 평균은 모두 $${center}$이고 최댓값과 최솟값도 같다. 편차 제곱의 합은 A가 $${10 * gap * gap}$, B가 $${8 * gap * gap}$이다. 변량의 수가 모두 $5$이므로 분산은 A가 B보다 크다. 최댓값과 최솟값이 같다는 것만으로 분산이 같다고 할 수 없다.`,
        facts: { center, gap },
      };
    },
  ),
];
