import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrivateDraftStore } from "@/components/unified/privateDraftStore";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { DRAFT_STORE_KEY, parseImport } from "@/components/unified/draftStore";
import { privateServer, problem } from "../fixtures/privateCloud";

const recoveryKey = `${DRAFT_STORE_KEY}:cloud:owner-a`;
const asset = (index: number) =>
  `/api/library/assets/${index.toString(16).padStart(64, "0")}`;

function fixture(count = 12) {
  const server = privateServer();
  for (let index = 0; index < count; index++) {
    const images = [1, 2, 3].map((offset) => asset(index * 3 + offset));
    for (const path of images) {
      const bytes = new TextEncoder().encode(path);
      server.assets.set(`owner-a:${path.split("/").at(-1)}`, {
        bytes,
        size: bytes.length,
        type: "image/png",
      });
    }
    const title = `시험지 ${index}`;
    const payload = {
      version: 1,
      title,
      columns: 2,
      answers: false,
      problems: [
        {
          ...problem(`p${index}`),
          content: images.map((path) => `![원본](${path})`).join("\n"),
          sourceLabel: `원본 ${index}`,
          sourcePayload: { text: "원문 유지", ids: [3, 1, 2] },
        },
      ],
    };
    server.documents.set(`owner-a:d${index}`, {
      id: `d${index}`,
      kind: "draft",
      title,
      payload,
      revision: 1,
      problemCount: 1,
      visibility: "private",
      sharedBranchId: null,
      createdAt: "2026-10-08T00:00:00.000Z",
      updatedAt: `2026-10-08T00:00:${String(index).padStart(2, "0")}.000Z`,
    });
  }
  const reads: { path: string; start: number }[] = [];
  let activeAssets = 0;
  let maxAssets = 0;
  const started = Date.now();
  const transport: typeof fetch = async (url, init) => {
    if (!init?.method || init.method === "GET") {
      const path = String(url);
      reads.push({ path, start: Date.now() - started });
      const image = path.includes("/assets/");
      if (image) maxAssets = Math.max(maxAssets, ++activeAssets);
      await new Promise((resolve) =>
        setTimeout(resolve, image ? 80 : path.includes("?") ? 100 : 150),
      );
      if (image) activeAssets--;
    }
    return server.transport(url, init);
  };
  const client = new PrivateCloudClient("owner-a", transport);
  const store = createPrivateDraftStore("owner-a", client);
  return { server, reads, client, store, maxAssets: () => maxAssets };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("crypto", webcrypto);
  let next = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:image-${++next}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("private draft loading request graph", () => {
  it("measures hydration with 12 saved papers without downloading inactive payloads or assets", async () => {
    const { store, client, reads, server, maxAssets } = fixture();
    const started = Date.now();
    let readyAt = 0;
    const loading = store.hydrate().then(() => {
      readyAt = Date.now() - started;
    });
    store.setTitle("must not save before validation");
    store.flush();
    await vi.advanceTimersByTimeAsync(329);
    expect(store.getSnapshot().hydrated).toBe(false);
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
    await vi.runAllTimersAsync();
    await loading;
    console.info(
      JSON.stringify({
        hydrationMs: readyAt,
        requests: reads.length,
        graph: reads,
      }),
    );
    expect(readyAt).toBe(330);
    expect(reads.map((read) => read.start)).toEqual([0, 100, 250, 250, 250]);
    expect(maxAssets()).toBe(3);
    expect(store.getSnapshot()).toMatchObject({
      hydrated: true,
      saveStatus: "saved",
      draft: { id: "d11", title: "시험지 11" },
    });
    expect(store.getSnapshot().recent).toHaveLength(12);
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);

    // Selecting another paper fetches its latest payload and images on demand.
    const expected = server.documents.get("owner-a:d0")!.payload.problems;
    const opening = store.openDraft("d0");
    await vi.runAllTimersAsync();
    expect(await opening).toBe(true);
    expect(reads).toHaveLength(9);
    expect(
      await client.externalize(store.getSnapshot().draft.problems),
    ).toEqual(expected);
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
    client.dispose();
  });

  it("validates the remembered active draft against the server and drops clean deleted recovery", async () => {
    const { store, server, reads, client } = fixture(3);
    const old = server.documents.get("owner-a:d0")!;
    const cached = {
      ...parseImport(old.payload),
      id: old.id,
      updatedAt: old.updatedAt,
    };
    const deleted = { ...cached, id: "deleted" };
    localStorage.setItem(
      recoveryKey,
      JSON.stringify({
        envelope: JSON.stringify({
          version: 1,
          activeId: "d0",
          drafts: [cached, deleted],
        }),
        bases: {
          d0: { revision: 1, acknowledged: JSON.stringify(cached) },
          deleted: { revision: 1, acknowledged: JSON.stringify(deleted) },
        },
      }),
    );
    server.documents.set("owner-a:d0", {
      ...old,
      title: "다른 기기의 최신 제목",
      revision: 2,
    });
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    expect(store.getSnapshot().draft).toMatchObject({
      id: "d0",
      title: "다른 기기의 최신 제목",
    });
    expect(
      reads
        .filter(({ path }) => /\/documents\//.test(path))
        .map(({ path }) => path),
    ).toEqual(["/api/library/documents/d0"]);
    expect(store.getSnapshot().recent.map((item) => item.id)).not.toContain(
      "deleted",
    );
    expect(await store.saveNow()).toBe(true);
    expect(server.documents.get("owner-a:d0")!.revision).toBe(2);
    client.dispose();
  });

  it("keeps inactive unsent recovery portable and never adopts a newer conflicting revision", async () => {
    const { store, server, reads, client } = fixture(2);
    const old = server.documents.get("owner-a:d0")!;
    const cached = {
      ...parseImport(old.payload),
      id: old.id,
      updatedAt: old.updatedAt,
    };
    const dirty = { ...cached, title: "보내지 못한 수정" };
    localStorage.setItem(
      recoveryKey,
      JSON.stringify({
        envelope: JSON.stringify({
          version: 1,
          activeId: "d1",
          drafts: [
            dirty,
            {
              ...parseImport(server.documents.get("owner-a:d1")!.payload),
              id: "d1",
              updatedAt: old.updatedAt,
            },
          ],
        }),
        bases: {
          d0: { revision: 1, acknowledged: JSON.stringify(cached) },
          // This cached active copy is clean.
          d1: {
            revision: 1,
            acknowledged: JSON.stringify({
              ...parseImport(server.documents.get("owner-a:d1")!.payload),
              id: "d1",
              updatedAt: old.updatedAt,
            }),
          },
        },
      }),
    );
    server.documents.set("owner-a:d0", {
      ...old,
      title: "다른 기기의 수정",
      revision: 2,
    });
    // An inactive draft's inaccessible image must not block the active draft.
    server.assets.delete(`owner-a:${asset(1).split("/").at(-1)}`);
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    expect(await store.saveNow()).toBe(false);
    expect(store.getSnapshot().draft.id).toBe("d1");
    expect(
      reads
        .filter(({ path }) => path.includes("/assets/"))
        .map(({ path }) => path),
    ).toEqual([asset(4), asset(5), asset(6)]);
    const writes = server.transport.mock.calls.filter(
      ([, init]) => init?.method === "PUT",
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]?.body))).toMatchObject({
      expectedRevision: 1,
      title: dirty.title,
    });
    expect(server.documents.get("owner-a:d0")!.title).toBe("다른 기기의 수정");
    const recovery = JSON.parse(localStorage.getItem(recoveryKey)!);
    expect(
      JSON.parse(recovery.envelope).drafts.find(
        (draft: { id: string }) => draft.id === "d0",
      ),
    ).toEqual(dirty);
    expect(recovery.bases.d0.revision).toBe(1);
    client.dispose();
  });

  it("keeps failed active asset validation in the error state and never autosaves it", async () => {
    const { store, client, server } = fixture(1);
    server.assets.clear();
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    expect(store.getSnapshot().saveStatus).toBe("error");
    expect(store.getSnapshot().saveError).toBeTruthy();
    store.setTitle("실패 뒤 복구 작업");
    store.flush();
    await vi.runAllTimersAsync();
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
    client.dispose();
  });

  it("does not replace current edits or recovery when a lazy open finishes late", async () => {
    const { store, client, server } = fixture(2);
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    const opening = store.openDraft("d0");
    await vi.advanceTimersByTimeAsync(1);
    store.setTitle("불러오는 중에 고친 제목");
    await vi.advanceTimersByTimeAsync(229);
    expect(await opening).toBe(false);
    expect(store.getSnapshot().draft).toMatchObject({
      id: "d1",
      title: "불러오는 중에 고친 제목",
    });
    expect(await store.saveNow()).toBe(true);
    expect(server.documents.get("owner-a:d1")).toMatchObject({
      title: "불러오는 중에 고친 제목",
      revision: 2,
    });
    const saved = JSON.parse(
      JSON.parse(localStorage.getItem(recoveryKey)!).envelope,
    );
    expect(saved.activeId).toBe("d1");
    expect(saved.drafts.map((draft: { id: string }) => draft.id)).toEqual([
      "d1",
    ]);
    client.dispose();
  });

  it("keeps the latest selection when lazy opens finish out of order", async () => {
    const { store, client } = fixture(3);
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    const first = store.openDraft("d0");
    await vi.advanceTimersByTimeAsync(1);
    const second = store.openDraft("d1");
    await vi.runAllTimersAsync();
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(store.getSnapshot().draft.id).toBe("d1");
    client.dispose();
  });

  it("forgets an acknowledged library deletion even when its payload was never opened", async () => {
    const { store, client, server } = fixture(2);
    const loading = store.hydrate();
    await vi.runAllTimersAsync();
    await loading;
    server.documents.delete("owner-a:d0");
    expect(store.forgetDraft("d0")).toBe(true);
    expect(store.getSnapshot().recent.map((item) => item.id)).toEqual(["d1"]);
    expect(await store.saveNow()).toBe(true);
    expect(server.documents.size).toBe(1);
    client.dispose();
  });
});
