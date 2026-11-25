import "server-only";
import type { ScanWrittenName } from "@/contracts/conceptBlankScanName.contract";
import { scanAssignStudentSchema } from "@/contracts/conceptBlankScanName.contract";
import {
  scanIssueStudents,
  scanSubmissionAccess,
  ScanAccessError,
  type ScanIdentity,
} from "./issuance";
import {
  assertScanEditable,
  assertScanRevision,
  loadScanSubmission,
} from "./submission";
import type { ScanDatabase, ScanSql } from "./database";
/** Only canonical Unicode composition and whitespace. No fuzzy/phonetic/case matching. */
export const normalizeScanName = (s: string) =>
  s.normalize("NFC").replace(/\s/gu, "");
export function matchWrittenScanName(
  name: ScanWrittenName,
  students: readonly { id: string; name: string }[],
) {
  const key = normalizeScanName(name.text);
  const matches = key
    ? students.filter((s) => normalizeScanName(s.name) === key)
    : [];
  const result =
    name.status !== "read" || !matches.length
      ? "none"
      : matches.length === 1
        ? "matched"
        : "ambiguous";
  return {
    result,
    studentId: result === "matched" ? matches[0].id : null,
    candidateIds: matches.map((s) => s.id),
  } as const;
}
export const scanNameCandidates = scanIssueStudents;
export async function saveScanWrittenName(
  actor: ScanIdentity,
  id: string,
  name: ScanWrittenName,
  tx: ScanSql,
) {
  const { row, student } = await loadScanSubmission(actor, id, tx, true);
  const candidates = await scanNameCandidates(actor, row.printed_sheet_id, tx);
  const result =
    name.status !== "read"
      ? "none"
      : normalizeScanName(name.text) === normalizeScanName(student.name)
        ? matchWrittenScanName(name, candidates).result
        : "mismatch";
  await tx.query(
    `UPDATE concept_blank_scan_submission SET written_name=$2::text,written_name_status=$3::text,name_match_result=$4::text,name_match_method=COALESCE(name_match_method,$5::text) WHERE id=$1::uuid`,
    [
      id,
      name.text,
      name.status,
      result,
      row.captured_student_id ? "student-account" : "teacher-selected",
    ],
  );
}
export async function changeScanStudent(
  actor: ScanIdentity,
  id: string,
  input: { studentId: string; revision: number },
  db: ScanDatabase,
) {
  const parsed = scanAssignStudentSchema.parse(input);
  if (actor.kind !== "teacher")
    throw new ScanAccessError("교사만 답안 주인을 바꿀 수 있습니다.");
  return db.transaction(async (tx) => {
    const { row } = await loadScanSubmission(actor, id, tx, true);
    assertScanRevision(row, parsed.revision);
    assertScanEditable(row);
    if (row.captured_student_id)
      throw new ScanAccessError(
        "학생 계정으로 제출한 답안의 주인은 바꿀 수 없습니다.",
      );
    await scanSubmissionAccess(
      actor,
      row.printed_sheet_id,
      parsed.studentId,
      tx,
    );
    await tx.query(
      `UPDATE concept_blank_scan_submission SET student_id=$2::uuid,name_match_method='teacher-picked',revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1::uuid`,
      [id, parsed.studentId],
    );
    if (row.written_name_status)
      await saveScanWrittenName(
        actor,
        id,
        { text: row.written_name ?? "", status: row.written_name_status },
        tx,
      );
    return { revision: row.revision + 1 };
  });
}
