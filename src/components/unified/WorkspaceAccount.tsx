"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions/auth";
import s from "./WorkspaceAccount.module.css";

export type WorkspaceIdentity = {
  name: string;
  email: string;
  isAdmin?: boolean;
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
      {user.isAdmin === true && <a href="/admin">관리자</a>}
      <form action={signOutAction}>
        <SignOutButton />
      </form>
    </div>
  );
}
