import type { CSSProperties } from "react";
import { PAPER_COLORS } from "@/components/unified/print/tokens";
import {
  readablePaperColor,
  inkOnColor,
} from "@/components/unified/print/readableColor";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
  type PrintTemplate,
  type ProblemReview,
} from "@/components/unified/print/types";

export const FIELDS = [
  ["title", "제목"],
  ["schoolName", "학교/기관명"],
  ["grade", "학년"],
  ["subject", "과목"],
  ["semester", "학기"],
  ["examDate", "시험일"],
  ["examDuration", "시험 시간"],
  ["examiner", "출제자"],
  ["totalScore", "총점"],
  ["academyName", "학원명"],
  ["instructorName", "강사명"],
  ["todayGoal", "오늘의 목표"],
  ["conceptNote", "개념 정리"],
  ["patternName", "유형명"],
  ["patternStrategy", "핵심 전략"],
] as const satisfies readonly (readonly [keyof PrintMeta, string])[];
export type Field = (typeof FIELDS)[number][0];
const COMMON: readonly Field[] = FIELDS.slice(0, 9).map(([key]) => key);
/** Observed pre-C2 source, including ExamDetails; kept as the independent comparison fixture. */
export const CURRENT_FIELDS: Record<PrintTemplate, readonly Field[]> = {
  pyeongga: COMMON,
  jeongtong: COMMON,
  modern: COMMON,
  workbook: [...COMMON, "academyName", "instructorName"],
  jaseup: [...COMMON, "todayGoal", "conceptNote"],
  yuhyung: [...COMMON, "patternName", "patternStrategy"],
};
export const PROPOSED_FIELDS: Record<PrintTemplate, readonly Field[]> = {
  pyeongga: [
    "title",
    "schoolName",
    "grade",
    "subject",
    "semester",
    "examDate",
    "examDuration",
    "totalScore",
  ],
  jeongtong: COMMON,
  modern: [
    "title",
    "schoolName",
    "grade",
    "subject",
    "semester",
    "examDate",
    "totalScore",
  ],
  workbook: [
    "title",
    "academyName",
    "instructorName",
    "grade",
    "subject",
    "examDate",
    "patternName",
    "patternStrategy",
  ],
  jaseup: ["title", "subject", "examDate", "todayGoal", "conceptNote"],
  yuhyung: ["title", "grade", "subject", "patternName", "patternStrategy"],
};
export const PLACEMENT: Record<PrintTemplate, string> = {
  pyeongga: "영역 머리 오른쪽 시험 종류 + 시험 정보 두 줄",
  jeongtong: "표 제목 옆 시험 종류 + 정보표·점수칸",
  modern: "학교 머리 오른쪽 시험 종류 + 제목·정보줄",
  workbook: "단원 띠 오른쪽 시험 종류 + 학원·유형·전략",
  jaseup: "자습 머리 오른쪽 시험 종류 + 목표·개념 상자",
  yuhyung: "제목 옆 시험 종류 + 유형 띠·전략줄",
};
export const OMIT_REASON: Record<PrintTemplate, string> = {
  pyeongga: "과목·시험 정보 중심 양식입니다.",
  jeongtong: "학교 시험 정보만 싣습니다.",
  modern: "학교·평가 정보만 싣습니다.",
  workbook: "학원·유형 연습용 양식입니다.",
  jaseup: "목표·개념 정리 중심 양식입니다.",
  yuhyung: "유형·전략 중심 양식입니다.",
};
export const COLOR_CASES = [
  { name: "남색", value: DEFAULT_PRINT_OPTIONS.color },
  { name: "사이언", value: "#0EA5E9" },
  { name: "주황", value: "#F97316" },
] as const;
export const VARIANTS = [
  {
    id: "C1",
    name: "머리띠 · 구획선",
    detail:
      "머리의 경계와 큰 구획선에 선택색을 씁니다. 번호와 문항은 검정입니다.",
  },
  {
    id: "C2",
    name: "머리 면 · 번호",
    detail: "머리 면과 번호 상자를 선택색으로 채웁니다. 본문 선은 회색입니다.",
  },
  {
    id: "C3",
    name: "모든 선 · 옅은 면",
    detail: "표·문항·풀이칸 선에 색을 쓰고, 정보 면은 옅게 채웁니다.",
  },
  {
    id: "C4",
    name: "진한 바탕 · 옅은 면",
    detail: "읽기 쉬운 진한 동계색 머리와 옅은 정보 면을 조합합니다.",
  },
  {
    id: "C5",
    name: "이전 적용 비교",
    detail:
      "C2 적용 전 제품 컴포넌트와 정보 구성을 그대로 표시합니다. 양식에 따라 번호·선·작은 면에도 색이 적용됩니다.",
  },
] as const;
export type VariantId = (typeof VARIANTS)[number]["id"];

/** Authored examples, fixed across all 6 × 5 × 3 comparisons. */
export const INITIAL_META: PrintMeta = {
  ...DEFAULT_PRINT_META,
  title: "일차부등식 확인 학습",
  schoolName: "한빛중학교",
  grade: "2학년",
  subject: "수학",
  semester: "1학기",
  examDate: "2026-10-19",
  examDuration: "40분",
  examiner: "김수학",
  totalScore: 100,
  academyName: "한빛수학학원",
  instructorName: "이선생",
  todayGoal: "부등식의 성질을 적용하여 해를 구한다.",
  conceptNote:
    "부등식의 양변에 **음수**를 곱하거나 나누면 부등호의 방향을 바꾼다.",
  patternName: "일차부등식의 풀이",
  patternStrategy: "이항하여 정리하고, 음수로 나눌 때 부등호의 방향을 바꾼다.",
};
const questions = [
  ["일차부등식 $3x-7 \\le 2x+1$을 푸시오.", "$x \\le 8$"],
  ["일차부등식 $-2x+5 > 11$을 푸시오.", "$x < -3$"],
  ["일차부등식 $2(x-1) \\ge x+4$를 푸시오.", "$x \\ge 6$"],
  [
    "일차부등식 $\\dfrac{x-1}{2} > 3$을 만족시키는 가장 작은 정수를 구하시오.",
    "$8$",
  ],
] as const;
export const PROBLEMS: ProblemReview[] = questions.map(
  ([content, answer], index) => ({
    id: `color-demo-${index + 1}`,
    variant: {
      id: `color-demo-${index + 1}`,
      content,
      answer,
      solution: "",
      grade: "중2",
      chapter: "부등식",
      section: "일차부등식의 풀이",
      topic: "일차부등식의 풀이",
      difficulty: "기본",
      problemCode: "",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
    },
  }),
);
export function optionsFor(
  template: PrintTemplate,
  color: string,
): PrintOptions {
  return {
    ...DEFAULT_PRINT_OPTIONS,
    template,
    color,
    columns: 1,
    showChapter: false,
    showDifficulty: false,
  };
}
export function fieldLabels(fields: readonly Field[]) {
  return fields
    .map((key) => FIELDS.find(([field]) => key === field)![1])
    .join(" · ");
}
export function displayValue(meta: PrintMeta, key: Field) {
  return key === "totalScore"
    ? `${meta.totalScore ?? 100}점`
    : String(meta[key] ?? "");
}
function tint(color: string, white = 0.93) {
  return (
    "#" +
    [1, 3, 5]
      .map((at) =>
        Math.round(
          parseInt(color.slice(at, at + 2), 16) * (1 - white) + 255 * white,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
/** Named color pairs let QA verify actual backgrounds, including gray conversions. */
export function paperPalette(variant: VariantId, color: string) {
  const dark = readablePaperColor(color);
  const soft = tint(color);
  const fill =
    variant === "C2" ? color : variant === "C4" ? dark : PAPER_COLORS.paper;
  return {
    accent: color,
    rule: variant === "C2" ? PAPER_COLORS.ink15 : color,
    line: variant === "C3" || variant === "C4" ? dark : PAPER_COLORS.ink15,
    soft: variant === "C3" || variant === "C4" ? soft : PAPER_COLORS.paper,
    fill,
    onFill: inkOnColor(fill),
    info: readablePaperColor(color, soft),
    numberFill:
      variant === "C2" ? color : variant === "C4" ? dark : PAPER_COLORS.paper,
    numberInk:
      variant === "C2"
        ? inkOnColor(color)
        : variant === "C4"
          ? inkOnColor(dark)
          : variant === "C3"
            ? dark
            : PAPER_COLORS.ink,
  };
}
export function paletteStyle(variant: VariantId, color: string): CSSProperties {
  const palette = paperPalette(variant, color);
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [`--demo-${key}`, value]),
  ) as CSSProperties;
}
