/**
 * 채점 입력의 **서버 쪽 몸통** — 채점표 읽기(`GET`)와 채점 저장(`POST`).
 * 대응 라우트: `src/app/api/tests/[id]/grade/route.ts` · 계약: `src/contracts/testresult.contract.ts`
 *
 * 브리프: `docs/planning/tracks/briefs/grading-input.md` §1.2 · 결정 근거 19 §5′ · 23 §4
 *
 * ## 🔴 이 파일이 지키는 넷
 *
 * ⑴ **대상 학생 전원**이 한 요청에 실려야 한다. 빠진 이름이 있으면 거절하고 **이름을 나열**한다
 *    — 「1명 남음」이라고만 하면 원장님이 명단을 다시 훑어야 한다(19 §5′).
 * ⑵ **미채점은 행이 없는 것**이다. 그래서 여기서 없는 학생의 자리를 0점으로 **채우지 않는다.**
 * ⑶ **결시**는 전 문항 오답과 다른 뜻이다 — `score`·`predictedScore` 가 NULL 이고
 *    `AnalysisReport` 도 `ProblemAnswer` 도 만들지 않는다.
 * ⑷ 소유 범위는 `ownerScope.ts` 하나에만 묻는다(D-130) — 여기서 `isAdmin` 을 읽지 않는다.
 *    `requireOwnedTest` · `requireOwnedStudentInClass` 가 그 한 곳을 거친다.
 *
 * ## 초안(`draft`)은 채점하지 않는다
 *
 * 아직 나가지 않은 시험지다(브리프 §1.3 진입점). 화면만 단추를 감추면 **경로는 열려 있고**,
 * 그러면 초안에 채점이 붙어 «확정 전에 이미 본 시험»이라는 있을 수 없는 상태가 남는다.
 * 그래서 서버도 같은 규칙을 든다 — 화면과 서버가 어긋나면 한쪽이 조용히 거짓말을 한다.
 */
import type {
  GradeScoreLine,
  GradeSubmitRequest,
} from "@/contracts/testresult.contract";
import {
  gradeSheetResponseSchema,
  gradeSubmitResponseSchema,
} from "@/contracts/testresult.contract";
import { jsonError, jsonOk } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { requireOwnedTest } from "@/lib/ownership";
import {
  assertClassWrite,
  assertStudentEnrollment,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { predictStudentScore } from "@/lib/predictor/predictStudentScore";
import type { SessionUser } from "@/lib/session";
import { buildAnalysisReport } from "@/lib/testResults/buildAnalysisReport";
import type { MarkedProblem } from "@/lib/testResults/gradeMarks";
import { gradeMarks } from "@/lib/testResults/gradeMarks";
import { rollupScores } from "@/lib/testResults/scoreRollup";
import { contentOf } from "@/lib/tests/testProblemContent";
import { hydrateTestSnapshots } from "@/lib/tests/loadSnapshotAssets";

/** 이름을 나열할 때 쓰는 구분자 — 화면 문구(`SaveBar`)와 같다. */
const NAME_JOIN = " · ";

const DRAFT_MESSAGE = "초안 시험지는 채점할 수 없습니다. 먼저 확정하십시오.";

/**
 * 시험지 **대상 학생** — 학생별 출제면 그 한 명, 아니면 반 학생 전부.
 * 차례는 `createdAt` 오름차순 — 반 명단 화면(`GET /api/students`)과 같은 차례다.
 */
async function loadRoster(test: { classId: string; studentId: string | null }) {
  if (test.studentId) {
    const one = await db.student.findFirst({
      where: { id: test.studentId, ...studentsInClassWhere(test.classId) },
      select: { id: true, name: true },
    });
    return one ? [one] : [];
  }
  return db.student.findMany({
    where: studentsInClassWhere(test.classId),
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
}

async function loadProblems(testId: string) {
  const rows = await db.testProblem.findMany({
    where: { testId },
    include: { problem: true, snapshot: true },
    orderBy: { orderIndex: "asc" },
  });
  return (await hydrateTestSnapshots(rows)).map((row) => ({
    ...row,
    problem: contentOf(row),
  }));
}

// ─────────────────────────────────────────────
// GET — 채점표
// ─────────────────────────────────────────────

export async function loadGradeSheet(session: SessionUser, testId: string) {
  const owned = await requireOwnedTest(testId, session, "test:read");
  if (!owned.ok) return owned.response;
  if (owned.data.status === "draft") {
    return jsonError("VALIDATION_ERROR", DRAFT_MESSAGE, 422);
  }

  const [roster, testProblems, cls, student] = await Promise.all([
    loadRoster(owned.data),
    loadProblems(testId),
    db.class.findUnique({
      where: { id: owned.data.classId },
      select: { name: true },
    }),
    owned.data.studentId
      ? db.student.findUnique({
          where: { id: owned.data.studentId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const problemOrder = new Map(
    testProblems.map((tp, i) => [tp.problemId, i] as const),
  );

  // 🔴 최신 한 건씩 — 재채점(정정)을 막지 않으므로 같은 (시험지, 학생) 에 행이 여럿일 수 있다.
  //    `takenAt` 내림차순의 **첫 행**이 지금 주장이다(스키마 머리말과 같은 규약).
  const rows = await db.testResult.findMany({
    where: { testId },
    orderBy: { takenAt: "desc" },
    include: { answers: true },
  });
  const latestOf = new Map<string, (typeof rows)[number]>();
  for (const row of rows)
    if (!latestOf.has(row.studentId)) latestOf.set(row.studentId, row);

  return jsonOk(gradeSheetResponseSchema, {
    data: {
      testId,
      publicationId: owned.data.publicationId,
      className: cls?.name ?? "",
      studentName: student?.name ?? null,
      testType: owned.data.testType,
      testDate: owned.data.testDate.toISOString().slice(0, 10),
      status: owned.data.status,
      problems: testProblems.map((tp, i) => ({
        problemId: tp.problemId,
        no: i + 1,
        sequence: tp.orderIndex,
        problemCode: tp.problem.problemCode,
        difficulty: tp.problem.difficulty,
      })),
      students: roster.map((s) => {
        const latest = latestOf.get(s.id);
        if (!latest) return { studentId: s.id, name: s.name, latest: null };
        const wrong = latest.answers
          .filter((a) => !a.isCorrect)
          .sort(
            (a, b) =>
              (problemOrder.get(a.problemId) ?? 0) -
              (problemOrder.get(b.problemId) ?? 0),
          )
          .map((a) => a.problemId);
        return {
          studentId: s.id,
          name: s.name,
          latest: {
            testResultId: latest.id,
            takenAt: latest.takenAt.toISOString(),
            gradingMode: latest.gradingMode,
            absent: latest.absent,
            score: latest.score,
            wrongProblemIds: latest.absent ? [] : wrong,
            correctCount: latest.absent
              ? 0
              : latest.answers.filter((a) => a.isCorrect).length,
          },
        };
      }),
    },
  });
}

// ─────────────────────────────────────────────
// POST — 채점 저장
// ─────────────────────────────────────────────

export async function saveGradingMarks(
  session: SessionUser,
  testId: string,
  input: GradeSubmitRequest,
) {
  const owned = await requireOwnedTest(testId, session, "test:write");
  if (!owned.ok) return owned.response;
  if (owned.data.status === "draft") {
    return jsonError("VALIDATION_ERROR", DRAFT_MESSAGE, 422);
  }

  const [roster, testProblems] = await Promise.all([
    loadRoster(owned.data),
    loadProblems(testId),
  ]);
  const rosterIds = new Set(roster.map((s) => s.id));

  // ⑴ 대상이 아닌 학생이 섞였나 — 이름을 댈 수 있으면 이름으로, 없으면 id 로.
  const strangers = input.entries
    .map((e) => e.studentId)
    .filter((id) => !rosterIds.has(id));
  if (strangers.length > 0) {
    // Do not disclose another branch's student name in a validation response.
    const byId = new Map<string, string>();
    return jsonError(
      "VALIDATION_ERROR",
      `이 시험지의 대상 학생이 아닙니다: ${strangers
        .map((id) => byId.get(id) ?? id)
        .join(NAME_JOIN)}`,
      422,
      strangers.map((id) => ({
        field: "entries",
        message: byId.get(id) ?? id,
      })),
    );
  }

  // ⑵ 🔴 **빠진 이름** — 미채점 행이 남은 채로 저장되면 안 된다. 몇 명이 아니라 이름을 댄다.
  const sent = new Set(input.entries.map((e) => e.studentId));
  const missing = roster.filter((s) => !sent.has(s.id));
  if (missing.length > 0) {
    return jsonError(
      "VALIDATION_ERROR",
      `아직 채점하지 않은 학생이 있습니다: ${missing
        .map((s) => s.name)
        .join(NAME_JOIN)}`,
      422,
      missing.map((s) => ({ field: "entries", message: s.name })),
    );
  }

  // ⑶ 이 시험지에 없는 문항 번호
  const problemIds = new Set(testProblems.map((tp) => tp.problemId));
  const unknown = input.entries
    .flatMap((e) => e.wrongProblemIds)
    .find((id) => !problemIds.has(id));
  if (unknown) {
    return jsonError(
      "VALIDATION_ERROR",
      "이 시험지에 출제되지 않은 문항이 포함되어 있습니다.",
      400,
      [{ field: "wrongProblemIds", message: unknown }],
    );
  }

  const marked: MarkedProblem[] = testProblems.map((tp) => ({
    id: tp.problemId,
    unitId: tp.problem.unitId,
    difficulty: tp.problem.difficulty,
    answer: tp.problem.answer,
    score: tp.problem.score ?? null,
    // 배점 보정기가 이 시험지에 매긴 조정 배점(11 §10, D-42) — 있으면 원본보다 우선한다.
    adjustedScore: tp.score ?? null,
    sequence: tp.orderIndex,
  }));

  const byStudent = new Map(
    input.entries.map((e) => [e.studentId, e] as const),
  );
  const plan = roster.map((student) => {
    const entry = byStudent.get(student.id)!;
    if (entry.absent) {
      return { student, absent: true as const, graded: [], score: null };
    }
    const { graded, score } = gradeMarks(marked, entry.wrongProblemIds);
    return { student, absent: false as const, graded, score };
  });

  // 🔴 한 트랜잭션 — 한 학생에서 실패하면 **아무것도 남지 않는다.**
  //    반쪽 채점이 남으면 다음 열람에서 「누가 남았나」가 거짓이 된다.
  await db.$transaction(async (tx) => {
    if (!owned.data.predictionRunId)
      await assertClassWrite(tx, session, owned.data.classId, "test:write");
    for (const row of plan) {
      if (!owned.data.predictionRunId)
        await assertStudentEnrollment(tx, row.student.id, owned.data.classId);
      if (row.absent) {
        // 결시 — 점수도 응답도 리포트도 만들지 않는다. 남기는 것은 «안 봤다»는 사실 하나다.
        await tx.testResult.create({
          data: {
            testId,
            studentId: row.student.id,
            gradingMode: "marks",
            absent: true,
            score: null,
            predictedScore: null,
          },
        });
        continue;
      }
      const predictedScore = predictStudentScore(row.score, row.graded);
      const { unitScores, difficultyDistribution, recommendedUnits } =
        buildAnalysisReport(row.graded);
      const testResult = await tx.testResult.create({
        data: {
          testId,
          studentId: row.student.id,
          gradingMode: "marks",
          absent: false,
          score: row.score,
          predictedScore,
        },
      });
      await tx.problemAnswer.createMany({
        data: row.graded.map((g) => ({
          testResultId: testResult.id,
          problemId: g.problemId,
          selectedChoice: g.selectedChoice,
          essayScore: g.essayScore,
          isCorrect: g.isCorrect,
          sequence: g.sequence,
        })),
      });
      await tx.analysisReport.create({
        data: {
          testResultId: testResult.id,
          totalScore: row.score,
          predictedScore,
          unitScores,
          difficultyDistribution,
          recommendedUnits,
        },
      });
    }
  });

  const scores: GradeScoreLine[] = plan.map((row) => ({
    studentId: row.student.id,
    name: row.student.name,
    absent: row.absent,
    correctCount: row.graded.filter((g) => g.isCorrect).length,
    problemCount: marked.length,
    score: row.score,
  }));
  // 🔴 합산은 `rollupScores` 한 곳에서만 — 결시가 0점짜리 응시자가 되는 길을 여기서 막는다.
  const rollup = rollupScores(
    plan.map((row) => ({ score: row.score, absent: row.absent })),
  );

  return jsonOk(
    gradeSubmitResponseSchema,
    {
      data: {
        testId,
        scores,
        gradedCount: rollup.gradedCount,
        absentCount: rollup.absentCount,
      },
    },
    { status: 201 },
  );
}
