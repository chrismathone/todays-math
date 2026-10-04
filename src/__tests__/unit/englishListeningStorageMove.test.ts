// @vitest-environment node
/** Actual loopback HTTP fixture; no operating environment or Storage is accessed. */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  moveListeningStorage,
  readListeningStorageMoveConfig,
} from "../../../scripts/import/move-listening-storage.mts";
const source = "https://abcdefghijklmnopqrst.supabase.co",
  target = "https://zyxwvutsrqponmlkjihg.supabase.co",
  bucket = "english-listening-private";
const modern = "sb_secret_source_test",
  legacy = `e30.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`;
const config = () =>
  readListeningStorageMoveConfig({
    SUPABASE_URL2: source,
    SUPABASE_SECRET_KEY2: modern,
    SUPABASE_URL: target,
    SUPABASE_SERVICE_ROLE_KEY: legacy,
  });
// Capture real Node fetch before the global setup's MSW beforeAll hook. MSW's
// response tee can make cancel() wait on its unread clone in real HTTP fixtures.
const fixtureFetch = globalThis.fetch;
type File = { bytes: Buffer; mime: string };
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((fn) => fn()));
});
async function fixture() {
  const files = {
      source: new Map<string, File>(),
      target: new Map<string, File>(),
    },
    calls: Array<{
      side: string;
      method: string;
      key?: string;
      body?: unknown;
    }> = [];
  let targetExists = true,
    sourceExists = true,
    differentTargetEtag = false,
    publicTarget = false,
    failUpload = false,
    failUploadKey: string | null = null,
    failListPrefix: string | null = null,
    failDelete = false,
    corruptUpload = false,
    repeatPage = false,
    oversize = false;
  const file = (
    side: "source" | "target",
    key: string,
    bytes = Buffer.from(key),
    mime = "audio/mpeg",
  ) => files[side].set(key, { bytes, mime });
  const json = (response: ServerResponse, value: unknown, status = 200) => {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(value));
  };
  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      try {
        const [side, ...parts] = request.url!.slice(1).split("/");
        if (side !== "source" && side !== "target")
          throw new Error("Bad fixture route");
        const api = "/" + parts.join("/"),
          method = request.method!;
        expect(request.headers.apikey).toBe(
          side === "source" ? modern : legacy,
        );
        expect(request.headers.authorization).toBe(
          side === "source" ? undefined : `Bearer ${legacy}`,
        );
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const raw = Buffer.concat(chunks);
        const parsed =
          request.headers["content-type"]?.startsWith("application/json") &&
          raw.length
            ? JSON.parse(raw.toString())
            : null;
        calls.push({ side, method, body: parsed });
        if (api === `/storage/v1/bucket/${bucket}`) {
          if (side === "source" && !sourceExists)
            return json(response, { error: "not found" }, 404);
          if (side === "target" && !targetExists)
            return json(response, { error: "not found" }, 404);
          return json(response, {
            id: bucket,
            public: side === "target" ? publicTarget : false,
          });
        }
        if (api === "/storage/v1/bucket" && method === "POST") {
          expect(parsed).toMatchObject({
            id: bucket,
            name: bucket,
            public: false,
          });
          targetExists = true;
          return json(response, { name: bucket });
        }
        if (api === `/storage/v1/object/list/${bucket}`) {
          const prefix = parsed.prefix as string;
          if (side === "source" && prefix === failListPrefix)
            return json(response, { error: "list failed" }, 503);
          const rows = new Map<string, unknown>();
          for (const [key, value] of files[side]) {
            const start = prefix ? prefix + "/" : "";
            if (!key.startsWith(start)) continue;
            const rest = key.slice(start.length),
              name = rest.split("/")[0];
            if (rest.includes("/"))
              rows.set(name, { name, id: null, metadata: null });
            else
              rows.set(name, {
                name,
                id: createHash("md5").update(key).digest("hex"),
                metadata: {
                  size: oversize ? 50 * 1024 * 1024 + 1 : value.bytes.length,
                  mimetype: value.mime,
                },
              });
          }
          const list = [...rows.values()].sort((a, b) =>
            (a as { name: string }).name.localeCompare(
              (b as { name: string }).name,
            ),
          );
          const offset = repeatPage ? 0 : parsed.offset;
          return json(
            response,
            list.slice(offset, offset + Math.min(parsed.limit, 2)),
          );
        }
        if (api === `/storage/v1/object/${bucket}` && method === "DELETE") {
          if (failDelete) {
            failDelete = false;
            files.source.delete(parsed.prefixes[0]);
            return json(response, { error: "lost delete reply" }, 503);
          }
          expect(side).toBe("source");
          const removed = parsed.prefixes.map((key: string) => {
            files.source.delete(key);
            return { name: key };
          });
          return json(response, removed);
        }
        const authenticated = `/storage/v1/object/authenticated/${bucket}/`,
          upload = `/storage/v1/object/${bucket}/`,
          key = decodeURIComponent(
            api.slice(
              api.startsWith(authenticated)
                ? authenticated.length
                : upload.length,
            ),
          );
        calls.at(-1)!.key = key;
        if (method === "POST") {
          expect(side).toBe("target");
          expect(request.headers["x-upsert"]).toBe("false");
          if (failUpload || key === failUploadKey)
            return json(response, { error: "upload failed" }, 503);
          if (files.target.has(key))
            return json(response, { error: "exists" }, 409);
          const storedBytes = Buffer.from(raw);
          if (corruptUpload) storedBytes[0] ^= 1;
          files.target.set(key, {
            bytes: storedBytes,
            mime: request.headers["content-type"]!,
          });
          return json(response, { Key: `${bucket}/${key}` });
        }
        const value = files[side].get(key);
        if (!value) return json(response, { error: "not found" }, 404);
        const etag = `"${createHash("md5").update(value.bytes).digest("hex")}${side === "target" && differentTargetEtag ? "-copy" : ""}"`;
        if (request.headers["if-match"] && request.headers["if-match"] !== etag)
          return json(response, { error: "changed" }, 412);
        response.writeHead(200, {
          "content-length":
            oversize && side === "source"
              ? 50 * 1024 * 1024 + 1
              : value.bytes.length,
          "content-type": value.mime,
          etag,
        });
        response.end(method === "HEAD" ? undefined : value.bytes);
      } catch (error) {
        json(response, { error: String(error) }, 500);
      }
    },
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  cleanup.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  const fetchImpl: typeof fetch = async (url, init) => {
    const value = new URL(String(url));
    expect([source, target]).toContain(value.origin);
    return fixtureFetch(
      `http://127.0.0.1:${address.port}/${value.origin === source ? "source" : "target"}${value.pathname}`,
      init,
    );
  };
  const dir = await mkdtemp(path.join(tmpdir(), "listening-storage-move-")),
    checkpointPath = path.join(dir, "checkpoint.json");
  cleanup.push(() => rm(dir, { recursive: true, force: true }));
  const run = (
    options: {
      apply?: boolean;
      deleteSource?: boolean;
      prefix?: string;
      concurrency?: number;
    } = {},
  ) =>
    moveListeningStorage(
      config(),
      { ...options, checkpointPath },
      { fetchImpl },
    );
  return {
    files,
    calls,
    file,
    run,
    checkpointPath,
    config: config(),
    fetchImpl,
    setMissing: () => (targetExists = false),
    setSourceMissing: () => (sourceExists = false),
    setDifferentTargetEtag: () => (differentTargetEtag = true),
    setFailUploadKey: (key: string | null) => (failUploadKey = key),
    setPublic: () => (publicTarget = true),
    setFailUpload: (value: boolean) => (failUpload = value),
    setFailList: (prefix: string) => (failListPrefix = prefix),
    setRepeatPage: () => (repeatPage = true),
    setOversize: () => (oversize = true),
    setCorrupt: () => (corruptUpload = true),
    setFailDelete: () => (failDelete = true),
  };
}
describe("private listening Storage project move (real isolated HTTP)", () => {
  it("denies publishable/anon keys and keeps same-origin key rotation a strict no-op", async () => {
    expect(() =>
      readListeningStorageMoveConfig({
        SUPABASE_URL: target,
        SUPABASE_SECRET_KEY: "sb_publishable_test",
        SUPABASE_SECRET_KEY2: modern,
      }),
    ).toThrow();
    const anon = `e30.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.signature`;
    expect(() =>
      readListeningStorageMoveConfig({
        SUPABASE_URL: target,
        SUPABASE_SECRET_KEY: anon,
        SUPABASE_SECRET_KEY2: modern,
      }),
    ).toThrow();
    const f = await fixture();
    const result = await moveListeningStorage(
      { ...f.config, target: { ...f.config.target, url: source } },
      { apply: true, deleteSource: true },
      { fetchImpl: f.fetchImpl },
    );
    expect(result.mode).toBe("key_rotation");
    expect(f.calls).toHaveLength(0);
  });
  it("defaults to read-only and recursively paginates without creating a missing target bucket", async () => {
    const f = await fixture();
    f.setMissing();
    for (let n = 0; n < 7; n++)
      f.file("source", `owner/asset/folder/file-${n}`);
    const result = await f.run();
    expect(result).toMatchObject({
      mode: "read_only",
      sourceCount: 7,
      copied: 0,
      deleted: 0,
    });
    expect(f.files.source.size).toBe(7);
    expect(
      f.calls.filter(
        (c) =>
          c.method === "DELETE" ||
          (c.method === "POST" &&
            (c.key ||
              (c.body && typeof c.body === "object" && "name" in c.body))),
      ),
    ).toHaveLength(0);
    await expect(readFile(f.checkpointPath)).rejects.toThrow();
  });
  it("preserves exact key/MIME/bytes, reuses identical objects and deletes source only after full verification", async () => {
    const f = await fixture();
    f.setMissing();
    f.file(
      "source",
      "owner/a/original",
      Buffer.alloc(512 * 1024, 7),
      "audio/wav",
    );
    f.file("source", "owner/b/chunk", Buffer.from("mpeg"), "audio/mpeg");
    const result = await f.run({ apply: true });
    expect(result).toMatchObject({ copied: 2, deleted: 0, verified: 2 });
    expect(f.files.target).toEqual(f.files.source);
    const before = f.calls.length,
      again = await f.run({ apply: true, deleteSource: true });
    expect(again).toMatchObject({ copied: 0, reused: 2, deleted: 2 });
    expect(f.files.source.size).toBe(0);
    expect(f.files.target.size).toBe(2);
    const calls = f.calls.slice(before),
      firstDelete = calls.findIndex((c) => c.method === "DELETE");
    expect(firstDelete).toBeGreaterThan(
      calls
        .map((c) => (c.side === "target" && c.method === "GET" ? 1 : 0))
        .lastIndexOf(1),
    );
    const checkpoint = await readFile(f.checkpointPath, "utf8");
    expect(checkpoint).not.toContain(modern);
    expect(checkpoint).not.toContain(legacy);
    expect(JSON.parse(checkpoint)).toMatchObject({
      verifiedAll: true,
      cleanupComplete: true,
    });
  });
  it.each(["sha", "mime"])(
    "aborts target %s collision without overwriting or deleting",
    async (kind) => {
      const f = await fixture();
      f.file("source", "owner/a/file", Buffer.from("original"), "audio/wav");
      f.file(
        "target",
        "owner/a/file",
        Buffer.from(kind === "sha" ? "changed!" : "original"),
        kind === "mime" ? "audio/mpeg" : "audio/wav",
      );
      await expect(f.run({ apply: true, deleteSource: true })).rejects.toThrow(
        kind === "sha" ? "SHA" : "MIME",
      );
      expect(f.files.source.size).toBe(1);
      expect(
        f.calls.some(
          (c) => c.method === "DELETE" || (c.method === "POST" && c.key),
        ),
      ).toBe(false);
    },
  );
  it("leaves source intact on destination failure and safely resumes verified copies", async () => {
    const f = await fixture();
    f.file("source", "owner/a/one");
    f.file("source", "owner/b/two");
    f.setFailUploadKey("owner/b/two");
    await expect(
      f.run({ apply: true, deleteSource: true, concurrency: 1 }),
    ).rejects.toThrow("Target upload");
    expect(f.files.source.size).toBe(2);
    expect(f.files.target.size).toBe(1);
    expect(f.calls.some((c) => c.method === "DELETE")).toBe(false);
    f.setFailUploadKey(null);
    expect(await f.run({ apply: true })).toMatchObject({
      copied: 1,
      reused: 1,
    });
    const posts = f.calls.filter((c) => c.method === "POST" && c.key).length;
    await f.run({ apply: true });
    expect(f.calls.filter((c) => c.method === "POST" && c.key)).toHaveLength(
      posts,
    );
    expect(f.files.target).toEqual(f.files.source);
  });
  it("never copies or cleans up a partial/repeated pagination result", async () => {
    const f = await fixture();
    for (let n = 0; n < 4; n++) f.file("source", `owner/asset/${n}`);
    f.setFailList("owner/asset");
    await expect(f.run({ apply: true, deleteSource: true })).rejects.toThrow();
    expect(f.files.target.size).toBe(0);
    expect(f.calls.some((c) => c.method === "DELETE")).toBe(false);
    const g = await fixture();
    for (let n = 0; n < 4; n++) g.file("source", `owner/asset/${n}`);
    g.setRepeatPage();
    await expect(g.run({ apply: true, deleteSource: true })).rejects.toThrow();
    expect(g.files.target.size).toBe(0);
  });
  it("rejects public targets and objects above 50MiB before any write", async () => {
    const f = await fixture();
    f.file("source", "owner/a/file");
    f.setPublic();
    await expect(f.run({ apply: true })).rejects.toThrow();
    expect(f.calls.some((c) => c.method === "POST" && c.key)).toBe(false);
    const g = await fixture();
    g.file("source", "owner/a/file");
    g.setMissing();
    g.setOversize();
    await expect(g.run({ apply: true })).rejects.toThrow();
    expect(
      g.calls.some(
        (c) => c.method === "DELETE" || (c.method === "POST" && !c.body),
      ),
    ).toBe(false);
  });
  it("keeps every source when uploaded remote bytes fail SHA verification", async () => {
    const f = await fixture();
    f.file("source", "owner/a/file");
    f.setCorrupt();
    await expect(f.run({ apply: true, deleteSource: true })).rejects.toThrow(
      "SHA",
    );
    expect(f.files.source.size).toBe(1);
    expect(f.calls.some((c) => c.method === "DELETE")).toBe(false);
  });
  it("resumes an interrupted cleanup using the verified checkpoint without losing already copied objects", async () => {
    const f = await fixture();
    for (let n = 0; n < 3; n++) f.file("source", `owner/asset/${n}`);
    f.setFailDelete();
    await expect(f.run({ apply: true, deleteSource: true })).rejects.toThrow();
    expect(f.files.target.size).toBe(3);
    expect(f.files.source.size).toBe(2);
    await f.run({ apply: true, deleteSource: true });
    expect(f.files.source.size).toBe(0);
    expect(f.files.target.size).toBe(3);
    expect(JSON.parse(await readFile(f.checkpointPath, "utf8"))).toMatchObject({
      cleanupComplete: true,
    });
  });
  it("reports missing or empty sources without bucket creation, checkpoint writes or deletion", async () => {
    const f = await fixture();
    f.setMissing();
    expect(await f.run({ apply: true, deleteSource: true })).toMatchObject({
      mode: "empty_source",
      sourceCount: 0,
      copied: 0,
      deleted: 0,
    });
    expect(
      f.calls.some(
        (c) =>
          c.method === "DELETE" ||
          (c.method === "POST" && c.key) ||
          (typeof c.body === "object" && c.body !== null && "name" in c.body),
      ),
    ).toBe(false);
    await expect(readFile(f.checkpointPath)).rejects.toThrow();
    const g = await fixture();
    g.setSourceMissing();
    expect(await g.run({ apply: true, deleteSource: true })).toMatchObject({
      mode: "empty_source",
      sourceCount: 0,
    });
    expect(g.calls).toHaveLength(1);
  });
  it("records different source/target ETags alongside identical SHA for safe metadata rebinding", async () => {
    const f = await fixture();
    f.file("source", "owner/asset/file");
    f.setDifferentTargetEtag();
    await f.run({ apply: true });
    const checkpoint = JSON.parse(await readFile(f.checkpointPath, "utf8"));
    expect(checkpoint.entries[0].sourceEtag).not.toBe(
      checkpoint.entries[0].targetEtag,
    );
    expect(checkpoint.entries[0]).toMatchObject({
      targetVerified: true,
      sourceDeleted: false,
    });
    expect(f.files.target).toEqual(f.files.source);
  });
  it("copies and cleans only the explicitly selected source prefix while preserving other objects", async () => {
    const f = await fixture();
    f.file("source", "owner-a/asset/file");
    f.file("source", "owner-b/asset/file");
    f.file("target", "unrelated/file");
    const other = f.files.source.get("owner-b/asset/file"),
      unrelated = f.files.target.get("unrelated/file");
    expect(
      await f.run({ apply: true, deleteSource: true, prefix: "owner-a" }),
    ).toMatchObject({ sourceCount: 1, copied: 1, deleted: 1 });
    expect(f.files.source.get("owner-b/asset/file")).toEqual(other);
    expect(f.files.target.get("unrelated/file")).toEqual(unrelated);
    expect(f.files.target.has("owner-a/asset/file")).toBe(true);
  });
});
