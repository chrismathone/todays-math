import { reportFixture } from "../exam-report-hifi/fixtures";
import { scoreTo100 } from "@/lib/examReport/score100";

export const STYLE_SCENARIOS = {
  normal: "보통",
  wrong10: "틀린 10개",
  wrong16: "틀린 16개",
  zero: "0점 · 틀린 20개",
  perfect: "만점",
  noNote: "문장 없음",
  long: "긴 문장",
  absent: "결시",
  ungraded: "미채점",
  unweighted: "배점 없음",
  points85: "85점 만점",
  oneHistory: "이력 한 회",
  gapHistory: "이력 중 결시",
} as const;
export type StyleScenario = keyof typeof STYLE_SCENARIOS;
export const PREVIEW_HEADER = { name: "오늘의수학", line: "월말평가 성적표" };
export const PREVIEW_FOOTER = "오늘의수학 · 문의 000-0000-0000";

/** 기존 지어낸 픽스처를 확장한다. 실제 이력 읽기·학생·문항·연락처가 아니다. */
export function styleFixture(scenario: StyleScenario) {
  const { student: base, classroom } = reportFixture(
    scenario === "zero" ||
      scenario === "perfect" ||
      scenario === "absent" ||
      scenario === "ungraded" ||
      scenario === "long"
      ? scenario
      : "normal",
  );
  const report = structuredClone(base);
  if (scenario === "wrong10" || scenario === "wrong16") {
    const count = scenario === "wrong10" ? 10 : 16;
    report.questions = report.questions.map((q, i) => ({
      ...q,
      isCorrect: i >= count,
    }));
    report.wrongQuestions = report.questions.filter((q) => !q.isCorrect);
    report.correctCount = 20 - count;
    report.score.value = (20 - count) * 5;
    report.score.storedValue = report.score.value;
  }
  if (scenario === "noNote") report.teacherNote = "";
  if (scenario === "long")
    report.teacherNote =
      "등식의 양변에 같은 수를 더하거나 빼는 과정을 한 줄씩 적어 보세요. 문장으로 주어진 조건은 먼저 식으로 옮기고, 구한 값을 원래 조건에 넣어 확인합니다.\n"
        .repeat(5)
        .trim();
  if (scenario === "unweighted")
    report.score = {
      value: 16,
      maximum: 20,
      unit: "questions",
      storedValue: 80,
    };
  if (scenario === "points85")
    report.score = { value: 70, maximum: 85, unit: "points", storedValue: 70 };
  const history = [
    { date: "2026-05-24", title: "5월 월말평가", score100: 55 },
    { date: "2026-06-24", title: "6월 월말평가", score100: 65 },
    {
      date: "2026-07-24",
      title: "7월 월말평가",
      score100: scenario === "gapHistory" ? null : 60,
    },
    { date: "2026-08-24", title: "8월 월말평가", score100: 70 },
    { date: "2026-09-24", title: "9월 월말평가", score100: 75 },
    {
      date: report.publication.testDate,
      title: "10월 월말평가",
      score100:
        report.status === "graded"
          ? scoreTo100(report.score.value, report.score.maximum)
          : null,
    },
  ];
  report.history =
    scenario === "oneHistory"
      ? history.slice(-1)
      : report.status === "ungraded"
        ? history.slice(0, -1)
        : history;
  // 반 평균도 같은 시험의 원점수 단위로 넘긴다.
  const average = {
    averageScore:
      scenario === "unweighted"
        ? 13.4
        : scenario === "points85"
          ? 57
          : classroom.rollup.averageScore,
    gradedCount: classroom.rollup.gradedCount,
  };
  return { report, average };
}
