import type { ListeningMediaAuthorizationTarget } from "../media/service";
import {
  availableListeningDocument,
  denied,
  ownedSet,
  readablePublishedSet,
  student,
  teacher,
  type ListeningActor,
  type ListeningDatabase,
} from "./database";
import { authorizeStudentMedia } from "./students";
import { Prisma } from "@prisma/client";

export interface ListeningMediaActor {
  actor: ListeningActor;
  assignmentId?: string;
}
/** Invoked by the media service before metadata/bytes and again before upload commits. */
export function createListeningMediaAccess(
  database: ListeningDatabase,
  clock: () => Date = () => new Date(),
) {
  const resolve = async (
    context: ListeningMediaActor,
    target: ListeningMediaAuthorizationTarget,
  ) =>
    database.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
      if (context.actor.kind === "student") {
        if (
          target.action !== "playback" ||
          !context.assignmentId ||
          !target.assetId
        )
          throw denied();
        const scope = await authorizeStudentMedia(
          tx,
          context.actor,
          context.assignmentId,
          target.assetId,
          clock().toISOString(),
        );
        if (scope.setId !== target.setId) throw denied();
        return { ownerId: scope.ownerId, branchId: scope.branchId };
      }
      const account = await teacher(tx, context.actor, "materials");
      const set =
        target.action === "playback" &&
        account.menus.includes("english-listening")
          ? await readablePublishedSet(
              tx,
              account,
              target.setId,
              target.assetId,
            )
          : await ownedSet(tx, account, target.setId);
      const use =
        target.action === "store_original"
          ? "store_original"
          : target.action === "playback"
            ? "teacher_review"
            : "distribution";
      if (
        !set.document.rightsReview ||
        set.document.rights.rightsStatus !== "approved" ||
        !set.document.rights.allowedUses.some((u) => u === use)
      )
        throw denied();
      return { ownerId: set.owner_id, branchId: set.branch_id };
    });
  return {
    authorize: async (
      context: ListeningMediaActor,
      target: ListeningMediaAuthorizationTarget,
    ) => {
      try {
        await resolve(context, target);
        return true;
      } catch {
        return false;
      }
    },
    resolveScope: async (context: ListeningMediaActor, setId: string) =>
      database.$transaction(async (tx) => {
        if (context.actor.kind === "teacher") {
          const account = await teacher(tx, context.actor, "materials");
          const set = account.menus.includes("english-listening")
            ? await readablePublishedSet(tx, account, setId)
            : await ownedSet(tx, account, setId);
          return { ownerId: set.owner_id, branchId: set.branch_id };
        }
        // authorize() has already bound an exact asset; this second lookup is only the set scope.
        await student(tx, context.actor);
        const rows = await tx.$queryRaw<
          { ownerId: string; branchId: string | null }[]
        >(
          Prisma.sql`SELECT owner_id AS "ownerId",branch_id AS "branchId" FROM english_listening_set WHERE id=${setId}::uuid AND deleted_at IS NULL AND ${availableListeningDocument(Prisma.sql`document`)}`,
        );
        return rows[0] ?? null;
      }),
  };
}
