import { createHash } from "node:crypto";

export interface SharedFigureAsset {
  sha256: string;
  size: number;
  mimeType: string;
  objectPath: string;
}

export interface SharedFigureRouteContext {
  params: Promise<{ kind: string; path: string[] }>;
}

interface SharedFigureOptions {
  manifest: unknown;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

const mimeTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

const publicHeaders = {
  // Original paths can point at new hashes after a deployment.
  "Cache-Control": "public, max-age=0, s-maxage=300, must-revalidate",
  "X-Content-Type-Options": "nosniff",
  // Also protects direct navigation to a shared SVG document.
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
};

function safeSegment(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value !== "." &&
    value !== ".." &&
    value.trim() === value &&
    !/[\/\\%?#:\u0000-\u001f\u007f\ud800-\udfff]/u.test(value)
  );
}

function originalPath(kind: unknown, path: unknown): string | null {
  if (
    (kind !== "figures" && kind !== "figures-svg") ||
    !Array.isArray(path) ||
    path.length === 0 ||
    !path.every(safeSegment)
  ) {
    return null;
  }
  return `/${kind}/${path.join("/")}`;
}

/** The operator supplies one fixed HTTPS bucket/base directory, never a request URL. */
export function validateSharedFigureBaseUrl(value: unknown): URL | null {
  if (
    typeof value !== "string" ||
    !/^https:\/\/[^/]+/.test(value) ||
    /[\s\\%?#@\u0000-\u001f\u007f]/u.test(value)
  ) {
    return null;
  }
  try {
    // Validate the raw path before URL parsing can normalize dot segments away.
    const rawPath = value.slice("https://".length).replace(/^[^/]*/, "");
    const segments = rawPath.replace(/^\//, "").replace(/\/$/, "");
    if (
      rawPath !== "" &&
      rawPath !== "/" &&
      !segments.split("/").every(safeSegment)
    )
      return null;
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url;
  } catch {
    return null;
  }
}

function manifestIndex(
  manifest: unknown,
): Map<string, SharedFigureAsset> | null {
  if (typeof manifest !== "object" || manifest === null) return null;
  const document = manifest as {
    schemaVersion?: unknown;
    sourceCommit?: unknown;
    entries?: unknown;
  };
  if (
    document.schemaVersion !== 1 ||
    typeof document.sourceCommit !== "string" ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(document.sourceCommit) ||
    typeof document.entries !== "object" ||
    document.entries === null ||
    Array.isArray(document.entries)
  )
    return null;

  const index = new Map<string, SharedFigureAsset>();
  for (const [original, candidate] of Object.entries(document.entries)) {
    if (typeof candidate !== "object" || candidate === null) return null;
    const entry = candidate as SharedFigureAsset;
    const [empty, kind, ...path] = original.split("/");
    const extension = path.at(-1)?.split(".").at(-1)?.toLowerCase() ?? "";
    if (
      empty !== "" ||
      originalPath(kind, path) !== original ||
      !Object.hasOwn(mimeTypes, extension) ||
      entry.mimeType !== mimeTypes[extension] ||
      (kind === "figures-svg" && extension !== "svg") ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size <= 0 ||
      entry.objectPath !== `v1/${entry.sha256}${original}`
    ) {
      return null;
    }
    index.set(original, { ...entry });
  }
  return index;
}

function safeRequestPath(request: Request): boolean {
  // Next has already decoded params; inspect the URL too so encoded separators
  // cannot turn into otherwise-valid catch-all segments during a rewrite.
  const pathname = request.url
    .replace(/^[a-z]+:\/\/[^/]*/i, "")
    .split(/[?#]/)[0];
  try {
    return (
      pathname.startsWith("/") &&
      pathname
        .slice(1)
        .split("/")
        .every((part) => safeSegment(decodeURIComponent(part)))
    );
  } catch {
    return false;
  }
}

function errorResponse(status: number): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function verifiedBytes(
  response: Response,
  entry: SharedFigureAsset,
): Promise<Uint8Array<ArrayBuffer>> {
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const contentLength = response.headers.get("content-length");
  const contentEncoding = response.headers.get("content-encoding");
  if (
    contentType !== entry.mimeType ||
    (contentEncoding !== null &&
      contentEncoding.toLowerCase() !== "identity") ||
    (contentLength !== null &&
      (!/^\d+$/.test(contentLength) || Number(contentLength) !== entry.size)) ||
    !response.body
  ) {
    await response.body?.cancel();
    throw new Error("Invalid shared figure metadata");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const hash = createHash("sha256");
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      // Stop reading an oversized response before buffering unbounded input.
      if (size > entry.size) throw new Error("Oversized shared figure");
      hash.update(value);
      chunks.push(value);
    }
    if (size !== entry.size || hash.digest("hex") !== entry.sha256) {
      throw new Error("Shared figure integrity mismatch");
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Compile the deployment allowlist once. No filesystem access or remote manifest. */
export function createSharedFigureAssetHandler(options: SharedFigureOptions) {
  const base = validateSharedFigureBaseUrl(options.baseUrl);
  const assets = manifestIndex(options.manifest);

  return async function sharedFigureAsset(
    request: Request,
    context: SharedFigureRouteContext,
  ): Promise<Response> {
    if (!base || !assets?.size) return errorResponse(404);
    if (request.method !== "GET" && request.method !== "HEAD")
      return errorResponse(405);
    if (!safeRequestPath(request)) return errorResponse(404);

    const { kind, path } = await context.params;
    const key = originalPath(kind, path);
    const entry = key ? assets.get(key) : undefined;
    if (!entry) return errorResponse(404);

    const url = new URL(
      entry.objectPath.split("/").map(encodeURIComponent).join("/"),
      base,
    );
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      return errorResponse(404);

    try {
      const upstream = await (options.fetch ?? globalThis.fetch)(url.href, {
        method: "GET", // HEAD also verifies the object before reporting success.
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: entry.mimeType, "Accept-Encoding": "identity" },
        signal: AbortSignal.timeout(15_000),
      });
      if (
        upstream.status !== 200 ||
        upstream.redirected ||
        (upstream.url && upstream.url !== url.href)
      ) {
        await upstream.body?.cancel();
        return errorResponse(502);
      }
      const bytes = await verifiedBytes(upstream, entry);
      const etag = `"sha256-${entry.sha256}"`;
      const headers = {
        ...publicHeaders,
        "Content-Type": entry.mimeType,
        ETag: etag,
      };
      const matches = request.headers
        .get("if-none-match")
        ?.split(",")
        .some(
          (value) =>
            value.trim() === "*" || value.trim().replace(/^W\//, "") === etag,
        );
      if (matches) return new Response(null, { status: 304, headers });
      return new Response(request.method === "HEAD" ? null : bytes, {
        headers: { ...headers, "Content-Length": String(entry.size) },
      });
    } catch {
      // Never expose upstream errors, URLs, headers, or unverified object bytes.
      return errorResponse(502);
    }
  };
}
