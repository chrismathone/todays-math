import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateStudioSessionStore } from "@/components/unified/privateStudioSessionStore";
import {
  LocalStudioSessionStore,
  StudioSessionStore,
} from "@/components/unified/studioSessionStore";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import {
  memoryRecovery,
  privateServer,
  sessionData,
} from "../fixtures/privateCloud";

beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("explicit extraction resume", () => {
  it("starts blank without reading current/latest/legacy or altering pending recovery and originals", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const recovery = memoryRecovery();
    const data = sessionData("보내지 못한 원본.pdf");
    const cached = {
      id: "old",
      revision: 7,
      pending: true,
      data,
      title: "pending",
      assets: { source1: "a".repeat(64) },
      originals: new Map([["source1", new Blob(["preserve original"])]]),
    };
    await recovery.put("current", { id: "old" });
    await recovery.put("old", cached);
    const get = vi.spyOn(recovery, "get");
    const put = vi.spyOn(recovery, "put");
    const legacy = vi.fn();
    const store = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      legacy,
      client,
      recovery,
      { autoResume: false },
    );
    expect(await store.load()).toBeNull();
    await store.save({ ...data, sources: [], crops: [] }, new Map());
    expect(store.documentId).toBeUndefined();
    expect(server.transport).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(legacy).not.toHaveBeenCalled();
    expect(await recovery.get("old")).toEqual(cached);
    expect(await recovery.get("current")).toEqual({ id: "old" });

    const resumed = new PrivateStudioSessionStore(
      "owner-a",
      "old",
      legacy,
      client,
      recovery,
      { autoResume: false },
    );
    expect(await resumed.load()).toEqual({ data, originals: cached.originals });
    expect(resumed.documentId).toBe("old");
    expect(server.transport).not.toHaveBeenCalled();
    client.dispose();
  });

  it("opens a selected cloud extraction and creates a distinct document for subsequent new work", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const recovery = memoryRecovery();
    const data = {
      ...sessionData(),
      sources: [
        { id: "source1", name: "sample", kind: "sample" as const, pages: 1 },
      ],
    };
    const date = "2026-10-14T00:00:00Z";
    server.documents.set("owner-a:old", {
      id: "old",
      kind: "extraction",
      title: "saved",
      problemCount: 0,
      revision: 8,
      createdAt: date,
      updatedAt: date,
      payload: { data, assets: {} },
    });
    const resumed = new PrivateStudioSessionStore(
      "owner-a",
      "old",
      undefined,
      client,
      recovery,
      { autoResume: false },
    );
    expect((await resumed.load())?.data).toEqual(data);
    await resumed.save({ ...data, step: "review" }, new Map());
    expect(server.documents.get("owner-a:old")?.revision).toBe(9);
    const blank = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client,
      recovery,
      { autoResume: false },
    );
    expect(await blank.load()).toBeNull();
    await blank.save(data, new Map());
    expect(blank.documentId).not.toBe("old");
    expect(server.documents.size).toBe(2);
    expect(server.documents.get("owner-a:old")?.revision).toBe(9);
    client.dispose();
  });

  it("does not adopt a newer revision when explicitly resuming pending extraction edits", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const recovery = memoryRecovery();
    const data = {
      ...sessionData(),
      sources: [
        { id: "source1", name: "sample", kind: "sample" as const, pages: 1 },
      ],
    };
    const date = "2026-10-14T00:00:00Z";
    await recovery.put("old", {
      id: "old",
      revision: 1,
      pending: true,
      title: "unsent",
      assets: {},
      data,
      originals: new Map(),
    });
    server.documents.set("owner-a:old", {
      id: "old",
      kind: "extraction",
      title: "newer",
      problemCount: 0,
      revision: 2,
      createdAt: date,
      updatedAt: date,
      payload: { data, assets: {} },
    });
    const resumed = new PrivateStudioSessionStore(
      "owner-a",
      "old",
      undefined,
      client,
      recovery,
      { autoResume: false },
    );
    const loaded = await resumed.load();
    expect(loaded?.data).toEqual(data);
    await expect(
      resumed.save({ ...data, step: "review" }, new Map()),
    ).rejects.toThrow();
    expect(await recovery.get("old")).toMatchObject({
      revision: 1,
      pending: true,
      data: { step: "review" },
    });
    expect(server.documents.get("owner-a:old")?.title).toBe("newer");
    client.dispose();
  });

  it("keeps unscoped preview visits blank without touching legacy IndexedDB", async () => {
    const open = vi.fn(() => {
      throw new Error("Legacy storage must not be read");
    });
    vi.stubGlobal("indexedDB", { open });
    const store = new StudioSessionStore(undefined, undefined, {
      autoResume: false,
    });
    expect(await store.load()).toBeNull();
    await store.save({ ...sessionData(), sources: [], crops: [] }, new Map());
    const local = new LocalStudioSessionStore(undefined, { autoResume: false });
    expect(await local.load()).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it("saves new local extraction under a distinct key while preserving legacy revision and original bytes", async () => {
    // Minimal asynchronous IDB boundary; all values live in test-owned Maps.
    const oldData = sessionData("old.pdf");
    const oldEnvelope = { version: 1, revision: 8, data: oldData };
    const oldFile = new Blob(["old original"]);
    const sessions = new Map<string, unknown>([["active", oldEnvelope]]);
    const originals = new Map<string, unknown>([["source1", oldFile]]);
    const resultRequest = (result: unknown) => {
      const request: { result: unknown; onsuccess?: () => void } = { result };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    };
    vi.stubGlobal("indexedDB", {
      open: () =>
        resultRequest({
          close: () => {},
          transaction: () => {
            let aborted = false;
            const tx: {
              objectStore: (name: string) => unknown;
              oncomplete?: () => void;
              onabort?: () => void;
              abort: () => void;
            } = {
              objectStore: (name) => {
                const values = name === "session" ? sessions : originals;
                return {
                  get: (key: string) => resultRequest(values.get(key)),
                  getKey: (key: string) =>
                    resultRequest(values.has(key) ? key : undefined),
                  put: (value: unknown, key: string) => values.set(key, value),
                  delete: (key: string) => values.delete(key),
                  clear: () => values.clear(),
                };
              },
              abort: () => {
                aborted = true;
                queueMicrotask(() => tx.onabort?.());
              },
            };
            setTimeout(() => {
              if (!aborted) tx.oncomplete?.();
            }, 0);
            return tx;
          },
        }),
    });
    const store = new LocalStudioSessionStore(undefined, { autoResume: false });
    expect(await store.load()).toBeNull();
    const data = {
      ...sessionData("new.pdf"),
      sources: [
        { id: "new-source", name: "new.pdf", kind: "pdf" as const, pages: 1 },
      ],
      sourceId: "new-source",
    };
    const file = new Blob(["new original"]);
    await store.save(data, new Map([["new-source", file]]));
    expect(sessions.get("active")).toBe(oldEnvelope);
    expect(originals.get("source1")).toBe(oldFile);
    expect(sessions.size).toBe(2);
    const newId = [...sessions.keys()].find((key) => key !== "active")!;
    const resumed = new LocalStudioSessionStore(
      undefined,
      { autoResume: false },
      newId,
    );
    expect(await resumed.load()).toEqual({
      data,
      originals: new Map([["new-source", file]]),
    });
    await store.clear();
    expect(sessions.get("active")).toBe(oldEnvelope);
    expect(originals.get("source1")).toBe(oldFile);
  });
});
