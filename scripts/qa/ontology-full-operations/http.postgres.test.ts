import { describe, expect, it, vi } from "vitest";
import { db, fixture, now } from "./harness";
import { createOntologyOperationsHandler } from "@/lib/math-ontology/actions/handlers";
import { createOntologyRelationService } from "@/lib/math-ontology/review/service";
import { createOntologyFeedbackService } from "@/lib/math-ontology/feedback/service";
import { readSrsState, srsStateTableIn } from "@/lib/math-srs/serverStore";
const request = (path: string, body: unknown) => new Request("http://127.0.0.1" + path, { method: "POST", headers: { "content-type": "application/json", origin: "http://127.0.0.1" }, body: JSON.stringify(body) });
async function setup() {
  const f = await fixture();
  const unavailable = async (): Promise<never> => { throw new Error("unused-port-must-not-run"); };
  const authorize = vi.fn(async () => ({ actor: f.actor, response: null as Response | null }));
  const handler = createOntologyOperationsHandler({ authorize, plans: f.service, relations: createOntologyRelationService({ db, candidates: { authorize: unavailable, validate: unavailable } }), feedback: createOntologyFeedbackService({ db, observations: { resolve: unavailable } }), students: unavailable, publication: { confirm: unavailable, recover: unavailable }, readProposal: unavailable });
  return { f, handler, authorize };
}
describe("actual Request -> typed handler -> real PostgreSQL atomic action", () => {
  it("prepares, approves and executes once; retries receive the same receipt", async () => {
    const { f, handler } = await setup();
    const prepared = await handler(request("/api/math-ontology/actions/proposals", f.input));
    expect(prepared.status).toBe(200);
    const p = (await prepared.json()).data;
    const approve = () => handler(request(`/api/math-ontology/actions/${p.proposalId}/approve`, { proposalId: p.proposalId, sealHash: p.sealHash }));
    const first = await approve(), approval = (await first.json()).data;
    const execute = () => handler(request(`/api/math-ontology/actions/${p.proposalId}/execute`, approval));
    const response = await execute(), receipt = (await response.json()).data;
    expect(response.status).toBe(200); expect(receipt.outcome).toBe("applied");
    expect((await (await approve()).json()).data).toEqual(approval);
    expect((await (await execute()).json()).data).toEqual(receipt);
    expect(await db.ontologyReceipt.count({ where: { proposalId: p.proposalId } })).toBe(1);
    expect(await db.ontologyAudit.count({ where: { receiptId: receipt.id } })).toBe(1);
  });
  it("denies before parsing, binds route id, enforces body budget and current session revocation", async () => {
    const { f, handler, authorize } = await setup();
    authorize.mockResolvedValueOnce({ actor: f.actor, response: new Response(null, { status: 403 }) });
    const denied = await handler(new Request("http://127.0.0.1/api/math-ontology/actions/proposals", { method: "POST", body: "not JSON" }));
    expect(denied.status).toBe(403);
    expect((await handler(request("/api/math-ontology/actions/proposals", { padding: "x".repeat(72001) }))).status).toBe(413);
    const { p } = await f.ready();
    expect((await handler(request(`/api/math-ontology/actions/${f.student.id}/approve`, { proposalId: p.proposalId, sealHash: p.sealHash }))).status).toBe(409);
    await db.user.update({ where: { id: f.actor.id }, data: { sessionVersion: 1 } });
    expect((await handler(request(`/api/math-ontology/actions/${p.proposalId}/approve`, { proposalId: p.proposalId, sealHash: p.sealHash }))).status).toBe(403);
    expect((await readSrsState(f.student.id, srsStateTableIn(db))).revision).toBe(1);
    expect(now).toBeInstanceOf(Date);
  });
});
