import "server-only";
import type { Prisma } from "@prisma/client";

import {
  examPublicationCreatedResponseSchema,
  examPublicationDeletedResponseSchema,
  examPublicationListResponseSchema,
  examPublicationTypeSchema,
  type ExamPublicationInput,
  type ExamPublicationSummary,
} from "@/contracts/examPublication.contract";
import { jsonError, jsonOk, notFoundError } from "@/lib/apiResponse";
import {
  accessibleClassesWhere,
  assertClassWrite,
  ClassAccessDenied,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { personalViewer } from "@/lib/ownerScope";
import { requireOwnedClass } from "@/lib/ownership";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { problemIneligibleReason } from "@/lib/problemEligibility";
import type { SessionUser } from "@/lib/session";
import {
  examPublicationContentHash,
  freezeDraftPayload,
  type FrozenPayload,
} from "./freeze";

/**
 * 월말평가 M1 — «내 시험지»에서 반에 내기 · 낸 기록 · 지우기 (계약 `examPublication.contract.ts` · 계획서 §9).
 *
 * 모양: 발행본(`exam_publication` — 낸 그대로의 고정본) 하나 + 반마다 반 시험(`test`) 한 행(`publication_id`).
 * 채점표 · 결과 · 분석은 지금 반 시험의 길을 그대로 쓴다. 반 시험은 확정(`confirmed`)으로 만든다 — 채점표가 초안을 받지 않는다.
 * 범위 칸은 문항들의 단원 양끝이다(바구니 경로와 같은 셈) — «일반 시험» 조회가 이 행을 빼므로(`GENERAL_TESTS`) 확인테스트 범위를 바꾸지 않는다.
 * 🔴 권한은 바구니 경로와 같다 — 내 반(`personalViewer`) · 반마다 `test:write` 를 저장 거래 안에서 다시 본다. 원본 문서는 **내 것**만.
 */

const message = {
  documentMissing: "시험지를 찾지 못했습니다. 내 시험지에 저장한 뒤 내십시오.",
  documentKind: "시험지만 반에 낼 수 있습니다.",
  documentChanged:
    "시험지가 그사이 바뀌었습니다. 다시 열어 확인한 뒤 내십시오.",
  empty: "문항이 없는 시험지는 낼 수 없습니다.",
  requestReused:
    "같은 요청 번호로 다른 내용을 보냈습니다. 새로 고친 뒤 다시 내십시오.",
  started: "채점을 시작한 시험은 지울 수 없습니다.",
} as const;

const numbersText = (numbers: number[]) =>
  `${numbers.slice(0, 8).join(" · ")}번${numbers.length > 8 ? " 외" : ""}`;

/** 같은 요청 번호로 온 것이 같은 내용인가 — 문서 · 판 · 종류 · 날짜 · 반이 같아야 같은 요청이다. */
function sameRequest(
  existing: {
    documentId: string;
    sourceRevision: number;
    examType: string;
    testDate: Date;
    tests: { classId: string }[];
  },
  input: ExamPublicationInput,
  testDate: string,
) {
  const a = [...existing.tests.map((t) => t.classId)].sort().join();
  const b = [...input.classIds].sort().join();
  return (
    existing.documentId === input.documentId &&
    existing.sourceRevision === input.expectedRevision &&
    existing.examType === input.examType &&
    existing.testDate.toISOString().slice(0, 10) === testDate &&
    a === b
  );
}

type ExistingPublication = Prisma.ExamPublicationGetPayload<{
  include: {
    tests: {
      select: { id: true; classId: true; class: { select: { name: true } } };
    };
  };
}>;

function createdResponse(publication: ExistingPublication, status: 200 | 201) {
  const frozen = publication.payload as unknown as FrozenPayload;
  return jsonOk(
    examPublicationCreatedResponseSchema,
    {
      data: {
        publicationId: publication.id,
        tests: publication.tests.map((t) => ({
          classId: t.classId,
          className: t.class.name,
          testId: t.id,
        })),
        problemCount: frozen.problems.length,
      },
    },
    { status },
  );
}

const includeTests = {
  tests: {
    select: { id: true, classId: true, class: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function publishExam(
  session: SessionUser,
  input: ExamPublicationInput,
): Promise<Response> {
  const testDate = input.testDate ?? kstDateOf(new Date());
  // 같은 요청 번호의 재전송 — 같은 내용이면 같은 답, 다르면 409.
  const replay = await db.examPublication.findUnique({
    where: {
      userId_requestId: { userId: session.id, requestId: input.requestId },
    },
    include: includeTests,
  });
  if (replay)
    return sameRequest(replay, input, testDate)
      ? createdResponse(replay, 200)
      : jsonError("CONFLICT", message.requestReused, 409);

  const document = await db.workspaceDocument.findUnique({
    where: { userId_id: { userId: session.id, id: input.documentId } },
  });
  if (!document) return notFoundError("시험지");
  if (document.kind !== "draft")
    return jsonError("VALIDATION_ERROR", message.documentKind, 422);
  if (document.revision !== input.expectedRevision)
    return jsonError("CONFLICT", message.documentChanged, 409);

  const frozen = freezeDraftPayload(document.payload);
  if (!frozen.ok) {
    if ("empty" in frozen)
      return jsonError("VALIDATION_ERROR", message.empty, 422);
    const parts = [
      frozen.notBank.length
        ? `직접 가져온 문항(${numbersText(frozen.notBank)})은 낼 수 없습니다 — 문제은행 문항만 반에 낼 수 있습니다.`
        : "",
      frozen.duplicate.length
        ? `같은 문항이 두 번 들어 있습니다(${numbersText(frozen.duplicate)}).`
        : "",
    ].filter(Boolean);
    return jsonError("VALIDATION_ERROR", parts.join(" "), 422);
  }
  const problems = frozen.frozen.problems;

  // 은행에 실제로 있고, 지금 낼 수 있는 문항인가(바구니 경로와 같은 판정).
  const rows = await db.problem.findMany({
    where: { id: { in: problems.map((p) => p.problemId) } },
    select: {
      id: true,
      unitId: true,
      problemCode: true,
      pool: true,
      reviewStatus: true,
      directUseAllowed: true,
      answer: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const missing = problems
    .filter((p) => !byId.has(p.problemId))
    .map((p) => p.no);
  if (missing.length)
    return jsonError(
      "VALIDATION_ERROR",
      `문제은행에서 찾지 못한 문항(${numbersText(missing)})이 있어 낼 수 없습니다.`,
      422,
    );
  const blocked = problems
    .map((p) => ({
      no: p.no,
      reason: problemIneligibleReason(byId.get(p.problemId)!),
    }))
    .filter((x): x is { no: number; reason: string } => x.reason !== null);
  if (blocked.length)
    return jsonError(
      "VALIDATION_ERROR",
      `지금 낼 수 없는 문항이 있습니다 — ${blocked
        .slice(0, 3)
        .map((b) => `${b.no}번(${b.reason})`)
        .join(" · ")}${blocked.length > 3 ? " 외" : ""}`,
      422,
    );

  const viewer = personalViewer(session);
  for (const classId of input.classIds) {
    const owned = await requireOwnedClass(classId, viewer, "test:write");
    if (!owned.ok) return owned.response;
  }

  const units = await db.unit.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.unitId))] } },
    select: { id: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  const first = units[0];
  const last = units.at(-1);
  if (!first || !last)
    return jsonError("VALIDATION_ERROR", "문항의 단원을 찾지 못했습니다.", 422);

  const examType = examPublicationTypeSchema.parse(input.examType);
  try {
    const created = await db.$transaction(async (tx) => {
      for (const classId of input.classIds)
        await assertClassWrite(tx, viewer, classId, "test:write");
      const publication = await tx.examPublication.create({
        data: {
          userId: session.id,
          branchId: session.branchId ?? null,
          documentId: document.id,
          sourceRevision: document.revision,
          title: document.title,
          examType,
          testDate: new Date(`${testDate}T00:00:00.000Z`),
          payload: frozen.frozen as unknown as Prisma.InputJsonValue,
          contentHash: examPublicationContentHash(frozen.frozen),
          requestId: input.requestId,
        },
      });
      for (const classId of input.classIds) {
        const test = await tx.test.create({
          data: {
            userId: session.id,
            classId,
            studentId: null,
            testType: "review",
            rangeStartUnitId: first.id,
            rangeEndUnitId: last.id,
            status: "confirmed",
            modified: false,
            testDate: new Date(`${testDate}T00:00:00.000Z`),
            publicationId: publication.id,
          },
        });
        await tx.testProblem.createMany({
          data: problems.map((p) => ({
            testId: test.id,
            problemId: p.problemId,
            orderIndex: p.no,
            replaced: false,
          })),
        });
      }
      return tx.examPublication.findUniqueOrThrow({
        where: { id: publication.id },
        include: includeTests,
      });
    });
    return createdResponse(created, 201);
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return jsonError("FORBIDDEN", error.message, 403);
    // 같은 요청 번호가 동시에 두 번 왔다 — 먼저 끝난 것을 돌려준다.
    if (isPrismaErrorCode(error, "P2002")) {
      const winner = await db.examPublication.findUnique({
        where: {
          userId_requestId: { userId: session.id, requestId: input.requestId },
        },
        include: includeTests,
      });
      if (winner)
        return sameRequest(winner, input, testDate)
          ? createdResponse(winner, 200)
          : jsonError("CONFLICT", message.requestReused, 409);
    }
    throw error;
  }
}

/** 내가 낸 기록 — 원본 시험지마다 낸 반과 반별 채점 진행(채점표와 같은 명단 · 학생마다 가장 최근 결과). */
export async function listExamPublications(
  session: SessionUser,
): Promise<Response> {
  const publications = await db.examPublication.findMany({
    where: { userId: session.id },
    include: includeTests,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const tests = publications.flatMap((p) => p.tests);
  const classIds = [...new Set(tests.map((t) => t.classId))];
  const rosters = new Map(
    await Promise.all(
      classIds.map(
        async (classId) =>
          [
            classId,
            new Set(
              (
                await db.student.findMany({
                  where: studentsInClassWhere(classId),
                  select: { id: true },
                })
              ).map((s) => s.id),
            ),
          ] as const,
      ),
    ),
  );
  const results = tests.length
    ? await db.testResult.findMany({
        where: { testId: { in: tests.map((t) => t.id) } },
        orderBy: { takenAt: "desc" },
        select: { testId: true, studentId: true, absent: true },
      })
    : [];
  const latest = new Map<string, boolean>();
  for (const r of results) {
    const key = `${r.testId}|${r.studentId}`;
    if (!latest.has(key)) latest.set(key, r.absent);
  }
  const data: ExamPublicationSummary[] = publications.map((p) => {
    const frozen = p.payload as unknown as FrozenPayload;
    return {
      id: p.id,
      documentId: p.documentId,
      title: p.title,
      examType: examPublicationTypeSchema.parse(p.examType),
      testDate: p.testDate.toISOString().slice(0, 10),
      createdAt: p.createdAt.toISOString(),
      problemCount: frozen.problems.length,
      classes: p.tests.map((t) => {
        const roster = rosters.get(t.classId) ?? new Set<string>();
        let graded = 0;
        let absent = 0;
        for (const studentId of roster) {
          const mark = latest.get(`${t.id}|${studentId}`);
          if (mark === undefined) continue;
          if (mark) absent += 1;
          else graded += 1;
        }
        return {
          testId: t.id,
          classId: t.classId,
          className: t.class.name,
          students: roster.size,
          graded,
          absent,
          remaining: Math.max(0, roster.size - graded - absent),
        };
      }),
    };
  });
  // 낼 수 있는 반 — 내기와 같은 범위(내 반 · `test:write`). 학생 수는 채점표와 같은 명단이다.
  const own = await db.class.findMany({
    where: await accessibleClassesWhere(personalViewer(session), "test:write"),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const classes = await Promise.all(
    own.map(async (cls) => ({
      id: cls.id,
      name: cls.name,
      students: await db.student.count({ where: studentsInClassWhere(cls.id) }),
    })),
  );
  return jsonOk(examPublicationListResponseSchema, {
    data: { publications: data, classes },
  });
}

/**
 * 한 반에 낸 것 지우기 — 채점(결시 포함 — 결과 행이 하나라도)을 시작하기 전만. 반 시험 행을 먼저 잠그고 결과를 센다 —
 * 채점 저장이 결과를 넣는 중이면 그 저장이 끝난 뒤에 세어 거절한다. 마지막 반을 지우면 발행본도 지운다.
 */
export async function deleteExamPublicationClass(
  session: SessionUser,
  publicationId: string,
  classId: string,
): Promise<Response> {
  const test = await db.test.findFirst({
    where: { publicationId, classId, publication: { userId: session.id } },
    select: { id: true },
  });
  if (!test) return notFoundError("낸 시험");
  const outcome = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "test" WHERE id = ${test.id}::uuid FOR UPDATE`;
    const started = await tx.testResult.count({ where: { testId: test.id } });
    if (started > 0) return "started" as const;
    await tx.test.delete({ where: { id: test.id } });
    const left = await tx.test.count({ where: { publicationId } });
    if (left === 0)
      await tx.examPublication.delete({ where: { id: publicationId } });
    return "deleted" as const;
  });
  if (outcome === "started") return jsonError("CONFLICT", message.started, 409);
  return jsonOk(examPublicationDeletedResponseSchema, {
    data: { deleted: true },
  });
}
