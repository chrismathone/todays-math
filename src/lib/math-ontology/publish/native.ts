import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { mathOntologyAssertionSchema, type MathOntologyCompileInput } from "@/contracts/mathOntology.contract";
import { preparePackagedSourceCompileInput } from "../compiler/packaged";
import { loadPackagedOntologyBase } from "../runtime/base";
import { canonicalBytes, checkedCanonical } from "../actions/canonical";
import { requireOperation } from "../actions/errors";
import { authorizeOntologyPublisher } from "../review/authorization";
import type { OntologyActionActor } from "../actions/authorization";
import type { approvedOntologyReviews } from "./service";
import type { OntologyPublicationBase } from "./approval";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { ontologyRelationCanPublish } from "../review/eligibility";
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const catalogSchema = z.strictObject({ format: z.literal("tm-base-catalog-1"), bases: z.array(z.strictObject({ baseHash: hash, projectionHash: hash, path: z.string() })).min(1) });
/** Bind the actual engine inputs, not the top-level requirements include line.
 * These exact files are also included in the formal Node deployment trace. */
export function currentOntologyEngineFingerprint() {
  const root = resolve(process.cwd(), "scripts/ontology/compiler");
  return ontologyDigest(canonicalOntologyJson({ lock: readFileSync(resolve(root, "requirements.lock"), "utf8"), compiler: readFileSync(resolve(root, "compiler.py"), "utf8"), packaged: readFileSync(resolve(root, "packaged.py"), "utf8") }));
}
/** The fixed deployment catalog is configuration, never a request path/hash. */
export function currentPackagedPublicationBase(): OntologyPublicationBase {
  const bytes = readFileSync(resolve(process.cwd(), "ontology/model/releases/catalog.json"));
  requireOperation(bytes.length <= 1024 * 1024, "UNAVAILABLE");
  const entry = catalogSchema.parse(JSON.parse(bytes.toString("utf8"))).bases[0], { base } = loadPackagedOntologyBase(entry.baseHash);
  requireOperation(base.projectionHash === entry.projectionHash, "BINDING_MISMATCH");
  return { baseHash: entry.baseHash, projectionHash: entry.projectionHash, entities: base.coverage.entities, assertions: base.coverage.sourceAssertions, focuses: base.coverage.primaryFocus };
}
export async function buildNativeOntologyPublicationInput(tx: Prisma.TransactionClient, actor: OntologyActionActor, scopeKey: string, reviews: Awaited<ReturnType<typeof approvedOntologyReviews>>): Promise<MathOntologyCompileInput> {
  const publisher = await authorizeOntologyPublisher(tx, actor, () => new Date()), base = currentPackagedPublicationBase();
  requireOperation(scopeKey === "global", "FORBIDDEN");
  await tx.$queryRaw`SELECT id FROM ontology_source_authority_decision WHERE scope_key = 'global' AND source_manifest_hash = ${base.projectionHash} AND revoked_at IS NULL FOR SHARE`;
  const row = await tx.ontologySourceAuthorityDecision.findFirst({ where: { scopeKey, sourceManifestHash: base.projectionHash, approvedBy: actor.id, revokedAt: null }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  requireOperation(row, "FORBIDDEN");
  const decision = z.object({ version: z.literal(1), decision: z.literal("approved"), scope: z.literal("global"), baseHash: hash, projectionHash: hash, confirmationId: z.uuid() }).parse(checkedCanonical(row.decisionCanonical, row.decisionHash));
  requireOperation(decision.confirmationId === row.id && decision.baseHash === base.baseHash && decision.projectionHash === base.projectionHash, "BINDING_MISMATCH");
  const decisionId = `urn:todaymath:source-authority:${row.id}`;
  const input = await preparePackagedSourceCompileInput({ decisionId, expectedProjectionHash: base.projectionHash, scope: scopeKey, verify: async () => ({ isSuperAdmin: publisher.isSuperAdmin, active: !row.revokedAt, approvedProjectionHash: row.sourceManifestHash, decisionId }) });
  const assertions = reviews.rows.map(review => {
    const candidate = mathOntologyAssertionSchema.parse(checkedCanonical(review.assertionCanonical, review.assertionHash));
    requireOperation(ontologyRelationCanPublish(candidate), "EVIDENCE_INSUFFICIENT");
    requireOperation(candidate.scope === scopeKey && review.reviewerId && review.reviewedAt && review.validationHash, "BINDING_MISMATCH");
    return mathOntologyAssertionSchema.parse({ ...candidate, review: "approved", publication: "published", revision: review.revision, approvalId: `urn:todaymath:relation-review:${review.id}:revision:${review.revision}` });
  });
  requireOperation(canonicalBytes(assertions, 2 * 1024 * 1024).length < 2 * 1024 * 1024, "UNAVAILABLE");
  return { ...input, assertions };
}
