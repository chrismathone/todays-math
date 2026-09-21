import type { AnchorHTMLAttributes } from "react";

/** `next/link` 대역 — 문제은행이 쓴다. 진짜는 Next 라우터를 찾다가 창에서 죽는다(`process`). */
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
