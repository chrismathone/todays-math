import { connection } from "next/server";
import { notFound } from "next/navigation";
import { fadingCatalog } from "@/lib/fading/catalog";
import { fadingTrapMap } from "@/lib/fading/traps";
import { fadingFigureOf } from "@/lib/fading/catalog";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { kstDateOf } from "@/lib/kstDate";
import { ExplorerSrsPreview } from "./ExplorerSrsPreview";

/** The fixture uses real concept content and memory sources; it never uses a student account. */
export default async function ExplorerSrsPreviewPage() {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  )
    notFound();
  const today = kstDateOf(new Date());
  const bank = fadingCatalog();
  const concepts = [
    ...bank
      .filter((concept) => concept.section.startsWith("초3::"))
      .slice(0, 8),
    ...bank
      .filter(
        (concept) =>
          concept.section.startsWith("초5::") &&
          concept.section.includes("분수"),
      )
      .slice(0, 8),
    ...bank
      .filter((concept) => concept.section.startsWith("중1::"))
      .slice(0, 8),
  ];
  const figures = Object.fromEntries(
    concepts.flatMap((concept) => {
      const figure = fadingFigureOf(concept);
      return figure ? [[concept.id, figure]] : [];
    }),
  );
  const explorer = {
    ...explorerView(createExplorerState("explorer-preview", 3), today),
    student: {
      id: "explorer-preview",
      name: "미리 보기 학생",
      className: "미리 보기",
    },
    revision: 0,
    feedback: null,
    today,
  };
  return (
    <ExplorerSrsPreview
      concepts={concepts}
      traps={fadingTrapMap(concepts)}
      figures={figures}
      explorer={explorer}
      today={today}
    />
  );
}
