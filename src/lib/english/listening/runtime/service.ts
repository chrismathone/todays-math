import { z } from "zod";
import {
  listeningBroadcastInputSchema,
  listeningRevisionInputSchema,
} from "@/contracts/englishListeningHttp.contract";
import {
  lock,
  teacher,
  type ListeningActor,
  type ListeningDatabase,
  type ListeningTx,
} from "./database";
import * as sets from "./sets";
import * as assignments from "./assignments";
import * as students from "./students";

/** Each command, receipt, revision and release exposure commits in one durable transaction.
 * The advisory lock serializes a set/assignment across processes; SQL CAS still checks the
 * caller's revision. No process-local data or fallback participates in application state. */
export function createListeningRuntime(
  database: ListeningDatabase,
  clock: () => Date = () => new Date(),
) {
  const transaction = <T>(
    key: string | undefined,
    fn: (tx: ListeningTx, now: string) => Promise<T>,
  ) =>
    database.$transaction(
      async (tx) => {
        // PostgreSQL timestamp columns follow the project's UTC convention, independent of host TZ.
        await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
        if (key) await lock(tx, key);
        return fn(tx, clock().toISOString());
      },
      { maxWait: 10000, timeout: 30000 },
    );
  const id = (value: string) => z.uuid().parse(value);
  return {
    teacherList: (
      actor: ListeningActor,
      resource: "sets" | "assignments" | "classes",
    ) =>
      transaction(undefined, async (tx) => {
        const account = await teacher(tx, actor);
        return resource === "sets"
          ? sets.listSets(tx, account)
          : resource === "assignments"
            ? assignments.listAssignments(tx, account)
            : assignments.listClasses(tx, account);
      }),
    createSet: (actor: ListeningActor, input: unknown) =>
      transaction(undefined, async (tx, now) =>
        sets.createSet(tx, await teacher(tx, actor), input, now),
      ),
    setDetail: (actor: ListeningActor, setId: string) =>
      transaction(id(setId), async (tx) =>
        sets.setDetail(tx, await teacher(tx, actor), setId),
      ),
    updateSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.updateSet(tx, await teacher(tx, actor), setId, input, now),
      ),
    reviewSet: (actor: ListeningActor, setId: string, input: unknown) =>
      transaction(id(setId), async (tx, now) =>
        sets.reviewSet(tx, await teacher(tx, actor), setId, input, now),
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
          await teacher(tx, actor),
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
