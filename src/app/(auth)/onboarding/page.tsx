import { connection } from "next/server";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { onlySupportedGrades } from "@/contracts/supportedGrades";
import { db } from "@/lib/db";

export default async function OnboardingPage() {
  await connection();

  const units = await db.unit.findMany({
    orderBy: { orderIndex: "asc" },
    select: { id: true, grade: true, chapter: true, section: true },
  });

  // 🔴 **고르는 목록만 좁힌다** (원장님 확정 2026-09-07 「초3~중3만으로」).
  //    지원 밖 학년은 문항이 0건이라, 고르게 두면 진도를 찍은 뒤 출제에서 막힌다.
  return <OnboardingForm units={onlySupportedGrades(units)} />;
}
