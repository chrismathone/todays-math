"use client";

import { useRef, useState } from "react";
import type { FadingAction, FadingState } from "@/contracts/fadingApi.contract";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";

/**
 * Keeps ordered attempts and the same request id while a failed write is retried.
 * `CONFLICT` (content changed) re-reads the state and reconciles; `STUDENT_CHANGED` (another student is signed in — D1)
 * drops the pending actions for good and hands the error to `onAccessFailure` — the screen is closed, never retried.
 */
export function useFadingSessionActions({
  source,
  onState,
  onReconcile,
  onAccessFailure,
}: {
  source: FadingSource;
  onState: (state: FadingState) => void;
  onReconcile: (state: FadingState, message: string) => void;
  onAccessFailure?: (error: FadingSourceError) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const locked = useRef(false);
  const halted = useRef(false);
  const pending = useRef<{
    actions: readonly FadingAction[];
    index: number;
    after: (state: FadingState) => void;
  } | null>(null);

  async function run() {
    if (locked.current || halted.current || !pending.current) return;
    locked.current = true;
    setBusy(true);
    setFailure(null);
    const work = pending.current;
    let last: FadingState | undefined;
    let completed = false;
    try {
      while (work.index < work.actions.length) {
        last = await source.act(work.actions[work.index]!);
        if (halted.current) return;
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
      if (
        error instanceof FadingSourceError &&
        error.code === "STUDENT_CHANGED"
      ) {
        // Another student owns this device now: nothing of this screen may be sent or shown again.
        halted.current = true;
        pending.current = null;
        setFailure(message);
        onAccessFailure?.(error);
      } else if (
        error instanceof FadingSourceError &&
        error.code === "CONFLICT"
      ) {
        try {
          const next = await source.state();
          pending.current = null;
          onReconcile(next, message);
        } catch (readError) {
          if (
            readError instanceof FadingSourceError &&
            readError.code === "STUDENT_CHANGED"
          ) {
            halted.current = true;
            pending.current = null;
            onAccessFailure?.(readError);
          }
          setFailure(readError instanceof Error ? readError.message : message);
        }
      } else {
        if (error instanceof FadingSourceError) onAccessFailure?.(error);
        setFailure(message);
      }
    } finally {
      locked.current = false;
      setBusy(false);
    }
    if (completed && last && !halted.current) work.after(last);
  }

  function send(
    actions: FadingAction | readonly FadingAction[],
    after: (state: FadingState) => void = () => {},
  ) {
    if (locked.current || halted.current || pending.current) return;
    pending.current = {
      actions: Array.isArray(actions) ? actions : [actions as FadingAction],
      index: 0,
      after,
    };
    void run();
  }

  return { busy, failure, send, retry: run, locked };
}
