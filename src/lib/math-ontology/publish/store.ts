import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  mathOntologyArtifactSchema, mathOntologyGraphIdentitySchema,
  mathOntologyScopeSchema,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { createOntologyRuntimeFactory, verifyOntologyArtifact } from "../runtime/artifact";
import type { MathOntologyQuery } from "@/contracts/mathOntology.contract";
import { requireOperation } from "../actions/errors";

/** Called only after route/source authorization; never trusts client graph names. */
export async function lockActiveOntologyReleaseInTransaction(
  tx: Prisma.TransactionClient,
  scopeKey: string,
  graphVersion?: string,
) {
  mathOntologyScopeSchema.parse(scopeKey);
  await tx.$queryRaw`SELECT scope_key FROM ontology_active_graph WHERE scope_key = ${scopeKey} FOR SHARE`;
  const active = await tx.ontologyActiveGraph.findUnique({
    where: { scopeKey },
  });
  requireOperation(
    active?.graphVersion &&
      (!graphVersion || active.graphVersion === graphVersion),
    "STALE",
  );
  await tx.$queryRaw`SELECT graph_version FROM ontology_release WHERE graph_version = ${active.graphVersion} FOR SHARE`;
  const release = await tx.ontologyRelease.findUnique({
    where: { graphVersion: active.graphVersion },
    select: { graphVersion: true, scopeKey: true, revokedAt: true, artifactHash: true, identityCanonical: true },
  });
  requireOperation(
    release && release.scopeKey === scopeKey && !release.revokedAt,
    "STALE",
  );
  return { generation: active.generation, release };
}

const MAX_RELEASE_MANIFEST_BYTES = 8 * 1024 * 1024;
const runtimes = createOntologyRuntimeFactory(2);
async function readReleaseInTransaction(tx: Prisma.TransactionClient, scopeKey: string) {
    const active = await tx.ontologyActiveGraph.findUnique({
      where: { scopeKey },
    });
    if (!active?.graphVersion) return null;
    // Check the native length before fetching text. A full raw source bundle
    // can never be loaded as a product request release.
    const sizes = await tx.$queryRaw<{ size: number }[]>`SELECT octet_length(artifact_canonical)::int AS size FROM ontology_release WHERE graph_version = ${active.graphVersion}`;
    requireOperation(sizes.length === 1 && sizes[0].size <= MAX_RELEASE_MANIFEST_BYTES, "UNAVAILABLE");
    const row = await tx.ontologyRelease.findUnique({
      where: { graphVersion: active.graphVersion },
    });
    if (!row || row.revokedAt || row.scopeKey !== scopeKey) return null;
    return { generation: active.generation, row };
}
export async function readActiveOntologyRelease(scopeKey: string) {
  mathOntologyScopeSchema.parse(scopeKey);
  const stored = await db.$transaction(tx => readReleaseInTransaction(tx, scopeKey));
  if (!stored) return null;
  const { row, generation } = stored;
  const identity = mathOntologyGraphIdentitySchema.parse(
    JSON.parse(row.identityCanonical),
  );
  requireOperation(
    identity.graphVersion === row.graphVersion &&
      ontologyDigest(row.artifactCanonical) === row.artifactHash,
    "BINDING_MISMATCH",
  );
  const artifact = mathOntologyArtifactSchema.parse(JSON.parse(row.artifactCanonical));
  requireOperation(
    canonicalOntologyJson(artifact) === row.artifactCanonical,
    "BINDING_MISMATCH",
  );
  verifyOntologyArtifact(artifact, identity);
  return { generation, identity, artifact };
}
/** Actual SHACL/proofs for small fixtures, or sealed full-source manifest plus
 * query-dependent materialization for packaged production releases. */
export async function loadActiveOntologyRuntimeInTransaction(tx: Prisma.TransactionClient, graphVersion: string, _query: MathOntologyQuery) {
  void _query;
  await lockActiveOntologyReleaseInTransaction(tx, "global", graphVersion);
  const stored = await readReleaseInTransaction(tx, "global");
  requireOperation(stored && stored.row.graphVersion === graphVersion, "STALE");
  const identity = mathOntologyGraphIdentitySchema.parse(JSON.parse(stored.row.identityCanonical));
  requireOperation(ontologyDigest(stored.row.artifactCanonical) === stored.row.artifactHash, "BINDING_MISMATCH");
  const artifact = mathOntologyArtifactSchema.parse(JSON.parse(stored.row.artifactCanonical));
  requireOperation(canonicalOntologyJson(artifact) === stored.row.artifactCanonical, "BINDING_MISMATCH");
  const runtime = await runtimes.load(artifact, identity);
  requireOperation(runtime.coverage.scope === "global", "BINDING_MISMATCH");
  return runtime;
}
