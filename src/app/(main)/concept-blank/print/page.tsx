/** New ?s= selections POST an issue from IssuePrint. ?p= reprints frozen bytes without consulting today's bank.
 * This GET never writes or launches Chromium. Issuance failure leaves the existing printable paper usable. */
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";
import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import PrintNow from "@/components/concept-blank/paper/PrintNow";
import IssuePrint from "@/components/concept-blank/IssuePrint";
import { parseConceptBlankView } from "@/components/concept-blank/paper/view";
import { composeSheets } from "@/lib/concept-blank/compose";
import { decodeSelection } from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import { getSessionUser } from "@/lib/session";

import styles from "./print.module.css";

export const metadata = { title: "개념 백지 · 인쇄" };

type ConceptBlankPrintPageProps = {
  searchParams: Promise<{
    s?: string | string[];
    p?: string | string[];
    view?: string | string[];
    print?: string | string[];
  }>;
};

export default async function ConceptBlankPrintPage({
  searchParams,
}: ConceptBlankPrintPageProps) {
  const [session, query] = await Promise.all([getSessionUser(), searchParams]);
  if (!session) redirect("/login");
  if (!session.menus?.includes("conceptBlank")) notFound();

  const view = parseConceptBlankView(query.view);
  const autoPrint =
    (Array.isArray(query.print) ? query.print[0] : query.print) === "1";
  const issuedId = Array.isArray(query.p) ? query.p[0] : query.p;
  if (issuedId !== undefined) {
    if (!z.uuid().safeParse(issuedId).success)
      return (
        <p className={styles.notice} role="alert">
          주소를 확인해 주세요.
        </p>
      );
    const [{ readIssuedScanArtifact }, { scanDatabase }] = await Promise.all([
      import("@/lib/concept-blank/scan/issuance"),
      import("@/lib/concept-blank/scan/database.server"),
    ]);
    let artifact: Awaited<ReturnType<typeof readIssuedScanArtifact>>;
    try {
      artifact = await readIssuedScanArtifact(
        { kind: "teacher", id: session.id },
        issuedId,
        view,
        scanDatabase,
      );
    } catch (error) {
      if (error instanceof Error && "status" in error)
        return (
          <p className={styles.notice} role="alert">
            {error.message}
          </p>
        );
      throw error;
    }
    return (
      <main className={styles.shell}>
        <style
          dangerouslySetInnerHTML={{
            __html: artifact.css.replace(/<\/style/gi, "<\\/style"),
          }}
        />
        <div
          className={styles.frozen}
          dangerouslySetInnerHTML={{
            __html: artifact.pages.map((p) => p.html).join(""),
          }}
        />
        {autoPrint ? <PrintNow /> : null}
      </main>
    );
  }

  const code = Array.isArray(query.s) ? query.s[0] : query.s;
  const selection = decodeSelection(code);
  if (!selection)
    return (
      <p className={styles.notice} role="alert">
        주소를 확인해 주세요.
      </p>
    );

  let sheets: ConceptBlankSheet[];
  const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
  try {
    sheets = composeSheets(selection, CONCEPT_BLANK_BANK);
  } catch (error) {
    if (selection.pick === undefined || !(error instanceof RangeError))
      throw error;
    return (
      <p className={styles.notice} role="alert">
        선택한 문항을 현재 문항 은행에서 확인할 수 없습니다. 개념 백지에서
        문항을 다시 골라 주세요.
      </p>
    );
  }

  // 자동 선택만 지면 코드로 표현할 수 있다. 정확한 선택은 주소의 문항 ID를 그대로 인쇄한다.
  return (
    <main className={styles.shell}>
      <IssuePrint selection={selection} view={view} autoPrint={autoPrint}>
        <ConceptBlankPaper
          code={
            sheets.length && selection.pick === undefined
              ? encodeSheetCode(selection, CONCEPT_BLANK_BANK)
              : undefined
          }
          sheets={sheets}
          view={view}
        />
      </IssuePrint>
    </main>
  );
}
