import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ListeningPrint } from "@/components/english/listening/print/ListeningPrint";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import { printableDraft } from "@/lib/english/listening/runtime/compose";
import {
  ListeningRuntimeError,
  lock,
  teacher,
} from "@/lib/english/listening/runtime/database";

export const metadata = { title: "영어듣기 · 시험지 인쇄" };
export default async function ListeningDraftPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    revision?: string | string[];
    view?: string | string[];
  }>;
}) {
  const [session, route, query] = await Promise.all([
    getSessionUser(),
    params,
    searchParams,
  ]);
  if (!session) redirect("/login");
  const parsed = z
    .strictObject({
      id: z.uuid(),
      revision: z.coerce.number().int().positive().max(2147483646),
      view: z.enum(["student", "teacher"]),
    })
    .safeParse({
      id: route.id,
      revision: query.revision,
      view: query.view ?? "student",
    });
  if (!parsed.success) notFound();
  const draft = await db
    .$transaction(async (tx) => {
      await lock(tx, parsed.data.id);
      const account = await teacher(
        tx,
        { kind: "teacher", userId: session.id },
        "materials",
      );
      return printableDraft(
        tx,
        account,
        parsed.data.id,
        parsed.data.revision,
        parsed.data.view,
      );
    })
    .catch((error: unknown) => {
      if (
        error instanceof ListeningRuntimeError &&
        [400, 401, 403, 404, 409].includes(error.status)
      )
        notFound();
      throw error;
    });
  return (
    <ListeningPrint
      document={listeningDraftPrintDocument(draft, parsed.data.view)}
    />
  );
}
