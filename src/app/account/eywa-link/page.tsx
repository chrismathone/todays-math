import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthExperience } from "@/components/auth/AuthExperience";
import { AuthShell } from "@/components/auth/AuthShell";
import { EywaLinkConfirm } from "@/components/auth/EywaLinkConfirm";
import {
  EYWA_LINK_PAGE_PATH,
  EYWA_LINK_TITLE,
  eywaLinkConfirmBody,
} from "@/contracts/eywaLink.contract";
import { getAccountAccess } from "@/lib/accountAccess";
import {
  EYWA_LINK_PENDING_COOKIE,
  openEywaLinkPendingNow,
} from "@/lib/eywaLinkPending";

export const metadata: Metadata = { title: EYWA_LINK_TITLE };

/**
 * eywa 계정 연결 확인 (D-139 ⑹, 원장님 확정 2026-09-26) — 로그인 화면과 같은 틀(`AuthShell` + `AuthExperience`).
 *
 * eywa 표는 올바른데 연결된 계정이 없어 입구가 연결 대기 쿠키를 심고 로그인으로 보냈다. 계정 주인이 비밀번호로
 * 로그인하면 여기로 온다. 🔴 연결은 이 화면의 [연결]을 눌러야만 일어난다 — 누구의 eywa 계정을 어느 계정에 묶는지
 * 둘 다 보여 준다(남의 링크를 모르고 눌렀어도 여기서 알아챈다).
 * 로그인 안 했으면 로그인으로(돌아올 곳 = 이 화면), 연결 대기 쿠키가 없거나 만료면 첫 화면으로.
 * 승인 대기 계정에게도 열린다(관문 `accountRouteAccess.ts`).
 */
export default async function EywaLinkPage() {
  const account = await getAccountAccess();
  if (!account)
    redirect(`/login?callbackUrl=${encodeURIComponent(EYWA_LINK_PAGE_PATH)}`);
  const pending = openEywaLinkPendingNow(
    (await cookies()).get(EYWA_LINK_PENDING_COOKIE)?.value,
  );
  if (!pending) redirect("/");
  return (
    <AuthShell>
      <AuthExperience>
        <EywaLinkConfirm body={eywaLinkConfirmBody(pending, account.email)} />
      </AuthExperience>
    </AuthShell>
  );
}
