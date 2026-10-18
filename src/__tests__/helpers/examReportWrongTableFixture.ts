import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";

/** 40개도 실제 40개의 번호·ID를 갖는, DB를 읽지 않는 지면 자료. */
export function wrongTableFixture(wrong: number) {
  const { student } = reportFixture("normal");
  const count = Math.max(20, wrong);
  const questions = Array.from({ length: count }, (_, i) => ({
    ...student.questions[i % student.questions.length],
    problemId: `00000000-0000-4000-8000-${String(300 + i).padStart(12, "0")}`,
    no: i + 1,
    isCorrect: i >= wrong,
  }));
  return {
    ...student,
    questions,
    wrongQuestions: questions.filter((question) => !question.isCorrect),
    questionCount: count,
    correctCount: count - wrong,
    score: { ...student.score, value: (100 * (count - wrong)) / count },
    teacherNote: "조건을 식으로 옮긴 뒤 답을 확인해 보세요.",
    retries: [],
  };
}
