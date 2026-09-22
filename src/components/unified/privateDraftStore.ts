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
import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";

type Base = { revision: number | null; acknowledged?: string };
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
    snapshot = {
      ...state,
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
        bases[draft.id] = { revision: saved.revision, acknowledged: signature };
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
        const documents: PrivateDocument[] = [];
        // Bound payload downloads: libraries can contain many large worksheets.
        for (let offset = 0; offset < summaries.length; offset += 4) {
          documents.push(
            ...(await Promise.all(
              summaries
                .slice(offset, offset + 4)
                .map((item) => client.get(item.id)),
            )),
          );
        }
        const merged = new Map<string, WorkspaceDraft>();
        for (const document of documents) {
          const draft = fromDocument(document);
          const recovery = recovered.drafts.find(
            (item) => item.id === draft.id,
          );
          const base = bases[draft.id];
          if (
            recovery &&
            (!base || base.acknowledged !== fingerprint(recovery))
          ) {
            // Preserve unsent edits with their ORIGINAL revision, even when another device saved.
            const displayed = await client.materialize(recovery);
            merged.set(draft.id, displayed);
          } else {
            const displayed = await client.materialize(draft);
            merged.set(draft.id, displayed);
            bases[draft.id] = {
              revision: document.revision,
              acknowledged: fingerprint(displayed),
            };
          }
        }
        for (const draft of recovered.drafts) {
          if (merged.has(draft.id)) continue;
          const base = bases[draft.id];
          // Clean cached copies of remotely deleted documents stay deleted.
          if (!base || base.acknowledged !== fingerprint(draft))
            merged.set(draft.id, await client.materialize(draft));
        }
        const drafts = [...merged.values()];
        raw = JSON.stringify({
          version: 1,
          activeId: drafts.some((item) => item.id === recovered.activeId)
            ? recovered.activeId
            : (drafts[0]?.id ?? null),
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
  const saveNow = async () => {
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
    if (!(await saveNow())) return false;
    try {
      const document = await client.get(id);
      if (document.kind !== "draft")
        throw new Error("시험지 형식을 확인해 주세요.");
      const draft = await client.materialize(fromDocument(document));
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
        acknowledged: fingerprint(draft),
      };
      persist();
      return local.openDraft(id);
    } catch (cause) {
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
    openDraft,
    forgetDraft: (id: string) => {
      // Called only after the API confirms deletion; queued saves keep their old revision.
      deleted.add(id);
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
