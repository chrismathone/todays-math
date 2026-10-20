import {
  pagesFor as wirePagesFor,
  type PaperKind,
  type WireProblem,
} from "../descriptive-paper-wire/fixtures";

// Reuse the exact seven authored examples; the Wire comparison remains intact.
export {
  DESCRIPTIVE,
  PAPER_LABELS,
  PROBLEMS,
  ROW_HEIGHT_MM,
  TOTAL_SCORE,
  scoreOf,
} from "../descriptive-paper-wire/fixtures";
export type {
  OptionId,
  PageSpec,
  PaperKind,
  WireProblem,
} from "../descriptive-paper-wire/fixtures";

export type Pattern = "lines" | "grid" | "dotted" | "baseline";
export const PATTERN_LABELS: Record<Pattern, string> = {
  lines: "줄",
  grid: "옅은 모눈",
  dotted: "점선",
  baseline: "빈칸 + 기준선",
};
export interface HifiOption {
  id: "A" | "B" | "C" | "D" | "E";
  name: string;
  description: string;
  weakness: string;
  pattern: Pattern;
  label: boolean;
  detail: string;
}
export const OPTIONS: readonly HifiOption[] = [
  {
    id: "A",
    name: "정돈된 줄",
    description:
      "8mm 줄과 풀이 머리표, 사각 배점 상자로 쓰는 자리를 또렷하게 나눈다.",
    weakness: "식이나 그림을 크게 쓰면 가로줄과 겹친다.",
    pattern: "lines",
    label: true,
    detail: "얇은 구획선 · 기본 채점표",
  },
  {
    id: "B",
    name: "옅은 모눈",
    description:
      "4mm 모눈과 작은 소문항 머리표로 식의 자리와 수직 정렬을 돕는다.",
    weakness: "복사 상태에 따라 옅은 모눈이 사라질 수 있다.",
    pattern: "grid",
    label: false,
    detail: "윤곽 배점 · 넓은 기록 칸",
  },
  {
    id: "C",
    name: "가벼운 점선",
    description:
      "점선과 둥근 배점 상자, 여유 있는 채점표 행으로 경계를 부드럽게 보인다.",
    weakness: "줄 경계가 약해 필기와 나란히 읽기 어려울 수 있다.",
    pattern: "dotted",
    label: true,
    detail: "굵은 구획선 · 높은 채점 행",
  },
  {
    id: "D",
    name: "열린 풀이칸",
    description:
      "빈칸의 마지막 기준선만 남기고, 배점은 대괄호로 간결하게 표시한다.",
    weakness: "줄이 없어 글씨 크기와 간격을 스스로 맞춰야 한다.",
    pattern: "baseline",
    label: false,
    detail: "열린 답란 · 가로선 채점표",
  },
  {
    id: "E",
    name: "번호 구획",
    description:
      "소문항 번호를 왼쪽 작은 칸에 두고, 채점표는 기준과 기록 칸을 강조한다.",
    weakness: "번호 칸만큼 실제로 쓸 수 있는 가로 폭이 줄어든다.",
    pattern: "lines",
    label: true,
    detail: "번호 머리표 · 교차 면 채점표",
  },
];

// Same formula as Wire, with a larger allowance for the multi-part item.
// Q6: 3 criteria × 3 lines × 8mm = 72mm, distributed 2/3/4 lines.
// This is a layout proposal, not an empirical handwriting or engine rule.
export const rowsOf = (problem: WireProblem) =>
  (problem.criteria?.length ?? 0) * (problem.parts ? 3 : 2);
export const SUB_ROWS = [2, 3, 4] as const;
export const pagesFor = (paper: PaperKind) =>
  wirePagesFor(paper === "past" ? "C" : "A", paper);
export const pageCounts = (paper: PaperKind) => {
  const pages = pagesFor(paper);
  const questions = pages.filter((p) => p.kind === "questions").length;
  return { questions, answers: pages.length - questions, total: pages.length };
};
