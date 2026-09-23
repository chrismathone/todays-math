"use client";

import { useLinkStatus } from "next/link";

/** A fixed-width hint for routes that keep the current page while resolving. */
export default function RouteLinkStatus() {
  const { pending } = useLinkStatus();
  return (
    <span
      className="inline-flex w-3 shrink-0 justify-center"
      aria-live="polite"
    >
      <span className="sr-only">{pending ? "이동 중" : ""}</span>
      <span
        aria-hidden="true"
        className={pending ? "opacity-100" : "opacity-0"}
      >
        …
      </span>
    </span>
  );
}
