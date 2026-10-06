"use client";

import { useRef, useState } from "react";
import type { FadingAction, FadingState } from "@/contracts/fadingApi.contract";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";

/** Keeps ordered attempts and the same request id while a failed write is retried. */
export function useFadingSessionActions({
  source,
  onState,
  onReconcile,
}: {
  source: FadingSource;
  onState: (state: FadingState) => void;
  onReconcile: (state: FadingState, message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const locked = useRef(false);
  const pending = useRef<{
    actions: readonly FadingAction[];
    index: number;
    after: (state: FadingState) => void;
  } | null>(null);

  async function run() {
    if (locked.current || !pending.current) return;
    locked.current = true;
    setBusy(true);
    setFailure(null);
    const work = pending.current;
    let last: FadingState | undefined;
    let completed = false;
    try {
      while (work.index < work.actions.length) {
        last = await source.act(work.actions[work.index]!);
        work.index += 1;
        onState(last);
      }
      pending.current = null;
      completed = true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "처리하지 못했습니다. 다시 시도하세요.";
      if (error instanceof FadingSourceError && error.code === "CONFLICT") {
        try {
          const next = await source.state();
          pending.current = null;
          onReconcile(next, message);
        } catch (readError) {
          setFailure(readError instanceof Error ? readError.message : message);
        }
      } else setFailure(message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
    if (completed && last) work.after(last);
  }

  function send(
    actions: FadingAction | readonly FadingAction[],
    after: (state: FadingState) => void = () => {},
  ) {
    if (locked.current || pending.current) return;
    pending.current = {
      actions: Array.isArray(actions) ? actions : [actions as FadingAction],
      index: 0,
      after,
    };
    void run();
  }

  return { busy, failure, send, retry: run, locked };
}
