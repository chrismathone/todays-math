import "server-only";
import type { EywaBinding } from "@prisma/client";
import {
  confirmedExamReportArtifactSchema,
  examReportDaySchema,
  examReportPdfRequestSchema,
  examReportSnapshotSchema,
  type ConfirmedExamReportArtifact,
  type ExamReportSnapshot,
  type EywaExamReportItem,
} from "@/contracts/eywaExamReport.contract";
import { isoDateSchema } from "@/contracts/common.contract";
import { PDF_RESPONSE_MAX_BYTES } from "@/lib/export/pdfLimits";
import { canonicalHash, sha256 } from "@/lib/textbook/hash.server";
import { EywaAccessError } from "./managedPolicy";

export type ExamReportBinding = Pick<EywaBinding, "id" | "targetBranchId">;
/** 승인 뒤 로더는 현재 연결·최신 채점으로 current를 만들고 보관본과 함께 반환해야 한다. */
export interface ExamReportCandidate {
  publicationBranchId: string | null;
  test: {
    id: string;
    publicationId: string | null;
    predictionRunId: string | null;
    status: string;
    classId: string;
    eywaBindingId: string | null;
    branchId: string | null;
  };
  student: {
    id: string;
    eywaStudentId: string | null;
    eywaBindingId: string | null;
    branchId: string | null;
    isTest: boolean;
  };
  current: ExamReportSnapshot;
  confirmation: ConfirmedExamReportArtifact | null;
}
export interface ExamReportSource {
  readDay(
    binding: ExamReportBinding,
    date: string,
  ): Promise<{
    availability: "ready" | "not-installed";
    candidates: ExamReportCandidate[];
  }>;
  readPdf(artifactId: string): Promise<Uint8Array | null>;
}

/** 결과 피드 digest v2처럼 전송 모양이 바뀌면 이 판도 올린다. */
const DIGEST_VERSION = "exam-report-v1";
export function examReportSnapshotDigest(snapshot: ExamReportSnapshot): string {
  const parsed = examReportSnapshotSchema.parse(snapshot);
  // 선택적 그림 칸의 undefined는 JSON 저장과 같은 방식으로 뺀다.
  return canonicalHash({
    version: DIGEST_VERSION,
    snapshot: JSON.parse(JSON.stringify(parsed)),
  });
}

function validDate(date: string) {
  if (!isoDateSchema.safeParse(date).success)
    throw new EywaAccessError("invalid_date");
}

/** 목록과 PDF가 정확히 같은 대상 판정을 쓴다. 초안·오래된 확정·다른 지점은 바깥으로 나가지 않는다. */
export function eligibleExamReports(
  binding: ExamReportBinding,
  date: string,
  candidates: readonly ExamReportCandidate[],
) {
  validDate(date);
  const accepted: {
    item: EywaExamReportItem;
    artifact: ConfirmedExamReportArtifact;
  }[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const { test, student, current, confirmation } = candidate;
    const report = current.report;
    if (
      !confirmation ||
      confirmation.state !== "confirmed" ||
      report.status !== "graded" ||
      report.publication.testDate !== date ||
      report.testId !== test.id ||
      report.publication.id !== test.publicationId ||
      report.classId !== test.classId ||
      report.student.id !== student.id ||
      test.predictionRunId ||
      !["confirmed", "printed"].includes(test.status) ||
      test.eywaBindingId !== binding.id ||
      test.branchId !== binding.targetBranchId ||
      candidate.publicationBranchId !== binding.targetBranchId ||
      student.eywaBindingId !== binding.id ||
      student.branchId !== binding.targetBranchId ||
      student.isTest ||
      !student.eywaStudentId
    )
      continue;
    const parsed = confirmedExamReportArtifactSchema.safeParse(confirmation);
    if (!parsed.success) throw new EywaAccessError("invalid_report_artifact");
    const artifact = parsed.data;
    const archivedDigest = examReportSnapshotDigest(artifact.snapshot);
    if (artifact.sourceDigest !== archivedDigest)
      throw new EywaAccessError("invalid_report_artifact");
    if (examReportSnapshotDigest(current) !== archivedDigest) continue;
    const key = `${report.publication.id}:${student.eywaStudentId}`;
    if (seen.has(key)) throw new EywaAccessError("ambiguous_report");
    seen.add(key);
    accepted.push({
      item: {
        publicationId: report.publication.id,
        sourceStudentId: student.eywaStudentId,
        sourceTestId: test.id,
        testDate: date,
        sha256: canonicalHash({
          version: DIGEST_VERSION,
          bindingId: binding.id,
          sourceStudentId: student.eywaStudentId,
          sourceDigest: archivedDigest,
          artifactId: artifact.id,
          pdfSha256: artifact.pdfSha256,
          confirmedAt: artifact.confirmedAt,
        }),
        pdfSha256: artifact.pdfSha256,
        confirmedAt: artifact.confirmedAt,
      },
      artifact,
    });
  }
  return accepted.sort(
    (a, b) =>
      a.item.publicationId.localeCompare(b.item.publicationId) ||
      a.item.sourceStudentId.localeCompare(b.item.sourceStudentId),
  );
}

export function createExamReportFeed(source: ExamReportSource) {
  const selected = async (binding: ExamReportBinding, date: string) => {
    validDate(date);
    const day = await source.readDay(binding, date);
    if (day.availability === "not-installed")
      return { availability: day.availability, rows: [] };
    return {
      availability: day.availability,
      rows: eligibleExamReports(binding, date, day.candidates),
    };
  };
  return {
    async day(binding: ExamReportBinding, date: string) {
      const { availability, rows } = await selected(binding, date);
      return examReportDaySchema.parse({
        version: "v1",
        bindingId: binding.id,
        date,
        availability,
        reports: rows.map((row) => row.item),
      });
    },
    async pdf(
      binding: ExamReportBinding,
      date: string,
      publicationId: string,
      sourceStudentId: string,
      expectedDigest: string,
    ) {
      if (
        !examReportPdfRequestSchema.safeParse({
          date,
          publicationId,
          sourceStudentId,
          sha256: expectedDigest,
        }).success
      )
        throw new EywaAccessError("invalid_report_request");
      const match = (rows: Awaited<ReturnType<typeof selected>>["rows"]) =>
        rows.find(
          (row) =>
            row.item.publicationId === publicationId &&
            row.item.sourceStudentId === sourceStudentId,
        );
      const row = match((await selected(binding, date)).rows);
      if (!row) throw new EywaAccessError("report_not_found");
      if (row.item.sha256 !== expectedDigest)
        throw new EywaAccessError("report_changed");
      const bytes = await source.readPdf(row.artifact.id);
      if (
        !bytes ||
        bytes.byteLength > PDF_RESPONSE_MAX_BYTES ||
        bytes.byteLength !== row.artifact.pdfSize ||
        new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
        sha256(bytes) !== row.item.pdfSha256
      )
        throw new EywaAccessError("report_pdf_invalid");
      // 본문을 읽는 동안의 재채점·문장 수정도 다시 확인한다. 오래된 지문으로 PDF를 보내지 않는다.
      const checked = match((await selected(binding, date)).rows);
      if (!checked || checked.item.sha256 !== expectedDigest)
        throw new EywaAccessError("report_changed");
      return bytes;
    },
  };
}
