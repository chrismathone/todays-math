import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ListeningPrint } from "@/components/english/listening/print/ListeningPrint";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listeningPrintDocument } from "@/lib/english/listening/print";
import {
  ListeningRuntimeError,
  teacher,
  ownedSet,
} from "@/lib/english/listening/runtime/database";
import { publicationRow } from "@/lib/english/listening/runtime/assignments";

export const metadata = { title: "영어듣기 · 인쇄" };
export default async function ListeningPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    publicationId?: string | string[];
    view?: string | string[];
  }>;
}) {
  const [session, route, query] = await Promise.all([
    getSessionUser(),
    params,
    searchParams,
  ]);
  if (!session) redirect("/login");
  const ids = z
    .object({ id: z.uuid(), publicationId: z.uuid() })
    .safeParse({ id: route.id, publicationId: query.publicationId });
  if (!ids.success) notFound();
  const publication = await db
    .$transaction(async (tx) => {
      const account = await teacher(tx, {
        kind: "teacher",
        userId: session.id,
      });
      const set = await ownedSet(tx, account, ids.data.id);
      const requiredUse =
        query.view === "teacher" ? "teacher_review" : "distribution";
      if (
        !set.document.rightsReview ||
        set.document.rights.rightsStatus !== "approved" ||
        !set.document.rights.allowedUses.includes(requiredUse)
      ) {
        throw new ListeningRuntimeError(
          404,
          "NOT_FOUND",
          "듣기 자료를 찾을 수 없습니다.",
        );
      }
      const row = await publicationRow(tx, ids.data.publicationId);
      if (row.set_id !== ids.data.id)
        throw new ListeningRuntimeError(
          404,
          "NOT_FOUND",
          "듣기 자료를 찾을 수 없습니다.",
        );
      return row.snapshot;
    })
    .catch((error: unknown) => {
      if (
        error instanceof ListeningRuntimeError &&
        [401, 403, 404].includes(error.status)
      )
        notFound();
      throw error;
    });
  return (
    <ListeningPrint
      document={listeningPrintDocument(
        publication,
        query.view === "teacher" ? "teacher" : "student",
      )}
    />
  );
}
