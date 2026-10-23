import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import type { PrismaClient, Prisma } from "@prisma/client";
import {
  MATH_ONTOLOGY_HASH_KEYS,
  mathOntologyArtifactSchema,
  type MathOntologyArtifact,
} from "@/contracts/mathOntology.contract";
import { ontologyActionDigestSchema } from "@/contracts/mathOntologyAction.contract";
import { canonicalBytes, digest } from "../actions/canonical";
import { requireOperation } from "../actions/errors";

export const ONTOLOGY_CHUNK_BYTES = 512 * 1024;
export const ONTOLOGY_MAX_GZIP_BYTES = 256 * 1024 * 1024;
export const ONTOLOGY_MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const integer = z.number().int().nonnegative();
const referenceSchema = z.object({
  jobId: z.uuid(),
  inputHash: ontologyActionDigestSchema,
  leaseGeneration: integer.positive(),
  scopeKey: z.string().min(1).max(200),
  gzipHash: ontologyActionDigestSchema,
  chunkCount: integer.min(1).max(512),
  totalBytes: integer.min(1).max(ONTOLOGY_MAX_GZIP_BYTES),
});
export type OntologyStagedArtifactRef = z.infer<typeof referenceSchema>;
const metadataSchema = referenceSchema
  .extend({
    chunkIndex: integer,
    chunkHash: ontologyActionDigestSchema,
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
const chunkSchema = metadataSchema.extend({
  bytesBase64: z
    .string()
    .min(4)
    .max(700000)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
type Metadata = z.infer<typeof metadataSchema>;
const byteHash = (bytes: Uint8Array): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

/** Python equivalent: json.dumps(meta, sort_keys=True, separators=(',',':'),
 * ensure_ascii=False), ASCII metadata keys/opaque ids only; no base64 body.
 */
export function stageSignature(key: string | Uint8Array, metadata: Metadata) {
  return createHmac("sha256", key)
    .update("todaymath.ontology.stage.v1\n" + canonicalBytes(metadata))
    .digest("hex");
}

export function createOntologyStageStore(deps: {
  db: Pick<PrismaClient, "$transaction">;
  key: string | Uint8Array;
  now?: () => Date;
  /** The formal engine verifies graph identity, proofs and declared profile. */
  verifyArtifact: (
    artifact: MathOntologyArtifact,
  ) => Promise<MathOntologyArtifact>;
}) {
  requireOperation(deps.key.length >= 32, "UNAVAILABLE");
  const now = deps.now ?? (() => new Date());
  async function job(
    tx: Prisma.TransactionClient,
    ref: OntologyStagedArtifactRef,
    forStaging: boolean,
  ) {
    await tx.$queryRaw`SELECT id FROM ontology_compile_job WHERE id = ${ref.jobId}::uuid FOR SHARE`;
    const row = await tx.ontologyCompileJob.findUnique({
      where: { id: ref.jobId },
    });
    requireOperation(
      row &&
        row.scopeKey === ref.scopeKey &&
        row.inputManifestHash === ref.inputHash &&
        row.leaseGeneration === ref.leaseGeneration,
      "STALE",
    );
    requireOperation(
      forStaging
        ? row.state === "leased"
        : ["leased", "ready", "published"].includes(row.state),
      "STALE",
    );
    requireOperation(
      row.state === "published" || (row.leaseUntil && row.leaseUntil > now()),
      "STALE",
    );
    return row;
  }
  return {
    async accept(raw: unknown, signature: string | null) {
      const input = chunkSchema.parse(raw);
      const { bytesBase64, ...meta } = input;
      requireOperation(
        signature &&
          /^[a-f0-9]{64}$/.test(signature) &&
          timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(stageSignature(deps.key, meta), "hex"),
          ),
        "FORBIDDEN",
      );
      requireOperation(Date.parse(meta.expiresAt) > now().getTime(), "EXPIRED");
      const bytes = Buffer.from(bytesBase64, "base64");
      requireOperation(
        meta.chunkIndex < meta.chunkCount &&
          meta.chunkCount === Math.ceil(meta.totalBytes / ONTOLOGY_CHUNK_BYTES),
        "BINDING_MISMATCH",
      );
      const expectedLength =
        meta.chunkIndex === meta.chunkCount - 1
          ? meta.totalBytes - (meta.chunkCount - 1) * ONTOLOGY_CHUNK_BYTES
          : ONTOLOGY_CHUNK_BYTES;
      requireOperation(
        bytes.length === expectedLength && byteHash(bytes) === meta.chunkHash,
        "BINDING_MISMATCH",
      );
      return deps.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM ontology_compile_job WHERE id = ${meta.jobId}::uuid FOR UPDATE`;
        const current = await job(tx, meta, true);
        requireOperation(
          Date.parse(meta.expiresAt) <= current.leaseUntil!.getTime(),
          "STALE",
        );
        const where = {
          jobId_leaseGeneration_chunkIndex: {
            jobId: meta.jobId,
            leaseGeneration: meta.leaseGeneration,
            chunkIndex: meta.chunkIndex,
          },
        };
        const existing = await tx.ontologyArtifactChunk.findUnique({ where });
        if (existing) {
          requireOperation(
            existing.leaseGeneration === meta.leaseGeneration &&
              existing.chunkHash === meta.chunkHash &&
              existing.gzipHash === meta.gzipHash &&
              existing.chunkCount === meta.chunkCount &&
              existing.totalBytes === meta.totalBytes &&
              byteHash(existing.bytes) === meta.chunkHash,
            "BINDING_MISMATCH",
          );
          return { accepted: true as const };
        }
        await tx.ontologyArtifactChunk.create({
          data: {
            jobId: meta.jobId,
            chunkIndex: meta.chunkIndex,
            scopeKey: meta.scopeKey,
            inputHash: meta.inputHash,
            leaseGeneration: meta.leaseGeneration,
            chunkCount: meta.chunkCount,
            totalBytes: meta.totalBytes,
            gzipHash: meta.gzipHash,
            chunkHash: meta.chunkHash,
            bytes,
          },
        });
        return { accepted: true as const };
      });
    },
    async readVerified(raw: unknown): Promise<MathOntologyArtifact> {
      const ref = referenceSchema.parse(raw);
      const rows = await deps.db.$transaction(async (tx) => {
        await job(tx, ref, false);
        return tx.ontologyArtifactChunk.findMany({
          where: { jobId: ref.jobId, leaseGeneration: ref.leaseGeneration },
          orderBy: { chunkIndex: "asc" },
        });
      });
      requireOperation(rows.length === ref.chunkCount, "BINDING_MISMATCH");
      rows.forEach((row, index) =>
        requireOperation(
          row.chunkIndex === index &&
            row.scopeKey === ref.scopeKey &&
            row.inputHash === ref.inputHash &&
            row.leaseGeneration === ref.leaseGeneration &&
            row.gzipHash === ref.gzipHash &&
            row.chunkCount === ref.chunkCount &&
            row.totalBytes === ref.totalBytes &&
            byteHash(row.bytes) === row.chunkHash,
          "BINDING_MISMATCH",
        ),
      );
      const compressed = Buffer.concat(
        rows.map((row) => Buffer.from(row.bytes)),
      );
      requireOperation(
        compressed.length === ref.totalBytes &&
          compressed.length <= ONTOLOGY_MAX_GZIP_BYTES &&
          byteHash(compressed) === ref.gzipHash,
        "BINDING_MISMATCH",
      );
      const bytes = gunzipSync(compressed, {
        maxOutputLength: ONTOLOGY_MAX_ARTIFACT_BYTES,
      });
      const artifact = mathOntologyArtifactSchema.parse(
        JSON.parse(bytes.toString("utf8")),
      );
      requireOperation(
        MATH_ONTOLOGY_HASH_KEYS.every(
          (k) => digest(artifact.files[k]) === artifact.identity.hashes[k],
        ),
        "BINDING_MISMATCH",
      );
      return deps.verifyArtifact(artifact);
    },
  };
}
