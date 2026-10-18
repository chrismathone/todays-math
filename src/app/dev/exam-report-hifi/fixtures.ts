/** 전부 지어낸 예시. 실제 학생·은행 문항·DB를 참조하지 않는다. */
import type {
  ClassExamReport,
  StudentExamReport,
} from "@/contracts/examReport.contract";

export const QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  no: i + 1,
  unit: i < 10 ? "일차방정식의 풀이" : "일차방정식의 활용",
  type: i % 2 ? "등식의 성질" : "해 구하기",
  content: `방정식 x + ${i + 3} = ${i + 10}의 해를 구하시오.`,
  answer: "x = 7",
  solution: `양변에서 ${i + 3}을 빼면 x = ${i + 10} − ${i + 3} = 7입니다.`,
  points: 5,
}));

export const SCENARIOS = {
  normal: "기본",
  many: "많은 오답",
  zero: "0점",
  perfect: "만점",
  absent: "결시",
  ungraded: "미채점",
  long: "긴 이름·문장",
} as const;
export type Scenario = keyof typeof SCENARIOS;
export type Pupil = { name: string; marks: boolean[] | "absent" | "ungraded" };
export const isMarks = (marks: Pupil["marks"]): marks is boolean[] =>
  Array.isArray(marks);
export const score = (marks: boolean[]) =>
  marks.reduce((sum, right, i) => sum + (right ? QUESTIONS[i].points : 0), 0);

export function fixture(scenario: Scenario) {
  const normal = QUESTIONS.map((q) => ![8, 12, 17, 20].includes(q.no));
  const marks =
    scenario === "absent" || scenario === "ungraded"
      ? scenario
      : scenario === "zero"
        ? normal.map(() => false)
        : scenario === "perfect"
          ? normal.map(() => true)
          : scenario === "many"
            ? normal.map((_, i) => i % 4 === 0)
            : normal;
  const pupils: Pupil[] = [
    { name: scenario === "long" ? "남궁하늘봄아리아" : "서하린", marks },
    ...["윤해온", "강이솔", "도라윤", "문가람", "백여울"].map((name, k) => ({
      name,
      marks: QUESTIONS.map((_, i) => (i + k * 3) % (k + 3) !== 0),
    })),
    { name: "차시온", marks: "absent" },
    { name: "한새봄", marks: "ungraded" },
  ];
  const me = pupils[0];
  const taken = pupils.filter((p): p is Pupil & { marks: boolean[] } =>
    isMarks(p.marks),
  );
  const wrong = isMarks(me.marks)
    ? QUESTIONS.filter((_, i) => !me.marks[i])
    : [];
  const note =
    "등식의 양변에 같은 수를 더하거나 빼는 과정을 한 줄씩 적어 보세요. 문장으로 주어진 조건은 먼저 식으로 옮기고, 구한 값을 원래 조건에 넣어 확인합니다.";
  return {
    me,
    pupils,
    taken,
    wrong,
    average: taken.length
      ? (
          taken.reduce((sum, p) => sum + score(p.marks), 0) / taken.length
        ).toFixed(1)
      : null,
    note: scenario === "long" ? `${note}\n${note}\n${note}` : note,
  };
}

/** H1도 H2~H4와 같은 지어낸 자료를 읽기 계약에 맞춰 쓴다. 로더가 아니다. */
export function reportFixture(scenario: Scenario): {
  student: StudentExamReport;
  classroom: ClassExamReport;
} {
  const data = fixture(scenario);
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const publication = {
    id: id(1),
    title: "10월 월말평가\n일차방정식",
    testDate: "2026-10-24",
  };
  const students = data.pupils.map((pupil, i) => {
    const marks = isMarks(pupil.marks) ? pupil.marks : null;
    return {
      student: { id: id(100 + i), name: pupil.name },
      resultId: pupil.marks === "ungraded" ? null : id(200 + i),
      takenAt: pupil.marks === "ungraded" ? null : "2026-10-24T06:00:00.000Z",
      status: marks
        ? ("graded" as const)
        : pupil.marks === "absent"
          ? ("absent" as const)
          : ("ungraded" as const),
      score: {
        value: marks ? score(marks) : null,
        maximum: 100,
        unit: "points" as const,
        storedValue: marks ? score(marks) : null,
      },
      correctCount: marks ? marks.filter(Boolean).length : null,
      questionCount: QUESTIONS.length,
      marks: marks ?? QUESTIONS.map(() => null),
    };
  });
  const { marks, ...me } = students[0];
  const questions = QUESTIONS.map((q, i) => ({
    problemId: id(300 + i),
    no: q.no,
    unitName: q.unit,
    typeLabel: q.type,
    content: q.content,
    answer: q.answer,
    solution: q.solution,
    questionType: null,
    figureUrls: [],
    figureSvg: null,
    isCorrect: marks[i],
  }));
  return {
    student: {
      publication,
      testId: id(2),
      classId: id(3),
      className: "중1 가람반",
      ...me,
      questions,
      wrongQuestions: questions.filter((q) => q.isCorrect === false),
      teacherNote: data.note,
      retries:
        me.status === "graded" && data.wrong.length > 0
          ? [
              {
                testId: id(4),
                testDate: "2026-10-26",
                resultId: id(5),
                takenAt: "2026-10-26T06:00:00.000Z",
                status: "graded",
                score: {
                  value: 3,
                  maximum: 4,
                  unit: "questions",
                  storedValue: 75,
                },
                correctCount: 3,
                questionCount: 4,
              },
            ]
          : [],
    },
    classroom: {
      publication,
      testId: id(2),
      classId: id(3),
      className: "중1 가람반",
      students,
      questions: questions.map((q, i) => ({
        problemId: q.problemId,
        no: q.no,
        correctCount: data.taken.filter((p) => p.marks[i]).length,
        answeredCount: data.taken.length,
      })),
      rollup: {
        gradedCount: data.taken.length,
        absentCount: students.filter((p) => p.status === "absent").length,
        averageScore: data.average === null ? null : Number(data.average),
      },
    },
  };
}
