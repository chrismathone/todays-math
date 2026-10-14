import { connection } from "next/server";
import { notFound } from "next/navigation";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import LegacyUnifiedWorkspace from "@/components/unified/LegacyUnifiedWorkspace";
import type { BankData } from "@/components/unified/types";
import type { DesignId } from "@/components/unified/DesignConcepts";

export const metadata = {
  title: "통합 작업실 · 오늘 수학",
  robots: { index: false, follow: false },
};

export default async function UnifiedPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string | string[] }>;
}) {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  const { design } = await searchParams;
  const designNumber = Number(design);
  const initialDesign = (
    [1, 2, 3, 4, 5].includes(designNumber) ? designNumber : 1
  ) as DesignId;
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
  return design === "compare" || initialDesign !== 1 ? (
    <LegacyUnifiedWorkspace
      initialData={initialData}
      initialDesign={initialDesign}
      initialCompare={design === "compare"}
    />
  ) : (
    <UnifiedWorkspace initialData={initialData} />
  );
}
