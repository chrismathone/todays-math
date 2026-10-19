import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { StepsWire } from "./StepsWire";

/**
 * **시험지 만들기 1 · 2단계 분리 — Wire 시안** (D-07 · 2026-10-17 원장님 «1단계와 2단계를 완전히 분리된 화면이었으면»).
 * 지어낸 작은 픽스처다 — DB 를 읽지 않는다.
 */
export default async function ExamBuilderStepsWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <StepsWire />;
}
