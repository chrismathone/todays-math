/**
 * 병렬 세션 소유 모듈 — 이 파일과 여기서 import 하는 파일은 **한 세션만** 만진다
 * (docs/planning/tracks/middle-engine-parallel-20260823.md 의 파일 소유권 규칙).
 *
 * 세션 중1: RPM 1-1·1-2 저조 단원 30유형 (`m1Book1.ts` 13 + `m1Book2.ts` 17).
 *
 * ## 보류 목록 — 그림·표가 필요해 이번 트랙에서 내지 않은 것 (브리프 계약 9)
 * FigureSpec v2 실증 완료 목록(09-figure-engine-guide §2)에 없는 도형은
 * 지어내지 않는다. 어설픈 그림이 없는 것보다 나쁘다.
 *
 * - 1-2 도수분포표와 상대도수 전체 (우리 «히스토그램»·«도수분포다각형»
 *   ·«줄기와 잎 그림»·«도수분포표»·«상대도수») — 표·그래프 그림 필요
 * - 1-2 위치 관계 09·10 (잘라 낸 입체·전개도), 11~18·20 (평행선 각도 그림)
 * - 1-2 다각형 09~14·23·24 (이등분선·별 모양 등 그림 의존 각 계산)
 * - 1-2 원과 부채꼴 11~18 (색칠한 부분·끈·굴리기 — 전부 그림)
 * - 1-2 입체도형의 겉넓이와 부피 05~26 (전개도·회전체·구멍 뚫린 기둥 등
 *   그림 의존 — 치수 명시형 기둥 01~04 만 냈다)
 * - 1-1 좌표와 그래프 01·02·07~09·11 (좌표평면 그림·그래프 해석) —
 *   «순서쌍과 좌표평면(기본)»·«그래프의 이해» 단원 몫이기도 하다
 */
import { M1_BOOK1 } from "./m1Book1";
import { M1_BOOK2 } from "./m1Book2";
import { intBetween } from "../elementary/rng";
import { defType, shuffle } from "./m1Shared";
import type { TypeEntry } from "./types";

const BOOK2 = "1-2";
const DATA_MINOR = "도수분포표와 상대도수";
const COORD_MINOR = "좌표와 그래프";

function stemAndLeaf(values: readonly number[]): string {
  const rows = new Map<number, number[]>();
  for (const value of [...values].sort((a, b) => a - b)) {
    const stem = Math.floor(value / 10);
    const leaves = rows.get(stem) ?? [];
    leaves.push(value % 10);
    rows.set(stem, leaves);
  }
  return [...rows]
    .map(([stem, leaves]) => `${stem} | ${leaves.join(" ")}`)
    .join("\n");
}

function dataFacts(
  values: readonly number[],
  answer: number,
): Record<string, number> {
  const facts: Record<string, number> = { n: values.length, answer };
  values.forEach((value, index) => {
    facts[`v${index + 1}`] = value;
  });
  return facts;
}

const STEM_LEAF_TYPES: TypeEntry[] = [
  defType(
    BOOK2,
    DATA_MINOR,
    "20",
    "줄기가 주어진 자료의 개수",
    "줄기와 잎 그림",
    "기본",
    (rng) => {
      const stem = intBetween(rng, 2, 4);
      const target = Array.from(
        { length: intBetween(rng, 3, 6) },
        (_, i) => stem * 10 + i + 1,
      );
      const otherStem = stem === 4 ? 3 : stem + 1;
      const others = Array.from(
        { length: intBetween(rng, 3, 5) },
        (_, i) => otherStem * 10 + i * 2,
      );
      const values = shuffle(rng, [...target, ...others]);
      const answer = target.length;
      return {
        content: `다음 줄기와 잎 그림에서 십의 자리 숫자가 $${stem}$인 자료의 개수를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${answer}$개`,
        solution: `줄기가 $${stem}$인 행의 잎은 모두 $${answer}$개이므로 자료의 개수는 $${answer}$개이다.`,
        facts: dataFacts(values, answer),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "21",
    "자료의 전체 개수",
    "줄기와 잎 그림",
    "연산",
    (rng) => {
      const start = intBetween(rng, 1, 3) * 10;
      const n = intBetween(rng, 8, 13);
      const values = Array.from(
        { length: n },
        (_, i) => start + ((i * 7 + 3) % 28),
      );
      return {
        content: `다음 줄기와 잎 그림에 나타난 자료의 전체 개수를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${n}$개`,
        solution: `각 행의 잎의 개수를 모두 더하면 $${n}$개이다.`,
        facts: dataFacts(values, n),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "22",
    "최댓값과 최솟값의 차",
    "줄기와 잎 그림",
    "기본",
    (rng) => {
      const min = intBetween(rng, 12, 24);
      const gap = intBetween(rng, 21, 35);
      const max = min + gap;
      const values = [min, min + 3, min + 8, min + 12, max - 9, max - 4, max];
      return {
        content: `다음 줄기와 잎 그림에서 가장 큰 값과 가장 작은 값의 차를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${gap}$`,
        solution: `가장 작은 값은 $${min}$, 가장 큰 값은 $${max}$이므로 그 차는 $${max}-${min}=${gap}$이다.`,
        facts: dataFacts(values, gap),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "23",
    "줄기와 잎 그림의 평균",
    "줄기와 잎 그림",
    "연산",
    (rng) => {
      const mean = intBetween(rng, 27, 43);
      const d1 = intBetween(rng, 3, 7);
      const d2 = intBetween(rng, 8, 12);
      const values = shuffle(rng, [
        mean - d2,
        mean - d1,
        mean,
        mean + d1,
        mean + d2,
      ]);
      return {
        content: `다음 줄기와 잎 그림에 나타난 자료의 평균을 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${mean}$`,
        solution: `자료의 합은 $${mean * 5}$이고 자료는 $5$개이므로 평균은 $${mean * 5}\div5=${mean}$이다.`,
        facts: dataFacts(values, mean),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "24",
    "줄기와 잎 그림의 중앙값",
    "줄기와 잎 그림",
    "기본",
    (rng) => {
      const median = intBetween(rng, 25, 42);
      const values = [
        median - 11,
        median - 7,
        median - 3,
        median,
        median + 2,
        median + 6,
        median + 13,
      ];
      return {
        content: `다음 줄기와 잎 그림에 나타난 자료의 중앙값을 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${median}$`,
        solution: `자료가 $7$개이므로 크기순으로 나열했을 때 네 번째 값인 $${median}$이 중앙값이다.`,
        facts: dataFacts(values, median),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "25",
    "줄기와 잎 그림의 최빈값",
    "줄기와 잎 그림",
    "기본",
    (rng) => {
      const mode = intBetween(rng, 24, 46);
      const values = shuffle(rng, [
        mode - 8,
        mode - 3,
        mode,
        mode,
        mode,
        mode + 4,
        mode + 9,
      ]);
      return {
        content: `다음 줄기와 잎 그림에 나타난 자료의 최빈값을 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${mode}$`,
        solution: `$${mode}$이 $3$번으로 가장 많이 나타나므로 최빈값은 $${mode}$이다.`,
        facts: dataFacts(values, mode),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "26",
    "기준값 이상인 자료의 개수",
    "줄기와 잎 그림",
    "응용",
    (rng) => {
      const threshold = intBetween(rng, 28, 42);
      const values = [
        threshold - 12,
        threshold - 7,
        threshold - 1,
        threshold,
        threshold + 2,
        threshold + 6,
        threshold + 11,
      ];
      const answer = values.filter((value) => value >= threshold).length;
      return {
        content: `다음 줄기와 잎 그림에서 $${threshold}$ 이상인 자료의 개수를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${answer}$개`,
        solution: `$${threshold}$ 이상인 값은 ${values
          .filter((value) => value >= threshold)
          .sort((a, b) => a - b)
          .join(", ")}의 $${answer}$개이다.`,
        facts: { ...dataFacts(values, answer), threshold },
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "27",
    "범위에 속하는 자료의 개수",
    "줄기와 잎 그림",
    "응용",
    (rng) => {
      const low = intBetween(rng, 20, 30);
      const high = low + intBetween(rng, 12, 18);
      const values = [
        low - 5,
        low,
        low + 3,
        low + 8,
        high - 2,
        high,
        high + 4,
        high + 9,
      ];
      const answer = values.filter(
        (value) => value >= low && value <= high,
      ).length;
      return {
        content: `다음 줄기와 잎 그림에서 $${low}$ 이상 $${high}$ 이하인 자료의 개수를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${answer}$개`,
        solution: `$${low}$ 이상 $${high}$ 이하인 잎을 세면 $${answer}$개이다.`,
        facts: { ...dataFacts(values, answer), low, high },
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "28",
    "홀수와 짝수 자료 수의 차",
    "줄기와 잎 그림",
    "심화",
    (rng) => {
      const base = intBetween(rng, 20, 35);
      const values = Array.from({ length: 9 }, (_, i) => base + i);
      const odd = values.filter((value) => value % 2 !== 0).length;
      const even = values.length - odd;
      const answer = Math.abs(odd - even);
      return {
        content: `다음 줄기와 잎 그림에서 홀수인 자료의 개수와 짝수인 자료의 개수의 차를 구하시오.\n(줄기 | 잎)\n${stemAndLeaf(values)}`,
        answer: `$${answer}$개`,
        solution: `홀수는 $${odd}$개, 짝수는 $${even}$개이므로 그 차는 $${answer}$개이다.`,
        facts: { ...dataFacts(values, answer), odd, even },
      };
    },
  ),
];

function frequencyTable(
  start: number,
  width: number,
  frequencies: readonly number[],
): string {
  return frequencies
    .map((frequency, index) => {
      const low = start + width * index;
      return `${low} 이상 ${low + width} 미만 | ${frequency}`;
    })
    .join("\n");
}

const FREQUENCY_TABLE_TYPES: TypeEntry[] = [
  defType(BOOK2, DATA_MINOR, "29", "도수의 합", "도수분포표", "연산", (rng) => {
    const frequencies = Array.from({ length: 5 }, () => intBetween(rng, 2, 8));
    const total = frequencies.reduce((sum, value) => sum + value, 0);
    return {
      content: `다음 도수분포표에서 조사한 학생 수를 구하시오.\n(점수 | 도수)\n${frequencyTable(50, 10, frequencies)}`,
      answer: `$${total}$명`,
      solution: `도수의 총합은 $${frequencies.join("+")}=${total}$이므로 학생은 $${total}$명이다.`,
      facts: dataFacts(frequencies, total),
    };
  }),
  defType(
    BOOK2,
    DATA_MINOR,
    "30",
    "특정 계급의 도수",
    "도수분포표",
    "기본",
    (rng) => {
      const start = intBetween(rng, 1, 3) * 10;
      const width = 10;
      const frequencies = Array.from({ length: 5 }, () =>
        intBetween(rng, 2, 9),
      );
      const index = intBetween(rng, 0, 4);
      const low = start + index * width;
      const answer = frequencies[index]!;
      return {
        content: `다음 도수분포표에서 $${low}$ 이상 $${low + width}$ 미만인 계급의 도수를 구하시오.\n(변량 | 도수)\n${frequencyTable(start, width, frequencies)}`,
        answer: `$${answer}$`,
        solution: `표에서 $${low}$ 이상 $${low + width}$ 미만인 계급의 도수는 $${answer}$이다.`,
        facts: { ...dataFacts(frequencies, answer), low, width },
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "31",
    "도수가 가장 큰 계급",
    "도수분포표",
    "기본",
    (rng) => {
      const start = intBetween(rng, 2, 4) * 10;
      const width = 5;
      const peak = intBetween(rng, 0, 4);
      const frequencies = [2, 3, 4, 5, 6].map(
        (value, index) => value + (index === peak ? 8 : 0),
      );
      const low = start + peak * width;
      return {
        content: `다음 도수분포표에서 도수가 가장 큰 계급의 최솟값을 구하시오.\n(변량 | 도수)\n${frequencyTable(start, width, frequencies)}`,
        answer: `$${low}$`,
        solution: `가장 큰 도수는 $${frequencies[peak]}$이고 그 계급은 $${low}$ 이상 $${low + width}$ 미만이므로 최솟값은 $${low}$이다.`,
        facts: { ...dataFacts(frequencies, low), low, width },
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "32",
    "가장 큰 도수",
    "도수분포표",
    "기본",
    (rng) => {
      const frequencies = Array.from({ length: 5 }, () =>
        intBetween(rng, 2, 12),
      );
      const answer = Math.max(...frequencies);
      return {
        content: `다음 도수분포표에서 가장 큰 도수를 구하시오.\n(시간 | 도수)\n${frequencyTable(0, 2, frequencies)}`,
        answer: `$${answer}$`,
        solution: `도수 ${frequencies.join(", ")} 중 가장 큰 값은 $${answer}$이다.`,
        facts: dataFacts(frequencies, answer),
      };
    },
  ),
  defType(
    BOOK2,
    DATA_MINOR,
    "33",
    "계급의 크기",
    "도수분포표",
    "기본",
    (rng) => {
      const width = intBetween(rng, 2, 6) * 5;
      const frequencies = Array.from({ length: 4 }, () =>
        intBetween(rng, 2, 9),
      );
      return {
        content: `다음 도수분포표에서 계급의 크기를 구하시오.\n(키 | 도수)\n${frequencyTable(120, width, frequencies)}`,
        answer: `$${width}$`,
        solution: `계급의 크기는 계급의 양 끝값의 차이므로 $${120 + width}-120=${width}$이다.`,
        facts: dataFacts(frequencies, width),
      };
    },
  ),
  defType(BOOK2, DATA_MINOR, "34", "계급값", "도수분포표", "연산", (rng) => {
    const start = intBetween(rng, 2, 5) * 10;
    const width = 10;
    const frequencies = Array.from({ length: 4 }, () => intBetween(rng, 2, 9));
    const index = intBetween(rng, 0, 3);
    const low = start + index * width;
    const answer = low + width / 2;
    return {
      content: `다음 도수분포표에서 $${low}$ 이상 $${low + width}$ 미만인 계급의 계급값을 구하시오.\n(변량 | 도수)\n${frequencyTable(start, width, frequencies)}`,
      answer: `$${answer}$`,
      solution: `계급값은 양 끝값의 평균이므로 $(${low}+${low + width})\div2=${answer}$이다.`,
      facts: { ...dataFacts(frequencies, answer), low, width },
    };
  }),
  defType(BOOK2, DATA_MINOR, "35", "누적 도수", "도수분포표", "응용", (rng) => {
    const start = 10;
    const width = 10;
    const frequencies = Array.from({ length: 5 }, () => intBetween(rng, 2, 9));
    const count = intBetween(rng, 2, 4);
    const boundary = start + count * width;
    const answer = frequencies
      .slice(0, count)
      .reduce((sum, value) => sum + value, 0);
    return {
      content: `다음 도수분포표에서 $${boundary}$ 미만인 자료의 개수를 구하시오.\n(변량 | 도수)\n${frequencyTable(start, width, frequencies)}`,
      answer: `$${answer}$개`,
      solution: `$${boundary}$ 미만인 계급들의 도수를 더하면 $${answer}$개이다.`,
      facts: { ...dataFacts(frequencies, answer), boundary },
    };
  }),
  defType(
    BOOK2,
    DATA_MINOR,
    "36",
    "도수의 범위",
    "도수분포표",
    "심화",
    (rng) => {
      const frequencies = Array.from({ length: 5 }, () =>
        intBetween(rng, 2, 12),
      );
      const answer = Math.max(...frequencies) - Math.min(...frequencies);
      return {
        content: `다음 도수분포표에서 가장 큰 도수와 가장 작은 도수의 차를 구하시오.\n(변량 | 도수)\n${frequencyTable(20, 5, frequencies)}`,
        answer: `$${answer}$`,
        solution: `가장 큰 도수와 가장 작은 도수의 차는 $${Math.max(...frequencies)}-${Math.min(...frequencies)}=${answer}$이다.`,
        facts: dataFacts(frequencies, answer),
      };
    },
  ),
];

const BASIC_COORDINATE_TYPES: TypeEntry[] = [
  defType(
    "1-1",
    COORD_MINOR,
    "12",
    "점의 x좌표",
    "순서쌍과 좌표평면(기본)",
    "기본",
    (rng) => {
      const x = intBetween(rng, -9, 9);
      const y = intBetween(rng, -9, 9);
      return {
        content: `점 $A(${x}, ${y})$의 $x$좌표를 구하시오.`,
        answer: `$${x}$`,
        solution: `순서쌍의 첫 번째 수가 $x$좌표이므로 $${x}$이다.`,
        facts: { x, y, answer: x },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "13",
    "점의 y좌표",
    "순서쌍과 좌표평면(기본)",
    "기본",
    (rng) => {
      const x = intBetween(rng, -9, 9);
      const y = intBetween(rng, -9, 9);
      return {
        content: `점 $B(${x}, ${y})$의 $y$좌표를 구하시오.`,
        answer: `$${y}$`,
        solution: `순서쌍의 두 번째 수가 $y$좌표이므로 $${y}$이다.`,
        facts: { x, y, answer: y },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "14",
    "점이 속한 사분면",
    "순서쌍과 좌표평면(기본)",
    "기본",
    (rng) => {
      const x = intBetween(rng, 1, 9) * (rng() < 0.5 ? -1 : 1);
      const y = intBetween(rng, 1, 9) * (rng() < 0.5 ? -1 : 1);
      const quadrant = x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
      return {
        content: `점 $C(${x}, ${y})$는 제몇 사분면 위의 점인지 구하시오.`,
        answer: `제$${quadrant}$사분면`,
        solution: `$x$좌표의 부호는 ${x > 0 ? "양수" : "음수"}, $y$좌표의 부호는 ${y > 0 ? "양수" : "음수"}이므로 제$${quadrant}$사분면이다.`,
        facts: { x, y, answer: quadrant },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "15",
    "x축 위의 점",
    "순서쌍과 좌표평면(기본)",
    "연산",
    (rng) => {
      const x = intBetween(rng, -9, 9);
      const a = intBetween(rng, -7, 7);
      return {
        content: `점 $D(${x}, a+${-a})$가 $x$축 위에 있을 때, $a$의 값을 구하시오.`,
        answer: `$${a}$`,
        solution: `$x$축 위의 점의 $y$좌표는 $0$이므로 $a${-a >= 0 ? "+" : ""}${-a}=0$에서 $a=${a}$이다.`,
        facts: { x, a, answer: a },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "16",
    "y축 위의 점",
    "순서쌍과 좌표평면(기본)",
    "연산",
    (rng) => {
      const y = intBetween(rng, -9, 9);
      const a = intBetween(rng, -7, 7);
      return {
        content: `점 $E(a+${-a}, ${y})$가 $y$축 위에 있을 때, $a$의 값을 구하시오.`,
        answer: `$${a}$`,
        solution: `$y$축 위의 점의 $x$좌표는 $0$이므로 $a${-a >= 0 ? "+" : ""}${-a}=0$에서 $a=${a}$이다.`,
        facts: { y, a, answer: a },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "17",
    "x축까지의 거리",
    "순서쌍과 좌표평면(기본)",
    "기본",
    (rng) => {
      const x = intBetween(rng, -9, 9);
      const y = intBetween(rng, 1, 9) * (rng() < 0.5 ? -1 : 1);
      return {
        content: `점 $P(${x}, ${y})$와 $x$축 사이의 거리를 구하시오.`,
        answer: `$${Math.abs(y)}$`,
        solution: `$x$축까지의 거리는 $y$좌표의 절댓값이므로 $|${y}|=${Math.abs(y)}$이다.`,
        facts: { x, y, answer: Math.abs(y) },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "18",
    "y축까지의 거리",
    "순서쌍과 좌표평면(기본)",
    "기본",
    (rng) => {
      const x = intBetween(rng, 1, 9) * (rng() < 0.5 ? -1 : 1);
      const y = intBetween(rng, -9, 9);
      return {
        content: `점 $Q(${x}, ${y})$와 $y$축 사이의 거리를 구하시오.`,
        answer: `$${Math.abs(x)}$`,
        solution: `$y$축까지의 거리는 $x$좌표의 절댓값이므로 $|${x}|=${Math.abs(x)}$이다.`,
        facts: { x, y, answer: Math.abs(x) },
      };
    },
  ),
  defType(
    "1-1",
    COORD_MINOR,
    "19",
    "원점에 대칭인 점",
    "순서쌍과 좌표평면(기본)",
    "응용",
    (rng) => {
      const x = intBetween(rng, -9, 9);
      const y = intBetween(rng, -9, 9);
      return {
        content: `점 $R(${x}, ${y})$와 원점에 대하여 대칭인 점의 두 좌표의 합을 구하시오.`,
        answer: `$${-x - y}$`,
        solution: `대칭인 점은 $(-${x}, -${y})$이므로 두 좌표의 합은 $${-x}+(${-y})=${-x - y}$이다.`,
        facts: { x, y, answer: -x - y },
      };
    },
  ),
];

export const M1EXTRA_TYPES: TypeEntry[] = [
  ...M1_BOOK1,
  ...M1_BOOK2,
  ...STEM_LEAF_TYPES,
  ...FREQUENCY_TABLE_TYPES,
  ...BASIC_COORDINATE_TYPES,
];
