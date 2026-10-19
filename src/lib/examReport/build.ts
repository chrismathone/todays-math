import "server-only";
import type {
  StudentExamReport,
  ClassExamReport,
} from "@/contracts/examReport.contract";
import { testMaxScore } from "@/lib/achievement/maxScore";
import { rollupScores } from "@/lib/testResults/scoreRollup";
import {
  contentOf,
  type TestContentLink,
} from "@/lib/tests/testProblemContent";

/** 읽어 둔 행만 받는 순수 함수. DB·시계·API를 쓰지 않는다. */
export interface ExamReportProblemRow extends TestContentLink {
  testId: string;
  orderIndex: number;
  score: number | null;
  problem: {
    id: string;
    unitId: string;
    difficulty: string;
    score: number | null;
    problemType: string | null;
    questionType: string | null;
    content: string;
    answer: string;
    solution: string | null;
    figureUrls: string[];
    figureSvg: string | null;
    figureDims?: (number | null)[];
    figureSourceMm?: (number | null)[];
    choiceFigureIndex?: (number | null)[];
    unit?: { section: string } | null;
  };
}
export interface ExamReportResult {
  id: string;
  testId: string;
  studentId: string;
  takenAt: string;
  absent: boolean;
  score: number | null;
  answers: { problemId: string; isCorrect: boolean }[];
}
interface ExamReportBase {
  publication: StudentExamReport["publication"];
  test: {
    id: string;
    publicationId: string | null;
    classId: string;
    className: string;
  };
  /** 로더는 hydrateTestSnapshots → contentOf의 기존 경로를 먼저 거친다. */
  problems: ExamReportProblemRow[];
  results: ExamReportResult[];
}
export interface ExamReportInput extends ExamReportBase {
  student: StudentExamReport["student"];
  teacherNote?: string | null;
  retries?: {
    sourceResultId: string;
    studentId: string;
    testId: string;
    testDate: string;
    problems: ExamReportProblemRow[];
    results: ExamReportResult[];
  }[];
}

/** 같은 시각의 재채점도 기존 결과 피드와 같은 id 순으로 고른다. 입력 순서에는 의존하지 않는다. */
export function latestExamResult(
  results: readonly ExamReportResult[],
  testId: string,
  studentId: string,
) {
  return results
    .filter((r) => r.testId === testId && r.studentId === studentId)
    .reduce<ExamReportResult | null>((latest, row) => {
      const time = Date.parse(row.takenAt);
      if (!Number.isFinite(time))
        throw new Error("채점 시각이 올바르지 않습니다.");
      return !latest ||
        time > Date.parse(latest.takenAt) ||
        (time === Date.parse(latest.takenAt) && row.id > latest.id)
        ? row
        : latest;
    }, null);
}

function orderedProblems(
  rows: readonly ExamReportProblemRow[],
  testId: string,
  publication = false,
) {
  const sorted = [...rows].sort((a, b) => a.orderIndex - b.orderIndex);
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const row of sorted) {
    if (
      row.testId !== testId ||
      ids.has(row.problemId) ||
      orders.has(row.orderIndex)
    )
      throw new Error("시험 문항의 소속·차례가 올바르지 않습니다.");
    if (
      publication &&
      (!row.publicationProblem ||
        row.publicationProblem.problemId !== row.problemId ||
        row.publicationProblem.no !== row.orderIndex)
    )
      throw new Error("낸 그대로의 문항을 불러오지 못했습니다.");
    ids.add(row.problemId);
    orders.add(row.orderIndex);
  }
  return sorted;
}

function outcome(
  rows: readonly ExamReportProblemRow[],
  result: ExamReportResult | null,
) {
  const contents = rows.map((row) => contentOf(row));
  const points = rows.map((row, i) => ({
    adjustedScore: row.score,
    score: contents[i].score,
  }));
  const weighted = points.some(
    (p) => p.adjustedScore !== null || p.score !== null,
  );
  const maximum =
    rows.length === 0 ? null : weighted ? testMaxScore(points) : rows.length;
  const answers = new Map(
    result?.answers.map((a) => [a.problemId, a.isCorrect]) ?? [],
  );
  const complete =
    result !== null &&
    result.score !== null &&
    rows.length > 0 &&
    result.answers.length === rows.length &&
    answers.size === rows.length &&
    rows.every((row) => answers.has(row.problemId));
  const status: StudentExamReport["status"] = !result
    ? "ungraded"
    : result.absent
      ? "absent"
      : complete
        ? "graded"
        : "incomplete";
  const marks = rows.map((row) =>
    !result || result.absent ? null : (answers.get(row.problemId) ?? null),
  );
  const correctCount =
    status === "graded" ? marks.filter((mark) => mark === true).length : null;
  return {
    resultId: result?.id ?? null,
    takenAt: result?.takenAt ?? null,
    status,
    score: {
      value:
        status !== "graded" ? null : weighted ? result!.score : correctCount,
      maximum,
      unit: weighted ? ("points" as const) : ("questions" as const),
      storedValue: !result || result.absent ? null : result.score,
    },
    correctCount,
    questionCount: rows.length,
    marks,
    contents,
  };
}

function checkPublication(input: ExamReportBase) {
  if (input.test.publicationId !== input.publication.id)
    throw new Error("성적표의 발행본과 시험이 다릅니다.");
}

export function buildStudentExamReport(
  input: ExamReportInput,
): StudentExamReport {
  checkPublication(input);
  const rows = orderedProblems(input.problems, input.test.id, true);
  const latest = latestExamResult(
    input.results,
    input.test.id,
    input.student.id,
  );
  const { marks, contents, ...summary } = outcome(rows, latest);
  const questions = rows.map((row, i) => ({
    problemId: row.problemId,
    no: row.orderIndex,
    unitName: row.publicationProblem!.section,
    typeLabel: contents[i].problemType,
    content: contents[i].content,
    answer: contents[i].answer,
    solution: contents[i].solution,
    questionType: contents[i].questionType,
    figureUrls: contents[i].figureUrls,
    figureSvg: contents[i].figureSvg,
    figureDims: contents[i].figureDims,
    figureSourceMm: contents[i].figureSourceMm,
    choiceFigureIndex: contents[i].choiceFigureIndex,
    isCorrect: marks[i],
  }));
  const retries = (input.retries ?? [])
    .filter(
      (retry) =>
        latest &&
        retry.sourceResultId === latest.id &&
        retry.studentId === input.student.id,
    )
    .map((retry) => {
      const retryRows = orderedProblems(retry.problems, retry.testId);
      const result = outcome(
        retryRows,
        latestExamResult(retry.results, retry.testId, input.student.id),
      );
      return {
        testId: retry.testId,
        testDate: retry.testDate,
        resultId: result.resultId,
        takenAt: result.takenAt,
        status: result.status,
        score: result.score,
        correctCount: result.correctCount,
        questionCount: result.questionCount,
      };
    });
  return {
    publication: { ...input.publication },
    testId: input.test.id,
    classId: input.test.classId,
    className: input.test.className,
    student: { ...input.student },
    ...summary,
    questions,
    wrongQuestions: questions.filter((q) => q.isCorrect === false),
    teacherNote: input.teacherNote ?? "",
    retries,
  };
}

export function buildClassExamReport(
  input: ExamReportBase & { students: StudentExamReport["student"][] },
): ClassExamReport {
  checkPublication(input);
  orderedProblems(input.problems, input.test.id, true);
  const reports = input.students.map((student) =>
    buildStudentExamReport({ ...input, student }),
  );
  const students = reports.map(
    ({
      student,
      resultId,
      takenAt,
      status,
      score,
      correctCount,
      questionCount,
      questions,
    }) => ({
      student,
      resultId,
      takenAt,
      status,
      score,
      correctCount,
      questionCount,
      marks: questions.map((q) => q.isCorrect),
    }),
  );
  return {
    publication: { ...input.publication },
    testId: input.test.id,
    classId: input.test.classId,
    className: input.test.className,
    students,
    questions: (
      reports[0]?.questions ??
      orderedProblems(input.problems, input.test.id, true).map((row) => ({
        problemId: row.problemId,
        no: row.orderIndex,
      }))
    ).map((question, i) => ({
      problemId: question.problemId,
      no: question.no,
      correctCount: students.filter(
        (s) => s.status === "graded" && s.marks[i] === true,
      ).length,
      answeredCount: students.filter((s) => s.status === "graded").length,
    })),
    rollup: rollupScores(
      students.map((s) => ({
        score: s.score.value,
        absent: s.status === "absent",
      })),
    ),
  };
}
