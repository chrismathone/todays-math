import {
  createWorkspaceDraftStore,
  DRAFT_STORE_KEY,
  parseEnvelope,
  parseImport,
  type WorkspaceDraft,
  type WorkspaceDraftSnapshot,
} from "./draftStore";
import {
  cloudError,
  PrivateCloudClient,
  PrivateCloudError,
} from "./privateCloudClient";
import type {
  PrivateDocument,
  PrivateDocumentSummary,
  DocumentSharing,
  DocumentVisibility,
} from "@/contracts/privateWorkspace.contract";

type Base = {
  revision: number | null;
  acknowledged?: string;
  visibility?: DocumentVisibility;
  sharedBranchId?: string | null;
};
type Recovery = { envelope: string | null; bases: Record<string, Base> };
const fingerprint = (draft: WorkspaceDraft) => JSON.stringify(draft);
const fromDocument = (doc: PrivateDocument): WorkspaceDraft => ({
  ...parseImport({ ...doc.payload, version: 1, title: doc.title }),
  id: doc.id,
  updatedAt: doc.updatedAt,
});

/** The synchronous editor remains in memory; the separate recovery key never replaces legacy data. */
export function createPrivateDraftStore(
  scope: string,
  client = new PrivateCloudClient(scope),
  storage = () => window.localStorage,
) {
  const recoveryKey = `${DRAFT_STORE_KEY}:cloud:${encodeURIComponent(scope)}`;
  let raw: string | null = null;
  let bases: Record<string, Base> = {};
  let initializing = true;
  let loadError: unknown;
  let error: string | null = null;
  let pending = 0;
  let tail: Promise<unknown> = Promise.resolve();
  let hydration: Promise<void> | undefined;
  let remoteSummaries: PrivateDocumentSummary[] = [];
  let opening = 0;
  let lifecycle = 0;
  const queued = new Map<string, string>();
  const conflicts = new Set<string>();
  const deleted = new Set<string>();
  const listeners = new Set<() => void>();
  const persist = () => {
    try {
      storage().setItem(
        recoveryKey,
        client.recoveryText(
          JSON.stringify({ envelope: raw, bases } satisfies Recovery),
        ),
      );
    } catch {
      /* Remote saves can succeed when the optional browser recovery cache is full. */
    }
  };
  const local = createWorkspaceDraftStore(() => ({
    getItem: (key) => (key === DRAFT_STORE_KEY ? raw : null),
    setItem: (_key, value) => {
      raw = value;
      persist();
    },
  }));
  const initial = local.getServerSnapshot();
  let snapshot: WorkspaceDraftSnapshot = initial;
  const publish = () => {
    const state = local.getSnapshot();
    // The library needs metadata, not every worksheet's payload and images.
    const recent = new Map(
      remoteSummaries.map((item) => [
        item.id,
        {
          id: item.id,
          title: item.title,
          problemCount: item.problemCount,
          updatedAt: item.updatedAt,
        },
      ]),
    );
    for (const item of state.recent) recent.set(item.id, item);
    for (const id of deleted) recent.delete(id);
    snapshot = {
      ...state,
      recent: [...recent.values()].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
      hydrated: !initializing && state.hydrated,
      saveStatus: initializing
        ? "loading"
        : error
          ? "error"
          : pending || state.saveStatus === "saving"
            ? "saving"
            : state.saveStatus,
      saveError: error ?? state.saveError,
    };
    listeners.forEach((listener) => listener());
  };
  const run = (work: () => Promise<void>) => {
    pending++;
    publish();
    const result = tail
      .catch(() => {})
      .then(work)
      .catch((cause) => {
        error = cloudError(cause);
        throw cause;
      })
      .finally(() => {
        pending--;
        publish();
      });
    tail = result;
    void result.catch(() => {});
    return result;
  };
  const enqueue = () => {
    if (initializing || !raw || loadError) return;
    for (const draft of parseEnvelope(raw).drafts) {
      if (deleted.has(draft.id) || conflicts.has(draft.id)) continue;
      const signature = fingerprint(draft);
      if (
        bases[draft.id]?.acknowledged === signature ||
        queued.get(draft.id) === signature
      )
        continue;
      queued.set(draft.id, signature);
      void run(async () => {
        if (deleted.has(draft.id) || conflicts.has(draft.id)) return;
        const payload = await client.externalize({ ...draft, version: 1 });
        if (deleted.has(draft.id)) return;
        const saved = await client
          .save(
            draft.id,
            "draft",
            draft.title,
            payload,
            bases[draft.id]?.revision ?? null,
          )
          .catch((cause) => {
            // Later autosaves still update local recovery, but a rejected base
            // cannot succeed by repeatedly sending it (including queued edits).
            if (cause instanceof PrivateCloudError && cause.status === 409)
              conflicts.add(draft.id);
            throw cause;
          });
        // An acknowledgment only covers the captured version, never newer editor changes.
        bases[draft.id] = {
          revision: saved.revision,
          acknowledged: signature,
          visibility: saved.visibility,
          sharedBranchId: saved.sharedBranchId,
        };
        if (
          raw &&
          parseEnvelope(raw).drafts.every(
            (item) => bases[item.id]?.acknowledged === fingerprint(item),
          )
        )
          error = null;
        persist();
      })
        .finally(() => {
          if (queued.get(draft.id) === signature) queued.delete(draft.id);
        })
        .catch(() => {});
    }
  };
  local.subscribe(() => {
    enqueue();
    publish();
  });
  const hydrate = () => {
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const cached = storage().getItem(recoveryKey);
        if (cached) {
          const recovery = JSON.parse(cached) as Recovery;
          if (recovery.envelope) parseEnvelope(recovery.envelope);
          raw = recovery.envelope;
          bases = recovery.bases;
        } else {
          // Only the explicitly scoped legacy keys belong to this account.
          const scoped = createWorkspaceDraftStore(() => ({
            getItem: (key) =>
              storage().getItem(`${key}:${encodeURIComponent(scope)}`),
            setItem: (key, value) => {
              if (key === DRAFT_STORE_KEY) raw = value;
            },
          }));
          scoped.hydrate();
          if (scoped.getSnapshot().saveError)
            throw new Error(scoped.getSnapshot().saveError!);
          raw ??= storage().getItem(
            `${DRAFT_STORE_KEY}:${encodeURIComponent(scope)}`,
          );
        }
        const recovered = raw
          ? parseEnvelope(raw)
          : { version: 1 as const, activeId: null, drafts: [] };
        const summaries = await client.list("draft");
        remoteSummaries = summaries;
        const merged = new Map<string, WorkspaceDraft>();
        for (const draft of recovered.drafts) {
          const base = bases[draft.id];
          // Keep every unsent recovery with its ORIGINAL revision. Inactive
          // images stay portable; saving them does not require downloading them.
          // Clean cached copies (including remote deletions) need no local payload.
          if (!base || base.acknowledged !== fingerprint(draft))
            merged.set(draft.id, draft);
        }
        const activeId =
          recovered.activeId &&
          (merged.has(recovered.activeId) ||
            summaries.some((item) => item.id === recovered.activeId))
            ? recovered.activeId
            : (summaries[0]?.id ?? merged.keys().next().value ?? null);
        if (activeId) {
          const recovery = merged.get(activeId);
          if (recovery) {
            merged.set(activeId, await client.materialize(recovery));
          } else {
            const document = await client.get(activeId);
            const draft = fromDocument(document);
            const displayed = await client.materialize(draft);
            merged.set(draft.id, displayed);
            bases[draft.id] = {
              revision: document.revision,
              visibility: document.visibility,
              sharedBranchId: document.sharedBranchId,
              acknowledged: fingerprint(displayed),
            };
          }
        }
        const drafts = [...merged.values()];
        raw = JSON.stringify({
          version: 1,
          activeId,
          drafts,
        });
      } catch (cause) {
        loadError = cause;
        error = cloudError(cause);
      } finally {
        local.hydrate();
        initializing = false;
        if (!loadError) persist();
        enqueue();
        publish();
      }
    })();
    return hydration;
  };
  const saveNow = async (sharing?: DocumentSharing) => {
    await hydrate();
    if (!local.saveNow()) return false;
    if (loadError) {
      try {
        // Reconnect without replacing edits made while offline; optimistic revisions still fence writes.
        const summaries = await client.list("draft");
        const envelope: ReturnType<typeof parseEnvelope> = raw
          ? parseEnvelope(raw)
          : { version: 1, activeId: null, drafts: [] };
        for (const summary of summaries) {
          if (envelope.drafts.some((item) => item.id === summary.id)) continue;
          const document = await client.get(summary.id);
          const displayed = await client.materialize(fromDocument(document));
          envelope.drafts.push(displayed);
          bases[summary.id] = {
            revision: document.revision,
            visibility: document.visibility,
            sharedBranchId: document.sharedBranchId,
            acknowledged: fingerprint(displayed),
          };
        }
        raw = JSON.stringify(envelope);
        loadError = undefined;
        error = null;
        local.saveNow();
      } catch (cause) {
        error = cloudError(cause);
        publish();
        return false;
      }
    }
    enqueue();
    try {
      if (sharing) {
        // Queue alongside autosaves so a failed scope-only request can be
        // retried without changing worksheet content or adopting a newer base.
        void run(async () => {
          const draft = local.getSnapshot().draft;
          const payload = await client.externalize({ ...draft, version: 1 });
          const saved = await client.save(
            draft.id,
            "draft",
            draft.title,
            payload,
            bases[draft.id]?.revision ?? null,
            sharing,
          );
          bases[draft.id] = {
            revision: saved.revision,
            acknowledged: fingerprint(draft),
            visibility: saved.visibility,
            sharedBranchId: saved.sharedBranchId,
          };
          if (
            raw &&
            parseEnvelope(raw).drafts.every(
              (item) => bases[item.id]?.acknowledged === fingerprint(item),
            )
          )
            error = null;
          persist();
        });
      }
      let waiting;
      do {
        waiting = tail;
        await waiting;
      } while (waiting !== tail);
      return (
        !error && pending === 0 && local.getSnapshot().saveStatus === "saved"
      );
    } catch {
      return false;
    }
  };
  const openDraft = async (id: string) => {
    const request = ++opening;
    if (!(await saveNow())) return false;
    const outgoing = fingerprint(local.getSnapshot().draft);
    try {
      const document = await client.get(id);
      if (document.kind !== "draft")
        throw new Error("시험지 형식을 확인해 주세요.");
      const draft = await client.materialize(fromDocument(document));
      if (request !== opening || deleted.has(id)) return false;
      // Lazy payload/image reads may finish after a newer editor action. Never
      // replace recovery or the optimistic base with that stale response.
      if (fingerprint(local.getSnapshot().draft) !== outgoing)
        throw new Error(
          "불러오는 동안 작업이 변경되었습니다. 현재 작업을 저장한 뒤 다시 열어 주세요.",
        );
      const envelope = raw
        ? parseEnvelope(raw)
        : { version: 1, activeId: null, drafts: [] };
      envelope.drafts = [
        ...envelope.drafts.filter((item) => item.id !== id),
        draft,
      ];
      raw = JSON.stringify(envelope);
      bases[id] = {
        revision: document.revision,
        visibility: document.visibility,
        sharedBranchId: document.sharedBranchId,
        acknowledged: fingerprint(draft),
      };
      persist();
      return local.openDraft(id);
    } catch (cause) {
      if (request !== opening || deleted.has(id)) return false;
      error = cloudError(cause);
      publish();
      return false;
    }
  };
  return {
    ...local,
    hydrate,
    retain: () => {
      lifecycle++;
      client.retain();
    },
    release: () => {
      const current = lifecycle;
      void Promise.resolve(hydration)
        .catch(() => {})
        .then(() => tail.catch(() => {}))
        .then(() =>
          setTimeout(() => {
            if (current === lifecycle) client.dispose();
          }, 0),
        );
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    saveNow,
    getVisibility: () =>
      bases[local.getSnapshot().draft.id]?.visibility ?? "private",
    getSharedBranchId: () =>
      bases[local.getSnapshot().draft.id]?.sharedBranchId ?? null,
    openDraft,
    forgetDraft: (id: string) => {
      // Called only after the API confirms deletion; queued saves keep their old revision.
      deleted.add(id);
      if (!raw || !parseEnvelope(raw).drafts.some((item) => item.id === id)) {
        remoteSummaries = remoteSummaries.filter((item) => item.id !== id);
        publish();
        return true;
      }
      const removed = local.forgetDeletedDraft(id);
      if (removed) {
        if (
          raw &&
          parseEnvelope(raw).drafts.every(
            (item) => bases[item.id]?.acknowledged === fingerprint(item),
          )
        )
          error = null;
        persist();
        publish();
      }
      return removed;
    },
    createDraft: async () => (await saveNow()) && local.createDraft(),
    importDraft: async (value: unknown) => {
      if (!(await saveNow()) || !local.importDraft(value)) return false;
      return saveNow();
    },
    // The authenticated library owns asynchronous rename/delete and their server revisions.
    flush: () => {
      local.flush();
      enqueue();
    },
  };
}
