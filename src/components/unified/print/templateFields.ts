import type { PrintMeta, PrintTemplate } from "./types";

/** Approved C2/P1 composition. Rendering never clears fields omitted by a form. */
export const PRINT_META_FIELDS = [
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
export type PrintMetaField = (typeof PRINT_META_FIELDS)[number][0];

export const PRINTED_META_FIELDS: Record<
  PrintTemplate,
  readonly PrintMetaField[]
> = {
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
  jeongtong: PRINT_META_FIELDS.slice(0, 9).map(([key]) => key),
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

export const PRINT_OMIT_REASON: Record<PrintTemplate, string> = {
  pyeongga: "과목·시험 정보 중심 양식입니다.",
  jeongtong: "학교 시험 정보만 싣습니다.",
  modern: "학교·평가 정보만 싣습니다.",
  workbook: "학원·유형 연습용 양식입니다.",
  jaseup: "목표·개념 정리 중심 양식입니다.",
  yuhyung: "유형·전략 중심 양식입니다.",
};
