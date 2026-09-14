import { connection } from "next/server";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import MathMotion from "@/components/brand/MathMotion";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { getAccountAccess } from "@/lib/accountAccess";

export const metadata = {
  title: "오늘의수학 · 선생님의 수학 작업실",
  description:
    "가지고 있는 수학 자료를 읽고, 다듬고, 나만의 시험지로. 문제은행부터 수업 준비까지 오늘의수학에서 이어가세요.",
};

export default async function MainPage() {
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
  return <WorkspacePage user={account} />;
}
