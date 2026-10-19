// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  studentExamReportSchema,
  classExamReportSchema,
} from "@/contracts/examReport.contract";
import {
  buildStudentExamReport,
  buildClassExamReport,
  type ExamReportInput,
  type ExamReportProblemRow,
} from "@/lib/examReport/build";

const id = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
function problem(
  n: number,
  points: number | null = null,
): ExamReportProblemRow {
  return {
    testId: id(10),
    problemId: id(n),
    orderIndex: n,
    score: points,
    problem: {
      id: id(n),
      unitId: id(8),
      difficulty: "기본",
      score: null,
      problemType: "계산",
      questionType: "multiple-choice",
      content: "바뀐 은행 글",
      answer: "①",
      solution: "바뀐 은행 풀이",
      figureUrls: [],
      figureSvg: null,
      figureDims: [],
      figureSourceMm: [],
      choiceFigureIndex: [],
      unit: { section: "바뀐 은행 단원" },
    },
    publicationProblem: {
      no: n,
      problemId: id(n),
      content: `낸 글 ${n}`,
      answer: "③",
      solution: "낸 풀이",
      questionType: "short-answer",
      grade: "중1",
      chapter: "방정식",
      section: "낸 단원",
      difficulty: "기본",
      problemCode: `P-${n}`,
      figureUrls: ["/figure.png"],
      figureSvg: null,
      figureDims: [80, 40],
      figureSourceMm: [20],
      choiceFigureIndex: [0],
    },
  };
}
function input(): ExamReportInput {
  return {
    publication: { id: id(20), title: "10월 월말평가", testDate: "2026-10-24" },
    test: {
      id: id(10),
      publicationId: id(20),
      classId: id(30),
      className: "가람반",
    },
    student: { id: id(40), name: "서하린" },
    problems: [problem(2), problem(1)],
    results: [
      {
        id: id(50),
        testId: id(10),
        studentId: id(40),
        takenAt: "2026-10-24T04:00:00.000Z",
        absent: false,
        score: 50,
        answers: [
          { problemId: id(1), isCorrect: true },
          { problemId: id(2), isCorrect: false },
        ],
      },
    ],
  };
}

describe("학생 한 명 · 발행본 한 회 성적표", () => {
  it("배점 없으면 문항 수 기준이며 저장된 100점 환산 점수와 구별한다", () => {
    const report = buildStudentExamReport(input());
    expect(report.score).toEqual({
      value: 1,
      maximum: 2,
      unit: "questions",
      storedValue: 50,
    });
    expect(report.status).toBe("graded");
    expect(report.teacherNote).toBe("");
    expect(report.wrongQuestions).toEqual([
      expect.objectContaining({
        no: 2,
        unitName: "낸 단원",
        typeLabel: "계산",
        content: "낸 글 2",
        answer: "③",
        solution: "낸 풀이",
        figureUrls: ["/figure.png"],
      }),
    ]);
    expect(studentExamReportSchema.parse(report)).toEqual(report);
    expect(report).not.toHaveProperty("unitAccuracy");
  });

  it("배점이 있으면 기존 만점 규칙을 쓰고, 부분 점수는 저장값을 유지한다", () => {
    const data = input();
    data.problems = [problem(1, 30), problem(2, 70)];
    data.results[0].score = 62.5;
    expect(buildStudentExamReport(data).score).toEqual({
      value: 62.5,
      maximum: 100,
      unit: "points",
      storedValue: 62.5,
    });
  });

  it("재채점은 최신 한 건만 읽는다 — 같은 시각이면 id로 정한다", () => {
    const data = input();
    data.results.push({
      ...data.results[0],
      id: id(51),
      score: 100,
      answers: data.results[0].answers.map((a) => ({ ...a, isCorrect: true })),
    });
    expect(buildStudentExamReport(data).wrongQuestions).toEqual([]);
    data.results.reverse();
    expect(buildStudentExamReport(data).resultId).toBe(id(51));
  });

  it("결시 · 미채점 · 일부 응답 누락을 실제 0점과 구별한다", () => {
    const data = input();
    data.results[0].answers = data.results[0].answers.map((a) => ({
      ...a,
      isCorrect: false,
    }));
    expect(buildStudentExamReport(data).score.value).toBe(0);
    data.results[0].absent = true;
    expect(buildStudentExamReport(data)).toMatchObject({
      status: "absent",
      score: { value: null, storedValue: null },
      wrongQuestions: [],
    });
    data.results = [];
    expect(buildStudentExamReport(data)).toMatchObject({
      status: "ungraded",
      score: { value: null },
    });
    data.results = input().results;
    data.results[0].answers.pop();
    expect(buildStudentExamReport(data)).toMatchObject({
      status: "incomplete",
      score: { value: null },
    });
  });

  it("명시적으로 현재 채점과 연결된 재시험만 담는다", () => {
    const data = input();
    const retry = {
      sourceResultId: id(50),
      studentId: id(40),
      testId: id(60),
      testDate: "2026-10-26",
      problems: data.problems.map((p) => ({ ...p, testId: id(60) })),
      results: [{ ...data.results[0], testId: id(60), id: id(61) }],
    };
    data.retries = [
      retry,
      { ...retry, sourceResultId: id(49) },
      { ...retry, studentId: id(41) },
    ];
    data.teacherNote = "조건을 식으로 옮겨 보세요.\n확인까지 적습니다.";
    const report = buildStudentExamReport(data);
    expect(report.retries).toHaveLength(1);
    expect(report.retries[0]).toMatchObject({
      testId: id(60),
      status: "graded",
      score: { value: 1, maximum: 2 },
    });
    expect(report.teacherNote).toBe(data.teacherNote);
  });

  it("다른 발행본 · 누락된 고정본 · 중복/다른 시험의 문항은 은행으로 대신 읽지 않는다", () => {
    const data = input();
    data.test.publicationId = id(21);
    expect(() => buildStudentExamReport(data)).toThrow();
    data.test.publicationId = id(20);
    data.problems[0].publicationProblem = null;
    expect(() => buildStudentExamReport(data)).toThrow();
    data.problems = [problem(1), problem(1)];
    expect(() => buildStudentExamReport(data)).toThrow();
    data.problems = [{ ...problem(1), testId: id(11) }];
    expect(() => buildStudentExamReport(data)).toThrow();
  });
});

describe("C2 반 성적표 집계", () => {
  it("명단 순서 · 학생별 점수 · 문항별 정답 수 — 결시·미채점은 분모에서 제외한다", () => {
    const data = input();
    const report = buildClassExamReport({
      ...data,
      students: [
        data.student,
        { id: id(41), name: "윤해온" },
        { id: id(42), name: "강이솔" },
      ],
      results: [
        ...data.results,
        {
          ...data.results[0],
          id: id(52),
          studentId: id(41),
          absent: true,
          score: null,
          answers: [],
        },
      ],
    });
    expect(report.students.map((s) => s.status)).toEqual([
      "graded",
      "absent",
      "ungraded",
    ]);
    expect(
      report.questions.map((q) => [q.no, q.correctCount, q.answeredCount]),
    ).toEqual([
      [1, 1, 1],
      [2, 0, 1],
    ]);
    expect(report.rollup).toEqual({
      gradedCount: 1,
      absentCount: 1,
      averageScore: 1,
    });
    expect(classExamReportSchema.parse(report)).toEqual(report);
  });
});
