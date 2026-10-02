/** Deterministic L0 state machine, not a database transaction.
 * The server must authorize and load all state/context; atomically persist the result with
 * WHERE revision = command.expectedRevision and a unique (attemptId, idempotencyKey).
 * Persist receipts with answers in the same transaction. A pure reducer cannot arbitrate DB races.
 */
import { z } from "zod";
import {
  englishListeningAssignmentSchema,
  englishListeningAttemptSchema,
  englishListeningBroadcastSchema,
  listeningAnswerSchema,
  listeningAttemptCommandSchema,
  type EnglishListeningAttempt,
} from "@/contracts/englishListening.contract";
import {
  freezeListeningValue,
  listeningValueHash,
  validateListeningPublication,
} from "./publication";
import {
  assertListeningBinding,
  decideListeningRelease,
  listeningReleaseContextSchema,
} from "./release";

const createOptionsSchema = z.strictObject({
  id: z.uuid(),
  studentId: z.uuid(),
  now: z.iso.datetime(),
  previousAttempt: englishListeningAttemptSchema.optional(),
  retryAuthorization: z
    .strictObject({
      authorizedBy: z.uuid(),
      reason: z
        .string()
        .min(1)
        .max(1000)
        .refine((value) => value.trim().length > 0),
    })
    .optional(),
});
export function createListeningAttempt(
  publicationInput: unknown,
  assignmentInput: unknown,
  optionsInput: z.infer<typeof createOptionsSchema>,
): EnglishListeningAttempt {
  const publication = validateListeningPublication(publicationInput);
  const assignment = englishListeningAssignmentSchema.parse(assignmentInput);
  const options = createOptionsSchema.parse(optionsInput);
  assertListeningBinding(publication, assignment, null);
  if (!assignment.targetStudentIds.includes(options.studentId))
    throw new Error("Student not assigned");
  if (
    Date.parse(options.now) < Date.parse(assignment.opensAt) ||
    Date.parse(options.now) >= Date.parse(assignment.closesAt)
  )
    throw new Error("Assignment outside open window");
  const previous = options.previousAttempt;
  if (Boolean(previous) !== Boolean(options.retryAuthorization))
    throw new Error(
      "Retry requires teacher authorization and previous attempt",
    );
  if (
    previous &&
    (previous.id === options.id ||
      previous.studentId !== options.studentId ||
      previous.publicationId !== publication.id ||
      !["interrupted", "expired", "cancelled"].includes(previous.status))
  )
    throw new Error("Invalid retry link");
  return freezeListeningValue(
    englishListeningAttemptSchema.parse({
      schemaVersion: 1,
      id: options.id,
      assignmentId: assignment.id,
      assignmentRevision: assignment.revision,
      publicationId: publication.id,
      studentId: options.studentId,
      status: "ready",
      revision: 1,
      createdAt: options.now,
      updatedAt: options.now,
      startedAt: null,
      deadlineAt: null,
      submittedAt: null,
      broadcastSessionId: null,
      firstAnswers: [],
      reviewAnswers: [],
      interruption: null,
      receipts: [],
      retry: previous
        ? { previousAttemptId: previous.id, ...options.retryAuthorization }
        : null,
    }),
  );
}

const transitionContextSchema = z.strictObject({
  ...listeningReleaseContextSchema.shape,
  soundChecked: z.boolean().optional(),
  audioReady: z.boolean().optional(),
  broadcast: englishListeningBroadcastSchema.optional(),
});
export type ListeningAttemptContext = z.infer<typeof transitionContextSchema>;

export function transitionListeningAttempt(
  publicationInput: unknown,
  assignmentInput: unknown,
  attemptInput: unknown,
  commandInput: unknown,
  contextInput: ListeningAttemptContext,
): EnglishListeningAttempt {
  const publication = validateListeningPublication(publicationInput);
  const assignment = englishListeningAssignmentSchema.parse(assignmentInput);
  const attempt = englishListeningAttemptSchema.parse(attemptInput);
  const command = listeningAttemptCommandSchema.parse(commandInput);
  const context = transitionContextSchema.parse(contextInput);
  // Only an independently authorized administrative cancellation may record revocation.
  // Reads, answers and submissions continue to reject revoked state, including receipt replay.
  assertListeningBinding(publication, assignment, attempt, {
    allowCancellationTransition: command.kind === "cancel",
  });
  const commandHash = listeningValueHash(command);
  const receipt = attempt.receipts.find(
    (receipt) => receipt.key === command.idempotencyKey,
  );
  // Replay accepted requests even after the deadline. Authorization was still checked above.
  if (receipt) {
    if (receipt.commandHash !== commandHash)
      throw new Error("Idempotency key reused with another command");
    return freezeListeningValue(attempt);
  }
  if (attempt.revision !== command.expectedRevision)
    throw new Error("Attempt revision conflict");
  const now = Date.parse(context.now);
  if (now < Date.parse(attempt.updatedAt))
    throw new Error("Server clock moved backwards");
  // Released post-submission review has its own answer collection. Initial answers, the
  // original submission timestamp, and its grade remain immutable even after the deadline.
  const postSubmissionReview =
    attempt.status === "submitted" &&
    command.kind === "answer" &&
    command.phase === "review";
  if (
    (attempt.status === "submitted" && !postSubmissionReview) ||
    attempt.status === "cancelled" ||
    attempt.status === "expired" ||
    attempt.status === "interrupted"
  )
    throw new Error("Terminal attempt cannot change");
  const deadline = Math.min(
    Date.parse(assignment.closesAt),
    attempt.deadlineAt ? Date.parse(attempt.deadlineAt) : Infinity,
  );
  if (command.kind === "expire") {
    if (attempt.status !== "in_progress" || now < deadline)
      throw new Error("Deadline has not elapsed");
    attempt.status = "expired";
  } else if (command.kind === "cancel") {
    attempt.status = "cancelled";
  } else {
    if (
      now < Date.parse(assignment.opensAt) ||
      (!postSubmissionReview && now >= deadline)
    )
      throw new Error("Outside attempt window/deadline");
    switch (command.kind) {
      case "start": {
        if (attempt.status !== "ready")
          throw new Error("Attempt already started");
        if (assignment.audioSource === "teacher_device") {
          const broadcast = context.broadcast;
          if (!broadcast) throw new Error("Teacher broadcast not ready");
          if (
            broadcast.assignmentId !== assignment.id ||
            broadcast.publicationId !== publication.id ||
            !broadcast.participantStudentIds.includes(attempt.studentId) ||
            broadcast.participantStudentIds.some(
              (studentId) => !assignment.targetStudentIds.includes(studentId),
            )
          )
            throw new Error("Broadcast binding mismatch");
          const start = Date.parse(broadcast.startedAt);
          const end = Date.parse(broadcast.deadlineAt);
          const limit = Math.min(
            Date.parse(assignment.closesAt),
            assignment.timeLimitSeconds === null
              ? Infinity
              : start + assignment.timeLimitSeconds * 1000,
          );
          if (
            start < Date.parse(assignment.opensAt) ||
            start > now ||
            end > limit ||
            end <= now
          )
            throw new Error("Invalid broadcast server clock/deadline");
          attempt.startedAt = broadcast.startedAt;
          attempt.deadlineAt = broadcast.deadlineAt;
          attempt.broadcastSessionId = broadcast.id;
        } else {
          if (context.soundChecked !== true || context.audioReady !== true)
            throw new Error("Playback not ready");
          attempt.startedAt = context.now;
          attempt.deadlineAt = new Date(
            Math.min(
              Date.parse(assignment.closesAt),
              assignment.timeLimitSeconds === null
                ? Infinity
                : now + assignment.timeLimitSeconds * 1000,
            ),
          ).toISOString();
        }
        attempt.status = "in_progress";
        break;
      }
      case "answer": {
        if (attempt.status !== "in_progress" && !postSubmissionReview)
          throw new Error("Attempt not in progress");
        const group = publication.document.groups.find((group) =>
          group.questions.some(
            (question) => question.id === command.questionId,
          ),
        );
        const question = group?.questions.find(
          (question) => question.id === command.questionId,
        );
        if (
          !question ||
          !question.choices.some((choice) => choice.id === command.choiceId)
        )
          throw new Error("Invalid answer reference");
        if (command.phase === "initial") {
          if (
            attempt.firstAnswers.some(
              (answer) => answer.questionId === command.questionId,
            )
          )
            throw new Error("First answer is immutable");
          attempt.firstAnswers.push({
            questionId: command.questionId,
            choiceId: command.choiceId,
            savedAt: context.now,
            savedAfterRelease: decideListeningRelease(
              publication,
              assignment,
              attempt,
              {
                now: context.now,
                studentId: attempt.studentId,
                manualRelease: context.manualRelease,
                releaseHistory: context.releaseHistory,
              },
            ).some(
              (release) => release.groupId === group!.id && release.released,
            ),
          });
        } else {
          const releases = decideListeningRelease(
            publication,
            assignment,
            attempt,
            {
              now: context.now,
              manualRelease: context.manualRelease,
              releaseHistory: context.releaseHistory,
            },
          );
          if (
            !releases.find((release) => release.groupId === group!.id)?.released
          )
            throw new Error("Review unit has not been released");
          if (
            !attempt.firstAnswers.some(
              (answer) => answer.questionId === command.questionId,
            )
          )
            throw new Error("Review requires a first answer");
          attempt.reviewAnswers = [
            ...attempt.reviewAnswers.filter(
              (answer) => answer.questionId !== command.questionId,
            ),
            {
              questionId: command.questionId,
              choiceId: command.choiceId,
              savedAt: context.now,
              savedAfterRelease: true,
            },
          ];
        }
        break;
      }
      case "submit":
        if (attempt.status !== "in_progress")
          throw new Error("Attempt not in progress");
        attempt.status = "submitted";
        attempt.submittedAt = context.now;
        break;
      case "interrupt":
        if (attempt.status !== "in_progress")
          throw new Error("Attempt not in progress");
        if (
          (assignment.audioSource === "teacher_device" &&
            command.reason === "student_playback") ||
          (assignment.audioSource === "student_device" &&
            command.reason === "teacher_broadcast")
        )
          throw new Error("Interruption source mismatch");
        attempt.status = "interrupted";
        attempt.interruption = { reason: command.reason, at: context.now };
        break;
    }
  }
  attempt.revision++;
  attempt.updatedAt = context.now;
  attempt.receipts.push({
    key: command.idempotencyKey,
    commandHash,
    acceptedRevision: attempt.revision,
  });
  return freezeListeningValue(englishListeningAttemptSchema.parse(attempt));
}

/** Pure MC scoring of the explicitly supplied answer set. No provider calls or inferred ability grade. */
export function gradeListeningAnswers(
  publicationInput: unknown,
  answersInput: unknown,
) {
  const publication = validateListeningPublication(publicationInput);
  const answers = z.array(listeningAnswerSchema).max(900).parse(answersInput);
  const questions = publication.document.groups.flatMap(
    (group) => group.questions,
  );
  if (
    new Set(answers.map((answer) => answer.questionId)).size !== answers.length
  )
    throw new Error("Duplicate answer");
  for (const answer of answers) {
    if (
      !questions.some(
        (question) =>
          question.id === answer.questionId &&
          question.choices.some((choice) => choice.id === answer.choiceId),
      )
    )
      throw new Error("Invalid answer reference");
  }
  const items = questions.map((question) => {
    const answer = answers.find((answer) => answer.questionId === question.id);
    return {
      questionId: question.id,
      result: !answer
        ? ("unanswered" as const)
        : answer.choiceId === question.answerChoiceId
          ? ("correct" as const)
          : ("incorrect" as const),
    };
  });
  return freezeListeningValue({
    total: items.length,
    correct: items.filter((item) => item.result === "correct").length,
    incorrect: items.filter((item) => item.result === "incorrect").length,
    unanswered: items.filter((item) => item.result === "unanswered").length,
    savedAfterRelease: answers.filter(
      (answer) => answer.savedAfterRelease === true,
    ).length,
    releaseStatusUnknown: answers.filter(
      (answer) => answer.savedAfterRelease === undefined,
    ).length,
    items,
  });
}
