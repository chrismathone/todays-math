import { z } from "zod";
import {
  listeningBroadcastInputSchema,
  listeningRevisionInputSchema,
} from "@/contracts/englishListeningHttp.contract";
import {
  lock,
  denied,
  teacher,
  type ListeningActor,
  type ListeningDatabase,
  type ListeningTx,
} from "./database";
import * as sets from "./sets";
import * as assignments from "./assignments";
import * as students from "./students";
import { searchListeningBank, searchListeningReferences } from "./bank";
import { composeListeningSet, composeSource } from "./compose";
import { sourceTranscripts } from "./transcripts";
import type { ListeningDriveApi } from "../media/driveApi";
import type {
  ListeningStorageApi,
  ListeningStorageRef,
} from "../media/storageApi";

/** Each command, receipt, revision and release exposure commits in one durable transaction.
 * The advisory lock serializes a set/assignment across processes; SQL CAS still checks the
 * caller's revision. No process-local data or fallback participates in application state. */
export function createListeningRuntime(
  database: ListeningDatabase,
  clock: () => Date = () => new Date(),
  dependencies: {
    drive?: ListeningDriveApi | null;
    storage?: ListeningStorageApi | null;
  } = {},
) {
  const transaction = <T>(
    key: string | undefined,
    fn: (tx: ListeningTx, now: string) => Promise<T>,
    timeout = 30000,
  ) =>
    database.$transaction(
      async (tx) => {
        // PostgreSQL timestamp columns follow the project's UTC convention, independent of host TZ.
        await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
        if (key) await lock(tx, key);
        return fn(tx, clock().toISOString());
      },
      { maxWait: 10000, timeout },
    );
  const id = (value: string) => z.uuid().parse(value);
  return {
    teacherBank: (
      actor: ListeningActor,
      resource: "bank" | "references",
      input: unknown,
    ) =>
      transaction(undefined, async (tx) => {
        const account = await teacher(tx, actor, "materials");
        if (!account.menus.includes("english-bank")) throw denied();
        return resource === "bank"
          ? searchListeningBank(tx, account, input)
          : searchListeningReferences(input);
      }),
    teacherList: (
      actor: ListeningActor,
      resource: "sets" | "assignments" | "classes",
    ) =>
      transaction(undefined, async (tx) => {
        const account = await teacher(
          tx,
          actor,
          resource === "sets" ? "materials" : "listening",
        );
        return resource === "sets"
          ? sets.listSets(tx, account)
          : resource === "assignments"
            ? assignments.listAssignments(tx, account)
            : assignments.listClasses(tx, account);
      }),
    createSet: (actor: ListeningActor, input: unknown) =>
      transaction(undefined, async (tx, now) =>
        sets.createSet(tx, await teacher(tx, actor, "materials"), input, now),
      ),
    composeSet: async (actor: ListeningActor, input: unknown) => {
      const createdFiles = new Set<string>();
      const createdStorageRefs: ListeningStorageRef[] = [];
      try {
        return await transaction(
          undefined,
          async (tx, now) => {
            const account = await teacher(tx, actor, "materials");
            if (!account.menus.includes("english-bank")) throw denied();
            return composeListeningSet(
              tx,
              account,
              input,
              now,
              dependencies.drive || dependencies.storage
                ? {
                    api: dependencies.drive ?? undefined,
                    storage: dependencies.storage ?? undefined,
                    createdFiles,
                    createdStorageRefs,
                  }
                : undefined,
            );
          },
          dependencies.drive || dependencies.storage ? 600000 : 120000,
        );
      } catch (error) {
        // SQL rollback never leaves a playable metadata identity. Remove only
        // newly created derivatives, never shared originals or existing files.
        await Promise.allSettled(
          [...createdFiles].map((fileId) => dependencies.drive!.trash(fileId)),
        );
        await Promise.allSettled(
          createdStorageRefs.map((ref) => dependencies.storage!.remove(ref)),
        );
        throw error;
      }
    },
    composeSource: (actor: ListeningActor, setId: string) =>
      transaction(id(setId), async (tx) => {
        const account = await teacher(tx, actor, "materials");
        if (!account.menus.includes("english-bank")) throw denied();
        return composeSource(tx, account, setId);
      }),
    sourceTranscripts: (actor: ListeningActor, setId: string) =>
      transaction(undefined, async (tx) => {
        id(setId);
        const account = await teacher(tx, actor, "materials");
        if (!account.menus.includes("english-bank")) throw denied();
        return sourceTranscripts(tx, account, setId);
      }),
    setDetail: (actor: ListeningActor, setId: string) =>
      transaction(id(setId), async (tx) =>
        sets.setDetail(tx, await teacher(tx, actor, "materials"), setId),
      ),
    updateSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.updateSet(
          tx,
          await teacher(tx, actor, "materials"),
          setId,
          input,
          now,
        ),
      ),
    reviewSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.reviewSet(
          tx,
          await teacher(tx, actor, "materials"),
          setId,
          input,
          now,
        ),
      ),
    publishSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.publishSet(
          tx,
          await teacher(tx, actor),
          setId,
          listeningRevisionInputSchema.parse(input).expectedRevision,
          now,
        ),
      ),
    deleteSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.deleteSet(
          tx,
          await teacher(tx, actor, "materials"),
          setId,
          listeningRevisionInputSchema.parse(input).expectedRevision,
          now,
        ),
      ),
    createAssignment: (actor: ListeningActor, input: unknown) =>
      transaction(undefined, async (tx, now) =>
        assignments.createAssignment(tx, await teacher(tx, actor), input, now),
      ),
    assignmentDetail: (actor: ListeningActor, assignmentId: string) =>
      transaction(id(assignmentId), async (tx, now) =>
        assignments.assignmentDetail(
          tx,
          await teacher(tx, actor),
          assignmentId,
          now,
        ),
      ),
    mutateAssignment: (
      actor: ListeningActor,
      assignmentId: string,
      action: "targets" | "cancel" | "release" | "broadcast" | "retry",
      input: unknown,
    ) =>
      transaction(id(assignmentId), async (tx, now) => {
        if (action === "cancel" || action === "release")
          listeningRevisionInputSchema.parse(input);
        if (action === "broadcast") listeningBroadcastInputSchema.parse(input);
        return assignments.mutateAssignment(
          tx,
          await teacher(tx, actor),
          assignmentId,
          action,
          input,
          now,
        );
      }),
    studentList: (actor: ListeningActor) =>
      transaction(undefined, (tx, now) =>
        students.listStudentAssignments(tx, actor, now),
      ),
    studentDetail: (actor: ListeningActor, assignmentId: string) =>
      transaction(id(assignmentId), (tx, now) =>
        students.studentDetail(tx, actor, assignmentId, now),
      ),
    prepareStudent: (actor: ListeningActor, assignmentId: string) =>
      transaction(id(assignmentId), (tx, now) =>
        students.prepareStudent(tx, actor, assignmentId, now),
      ),
    studentCommand: (
      actor: ListeningActor,
      assignmentId: string,
      input: unknown,
    ) =>
      transaction(id(assignmentId), (tx, now) =>
        students.studentCommand(tx, actor, assignmentId, input, now),
      ),
  };
}
