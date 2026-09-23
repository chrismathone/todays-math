"use client";

import { useLinkStatus } from "next/link";
import s from "./NavigationPending.module.css";

/** Shows feedback on the current page while a destination route resolves. */
export default function NavigationPending({ icon }: { icon: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className={s.icon} aria-hidden="true">
        {pending ? <span className={s.indicator} /> : icon}
      </span>
      {pending && (
        <span className={s.srOnly} role="status">
          이동 중
        </span>
      )}
    </>
  );
}
