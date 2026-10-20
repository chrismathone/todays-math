import { connection } from "next/server";
import { notFound } from "next/navigation";
import { devPageVisible } from "@/lib/devPageAccess";
import { DescriptivePaperPreview } from "./DescriptivePaperPreview";
import type { PrintTemplate } from "@/components/unified/print/types";

export default async function DescriptivePaperPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const params = await searchParams;
  const templates: PrintTemplate[] = [
    "jaseup",
    "jeongtong",
    "modern",
    "workbook",
    "yuhyung",
    "pyeongga",
  ];
  return (
    <DescriptivePaperPreview
      paper={
        params.paper === "review" || params.paper === "past"
          ? params.paper
          : "daily"
      }
      audience={params.audience === "teacher" ? "teacher" : "student"}
      monochrome={params.mono === "1"}
      mixed={params.mixed === "1"}
      unified={params.renderer === "unified"}
      template={
        templates.find((template) => template === params.template) ?? "jaseup"
      }
      columns={params.columns === "2" ? 2 : 1}
      candidate={
        typeof params.candidate === "string" ? params.candidate : undefined
      }
      sample={typeof params.sample === "string" ? params.sample : undefined}
    />
  );
}
