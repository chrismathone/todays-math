import { createHash } from "node:crypto";
import type { ListeningDriveConfig } from "@/lib/english/listening/media/driveConfig";
export function fakeListeningDrive(ownerId: string) {
  const config: ListeningDriveConfig = {
    ownerId,
    folderId: "folder_private_12345",
    accessToken: async () => "PRIVATE_TOKEN",
  };
  const files = new Map<
    string,
    {
      bytes: Buffer;
      mimeType: string;
      revisionId: string;
      keepForever: boolean;
      public?: boolean;
      trashed?: boolean;
    }
  >();
  const calls: { url: string; method: string; range: string | null }[] = [];
  let sequence = 0,
    reads = 0,
    cancels = 0;
  const sessions = new Map<string, { id: string; parts: Buffer[] }>();
  const metadata = (id: string) => {
    if (id === config.folderId)
      return {
        id,
        mimeType: "application/vnd.google-apps.folder",
        trashed: false,
        ownedByMe: true,
        permissions: [{ type: "user" }],
      };
    const f = files.get(id);
    if (!f) return null;
    return {
      id,
      size: String(f.bytes.length),
      mimeType: f.mimeType,
      headRevisionId: f.revisionId,
      parents: [config.folderId],
      trashed: f.trashed ?? false,
      ownedByMe: true,
      permissions: [{ type: f.public ? "anyone" : "user" }],
      capabilities: { canDownload: true },
      sha256Checksum: createHash("sha256").update(f.bytes).digest("hex"),
      md5Checksum: createHash("md5").update(f.bytes).digest("hex"),
    };
  };
  const fetchImpl = async (
    urlInput: string | URL | Request,
    init: RequestInit = {},
  ) => {
    const url = new URL(String(urlInput)),
      method = init.method ?? "GET",
      headers = new Headers(init.headers);
    calls.push({ url: url.href, method, range: headers.get("range") });
    if (headers.get("authorization") !== "Bearer PRIVATE_TOKEN")
      throw new Error("Missing server token");
    if (url.pathname.endsWith("/files/generateIds"))
      return Response.json({ ids: [`derivative_${++sequence}_private`] });
    if (url.pathname === "/upload/drive/v3/files") {
      const input = JSON.parse(String(init.body)),
        session = `https://www.googleapis.com/upload/session/${input.id}`;
      sessions.set(session, { id: input.id, parts: [] });
      return new Response(null, { headers: { location: session } });
    }
    if (sessions.has(url.href)) {
      const session = sessions.get(url.href)!,
        part = Buffer.from(init.body as Uint8Array),
        range = headers.get("content-range")!,
        match = /bytes (\d+)-(\d+)\/(\d+)/.exec(range)!;
      session.parts.push(part);
      const size = session.parts.reduce((n, p) => n + p.length, 0);
      if (size < Number(match[3]))
        return new Response(null, {
          status: 308,
          headers: { range: `bytes=0-${size - 1}` },
        });
      files.set(session.id, {
        bytes: Buffer.concat(session.parts),
        mimeType: "audio/wav",
        revisionId: "revision_1",
        keepForever: false,
      });
      return Response.json({ id: session.id });
    }
    const parts = url.pathname.split("/").filter(Boolean),
      id = parts[3],
      file = files.get(id);
    if (parts[4] === "revisions") {
      if (!file || parts[5] !== file.revisionId)
        return new Response(null, { status: 404 });
      if (method === "PATCH") {
        file.keepForever = true;
        return Response.json({ id: file.revisionId });
      }
      if (url.searchParams.get("alt") === "media") {
        const range = /bytes=(\d+)-(\d+)/.exec(headers.get("range")!)!,
          start = Number(range[1]),
          end = Number(range[2]) + 1;
        reads++;
        let offset = start;
        const stream = new ReadableStream<Uint8Array>(
          {
            pull(controller) {
              if (offset >= end) {
                controller.close();
                return;
              }
              const to = Math.min(end, offset + 256);
              controller.enqueue(file.bytes.subarray(offset, to));
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
            "content-range": `bytes ${start}-${end - 1}/${file.bytes.length}`,
            "content-length": String(end - start),
          },
        });
      }
      return Response.json({
        id: file.revisionId,
        size: String(file.bytes.length),
        md5Checksum: metadata(id)!.md5Checksum,
        keepForever: file.keepForever,
      });
    }
    if (method === "PATCH" && file) {
      file.trashed = true;
      return Response.json({ id });
    }
    const value = metadata(id);
    return value ? Response.json(value) : new Response(null, { status: 404 });
  };
  return {
    config,
    files,
    calls,
    fetchImpl: fetchImpl as typeof fetch,
    get reads() {
      return reads;
    },
    get cancels() {
      return cancels;
    },
    add(bytes: Buffer, id = "original_audio_private", mimeType = "audio/mpeg") {
      files.set(id, {
        bytes,
        mimeType,
        revisionId: "revision_1",
        keepForever: false,
      });
      return id;
    },
  };
}
