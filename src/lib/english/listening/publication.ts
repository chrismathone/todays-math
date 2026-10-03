/** Server domain boundary. Only trusted persisted reviews/rights/media may enter publication.
 * L0 hashes detect stale/tampered content; they are not signatures or authorization. */
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  englishListeningDocumentSchema,
  englishListeningPublicationSchema,
  listeningAudioRefSchema,
  type EnglishListeningDocument,
  type EnglishListeningPublication,
} from "@/contracts/englishListening.contract";

export function freezeListeningValue<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeListeningValue);
    Object.freeze(value);
  }
  return value;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function listeningValueHash(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function listeningContentHash(input: unknown): string {
  const document = englishListeningDocumentSchema.parse(input);
  // Reviews sign this content, so must be excluded from their own digest.
  return listeningValueHash({
    ...document,
    groups: document.groups.map((group) => ({
      id: group.id,
      audio: group.audio,
      transcript: group.transcript,
      questions: group.questions,
    })),
  });
}

function assertReviews(
  document: EnglishListeningDocument,
  contentHash: string,
  publishedAt: string,
) {
  if (
    document.rights.rightsStatus !== "approved" ||
    !["store_original", "teacher_review", "distribution"].every((use) =>
      document.rights.allowedUses.some((allowed) => allowed === use),
    ) ||
    !document.rightsReview
  )
    throw new Error("Publication requires confirmed distribution rights");
  if (
    Date.parse(document.rightsReview.confirmedAt) > Date.parse(publishedAt) ||
    Date.parse(document.provenance.recordedAt) > Date.parse(publishedAt)
  )
    throw new Error("Future provenance");
  for (const group of document.groups) {
    for (const review of [
      group.reviews.content,
      group.reviews.audio,
      group.reviews.alignment,
    ]) {
      if (
        !review ||
        review.revision !== document.revision ||
        review.contentHash !== contentHash ||
        Date.parse(review.reviewedAt) > Date.parse(publishedAt)
      )
        throw new Error("Missing or stale review");
    }
    for (const review of [group.reviews.audio, group.reviews.alignment]) {
      if (
        !review ||
        review.assetId !== group.audio.assetId ||
        review.sha256 !== group.audio.sha256 ||
        review.transcriptRevision !== group.transcript.revision
      )
        throw new Error("Stale audio/alignment review");
    }
  }
}

/** Must be projected from the media verifier's persisted readiness record, never a request body. */
export const verifiedListeningMediaSchema = z.strictObject({
  ...listeningAudioRefSchema.shape,
  readiness: z.literal("ready"),
  ownerId: z.uuid(),
  branchId: z.uuid().nullable(),
  verifiedAt: z.iso.datetime(),
});
export type VerifiedListeningMedia = z.infer<
  typeof verifiedListeningMediaSchema
>;
const publicationOptionsSchema = z.strictObject({
  id: z.uuid(),
  publishedAt: z.iso.datetime(),
  verifiedMedia: z.array(verifiedListeningMediaSchema).min(1).max(30),
});
export function publishListeningDocument(
  input: unknown,
  options: z.infer<typeof publicationOptionsSchema>,
): EnglishListeningPublication {
  const document = englishListeningDocumentSchema.parse(input);
  const trusted = publicationOptionsSchema.parse(options);
  const contentHash = listeningContentHash(document);
  assertReviews(document, contentHash, trusted.publishedAt);
  if (
    new Set(trusted.verifiedMedia.map((media) => media.assetId)).size !==
      trusted.verifiedMedia.length ||
    trusted.verifiedMedia.length !== document.groups.length
  )
    throw new Error("Invalid verified media set");
  for (const group of document.groups) {
    const media = trusted.verifiedMedia.find(
      (media) => media.assetId === group.audio.assetId,
    );
    if (
      !media ||
      media.sha256 !== group.audio.sha256 ||
      media.durationMs !== group.audio.durationMs ||
      media.ownerId !== document.ownerId ||
      media.branchId !== document.branchId ||
      Date.parse(media.verifiedAt) > Date.parse(trusted.publishedAt)
    )
      throw new Error("Unverified media reference/readiness/scope");
  }
  return freezeListeningValue(
    englishListeningPublicationSchema.parse({
      schemaVersion: 1,
      id: trusted.id,
      publishedAt: trusted.publishedAt,
      contentHash,
      document,
    }),
  );
}

/** Validate on read too. Never coerce unsupported schemas or accept a stale review. */
export function validateListeningPublication(
  input: unknown,
): EnglishListeningPublication {
  const publication = englishListeningPublicationSchema.parse(input);
  if (listeningContentHash(publication.document) !== publication.contentHash)
    throw new Error("Publication content hash mismatch");
  assertReviews(
    publication.document,
    publication.contentHash,
    publication.publishedAt,
  );
  return freezeListeningValue(publication);
}
