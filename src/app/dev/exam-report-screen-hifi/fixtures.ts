/** 성적표 화면 비교에만 쓰는 지어낸 학생·문항. 서버·학생 기록을 읽지 않는다. */
import type {
  ClassExamReport,
  StudentExamReport,
} from "@/contracts/examReport.contract";
import { reportFixture } from "../exam-report-hifi/fixtures";

// 실측 전 시안 비교값. 실행 제약과 공용 H1 실측 자는 같은 폴더의 README.md에 기록한다.
export const NOTE_LIMIT = 180;
export const EXAMPLE_NOTE =
  "문장의 조건을 먼저 식으로 옮겨 보세요. 양변에 같은 수를 더하거나 빼는 과정을 적고, 구한 값을 처음 식에 넣어 확인합니다.";
export const LIMIT_NOTE = EXAMPLE_NOTE.repeat(4).slice(0, NOTE_LIMIT);

export const VARIANTS = [
  {
    id: "H1",
    name: "상태 배지 · 문장 아래",
    axis: "기준안 · 목록의 상태 배지와 점수, 미리보기 아래 문장 칸, 위쪽 지면 설정·인쇄 모음.",
  },
  {
    id: "H2",
    name: "점수·상태 열 정렬",
    axis: "목록 표현만 변경 · 점수와 상태를 표의 독립 열에 맞춥니다. 문장·지면·행동 위치는 H1과 같습니다.",
  },
  {
    id: "H3",
    name: "문장 옆에서 쓰기",
    axis: "문장 칸 위치만 변경 · 미리보기 오른쪽에서 문장을 씁니다. 좁은 화면에서는 아래로 이어집니다.",
  },
  {
    id: "H4",
    name: "행동을 작업 가까이",
    axis: "행동 배치만 변경 · 확정은 학생 머리, 지면 설정은 미리보기 옆, 인쇄 모음은 작업 아래에 둡니다.",
  },
] as const;
export type VariantId = (typeof VARIANTS)[number]["id"];

export const SCENARIOS = {
  normal: "반 전체 · 기본",
  none: "문장 없음",
  draft: "문장 씀",
  confirmed: "확정",
  stale: "다시 확정 · 재채점",
  absent: "결시",
  limit: "문장 길이 상한",
  saving: "저장 중",
  "save-error": "저장 실패",
  "confirm-error": "확정 실패",
  many: "학생 48명 · 고르기 창",
  overflow: "오답 20개 · 지면 넘침",
} as const;
export type Scenario = keyof typeof SCENARIOS;
export type ReportStatus = "none" | "draft" | "confirmed" | "stale" | "absent";
export const STATUS_LABEL: Record<ReportStatus, string> = {
  none: "문장 없음",
  draft: "문장 씀",
  confirmed: "확정",
  stale: "다시 확정",
  absent: "결시",
};

export type ScreenStudent = {
  report: StudentExamReport;
  note: string;
  savedNote: string;
  /** null은 확정한 적 없음. 빈 문자열은 문장 없이 확정한 경우다. */
  confirmedNote: string | null;
  staleReason: string | null;
};

export type PaperSettings = {
  mode: "S1" | "M1";
  wrong: boolean;
  retry: boolean;
  note: boolean;
  average: boolean;
};
export const INITIAL_SETTINGS: PaperSettings = {
  mode: "S1",
  wrong: true,
  retry: true,
  note: true,
  average: false,
};

export function statusOf(student: ScreenStudent): ReportStatus {
  if (student.report.status === "absent") return "absent";
  if (student.confirmedNote !== null) {
    return student.staleReason || student.note !== student.confirmedNote
      ? "stale"
      : "confirmed";
  }
  return student.note.trim() ? "draft" : "none";
}

export function screenFixture(scenario: Scenario) {
  const base = reportFixture("normal").student;
  const names = [
    "서하린",
    "윤해온",
    "강이솔",
    "도라윤",
    "문가람",
    "백여울",
    "차시온",
    "한새봄",
  ];
  const wrongCounts = [4, 7, 1, 6, 3, 0, 8, 2];
  const students: ScreenStudent[] = names.map((name, i) => {
    const absent = i === 5;
    const wrongCount = wrongCounts[i];
    const questions = base.questions.map((question, j) => ({
      ...question,
      isCorrect: absent ? null : j < wrongCount ? false : true,
    }));
    const note = [0, 1, 3, 7].includes(i) ? EXAMPLE_NOTE : "";
    const value = absent ? null : 100 - wrongCount * 5;
    return {
      report: {
        ...base,
        student: { id: `screen-pupil-${i}`, name },
        resultId: `screen-result-${i}`,
        status: absent ? "absent" : "graded",
        score: { ...base.score, value, storedValue: value },
        correctCount: absent ? null : 20 - wrongCount,
        questions,
        wrongQuestions: questions.filter(
          (question) => question.isCorrect === false,
        ),
        teacherNote: note,
        retries: absent ? [] : base.retries,
      },
      note,
      savedNote: note,
      confirmedNote: [0, 3, 7].includes(i) ? note : null,
      staleReason: i === 3 ? "확정 후 채점이 바뀌었습니다." : null,
    };
  });
  // 학생 수를 늘리는 예시도 지어낸 이름과 위의 같은 문항만 쓴다.
  if (scenario === "many") {
    const family = ["강", "도", "문", "백", "서", "윤", "차", "한"];
    const given = ["가온", "누리", "다온", "라온", "마루"];
    for (let i = 0; i < 40; i++) {
      const source = students[i % 8];
      students.push({
        ...source,
        report: {
          ...source.report,
          student: {
            id: `screen-extra-${i}`,
            name: `${family[i % 8]}${given[Math.floor(i / 8)]}`,
          },
        },
      });
    }
  }
  let selected = 1;
  if (scenario === "none") selected = 2;
  if (scenario === "confirmed") selected = 0;
  if (scenario === "stale") selected = 3;
  if (scenario === "absent") selected = 5;
  if (scenario === "limit")
    students[1] = { ...students[1], note: LIMIT_NOTE, savedNote: LIMIT_NOTE };
  if (scenario === "saving" || scenario === "save-error")
    students[1].note += " 풀이 끝에 검산을 적습니다.";
  if (scenario === "overflow") {
    const questions = base.questions.map((question) => ({
      ...question,
      isCorrect: false,
    }));
    students[1].report = {
      ...students[1].report,
      questions,
      wrongQuestions: questions,
      correctCount: 0,
      score: { ...base.score, value: 0, storedValue: 0 },
    };
  }
  return { students, selectedId: students[selected].report.student.id };
}

export function classFixture(students: ScreenStudent[]): ClassExamReport {
  const base = reportFixture("normal").classroom;
  const graded = students.filter(
    (student) => student.report.status === "graded",
  );
  return {
    ...base,
    students: students.map(({ report }) => ({
      student: report.student,
      resultId: report.resultId,
      takenAt: report.takenAt,
      status: report.status,
      score: report.score,
      correctCount: report.correctCount,
      questionCount: report.questionCount,
      marks: report.questions.map((question) => question.isCorrect),
    })),
    questions: base.questions.map((question, i) => ({
      ...question,
      correctCount: graded.filter(
        (student) => student.report.questions[i].isCorrect,
      ).length,
      answeredCount: graded.length,
    })),
    rollup: {
      gradedCount: graded.length,
      absentCount: students.length - graded.length,
      averageScore: graded.length
        ? graded.reduce(
            (sum, student) => sum + (student.report.score.value ?? 0),
            0,
          ) / graded.length
        : null,
    },
  };
}
