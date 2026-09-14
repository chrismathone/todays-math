import { connection } from "next/server";
import { redirect } from "next/navigation";
import WorkspacePage from "@/components/unified/WorkspacePage";
import { authorizeStudio } from "@/lib/studio-ai/guard";

export const metadata = {
  title: "자료 제작 · 오늘수학",
  robots: { index: false, follow: false },
};
export default async function StudioPage() {
  await connection();
  const access = await authorizeStudio();
  if (access.response?.status === 401) redirect("/login?callbackUrl=%2Fstudio");
  if (access.response) redirect("/review");
  return <WorkspacePage user={access.user!} />;
}
