import type { ArithmeticGrade, ArithmeticV2CatalogEntry } from "../types";

/** Textbook table-of-contents order (owner request, 2026-10-16: the catalog
 * listed types in registration order, so 삼각비 sat on three different pages).
 * Unit names are the catalog's own; a unit missing here sorts after the known
 * ones of its semester, in first-appearance order, so nothing disappears.
 */
const UNIT_ORDER: Readonly<
  Record<ArithmeticGrade, readonly [readonly string[], readonly string[]]>
> = {
  초1: [
    ["9까지의 수", "여러 가지 모양", "덧셈과 뺄셈", "비교하기", "50까지의 수"],
    [
      "100까지의 수",
      "덧셈과 뺄셈(1)",
      "여러 가지 모양",
      "덧셈과 뺄셈(2)",
      "시계 보기와 규칙 찾기",
      "덧셈과 뺄셈(3)",
    ],
  ],
  초2: [
    [
      "세 자리 수",
      "여러 가지 도형",
      "덧셈과 뺄셈",
      "길이 재기",
      "분류하기",
      "곱셈",
    ],
    [
      "네 자리 수",
      "곱셈구구",
      "길이 재기",
      "시각과 시간",
      "표와 그래프",
      "규칙 찾기",
    ],
  ],
  초3: [
    ["덧셈과 뺄셈", "평면도형", "나눗셈", "곱셈", "길이와 시간", "분수와 소수"],
    ["곱셈", "나눗셈", "원", "분수", "들이와 무게", "자료의 정리"],
  ],
  초4: [
    [
      "큰 수",
      "각도",
      "곱셈과 나눗셈",
      "평면도형의 이동",
      "막대그래프",
      "규칙 찾기",
    ],
    [
      "분수의 덧셈과 뺄셈",
      "삼각형",
      "소수의 덧셈과 뺄셈",
      "사각형",
      "꺾은선그래프",
      "다각형",
    ],
  ],
  초5: [
    [
      "자연수의 혼합 계산",
      "약수와 배수",
      "규칙과 대응",
      "약분과 통분",
      "분수의 덧셈과 뺄셈",
      "다각형의 둘레와 넓이",
    ],
    [
      "수의 범위와 어림하기",
      "분수의 곱셈",
      "합동과 대칭",
      "소수의 곱셈",
      "직육면체",
      "평균과 가능성",
    ],
  ],
  초6: [
    [
      "분수의 나눗셈",
      "각기둥과 각뿔",
      "소수의 나눗셈",
      "비와 비율",
      "여러 가지 그래프",
      "직육면체의 겉넓이와 부피",
    ],
    [
      "분수의 나눗셈",
      "소수의 나눗셈",
      "공간과 입체",
      "비례식과 비례배분",
      "원의 둘레와 넓이",
      "원기둥, 원뿔, 구",
    ],
  ],
  중1: [
    [
      "소인수분해",
      "정수와 유리수",
      "문자와 식",
      "일차방정식",
      "그래프와 비례관계",
    ],
    [
      "기본 도형",
      "작도와 합동",
      "평면도형의 성질",
      "입체도형의 성질",
      "자료의 정리와 해석",
    ],
  ],
  중2: [
    [
      "유리수와 순환소수",
      "식의 계산",
      "일차부등식",
      "연립일차방정식",
      "일차함수의 그래프",
      "일차함수와 일차방정식의 관계",
    ],
    [
      "삼각형과 사각형의 성질",
      "도형의 닮음",
      "피타고라스 정리",
      "확률과 그 기본 성질",
    ],
  ],
  중3: [
    [
      "제곱근과 실수",
      "다항식의 곱셈과 인수분해",
      "이차방정식",
      "이차함수와 그래프",
    ],
    ["삼각비", "원의 성질", "통계"],
  ],
};

const GRADES: readonly ArithmeticGrade[] = [
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
];

type Placed = Pick<ArithmeticV2CatalogEntry, "grade" | "curriculum">;

/** Stable sort by grade, semester, textbook unit order, then original order. */
export function sortArithmeticCatalog<T extends Placed>(
  types: readonly T[],
): T[] {
  const firstSeen = new Map<string, number>();
  types.forEach((type, index) => {
    const key = `${type.grade}:${type.curriculum.semester}:${type.curriculum.unit}`;
    if (!firstSeen.has(key)) firstSeen.set(key, index);
  });
  const rank = (type: T): [number, number, number, number] => {
    const { semester, unit } = type.curriculum;
    const known = UNIT_ORDER[type.grade]?.[semester - 1] ?? [];
    const position = known.indexOf(unit);
    return [
      GRADES.indexOf(type.grade),
      semester,
      position >= 0 ? position : known.length,
      position >= 0 ? 0 : firstSeen.get(`${type.grade}:${semester}:${unit}`)!,
    ];
  };
  return types
    .map((type, index) => ({ type, index, rank: rank(type) }))
    .sort((a, b) => {
      for (let i = 0; i < 4; i++)
        if (a.rank[i] !== b.rank[i]) return a.rank[i] - b.rank[i];
      return a.index - b.index;
    })
    .map((entry) => entry.type);
}
