import "server-only";
import {
  mathSrsReplayQuerySchema,
  mathSrsReplayResponseSchema,
  mathSrsReplaySubmitInputSchema,
  type MathSrsReplaySubmitInput,
} from "@/contracts/mathSrsReplay.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { courseFailureResponse } from "./courseRoutes";
import { loadCourseStudent } from "./courseServer";
import { replayProblem } from "./replay";
import { readSrsState } from "./serverStore";

export async function handleReplayRequest(
  request: Request,
  operation: "read" | "grade",
): Promise<Response> {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  if (operation === "grade" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  let input: MathSrsReplaySubmitInput | undefined;
  let target;
  if (operation === "read") {
    const parsed = mathSrsReplayQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) return noStore(validationError(parsed.error));
    target = parsed.data;
  } else {
    const parsed = mathSrsReplaySubmitInputSchema.safeParse(
      await request.json().catch(() => undefined),
    );
    if (!parsed.success) return noStore(validationError(parsed.error));
    target = input = parsed.data;
  }
  try {
    const student = await loadCourseStudent(gate.student.studentId);
    if (!student?.studentAccount || student.studentAccount.disabledAt)
      return noStore(unauthorizedError());
    const saved = await readSrsState(gate.student.studentId);
    const { kind, step } = target;
    return noStore(
      jsonOk(mathSrsReplayResponseSchema, {
        data: replayProblem(saved.state, kind, step, new Date(), input),
      }),
    );
  } catch (error) {
    return courseFailureResponse(error);
  }
}
