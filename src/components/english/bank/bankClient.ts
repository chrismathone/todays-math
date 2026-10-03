import { useEffect, useState } from "react";
import { messageOf, requestEnglish } from "../englishClient";

type Parser<T> = { parse: (value: unknown) => T };
type QueryState<T> =
  | { status: "loading"; key: string }
  | { status: "ready"; key: string; data: T }
  | { status: "error"; key: string; message: string };

/** A response belongs to its URL and refresh generation, never to a later selection. */
export function useBankQuery<T>(
  url: string | null,
  schema: Parser<T>,
  generation = 0,
) {
  const key = `${url ?? "disabled"}:${generation}`;
  const [state, setState] = useState<QueryState<T>>({ status: "loading", key });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    let current = true;
    void requestEnglish(url, { signal: controller.signal })
      .then((body) => {
        if (current)
          setState({ status: "ready", key, data: schema.parse(body) });
      })
      .catch((error: unknown) => {
        if (current && !controller.signal.aborted)
          setState({ status: "error", key, message: messageOf(error) });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [url, key, schema]);
  return !url || state.key === key
    ? state
    : { status: "loading" as const, key };
}

export function useUnsavedBankDraft(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

export function bankUrl(path: string, values: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "") params.set(key, String(value));
  }
  return `${path}?${params}`;
}
