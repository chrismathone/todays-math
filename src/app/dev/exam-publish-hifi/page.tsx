import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { PublishHifi } from "./PublishHifi";

/**
 * **월말평가 M1 «반에 내기» — Hi-fi 4안** (D-07 · 2026-10-17 · 원장님 «B안, 나머지는 추천대로»).
 * 바탕은 «내 시험지» 표와 작업실 창 그대로 — 안끼리 다른 것은 낸 기록이 보이는 자리와 단추의 모양이다. DB 를 읽지 않는다.
 */
export default async function ExamPublishHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <PublishHifi />;
}
