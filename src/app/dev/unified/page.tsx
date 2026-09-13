import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import type { BankData } from "@/components/unified/types";

export const metadata = {
  title: "통합 작업실 · 오늘의수학",
  robots: { index: false, follow: false },
};

export default async function UnifiedPreviewPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
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
