import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { SimpleWire } from "./SimpleWire";

/** D-07 · 구조 비교용 Wire. 자체 픽스처만 사용하며 제품 제작기와 연결하지 않는다. */
export default async function ExamBuilderSimpleWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <SimpleWire />;
}
