import "server-only";
import {
  guideChoiceInputSchema,
  guideResponseSchema,
} from "@/contracts/mathSrsGuide.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { loadCourseStudent } from "./courseServer";
import { chooseGuide } from "./guide";
import { srsFailureResponse } from "./serverRoutes";
import { changeSrsState, readSrsState } from "./serverStore";

/** The student's own guide (plan §2 decision 10): read it, or choose one any time. */
export async function handleGuideRequest(
  request: Request,
  operation: "read" | "choose",
): Promise<Response> {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  if (operation === "choose" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  const now = await learnNow(gate.student.studentId, request);
  try {
    const student = await loadCourseStudent(gate.student.studentId);
    if (
      !student ||
      !student.studentAccount ||
      student.studentAccount.disabledAt
    )
      return noStore(unauthorizedError());
    let saved;
    if (operation === "read") saved = await readSrsState(student.id);
    else {
      const body = await request.json().catch(() => undefined);
      const parsed = guideChoiceInputSchema.safeParse(body);
      if (!parsed.success) return noStore(validationError(parsed.error));
      saved = await changeSrsState(
        student.id,
        (state) => chooseGuide(state, parsed.data.guideId, now),
        undefined,
        undefined,
        {},
        now,
      );
    }
    return noStore(
      jsonOk(guideResponseSchema, {
        data: { guide: saved.state.guide ?? null },
      }),
    );
  } catch (error) {
    return srsFailureResponse(error);
  }
}
