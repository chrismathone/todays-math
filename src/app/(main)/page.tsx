import { connection } from "next/server";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/LandingPage";
import MathMotion from "@/components/brand/MathMotion";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "오늘의수학 · 선생님의 수학 작업실",
  description:
    "가지고 있는 수학 자료를 읽고, 다듬고, 나만의 시험지로. 문제은행부터 수업 준비까지 오늘의수학에서 이어가세요.",
};

export default async function MainPage() {
  await connection();
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <LandingPage
        heroImageSrc="/brand/workroom-hero.webp"
        mathMotion={<MathMotion />}
      />
    );
  }
  if (session.user.role === "reviewer") redirect("/review");
  return (
    <WorkspacePage
      user={{
        id: session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      }}
    />
  );
}
