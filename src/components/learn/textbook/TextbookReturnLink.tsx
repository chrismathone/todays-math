import BackLink from "@/components/ui/BackLink";
import { z } from "zod";
import { normalizeStudentReturnTo } from "@/lib/learn/studentReturnTo";
import {
  requireStudentConcept,
  readFrozenConcept,
} from "@/lib/textbook/studentRead";
import { textbookDb } from "@/lib/textbook/server/prismaSql";
import { TextbookError } from "@/lib/textbook/server/errors";
import styles from "./textbookLearn.module.css";

/** A bookmark only. GET never starts or modifies an activity. Current assignment still applies. */
export async function TextbookReturnLink({
  studentId,
  value,
}: {
  studentId: string;
  value: unknown;
}) {
  const href = normalizeStudentReturnTo(value);
  const match = href.match(
    /^\/learn\/textbook\/([a-f0-9-]{36})\/concepts\/([A-Za-z0-9][A-Za-z0-9_.:-]{0,79})$/,
  );
  if (!match || !z.uuid().safeParse(match[1]).success) return null;
  let title: string;
  try {
    const target = await requireStudentConcept(
      textbookDb,
      studentId,
      match[1],
      match[2],
    );
    const concept = await readFrozenConcept(textbookDb, target);
    title = concept.title;
  } catch (error) {
    if (
      error instanceof TextbookError &&
      [403, 404, 410].includes(error.status)
    )
      return null;
    throw error;
  }
  return (
    <aside className={styles.returnLink}>
      <BackLink href={href}>{title} · 교재 개념백지로 돌아가기</BackLink>
    </aside>
  );
}
