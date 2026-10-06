import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  studentLoginHref,
  studentPasswordHref,
} from "@/lib/learn/studentReturnTo";
import { authorizeTextbook } from "@/lib/textbook/server/authorize";
import { textbookDb } from "@/lib/textbook/server/prismaSql";
import { requireReadableEdition } from "@/lib/textbook/access";
import { readFrozenConcept, readQrSnapshot } from "@/lib/textbook/studentRead";
import type { StudentQrTarget } from "@/lib/textbook/studentAccess";
import { TextbookError } from "@/lib/textbook/server/errors";
import { snapshotToPrintable } from "@/lib/textbook/snapshotToPrintable";
import { solutionForDisplay } from "@/lib/solutionSteps";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import { TextbookQrScreen } from "@/components/learn/textbook/TextbookQrScreen";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import learn from "@/components/learn/learn.module.css";
import styles from "@/components/learn/textbook/textbookLearn.module.css";

export const metadata = {
  title: "교재 학습 · 오늘의수학",
  robots: { index: false, follow: false },
};
export default async function TextbookQrPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(slug)) notFound();
  const session = await auth();
  const returnTo = `/q/${slug}`;
  if (session?.student) {
    if (session.student.mustChangePassword)
      redirect(studentPasswordHref(returnTo));
    return (
      <div className={learn.page}>
        <LearnTopBar student={{ name: session.student.name }} />
        <TextbookQrScreen
          key={`${session.student.studentId}:${slug}`}
          studentId={session.student.studentId}
          slug={slug}
        />
      </div>
    );
  }
  if (!session?.user?.id) redirect(studentLoginHref(returnTo));
  // Teacher preview is independently authorized. It never impersonates a student or creates an attempt.
  const gate = await authorizeTextbook(
    new Request("https://textbook.internal/q/preview"),
  );
  if (gate.response) notFound();
  const [target] = await textbookDb.query<StudentQrTarget>(
    `SELECT q."id" AS "qrTargetId", q."slug", q."kind", q."edition_id" AS "editionId", t."user_id" AS "ownerId",
    q."item_id" AS "itemId", i."snapshot_id" AS "snapshotId", q."concept_key" AS "conceptKey", COALESCE(i."section_id", c."section_id") AS "sectionId"
    FROM "textbook_qr_target" q JOIN "textbook_edition" e ON e."id" = q."edition_id" JOIN "textbook" t ON t."id" = e."textbook_id"
    LEFT JOIN "textbook_item" i ON i."id" = q."item_id" LEFT JOIN "textbook_concept" c ON c."edition_id" = q."edition_id" AND c."concept_key" = q."concept_key"
    WHERE q."slug" = $1::text AND q."state" = 'active'`,
    [slug],
  );
  if (!target) notFound();
  try {
    await requireReadableEdition(textbookDb, gate.actor, target.editionId);
  } catch (error) {
    if (error instanceof TextbookError && error.status === 404) notFound();
    throw error;
  }
  const editor = `/?${new URLSearchParams({ textbookEdition: target.editionId })}#textbook`;
  if (target.kind === "concept") {
    const concept = await readFrozenConcept(textbookDb, target);
    return (
      <div className={learn.page}>
        <main className={styles.main}>
          <p className={styles.eyebrow}>교사용 교재 확인</p>
          <h1>{concept.title}</h1>
          <MarkdownRenderer content={concept.body.definition} />
          <p>학생은 배정된 범위에서 이 개념의 백지 활동을 엽니다.</p>
          <Link href={editor}>교재 제작에서 열기</Link>
        </main>
      </div>
    );
  }
  const snapshot = await readQrSnapshot(textbookDb, target);
  const assets = await textbookDb.query<{
    id: string;
    widthPx: number | null;
    heightPx: number | null;
  }>(
    `SELECT a."id", a."width_px" AS "widthPx", a."height_px" AS "heightPx" FROM "textbook_asset" a
    WHERE a."user_id" = $1::uuid AND a."id" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
    [
      target.ownerId,
      JSON.stringify(snapshot.payload.figures.map((figure) => figure.assetId)),
    ],
  );
  const printable = snapshotToPrintable(snapshot, 1, (id) => {
    const asset = assets.find((row) => row.id === id);
    if (!asset) throw new Error("교재 그림 정보를 찾을 수 없습니다.");
    return {
      ...asset,
      url: `/api/textbook/editions/${target.editionId}/assets/${id}`,
    };
  });
  return (
    <div className={learn.page}>
      <main className={styles.main}>
        <p className={styles.eyebrow}>교사용 교재 확인</p>
        <h1>교재에 실린 문제</h1>
        <PaperProblemView {...printable} />
        <section className={styles.block}>
          <h2>정답과 풀이</h2>
          <MarkdownRenderer content={printable.answer} />
          {printable.solution !== null && (
            <MarkdownRenderer
              content={solutionForDisplay(printable.solution) ?? ""}
            />
          )}
        </section>
        <Link href={editor}>교재 제작에서 열기</Link>
      </main>
    </div>
  );
}
