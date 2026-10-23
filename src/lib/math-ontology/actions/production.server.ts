import "server-only";
import { z } from "zod";
import { DataFactory } from "n3";
import type { WorkspaceAnswer } from "@/components/math-ontology/source";
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
import { buildNativeOntologyPublicationInput, currentPackagedPublicationBase, currentOntologyEngineFingerprint } from "../publish/native";
import { createOntologyPythonPort } from "../transport/python";
import { verifyOntologyCompiledArtifactForInput } from "../runtime/compiled";
import { createOntologyHistoryDelivery } from "../outbox/history";
import { authorizeMathOntologySourceRead, MathOntologySourceAccessDenied } from "../sources/server";
import { createOntologyHistoryReader } from "./history";
import { createOntologyReleaseGovernance } from "../publish/governance";
import { authorizeOntologyPublisher } from "../review/authorization";
import { ontologyRelationCanPublish } from "../review/eligibility";

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
  const publisher = createOntologyPublisher({ db, engineLockHash: currentOntologyEngineFingerprint(), buildInput: buildNativeOntologyPublicationInput,
    compiler: { async compile(input, job) {
      const audience = process.env.ONTOLOGY_ENGINE_AUDIENCE || process.env.VERCEL_URL;
      const origin = process.env.ONTOLOGY_ENGINE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/ontology-engine` : undefined);
      requireOperation(audience && origin, "UNAVAILABLE");
      return createOntologyPythonPort({ endpoint: new URL(origin), audience, secret: secret() }).compile(input, job);
    } },
    verifyArtifact: verifyOntologyCompiledArtifactForInput,
  });
  const publication = createOntologyPublicationApproval({ db, publisher, base: currentPackagedPublicationBase });
  return { plans, evidence, relations, feedback, publisher, publication, governance: createOntologyReleaseGovernance({ db }), deliverHistory: createOntologyHistoryDelivery({ db }) };
}
export async function handleOntologyOperations(request: Request) {
  if (!ontologyOperationsEnabled()) return ontologyResponse(503, { error: { code: "ONTOLOGY_OPERATIONS_UNAVAILABLE" } });
  try {
    const ports = productionOntologyOperations();
    return await createOntologyOperationsHandler({ ...ports, authorize: authorizeOntologyOperationRequest,
      async review(actor, reviewId): Promise<WorkspaceAnswer> {
        let stored = await ports.relations.read(actor, reviewId);
        if (stored.state === "draft") { await ports.relations.validate(actor, reviewId); stored = await ports.relations.read(actor, reviewId); }
        const a = stored.assertion;
        const names = await db.$transaction(async tx => {
          await authorizeOntologyPublisher(tx, actor, () => new Date());
          const { release } = await lockActiveOntologyReleaseInTransaction(tx, "global");
          const query = { kind: "neighbors" as const, entityId: a.subject, targetId: a.object, limit: 100 };
          const runtime = await loadActiveOntologyRuntimeInTransaction(tx, release.graphVersion, query);
          const slice = runtime.materialize ? await runtime.materialize(query, { allowedScopes: ["global"], contextHash: release.graphVersion, cursorSecret: secret() }) : runtime;
          const { registry } = slice.datasets();
          const label = (id: string) => registry.getObjects(DataFactory.namedNode(runtime.resolveEntity?.(id) ?? id), DataFactory.namedNode("http://www.w3.org/2000/01/rdf-schema#label"), null)[0]?.value ?? "표기 미확인";
          const result = { subject: label(a.subject), object: label(a.object), resolved: true };
          await authorizeOntologyPublisher(tx, actor, () => new Date()); return result;
        }, { maxWait: 10000, timeout: 20000 }).catch(error => {
          // An approved old relation must remain withdrawable after its active
          // release was revoked or its entity was removed. This fallback never
          // enables approval and never treats the unresolved label as evidence.
          if (stored.state === "approved" && ((error instanceof OntologyOperationError && error.code === "STALE") || (error instanceof Error && error.message === "ONTOLOGY_ENTITY_UNRESOLVED"))) return { subject: "이전 판의 첫 개체 · 표기 미확인", object: "이전 판의 둘째 개체 · 표기 미확인", resolved: false };
          throw error;
        });
        const label = ({ partOf: "소속", covers: "포함", supports: "근거 연결", observedIn: "관측 맥락", directPedagogicalPrerequisite: "교육적 선수 관계", projectsSourceSection: "학습 단원 연결" } as Record<string, string>)[a.predicate.replace("urn:todaymath:vocab:", "")] ?? "연결";
        const eligible = ontologyRelationCanPublish(a);
        const canApprove = eligible && stored.state === "validated" && stored.report?.conforms && !stored.report.incomplete && stored.validationHash;
        return { id: stored.reviewId, summary: stored.state === "approved" ? "승인한 연결을 다시 검토합니다." : eligible ? "확인할 연결을 준비했습니다." : "근거·배포 허용 확인이 필요한 후보입니다.", steps: [{ id: "subject", title: names.subject, note: label, state: names.resolved ? "observed" : "unknown" }, { id: "object", title: names.object, note: a.origin === "model-proposal" ? "실제 모델 응답에 묶인 제안 · 교육적 효과는 미확인" : "직접 작성한 연결 · 교육적 효과는 미확인", state: stored.state === "approved" ? "reviewed" : "candidate" }], coverage: [], ...(stored.state !== "approved" && stored.state !== "retired" ? { reprepare: { previousReviewId: stored.reviewId, expectedPreviousRevision: stored.revision, query: `${names.subject}와 ${names.object}의 연결 근거를 다시 확인해 줘`.slice(0, 500) } } : {}), details: [{ title: "연결의 출처와 검토", text: `첫 개체 ${a.subject}\n둘째 개체 ${a.object}\n출처 판 ${a.sourceRevision}\n위치 ${a.locator}\n연결 ${a.predicate}\n검토 판 ${stored.revision}\n검증 ${stored.report?.engine ?? "미확인"}\n근거 ${a.support} · 배포 ${a.distribution}\n${eligible ? "현재 근거·배포 조건 충족" : "승인·게시 보류: 근거 또는 배포 허용 미확인"}\n구조 검증은 교육적 의미의 확정이 아닙니다.` }], ...(stored.state === "approved" || canApprove ? { action: { kind: "relation", ...(stored.state === "approved" ? { operation: "retire" as const } : {}), id: stored.reviewId, revision: stored.revision, validationHash: stored.validationHash ?? undefined, label: stored.state === "approved" ? "이 연결 폐기 기록하기" : "이 연결 승인하기", changes: [{ label: `${names.subject} → ${names.object}`, before: stored.state === "approved" ? "승인한 연결" : "검토 전 후보", after: stored.state === "approved" ? "다음 게시에서 제외" : "사람이 의미를 검토한 연결" }], effects: [stored.state === "approved" ? "다음 게시 전까지 현재 지식 판은 유지됩니다." : "출처와 연결 의미를 확인한 뒤 승인해 주세요. 활성 게시 여부는 별도로 확인합니다."] } } : {}) };
      },
      async history(actor, req) { const value = new URL(req.url).searchParams.get("branchId"); if (value) z.uuid().parse(value); return createOntologyHistoryReader({ db })(actor, value ?? undefined); },
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
          return { proposalId, state: receipt ? "executed" : row.expiresAt <= new Date() ? "expired" : row.status, preview: checkedCanonical(row.previewCanonical, digest(row.previewCanonical)), receipt: receipt ? checkedCanonical(receipt.resultCanonical, receipt.resultHash) : null };
        });
      },
    })(request);
  } catch (error) { return ontologyFailure(error); }
}
