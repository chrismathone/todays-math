import type { StudentExamReport } from "@/contracts/examReport.contract";

/** 선택 이력을 날짜순으로 복사한다. 결시도 회차이며, 한 회차만 있으면 지면을 만들지 않는다. */
export function recentExamHistory(history: StudentExamReport["history"] = []) {
  return history.length < 2
    ? []
    : [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
}
