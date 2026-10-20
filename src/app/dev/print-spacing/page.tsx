import { connection } from "next/server";
import { notFound } from "next/navigation";
import { devPageVisible } from "@/lib/devPageAccess";
import SpacingFixture from "./SpacingFixture";

export default async function Page() {
  await connection();
  if (!(await devPageVisible())) notFound();
  return <SpacingFixture />;
}
