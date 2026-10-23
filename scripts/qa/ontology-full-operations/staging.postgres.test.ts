import { describe, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { db, now } from "./harness";
import { canonicalBytes, digest } from "@/lib/math-ontology/actions/canonical";
import {
  createOntologyStageStore,
  stageSignature,
} from "@/lib/math-ontology/publish/staging";
import {
  MATH_ONTOLOGY_HASH_KEYS,
  type MathOntologyArtifact,
} from "@/contracts/mathOntology.contract";
const key = "synthetic-test-stage-key-32-characters";
const bytesHash = (bytes: Uint8Array) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
function artifact() {
  const files = Object.fromEntries(
    MATH_ONTOLOGY_HASH_KEYS.map((k) => [
      k,
      k === "proof" ? "[]" : `synthetic-${k}`,
    ]),
  ) as MathOntologyArtifact["files"];
  const hashes = Object.fromEntries(
    MATH_ONTOLOGY_HASH_KEYS.map((k) => [k, digest(files[k])]),
  ) as MathOntologyArtifact["identity"]["hashes"];
  return {
    identity: {
      schemaVersion: 1,
      profile: "tm-owlrl-1",
      graphVersion: digest(canonicalBytes(hashes)),
      hashes,
    },
    files,
  } satisfies MathOntologyArtifact;
}
describe("HMAC-bound compiler chunk staging", () => {
  it("requires the correct purpose signature, live real job lease and exact chunk bytes before reassembly", async () => {
    const data = artifact(),
      compressed = gzipSync(canonicalBytes(data));
    const jobId = randomUUID(),
      inputHash = digest("synthetic-input"),
      expiresAt = new Date(now.getTime() + 60000).toISOString();
    await db.ontologyCompileJob.create({
      data: {
        id: jobId,
        scopeKey: "global",
        requestedBy: randomUUID(),
        inputCanonical: "{}",
        inputManifestHash: inputHash,
        approvedReviewStateHash: digest("[]"),
        expectedActiveGeneration: 0,
        engineLockHash: digest("lock"),
        state: "leased",
        leaseGeneration: 1,
        leaseUntil: new Date(expiresAt),
      },
    });
    const meta = {
      jobId,
      inputHash,
      leaseGeneration: 1,
      scopeKey: "global",
      chunkIndex: 0,
      chunkCount: 1,
      chunkHash: bytesHash(compressed),
      gzipHash: bytesHash(compressed),
      totalBytes: compressed.length,
      expiresAt,
    };
    const body = { ...meta, bytesBase64: compressed.toString("base64") };
    const store = createOntologyStageStore({
      db,
      key,
      now: () => now,
      verifyArtifact: async (value) => value,
    });
    await expect(store.accept(body, "0".repeat(64))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      store.accept(
        { ...body, scopeKey: "branch:foreign" },
        stageSignature(key, meta),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await store.accept(body, stageSignature(key, meta));
    await store.accept(body, stageSignature(key, meta));
    expect(await db.ontologyArtifactChunk.count({ where: { jobId } })).toBe(1);
    const ref = {
      jobId,
      inputHash,
      leaseGeneration: 1,
      scopeKey: "global",
      gzipHash: meta.gzipHash,
      chunkCount: 1,
      totalBytes: compressed.length,
    };
    expect(await store.readVerified(ref)).toEqual(data);
    await db.ontologyCompileJob.update({
      where: { id: jobId },
      data: { leaseGeneration: 2 },
    });
    await expect(
      store.accept(body, stageSignature(key, meta)),
    ).rejects.toMatchObject({ code: "STALE" });
    await expect(store.readVerified(ref)).rejects.toMatchObject({
      code: "STALE",
    });
  });
  it("rejects a correctly signed chunk whose digest is false and incomplete artifact references", async () => {
    const jobId = randomUUID(),
      inputHash = digest("input-2"),
      expiry = new Date(now.getTime() + 60000);
    await db.ontologyCompileJob.create({
      data: {
        id: jobId,
        scopeKey: "global",
        requestedBy: randomUUID(),
        inputCanonical: "{}",
        inputManifestHash: inputHash,
        approvedReviewStateHash: digest("[]"),
        expectedActiveGeneration: 0,
        engineLockHash: digest("lock"),
        state: "leased",
        leaseGeneration: 1,
        leaseUntil: expiry,
      },
    });
    const meta = {
      jobId,
      inputHash,
      leaseGeneration: 1,
      scopeKey: "global",
      chunkIndex: 0,
      chunkCount: 1,
      chunkHash: digest("false"),
      gzipHash: digest("false"),
      totalBytes: 3,
      expiresAt: expiry.toISOString(),
    };
    const store = createOntologyStageStore({
      db,
      key,
      now: () => now,
      verifyArtifact: async (value) => value,
    });
    await expect(
      store.accept({ ...meta, bytesBase64: "YWJj" }, stageSignature(key, meta)),
    ).rejects.toMatchObject({ code: "BINDING_MISMATCH" });
    await expect(store.readVerified(meta)).rejects.toThrow();
    expect(await db.ontologyArtifactChunk.count({ where: { jobId } })).toBe(0);
  });
});
