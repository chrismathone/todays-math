"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  FadingRelearnItem,
  FadingRelearnObservation,
  FadingRelearnQueue,
} from "@/contracts/fadingRelearn.contract";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";
import {
  withFadingRelearn,
  type FadingRelearnSource,
} from "@/lib/fading/relearnSource";

/**
 * The deadline is relative to server now; changing the device clock cannot make a check ready.
 * Evidence of a main action is registered by the server inside that action's save (D3); `wrap` only re-reads the queue
 * afterwards. `record` remains for mid-step evidence (a wrong chip before the step is sent) and keeps its in-memory outbox.
 */
export function useFadingRelearn(
  source?: FadingRelearnSource,
  onAccessFailure?: (error: FadingSourceError) => void,
) {
  const [owner, setOwner] = useState(() => source);
  const [queue, setQueue] = useState<FadingRelearnQueue | null>(null);
  const [active, setActive] = useState<
    | (FadingRelearnItem & { content: FadingRelearnQueue["contents"][string] })
    | null
  >(null);
  const [failure, setFailure] = useState<string | null>(null);
  const alive = useRef(false);
  const generation = useRef(0);
  const reading = useRef<Promise<void> | null>(null);
  const stamp = useRef(0);
  const latest = useRef<FadingRelearnQueue | null>(null);
  const sourceOwner = useRef(source);
  const access = useRef(onAccessFailure);
  useEffect(() => {
    access.current = onAccessFailure;
  }, [onAccessFailure]);
  const outbox = useRef<FadingRelearnObservation[]>([]);
  const sending = useRef<Promise<void> | null>(null);
  if (owner !== source) {
    setOwner(source);
    setQueue(null);
    setActive(null);
    setFailure(null);
  }

  const receive = useCallback((next: FadingRelearnQueue) => {
    if (!alive.current) return;
    latest.current = next;
    stamp.current = performance.now();
    setQueue(next);
    setFailure(null);
  }, []);
  const fail = useCallback((error: unknown) => {
    if (!alive.current) return;
    setFailure(
      error instanceof Error ? error.message : "추가 확인을 불러오지 못했어요.",
    );
    if (error instanceof FadingSourceError) access.current?.(error);
  }, []);
  const refresh = useCallback(async () => {
    if (!source) return;
    if (reading.current) return reading.current;
    const epoch = generation.current;
    const work = (async () => {
      try {
        const next = await source.queue();
        if (epoch === generation.current) receive(next);
      } catch (error) {
        if (epoch === generation.current) fail(error);
      }
    })();
    reading.current = work;
    await work;
    if (reading.current === work) reading.current = null;
  }, [source, receive, fail]);

  const flush = useCallback(async () => {
    if (!source) return;
    if (!latest.current) await refresh();
    if (latest.current?.enabled !== true) {
      if (latest.current?.enabled === false) outbox.current = [];
      return;
    }
    if (sending.current) return sending.current;
    const epoch = generation.current;
    const work = (async () => {
      while (outbox.current.length && epoch === generation.current) {
        const observation = outbox.current[0]!;
        try {
          const response = await source.record(observation);
          if (epoch !== generation.current) return;
          outbox.current.shift();
          receive(response.queue);
        } catch (error) {
          if (epoch !== generation.current) return;
          fail(error);
          if (
            error instanceof FadingSourceError &&
            [
              "CONFLICT",
              "STUDENT_CHANGED",
              "NOT_FOUND",
              "VALIDATION_ERROR",
              "UNAUTHORIZED",
              "FORBIDDEN",
            ].includes(error.code)
          ) {
            outbox.current.shift();
            // Another student is signed in (D1): the owner closes this screen; nothing else of it is sent.
            if (error.code === "STUDENT_CHANGED") {
              outbox.current = [];
              break;
            }
            if (error.code === "CONFLICT") await refresh();
          } else break;
        }
      }
    })();
    sending.current = work;
    await work;
    if (sending.current === work) sending.current = null;
  }, [source, receive, fail, refresh]);
  const record = useCallback(
    async (observation: FadingRelearnObservation) => {
      if (!source || latest.current?.enabled === false) return;
      outbox.current.push(observation);
      await flush();
    },
    [source, flush],
  );

  useEffect(() => {
    alive.current = true;
    const epoch = ++generation.current;
    sourceOwner.current = source;
    latest.current = null;
    reading.current = null;
    sending.current = null;
    outbox.current = [];
    void refresh();
    const focus = () => {
      void flush().then(refresh);
    };
    const visible = () => {
      if (document.visibilityState === "visible") focus();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive.current = false;
      generation.current = epoch + 1;
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [source, refresh, flush]);
  useEffect(() => {
    if (!queue?.enabled || queue.nextDueAt === null) return;
    const remaining =
      queue.nextDueAt - queue.now - (performance.now() - stamp.current);
    // If an early response still says waiting, avoid a tight request loop.
    const timer = window.setTimeout(
      () => void refresh(),
      Math.max(250, remaining),
    );
    return () => window.clearTimeout(timer);
  }, [queue, refresh]);

  const boundary = useCallback(() => {
    if (!source || active) return;
    const next = latest.current?.items.find(
      (item) => item.state === "judging" || item.state === "ready",
    );
    const content = next && latest.current?.contents[next.conceptId];
    if (next && content) setActive({ ...next, content });
    else void flush().then(refresh); // Read at a safe boundary; a later reply never interrupts typing.
  }, [source, active, flush, refresh]);
  const dismiss = useCallback(() => {
    setActive(null);
  }, []);
  const conflict = useCallback(async () => {
    setActive(null);
    await refresh();
  }, [refresh]);
  const enabled = queue?.enabled === true;
  const wrap = useCallback(
    (main: FadingSource) =>
      source && enabled
        ? withFadingRelearn(main, source, {
            onQueue: (next) => {
              if (sourceOwner.current === source) receive(next);
            },
            onError: (error) => {
              if (sourceOwner.current === source) fail(error);
            },
          })
        : main,
    [source, enabled, receive, fail],
  );
  return useMemo(
    () => ({
      source,
      queue,
      active,
      failure,
      fail,
      receive,
      refresh,
      record,
      boundary,
      dismiss,
      conflict,
      wrap,
    }),
    [
      source,
      queue,
      active,
      failure,
      fail,
      receive,
      refresh,
      record,
      boundary,
      dismiss,
      conflict,
      wrap,
    ],
  );
}

export type FadingRelearnController = ReturnType<typeof useFadingRelearn>;
