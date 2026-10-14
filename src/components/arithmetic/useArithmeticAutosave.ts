"use client";
import { useEffect } from "react";

/** Caller serializes writes with generation/loading and pauses this hook after any save failure. */
export function useArithmeticAutosave({
  enabled,
  dirty,
  busy,
  fingerprint,
  save,
}: {
  enabled: boolean;
  dirty: boolean;
  busy: boolean;
  fingerprint: string;
  save: () => Promise<void>;
}) {
  useEffect(() => {
    if (!enabled || !dirty || busy) return;
    const timer = window.setTimeout(() => void save(), 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, dirty, busy, fingerprint, save]);
}
