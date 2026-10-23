import { notFound } from "next/navigation";
import { connection } from "next/server";
import CommercialWorkbookDemo from "@/components/commercial-workbooks/CommercialWorkbookDemo";

export const metadata = {
  title: "시중교재 채점 · 실습",
  robots: { index: false, follow: false },
};

/** Authored fixtures and an in-memory source only; never a production auth bypass. */
export default async function Page() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <CommercialWorkbookDemo />;
}
