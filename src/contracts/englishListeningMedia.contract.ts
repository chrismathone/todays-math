/** L0 only: separate from the existing 4MiB text importer; no deployed routes. */
import { z } from "zod";

const safeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const listeningMediaIdSchema = z.uuid();
export const listeningMediaSha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const listeningMediaMimeSchema = z.enum(["audio/wav", "audio/mpeg"]);
export const listeningMediaUploadSchema = z.strictObject({
  setId: listeningMediaIdSchema,
  totalBytes: safeInteger.min(1),
  mimeType: listeningMediaMimeSchema,
  expectedSha256: listeningMediaSha256Schema,
});
export const listeningMediaChunkSchema = z.strictObject({
  setId: listeningMediaIdSchema,
  assetId: listeningMediaIdSchema,
  expectedRevision: safeInteger,
  offset: safeInteger,
  byteLength: safeInteger.min(1),
  sha256: listeningMediaSha256Schema,
});
export const listeningMediaCompleteSchema = z.strictObject({
  setId: listeningMediaIdSchema,
  assetId: listeningMediaIdSchema,
  expectedRevision: safeInteger,
});
export const listeningMediaRequestSchema = z.strictObject({
  setId: listeningMediaIdSchema,
  assetId: listeningMediaIdSchema,
  method: z.enum(["GET", "HEAD"]),
  range: z.string().max(200).nullable().optional(),
});
export const listeningMediaAssetSchema = z.strictObject({
  setId: listeningMediaIdSchema,
  assetId: listeningMediaIdSchema,
});
export const listeningMediaBlockerSchema = z.enum([
  "mp3_decoder_and_scrubber_unavailable",
  "type_signature_mismatch",
  "unsupported_or_invalid_wave",
  "duration_limit",
]);
/**
 * Owner/branch of the listening set an asset belongs to, as the server reads it from the
 * trusted set row. It is never accepted from an upload or playback request body.
 */
export const listeningMediaScopeSchema = z.strictObject({
  ownerId: listeningMediaIdSchema,
  branchId: listeningMediaIdSchema.nullable(),
});
export type ListeningMediaScope = z.infer<typeof listeningMediaScopeSchema>;
const receiptFields = {
  setId: listeningMediaIdSchema,
  assetId: listeningMediaIdSchema,
  revision: safeInteger,
  receivedBytes: safeInteger,
  totalBytes: safeInteger.min(1),
  chunkBytes: safeInteger.min(1),
  uploadExpiresAt: safeInteger,
};
export const listeningMediaUploadReceiptSchema = z.strictObject({
  ...receiptFields,
  state: z.literal("uploading"),
});
/** Completion carries the stored scope and the server clock at verification, not request data. */
const completionFields = {
  ...receiptFields,
  ...listeningMediaScopeSchema.shape,
  verifiedAt: safeInteger,
};
export const listeningMediaCompletionSchema = z.discriminatedUnion("state", [
  z.strictObject({
    ...completionFields,
    state: z.literal("ready"),
    publishable: z.literal(true),
    mimeType: z.literal("audio/wav"),
    sha256: listeningMediaSha256Schema,
    durationMs: safeInteger.min(1),
  }),
  z.strictObject({
    ...completionFields,
    state: z.literal("publish_blocked"),
    publishable: z.literal(false),
    blocker: listeningMediaBlockerSchema,
  }),
]);
export type ListeningMediaUpload = z.infer<typeof listeningMediaUploadSchema>;
export type ListeningMediaChunk = z.infer<typeof listeningMediaChunkSchema>;
export type ListeningMediaUploadReceipt = z.infer<
  typeof listeningMediaUploadReceiptSchema
>;
export type ListeningMediaCompletion = z.infer<
  typeof listeningMediaCompletionSchema
>;
export type ListeningMediaBlocker = z.infer<typeof listeningMediaBlockerSchema>;

/** Transport validation is not teacher/content/rights review or deployment approval. */
export const LISTENING_MEDIA_CAPABILITIES = Object.freeze({
  canonicalPcm16Wave: true,
  mp3SignatureDetectionOnly: true,
  mp3FullDecode: false,
  mp3MetadataScrubbing: false,
  productionPersistence: false,
});
