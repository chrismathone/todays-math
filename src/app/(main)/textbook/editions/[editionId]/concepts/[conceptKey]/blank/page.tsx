import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import PrintNow from "@/components/concept-blank/paper/PrintNow";
import { parseConceptBlankView } from "@/components/concept-blank/paper/view";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { loadFrozenBlank } from "@/lib/textbook/frozenBlank";
import { authorizeTextbook } from "@/lib/textbook/server/authorize";
import { textbookDb } from "@/lib/textbook/server/prismaSql";
import { TextbookError } from "@/lib/textbook/server/errors";
import styles from "./print.module.css";

export const metadata = {
  title: "교재 개념백지 · 인쇄",
  robots: { index: false, follow: false },
};
export default async function TextbookBlankPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ editionId: string; conceptKey: string }>;
  searchParams: Promise<{
    view?: string | string[];
    print?: string | string[];
  }>;
}) {
  const [path, query] = await Promise.all([params, searchParams]);
  const parsed = z
    .strictObject({ editionId: z.uuid(), conceptKey: textbookKeySchema })
    .safeParse(path);
  if (!parsed.success) notFound();
  const gate = await authorizeTextbook(
    new Request("https://textbook.internal/textbook/blank"),
  );
  if (gate.response) {
    if (gate.response.status === 401) redirect("/login");
    notFound();
  }
  let result: Awaited<ReturnType<typeof loadFrozenBlank>> | null = null;
  let notice: string | null = null;
  try {
    result = await loadFrozenBlank(
      textbookDb,
      gate.actor,
      path.editionId,
      path.conceptKey,
    );
  } catch (error) {
    if (error instanceof TextbookError && error.status === 404) notFound();
    if (error instanceof TextbookError && error.status === 409)
      notice = error.message;
    else throw error;
  }
  const editor = `/?${new URLSearchParams({ textbookEdition: path.editionId })}#textbook`;
  if (!result)
    return (
      <main className={styles.notice}>
        <p role="alert">{notice}</p>
        <Link href={editor}>교재 제작에서 열기</Link>
      </main>
    );
  return (
    <main className={styles.shell}>
      <header className={styles.toolbar}>
        <div>
          <strong>{result.concept.title}</strong>
          <p>{result.edition.label} · 교재에 실린 개념백지</p>
        </div>
        <nav aria-label="인쇄할 내용">
          <Link href="?view=student">학생지</Link>
          <Link href="?view=key">채점표</Link>
          <Link href="?view=both">전체</Link>
          <Link href={editor}>교재 제작</Link>
          <Link href={`?view=${parseConceptBlankView(query.view)}&print=1`}>
            인쇄하기
          </Link>
        </nav>
      </header>
      <ConceptBlankPaper
        sheets={result.sheets}
        view={parseConceptBlankView(query.view)}
      />
      {(Array.isArray(query.print) ? query.print[0] : query.print) === "1" &&
      result.sheets.length > 0 ? (
        <PrintNow />
      ) : null}
    </main>
  );
}
