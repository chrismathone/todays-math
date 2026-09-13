"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createWorkspaceDraftStore } from "./draftStore";

/** Hydration-gated browser drafts shared by all views of one workspace. */
export function useWorkspaceDrafts() {
  const [store] = useState(createWorkspaceDraftStore);
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
    importDraft: store.importDraft,
  };
}
