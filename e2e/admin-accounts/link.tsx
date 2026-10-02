import type { AnchorHTMLAttributes } from "react";
export function useLinkStatus() {
  return { pending: false };
}
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
