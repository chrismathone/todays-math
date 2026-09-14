"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions/auth";

function SubmitButton({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

export default function AdminSignOut({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <SubmitButton className={className} />
    </form>
  );
}
