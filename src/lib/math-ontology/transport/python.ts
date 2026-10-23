import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { request as httpRequest, type ClientRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import {
  mathOntologyArtifactSchema,
  mathOntologyCompileInputSchema,
  type MathOntologyCompileInput,
  type MathOntologyCompilePort,
} from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { verifyOntologyCompiledArtifactForInput } from "../runtime/compiled";

// Native fetch has an independent 300s Undici header timeout. This one-request
// transport uses the caller's absolute deadline through DNS, connect and body,
// without changing a global dispatcher or following a redirect.
function requestOntologyEngine(
  endpoint: URL,
  body: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let finished = false;
    let request: ClientRequest | undefined;
    let incoming: IncomingMessage | undefined;
    const chunks: Buffer[] = [];
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true; chunks.length = 0;
      reject(error); incoming?.destroy(); request?.destroy();
    };
    const closed = () => fail(new Error("ENGINE_RESPONSE_TRUNCATED"));
    try {
      request = (endpoint.protocol === "https:" ? httpsRequest : httpRequest)(
        endpoint,
        { method: "POST", headers: { ...headers, "content-length": String(Buffer.byteLength(body)) }, signal, agent: false },
        response => {
          incoming = response;
          response.on("error", fail);
          response.once("aborted", () => fail(new Error("ENGINE_RESPONSE_ABORTED")));
          response.once("close", closed);
          const status = response.statusCode ?? 502;
          // Only 200 carries the engine envelope. Never follow redirects or
          // construct a body-bearing Response for a bodyless 204/205 status.
          if (status !== 200) { fail(new Error(`ONTOLOGY_ENGINE_${status}`)); return; }
          let bytes = 0;
          response.on("data", (chunk: Buffer) => {
            if (finished) return;
            bytes += chunk.length;
            if (bytes > 4_000_000) { fail(new Error("ENGINE_RESPONSE_BUDGET")); return; }
            chunks.push(chunk);
          });
          response.once("end", () => {
            if (finished) return;
            if (!response.complete) { closed(); return; }
            try {
              const result = new Response(new Uint8Array(Buffer.concat(chunks)), { status });
              finished = true; chunks.length = 0;
              resolve(result); response.destroy(); request?.destroy();
            } catch (error) { fail(error); }
          });
        },
      );
      request.once("error", fail);
      request.once("close", closed);
      request.once("upgrade", (_response, socket) => { socket.destroy(); fail(new Error("ONTOLOGY_ENGINE_101")); });
      request.end(body);
    } catch (error) { fail(error); }
  });
}

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
        leaseExpiresAt: leaseExpiry,
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
      const headers = {
          "content-type": "application/json",
          "x-ontology-timestamp": timestamp,
          "x-ontology-signature": signature,
      };
      // Leave time after the 480s child bound for response verification and
      // the publisher's final transaction, within its durable 540s lease.
      const signal = AbortSignal.timeout(Math.min(500_000,(leaseExpiry-nowSeconds)*1000));
      const response = options.fetch
        ? await options.fetch(options.endpoint, { method: "POST", headers, body, redirect: "error", cache: "no-store", signal })
        : await requestOntologyEngine(options.endpoint, body, headers, signal);
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
        maxOutputLength: 8 * 1024 * 1024,
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
      return verifyOntologyCompiledArtifactForInput(artifact, input);
    },
  };
}
