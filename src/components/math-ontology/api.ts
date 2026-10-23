import { z } from "zod";
import { ontologyActionReceiptSchema } from "@/contracts/mathOntologyAction.contract";
import { OntologyWorkspaceError, type OntologyWorkspaceSource, type WorkspaceAnswer } from "./source";
const actionSchema = z.object({ kind: z.enum(["plan", "relation", "publication"]), operation: z.enum(["approve", "retire", "revoke"]).optional(), id: z.string(), sealHash: z.string().optional(), revision: z.number().int().optional(), validationHash: z.string().optional(), label: z.string(), changes: z.array(z.object({ label: z.string(), before: z.string(), after: z.string() })), effects: z.array(z.string()) });
const answerSchema = z.object({ id: z.string(), summary: z.string().max(2000), requiresStudent: z.boolean().optional(), steps: z.array(z.object({ id: z.string(), title: z.string(), note: z.string(), state: z.enum(["observed", "reviewed", "candidate", "unknown"]) })).max(100), details: z.array(z.object({ title: z.string(), text: z.string(), reviewId: z.uuid().optional() })), coverage: z.array(z.object({ label: z.string(), value: z.string() })), action: actionSchema.optional() });
const studentSchema = z.object({ id: z.uuid(), classId: z.uuid(), branchId: z.uuid().nullable(), label: z.string(), classLabel: z.string() });
async function request(url: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, { signal, cache: "no-store", ...(body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }); }
  catch { throw new OntologyWorkspaceError("NETWORK", "결과를 확인하지 못했습니다. 다시 확인해 주세요."); }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new OntologyWorkspaceError([401,403,404].includes(response.status) ? "FORBIDDEN" : response.status === 409 ? "STALE" : "UNAVAILABLE", response.status === 409 ? "기록이나 근거가 바뀌었습니다. 다시 준비해 주세요." : [401,403,404].includes(response.status) ? "현재 권한으로 볼 수 없습니다." : "자료를 준비하지 못했습니다. 다시 시도해 주세요.");
  return z.object({ data: z.unknown() }).parse(json).data;
}
export function createOntologyWorkspaceSource(branchId?: string): OntologyWorkspaceSource {
  const context = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return {
    async students(signal) { return z.array(studentSchema).parse(await request(`/api/math-ontology/students${context}`, signal)); },
    async review(reviewId, signal) { return answerSchema.parse(await request(`/api/math-ontology/relations/${encodeURIComponent(reviewId)}/review/prepare`, signal, {})); },
    async history(signal) { return answerSchema.parse(await request(`/api/math-ontology/history${context}`, signal)); },
    async publication(signal) { return answerSchema.parse(await request("/api/math-ontology/publish/prepare", signal, {})); },
    async revocation(signal) { return answerSchema.parse(await request("/api/math-ontology/publish/revoke/prepare", signal, {})); },
    async run(input, signal): Promise<WorkspaceAnswer> {
      return answerSchema.parse(await request("/api/math-ontology/assist", signal, { query: input.query, ...(input.student ? { studentId: input.student.id, classId: input.student.classId, branchId: input.student.branchId } : {}) }));
    },
    async confirm(action, signal) {
      if (action.kind === "plan") {
        const approval = z.object({ approvalId: z.uuid(), proposalId: z.uuid(), sealHash: z.string() }).parse(await request(`/api/math-ontology/actions/${encodeURIComponent(action.id)}/approve`, signal, { proposalId: action.id, sealHash: action.sealHash }));
        const receipt = ontologyActionReceiptSchema.parse(await request(`/api/math-ontology/actions/${encodeURIComponent(action.id)}/execute`, signal, approval));
        return { id: receipt.id, state: receipt.outcome, message: receipt.outcome === "applied" ? "계획을 변경했습니다." : "변경할 내용이 없습니다.", details: [`기록 판 ${receipt.beforeRevision} → ${receipt.afterRevision}`, `실행 시각 ${receipt.committedAt}`, `영수증 ${receipt.id}`, `근거 판 ${receipt.binding.graphVersion}`, "승인 내용과 실행 영수증을 보존했습니다."] };
      }
      const result = z.object({ id: z.string(), state: z.enum(["applied", "no-op", "preparing", "published"]), message: z.string(), details: z.array(z.string()) }).parse(await request(action.kind === "relation" ? `/api/math-ontology/relations/${encodeURIComponent(action.id)}/${action.operation === "retire" ? "retire" : "approve"}` : action.operation === "revoke" ? "/api/math-ontology/publish/revoke" : "/api/math-ontology/publish/jobs", signal, action.kind === "relation" ? action.operation === "retire" ? { reviewId: action.id, expectedRevision: action.revision } : { reviewId: action.id, expectedRevision: action.revision, validationHash: action.validationHash, decision: "approve", sourceReviewed: true, meaningReviewed: true } : { confirmationId: action.id, sealHash: action.sealHash }));
      return result;
    },
    async feedback(result, signal) { return z.object({ summary: z.string(), details: z.array(z.string()) }).parse(await request(`/api/math-ontology/receipts/${encodeURIComponent(result.id)}/feedback`, signal, {})); },
  };
}
