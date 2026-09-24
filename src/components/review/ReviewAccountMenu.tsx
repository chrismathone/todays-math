"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import AdminSignOut from "@/components/admin/AdminSignOut";

import s from "./ReviewShell.module.css";

export default function ReviewAccountMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((session: { user?: { email?: string } } | null) => {
        if (active) setEmail(session?.user?.email ?? null);
      })
      .catch(() => {
        if (active) setEmail(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={s.profileMenu}>
      <button
        ref={trigger}
        type="button"
        className={s.accountButton}
        aria-label="내정보 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        <span aria-hidden="true">내</span>
        <span className={s.accountIdentity}>
          <strong>내정보</strong>
          {email ? (
            <small data-testid="account-email" title={email}>
              {email}
            </small>
          ) : (
            <small>
              {email === undefined ? "계정 확인 중…" : "계정 정보 확인 불가"}
            </small>
          )}
        </span>
        <span aria-hidden="true" className={s.chevron}>
          ⌄
        </span>
      </button>
      {open ? (
        <div className={s.profilePanel}>
          <p className={s.profileHeading}>내 계정</p>
          <Link href="/account">내정보 설정</Link>
          <AdminSignOut />
        </div>
      ) : null}
    </div>
  );
}
