"use client";

import Link from "next/link";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import s from "./WorkspaceAccount.module.css";

export type WorkspaceIdentity = {
  branchId?: string | null;
  name: string;
  email: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  canManageClasses?: boolean;
};

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
    </div>
  );
}
