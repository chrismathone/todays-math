import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import {
  mathSrsAttemptInputSchema,
  mathSrsHintInputSchema,
  mathSrsStartSchema,
  mathSrsStateResponseSchema,
} from "@/contracts/mathSrs.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { loadSrsStudentContext } from "./serverContext";
import { srsStateDto } from "./serverDto";
import {
  changeSrsState,
  isMissingSrsStorage,
  readSrsState,
} from "./serverStore";
import {
  revealSrsHint,
  SrsConflict,
  SrsUnavailable,
  startSrsMission,
  submitSrsAttempt,
} from "./serverState";

export function srsFailureResponse(error: unknown): Response {
  if (error instanceof SrsConflict)
    return noStore(jsonError("CONFLICT", error.message, 409));
  if (error instanceof SrsUnavailable || isMissingSrsStorage(error))
    return noStore(
      jsonError(
        "INTERNAL_ERROR",
        error instanceof SrsUnavailable
          ? error.message
          : "학생 학습 기록 저장소를 준비 중입니다. 선생님께 알려 주세요.",
        503,
      ),
    );
  throw error;
}

export async function handleSrsStudentRequest(
  request: Request,
  operation: "read" | "start" | "attempt" | "hint",
): Promise<Response> {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  if (operation !== "read" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  const now = new Date();
  try {
    const context = await loadSrsStudentContext(gate.student.studentId, now);
    if (!context) return noStore(unauthorizedError());
    const studentId = gate.student.studentId;
    let saved;
    let requestedMissionId: string | undefined;
    if (operation === "read") saved = await readSrsState(studentId);
    else {
      const body = await request.json().catch(() => undefined);
      if (operation === "start") {
        const parsed = mathSrsStartSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        const seed = randomInt(0, 0x1_0000_0000);
        saved = await changeSrsState(studentId, (state) =>
          startSrsMission(state, studentId, now, seed, randomUUID),
        );
      } else if (operation === "hint") {
        const parsed = mathSrsHintInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        requestedMissionId = parsed.data.missionId;
        saved = await changeSrsState(studentId, (state) =>
          revealSrsHint(state, parsed.data),
        );
      } else {
        const parsed = mathSrsAttemptInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        requestedMissionId = parsed.data.missionId;
        saved = await changeSrsState(studentId, (state) =>
          submitSrsAttempt(state, studentId, parsed.data, now),
        );
      }
    }
    return noStore(
      jsonOk(mathSrsStateResponseSchema, {
        data: srsStateDto(context, saved, now, requestedMissionId),
      }),
    );
  } catch (error) {
    return srsFailureResponse(error);
  }
}
