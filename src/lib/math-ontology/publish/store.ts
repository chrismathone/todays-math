import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  mathOntologyArtifactSchema, mathOntologyGraphIdentitySchema,
  mathOntologyScopeSchema,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { loadOntologyRuntime } from "../runtime/artifact";
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
  });
  requireOperation(
    release && release.scopeKey === scopeKey && !release.revokedAt,
    "STALE",
  );
  return { generation: active.generation, release };
}

export async function readActiveOntologyRelease(scopeKey: string) {
  mathOntologyScopeSchema.parse(scopeKey);
  const stored = await db.$transaction(async (tx) => {
    const active = await tx.ontologyActiveGraph.findUnique({
      where: { scopeKey },
    });
    if (!active?.graphVersion) return null;
    const row = await tx.ontologyRelease.findUnique({
      where: { graphVersion: active.graphVersion },
    });
    if (!row || row.revokedAt || row.scopeKey !== scopeKey) return null;
    return { generation: active.generation, row };
  });
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
  // Actual SHACL and independent premise/rule/proof checking, not just hashes.
  const runtime = await loadOntologyRuntime(artifact, identity);
  requireOperation(runtime.coverage.scope === scopeKey, "BINDING_MISMATCH");
  return { generation, identity, artifact };
}
