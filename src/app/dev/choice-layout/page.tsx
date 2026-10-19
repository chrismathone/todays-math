import { notFound } from "next/navigation";

import type { PrintChoiceLayout } from "@/lib/math/choiceLayout";

import ChoiceLayoutClient from "./ChoiceLayoutClient";

export const metadata = {
  title: "보기 번호 배치 확인 · 오늘 수학",
  robots: { index: false, follow: false },
};

const LAYOUTS: PrintChoiceLayout[] = ["auto", "5x1", "2x3", "3x2"];

/**
 * 보기 번호 배치(원장님 2026-09-20) 를 **실제 지면**에서 견주는 화면. 개발 전용.
 * DB 없이 뜬다 — 문항은 `fixtures.ts` 다.
 */
export default async function ChoiceLayoutPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string | string[] }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { layout } = await searchParams;
  const value = Array.isArray(layout) ? layout[0] : layout;
  const initialLayout = LAYOUTS.find((item) => item === value) ?? "auto";
  return <ChoiceLayoutClient initialLayout={initialLayout} />;
}
