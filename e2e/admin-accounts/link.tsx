import type { AnchorHTMLAttributes } from "react";

// This static fixture has no Next router or in-flight route transitions.
export function useLinkStatus() {
  return { pending: false };
}

export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
