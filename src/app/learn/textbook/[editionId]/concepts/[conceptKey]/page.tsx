import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { getStudentSession } from "@/lib/learn/studentRequest";
import {
  studentLoginHref,
  studentPasswordHref,
} from "@/lib/learn/studentReturnTo";
import { LearnTopBar } from "@/components/learn/LearnTopBar";
import { TextbookConceptActivity } from "@/components/learn/textbook/TextbookConceptActivity";
import styles from "@/components/learn/textbook/textbookLearn.module.css";

export const metadata = { title: "교재 개념백지 · 오늘 수학" };
export default async function TextbookConceptPage({
  params,
}: {
  params: Promise<{ editionId: string; conceptKey: string }>;
}) {
  const input = z
    .object({ editionId: z.uuid(), conceptKey: textbookKeySchema })
    .safeParse(await params);
  if (!input.success) notFound();
  const { editionId, conceptKey } = input.data;
  const returnTo = `/learn/textbook/${editionId}/concepts/${conceptKey}`;
  const student = await getStudentSession();
  if (!student) redirect(studentLoginHref(returnTo));
  if (student.mustChangePassword) redirect(studentPasswordHref(returnTo));
  return (
    <>
      <LearnTopBar student={{ name: student.name }} />
      <main className={styles.main}>
        <TextbookConceptActivity
          key={`${student.studentId}:${returnTo}`}
          studentId={student.studentId}
          editionId={editionId}
          conceptKey={conceptKey}
        />
      </main>
    </>
  );
}
