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
  publication: { confirm(actor: OntologyActionActor, raw: unknown): Promise<unknown>; recover(actor: OntologyActionActor, jobId: string): Promise<unknown>; prepare?(actor: OntologyActionActor): Promise<{ confirmationId: string; sealHash: string; preview: { base: { entities: number; assertions: number; focuses: number }; relationCount: number } }> };
  readProposal(actor: OntologyActionActor, proposalId: string): Promise<unknown>;
  deliverHistory?(actor: OntologyActionActor, receiptId: string): Promise<unknown>;
  history?(actor: OntologyActionActor, request: Request): Promise<unknown>;
  governance?: { prepare(actor: OntologyActionActor): Promise<{ confirmationId: string; sealHash: string }>; confirm(actor: OntologyActionActor, raw: unknown): Promise<unknown> };
  review?(actor: OntologyActionActor, reviewId: string): Promise<unknown>;
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
      if (request.method === "GET" && path === "/api/math-ontology/history" && deps.history) return ontologyResponse(200, { data: await deps.history(actor, request) });
      const action = /^\/api\/math-ontology\/actions\/([^/]+)(?:\/(approve|execute|feedback))?$/.exec(path);
      if (action && request.method === "GET" && !action[2]) return ontologyResponse(200, { data: await deps.readProposal(actor, z.uuid().parse(action[1])) });
      if (request.method !== "POST") return ontologyResponse(405, { error: { code: "METHOD_NOT_ALLOWED" } });
      const raw = await ontologyJsonBody(request);
      let data: unknown;
      if (path === "/api/math-ontology/publish/prepare" && deps.publication.prepare) {
        z.strictObject({}).parse(raw); const p = await deps.publication.prepare(actor);
        data = { id: p.confirmationId, summary: "게시할 변경을 준비했습니다.", steps: [{ id: "source", title: "게시 가능한 원천의 검증 판", note: `개체 ${p.preview.base.entities}개 · 원천 연결 ${p.preview.base.assertions}개 · 검사 대상 ${p.preview.base.focuses}개`, state: "observed" }, { id: "reviews", title: "사람이 승인한 연결", note: `${p.preview.relationCount}개 · 교육적 효과는 미확인`, state: "reviewed" }], coverage: [], details: [{ title: "게시 조건", text: "게시 실행에서 전체 의미 검증과 근거 대조를 다시 마친 뒤 활성 판을 교체합니다. 학생 기록은 별도 권한 조회에서 검사하며 이 개수에 포함하지 않습니다." }], action: { kind: "publication", id: p.confirmationId, sealHash: p.sealHash, label: "검토한 내용 게시하기", changes: [{ label: "지식 판", before: "현재 판", after: "검증을 마친 새 판" }], effects: ["현재 지식 판은 새 검증이 성공할 때 교체됩니다."] } };
      } else if (path === "/api/math-ontology/publish/revoke/prepare" && deps.governance) {
        z.strictObject({}).parse(raw); const p = await deps.governance.prepare(actor);
        data = { id: p.confirmationId, summary: "활성 지식 판 철회를 준비했습니다.", steps: [], coverage: [], details: [{ title: "철회 이력", text: "이전 판과 승인 기록을 보존합니다. 새 게시 전까지 이 판에 근거한 새 조회·실행은 중단됩니다." }], action: { kind: "publication", operation: "revoke", id: p.confirmationId, sealHash: p.sealHash, label: "이 지식 판 철회하기", changes: [{ label: "활성 지식 판", before: "사용 중", after: "철회" }], effects: ["새 게시가 끝날 때까지 이 지식 판을 이용한 새 실행이 중단됩니다."] } };
      } else if (path === "/api/math-ontology/publish/revoke" && deps.governance) data = await deps.governance.confirm(actor, raw);
      else if (/^\/api\/math-ontology\/relations\/[^/]+\/review\/prepare$/.test(path) && deps.review) { z.strictObject({}).parse(raw); data = await deps.review(actor, z.uuid().parse(path.split("/")[4])); }
      else if (path === "/api/math-ontology/actions/proposals") data = await deps.plans.propose(actor, z.strictObject({ target: z.strictObject({ studentId: z.uuid(), classId: z.uuid(), branchId: z.uuid().nullable() }), args: z.unknown(), graphVersion: z.string(), sourceSnapshotId: z.string() }).parse(raw));
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
      } else if (/^\/api\/math-ontology\/relations\/[^/]+\/retire$/.test(path)) {
        const input = z.strictObject({ reviewId: z.uuid(), expectedRevision: z.number().int().nonnegative() }).parse(raw);
        if (input.reviewId !== z.uuid().parse(path.split("/")[4])) throw new OntologyOperationError("BINDING_MISMATCH");
        const result = await deps.relations.retire(actor, input.reviewId, input.expectedRevision);
        data = { id: result.reviewId, state: "applied", message: "연결 폐기를 기록했습니다.", details: ["다음 게시에 반영하기 전까지 활성 지식 판은 유지됩니다."] };
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
