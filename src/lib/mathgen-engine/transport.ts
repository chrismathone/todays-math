import "server-only";
import { createHmac } from "node:crypto";
import { Readable, addAbortSignal } from "node:stream";
import { createGunzip } from "node:zlib";

type Operation = "figure" | "hwpx";
const MAX_BODY = 3_500_000;
const MAX_RESPONSE = 4_000_000; // Below Vercel's 4.5 MB function payload limit.
const MAX_RESULT = { figure: 1024 * 1024, hwpx: 48 * 1024 * 1024 };
const ENDPOINT = "/api/mathgen-engine";

/** Only deployment/operator configuration may select an upstream; never request Host. */
export function engineEndpoint(): URL | null {
  const configured = process.env.STUDIO_ENGINE_URL;
  const vercel =
    process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";
  if (!configured && !vercel) return null;
  const address =
    configured ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  try {
    const url = new URL(address);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && loopback && !vercel)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== ENDPOINT)
    )
      throw new Error();
    return new URL(ENDPOINT, url.origin);
  } catch {
    throw new Error("Python 엔진의 서버 주소 설정을 확인해 주세요.");
  }
}

function failure(
  operation: Operation,
  kind: "size" | "timeout" | "cancel" | "response",
) {
  const name = operation === "figure" ? "도형" : "HWPX 문서";
  return new Error(
    kind === "size"
      ? `${name}가 너무 큽니다. 나누어 다시 시도해 주세요.`
      : kind === "timeout"
        ? `${name} 생성 시간이 초과되었습니다.`
        : kind === "cancel"
          ? `${name} 생성이 취소되었습니다.`
          : `${name} 생성 엔진의 응답을 읽지 못했습니다.`,
  );
}

export async function requestEngine(
  operation: Operation,
  payload: unknown,
  options: { signal?: AbortSignal; timeoutMs: number },
): Promise<unknown> {
  if (options.signal?.aborted) throw failure(operation, "cancel");
  const endpoint = engineEndpoint();
  const secret = process.env.STUDIO_ENGINE_SECRET || process.env.AUTH_SECRET;
  if (!endpoint || !secret)
    throw new Error("Python 엔진의 서버 인증 설정을 확인해 주세요.");
  const body = JSON.stringify({ operation, payload });
  if (Buffer.byteLength(body) > MAX_BODY) throw failure(operation, "size");
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`mathgen-engine-v1\n${timestamp}\n`)
    .update(body)
    .digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-mathgen-timestamp": timestamp,
    "x-mathgen-signature": signature,
  };
  // Forward a protection bypass only to this deployment, never to an alternate engine.
  if (
    process.env.VERCEL_URL &&
    endpoint.origin === `https://${process.env.VERCEL_URL}` &&
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ) {
    headers["x-vercel-protection-bypass"] =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const timer = setTimeout(cancel, options.timeoutMs);
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 413) throw failure(operation, "size");
      if (response.status === 504) throw failure(operation, "timeout");
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Python 엔진 인증 또는 Vercel 배포 보호 설정을 확인해 주세요.",
        );
      }
      throw failure(operation, "response");
    }
    if (Number(response.headers.get("content-length")) > MAX_RESPONSE) {
      await response.body?.cancel();
      throw failure(operation, "size");
    }
    if (!response.body) throw failure(operation, "response");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        controller.signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE) throw failure(operation, "size");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const envelope: unknown = JSON.parse(
      Buffer.concat(chunks).toString("utf8"),
    );
    const packed =
      envelope && typeof envelope === "object" && "resultGzip" in envelope
        ? envelope.resultGzip
        : null;
    if (
      typeof packed !== "string" ||
      packed.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(packed)
    ) {
      throw failure(operation, "response");
    }
    const gunzip = addAbortSignal(controller.signal, createGunzip());
    const input = Readable.from([Buffer.from(packed, "base64")]);
    input.pipe(gunzip);
    const inflated: Buffer[] = [];
    size = 0;
    try {
      for await (const chunk of gunzip) {
        size += chunk.length;
        if (size > MAX_RESULT[operation]) throw failure(operation, "size");
        inflated.push(chunk);
      }
    } finally {
      input.destroy();
      gunzip.destroy();
    }
    controller.signal.throwIfAborted();
    return JSON.parse(Buffer.concat(inflated).toString("utf8"));
  } catch (error) {
    if (options.signal?.aborted) throw failure(operation, "cancel");
    if (controller.signal.aborted) throw failure(operation, "timeout");
    // Expose only our controlled messages, never upstream URLs, paths, or diagnostics.
    if (
      error instanceof Error &&
      /^(도형|HWPX 문서|Python 엔진)/.test(error.message)
    )
      throw error;
    throw failure(operation, "response");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
