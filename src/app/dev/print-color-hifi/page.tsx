import { notFound } from "next/navigation";
import { PrintColorHifi } from "./PrintColorHifi";

/** Local fixtures only. No session, API, database or saved print settings. */
export default function PrintColorHifiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PrintColorHifi />;
}
