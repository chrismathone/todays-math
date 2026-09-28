import "server-only";
import {
  mathSrsReplayQuerySchema,
  mathSrsReplayResponseSchema,
  mathSrsReplaySubmitInputSchema,
  type MathSrsReplaySubmitInput,
} from "@/contracts/mathSrsReplay.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { courseFailureResponse } from "./courseRoutes";
import { loadCourseStudent } from "./courseServer";
import { replayFigureSpec, replayProblem } from "./replay";
import { changeSrsState, readSrsState } from "./serverStore";
import { recordSrsRetry, SrsUnavailable } from "./serverState";
import { CourseInvalidInput } from "./courseAutomation";
import { dailyJourneyDto } from "./dailyJourney";

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
    const now = await learnNow(gate.student.studentId, request);
    let saved = await readSrsState(gate.student.studentId);
    const { kind, step } = target;
    if (input?.recordRetry) {
      if (
        kind !== "middle" ||
        !input.missionId ||
        input.dayId ||
        input.revealSolution
      )
        throw new CourseInvalidInput("오답 재풀이 요청을 확인해 주세요.");
      const retry = input;
      saved = await changeSrsState(
        gate.student.studentId,
        (state) => {
          replayProblem(state, kind, step, now, retry);
          return recordSrsRetry(
            state,
            retry.missionId!,
            retry.problemId,
            retry.submittedAnswer,
            now,
          );
        },
        undefined,
        undefined,
        {},
        now,
      );
    }
    if ("figure" in target && target.figure === "true") {
      if (!target.dayId)
        throw new CourseInvalidInput("복습할 학습 일차를 선택해 주세요.");
      const figure = replayFigureSpec(
        saved.state,
        kind,
        step,
        target.dayId,
        now,
      );
      if (!figure) return noStore(notFoundError("문제 그림"));
      const rendered = await renderFigureSpec(figure, {
        signal: request.signal,
      });
      if (!rendered.ok)
        throw new SrsUnavailable(
          "문제 그림을 불러오지 못했습니다. 다시 시도해 주세요.",
        );
      return noStore(
        new Response(rendered.svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          },
        }),
      );
    }
    return noStore(
      jsonOk(mathSrsReplayResponseSchema, {
        data: {
          ...replayProblem(saved.state, kind, step, now, input, target.dayId),
          ...(input?.recordRetry
            ? { journey: dailyJourneyDto(saved.state, "middle", now) }
            : {}),
        },
      }),
    );
  } catch (error) {
    return courseFailureResponse(error);
  }
}
