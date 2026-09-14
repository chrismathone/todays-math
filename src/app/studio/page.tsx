import { connection } from "next/server";
import { redirect } from "next/navigation";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import type { BankData } from "@/components/unified/types";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
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
  let initialData: BankData;
  try {
    initialData = await loadUnifiedBank();
  } catch {
    initialData = {
      problems: [],
      total: 0,
      page: 1,
      pageSize: 12,
      grades: [],
      chapters: [],
      error:
        "문제은행 연결을 확인해 주세요. 자료 제작은 바로 사용할 수 있습니다.",
    };
  }
  return <UnifiedWorkspace initialData={initialData} />;
}
