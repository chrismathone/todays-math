import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import type { z } from "zod";
import type {
  examReportConfirmInputSchema,
  examReportNoteInputSchema,
  examReportPrintInputSchema,
  examReportSettingsInputSchema,
} from "@/contracts/examReportWorkspace.contract";
import { assertClassWrite } from "@/lib/classAccess";
import { db } from "@/lib/db";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { buildPdf, type PdfPayload } from "@/lib/export/pdfServer";
import { examReportSnapshotDigest } from "@/lib/eywa/managedExamReports";
import { personalViewer } from "@/lib/ownerScope";
import { requireOwnedClass } from "@/lib/ownership";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import type { SessionUser } from "@/lib/session";
import { sha256 } from "@/lib/textbook/hash.server";
import {
  buildExamReportPaperHtml,
  buildClassExamReportPaperHtml,
} from "./paperHtml";
import {
  archivedArtifact,
  ExamReportError,
  loadExamReportContext,
  paperOptions,
  reportConflict,
  reportEntry,
  reportListData,
  reportStudentData,
  type ExamReportContext,
} from "./read";
import { EXAM_REPORT_PDF_MAX_BYTES } from "./settings";
import { examReportStorage } from "./storage";

function checkOwner(session: SessionUser, test: ExamReportContext["test"]) {
  if (
    test.userId !== session.id ||
    test.publication?.userId !== session.id ||
    (test.publication.branchId &&
      test.publication.branchId !== session.branchId) ||
    test.class.branchId !== test.publication.branchId
  )
    throw new ExamReportError(403, "이 시험의 성적표에 접근할 수 없습니다.");
}
export async function authorizeExamReport(
  session: SessionUser,
  testId: string,
) {
  const test = await db.test.findUnique({
    where: { id: testId },
    include: { publication: true, class: true },
  });
  if (
    !test?.publication ||
    test.predictionRunId ||
    !["confirmed", "printed"].includes(test.status)
  )
    throw new ExamReportError(404, "낸 시험을 찾지 못했습니다.");
  checkOwner(session, test);
  const owned = await requireOwnedClass(
    test.classId,
    personalViewer(session),
    "test:write",
  );
  if (!owned.ok)
    throw new ExamReportError(
      owned.response.status,
      "이 반의 시험을 편집할 권한이 없습니다.",
    );
  return test;
}
async function lockedContext(
  tx: Prisma.TransactionClient,
  session: SessionUser,
  testId: string,
  classId: string,
) {
  await assertClassWrite(tx, personalViewer(session), classId, "test:write");
  // 새 채점의 외래키 검사가 잡는 KEY SHARE와 충돌한다. 먼저 시작된 채점은 기다리고,
  // 이 거래가 끝날 때까지 새 채점·시험 수정은 들어오지 못한다.
  await tx.$queryRaw`SELECT id FROM "test" WHERE id = ${testId}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "test_result" WHERE test_id = ${testId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT a.id FROM "problem_answer" a JOIN "test_result" r ON r.id = a.test_result_id WHERE r.test_id = ${testId}::uuid FOR SHARE OF a`;
  await tx.$queryRaw`SELECT id FROM "test_problem" WHERE test_id = ${testId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "exam_report_draft" WHERE test_id = ${testId}::uuid FOR UPDATE`;
  const context = await loadExamReportContext(testId, tx);
  checkOwner(session, context.test);
  if (context.test.classId !== classId) throw reportConflict();
  return context;
}
// 잠금을 기다린 뒤 끝난 채점을 읽어야 한다. 거래 시작 시각의 고정 snapshot을 쓰지 않는다.
const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  timeout: 30_000,
};
async function renderPdf(payload: PdfPayload, origin: string) {
  try {
    return await buildPdf(payload, origin);
  } catch (error) {
    if (
      error instanceof Error &&
      /성적표 \d+쪽이 지면을 벗어납니다/.test(error.message)
    )
      throw new ExamReportError(422, error.message);
    throw error;
  }
}
async function transaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  try {
    return await db.$transaction(run, transactionOptions);
  } catch (error) {
    if (isPrismaErrorCode(error, "P2034") || isPrismaErrorCode(error, "P2002"))
      throw reportConflict();
    throw error;
  }
}
export async function readExamReportList(session: SessionUser, testId: string) {
  await authorizeExamReport(session, testId);
  return reportListData(await loadExamReportContext(testId));
}
export async function readExamReportStudent(
  session: SessionUser,
  testId: string,
  studentId: string,
) {
  await authorizeExamReport(session, testId);
  return reportStudentData(await loadExamReportContext(testId), studentId);
}
async function ensureDraft(
  tx: Prisma.TransactionClient,
  context: ExamReportContext,
  studentId: string,
) {
  const entry = reportEntry(context, studentId);
  if (entry.report.status !== "graded")
    throw new ExamReportError(
      422,
      "채점이 끝난 응시 학생만 편집·확정할 수 있습니다.",
    );
  if (entry.draft) return entry.draft;
  return tx.examReportDraft.create({
    data: {
      publicationId: context.test.publication!.id,
      testId: context.test.id,
      studentId,
      userId: context.test.publication!.userId,
      branchId: context.test.publication!.branchId,
      options: context.options,
    },
  });
}
async function saveNoteInTransaction(
  session: SessionUser,
  testId: string,
  classId: string,
  studentId: string,
  input: z.infer<typeof examReportConfirmInputSchema>,
) {
  return transaction(async (tx) => {
    const context = await lockedContext(tx, session, testId, classId);
    const entry = reportEntry(context, studentId);
    if (entry.summary.revision !== input.expectedRevision)
      throw reportConflict();
    const draft = await ensureDraft(tx, context, studentId);
    if (
      input.teacherNote !== undefined &&
      input.teacherNote !== draft.teacherNote
    )
      await tx.examReportDraft.update({
        where: { id: draft.id },
        data: { teacherNote: input.teacherNote },
      });
    return loadExamReportContext(testId, tx);
  });
}
export async function saveExamReportNote(
  session: SessionUser,
  testId: string,
  studentId: string,
  input: z.infer<typeof examReportNoteInputSchema>,
) {
  const test = await authorizeExamReport(session, testId);
  return reportStudentData(
    await saveNoteInTransaction(
      session,
      testId,
      test.classId,
      studentId,
      input,
    ),
    studentId,
  );
}
export async function saveExamReportSettings(
  session: SessionUser,
  testId: string,
  input: z.infer<typeof examReportSettingsInputSchema>,
) {
  const test = await authorizeExamReport(session, testId);
  return transaction(async (tx) => {
    const context = await lockedContext(tx, session, testId, test.classId);
    if (context.optionsDigest !== input.expectedOptionsDigest)
      throw reportConflict();
    // 문장을 쓰지 않은 학생·결시도 포함한다. 새 학생도 반의 같은 설정으로 연다.
    for (const entry of context.entries) {
      if (!entry.draft)
        await tx.examReportDraft.create({
          data: {
            publicationId: test.publication!.id,
            testId,
            studentId: entry.student.id,
            userId: session.id,
            branchId: test.publication!.branchId,
            options: input.options,
          },
        });
    }
    await tx.examReportDraft.updateMany({
      where: { testId },
      data: { options: input.options },
    });
    return reportListData(await loadExamReportContext(testId, tx));
  });
}
export async function confirmExamReport(
  session: SessionUser,
  testId: string,
  studentId: string,
  input: z.infer<typeof examReportConfirmInputSchema>,
  origin: string,
) {
  const test = await authorizeExamReport(session, testId);
  // 문장 저장이 실패하면 PDF 생성·업로드에 이르기 전에 멈춘다.
  const prepared = await saveNoteInTransaction(
    session,
    testId,
    test.classId,
    studentId,
    input,
  );
  const entry = reportEntry(prepared, studentId);
  if (entry.summary.status === "confirmed")
    return reportStudentData(prepared, studentId);
  const draft = entry.draft!;
  const snapshot = entry.snapshot!;
  const sourceDigest = examReportSnapshotDigest(snapshot);
  const artifactId = randomUUID();
  const pdfPath = `${draft.id}/${artifactId}.pdf`;
  const bytes = await renderPdf(
    await buildExamReportPaperHtml(entry.report, paperOptions(snapshot)),
    origin,
  );
  if (
    bytes.byteLength < 5 ||
    bytes.byteLength > EXAM_REPORT_PDF_MAX_BYTES ||
    new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-"
  )
    throw new ExamReportError(422, "성적표 PDF의 형식·용량을 확인해 주세요.");
  try {
    await examReportStorage().upload(pdfPath, bytes);
    return await transaction(async (tx) => {
      const current = await lockedContext(tx, session, testId, test.classId);
      const checked = reportEntry(current, studentId);
      if (
        checked.draft?.id !== draft.id ||
        checked.summary.revision !== draft.revision ||
        checked.draft.confirmedArtifactId !== draft.confirmedArtifactId ||
        checked.report.resultId !== entry.report.resultId ||
        !checked.snapshot ||
        examReportSnapshotDigest(checked.snapshot) !== sourceDigest
      )
        throw reportConflict();
      // 재채점에는 기존 표의 트리거가 없다. 같은 판에 보관본이 있으면 새 판을 쓴다.
      const revision = checked.draft.artifacts.some(
        (row) => row.revision === draft.revision,
      )
        ? draft.revision + 1
        : draft.revision;
      await tx.examReportArtifact.create({
        data: {
          id: artifactId,
          reportId: draft.id,
          revision,
          sourceResultId: checked.report.resultId!,
          confirmedBy: session.id,
          layoutVersion: snapshot.layoutVersion,
          sourceDigest,
          snapshot: JSON.parse(
            JSON.stringify(snapshot),
          ) as Prisma.InputJsonValue,
          pdfPath,
          pdfSha256: sha256(bytes),
          pdfSize: bytes.byteLength,
        },
      });
      await tx.examReportDraft.update({
        where: { id: draft.id },
        data: { revision, state: "confirmed", confirmedArtifactId: artifactId },
      });
      return reportStudentData(
        await loadExamReportContext(testId, tx),
        studentId,
      );
    });
  } catch (error) {
    // 거래 실패 뒤 파일은 지우지 않는다. 오류 기록에 경로를 남겨 리드가 대조한다.
    noteErrorLog({
      action: "exam-report-confirm",
      context: { unconfirmedPdfPath: pdfPath, reportId: draft.id, artifactId },
      detail:
        "PDF 업로드 시도 뒤 확정 실패. 이 경로의 파일은 삭제하지 않았습니다.",
    });
    throw error;
  }
}
async function archivedPdf(entry: ExamReportContext["entries"][number]) {
  const artifact = entry.draft?.confirmedArtifact;
  if (entry.summary.status !== "confirmed" || !artifact)
    throw new ExamReportError(
      409,
      "현재 내용으로 확정된 PDF가 없습니다. 다시 확정해 주세요.",
    );
  const parsed = archivedArtifact(artifact);
  if (examReportSnapshotDigest(parsed.snapshot) !== parsed.sourceDigest)
    throw new Error("성적표 보관본의 지문이 다릅니다.");
  return {
    bytes: await examReportStorage().read({
      path: artifact.pdfPath,
      size: artifact.pdfSize,
      sha256: artifact.pdfSha256,
    }),
    artifactId: artifact.id,
  };
}
export async function readConfirmedExamReportPdf(
  session: SessionUser,
  testId: string,
  studentId: string,
) {
  await authorizeExamReport(session, testId);
  const { bytes, artifactId } = await archivedPdf(
    reportEntry(await loadExamReportContext(testId), studentId),
  );
  await authorizeExamReport(session, testId);
  const current = reportEntry(await loadExamReportContext(testId), studentId);
  if (
    current.summary.status !== "confirmed" ||
    current.draft?.confirmedArtifactId !== artifactId
  )
    throw reportConflict();
  return bytes;
}
/** pdf-lib은 기존 pdfClient의 합치기와 같은 도구다. 확정된 쪽은 재생성하지 않는다. */
export async function printExamReports(
  session: SessionUser,
  testId: string,
  input: z.infer<typeof examReportPrintInputSchema>,
  origin: string,
) {
  await authorizeExamReport(session, testId);
  const context = await loadExamReportContext(testId);
  const sourceKey = (value: ExamReportContext) =>
    JSON.stringify({
      list: reportListData(value),
      sources: value.entries.map((row) => ({
        studentId: row.student.id,
        artifactId: row.draft?.confirmedArtifactId ?? null,
        digest: row.snapshot ? examReportSnapshotDigest(row.snapshot) : null,
      })),
    });
  if (input.kind === "class") {
    const bytes = await renderPdf(
      await buildClassExamReportPaperHtml(context.classReport),
      origin,
    );
    await authorizeExamReport(session, testId);
    if (sourceKey(await loadExamReportContext(testId)) !== sourceKey(context))
      throw reportConflict();
    return bytes;
  }
  const targets = context.entries.filter(
    (row) =>
      row.report.status === "graded" &&
      (input.scope === "all" || row.summary.status === "confirmed"),
  );
  if (!targets.length)
    throw new ExamReportError(422, "선택한 범위에 인쇄할 학생이 없습니다.");
  const combined = await PDFDocument.create();
  for (const target of targets) {
    const bytes =
      target.summary.status === "confirmed"
        ? (await archivedPdf(target)).bytes
        : await renderPdf(
            await buildExamReportPaperHtml(
              target.report,
              paperOptions(target.snapshot!),
            ),
            origin,
          );
    const document = await PDFDocument.load(bytes);
    for (const page of await combined.copyPages(
      document,
      document.getPageIndices(),
    ))
      combined.addPage(page);
  }
  await authorizeExamReport(session, testId);
  if (sourceKey(await loadExamReportContext(testId)) !== sourceKey(context))
    throw reportConflict();
  combined.setTitle(
    `${context.classReport.publication.title} · ${context.classReport.className} 성적표`.slice(
      0,
      200,
    ),
  );
  return new Uint8Array(await combined.save());
}
