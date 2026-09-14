"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createWorkspaceDraftStore } from "./draftStore";

/** Hydration-gated browser drafts shared by all views of one workspace. */
export function useWorkspaceDrafts(storageScope?: string) {
  const [store] = useState(() =>
    createWorkspaceDraftStore(
      storageScope
        ? () => ({
            getItem: (key: string) =>
              window.localStorage.getItem(
                `${key}:${encodeURIComponent(storageScope)}`,
              ),
            setItem: (key: string, value: string) =>
              window.localStorage.setItem(
                `${key}:${encodeURIComponent(storageScope)}`,
                value,
              ),
          })
        : undefined,
    ),
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  useEffect(() => {
    store.hydrate();
    window.addEventListener("pagehide", store.flush);
    return () => {
      window.removeEventListener("pagehide", store.flush);
      store.flush();
    };
  }, [store]);

  return {
    ...snapshot,
    setTitle: store.setTitle,
    setProblems: store.setProblems,
    setColumns: store.setColumns,
    setAnswers: store.setAnswers,
    setPrintOptions: store.setPrintOptions,
    setPrintMeta: store.setPrintMeta,
    saveNow: store.saveNow,
    createDraft: store.createDraft,
    openDraft: store.openDraft,
    renameDraft: store.renameDraft,
    deleteDraft: store.deleteDraft,
    importDraft: store.importDraft,
  };
}
