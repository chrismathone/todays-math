"use client";

import { AuthForm } from "@/components/auth/AuthForm";

export function LoginForm({
  callbackUrl = "/",
  notice,
}: {
  callbackUrl?: string;
  notice?: string;
}) {
  return <AuthForm mode="login" callbackUrl={callbackUrl} notice={notice} />;
}
