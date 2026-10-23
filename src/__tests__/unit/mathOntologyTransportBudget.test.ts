import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createOntologyPythonPort } from "@/lib/math-ontology/transport/python";
import { mathOntologyCompileInputSchema } from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import release from "../fixtures/ontology-packaged-release.json";

const start = Date.parse("2026-10-24T00:00:00Z");
const input = mathOntologyCompileInputSchema.parse({ schemaVersion: 1, profile: "tm-owlrl-1", scope: "global", registryNquads: "", sourceManifest: release.files.source, assertions: [] });
const job = (seconds: number) => ({ jobId: "synthetic-budget-job", inputHash: ontologyDigest(canonicalOntologyJson(input)), leaseGeneration: 2, expiresAt: new Date(start + seconds * 1000).toISOString() });

describe("actual Python transport runtime and durable lease bounds (synthetic clock, no network)", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(start);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("deadline", "TimeoutError")), ms);
      return controller.signal;
    });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it.each([540, 120])("aborts once at min(500s, %is lease) while retaining the 55s signed start window", async seconds => {
    let request: Record<string, unknown> = {};
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      request = JSON.parse(String(init!.body));
      return await new Promise<Response>((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason), { once: true }));
    });
    const port = createOntologyPythonPort({ endpoint: new URL("https://synthetic.invalid/api/ontology-engine"), audience: "synthetic-deployment", secret: "synthetic-only", fetch: fetcher });
    let settled = false;
    const result = port.compile(input, job(seconds)).then(() => "unexpected-success", error => { settled = true; return error.name; });
    const deadline = Math.min(500, seconds) * 1000;
    await vi.advanceTimersByTimeAsync(deadline - 1);
    expect(settled).toBe(false);
    expect(request.expiresAt).toBe(start / 1000 + 55);
    expect(request.leaseExpiresAt).toBe(start / 1000 + seconds);
    expect(request.leaseGeneration).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe("TimeoutError");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects an exactly expired durable lease before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const port = createOntologyPythonPort({ endpoint: new URL("https://synthetic.invalid/api/ontology-engine"), audience: "synthetic-deployment", secret: "synthetic-only", fetch: fetcher });
    await expect(port.compile(input, job(0))).rejects.toThrow("EXPIRED_COMPILE_JOB");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
