/**
 * 문제은행 «교과서 거르기» Wire 시안의 자료 — **공유 DB 에서 센 실제 값**이다(2026-10-08 · `scripts/import/textbook/census.ts`).
 *
 * 시안을 작은 가짜 목록으로 세우면 «실제로는 줄이 넘친다»를 못 본다(20번 문서 2026-08-19 · 2026-09-27).
 * 책 29권 · 자료 종류 12개 · 학기별 수를 그대로 싣는다.
 */

export interface WireBook {
  publisher: string;
  author: string;
  grade: string;
  /** 실린 문항 */
  count: number;
  /** 그 가운데 출제에 쓰는 문항 */
  open: number;
  /** 자료(파일) 수 */
  materials: number;
}

export const WIRE_BOOKS: WireBook[] = [
  {
    publisher: "천재교육",
    author: "김동재",
    grade: "중1",
    count: 775,
    open: 762,
    materials: 147,
  },
  {
    publisher: "천재교육",
    author: "김화경",
    grade: "중1",
    count: 718,
    open: 711,
    materials: 124,
  },
  {
    publisher: "지학사",
    author: "장경윤",
    grade: "중1",
    count: 439,
    open: 435,
    materials: 78,
  },
  {
    publisher: "동아출판",
    author: "강옥기",
    grade: "중1",
    count: 327,
    open: 326,
    materials: 38,
  },
  {
    publisher: "YBM",
    author: "류희찬",
    grade: "중1",
    count: 179,
    open: 177,
    materials: 52,
  },
  {
    publisher: "미래엔",
    author: "황선욱",
    grade: "중1",
    count: 169,
    open: 165,
    materials: 36,
  },
  {
    publisher: "NE능률",
    author: "권오남",
    grade: "중1",
    count: 59,
    open: 57,
    materials: 18,
  },
  {
    publisher: "동아출판",
    author: "강옥기",
    grade: "중2",
    count: 673,
    open: 671,
    materials: 113,
  },
  {
    publisher: "천재교육",
    author: "김화경",
    grade: "중2",
    count: 189,
    open: 176,
    materials: 66,
  },
  {
    publisher: "미래엔",
    author: "황선욱",
    grade: "중2",
    count: 173,
    open: 171,
    materials: 31,
  },
  {
    publisher: "YBM",
    author: "류희찬",
    grade: "중2",
    count: 164,
    open: 163,
    materials: 43,
  },
  {
    publisher: "천재교육",
    author: "김동재",
    grade: "중2",
    count: 151,
    open: 141,
    materials: 44,
  },
  {
    publisher: "NE능률",
    author: "권오남",
    grade: "중2",
    count: 51,
    open: 47,
    materials: 14,
  },
  {
    publisher: "교학사",
    author: "김창동",
    grade: "중2",
    count: 45,
    open: 44,
    materials: 5,
  },
  {
    publisher: "미래엔",
    author: "황선욱",
    grade: "공통수학1",
    count: 188,
    open: 186,
    materials: 20,
  },
  {
    publisher: "천재교육",
    author: "홍진곤",
    grade: "공통수학1",
    count: 151,
    open: 151,
    materials: 38,
  },
  {
    publisher: "비상교육",
    author: "김원경",
    grade: "공통수학1",
    count: 127,
    open: 116,
    materials: 43,
  },
  {
    publisher: "천재교육",
    author: "전인태",
    grade: "공통수학1",
    count: 102,
    open: 99,
    materials: 13,
  },
  {
    publisher: "천재교육",
    author: "전인태",
    grade: "공통수학2",
    count: 195,
    open: 183,
    materials: 38,
  },
  {
    publisher: "천재교육",
    author: "홍진곤",
    grade: "공통수학2",
    count: 85,
    open: 84,
    materials: 31,
  },
  {
    publisher: "비상교육",
    author: "김원경",
    grade: "공통수학2",
    count: 83,
    open: 83,
    materials: 45,
  },
  {
    publisher: "천재교육",
    author: "전인태",
    grade: "대수",
    count: 236,
    open: 230,
    materials: 39,
  },
  {
    publisher: "미래엔",
    author: "황선욱",
    grade: "대수",
    count: 146,
    open: 145,
    materials: 14,
  },
  {
    publisher: "비상교육",
    author: "김원경",
    grade: "대수",
    count: 82,
    open: 82,
    materials: 24,
  },
  {
    publisher: "천재교육",
    author: "홍진곤",
    grade: "미적분1",
    count: 186,
    open: 184,
    materials: 47,
  },
  {
    publisher: "비상교육",
    author: "김원경",
    grade: "미적분1",
    count: 113,
    open: 109,
    materials: 45,
  },
  {
    publisher: "천재교육",
    author: "전인태",
    grade: "확률과 통계",
    count: 206,
    open: 204,
    materials: 43,
  },
  {
    publisher: "비상교육",
    author: "김원경",
    grade: "확률과 통계",
    count: 104,
    open: 98,
    materials: 23,
  },
  {
    publisher: "천재교육",
    author: "전인태",
    grade: "기하",
    count: 8,
    open: 6,
    materials: 1,
  },
];

/** 자료 종류 — 많은 것부터 */
export const WIRE_KINDS: Array<{ kind: string; count: number }> = [
  { kind: "대단원 평가", count: 1380 },
  { kind: "기초 연산", count: 1227 },
  { kind: "소단원 평가", count: 780 },
  { kind: "수준별 문제", count: 731 },
  { kind: "시험 대비", count: 665 },
  { kind: "형성 평가", count: 629 },
  { kind: "중단원 평가", count: 440 },
  { kind: "쌍둥이 문제", count: 205 },
  { kind: "진단 평가", count: 50 },
  { kind: "서술형 평가", count: 15 },
  { kind: "수행 과제", count: 1 },
  { kind: "수업 자료", count: 1 },
];

/** 학기 — 차시의 것이다(`unit.semester`). 고등 선택 과목은 정해져 있지 않다 */
export const WIRE_SEMESTERS: Array<{ label: string; count: number }> = [
  { label: "1학기", count: 3973 },
  { label: "2학기", count: 1070 },
  { label: "학기 없음(고등 선택 과목)", count: 1081 },
];

export const WIRE_TOTAL = 6124;

/** 과목 차례 — 문제은행의 학년 선택 칸과 같은 차례 */
export const WIRE_GRADES = [
  "중1",
  "중2",
  "공통수학1",
  "공통수학2",
  "대수",
  "미적분1",
  "확률과 통계",
  "기하",
] as const;

export const PUBLISHERS = [
  "천재교육",
  "동아출판",
  "미래엔",
  "비상교육",
  "지학사",
  "YBM",
  "NE능률",
  "교학사",
] as const;

export const publisherCount = (publisher: string): number =>
  WIRE_BOOKS.filter((book) => book.publisher === publisher).reduce(
    (sum, book) => sum + book.count,
    0,
  );

/** 카드에 그릴 실제 문항 넷 — 문제은행에 실린 글 그대로(2026-10-08) */
export interface WireProblem {
  code: string;
  grade: string;
  semester: string;
  section: string;
  difficulty: string;
  format: string;
  publisher: string;
  author: string;
  kind: string;
  content: string;
}

export const WIRE_PROBLEMS: WireProblem[] = [
  {
    code: "J20403-A14-001",
    grade: "중2",
    semester: "1학기",
    section: "일차함수의 그래프와 기울기",
    difficulty: "기본",
    format: "단답형",
    publisher: "미래엔",
    author: "황선욱",
    kind: "대단원 평가",
    content:
      "세 점 $(-1,\\,2)$, $(5,\\,-1)$, $(9,\\,a)$가 한 직선 위에 있을 때, $a$의 값을 구하시오.",
  },
  {
    code: "J20301-A19-001",
    grade: "중2",
    semester: "1학기",
    section: "미지수가 2개인 연립일차방정식",
    difficulty: "기본",
    format: "단답형",
    publisher: "YBM",
    author: "류희찬",
    kind: "소단원 평가",
    content:
      "$x$, $y$가 자연수일 때, 일차방정식 $3x+2y=21$을 만족시키는 순서쌍 $(x,\\,y)$의 개수를 구하시오.",
  },
  {
    code: "J10307-A40-001",
    grade: "중1",
    semester: "1학기",
    section: "일차방정식의 활용(해의 응용)",
    difficulty: "응용",
    format: "객관식",
    publisher: "천재교육",
    author: "김화경",
    kind: "시험 대비",
    content:
      "두 일차방정식 $\\frac{x}{3}-0.2(2-x)=\\frac{x+1}{2}$, $x+a=3x-9$의 해가 같을 때, 상수 $a$의 값을 구하시오.\n① $36$\n② $45$\n③ $54$\n④ $63$\n⑤ $72$",
  },
  {
    code: "HC10209-A17-001",
    grade: "공통수학1",
    semester: "1학기",
    section: "이차방정식의 근과 계수의 관계",
    difficulty: "응용",
    format: "객관식",
    publisher: "천재교육",
    author: "홍진곤",
    kind: "시험 대비",
    content:
      "이차방정식 $x^{2}+ax+b=0$의 한 근이 $2-i$일 때, $a+b$의 값은? (단, $a$, $b$는 실수이다.)\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$",
  },
];
