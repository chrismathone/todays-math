import { connection } from "next/server";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import MathMotion from "@/components/brand/MathMotion";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { getAccountAccess } from "@/lib/accountAccess";
import {
  LOGIN_ENTRY_PARAM,
  isLoginEntry,
  landingAfterLogin,
} from "@/lib/loginLanding";

export const metadata = {
  title: "오늘 수학 · 선생님의 수학 작업실",
  description:
    "가지고 있는 수학 자료를 읽고, 다듬고, 나만의 시험지로. 문제은행부터 수업 준비까지 오늘 수학에서 이어가세요.",
};

export default async function MainPage({
  searchParams,
}: {
  searchParams?: Promise<{ [LOGIN_ENTRY_PARAM]?: string | string[] }>;
} = {}) {
  await connection();
  const account = await getAccountAccess();
  if (!account) {
    return (
      <LandingPage
        heroImageSrc="/brand/workroom-hero.webp"
        mathMotion={<MathMotion />}
      />
    );
  }
  if (account.approvalStatus !== "approved") redirect("/approval-pending");
  if (
    account.role === "reviewer" &&
    !account.isAdmin &&
    account.menus.includes("bank")
  )
    redirect("/review");
  // D-140 ⑶ — 로그인 직후 한 번만 첫 화면을 고른다(강사 → 내 반). 표지 없이 온 `/` 는 누구에게나 작업실이다.
  if (isLoginEntry((await searchParams)?.[LOGIN_ENTRY_PARAM]))
    redirect(landingAfterLogin(account));
  return <WorkspacePage user={account} />;
}
