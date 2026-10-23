import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { gunzipSync } from "node:zlib";
import {
  mathOntologyArtifactSchema,
  mathOntologyCompileInputSchema,
  type MathOntologyCompileInput,
  type MathOntologyCompilePort,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { verifyOntologyArtifact } from "../runtime/artifact";

export function createOntologyPythonPort(options: {
  endpoint: URL;
  audience: string;
  secret: string;
  fetch?: typeof fetch;
}): MathOntologyCompilePort {
  if (
    options.endpoint.pathname !== "/api/ontology-engine" ||
    options.endpoint.username ||
    options.endpoint.password ||
    options.endpoint.search ||
    options.endpoint.hash ||
    !(
      options.endpoint.protocol === "https:" ||
      (options.endpoint.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(options.endpoint.hostname))
    )
  )
    throw new Error("INVALID_ENGINE_ENDPOINT");
  return {
    async compile(raw: MathOntologyCompileInput, job) {
      const input = mathOntologyCompileInputSchema.parse(raw),
        inputHash = ontologyDigest(canonicalOntologyJson(input));
      if (job.inputHash !== inputHash) throw new Error("UNBOUND_COMPILE_JOB");
      const nowSeconds = Math.floor(Date.now() / 1000);
      const leaseExpiry = Math.floor(Date.parse(job.expiresAt) / 1000);
      if (!Number.isSafeInteger(leaseExpiry) || leaseExpiry <= nowSeconds)
        throw new Error("EXPIRED_COMPILE_JOB");
      const timestamp = String(nowSeconds);
      const request = {
        protocol: "ontology-engine-v1",
        operation: "compile",
        audience: options.audience,
        jobId: job.jobId,
        inputHash,
        leaseGeneration: job.leaseGeneration,
        expiresAt: Math.min(leaseExpiry, nowSeconds + 55),
        nonce: randomBytes(16).toString("hex"),
        input,
      };
      const body = canonicalOntologyJson(request);
      if (Buffer.byteLength(body) > 3_500_000)
        throw new Error("PACKAGED_BASE_REQUIRED");
      const key = createHmac("sha256", options.secret)
        .update("ontology-engine-key-v1")
        .digest();
      const signature = createHmac("sha256", key)
        .update(`ontology-engine-v1\n${timestamp}\n`)
        .update(body)
        .digest("hex");
      const response = await (options.fetch ?? fetch)(options.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ontology-timestamp": timestamp,
          "x-ontology-signature": signature,
        },
        body,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`ONTOLOGY_ENGINE_${response.status}`);
      }
      if (!response.body) throw new Error("EMPTY_ENGINE_RESPONSE");
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 4_000_000) throw new Error("ENGINE_RESPONSE_BUDGET");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        envelope.jobId !== job.jobId ||
        envelope.leaseGeneration !== job.leaseGeneration ||
        envelope.inputHash !== inputHash ||
        typeof envelope.resultGzip !== "string" ||
        !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          envelope.resultGzip,
        )
      )
        throw new Error("UNBOUND_ENGINE_RESPONSE");
      const result = gunzipSync(Buffer.from(envelope.resultGzip, "base64"), {
        maxOutputLength: 192 * 1024 * 1024,
      });
      if (
        `sha256:${createHash("sha256").update(result).digest("hex")}` !==
        envelope.resultHash
      )
        throw new Error("ENGINE_RESULT_HASH");
      const artifact = mathOntologyArtifactSchema.parse(
        JSON.parse(result.toString("utf8")),
      );
      // Transport verifies actual bytes/policy, ops verifies DB authority and activates it.
      return verifyOntologyArtifact(artifact, artifact.identity);
    },
  };
}
