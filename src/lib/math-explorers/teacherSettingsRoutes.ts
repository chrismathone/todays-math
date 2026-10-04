import "server-only";
import { randomUUID } from "node:crypto";
import { idParamSchema } from "@/contracts/common.contract";
import {
  explorerSettingsInputSchema,
  explorerSettingsResponseSchema,
} from "@/contracts/mathExplorerSettings.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import {
  assertClassWrite,
  assertStudentEnrollment,
  ClassAccessDenied,
} from "@/lib/classAccess";
import { db } from "@/lib/db";
import { noStore } from "@/lib/learn/accountRoutes";
import {
  requireOwnedStudent,
  requireOwnedStudentInClass,
} from "@/lib/ownership";
import { recordAudit } from "@/lib/audit";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import {
  changeSrsState,
  readSrsState,
  srsStateTable,
  type SrsStateTable,
} from "@/lib/math-srs/serverStore";
import {
  assertTeacherBranch,
  requireTeacherBranch,
  teacherScopeSchema,
} from "@/lib/math-srs/teacherScope";
import { ExplorerActionInvalid } from "./engine";
import {
  applyExplorerTeacherSettings,
  explorerSettingsDto,
} from "./teacherSettings";

export async function handleExplorerTeacherSettings(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAccount(request, false, true);
  if (access.response) return noStore(access.response);
  const parsed = idParamSchema.safeParse(await context.params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const scope = teacherScopeSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!scope.success) return noStore(validationError(scope.error));
  const capability =
    request.method === "GET" ? "progress:read" : "progress:write";
  const owned = scope.data.classId
    ? await requireOwnedStudentInClass(
        parsed.data.id,
        scope.data.classId,
        access.account,
        capability,
      )
    : await requireOwnedStudent(parsed.data.id, access.account, capability);
  if (!owned.ok) return noStore(owned.response);
  try {
    const branchDenied = await requireTeacherBranch(
      owned.data.classId,
      scope.data.branchId,
    );
    if (branchDenied) return noStore(branchDenied);
    const now = new Date();
    let saved;
    if (request.method === "GET") saved = await readSrsState(parsed.data.id);
    else {
      const input = explorerSettingsInputSchema.safeParse(
        await request.json().catch(() => undefined),
      );
      if (!input.success) return noStore(validationError(input.error));
      const guardedTable: SrsStateTable = {
        ...srsStateTable(),
        create: (args) =>
          db.$transaction(async (tx) => {
            await assertClassWrite(
              tx,
              access.account,
              owned.data.classId,
              "progress:write",
            );
            await assertStudentEnrollment(
              tx,
              parsed.data.id,
              owned.data.classId,
            );
            await assertTeacherBranch(
              tx,
              owned.data.classId,
              scope.data.branchId,
            );
            return (tx.studentSrsState as unknown as SrsStateTable).create(
              args,
            );
          }),
        updateMany: (args) =>
          db.$transaction(async (tx) => {
            await assertClassWrite(
              tx,
              access.account,
              owned.data.classId,
              "progress:write",
            );
            await assertStudentEnrollment(
              tx,
              parsed.data.id,
              owned.data.classId,
            );
            await assertTeacherBranch(
              tx,
              owned.data.classId,
              scope.data.branchId,
            );
            return (tx.studentSrsState as unknown as SrsStateTable).updateMany(
              args,
            );
          }),
      };
      const requestIds: [string, string] = [randomUUID(), randomUUID()];
      let changed = false;
      saved = await changeSrsState(
        parsed.data.id,
        (state) => {
          const next = applyExplorerTeacherSettings(
            state,
            parsed.data.id,
            input.data,
            now,
            requestIds,
          );
          changed = next !== state;
          return next;
        },
        guardedTable,
        input.data.expectedRevision,
        {},
        now,
      );
      if (changed)
        await recordAudit({
          actorId: access.account.id,
          action: "math_explorers.settings_changed",
          outcome: "success",
          details: {
            studentId: parsed.data.id,
            classId: owned.data.classId,
            branchId: scope.data.branchId ?? null,
            courseGrade: input.data.courseGrade,
            goalUnitId: input.data.goalUnitId,
            revision: saved.revision,
          },
        });
    }
    return noStore(
      jsonOk(explorerSettingsResponseSchema, {
        data: explorerSettingsDto(
          saved.state,
          saved.revision,
          parsed.data.id,
          now,
        ),
      }),
    );
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return noStore(jsonError("FORBIDDEN", error.message, 403));
    if (error instanceof ExplorerActionInvalid)
      return noStore(jsonError("VALIDATION_ERROR", error.message, 400));
    return srsFailureResponse(error);
  }
}
