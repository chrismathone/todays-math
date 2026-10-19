import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  COURSE_FOLLOW_UP_HEADER,
  courseAttemptInputSchema,
  courseFollowUpInputSchema,
  courseHintInputSchema,
  coursePlanInputSchema,
  courseStudentResponseSchema,
} from "@/contracts/mathSrsCourse.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import {
  CourseConflict,
  CourseInvalidInput,
  emptyCourseState,
  findStoredCourseSession,
  revealCourseHint,
  setCoursePlan,
  startRecommendedCourse,
  submitCourseAttempt,
  submitCourseFollowUp,
  type StoredCourse,
} from "./courseAutomation";
import { loadCourseBankCandidates } from "./courseBank";
import { withDefaultCoursePlan } from "./defaultCoursePlan";
import { courseStudentDto, loadCourseStudent } from "./courseServer";
import { SrsUnavailable } from "./serverState";
import { changeSrsState, readSrsState } from "./serverStore";
import { srsFailureResponse } from "./serverRoutes";
import {
  expeditionCourseRecommendation,
  expeditionCoursePrerequisiteDecision,
} from "@/lib/math-explorers/expedition";
import { requestIdAllocator } from "@/lib/math-prerequisite/requestIds";
import type { StoredSrsState } from "./serverState";

export function courseFailureResponse(error: unknown) {
  if (error instanceof CourseConflict)
    return noStore(jsonError("CONFLICT", error.message, 409));
  if (error instanceof CourseInvalidInput)
    return noStore(jsonError("VALIDATION_ERROR", error.message, 400));
  return srsFailureResponse(error);
}

export async function handleCourseStudentRequest(
  request: Request,
  operation: "read" | "start" | "plan" | "attempt" | "hint" | "follow-up",
) {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  if (operation !== "read" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  const now = await learnNow(gate.student.studentId, request);
  // Screens that show «한 번 더 → 풀이» say so; older tabs keep the old records and response.
  const followUps = request.headers.get(COURSE_FOLLOW_UP_HEADER) === "1";
  try {
    const student = await loadCourseStudent(gate.student.studentId);
    if (
      !student ||
      !student.studentAccount ||
      student.studentAccount.disabledAt
    )
      return noStore(unauthorizedError());
    let saved;
    let requestedSessionId: string | undefined;
    if (operation === "read") saved = await readSrsState(student.id);
    else {
      const body = await request.json().catch(() => undefined);
      let change: (course: StoredCourse, state: StoredSrsState) => StoredCourse;
      let expectedRevision: number | undefined;
      if (operation === "plan") {
        const parsed = coursePlanInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        expectedRevision = parsed.data.expectedRevision;
        change = (c) => setCoursePlan(c, parsed.data, now);
      } else if (operation === "start") {
        const parsed = z.strictObject({}).safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        const seed = randomInt(0, 0x1_0000_0000);
        const current = withDefaultCoursePlan(
          (await readSrsState(student.id)).state,
          student.class.grade,
          now,
        );
        const recommended = expeditionCourseRecommendation(current, now);
        const supplied = expeditionCoursePrerequisiteDecision(current, now);
        const bankSectionId =
          supplied || recommended?.mode === "resume"
            ? null
            : recommended?.sectionId;
        const bankCandidates = bankSectionId
          ? await loadCourseBankCandidates(bankSectionId)
          : [];
        const idAttempt = requestIdAllocator(randomUUID);
        change = (c, state) => {
          const decision = expeditionCoursePrerequisiteDecision(state, now);
          return startRecommendedCourse(
            c,
            expeditionCourseRecommendation(state, now),
            now,
            seed,
            idAttempt(),
            expeditionCourseRecommendation(state, now)?.sectionId ===
              bankSectionId
              ? bankCandidates
              : [],
            decision?.session ?? undefined,
          );
        };
      } else if (operation === "hint") {
        const parsed = courseHintInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        requestedSessionId = parsed.data.sessionId;
        change = (c) => revealCourseHint(c, parsed.data);
      } else if (operation === "follow-up") {
        const parsed = courseFollowUpInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        requestedSessionId = parsed.data.sessionId;
        change = (c) => submitCourseFollowUp(c, parsed.data, now);
      } else {
        const parsed = courseAttemptInputSchema.safeParse(body);
        if (!parsed.success) return noStore(validationError(parsed.error));
        requestedSessionId = parsed.data.sessionId;
        change = (c) => submitCourseAttempt(c, parsed.data, now, { followUps });
      }
      saved = await changeSrsState(
        student.id,
        (stored) => {
          // Only a start may keep the class grade's default plan; it re-runs on the latest state.
          const state =
            operation === "start"
              ? withDefaultCoursePlan(stored, student.class.grade, now)
              : stored;
          const previous = state.course ?? emptyCourseState();
          const course = change(previous, state);
          return course === previous ? stored : { ...state, course };
        },
        undefined,
        expectedRevision,
        {},
        now,
      );
    }
    const view = {
      ...saved,
      state: withDefaultCoursePlan(saved.state, student.class.grade, now),
    };
    return noStore(
      jsonOk(courseStudentResponseSchema, {
        data: courseStudentDto(student, view, now, requestedSessionId, {
          followUp: followUps,
        }),
      }),
    );
  } catch (error) {
    return courseFailureResponse(error);
  }
}

export async function handleCourseFigure(request: Request) {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  const parsed = courseHintInputSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return noStore(validationError(parsed.error));
  try {
    const student = await loadCourseStudent(gate.student.studentId);
    if (
      !student ||
      !student.studentAccount ||
      student.studentAccount.disabledAt
    )
      return noStore(unauthorizedError());
    const saved = await readSrsState(student.id);
    const session =
      saved.state.course &&
      findStoredCourseSession(saved.state.course, parsed.data.sessionId);
    const problem = session?.problems.find(
      (p) => p.id === parsed.data.problemId,
    );
    if (!problem?.figureSpec) return noStore(notFoundError("문제 그림"));
    const rendered = await renderFigureSpec(problem.figureSpec, {
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
  } catch (error) {
    return courseFailureResponse(error);
  }
}
