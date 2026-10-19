/** DB와 같은 저장 상한. 실제 지면의 남은 자리는 글꼴 적재 후 넘침 검사로 안내한다. */
export const EXAM_REPORT_NOTE_LIMIT = 1000;
export const EXAM_REPORT_WRONG_TABLE_SINGLE_LIMIT = 10;
export const EXAM_REPORT_LAYOUT_VERSION = "h1-v2";
export const EXAM_REPORT_PDF_MAX_BYTES = 4_000_000;
export const EXAM_REPORT_STATUS_LABEL = {
  none: "문장 없음",
  draft: "문장 씀",
  confirmed: "확정",
  stale: "다시 확정",
  absent: "결시",
  ungraded: "미채점",
  incomplete: "채점 중",
} as const;
export const examReportHref = (testId: string) => `/exam-reports/${testId}`;
