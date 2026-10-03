/** L0 service composition. Inputs/reviews and the readiness reader must be server-owned.
 * Persist the returned snapshot atomically against the source revision in the future
 * repository adapter; this function does not authenticate a route or commit a row.
 *
 * The media service's readiness record is the only source of the asset's owner, branch and
 * verification time. Nothing here is synthesized from the document or the request. */
import { englishListeningDocumentSchema } from "@/contracts/englishListening.contract";
import { listeningMediaCompletionSchema } from "@/contracts/englishListeningMedia.contract";
import {
  publishListeningDocument,
  type VerifiedListeningMedia,
} from "./publication";

export async function publishListeningWithVerifiedMedia(
  documentInput: unknown,
  options: { id: string; publishedAt: string },
  readVerifiedMedia: (target: {
    setId: string;
    assetId: string;
  }) => Promise<unknown>,
) {
  const document = englishListeningDocumentSchema.parse(documentInput);
  const publishedAt = Date.parse(options.publishedAt);
  const verifiedMedia: VerifiedListeningMedia[] = [];
  for (const group of document.groups) {
    // The media service reauthorizes publishing and re-resolves the set scope before reading its record.
    const stored = await readVerifiedMedia({
      setId: document.id,
      assetId: group.audio.assetId,
    });
    if (stored === null || stored === undefined)
      throw new Error("Listening media is not ready for this publication");
    const readiness = listeningMediaCompletionSchema.parse(stored);
    if (
      readiness.state !== "ready" ||
      readiness.setId !== document.id ||
      readiness.assetId !== group.audio.assetId
    )
      throw new Error("Listening media is not ready for this publication");
    if (
      readiness.ownerId !== document.ownerId ||
      readiness.branchId !== document.branchId
    )
      throw new Error("Listening media scope does not match this document");
    if (!Number.isFinite(publishedAt) || readiness.verifiedAt > publishedAt)
      throw new Error(
        "Listening media was verified after the publication time",
      );
    verifiedMedia.push({
      assetId: readiness.assetId,
      sha256: readiness.sha256,
      durationMs: readiness.durationMs,
      readiness: "ready",
      ownerId: readiness.ownerId,
      branchId: readiness.branchId,
      verifiedAt: new Date(readiness.verifiedAt).toISOString(),
    });
  }
  return publishListeningDocument(document, { ...options, verifiedMedia });
}
