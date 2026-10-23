import { z, ZodError } from "zod";
import type { OntologyActionActor } from "./authorization";
import type { createOntologyActionService } from "./service";
import type { createOntologyRelationService } from "../review/service";
import type { createOntologyFeedbackService } from "../feedback/service";
import { ontologyFailure, ontologyJsonBody, ontologyResponse } from "./http";
import { newOntologyObservationId } from "../feedback/observations";
import { OntologyOperationError } from "./errors";

type Plan = ReturnType<typeof createOntologyActionService>;
type Relations = ReturnType<typeof createOntologyRelationService>;
type Feedback = ReturnType<typeof createOntologyFeedbackService>;
export interface OntologyOperationsHttpPorts {
  authorize(request: Request): Promise<{ actor: OntologyActionActor | null; response: Response | null }>;
  plans: Plan;
  relations: Relations;
  feedback: Feedback;
  students(actor: OntologyActionActor, request: Request): Promise<unknown>;
  publication: { confirm(actor: OntologyActionActor, raw: unknown): Promise<unknown>; recover(actor: OntologyActionActor, jobId: string): Promise<unknown> };
  readProposal(actor: OntologyActionActor, proposalId: string): Promise<unknown>;
  deliverHistory?(actor: OntologyActionActor, receiptId: string): Promise<unknown>;
}
/** Also used by actual Request-level tests. Authentication precedes body parsing
 * and all service work; session/permission checks repeat inside each DB tx. */
export function createOntologyOperationsHandler(deps: OntologyOperationsHttpPorts) {
  return async (request: Request) => {
    const access = await deps.authorize(request);
    if (access.response || !access.actor) return access.response ?? ontologyResponse(403, { error: { code: "FORBIDDEN" } });
    const actor = access.actor, path = new URL(request.url).pathname;
    try {
      if (request.method === "GET" && path === "/api/math-ontology/students") return ontologyResponse(200, { data: await deps.students(actor, request) });
      const action = /^\/api\/math-ontology\/actions\/([^/]+)(?:\/(approve|execute|feedback))?$/.exec(path);
      if (action && request.method === "GET" && !action[2]) return ontologyResponse(200, { data: await deps.readProposal(actor, z.uuid().parse(action[1])) });
      if (request.method !== "POST") return ontologyResponse(405, { error: { code: "METHOD_NOT_ALLOWED" } });
      const raw = await ontologyJsonBody(request);
      let data: unknown;
      if (path === "/api/math-ontology/actions/proposals") data = await deps.plans.propose(actor, z.strictObject({ target: z.strictObject({ studentId: z.uuid(), classId: z.uuid(), branchId: z.uuid().nullable() }), args: z.unknown(), graphVersion: z.string(), sourceSnapshotId: z.string() }).parse(raw));
      else if (action?.[2] === "approve" || action?.[2] === "execute") {
        const bodyId = z.object({ proposalId: z.uuid() }).parse(raw).proposalId;
        if (bodyId !== z.uuid().parse(action[1])) throw new OntologyOperationError("BINDING_MISMATCH");
        data = await deps.plans[action[2]](actor, raw);
        if (action[2] === "execute" && deps.deliverHistory) {
          const result = z.object({ id: z.uuid() }).parse(data);
          try { await deps.deliverHistory(actor, result.id); } catch { /* Primary receipt/audit already committed; durable outbox remains resumable. */ }
        }
      } else if (path === "/api/math-ontology/relations/proposals") data = await deps.relations.draft(actor, z.strictObject({ assertion: z.unknown(), evidenceRef: z.string() }).parse(raw));
      else if (/^\/api\/math-ontology\/relations\/[^/]+\/validate$/.test(path)) data = await deps.relations.validate(actor, z.uuid().parse(path.split("/")[4]));
      else if (/^\/api\/math-ontology\/relations\/[^/]+\/approve$/.test(path)) {
        const id = z.uuid().parse(path.split("/")[4]);
        if (z.object({ reviewId: z.uuid() }).parse(raw).reviewId !== id) throw new OntologyOperationError("BINDING_MISMATCH");
        const result = await deps.relations.decide(actor, raw);
        data = { id: result.reviewId, state: "applied", message: result.state === "approved" ? "연결을 승인했습니다." : "검토 결과를 기록했습니다.", details: ["교육적 진실로 확정한 표시는 아닙니다."] };
      } else if (path === "/api/math-ontology/publish/jobs") data = await deps.publication.confirm(actor, raw);
      else if (/^\/api\/math-ontology\/publish\/jobs\/[^/]+\/recover$/.test(path)) data = await deps.publication.recover(actor, z.uuid().parse(path.split("/")[5]));
      else if (/^\/api\/math-ontology\/receipts\/[^/]+\/feedback$/.test(path)) {
        z.strictObject({}).parse(raw);
        const result = await deps.feedback.record(actor, { receiptId: z.uuid().parse(path.split("/")[4]), sourceSnapshotId: newOntologyObservationId() });
        const c = result.observation.counts;
        data = { summary: c.retainedFirstAttempts ? "계획 변경 이후의 보존 기록입니다." : "아직 후속 관찰이 없습니다.", details: [`보존된 첫 풀이 ${c.retainedFirstAttempts}건 · 독립 정답 ${c.independentCorrect}건 · 독립 오답 ${c.independentIncorrect}건 · 제외 ${c.excluded}건`, "학습 효과나 원인으로 해석하지 않습니다."] };
      } else if (/^\/api\/math-ontology\/receipts\/[^/]+\/outbox\/resume$/.test(path) && deps.deliverHistory) {
        z.strictObject({}).parse(raw);
        data = await deps.deliverHistory(actor, z.uuid().parse(path.split("/")[4]));
      } else return ontologyResponse(404, { error: { code: "NOT_FOUND" } });
      return ontologyResponse(200, { data });
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) return ontologyResponse(400, { error: { code: "VALIDATION_ERROR" } });
      return ontologyFailure(error);
    }
  };
}
