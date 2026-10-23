import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";
vi.mock("server-only", () => ({}));
const requests = vi.hoisted(() => ({ http: vi.fn(), https: vi.fn() }));
vi.mock("node:http", async importOriginal => {
  const original = await importOriginal<typeof import("node:http")>();
  return { ...original, default: { ...original, request: requests.http }, request: requests.http };
});
vi.mock("node:https", async importOriginal => {
  const original = await importOriginal<typeof import("node:https")>();
  return { ...original, default: { ...original, request: requests.https }, request: requests.https };
});
import { createOntologyPythonPort } from "@/lib/math-ontology/transport/python";
import { mathOntologyCompileInputSchema } from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import release from "../fixtures/ontology-packaged-release.json";

const start = Date.parse("2026-10-24T00:00:00Z");
const input = mathOntologyCompileInputSchema.parse({ schemaVersion: 1, profile: "tm-owlrl-1", scope: "global", registryNquads: "", sourceManifest: release.files.source, assertions: [] });
const job = { jobId: "synthetic-native-job", inputHash: ontologyDigest(canonicalOntologyJson(input)), leaseGeneration: 3, expiresAt: new Date(start + 540000).toISOString() };

function socket(status = 200, headers = true) {
  const response = Object.assign(new EventEmitter(), { statusCode: status, complete: true, destroy: vi.fn() });
  const request = Object.assign(new EventEmitter(), { end: vi.fn(), destroy: vi.fn() });
  const attach = (_url: URL, options: { signal: AbortSignal }, callback: (incoming: typeof response) => void) => {
    options.signal.addEventListener("abort", () => {
      request.destroy(); response.destroy(); request.emit("error", options.signal.reason);
    }, { once: true });
    request.end.mockImplementation(() => { if (headers) callback(response); });
    return request;
  };
  requests.http.mockImplementation(attach); requests.https.mockImplementation(attach);
  return { request, response };
}
function compile(endpoint = "https://synthetic.invalid/api/ontology-engine") {
  return createOntologyPythonPort({ endpoint: new URL(endpoint), audience: "synthetic-deployment", secret: "synthetic-only" }).compile(input, job);
}

describe("native engine socket transport (no network)", () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    vi.useFakeTimers(); vi.setSystemTime(start);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("deadline", "TimeoutError")), ms);
      return controller.signal;
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

  it.each(["https://synthetic.invalid/api/ontology-engine", "http://127.0.0.1:12345/api/ontology-engine"])("preserves exact signed bytes and verifies genuine JSON via %s", async endpoint => {
    const { request, response } = socket();
    const pending = compile(endpoint);
    const used = endpoint.startsWith("https:") ? requests.https : requests.http;
    const options = used.mock.calls[0][1];
    const body = request.end.mock.calls[0][0] as string;
    const sent = JSON.parse(body);
    const key = createHmac("sha256", "synthetic-only").update("ontology-engine-key-v1").digest();
    expect(options.headers["x-ontology-signature"]).toBe(createHmac("sha256", key).update(`ontology-engine-v1\n${options.headers["x-ontology-timestamp"]}\n${body}`).digest("hex"));
    expect(options.headers["content-length"]).toBe(String(Buffer.byteLength(body)));
    expect(options.agent).toBe(false);
    expect(sent.audience).toBe("synthetic-deployment");
    expect(sent.responseMode).toBe("heartbeat-v1");
    const raw = canonicalOntologyJson(release);
    response.emit("data", Buffer.from("\n"));
    response.emit("data", Buffer.from(JSON.stringify({ protocol: "ontology-engine-v1", responseMode: "heartbeat-v1", kind: "success", resultGzip: gzipSync(raw).toString("base64"), resultHash: ontologyDigest(raw), jobId: job.jobId, leaseGeneration: 3, inputHash: job.inputHash })));
    response.emit("end");
    await expect(pending).resolves.toMatchObject({ identity: release.identity });
    expect(used).toHaveBeenCalledTimes(1);
    const diagnostic = JSON.parse(String(vi.mocked(process.stderr.write).mock.calls[0][0]));
    expect(diagnostic).toMatchObject({ event: "ontology_engine_transport", complete: true, phase: "complete", chunkCount: 2, status: 200 });
    expect(diagnostic.firstByteMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(diagnostic)).not.toMatch(/synthetic|jobId|inputHash|signature/);
  });

  it("keeps the absolute 500s abort active after headers and a partial body", async () => {
    const { request, response } = socket();
    let settled = false;
    const pending = compile().catch(error => { settled = true; return error.name; });
    response.emit("data", Buffer.from("{"));
    await vi.advanceTimersByTimeAsync(499999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe("TimeoutError");
    expect(request.destroy).toHaveBeenCalled(); expect(response.destroy).toHaveBeenCalled();
    expect(requests.https).toHaveBeenCalledTimes(1);
  });

  it.each([302, 503])("rejects status %i and closes without redirect or retry", async status => {
    const { request, response } = socket(status);
    await expect(compile()).rejects.toThrow(`ONTOLOGY_ENGINE_${status}`);
    expect(request.destroy).toHaveBeenCalled(); expect(response.destroy).toHaveBeenCalled();
    expect(requests.https).toHaveBeenCalledTimes(1);
  });

  it.each([201, 204, 205])("rejects unexpected success status %i safely", async status => {
    const { request, response } = socket(status);
    const pending = compile();
    const rejected = expect(pending).rejects.toThrow(`ONTOLOGY_ENGINE_${status}`);
    response.emit("end");
    await rejected;
    expect(request.destroy).toHaveBeenCalled(); expect(response.destroy).toHaveBeenCalled();
  });

  it.each([false, true])("rejects a premature socket close (headers=%s)", async headers => {
    const { request, response } = socket(200, headers);
    const rejected = expect(compile()).rejects.toThrow("ENGINE_RESPONSE_TRUNCATED");
    (headers ? response : request).emit("close");
    await rejected;
    expect(request.destroy).toHaveBeenCalled();
  });

  it.each(["setup", "end"])("rejects synchronous %s failure and cleans up allocated resources", async point => {
    const { request } = socket();
    const fail = () => { throw new Error("SYNTHETIC_SETUP_ERROR"); };
    if (point === "setup") requests.https.mockImplementation(fail);
    else {
      const attach = requests.https.getMockImplementation()!;
      requests.https.mockImplementation((...args) => {
        const result = attach(...args);
        request.end.mockImplementation(fail);
        return result;
      });
    }
    await expect(compile()).rejects.toThrow("SYNTHETIC_SETUP_ERROR");
    if (point === "end") expect(request.destroy).toHaveBeenCalled();
    expect(requests.https).toHaveBeenCalledTimes(1);
  });

  it("destroys an oversized body before JSON parsing or decompression", async () => {
    const { request, response } = socket();
    const pending = compile();
    const rejected = expect(pending).rejects.toThrow("ENGINE_RESPONSE_BUDGET");
    response.emit("data", Buffer.alloc(4_000_001));
    response.emit("data", Buffer.alloc(4_000_001));
    await rejected;
    expect(request.destroy).toHaveBeenCalledTimes(1); expect(response.destroy).toHaveBeenCalledTimes(1);
  });

  it.each(["socket", "aborted", "truncated"])("fails closed on %s failure", async kind => {
    const { request, response } = socket();
    const pending = compile();
    const rejected = expect(pending).rejects.toThrow(kind === "socket" ? "SYNTHETIC_SOCKET_ERROR" : kind === "aborted" ? "ENGINE_RESPONSE_ABORTED" : "ENGINE_RESPONSE_TRUNCATED");
    if (kind === "socket") request.emit("error", new Error("SYNTHETIC_SOCKET_ERROR"));
    if (kind === "aborted") response.emit("aborted");
    if (kind === "truncated") { response.complete = false; response.emit("end"); }
    await rejected;
    expect(requests.https).toHaveBeenCalledTimes(1);
    expect(request.destroy).toHaveBeenCalled(); expect(response.destroy).toHaveBeenCalled();
  });

  it.each(["valid-error", "mixed", "unknown-code", "wrong-status", "foreign-job", "extra-json", "partial", "whitespace"])("rejects terminal %s without artifact activation", async variant => {
    const { response } = socket();
    const terminal: Record<string, unknown> = { protocol: "ontology-engine-v1", responseMode: "heartbeat-v1", kind: "error", status: 504, error: "COMPILER_TIMEOUT", jobId: job.jobId, leaseGeneration: 3, inputHash: job.inputHash };
    if (variant === "mixed") terminal.resultGzip = "e30=";
    if (variant === "unknown-code") terminal.error = "DO_NOT_LOG_RAW_ERROR";
    if (variant === "wrong-status") terminal.status = 422;
    if (variant === "foreign-job") terminal.jobId = "other-job";
    let text = JSON.stringify(terminal);
    if (variant === "extra-json") text += "{}";
    if (variant === "partial") text = text.slice(0, -1);
    if (variant === "whitespace") text = " \n ";
    const rejected = expect(compile()).rejects.toThrow(variant === "valid-error" ? "ONTOLOGY_ENGINE_504" : undefined);
    response.emit("data", Buffer.from("\n" + text)); response.emit("end");
    await rejected;
    expect(requests.https).toHaveBeenCalledTimes(1);
  });
});
