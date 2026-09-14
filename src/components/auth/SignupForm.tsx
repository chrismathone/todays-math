"use client";

import { AuthForm } from "@/components/auth/AuthForm";

export function SignupForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return <AuthForm mode="signup" callbackUrl={callbackUrl} />;
}
