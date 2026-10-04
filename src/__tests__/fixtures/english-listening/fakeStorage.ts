import { createHash } from "node:crypto";
import type { ListeningStorageConfig } from "@/lib/english/listening/media/storageApi";
export function fakeListeningStorage() {
  const config: ListeningStorageConfig = {
    url: "https://abcdefghijklmnopqrst.supabase.co",
    bucket: "english-listening-private",
    serviceKey: `e30.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
  };
  const files = new Map<string, Buffer>(),
    sessions = new Map<
      string,
      { key: string; bytes: number; parts: Buffer[] }
    >();
  const calls: { method: string; url: string; length: number }[] = [];
  let sequence = 0,
    isPublic = false,
    cancels = 0,
    failNextPatch = false;
  const etag = (bytes: Buffer) =>
    `"${createHash("md5").update(bytes).digest("hex")}"`;
  const fetchImpl = async (
    urlInput: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = new URL(String(urlInput)),
      headers = new Headers(init.headers),
      method = init.method ?? "GET",
      body = init.body;
    calls.push({
      method,
      url: url.href,
      length: body instanceof Uint8Array ? body.length : 0,
    });
    if (
      headers.get("authorization") !== `Bearer ${config.serviceKey}` ||
      headers.get("apikey") !== config.serviceKey
    )
      throw new Error("Missing server credential");
    if (url.pathname === `/storage/v1/bucket/${config.bucket}`)
      return Response.json({ id: config.bucket, public: isPublic });
    if (url.pathname === "/storage/v1/upload/resumable") {
      const metadata = new Map(
        headers
          .get("upload-metadata")!
          .split(",")
          .map((p) => {
            const [k, v] = p.split(" ");
            return [k, Buffer.from(v, "base64").toString()];
          }),
      );
      const session = `https://abcdefghijklmnopqrst.storage.supabase.co/storage/v1/upload/resumable/${++sequence}`;
      sessions.set(session, {
        key: metadata.get("objectName")!,
        bytes: Number(headers.get("upload-length")),
        parts: [],
      });
      return new Response(null, {
        status: 201,
        headers: { location: session },
      });
    }
    if (sessions.has(url.href)) {
      const session = sessions.get(url.href)!,
        offset = session.parts.reduce((n, p) => n + p.length, 0);
      if (method === "HEAD")
        return new Response(null, {
          headers: { "upload-offset": String(offset) },
        });
      if (failNextPatch) {
        failNextPatch = false;
        return new Response(null, { status: 503 });
      }
      if (Number(headers.get("upload-offset")) !== offset)
        return new Response(null, { status: 409 });
      if (files.has(session.key) && offset === 0)
        return new Response(null, { status: 409 });
      session.parts.push(Buffer.from(body as Uint8Array));
      const next = session.parts.reduce((n, p) => n + p.length, 0);
      if (next === session.bytes)
        files.set(session.key, Buffer.concat(session.parts));
      return new Response(null, {
        status: 204,
        headers: { "upload-offset": String(next) },
      });
    }
    if (method === "DELETE") {
      for (const key of JSON.parse(String(body)).prefixes) files.delete(key);
      return Response.json([]);
    }
    const prefix = `/storage/v1/object/authenticated/${config.bucket}/`,
      key = url.pathname.slice(prefix.length),
      bytes = files.get(key);
    if (!url.pathname.startsWith(prefix) || !bytes)
      return new Response(null, { status: 404 });
    if (headers.has("if-match") && headers.get("if-match") !== etag(bytes))
      return new Response(null, { status: 412 });
    if (method === "HEAD")
      return new Response(null, {
        headers: { etag: etag(bytes), "content-length": String(bytes.length) },
      });
    const match = /bytes=(\d+)-(\d+)/.exec(headers.get("range")!)!,
      from = Number(match[1]),
      end = Number(match[2]) + 1;
    let offset = from;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(c) {
          if (offset >= end) {
            c.close();
            return;
          }
          const to = Math.min(offset + 64 * 1024, end);
          c.enqueue(bytes.subarray(offset, to));
          offset = to;
        },
        cancel() {
          cancels++;
        },
      },
      { highWaterMark: 0 },
    );
    return new Response(stream, {
      status: 206,
      headers: {
        etag: etag(bytes),
        "content-range": `bytes ${from}-${end - 1}/${bytes.length}`,
        "content-length": String(end - from),
      },
    });
  };
  return {
    config,
    files,
    calls,
    fetchImpl: fetchImpl as typeof fetch,
    share: () => {
      isPublic = true;
    },
    failPatch: () => {
      failNextPatch = true;
    },
    get cancels() {
      return cancels;
    },
  };
}
