import { LoginForm } from "@/components/auth/LoginForm";
import { AuthExperience } from "@/components/auth/AuthExperience";
import {
  eywaLinkLoginNotice,
  eywaSsoLoginNotice,
} from "@/contracts/eywaLink.contract";
import { normalizeCallbackUrl } from "@/lib/callbackUrl";
import { auth } from "@/lib/auth";
import {
  EYWA_LINK_PENDING_COOKIE,
  openEywaLinkPendingNow,
} from "@/lib/eywaLinkPending";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    eywa?: string | string[];
  }>;
}) {
  const [query, session, jar] = await Promise.all([
    searchParams,
    auth(),
    cookies(),
  ]);
  const destination = normalizeCallbackUrl(query.callbackUrl);
  if (session?.user?.id)
    redirect(
      session.user.approvalStatus !== "approved"
        ? "/approval-pending"
        : session.user.role === "reviewer" && !session.user.isAdmin
          ? "/review"
          : destination,
    );
  // eywa 에서 넘어왔는데 연결된 계정이 없다(D-139 ⑹) — 누구의 eywa 계정인지 로그인 전에 보인다
  const pending = openEywaLinkPendingNow(
    jar.get(EYWA_LINK_PENDING_COOKIE)?.value,
  );
  return (
    <AuthExperience>
      <LoginForm
        callbackUrl={destination}
        notice={
          eywaSsoLoginNotice(query.eywa) ??
          (pending ? eywaLinkLoginNotice(pending) : undefined)
        }
      />
    </AuthExperience>
  );
}
