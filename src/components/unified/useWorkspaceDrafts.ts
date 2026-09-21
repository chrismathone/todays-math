"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createWorkspaceDraftStore } from "./draftStore";
import { createPrivateDraftStore } from "./privateDraftStore";

/** Hydration-gated browser drafts shared by all views of one workspace. */
export function useWorkspaceDrafts(storageScope?: string, enabled = true) {
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
    store.hydrate();
    window.addEventListener("pagehide", store.flush);
    return () => {
      window.removeEventListener("pagehide", store.flush);
      store.flush();
      if ("release" in store) store.release();
    };
  }, [store]);

  return {
    ...snapshot,
    ...(storageScope && !enabled
      ? { saveStatus: "disabled" as const, saveError: null }
      : {}),
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
