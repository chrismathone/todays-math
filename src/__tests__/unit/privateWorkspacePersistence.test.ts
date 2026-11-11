import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrivateDraftStore } from "@/components/unified/privateDraftStore";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
  LEGACY_DRAFT_KEY,
} from "@/components/unified/draftStore";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import {
  PrivateStudioSessionStore,
  forgetPrivateExtraction,
} from "@/components/unified/privateStudioSessionStore";
import {
  privateServer,
  memoryRecovery,
  problem,
  sessionData,
} from "../fixtures/privateCloud";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("cloud worksheet persistence", () => {
  it("retries a failed visibility-only save without edits and keeps its original optimistic base", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const cloud = createPrivateDraftStore("owner-a", client);
    await cloud.hydrate();
    cloud.setProblems([problem()]);
    expect(await cloud.saveNow()).toBe(true);
    const share = {
      visibility: "branch" as const,
      sharedBranchId: "30000000-0000-4000-8000-000000000003",
    };
    server.fail(503);
    expect(await cloud.saveNow(share)).toBe(false);
    server.fail(0);
    expect(await cloud.saveNow(share)).toBe(true);
    expect([...server.documents.values()][0]).toMatchObject({
      ...share,
      revision: 2,
    });
    cloud.setTitle("공개 후 자동 저장");
    expect(await cloud.saveNow()).toBe(true);
    expect([...server.documents.values()][0]).toMatchObject({
      ...share,
      revision: 3,
    });
    expect(
      await cloud.saveNow({ visibility: "private", sharedBranchId: null }),
    ).toBe(true);
    expect([...server.documents.values()][0]).toMatchObject({
      visibility: "private",
      sharedBranchId: null,
      revision: 4,
    });
  });

  it("waits for a departing worksheet instance before reopening its recovery", async () => {
    const server = privateServer();
    let complete!: () => void;
    const gate = new Promise<void>((resolve) => {
      complete = resolve;
    });
    let started!: () => void;
    const saving = new Promise<void>((resolve) => {
      started = resolve;
    });
    const first = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", async (url, init) => {
        const response = await server.transport(url, init);
        if (init?.method === "PUT") {
          started();
          await gate;
        }
        return response;
      }),
    );
    await first.hydrate();
    first.setProblems([problem()]);
    const pending = first.saveNow();
    await saving;
    first.release();
    const second = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    const reopening = second.hydrate();
    await new Promise((resolve) => setTimeout(resolve, 0));
    complete();
    await pending;
    await reopening;
    second.setTitle("돌아와서 수정");
    expect(await second.saveNow()).toBe(true);
    expect([...server.documents.values()][0]).toMatchObject({
      title: "돌아와서 수정",
      revision: 2,
    });
  });
  it("uses the confirmed revision for edits queued behind a lost save response", async () => {
    const server = privateServer();
    let complete!: () => void;
    const responseGate = new Promise<void>((resolve) => {
      complete = resolve;
    });
    let started!: () => void;
    const saving = new Promise<void>((resolve) => {
      started = resolve;
    });
    let loseResponse = true;
    const client = new PrivateCloudClient("owner-a", async (url, init) => {
      const response = await server.transport(url, init);
      if (init?.method === "PUT" && loseResponse) {
        loseResponse = false;
        started();
        await responseGate;
        throw new Error("response lost");
      }
      return response;
    });
    const cloud = createPrivateDraftStore("owner-a", client);
    await cloud.hydrate();
    cloud.setProblems([problem()]);
    const first = cloud.saveNow();
    await saving;
    cloud.setTitle("저장 중에 추가한 수정");
    const second = cloud.saveNow();
    complete();
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    const document = [...server.documents.values()][0];
    expect(document).toMatchObject({
      revision: 2,
      title: "저장 중에 추가한 수정",
    });
    expect(
      server.transport.mock.calls
        .filter(([, init]) => init?.method === "PUT")
        .map(([, init]) => JSON.parse(String(init?.body)).expectedRevision),
    ).toEqual([null, 1]);
    expect(cloud.getSnapshot().saveStatus).toBe("saved");
  });
  it("opens a library-renamed current draft without an obsolete write, then forgets an acknowledged deletion", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const cloud = createPrivateDraftStore("owner-a", client);
    await cloud.hydrate();
    cloud.setProblems([problem()]);
    await cloud.saveNow();
    const id = cloud.getSnapshot().draft.id;
    await client.rename(id, "보관함 새 이름", 1);
    server.transport.mockClear();
    expect(await cloud.openDraft(id)).toBe(true);
    expect(cloud.getSnapshot().draft.title).toBe("보관함 새 이름");
    expect(
      server.transport.mock.calls.some(([, init]) => init?.method === "PUT"),
    ).toBe(false);
    await client.remove(id, 2);
    cloud.setTitle("아직 화면에 있던 수정");
    expect(cloud.forgetDraft(id)).toBe(true);
    expect(cloud.getSnapshot().draft.problems).toEqual([]);
    await cloud.saveNow();
    expect(server.documents.size).toBe(0);
    const fresh = createPrivateDraftStore("owner-a", client);
    await fresh.hydrate();
    expect(fresh.getSnapshot().recent).toHaveLength(0);
  });
  it("saves and restores on a fresh browser with no local data", async () => {
    const server = privateServer();
    const first = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await first.hydrate();
    first.setTitle("기기 간 시험지");
    first.setProblems([problem()]);
    expect(first.getSnapshot().saveStatus).toBe("saving");
    expect(await first.saveNow()).toBe(true);
    expect(first.getSnapshot().saveStatus).toBe("saved");
    localStorage.clear();
    const fresh = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await fresh.hydrate();
    expect(fresh.getSnapshot().draft).toMatchObject({
      title: "기기 간 시험지",
      problems: [problem()],
    });
    expect(fresh.getSnapshot().recent).toHaveLength(1);
  });
  it("migrates only account-specific data while preserving original recovery keys", async () => {
    const source = createWorkspaceDraftStore(() => ({
      getItem: (key) => localStorage.getItem(`${key}:owner-a`),
      setItem: (key, value) => localStorage.setItem(`${key}:owner-a`, value),
    }));
    source.hydrate();
    source.setProblems([problem("owned")]);
    source.saveNow();
    const original = localStorage.getItem(`${DRAFT_STORE_KEY}:owner-a`);
    localStorage.setItem(
      LEGACY_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        title: "Shared unrelated",
        problems: [problem("other")],
        columns: 1,
        answers: false,
      }),
    );
    const server = privateServer();
    const cloud = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await cloud.hydrate();
    await cloud.saveNow();
    expect([...server.documents.values()][0].payload.problems).toEqual([
      problem("owned"),
    ]);
    expect(localStorage.getItem(`${DRAFT_STORE_KEY}:owner-a`)).toBe(original);
    server.switchAccount("owner-b");
    const second = createPrivateDraftStore(
      "owner-b",
      new PrivateCloudClient("owner-b", server.transport),
    );
    await second.hydrate();
    expect(second.getSnapshot().draft.problems).toEqual([]);
  });
  it("keeps cross-device revisions and unsent recovery honest on conflict", async () => {
    const server = privateServer();
    const client = () => new PrivateCloudClient("owner-a", server.transport);
    const a = createPrivateDraftStore("owner-a", client());
    await a.hydrate();
    a.setProblems([problem()]);
    await a.saveNow();
    const b = createPrivateDraftStore("owner-a", client());
    await b.hydrate();
    a.setTitle("다른 기기");
    await a.saveNow();
    b.setTitle("내 변경 유지");
    expect(await b.saveNow()).toBe(false);
    expect(b.getSnapshot()).toMatchObject({
      saveStatus: "error",
      draft: { title: "내 변경 유지" },
    });
    expect(b.getSnapshot().saveError).toContain("다른 창이나 기기");
    server.transport.mockClear();
    for (let edit = 0; edit < 4; edit++) {
      b.setTitle(`내 변경 유지 ${edit}`);
      expect(await b.saveNow()).toBe(false);
    }
    expect(
      server.transport.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
    const restored = createPrivateDraftStore("owner-a", client());
    await restored.hydrate();
    expect(restored.getSnapshot().draft.title).toBe("내 변경 유지 3");
    expect(await restored.saveNow()).toBe(false);
    expect([...server.documents.values()][0].title).toBe("다른 기기");
  });
  it("retains failed edits and can retry without a false saved state", async () => {
    const server = privateServer();
    const cloud = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await cloud.hydrate();
    server.fail(503);
    cloud.setProblems([problem()]);
    expect(await cloud.saveNow()).toBe(false);
    expect(cloud.getSnapshot().saveStatus).toBe("error");
    expect(cloud.getSnapshot().draft.problems).toHaveLength(1);
    server.fail(0);
    expect(await cloud.saveNow()).toBe(true);
    expect(server.documents.size).toBe(1);
  });
  it("externalizes worksheet images and preserves portable cloud cache across a reload", async () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:private-crop");
    const server = privateServer();
    const cloud = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await cloud.hydrate();
    cloud.setProblems([
      { ...problem(), croppedImage: "data:image/png;base64,aGVsbG8=" },
    ]);
    expect(await cloud.saveNow()).toBe(true);
    expect(
      JSON.stringify([...server.documents.values()][0].payload),
    ).not.toContain("data:image");
    const fresh = createPrivateDraftStore(
      "owner-a",
      new PrivateCloudClient("owner-a", server.transport),
    );
    await fresh.hydrate();
    fresh.setTitle("새 제목");
    expect(await fresh.saveNow()).toBe(true);
    expect(
      JSON.stringify([...server.documents.values()][0].payload),
    ).not.toContain("blob:");
    expect(
      localStorage.getItem(`${DRAFT_STORE_KEY}:cloud:owner-a`),
    ).not.toContain("blob:");
  });
});
describe("cloud extraction sessions", () => {
  it("waits for a departing extraction save before restoring its pending revision", async () => {
    const server = privateServer();
    const recovery = memoryRecovery();
    let complete!: () => void;
    const gate = new Promise<void>((resolve) => {
      complete = resolve;
    });
    let started!: () => void;
    const saving = new Promise<void>((resolve) => {
      started = resolve;
    });
    const first = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      new PrivateCloudClient("owner-a", async (url, init) => {
        const response = await server.transport(url, init);
        if (init?.method === "PUT" && String(url).includes("/documents/")) {
          started();
          await gate;
        }
        return response;
      }),
      recovery,
    );
    await first.load();
    const originals = new Map([
      ["source1", new Blob(["PDF"], { type: "application/pdf" })],
    ]);
    const pending = first.save(sessionData(), originals);
    await saving;
    first.release();
    const second = new PrivateStudioSessionStore(
      "owner-a",
      first.documentId,
      undefined,
      new PrivateCloudClient("owner-a", server.transport),
      recovery,
    );
    const reopening = second.load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    complete();
    await pending;
    const restored = await reopening;
    await expect(
      second.save({ ...restored!.data, pageNumber: 2 }, restored!.originals),
    ).resolves.toBeUndefined();
    expect([...server.documents.values()][0].revision).toBe(2);
  });
  it("clears the deleted current selection, rejects late saves, and starts a new document", async () => {
    const server = privateServer();
    const recovery = memoryRecovery();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const studio = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client,
      recovery,
    );
    await studio.load();
    const originals = new Map([
      ["source1", new Blob(["PDF"], { type: "application/pdf" })],
    ]);
    await studio.save(sessionData(), originals);
    const id = studio.documentId!;
    await client.remove(id, 1);
    await forgetPrivateExtraction("owner-a", id, recovery);
    await expect(
      studio.save({ ...sessionData(), pageNumber: 2 }, originals),
    ).rejects.toThrow("삭제");
    const next = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client,
      recovery,
    );
    expect(await next.load()).toBeNull();
    await next.save(sessionData("새 자료.pdf"), originals);
    expect(next.documentId).not.toBe(id);
    expect(server.documents.size).toBe(1);
  });
  // 원장님 2026-11-11(웨일) — 이 브라우저의 복구 사본(IndexedDB)이 «Failed to write blobs (IOError)»로 거부되자
  // 계정 저장까지 멈추고 영어 원문이 화면에 떴다. 복구 사본은 보조다 — 실패해도 계정 저장은 끝까지 간다.
  it("still saves to the account when the local recovery copy cannot be written", async () => {
    const server = privateServer();
    const memory = memoryRecovery();
    const broken = {
      get: memory.get,
      put: vi.fn(async () => {
        throw new DOMException(
          "Failed to write blobs (IOError)",
          "UnknownError",
        );
      }),
    };
    const studio = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      new PrivateCloudClient("owner-a", server.transport),
      broken,
    );
    await studio.load();
    const originals = new Map([
      ["source1", new Blob(["PDF"], { type: "application/pdf" })],
    ]);
    await expect(
      studio.save(sessionData(), originals),
    ).resolves.toBeUndefined();
    expect(broken.put).toHaveBeenCalled();
    expect(server.documents.size).toBe(1);
    expect([...server.documents.values()][0].revision).toBe(1);
  });
  it("recovers pending materialized crop images with portable URLs after a failed save", async () => {
    vi.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:old-page")
      .mockReturnValueOnce("blob:new-page");
    const server = privateServer();
    const recovery = memoryRecovery();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const studio = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client,
      recovery,
    );
    await studio.load();
    const originals = new Map([
      ["source1", new Blob(["PDF"], { type: "application/pdf" })],
    ]);
    const crop = {
      id: "crop",
      sourceId: "source1",
      sourceLabel: "원본",
      page: 1,
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: "data:image/png;base64,aGVsbG8=",
      content: "문제",
      answer: "1",
      solution: "",
      level: "secondary" as const,
      grade: "중1",
      mode: "image" as const,
      added: false,
    };
    await studio.save({ ...sessionData(), crops: [crop] }, originals);
    const loadedClient = new PrivateCloudClient("owner-a", server.transport);
    const loaded = new PrivateStudioSessionStore(
      "owner-a",
      studio.documentId,
      undefined,
      loadedClient,
      recovery,
    );
    const displayed = await loaded.load();
    expect(displayed!.data.crops[0].image).toBe("blob:old-page");
    server.fail(503);
    await expect(
      loaded.save({ ...displayed!.data, pageNumber: 2 }, displayed!.originals),
    ).rejects.toThrow();
    server.fail(0);
    const fresh = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      new PrivateCloudClient("owner-a", server.transport),
      recovery,
    );
    const restored = await fresh.load();
    expect(restored!.data.crops[0].image).toBe("blob:new-page");
    await fresh.save(restored!.data, restored!.originals);
    expect(
      JSON.stringify(
        server.documents.get(`owner-a:${studio.documentId}`)?.payload,
      ),
    ).not.toContain("blob:");
  });
  it("starts original and crop asset restoration in parallel within the client transfer limit", async () => {
    const server = privateServer();
    const writer = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      new PrivateCloudClient("owner-a", server.transport),
      memoryRecovery(),
    );
    await writer.load();
    const crop = {
      id: "crop",
      sourceId: "source1",
      sourceLabel: "원본",
      page: 1,
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: "data:image/png;base64,aGVsbG8=",
      content: "문제",
      answer: "1",
      solution: "",
      level: "secondary" as const,
      grade: "중1",
      mode: "image" as const,
      added: false,
    };
    await writer.save(
      { ...sessionData(), crops: [crop] },
      new Map([["source1", new Blob(["PDF"], { type: "application/pdf" })]]),
    );

    let assetFetches = 0;
    let bothStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      bothStarted = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport: typeof fetch = async (input, init) => {
      if (String(input).includes("/api/library/assets/") && !init?.method) {
        if (++assetFetches === 2) bothStarted();
        await gate;
      }
      return server.transport(input, init);
    };
    const reader = new PrivateStudioSessionStore(
      "owner-a",
      writer.documentId,
      undefined,
      new PrivateCloudClient("owner-a", transport),
      memoryRecovery(),
    );
    const loading = reader.load();
    await started;
    expect(assetFetches).toBe(2);
    release();
    const restored = await loading;
    expect(await restored!.originals.get("source1")!.text()).toBe("PDF");
    expect(restored!.data.crops[0].image).toMatch(/^blob:/);
  });
  it("retains each session after start over and reopens originals by stable ID on another device", async () => {
    const server = privateServer();
    const client = () => new PrivateCloudClient("owner-a", server.transport);
    const store = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client(),
      memoryRecovery(),
    );
    await store.load();
    const originals = new Map([
      ["source1", new Blob(["private PDF"], { type: "application/pdf" })],
    ]);
    await store.save(sessionData("첫 자료.pdf"), originals);
    const firstId = store.documentId!;
    await store.clear();
    await store.save(sessionData("다음 자료.pdf"), originals);
    expect(store.documentId).not.toBe(firstId);
    expect(server.documents.size).toBe(2);
    const fresh = new PrivateStudioSessionStore(
      "owner-a",
      firstId,
      undefined,
      client(),
      memoryRecovery(),
    );
    const restored = await fresh.load();
    expect(restored?.data.sources[0].name).toBe("첫 자료.pdf");
    expect(await restored?.originals.get("source1")?.text()).toBe(
      "private PDF",
    );
    expect([...server.documents.values()][0].payload.assets).toMatchObject({
      source1: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    await fresh.save({ ...restored!.data, pageNumber: 2 }, restored!.originals);
    expect(server.documents.get(`owner-a:${firstId}`)?.revision).toBe(2);
  });
  it("prevents reset from discarding failed originals and retries recovered unsent data", async () => {
    const server = privateServer();
    const recovery = memoryRecovery();
    const client = () => new PrivateCloudClient("owner-a", server.transport);
    const store = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client(),
      recovery,
    );
    await store.load();
    const originals = new Map([
      ["source1", new Blob(["original"], { type: "application/pdf" })],
    ]);
    server.fail(503);
    await expect(store.save(sessionData(), originals)).rejects.toThrow();
    await expect(store.clear()).rejects.toThrow();
    const resumed = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client(),
      recovery,
    );
    const data = await resumed.load();
    expect(await data?.originals.get("source1")?.text()).toBe("original");
    server.fail(0);
    await resumed.save(data!.data, data!.originals);
    expect(server.documents.size).toBe(1);
  });
  it("detects extraction conflicts across devices instead of overwriting", async () => {
    const server = privateServer();
    const client = () => new PrivateCloudClient("owner-a", server.transport);
    const first = new PrivateStudioSessionStore(
      "owner-a",
      undefined,
      undefined,
      client(),
      memoryRecovery(),
    );
    await first.load();
    const originals = new Map([
      ["source1", new Blob(["PDF"], { type: "application/pdf" })],
    ]);
    await first.save(sessionData(), originals);
    const secondRecovery = memoryRecovery();
    const second = new PrivateStudioSessionStore(
      "owner-a",
      first.documentId,
      undefined,
      client(),
      secondRecovery,
    );
    await second.load();
    await first.save({ ...sessionData(), pageNumber: 2 }, originals);
    await expect(
      second.save({ ...sessionData(), pageNumber: 3 }, originals),
    ).rejects.toMatchObject({ status: 409 });
    expect(second.conflict).toBe(true);
    server.transport.mockClear();
    for (let pageNumber = 4; pageNumber <= 6; pageNumber++) {
      await expect(
        second.save({ ...sessionData(), pageNumber }, originals),
      ).rejects.toMatchObject({ status: 409 });
    }
    expect(
      server.transport.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
    const resumed = new PrivateStudioSessionStore(
      "owner-a",
      first.documentId,
      undefined,
      client(),
      secondRecovery,
    );
    const recovered = await resumed.load();
    expect(recovered?.data.pageNumber).toBe(6);
    expect(await recovered?.originals.get("source1")?.text()).toBe("PDF");
    expect(
      (
        server.documents.get(`owner-a:${first.documentId}`)?.payload.data as {
          pageNumber: number;
        }
      ).pageNumber,
    ).toBe(2);
  });
});
