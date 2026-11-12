import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
  parseImport,
} from "@/components/unified/draftStore";
import { createPrivateDraftStore } from "@/components/unified/privateDraftStore";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import {
  documentWorkflow,
  parseWorkspaceWorkflow,
} from "@/contracts/workspaceWorkflow.contract";
import { privateServer, problem } from "../fixtures/privateCloud";

const recoveryKey = `${DRAFT_STORE_KEY}:cloud:owner-a`;
const explicit = { autoResume: false };
beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("explicit worksheet resume", () => {
  it.each(["scope", "review", "output"] as const)(
    "round-trips %s without opening it or saving a blank visit",
    (step) => {
      const first = createWorkspaceDraftStore(undefined, explicit);
      first.hydrate();
      first.setWorkflow({
        source: "extraction",
        step,
        sourceDocumentId: "source-1",
      });
      first.flush();
      expect(localStorage.getItem(DRAFT_STORE_KEY)).toBeNull();
      first.setProblems([problem()]);
      first.saveNow();
      const id = first.getSnapshot().draft.id;
      const saved = localStorage.getItem(DRAFT_STORE_KEY);
      const second = createWorkspaceDraftStore(undefined, explicit);
      second.hydrate();
      second.flush();
      second.saveNow();
      expect(second.getSnapshot().draft.problems).toEqual([]);
      expect(localStorage.getItem(DRAFT_STORE_KEY)).toBe(saved);
      expect(second.getSnapshot().recent[0].workflow).toEqual({
        source: "extraction",
        step,
        sourceDocumentId: "source-1",
      });
      expect(second.openDraft(id)).toBe(true);
      expect(second.getSnapshot().draft.workflow?.step).toBe(step);
    },
  );

  it("lists cloud records without fetching any payload/assets or writing on blank mount", async () => {
    const server = privateServer();
    for (const id of ["first", "second"])
      server.documents.set(`owner-a:${id}`, {
        id,
        kind: "draft",
        title: id,
        problemCount: 1,
        revision: 3,
        createdAt: "2026-10-14T00:00:00Z",
        updatedAt: "2026-10-14T00:00:00Z",
        payload: {
          version: 1,
          title: id,
          problems: [problem()],
          workflow: { source: "bank", step: "review" },
        },
        workflow: { source: "bank", step: "review" },
      });
    const client = new PrivateCloudClient("owner-a", server.transport);
    const store = createPrivateDraftStore(
      "owner-a",
      client,
      undefined,
      explicit,
    );
    await store.hydrate();
    store.setWorkflow({ source: "bank", step: "scope" });
    store.flush();
    expect(await store.saveNow()).toBe(true);
    expect(store.getSnapshot().draft.problems).toEqual([]);
    expect(store.getSnapshot().recent).toHaveLength(2);
    expect(server.transport.mock.calls).toHaveLength(1);
    expect(String(server.transport.mock.calls[0][0])).toContain("/documents?");
    expect(await store.openDraft("first")).toBe(true);
    expect(store.getSnapshot().draft.workflow?.step).toBe("review");
    expect(server.transport.mock.calls).toHaveLength(2);
    client.dispose();
  });

  it("retains every cached draft/base and resumes unsent edits without adopting a newer cloud revision", async () => {
    const server = privateServer();
    const date = "2026-10-14T00:00:00Z";
    const clean = {
      ...parseImport({ version: 1, title: "clean", problems: [problem()] }),
      id: "clean",
      updatedAt: date,
    };
    const dirty = {
      ...clean,
      id: "unsent",
      title: "unsent edit",
      workflow: { source: "bank", step: "output" },
    };
    const bases = {
      clean: { revision: 4, acknowledged: JSON.stringify(clean) },
      unsent: { revision: 2, acknowledged: "original server version" },
    };
    localStorage.setItem(
      recoveryKey,
      JSON.stringify({
        envelope: JSON.stringify({
          version: 1,
          activeId: "unsent",
          drafts: [clean, dirty],
        }),
        bases,
      }),
    );
    server.documents.set("owner-a:unsent", {
      id: "unsent",
      kind: "draft",
      title: "new remote",
      problemCount: 1,
      revision: 3,
      createdAt: date,
      updatedAt: date,
      payload: { ...dirty, title: "new remote", version: 1 },
    });
    const client = new PrivateCloudClient("owner-a", server.transport);
    const store = createPrivateDraftStore(
      "owner-a",
      client,
      undefined,
      explicit,
    );
    await store.hydrate();
    expect(store.getSnapshot().draft.problems).toEqual([]);
    const recovery = JSON.parse(localStorage.getItem(recoveryKey)!);
    expect(JSON.parse(recovery.envelope).drafts).toEqual([clean, dirty]);
    expect(recovery.bases).toEqual(bases);
    expect(server.transport.mock.calls).toHaveLength(1);
    expect(await store.openDraft("unsent")).toBe(true);
    expect(store.getSnapshot().draft.title).toBe("unsent edit");
    expect(await store.saveNow()).toBe(false);
    expect(server.documents.get("owner-a:unsent")?.revision).toBe(3);
    expect(
      JSON.parse(localStorage.getItem(recoveryKey)!).bases.unsent.revision,
    ).toBe(2);
    const writes = server.transport.mock.calls.filter(
      ([, init]) => init?.method === "PUT",
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]?.body)).expectedRevision).toBe(2);
    // The cloud client may read after a failed PUT to detect a lost successful
    // acknowledgment, but resume itself must not fetch/replace the recovery.
    expect(server.transport.mock.calls[1][1]?.method).toBe("PUT");
    client.dispose();
  });
});

describe("legacy progress metadata", () => {
  it("keeps absent and malformed stages unknown", () => {
    expect(
      documentWorkflow("draft", { problems: [problem()] }),
    ).toBeUndefined();
    expect(
      parseWorkspaceWorkflow({ source: "bank", step: "done" }),
    ).toBeUndefined();
    expect(
      documentWorkflow("extraction", { data: { step: "unknown" } }),
    ).toBeUndefined();
    expect(documentWorkflow("arithmeticSheet", {})).toBeUndefined();
  });
  it.each(["upload", "import", "order", "crop", "review", "export"])(
    "uses the actual saved extraction %s stage",
    (step) => {
      expect(documentWorkflow("extraction", { data: { step } })).toEqual({
        source: "extraction",
        step:
          step === "export" ? "output" : step === "upload" ? "import" : step,
      });
    },
  );
  it("reads optional arithmetic presentation without changing its payload", () => {
    const payload = {
      version: 2,
      presentation: { version: 1, step: "output" },
      items: [{ answer: "3" }],
    };
    const before = JSON.stringify(payload);
    expect(documentWorkflow("arithmeticSheet", payload)).toEqual({
      source: "arithmetic",
      step: "output",
    });
    expect(JSON.stringify(payload)).toBe(before);
  });
});
