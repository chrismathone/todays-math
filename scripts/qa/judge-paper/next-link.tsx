// `next/link` 의 대역 — 하네스에는 라우터가 없다. 지면에는 링크가 안 찍힌다.
import type { AnchorHTMLAttributes } from "react";

export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
