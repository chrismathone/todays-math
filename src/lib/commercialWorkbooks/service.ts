import { z } from "zod";
import {
  workbookCreateAssignmentSchema,
  workbookCreateEditionSchema,
  workbookReviseEditionSchema,
  workbookAssignmentPageSchema,
  workbookSaveMarksSchema,
  workbookUpdateWrongNoteSchema,
  workbookWrongNoteFilterSchema,
  workbookWrongNotePrintSchema,
  type WorkbookAssignment,
  type WorkbookEdition,
  type WorkbookEditionDetail,
  type WorkbookExercise,
  type WorkbookExerciseInput,
  type WorkbookWrongNote,
  type WorkbookAssignmentPageRequest,
} from "@/contracts/commercialWorkbook.contract";
import { CommercialWorkbookError, fail } from "./errors";
import { assertUniqueAddresses, workbookAddressKey } from "./import";
import { applyWorkbookMarks } from "./grading";
import type { CommercialWorkbookSource } from "./source";
import type { WorkbookContext, WorkbookRun } from "./store";

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new CommercialWorkbookError(
      "VALIDATION_ERROR",
      "입력 내용을 확인해 주세요.",
      result.error.issues,
    );
  return result.data;
}
const validId = (value: string) => parse(z.string().uuid(), value);
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
async function idempotent<T>(
  ctx: WorkbookContext,
  operation: string,
  input: { requestId: string },
  work: () => Promise<T>,
): Promise<T> {
  const fingerprint = canonical({ operation, input });
  const previous = await ctx.store.getReceipt(input.requestId);
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      fail(
        "IDEMPOTENCY_CONFLICT",
        "같은 요청 번호에 다른 내용이 있습니다. 새 요청 번호로 저장해 주세요.",
      );
    const replay = structuredClone(previous.result);
    if (
      replay &&
      typeof replay === "object" &&
      "targets" in replay &&
      "classId" in replay
    )
      return (await projectAssignment(
        ctx,
        replay as WorkbookAssignment,
        false,
      )) as T;
    return replay as T;
  }
  const result = await work();
  await ctx.store.insertReceipt({
    requestId: input.requestId,
    fingerprint,
    result,
  });
  return result;
}
function summary(detail: WorkbookEdition): WorkbookEdition {
  const {
    id,
    metadata,
    revision,
    exerciseCount,
    reviewedKeyCount,
    missingKeyCount,
    createdAt,
  } = detail;
  return {
    id,
    metadata,
    revision,
    exerciseCount,
    reviewedKeyCount,
    missingKeyCount,
    createdAt,
  };
}
function exerciseSnapshot(
  ctx: WorkbookContext,
  rows: WorkbookExerciseInput[],
  previous: WorkbookExercise[] = [],
): WorkbookExercise[] {
  assertUniqueAddresses(rows);
  const existing = new Map(
    previous.map((e) => [workbookAddressKey(e.address), e]),
  );
  const incoming = new Set(rows.map((e) => workbookAddressKey(e.address)));
  if (previous.some((e) => !incoming.has(workbookAddressKey(e.address))))
    fail(
      "VALIDATION_ERROR",
      "기존 문항 주소를 삭제할 수 없습니다. 전체 문항을 포함해 주세요.",
    );
  return rows.map((row) => {
    const old = existing.get(workbookAddressKey(row.address));
    const unchangedReviewed =
      old?.key?.status === "reviewed" &&
      row.key?.status === "reviewed" &&
      old.key.answerText === row.key.answerText &&
      old.key.sourcePage === row.key.sourcePage;
    return {
      ...row,
      id: old?.id ?? ctx.newId(),
      grading: "manual",
      reviewedBy:
        row.key?.status === "reviewed"
          ? unchangedReviewed
            ? old.reviewedBy
            : ctx.actorId
          : null,
      reviewedAt:
        row.key?.status === "reviewed"
          ? unchangedReviewed
            ? old.reviewedAt
            : ctx.now()
          : null,
    };
  });
}
const counts = (exercises: WorkbookExercise[]) => ({
  exerciseCount: exercises.length,
  reviewedKeyCount: exercises.filter((e) => e.key?.status === "reviewed")
    .length,
  missingKeyCount: exercises.filter((e) => e.key === null).length,
});
async function edition(ctx: WorkbookContext, id: string) {
  const value = await ctx.store.getEdition(validId(id));
  if (!value) fail("NOT_FOUND", "교재를 찾을 수 없습니다.");
  return value;
}
async function assignment(ctx: WorkbookContext, id: string, write = false) {
  const value = await ctx.store.getAssignment(validId(id));
  if (!value) fail("NOT_FOUND", "과제를 찾을 수 없습니다.");
  return projectAssignment(ctx, value, write);
}
async function projectAssignment(
  ctx: WorkbookContext,
  value: WorkbookAssignment,
  write: boolean,
): Promise<WorkbookAssignment> {
  if (ctx.policy.projectRoster) {
    const roster = await ctx.policy.projectRoster(
      value.classId,
      value.targets.map((t) => t.studentId),
      write,
    );
    const allowed = new Set(roster.students.map((s) => s.id));
    return {
      ...value,
      targets: value.targets.filter((t) => allowed.has(t.studentId)),
    };
  }
  // Local/custom policies can expose only assertRoster; class authorization stays distinct
  // from one student's transfer, and only a scope denial is filtered.
  await ctx.policy.assertRoster(value.classId, [], write);
  const targets: WorkbookAssignment["targets"] = [];
  for (const target of value.targets) {
    try {
      await ctx.policy.assertRoster(value.classId, [target.studentId], write);
      targets.push(target);
    } catch (error) {
      if (
        !(error instanceof CommercialWorkbookError) ||
        error.code !== "SCOPE_CHANGED"
      )
        throw error;
    }
  }
  return { ...value, targets };
}
async function note(
  ctx: WorkbookContext,
  id: string,
  write = false,
): Promise<WorkbookWrongNote> {
  const value = await ctx.store.getNote(validId(id));
  if (!value) fail("NOT_FOUND", "오답 기록을 찾을 수 없습니다.");
  const current = await assignment(ctx, value.assignmentId, write);
  const target = current.targets.find((t) => t.studentId === value.studentId);
  if (!target)
    fail("SCOPE_CHANGED", "현재 담당 학생의 오답 기록만 확인할 수 있습니다.");
  return {
    ...value,
    latestMark: target.marks[value.exerciseId] ?? null,
  };
}
async function assignmentPage(
  ctx: WorkbookContext,
  input: WorkbookAssignmentPageRequest = {},
) {
  const body = parse(workbookAssignmentPageSchema, input);
  if (body.after && !(await ctx.store.getAssignment(body.after)))
    fail("NOT_FOUND", "목록 시작점을 찾을 수 없습니다.");
  const rows = await ctx.store.listAssignments(body.after, body.limit + 1);
  const visible = rows.slice(0, body.limit);
  const items: WorkbookAssignment[] = [];
  for (const row of visible) {
    try {
      items.push(await projectAssignment(ctx, row, false));
    } catch (error) {
      if (
        !(error instanceof CommercialWorkbookError) ||
        error.code !== "SCOPE_CHANGED"
      )
        throw error;
    }
  }
  return {
    items,
    nextCursor: rows.length > body.limit ? visible.at(-1)!.id : null,
  };
}
/** Shared rules for browser-only demo and server. Every operation obtains a fresh policy. */
export function createCommercialWorkbookSource(
  run: WorkbookRun,
): CommercialWorkbookSource {
  const access = <T>(
    write: boolean,
    work: (ctx: WorkbookContext) => Promise<T>,
  ) =>
    run(write, async (ctx) => {
      await ctx.policy.assertTeacher();
      return structuredClone(await work(ctx));
    });
  return {
    listRoster: () => access(false, (ctx) => ctx.policy.listRoster()),
    listCatalog: () =>
      access(false, async (ctx) =>
        (await ctx.store.listEditions()).map(summary),
      ),
    getEdition: (id) => access(false, (ctx) => edition(ctx, id)),
    createEdition: (input) =>
      access(true, async (ctx) => {
        const body = parse(workbookCreateEditionSchema, input);
        return idempotent(ctx, "create-edition", body, async () => {
          const exercises = exerciseSnapshot(ctx, body.exercises);
          const createdAt = ctx.now();
          const rev = {
            revision: 1,
            provenance: body.provenance,
            exercises,
            createdAt,
            createdBy: ctx.actorId,
          };
          const result: WorkbookEditionDetail = {
            id: ctx.newId(),
            metadata: body.metadata,
            revision: 1,
            provenance: body.provenance,
            exercises,
            revisions: [rev],
            createdAt,
            ...counts(exercises),
          };
          await ctx.store.putEdition(result);
          return result;
        });
      }),
    reviseEdition: (id, input) =>
      access(true, async (ctx) => {
        const body = parse(workbookReviseEditionSchema, input);
        const current = await edition(ctx, id);
        return idempotent(ctx, `revise-edition:${id}`, body, async () => {
          if (current.revision !== body.expectedRevision)
            fail(
              "STALE_REVISION",
              "교재 정답이 변경되었습니다. 다시 불러와 주세요.",
            );
          const exercises = exerciseSnapshot(
            ctx,
            body.exercises,
            current.exercises,
          );
          const rev = {
            revision: current.revision + 1,
            provenance: body.provenance,
            exercises,
            createdAt: ctx.now(),
            createdBy: ctx.actorId,
          };
          const result = {
            ...current,
            revision: rev.revision,
            exercises,
            provenance: rev.provenance,
            revisions: [...current.revisions, rev],
            ...counts(exercises),
          };
          await ctx.store.putEdition(result);
          return result;
        });
      }),
    listAssignmentPage: (input) =>
      access(false, (ctx) => assignmentPage(ctx, input)),
    listAssignments: () =>
      access(false, async (ctx) => {
        const all: WorkbookAssignment[] = [];
        let after: string | undefined;
        do {
          const page = await assignmentPage(ctx, { after, limit: 50 });
          all.push(...page.items);
          after = page.nextCursor ?? undefined;
        } while (after);
        return all;
      }),
    getAssignment: (id) => access(false, (ctx) => assignment(ctx, id)),
    createAssignment: (input) =>
      access(true, async (ctx) => {
        const body = parse(workbookCreateAssignmentSchema, input);
        const roster = await ctx.policy.assertRoster(
          body.classId,
          body.studentIds,
          true,
        );
        const book = await edition(ctx, body.editionId);
        return idempotent(ctx, "create-assignment", body, async () => {
          if (book.revision !== body.expectedEditionRevision)
            fail(
              "STALE_REVISION",
              "교재 정답이 변경되었습니다. 다시 선택해 주세요.",
            );
          const byId = new Map(book.exercises.map((e) => [e.id, e]));
          if (body.exerciseIds.some((id) => !byId.has(id)))
            fail("VALIDATION_ERROR", "이 교재에 없는 문항입니다.");
          const result: WorkbookAssignment = {
            id: ctx.newId(),
            title: body.title,
            classId: body.classId,
            className: roster.className,
            dueAt: body.dueAt ?? null,
            createdAt: ctx.now(),
            createdBy: ctx.actorId,
            edition: {
              id: book.id,
              metadata: book.metadata,
              revision: book.revision,
              provenance: book.provenance,
            },
            exercises: body.exerciseIds.map((id) => byId.get(id)!),
            targets: body.studentIds.map((studentId) => ({
              studentId,
              studentName: roster.students.find((s) => s.id === studentId)!
                .name,
              revision: 0,
              marks: {},
              history: [],
            })),
          };
          await ctx.store.insertAssignment(result);
          return result;
        });
      }),
    saveMarks: (id, input) =>
      access(true, async (ctx) => {
        const body = parse(workbookSaveMarksSchema, input);
        const current = await assignment(ctx, id, true);
        await ctx.policy.assertRoster(current.classId, [body.studentId], true);
        return idempotent(ctx, `save-marks:${id}`, body, async () => {
          const target = applyWorkbookMarks(current, body, {
            id: ctx.newId(),
            gradedAt: ctx.now(),
            gradedBy: ctx.actorId,
          });
          const previous = current.targets.find(
            (t) => t.studentId === body.studentId,
          )!;
          const event = target.history.at(-1)!;
          await ctx.store.appendGrade(id, body.studentId, event);
          for (const mark of body.marks) {
            // A second save of the same wrong state is history, not another original failure.
            if (
              mark.mark !== "wrong" ||
              previous.marks[mark.exerciseId] === "wrong"
            )
              continue;
            const exercise = current.exercises.find(
              (e) => e.id === mark.exerciseId,
            )!;
            await ctx.store.putNote({
              id: ctx.newId(),
              assignmentId: id,
              assignmentTitle: current.title,
              studentId: body.studentId,
              studentName: target.studentName,
              exerciseId: exercise.id,
              edition: current.edition,
              address: exercise.address,
              key: exercise.key,
              originalWrongEvent: {
                id: event.id,
                revision: event.revision,
                gradedAt: event.gradedAt,
                gradedBy: event.gradedBy,
              },
              latestMark: "wrong",
              correctionText: "",
              status: "todo",
              revision: 0,
              updatedAt: event.gradedAt,
            });
          }
          return {
            ...current,
            targets: current.targets.map((t) =>
              t.studentId === target.studentId ? target : t,
            ),
          };
        });
      }),
    listWrongNotes: (filter = {}) =>
      access(false, async (ctx) => {
        const body = parse(workbookWrongNoteFilterSchema, filter);
        // Explicit resource filters fail closed rather than disguising a forbidden resource as empty.
        if (body.assignmentId) await assignment(ctx, body.assignmentId);
        const rows = (await ctx.store.listNotes()).filter(
          (n) =>
            (!body.assignmentId || n.assignmentId === body.assignmentId) &&
            (!body.studentId || n.studentId === body.studentId),
        );
        const result: WorkbookWrongNote[] = [];
        for (const row of rows) {
          try {
            result.push(await note(ctx, row.id));
          } catch (error) {
            if (
              !(error instanceof CommercialWorkbookError) ||
              error.code !== "SCOPE_CHANGED"
            )
              throw error;
          }
        }
        return result;
      }),
    updateWrongNote: (id, input) =>
      access(true, async (ctx) => {
        const body = parse(workbookUpdateWrongNoteSchema, input);
        const current = await note(ctx, id, true);
        return idempotent(ctx, `update-note:${id}`, body, async () => {
          if (current.revision !== body.expectedRevision)
            fail(
              "STALE_REVISION",
              "오답 기록이 변경되었습니다. 다시 불러와 주세요.",
            );
          const result = {
            ...current,
            correctionText: body.correctionText,
            status: body.status,
            revision: current.revision + 1,
            updatedAt: ctx.now(),
          };
          await ctx.store.putNote(result);
          return result;
        });
      }),
    getWrongNotePrint: (input) =>
      access(false, async (ctx) => {
        const body = parse(workbookWrongNotePrintSchema, input);
        const notes = [];
        for (const id of body.noteIds) notes.push(await note(ctx, id));
        return {
          kind: "reference-only",
          generatedAt: ctx.now(),
          includesAnswers: body.includeAnswers,
          items: notes.map((n) => ({
            noteId: n.id,
            studentName: n.studentName,
            assignmentTitle: n.assignmentTitle,
            workbook: n.edition.metadata,
            keyRevision: n.edition.revision,
            address: n.address,
            correctionText: n.correctionText,
            status: n.status,
            ...(body.includeAnswers && n.key
              ? { answerText: n.key.answerText, keyStatus: n.key.status }
              : {}),
          })),
        };
      }),
  };
}
