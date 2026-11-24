import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { devPageVisible } from "@/lib/devPageAccess";
import { ScanWire } from "./ScanWire";

export const metadata: Metadata = {
  title: "개념 백지 QR · 촬영 · 결과 | Wire",
};

export default async function ConceptBlankScanWirePage() {
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  // 공용 개발 가드의 개발 모드/QA 예외에서도 이 시안은 로그인 뒤에서만 연다.
  const session = await auth();
  if (!session?.user || session.user.role === "reviewer") notFound();
  const { loadWireSamples } = await import("./samples");
  return <ScanWire samples={await loadWireSamples()} />;
}
