"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions/auth";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import s from "./WorkspaceAccount.module.css";

export type WorkspaceIdentity = {
  name: string;
  email: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  canManageClasses?: boolean;
};

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

export default function WorkspaceAccount({
  user,
}: {
  user: WorkspaceIdentity;
}) {
  return (
    <div className={s.account} aria-label="로그인한 계정">
      <div className={s.identity}>
        <strong>{user.name || "선생님"}</strong>
        <span title={user.email}>{user.email}</span>
      </div>
      {user.isSuperAdmin === true && (
        <Link href="/admin">
          관리
          <RouteLinkStatus />
        </Link>
      )}
      {user.isAdmin === true && !user.isSuperAdmin && (
        <Link href="/branch">
          지점관리
          <RouteLinkStatus />
        </Link>
      )}
      {!user.isAdmin && user.canManageClasses && (
        <Link href="/classes/manage">
          반 관리
          <RouteLinkStatus />
        </Link>
      )}
      <Link href="/account">
        내정보
        <RouteLinkStatus />
      </Link>
      <form action={signOutAction}>
        <SignOutButton />
      </form>
    </div>
  );
}
