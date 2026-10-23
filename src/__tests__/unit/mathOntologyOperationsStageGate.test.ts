import { afterEach, describe, expect, it, vi } from "vitest";
const transaction = vi.hoisted(() => vi.fn(async () => { throw new Error("Synthetic DB tripwire"); }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $transaction: transaction } }));
import { handleOntologyStage } from "@/lib/math-ontology/publish/stageHandler";
import { stageSignature } from "@/lib/math-ontology/publish/staging";
import { digest } from "@/lib/math-ontology/actions/canonical";
const meta = { jobId: "00000000-0000-4000-8000-000000000001", inputHash: digest("input"), leaseGeneration: 1, scopeKey: "global", gzipHash: digest("gzip"), chunkCount: 1, totalBytes: 3, chunkIndex: 0, chunkHash: digest("abc"), expiresAt: "2099-01-01T00:00:00.000Z" };
const request = (signature: string) => new Request("https://example.test/api/math-ontology/publish/stage", { method: "POST", headers: { "content-type": "application/json", "x-ontology-stage-signature": signature }, body: JSON.stringify({ ...meta, bytesBase64: "YWJj" }) });
afterEach(() => { vi.unstubAllEnvs(); transaction.mockClear(); });
describe("machine staging follows the operation writer gate and purpose key", () => {
 it("off refuses before touching missing/new schema", async () => {
  vi.stubEnv("MATH_ONTOLOGY_OPERATIONS", "off");
  expect((await handleOntologyStage(request("a".repeat(64)))).status).toBe(503);
  expect(transaction).not.toHaveBeenCalled();
 });
 it("uses the same explicit MATH_ONTOLOGY_ENGINE_SECRET precedence as Node/Python and rejects another key before DB", async () => {
  const key = "synthetic-math-ontology-machine-key-32", other = "synthetic-different-auth-secret-32";
  vi.stubEnv("MATH_ONTOLOGY_OPERATIONS", "on"); vi.stubEnv("MATH_ONTOLOGY_ENGINE_SECRET", key); vi.stubEnv("AUTH_SECRET", other);
  expect((await handleOntologyStage(request(stageSignature(other, meta)))).status).toBe(403);
  expect(transaction).not.toHaveBeenCalled();
  expect((await handleOntologyStage(request(stageSignature(key, meta)))).status).toBe(503);
  expect(transaction).toHaveBeenCalledTimes(1);
 });
});
