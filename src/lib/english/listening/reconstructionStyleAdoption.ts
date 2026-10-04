import {
  listeningDraftSchema,
  listeningUpdateSetSchema,
  type ListeningDraft,
} from "@/contracts/englishListeningHttp.contract";
import { listeningValueHash } from "./publication";

type Editable = Omit<
  ReturnType<typeof listeningUpdateSetSchema.parse>,
  "expectedRevision"
>;
type Question = ListeningDraft["groups"][number]["questions"][number];
const same = (a: unknown, b: unknown) =>
  listeningValueHash(a) === listeningValueHash(b);
function fail(message: string): never {
  throw Error("Listening style adoption: " + message);
}
function provenance(question: Question) {
  const metadata = question.metadata;
  return {
    id: question.id,
    sourceNumber: question.sourceNumber ?? null,
    answerChoiceId: question.answerChoiceId,
    choiceIds: question.choices.map((choice) => choice.id),
    instruction: question.instruction ?? null,
    image: question.image ?? null,
    audioRange: question.audioRange ?? null,
    evidence: question.evidence,
    metadata: metadata
      ? {
          schemaVersion: metadata.schemaVersion,
          origin: metadata.origin,
          sourceRecordId: metadata.sourceRecordId,
          assessmentKind: metadata.assessmentKind,
          provider: metadata.provider,
          year: metadata.year,
          round: metadata.round,
          month: metadata.month,
          level: metadata.level,
          sourceNumber: metadata.sourceNumber,
          sourceAudioSha256: metadata.sourceAudioSha256,
          sourceQuestionSha256: metadata.sourceQuestionSha256,
          reconstructionAudioSha256:
            metadata.reconstruction?.sourceAudioSha256 ?? null,
        }
      : null,
  };
}
function withoutQuestions(document: ListeningDraft) {
  const { revision, ...rest } = document;
  void revision;
  return {
    ...rest,
    groups: rest.groups.map(({ questions, ...group }) => {
      void questions;
      return group;
    }),
  };
}

/** Applies only qualified text edits to the exact unreviewed snapshot, preserving media and IDs. */
export function prepareListeningStyleAdoption(input: {
  current: unknown;
  expected: unknown;
  baseline: unknown;
  proposed: unknown;
  eligibleQuestionIds: string[];
  publicationCount: number;
}) {
  const current = listeningDraftSchema.parse(input.current);
  const expected = listeningDraftSchema.parse(input.expected);
  const editableSchema = listeningUpdateSetSchema.omit({
    expectedRevision: true,
  });
  const baseline = editableSchema.parse(input.baseline);
  const proposed = editableSchema.parse(input.proposed);
  if (
    input.publicationCount !== 0 ||
    current.groups.some(
      (group) =>
        group.reviews.content || group.reviews.audio || group.reviews.alignment,
    )
  )
    fail("published or human reviewed material is preserved");
  if (
    current.id !== expected.id ||
    current.ownerId !== expected.ownerId ||
    current.branchId !== expected.branchId ||
    !same(withoutQuestions(current), withoutQuestions(expected))
  )
    fail("snapshot ownership, source, media, transcript or rights changed");
  const { groups: baselineGroups, ...baselineFields } = baseline;
  const { groups: proposedGroups, ...proposedFields } = proposed;
  if (
    !same(baselineFields, proposedFields) ||
    baselineGroups.length !== proposedGroups.length ||
    baselineGroups.length !== expected.groups.length
  )
    fail("style revision cannot alter set fields or groups");
  const eligible = new Set(input.eligibleQuestionIds);
  if (eligible.size !== input.eligibleQuestionIds.length)
    fail("duplicate qualified question IDs");
  const qualified: Question[] = [];
  const targetGroups = expected.groups.map((group, groupIndex) => {
    const before = baselineGroups[groupIndex];
    const after = proposedGroups[groupIndex];
    const { questions: oldQuestions, ...beforeBinding } = before;
    const { questions: proposedQuestions, ...afterBinding } = after;
    if (
      group.id !== before.id ||
      !same(beforeBinding, afterBinding) ||
      !same(group.questions, oldQuestions) ||
      oldQuestions.length !== proposedQuestions.length
    )
      fail("baseline questions or immutable group binding changed");
    return {
      ...group,
      questions: oldQuestions.map((previous, index) => {
        const next = proposedQuestions[index];
        if (
          previous.metadata?.origin !== "audio_reconstructed" ||
          !previous.metadata.reconstruction ||
          !next.metadata?.reconstruction ||
          !same(provenance(previous), provenance(next))
        )
          fail("question identities, answers or source provenance changed");
        if (!eligible.has(previous.id)) {
          if (!same(previous, next))
            fail("an unqualified question was changed");
          return previous;
        }
        if (
          !/[가-힣]/.test(next.prompt) ||
          next.metadata.questionType === "visual" ||
          next.image ||
          (previous.metadata.reconstruction.verification === "needs_review" &&
            next.metadata.reconstruction.verification !== "needs_review")
        )
          fail(
            "style edit cannot invent visuals or promote prior review status",
          );
        qualified.push(next);
        return next;
      }),
    };
  });
  if (qualified.length !== eligible.size)
    fail("qualified IDs do not identify the complete proposed changes");
  const targetQuestions = targetGroups.map((group) => group.questions);
  const currentQuestions = current.groups.map((group) => group.questions);
  const alreadyApplied = same(currentQuestions, targetQuestions);
  if (!alreadyApplied && !same(current, expected))
    fail("live snapshot changed after export");
  const update: Editable = {
    title: current.title,
    level: current.level,
    examId: current.examId,
    rights: current.rights,
    basis: current.provenance.basis,
    groups: targetGroups.map((group) => ({
      id: group.id,
      audio: group.audio,
      transcript: group.transcript,
      questions: group.questions,
    })),
  };
  editableSchema.parse(update);
  return {
    current,
    update,
    alreadyApplied,
    qualifiedQuestionIds: qualified.map((question) => question.id),
    beforeHash: listeningValueHash(current),
    afterQuestionHash: listeningValueHash(targetQuestions),
  };
}
