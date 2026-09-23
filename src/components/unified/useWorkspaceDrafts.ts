"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createWorkspaceDraftStore } from "./draftStore";
import { createPrivateDraftStore } from "./privateDraftStore";

/** Keep drafts in memory across tabs; access storage only for worksheet work. */
export function useWorkspaceDrafts(
  storageScope?: string,
  enabled = true,
  active = true,
) {
  const store = useMemo(
    () =>
      storageScope
        ? enabled
          ? createPrivateDraftStore(storageScope)
          : createWorkspaceDraftStore(() => ({
              getItem: () => null,
              setItem: () => {},
            }))
        : createWorkspaceDraftStore(),
    [storageScope, enabled],
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    if ("retain" in store) store.retain();
    return () => {
      store.flush();
      if ("release" in store) store.release();
    };
  }, [store]);

  useEffect(() => {
    if (!active) return;
    store.hydrate();
    window.addEventListener("pagehide", store.flush);
    return () => {
      window.removeEventListener("pagehide", store.flush);
      // Finish edits already made before leaving, without discarding the draft.
      store.flush();
    };
  }, [store, active]);

  return {
    ...snapshot,
    ...(storageScope && !enabled
      ? { saveStatus: "disabled" as const, saveError: null }
      : {}),
    prepare: store.hydrate,
    setTitle: store.setTitle,
    setProblems: store.setProblems,
    setRemoved: store.setRemoved,
    setColumns: store.setColumns,
    setAnswers: store.setAnswers,
    setPrintOptions: store.setPrintOptions,
    setPrintMeta: store.setPrintMeta,
    saveNow: storageScope && !enabled ? () => false : store.saveNow,
    createDraft: store.createDraft,
    openDraft: store.openDraft,
    renameDraft: store.renameDraft,
    deleteDraft: store.deleteDraft,
    importDraft: store.importDraft,
    forgetPrivateDraft: (id: string) =>
      "forgetDraft" in store ? store.forgetDraft(id) : false,
  };
}
