"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createStore,
  loadStore,
  saveStore,
  STORAGE_KEY,
} from "@/lib/math-srs/storage";
import type { SrsStore } from "@/lib/math-srs/types";

const subscribe = () => () => {};

export function useSrsStore() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [store, setStore] = useState<SrsStore>(createStore);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const unsaved = useRef(false);
  if (hydrated && !ready) {
    const loaded = loadStore();
    setStore(loaded.store);
    setWarning(loaded.warning);
    setReady(true);
  }

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (unsaved.current) return;
      const loaded = loadStore();
      setStore(loaded.store);
      setWarning(loaded.warning ?? "다른 탭의 학습 기록을 불러왔습니다.");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Read the current disk state before each mutation so another tab's completed
  // attempts/profiles are preserved. Failed persistence keeps the in-memory session usable.
  const persist = useCallback(
    (change: (current: SrsStore) => SrsStore) => {
      try {
        const loaded = loadStore();
        const current =
          loaded.warning || unsaved.current ? store : loaded.store;
        const next = change(current);
        const saved = saveStore(next);
        unsaved.current = !saved.ok;
        setStore(next);
        setWarning(saved.warning);
        return true;
      } catch (error) {
        setWarning(
          error instanceof Error
            ? error.message
            : "기록을 저장하지 못했습니다. 다시 시도해 주세요.",
        );
        return false;
      }
    },
    [store],
  );

  return { store, ready, warning, persist };
}
