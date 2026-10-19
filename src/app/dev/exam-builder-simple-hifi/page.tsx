import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { SimpleHifi } from "./SimpleHifi";

/** D-07 · Wire A를 유지한 독립 Hi-fi. 실제 제작·저장 경로에 연결하지 않는다. */
export default async function ExamBuilderSimpleHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <SimpleHifi />;
}
