import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { teacherGate } from "@/lib/math-srs/courseTeacherRoutes";
import { accessibleClassesWhere, loadOperationalRosterSummary } from "@/lib/classAccess";
import { createOntologyActionService } from "./service";
import { createOntologyEvidenceStore } from "./evidence";
import { createOntologyOperationsHandler } from "./handlers";
import { authorizeOntologyAction, type OntologyActionActor } from "./authorization";
import { readOntologyActorInTransaction } from "./actor";
import { checkedCanonical, digest } from "./canonical";
import { OntologyOperationError, requireOperation } from "./errors";
import { ontologyFailure, ontologyResponse } from "./http";
import { loadActiveOntologyRuntimeInTransaction, lockActiveOntologyReleaseInTransaction } from "../publish/store";
import { createOntologyRelationService } from "../review/service";
import { actualCandidateValidation } from "../validation/candidate";
import { createOntologyFeedbackService } from "../feedback/service";
import { currentOntologyObservations } from "../feedback/observations";
import { createOntologyPublisher } from "../publish/service";
import { createOntologyPublicationApproval } from "../publish/approval";
import { buildNativeOntologyPublicationInput, currentPackagedPublicationBase } from "../publish/native";
import { createOntologyPythonPort } from "../transport/python";
import { verifyOntologyCompiledArtifactForInput } from "../runtime/compiled";
import { createOntologyHistoryDelivery } from "../outbox/history";
import { authorizeMathOntologySourceRead, MathOntologySourceAccessDenied } from "../sources/server";

export const ontologyOperationsEnabled = () => process.env.MATH_ONTOLOGY_OPERATIONS === "on";
function secret() {
  const value = process.env.MATH_ONTOLOGY_ENGINE_SECRET || process.env.ONTOLOGY_ENGINE_SECRET || process.env.STUDIO_ENGINE_SECRET || process.env.AUTH_SECRET;
  requireOperation(value && value.length >= 32, "UNAVAILABLE"); return value;
}
/** Capture expected identity from the authenticated JWT projection, never by
 * copying the current database version after authentication. */
export async function authorizeOntologyOperationRequest(request: Request) {
  const gate = await teacherGate(request);
  if (gate.response) return { actor: null, response: gate.response };
  const session = await auth();
  const parsed = z.object({ id: z.uuid(), sessionVersion: z.number().int().nonnegative() }).safeParse(session?.user);
  if (!parsed.success || parsed.data.id !== gate.account.id) return { actor: null, response: ontologyResponse(403, { error: { code: "FORBIDDEN" } }) };
  return { actor: parsed.data, response: null };
}
export function productionOntologyOperations() {
  requireOperation(ontologyOperationsEnabled(), "UNAVAILABLE");
  const evidence = createOntologyEvidenceStore({ db, runtime: { load: loadActiveOntologyRuntimeInTransaction }, cursorSecret: secret });
  const plans = createOntologyActionService({ db, evidence: evidence.evidence });
  const candidates = {
    async authorize(tx: Parameters<typeof loadActiveOntologyRuntimeInTransaction>[0], actor: OntologyActionActor, assertion: Parameters<typeof actualCandidateValidation>[0], evidenceRef: string) {
      await readOntologyActorInTransaction(tx, actor, () => new Date());
      await lockActiveOntologyReleaseInTransaction(tx, "global", evidenceRef);
      const a = z.object({ subject: z.string(), scope: z.string() }).parse(assertion);
      const runtime = await loadActiveOntologyRuntimeInTransaction(tx, evidenceRef, { kind: "neighbors", entityId: a.subject, limit: 100 });
      // Candidate validator performs actual endpoint/source hash membership and
      // isolated SHACL. It does not establish educational meaning or cycles.
      await actualCandidateValidation(assertion, a.scope, runtime);
    },
    async validate(assertion: Parameters<typeof actualCandidateValidation>[0]) {
      const a = z.object({ subject: z.string(), scope: z.string() }).parse(assertion);
      return db.$transaction(async tx => {
        const { release } = await lockActiveOntologyReleaseInTransaction(tx, "global");
        const runtime = await loadActiveOntologyRuntimeInTransaction(tx, release.graphVersion, { kind: "neighbors", entityId: a.subject, limit: 100 });
        const result = await actualCandidateValidation(assertion, a.scope, runtime);
        const { engine, conforms, incomplete, report, focusNodeCount, results } = result;
        return { engine, conforms, incomplete, report, focusNodeCount, results };
      });
    },
  };
  const relations = createOntologyRelationService({ db, candidates });
  const feedback = createOntologyFeedbackService({ db, observations: currentOntologyObservations });
  const publisher = createOntologyPublisher({ db, engineLockHash: digest(readFileSync(resolve(process.cwd(), "requirements.txt"), "utf8")), buildInput: buildNativeOntologyPublicationInput,
    compiler: { async compile(input, job) {
      const audience = process.env.ONTOLOGY_ENGINE_AUDIENCE || process.env.VERCEL_URL;
      const origin = process.env.ONTOLOGY_ENGINE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/ontology-engine` : undefined);
      requireOperation(audience && origin, "UNAVAILABLE");
      return createOntologyPythonPort({ endpoint: new URL(origin), audience, secret: secret() }).compile(input, job);
    } },
    verifyArtifact: verifyOntologyCompiledArtifactForInput,
  });
  const publication = createOntologyPublicationApproval({ db, publisher, base: currentPackagedPublicationBase });
  return { plans, evidence, relations, feedback, publisher, publication, deliverHistory: createOntologyHistoryDelivery({ db }) };
}
export async function handleOntologyOperations(request: Request) {
  if (!ontologyOperationsEnabled()) return ontologyResponse(503, { error: { code: "ONTOLOGY_OPERATIONS_UNAVAILABLE" } });
  try {
    const ports = productionOntologyOperations();
    return await createOntologyOperationsHandler({ ...ports, authorize: authorizeOntologyOperationRequest,
      async students(actor, req) {
        const branchId = new URL(req.url).searchParams.get("branchId"); if (branchId) z.uuid().parse(branchId);
        const account = await db.$transaction(tx => readOntologyActorInTransaction(tx, actor, () => new Date()));
        const viewer = account.row;
        const where = await accessibleClassesWhere(viewer, "student:read");
        const classes = await db.class.findMany({ where: branchId ? { AND: [where, { branchId }] } : where, select: { id: true, name: true, grade: true }, orderBy: { name: "asc" } });
        const rows = await loadOperationalRosterSummary(classes, false);
        return db.$transaction(async tx => {
          await readOntologyActorInTransaction(tx, actor, () => new Date());
          const result = [];
          for (const row of rows) {
            const target = { studentId: row.id, classId: row.classId, branchId: row.branchId };
            try { await authorizeMathOntologySourceRead(tx, { actor, target, graphVersion: "ontology:student-selector:v1", now: new Date(), authorizationNow: () => new Date() }); }
            catch (error) { if (error instanceof MathOntologySourceAccessDenied || (error instanceof OntologyOperationError && error.code === "FORBIDDEN")) continue; throw error; }
            result.push({ id: row.id, classId: row.classId, branchId: row.branchId, label: row.name, classLabel: row.class.name });
          }
          return result;
        });
      },
      async readProposal(actor, proposalId) {
        return db.$transaction(async tx => {
          const row = await tx.ontologyProposal.findUnique({ where: { id: proposalId } });
          requireOperation(row && row.actorId === actor.id, "NOT_FOUND");
          await authorizeOntologyAction(tx, actor, { studentId: row.studentId, classId: row.classId, branchId: row.branchId }, () => new Date());
          const receipt = await tx.ontologyReceipt.findUnique({ where: { proposalId } });
          return { proposalId, state: row.status, preview: checkedCanonical(row.previewCanonical, digest(row.previewCanonical)), receipt: receipt ? checkedCanonical(receipt.resultCanonical, receipt.resultHash) : null };
        });
      },
    })(request);
  } catch (error) { return ontologyFailure(error); }
}
