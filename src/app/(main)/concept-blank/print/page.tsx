/**
 * 개념 백지 — 인쇄 페이지 `/concept-blank/print?s=…&view=student|key|both[&print=1]` (D-150 · 26 §6).
 * `print=1` — 화면의 인쇄하기로 열면 지면을 그린 뒤 인쇄 창을 바로 띄운다(`PrintNow` · 원장님 2026-10-01).
 *
 * 서버 컴포넌트 · **크롬 없음** — 지면(`ConceptBlankPaper`) 하나만 그린다(영어 인쇄 페이지 본보기 — 작업실 CSS 의
 * `@page` 가 같은 창에 실리면 지면 여백이 뒤바뀐다). 관문은 `accountRouteAccess.ts` 가 `/concept-blank` →
 * `conceptBlank` 메뉴로 잠근다(트랙 cb-app — 메뉴 꺼진 계정은 여기 오기 전에 막힌다).
 *
 * 세션 없음 → `/login` · `?s=` 가 틀리면(읽기 · 계약 검사 실패) «주소를 확인해 주세요» 한 줄.
 * 고정 문항이라 같은 `?s=` 는 언제나 같은 지면이다(DB 를 안 읽는다 — 은행은 코드 데이터).
 */
import { notFound, redirect } from "next/navigation";

import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import PrintNow from "@/components/concept-blank/paper/PrintNow";
import { parseConceptBlankView } from "@/components/concept-blank/paper/view";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { composeSheets } from "@/lib/concept-blank/compose";
import { decodeSelection } from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import { getSessionUser } from "@/lib/session";

import styles from "./print.module.css";

export const metadata = { title: "개념 백지 · 인쇄" };

type ConceptBlankPrintPageProps = {
  searchParams: Promise<{
    s?: string | string[];
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

  const code = Array.isArray(query.s) ? query.s[0] : query.s;
  const selection = decodeSelection(code);
  if (!selection)
    return (
      <p className={styles.notice} role="alert">
        주소를 확인해 주세요.
      </p>
    );

  // 지면 코드(트랙 cb-code) — 지면이 있을 때만(나무에 없는 소단원뿐이면 합치기가 빈 지면을 준다)
  const sheets = composeSheets(selection, CONCEPT_BLANK_BANK);
  return (
    <main className={styles.shell}>
      <ConceptBlankPaper
        code={
          sheets.length
            ? encodeSheetCode(selection, CONCEPT_BLANK_BANK)
            : undefined
        }
        sheets={sheets}
        view={parseConceptBlankView(query.view)}
      />
      {(Array.isArray(query.print) ? query.print[0] : query.print) === "1" ? (
        <PrintNow />
      ) : null}
    </main>
  );
}
