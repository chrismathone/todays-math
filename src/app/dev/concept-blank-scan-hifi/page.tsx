import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { devPageVisible } from "@/lib/devPageAccess";
import { ScanHifi } from "./ScanHifi";

export const metadata: Metadata = { title: "개념 백지 사진 채점 | Hi-fi" };

export default async function ConceptBlankScanHifiPage() {
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  const session = await auth();
  if (!session?.user || session.user.role === "reviewer") notFound();
  const { loadWireSamples } =
    await import("../concept-blank-scan-wire/samples");
  const { withHifiQrs } = await import("./samples");
  return <ScanHifi samples={await withHifiQrs(await loadWireSamples())} />;
}
