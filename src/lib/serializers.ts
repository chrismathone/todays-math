/**
 * Prisma 조회 결과(Date 객체 · Prisma.JsonValue) → 계약 엔티티(ISO 문자열 · 좁혀진 타입)
 * 직렬화 헬퍼. 반/학생/진도/문제/시험지 API가 공용으로 사용한다.
 */
import type {
  AnalysisReport as AnalysisReportRow,
  Class as ClassRow,
  Problem as ProblemRow,
  ProblemAnswer as ProblemAnswerRow,
  ProblemReport as ProblemReportRow,
  Progress as ProgressRow,
  Student as StudentRow,
  Test as TestRow,
  TestProblem as TestProblemRow,
  TestResult as TestResultRow,
} from "@prisma/client";

import type { Difficulty } from "@/contracts/common.contract";
import type {
  ClassEntity,
  ProgressEntity,
  StudentEntity,
} from "@/contracts/class.contract";
import type { ProblemEntity, ProblemType } from "@/contracts/problem.contract";
import type { ProblemReportEntity } from "@/contracts/problemReport.contract";
import type { ReviewLogEntity } from "@/contracts/review.contract";
import type {
  TestEntity,
  TestProblemFigureFields,
  TestProblemItem,
} from "@/contracts/test.contract";
import type {
  AnalysisReportEntity,
  ProblemAnswerEntity,
  TestResultEntity,
} from "@/contracts/testresult.contract";
import { normalizeStoredDifficultyRatio } from "@/lib/class/normalizeDifficultyRatio";

export function serializeClass(row: ClassRow): ClassEntity {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    grade: row.grade,
    defaultProblemCount: row.defaultProblemCount,
    difficultyRatio: normalizeStoredDifficultyRatio(row.difficultyRatio),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeStudent(row: StudentRow): StudentEntity {
  return {
    id: row.id,
    classId: row.classId,
    name: row.name,
    useIndividualProgress: row.useIndividualProgress,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeProgress(row: ProgressRow): ProgressEntity {
  return {
    id: row.id,
    classId: row.classId,
    studentId: row.studentId,
    unitId: row.unitId,
    // Progress.recordedAt은 @db.Date(날짜만) — 계약의 isoDateSchema(YYYY-MM-DD)에 맞춰 자른다.
    recordedAt: row.recordedAt.toISOString().slice(0, 10),
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeProblem(
  row: Omit<
    ProblemRow,
    "choiceFigureIndex" | "figureDims" | "figureSourceMm"
  > & {
    // 은행 행은 `number[]`, 교재 스냅샷 행은 원소에 `null` 이 섞인다. 없으면 «모른다»(빈 배열).
    choiceFigureIndex?: readonly (number | null)[] | null;
    sourceReference?:
      | import("@/contracts/problemSourceReference.contract").ProblemSourceReference
      | null;
  },
): ProblemEntity {
  // 은행 계약은 `number[]` 다. `null` 이 섞인 배열(교재 스냅샷)은 여기서 «모른다»(빈 배열)로 내고,
  // 시험지 문항 쪽(`serializeTestProblemItem`)이 원래 값을 덧씌운다.
  const links = row.choiceFigureIndex ?? [];
  const knownLinks = links.filter((value): value is number => value !== null);
  return {
    id: row.id,
    // 컬럼을 **그대로** 내보낸다. 단원에서 다시 만들지 않는다 — 코드는 부여 당시의
    // 스냅샷이고, 다시 계산하면 원장님이 적어 둔 코드가 다른 문항을 가리킨다(D-53).
    problemCode: row.problemCode,
    userId: row.userId,
    unitId: row.unitId,
    source: row.source,
    originProblemId: row.originProblemId,
    ...(row.sourceReference !== undefined
      ? { sourceReference: row.sourceReference }
      : {}),
    // 엔진이 적은 «자기 유형 정체». 화면의 출처 라벨이 **이 값으로** 엔진을 가른다
    // (`src/lib/problem/provenance.ts`) — 빠뜨리면 엔진 문항이 통째로 미분류가 된다.
    familyKey: row.familyKey,
    difficulty: row.difficulty,
    // Problem.problemType은 DB에서 자유 문자열(VarChar)이지만 앱 계약은 4종으로 좁힌다
    // (07-coding-convention.md §2.3, problem.contract.ts 상단 주석 참조).
    problemType: row.problemType as ProblemType,
    // 🔴 **빠져 있었다** (2026-08-26). 화면의 형식 라벨 `[단]`·`[서]` 은 이 값을 **가장 먼저**
    //    보는데(`classifyFormat`), 응답에 안 실려 화면에서는 늘 `undefined` 였다. 그래서
    //    `question_type='단답형'` 인 기출 733건이 화면에서 `[?형식]` 으로 나가고, 조사
    //    스크립트(DB 를 직접 읽는다)만 `[단]` 이라 하고 있었다 — **같은 문항을 두 자리가
    //    다르게 부르고 있었다**(원장님 최우선 규칙 위반). 서버 필터도 이 값을 보므로,
    //    안 실어 보내면 「필터에는 나오는데 라벨은 다른」 행이 그대로 생긴다.
    //    계약(`problemSchema`)은 처음부터 이 필드를 갖고 있었다 — 빠진 것은 배선뿐이다.
    questionType: row.questionType,
    content: row.content,
    answer: row.answer,
    solution: row.solution,
    reviewStatus: row.reviewStatus,
    directUseAllowed: row.directUseAllowed,
    pool: row.pool,
    // 그림이 없는 문항은 빈 배열이다 — 화면이 널 검사를 하지 않아도 되게 한다.
    figureUrls: row.figureUrls ?? [],
    // 짝이 없으면 칸 자체를 안 싣는다 — 짝 없는 문항의 응답이 예전과 한 글자도 안 달라진다(계약의 기본값이 []).
    ...(knownLinks.length > 0 && knownLinks.length === links.length
      ? { choiceFigureIndex: knownLinks }
      : {}),
    figureSvg: row.figureSvg ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeTest(row: TestRow): TestEntity {
  return {
    id: row.id,
    userId: row.userId,
    classId: row.classId,
    studentId: row.studentId,
    testType: row.testType,
    rangeStartUnitId: row.rangeStartUnitId,
    rangeEndUnitId: row.rangeEndUnitId,
    status: row.status,
    modified: row.modified,
    testDate: row.testDate.toISOString().slice(0, 10),
    printedAt: row.printedAt ? row.printedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeTestProblemItem(
  row: TestProblemRow & {
    problem: Omit<ProblemRow, keyof TestProblemFigureFields> &
      TestProblemFigureFields;
  },
): TestProblemItem {
  return {
    id: row.id,
    problemId: row.problemId,
    orderIndex: row.orderIndex,
    replaced: row.replaced,
    ...(row.snapshotId ? { snapshotId: row.snapshotId } : {}),
    problem: {
      ...serializeProblem(row.problem),
      ...(row.snapshotId
        ? {
            figureDims: row.problem.figureDims,
            figureSourceMm: row.problem.figureSourceMm,
            choiceFigureIndex: row.problem.choiceFigureIndex,
          }
        : {}),
    },
  };
}

export function serializeTestResult(row: TestResultRow): TestResultEntity {
  return {
    id: row.id,
    testId: row.testId,
    studentId: row.studentId,
    takenAt: row.takenAt.toISOString(),
    // 🔴 `?? 0` 을 쓰지 않는다 — 결시의 null 을 0 으로 바꾸면 그 0이 평균·추이에 실린다(23 §4 ③).
    score: row.score,
    predictedScore: row.predictedScore,
    gradingMode: row.gradingMode,
    absent: row.absent,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeProblemAnswer(
  row: ProblemAnswerRow,
): ProblemAnswerEntity {
  return {
    id: row.id,
    problemId: row.problemId,
    selectedChoice: row.selectedChoice,
    essayScore: row.essayScore,
    isCorrect: row.isCorrect,
    sequence: row.sequence,
  };
}

export function serializeAnalysisReport(
  row: AnalysisReportRow,
): AnalysisReportEntity {
  return {
    id: row.id,
    testResultId: row.testResultId,
    totalScore: row.totalScore,
    predictedScore: row.predictedScore,
    // AnalysisReport.unitScores/difficultyDistribution은 jsonb — 계약 형태로 저장됨을 전제한다
    // (Test/Class.difficultyRatio와 같은 패턴, serializeClass 참조).
    unitScores: row.unitScores as Record<string, number>,
    difficultyDistribution: row.difficultyDistribution as Record<
      Difficulty,
      { correct: number; total: number }
    >,
    recommendedUnits: row.recommendedUnits,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 문항 신고 행 → 계약 엔티티.
 *
 * 신고자가 탈퇴하면 `reporterId` 가 NULL 이 된다(ON DELETE SET NULL) — 기록은 남는다.
 * 지우면 「몇 건이 있었나」가 거짓이 되기 때문이다.
 */
export function serializeProblemReport(
  row: ProblemReportRow,
): ProblemReportEntity {
  return {
    id: row.id,
    problemId: row.problemId,
    reporterId: row.reporterId,
    reason: row.reason,
    note: row.note,
    status: row.status,
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 검수 기록 한 줄. */
export function serializeReviewLog(row: {
  id: string;
  problemId: string;
  reviewerId: string | null;
  verdict: "pass" | "unsure" | "defect";
  note: string | null;
  createdAt: Date;
}): ReviewLogEntity {
  return {
    id: row.id,
    problemId: row.problemId,
    reviewerId: row.reviewerId,
    verdict: row.verdict,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
