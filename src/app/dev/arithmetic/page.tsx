import { notFound } from "next/navigation";
import { connection } from "next/server";
import ArithmeticWorkbench from "@/components/arithmetic/ArithmeticWorkbench";
import { devPageVisible } from "@/lib/devPageAccess";

export default async function ArithmeticPreviewPage() {
  await connection();
  if (!(await devPageVisible())) notFound();
  return (
    <main style={{ maxWidth: 1400, margin: "24px auto", padding: 20 }}>
      <ArithmeticWorkbench canOutput preview />
    </main>
  );
}
