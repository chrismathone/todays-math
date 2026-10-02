/** L0 service composition. Inputs/reviews and the readiness reader must be server-owned.
 * Persist the returned snapshot atomically against the source revision in the future
 * repository adapter; this function does not authenticate a route or commit a row. */
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
  const verifiedMedia: VerifiedListeningMedia[] = [];
  for (const group of document.groups) {
    // The media service reauthorizes publishing before looking up its stored receipt.
    const readiness = listeningMediaCompletionSchema.parse(
      await readVerifiedMedia({
        setId: document.id,
        assetId: group.audio.assetId,
      }),
    );
    if (
      readiness.state !== "ready" ||
      readiness.setId !== document.id ||
      readiness.assetId !== group.audio.assetId
    )
      throw new Error("Listening media is not ready for this publication");
    verifiedMedia.push({
      assetId: readiness.assetId,
      sha256: readiness.sha256,
      durationMs: readiness.durationMs,
      readiness: "ready",
      ownerId: document.ownerId,
      branchId: document.branchId,
      verifiedAt: options.publishedAt,
    });
  }
  return publishListeningDocument(document, { ...options, verifiedMedia });
}
