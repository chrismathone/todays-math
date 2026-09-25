import { notFound } from "next/navigation";
import { connection } from "next/server";
import MobilePracticeQaClient from "./MobilePracticeQaClient";

export default async function MobilePracticeQaPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }
  const rawKind = (await searchParams).kind;
  const kind =
    typeof rawKind === "string" &&
    ["choice", "fraction4", "fraction12"].includes(rawKind)
      ? rawKind
      : "choice";
  return <MobilePracticeQaClient kind={kind} />;
}
