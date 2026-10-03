/** Server-owned release policy. Context records must be read from trusted storage, never a learner request. */
import { z } from "zod";
import {
  englishListeningAssignmentSchema,
  englishListeningAttemptSchema,
  type EnglishListeningPublication,
  type EnglishListeningAssignment,
  type EnglishListeningAttempt,
} from "@/contracts/englishListening.contract";
import { validateListeningPublication } from "./publication";

const binding = {
  assignmentId: z.uuid(),
  publicationId: z.uuid(),
  releasedAt: z.iso.datetime(),
};
export const listeningReleaseContextSchema = z.strictObject({
  now: z.iso.datetime(),
  /** Authenticated identity is needed to bind disclosure that happened before an attempt existed. */
  studentId: z.uuid().optional(),
  manualRelease: z
    .strictObject({ ...binding, releasedBy: z.uuid() })
    .nullable()
    .optional(),
  releaseHistory: z
    .array(
      z.strictObject({ ...binding, studentId: z.uuid(), groupId: z.uuid() }),
    )
    .max(30)
    .optional(),
});
export type ListeningReleaseContext = z.infer<
  typeof listeningReleaseContextSchema
>;
export interface ListeningGroupRelease {
  groupId: string;
  released: boolean;
  reason:
    | "locked"
    | "after_unit_answer"
    | "after_submit"
    | "at_time"
    | "manual"
    | "already_released";
  earlyExposure: boolean;
}

/** Defense in depth only; caller must still authorize current account/class/assignment on every request. */
export function assertListeningBinding(
  publication: EnglishListeningPublication,
  assignment: EnglishListeningAssignment,
  attempt: EnglishListeningAttempt | null,
  options: { allowCancellationTransition?: boolean } = {},
) {
  if (
    assignment.publicationId !== publication.id ||
    assignment.ownerId !== publication.document.ownerId ||
    assignment.branchId !== publication.document.branchId
  )
    throw new Error("Assignment/publication scope mismatch");
  if (assignment.cancelledAt && !options.allowCancellationTransition)
    throw new Error("Assignment revoked");
  if (attempt) {
    if (
      attempt.assignmentId !== assignment.id ||
      attempt.assignmentRevision !== assignment.revision ||
      attempt.publicationId !== publication.id ||
      !assignment.targetStudentIds.includes(attempt.studentId)
    )
      throw new Error("Attempt binding mismatch");
    if (attempt.status === "cancelled" && !options.allowCancellationTransition)
      throw new Error("Attempt revoked");
    for (const answer of [
      ...attempt.firstAnswers,
      ...(attempt.draftAnswers ?? []),
      ...attempt.reviewAnswers,
    ]) {
      const question = publication.document.groups
        .flatMap((group) => group.questions)
        .find((question) => question.id === answer.questionId);
      if (
        !question ||
        !question.choices.some((choice) => choice.id === answer.choiceId)
      )
        throw new Error("Invalid stored answer reference");
    }
  }
}

export function decideListeningRelease(
  publicationInput: unknown,
  assignmentInput: unknown,
  attemptInput: unknown,
  contextInput: ListeningReleaseContext,
): ListeningGroupRelease[] {
  const publication = validateListeningPublication(publicationInput);
  const assignment = englishListeningAssignmentSchema.parse(assignmentInput);
  const attempt =
    attemptInput === null
      ? null
      : englishListeningAttemptSchema.parse(attemptInput);
  const context = listeningReleaseContextSchema.parse(contextInput);
  assertListeningBinding(publication, assignment, attempt);
  if (
    context.studentId &&
    (!assignment.targetStudentIds.includes(context.studentId) ||
      (attempt && attempt.studentId !== context.studentId))
  )
    throw new Error("Release student binding mismatch");
  const studentId = attempt?.studentId ?? context.studentId;
  const now = Date.parse(context.now);
  if (now < Date.parse(assignment.opensAt))
    throw new Error("Assignment not open");
  for (const record of [
    context.manualRelease,
    ...(context.releaseHistory ?? []),
  ]) {
    if (!record) continue;
    if (
      record.assignmentId !== assignment.id ||
      record.publicationId !== publication.id ||
      Date.parse(record.releasedAt) > now
    )
      throw new Error("Release record binding/time mismatch");
    if (
      "groupId" in record &&
      (!publication.document.groups.some(
        (group) => group.id === record.groupId,
      ) ||
        record.studentId !== studentId)
    )
      throw new Error("Release history binding mismatch");
  }
  return publication.document.groups.map((group) => {
    let reason: ListeningGroupRelease["reason"] = "locked";
    if (context.releaseHistory?.some((record) => record.groupId === group.id))
      reason = "already_released";
    else {
      switch (assignment.releasePolicy.kind) {
        case "after_unit_answer":
          if (
            attempt &&
            group.questions.every((question) =>
              attempt.firstAnswers.some(
                (answer) =>
                  answer.questionId === question.id &&
                  Date.parse(answer.savedAt) <= now,
              ),
            )
          )
            reason = "after_unit_answer";
          break;
        case "after_submit":
          if (
            attempt?.status === "submitted" &&
            attempt.submittedAt &&
            Date.parse(attempt.submittedAt) <= now
          )
            reason = "after_submit";
          break;
        case "at_time":
          if (now >= Date.parse(assignment.releasePolicy.at))
            reason = "at_time";
          break;
        case "manual":
          if (context.manualRelease) reason = "manual";
          break;
        case "never":
          break;
      }
    }
    return {
      groupId: group.id,
      released: reason !== "locked",
      reason,
      earlyExposure:
        assignment.mode === "exam" &&
        reason !== "locked" &&
        now < Date.parse(assignment.closesAt),
    };
  });
}
