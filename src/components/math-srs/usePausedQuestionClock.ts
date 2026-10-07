"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";

/** Time spent in an additional check belongs to that check, not the bank question. */
export function usePausedQuestionClock(paused: boolean) {
  const clock = useRef<{ elapsed: number; started: number | null } | null>(
    null,
  );
  useLayoutEffect(() => {
    const now = performance.now();
    const current = clock.current ?? { elapsed: 0, started: null };
    if (current.started !== null) current.elapsed += now - current.started;
    current.started = paused ? null : now;
    clock.current = current;
  }, [paused]);
  return () => {
    const current = clock.current;
    return current
      ? (current.elapsed +
          (current.started === null
            ? 0
            : performance.now() - current.started)) /
          1000
      : 0;
  };
}

/** Keeps the remainder of a feedback delay when a check covers the bank screen. */
export function usePausedFeedback(
  callback: () => void,
  key: string | null,
  paused: boolean,
  delay = 1200,
) {
  const run = useRef<{ key: string; remaining: number } | null>(null);
  const complete = useEffectEvent(callback);
  useEffect(() => {
    if (!key) {
      run.current = null;
      return;
    }
    if (run.current?.key !== key) run.current = { key, remaining: delay };
    if (paused) return;
    const current = run.current;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      current.remaining = 0;
      complete();
    }, current.remaining);
    return () => {
      window.clearTimeout(timer);
      current.remaining = Math.max(
        0,
        current.remaining - (performance.now() - started),
      );
    };
  }, [key, paused, delay]);
}
