import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  textbookAttemptSubmitSchema,
  textbookConceptAttemptSchema,
  type TextbookConceptAttempt,
} from "@/contracts/textbookConcept.contract";
import { canonicalHash } from "./hash.server";
import { studentAttemptOf, studentConceptOf } from "./studentProjection";
import { readFrozenConcept, requireStudentConcept } from "./studentRead";
import { conflict, invalid } from "./server/errors";
import type { TextbookDb, TextbookSql } from "./server/sql";
import { textbookAttemptSelectSql as attemptSelect } from "./server/conceptRows";

export async function listStudentConceptAttempts(
  sql: TextbookSql,
  studentId: string,
  editionId: string,
  conceptKey: string,
) {
  await requireStudentConcept(sql, studentId, editionId, conceptKey);
  const attempts = await sql.query<TextbookConceptAttempt>(
    `${attemptSelect} WHERE a."student_id" = $1::uuid AND a."edition_id" = $2::uuid AND a."concept_key" = $3::text ORDER BY a."submitted_at" DESC, a."id" DESC LIMIT 100`,
    [studentId, editionId, conceptKey],
  );
  return attempts.map((attempt) =>
    studentAttemptOf(textbookConceptAttemptSchema.parse(attempt)),
  );
}

/** A submission records the student's words only. It does not grade or alter a mastery profile. */
export async function submitStudentConceptAttempt(
  db: TextbookDb,
  studentId: string,
  editionId: string,
  conceptKey: string,
  input: z.infer<typeof textbookAttemptSubmitSchema>,
) {
  const body = textbookAttemptSubmitSchema.parse(input);
  if (!body.response.trim()) throw invalid("생각한 내용을 적어 주세요.");
  return db.transaction(async (tx) => {
    // Replays must still pass today's assignment/account gates.
    const target = await requireStudentConcept(
      tx,
      studentId,
      editionId,
      conceptKey,
    );
    const concept = await readFrozenConcept(tx, target);
    const projection = studentConceptOf(editionId, concept, {
      available: false,
      reasonCode: "not-requested",
    });
    if (!projection.blanks.some((blank) => blank.form === body.form))
      throw invalid("이 교재 개념에 없는 백지 형식입니다.");
    const frozenHash = projection.frozenHash;
    const bodyHash = canonicalHash({
      editionId,
      conceptKey,
      frozenHash,
      form: body.form,
      response: body.response,
      channel: "student-text",
    });
    const inserted = await tx.execute(
      `INSERT INTO "textbook_concept_attempt"
      ("id", "edition_id", "concept_key", "student_id", "request_id", "body_hash", "frozen_hash", "form", "channel", "response")
      VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, $5::uuid, $6::text, $7::text, $8::text, 'student-text', $9::text)
      ON CONFLICT ("student_id", "request_id") DO NOTHING`,
      [
        randomUUID(),
        editionId,
        conceptKey,
        studentId,
        body.requestId,
        bodyHash,
        frozenHash,
        body.form,
        body.response,
      ],
    );
    const [saved] = await tx.query<TextbookConceptAttempt>(
      `${attemptSelect} WHERE a."student_id" = $1::uuid AND a."request_id" = $2::uuid`,
      [studentId, body.requestId],
    );
    if (
      !saved ||
      saved.bodyHash !== bodyHash ||
      saved.editionId !== editionId ||
      saved.conceptKey !== conceptKey ||
      saved.channel !== "student-text"
    )
      throw conflict("같은 요청 번호로 다른 내용을 제출할 수 없습니다.");
    return {
      attempt: studentAttemptOf(textbookConceptAttemptSchema.parse(saved)),
      replayed: inserted === 0,
    };
  });
}
