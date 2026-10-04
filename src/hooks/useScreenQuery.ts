"use client";
import { useSyncExternalStore } from "react";
const changed = "screen-query-changed";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(changed, callback);
  };
}
/** Reads after hydration; does not require a client useSearchParams prerender bailout. */
export function useScreenQuery() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return new URLSearchParams(search);
}
export function replaceScreenQuery(values: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(changed));
}
