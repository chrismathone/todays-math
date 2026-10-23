import { beforeEach, afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ state: "approved", read: vi.fn(), validate: vi.fn() }));
const actorId = "00000000-0000-4000-8000-000000000001", reviewId = "00000000-0000-4000-8000-000000000002";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "00000000-0000-4000-8000-000000000001", sessionVersion: 1 } }) }));
vi.mock("@/lib/math-srs/courseTeacherRoutes", () => ({ teacherGate: async () => ({ account: { id: "00000000-0000-4000-8000-000000000001" }, response: null }) }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (fn: (tx: object) => unknown) => fn({ syntheticOnly: true }) } }));
vi.mock("@/lib/math-ontology/actions/service", () => ({ createOntologyActionService: () => ({}) }));
vi.mock("@/lib/math-ontology/actions/evidence", () => ({ createOntologyEvidenceStore: () => ({}) }));
vi.mock("@/lib/math-ontology/review/service", () => ({ createOntologyRelationService: () => ({ read: fixture.read, validate: fixture.validate }) }));
vi.mock("@/lib/math-ontology/review/authorization", () => ({ authorizeOntologyPublisher: async () => {} }));
vi.mock("@/lib/math-ontology/feedback/service", () => ({ createOntologyFeedbackService: () => ({}) }));
vi.mock("@/lib/math-ontology/feedback/observations", () => ({ currentOntologyObservations: {}, newOntologyObservationId: () => "synthetic" }));
vi.mock("@/lib/math-ontology/publish/service", () => ({ createOntologyPublisher: () => ({}) }));
vi.mock("@/lib/math-ontology/publish/approval", () => ({ createOntologyPublicationApproval: () => ({}) }));
vi.mock("@/lib/math-ontology/publish/governance", () => ({ createOntologyReleaseGovernance: () => ({}) }));
vi.mock("@/lib/math-ontology/outbox/history", () => ({ createOntologyHistoryDelivery: () => ({}) }));
vi.mock("@/lib/math-ontology/publish/native", () => ({ currentOntologyEngineFingerprint: () => "synthetic", buildNativeOntologyPublicationInput: vi.fn(), currentPackagedPublicationBase: vi.fn() }));
vi.mock("@/lib/math-ontology/publish/store", () => ({
  lockActiveOntologyReleaseInTransaction: async () => ({ release: { graphVersion: "synthetic-graph" } }),
  loadActiveOntologyRuntimeInTransaction: async () => ({ datasets: () => ({ registry: { getObjects: (subject: { value: string }) => [{ value: subject.value.endsWith("subject") ? "합성 첫 개체" : "합성 둘째 개체" }] } }) }),
}));
import { handleOntologyOperations } from "@/lib/math-ontology/actions/production.server";
beforeEach(() => {
  vi.stubEnv("MATH_ONTOLOGY_OPERATIONS", "on"); fixture.read.mockReset(); fixture.validate.mockReset();
  fixture.read.mockImplementation(async () => ({ reviewId, revision: 2, state: fixture.state, assertion: { subject: "urn:synthetic:subject", object: "urn:synthetic:object", predicate: "urn:todaymath:vocab:partOf", sourceRevision: "synthetic-source", locator: "synthetic-location", origin: "model-proposal", support: "indirect", distribution: "allowed" }, report: { conforms: true, incomplete: false, engine: "synthetic-engine" }, validationHash: "synthetic-validation" }));
});
afterEach(() => vi.unstubAllEnvs());
it.each(["approved", "validated", "rejected", "retired"])("projects stored %s through the actual review HTTP response without changing its meaning or origin", async state => {
  fixture.state = state;
  const response = await handleOntologyOperations(new Request(`https://local.invalid/api/math-ontology/relations/${reviewId}/review/prepare`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
  expect(response.status).toBe(200); const { data } = await response.json();
  expect(data.steps[1]).toMatchObject({ title: "합성 둘째 개체", state: state === "approved" ? "reviewed" : "candidate", note: "실제 모델 응답에 묶인 제안 · 교육적 효과는 미확인" });
  expect(data.steps[0].state).toBe("observed"); expect(fixture.read).toHaveBeenCalledExactlyOnceWith({ id: actorId, sessionVersion: 1 }, reviewId); expect(fixture.validate).not.toHaveBeenCalled();
  if (state === "approved") { expect(data.summary).toBe("승인한 연결을 다시 검토합니다."); expect(data.action.operation).toBe("retire"); }
  else if (state === "validated") expect(data.action.label).toBe("이 연결 승인하기");
  else expect(data.action).toBeUndefined();
});
