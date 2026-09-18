/**
 * **Hi-fi 5안 — 기준안 하나 + 한 축씩 바꾼 넷** (Hi-fi 브리프 §3 · codex 제안).
 *
 * 같은 데이터 · 같은 문장 · 같은 정보량의 기준안(H1)에 **축을 하나씩만** 바꿔야 안끼리의 차이를
 * 판단할 수 있다. 05 §0-3 의 Hi-fi 는 «시각 디테일» 단계라 **종이 얼굴** 축이 하나 더 있다.
 *
 * | 안 | 영역 안 배치 | 시험 근거 순서 | 난이도 표현 | 종이 얼굴 |
 * |----|-------------|---------------|------------|----------|
 * | H1 | 세로        | 회차 먼저      | 숫자판      | 시험지   |
 * | H2 | **두 열**   | ↔             | ↔          | ↔        |
 * | H3 | ↔          | **난이도 먼저** | ↔          | ↔        |
 * | H4 | ↔          | ↔             | **같은 눈금 막대** | ↔  |
 * | H5 | ↔          | ↔             | ↔          | **화면(계기판)** |
 *
 * 🔴 원장 화면은 **한 벌**이다 — 안마다 갈리지 않는다(작업실 확정 문법 05 §2·§5).
 */
export type SheetLayout = "stack" | "twoCol";
export type TestOrder = "roundsFirst" | "bandsFirst";
export type BandStyle = "board" | "bars";
export type SheetFace = "paper" | "screen";

export interface HifiVariant {
  key: "H1" | "H2" | "H3" | "H4" | "H5";
  label: string;
  /** 기준안에서 **무엇 하나**를 바꿨나 — 화면 위에 한 줄로 적는다. */
  axis: string;
  layout: SheetLayout;
  testOrder: TestOrder;
  bandStyle: BandStyle;
  face: SheetFace;
}

const BASE = {
  layout: "stack",
  testOrder: "roundsFirst",
  bandStyle: "board",
  face: "paper",
} as const;

export const HIFI_VARIANTS: readonly HifiVariant[] = [
  {
    key: "H1",
    label: "H1 기준",
    axis: "기준안 — 요약 밑에 근거를 세로로 · 회차 점수 먼저 · 난이도는 숫자판 · 시험지 얼굴",
    ...BASE,
  },
  {
    key: "H2",
    label: "H2 두 열",
    axis: "H1 에서 하나만 — 요약 밑의 근거를 두 열로 놓는다",
    ...BASE,
    layout: "twoCol",
  },
  {
    key: "H3",
    label: "H3 난이도 먼저",
    axis: "H1 에서 하나만 — 시험 근거에서 난이도를 먼저, 회차 점수는 그 뒤",
    ...BASE,
    testOrder: "bandsFirst",
  },
  {
    key: "H4",
    label: "H4 같은 눈금 막대",
    axis: "H1 에서 하나만 — 난이도를 같은 길이·같은 눈금의 가로 막대로(맞힌 문제 수를 같이 적는다)",
    ...BASE,
    bandStyle: "bars",
  },
  {
    key: "H5",
    label: "H5 화면 얼굴",
    axis: "H1 에서 하나만 — 종이 얼굴을 화면 얼굴(계기판 — 작업실 토큰 · 고딕)로",
    ...BASE,
    face: "screen",
  },
];
