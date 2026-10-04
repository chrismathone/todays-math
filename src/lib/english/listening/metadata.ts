import {
  listeningQuestionMetadataSchema,
  type ListeningQuestionMetadata,
} from "@/contracts/englishListeningMetadata.contract";
import type { ListeningAssessmentSource } from "@/contracts/englishListeningSource.contract";

/** Existing imported provenance survives assembly and later edits. Unknown values stay null. */
export function listeningQuestionMetadata(
  question: {
    metadata?: ListeningQuestionMetadata;
    sourceNumber?: number;
    image?: unknown;
  },
  context: { source?: ListeningAssessmentSource; level: string | null },
): ListeningQuestionMetadata {
  if (question.metadata)
    return listeningQuestionMetadataSchema.parse(question.metadata);
  return listeningQuestionMetadataSchema.parse({
    schemaVersion: 1,
    origin:
      context.source && question.image
        ? "official_original"
        : "teacher_authored",
    sourceRecordId: null,
    assessmentKind: context.source?.kind ?? null,
    provider: context.source?.provider ?? null,
    year: context.source?.year ?? null,
    round: context.source?.round ?? null,
    month: context.source?.month ?? null,
    level: context.level,
    sourceNumber: question.sourceNumber ?? null,
    sourceAudioSha256: null,
    sourceQuestionSha256: null,
    questionType: "unknown",
    topics: [],
    keywords: [],
    classification: { method: "unclassified", model: null, confidence: null },
    reconstruction: null,
  });
}
