/**
 * `GET|POST /api/learn/test-console` — 테스트 도구판(원장님 2026-09-28).
 *
 * 🔴 도구판 계정인지는 **여기서 DB 로** 다시 본다(관문은 경로만 연다). 아니면 404 — 있는지조차 말하지 않는다.
 * 첫 비밀번호 상태(`mustChangePassword`)에서도 연다: 도구판이 그 상태를 만들 수 있으니 되돌릴 길도 있어야 한다.
 * 쓰기는 전부 `changeSrsState`/`parseSrsState` 를 지나므로 계약을 어기는 값은 저장되지 않는다.
 */
import "server-only";

import { randomUUID } from "node:crypto";
import {
  testConsoleActionSchema,
  testConsoleResponseSchema,
  type TestConsoleAction,
  type TestConsoleState,
} from "@/contracts/testConsole.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { applyExplorerAction } from "@/lib/math-explorers/engine";
import { initialOwnedExplorer } from "@/lib/math-explorers/expedition";
import {
  CourseConflict,
  CourseInvalidInput,
  emptyCourseState,
  setCoursePlan,
} from "@/lib/math-srs/courseAutomation";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  parseSrsState,
  SrsConflict,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  changeSrsState,
  deleteSrsState,
  readSrsState,
  replaceSrsState,
} from "@/lib/math-srs/serverStore";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";

import {
  TEST_CLOCK_COOKIE,
  clockOffsetFromRequest,
  shiftedNow,
} from "@/lib/learn/testConsole";
import { testConsoleLoginId } from "@/lib/learn/testConsoleServer";

import { patchExplorerProfile, resetSrsPart } from "./testConsoleActions";

/** 도구판 입력이 계약(`parseSrsState`)에 안 맞을 때 — 학습 기록 손상(503)과 가른다. */
class ConsoleInvalid extends Error {}

const SECTIONS = COURSE_SECTIONS.map((s) => ({
  id: s.id,
  label: `초${s.grade}-${s.semester} ${s.chapterTitle} · ${s.title}`,
}));

function clockCookie(offsetDays: number, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const life = offsetDays === 0 ? "Max-Age=0" : "Max-Age=2592000";
  return `${TEST_CLOCK_COOKIE}=${offsetDays}; Path=/; ${life}; HttpOnly; SameSite=Lax${secure}`;
}

async function applyAction(
  studentId: string,
  action: TestConsoleAction,
  now: Date,
): Promise<string> {
  const save = (change: (state: StoredSrsState) => StoredSrsState) =>
    changeSrsState(studentId, change, undefined, undefined, {}, now);
  switch (action.type) {
    case "reset":
      if (action.part === "all") {
        await deleteSrsState(studentId);
        return "학습 기록을 모두 지웠습니다.";
      }
      await save((state) =>
        resetSrsPart(state, action.part as Exclude<typeof action.part, "all">),
      );
      return "선택한 기록을 지웠습니다.";
    case "clock":
      return action.offsetDays === 0
        ? "시계를 오늘로 되돌렸습니다."
        : `시계를 ${action.offsetDays > 0 ? "+" : ""}${action.offsetDays}일로 옮겼습니다.`;
    case "explorer":
      await save((state) => {
        let explorer = initialOwnedExplorer(state, studentId, now);
        if (
          action.grade !== undefined &&
          action.grade !== explorer.profile.grade
        ) {
          explorer = applyExplorerAction(
            explorer,
            { type: "course", grade: action.grade },
            kstDateOf(now),
            randomUUID(),
          ).state;
          explorer = {
            ...explorer,
            profile: { ...explorer.profile, grade: action.grade },
          };
        }
        explorer = patchExplorerProfile(explorer, action);
        return { ...state, explorers: explorer };
      });
      return "탐험 값을 바꿨습니다.";
    case "clear-mission":
      await save((state) =>
        state.expedition?.mission
          ? { ...state, expedition: { ...state.expedition, mission: null } }
          : state,
      );
      return "오늘 미션을 지웠습니다.";
    case "course":
      await save((state) => ({
        ...state,
        course: setCoursePlan(
          state.course ?? emptyCourseState(),
          {
            startSectionId: action.startSectionId,
            dailyQuestionCount: action.dailyQuestionCount,
            enabled: action.enabled,
            expectedRevision: 0,
          },
          now,
        ),
      }));
      return "코스 설정을 바꿨습니다.";
    case "restore":
      if (action.payload === null) {
        await deleteSrsState(studentId);
      } else {
        let payload: StoredSrsState;
        try {
          payload = parseSrsState(action.payload);
        } catch {
          throw new ConsoleInvalid(
            "저장해 둔 상태의 형식이 맞지 않아 되돌리지 않았습니다.",
          );
        }
        await replaceSrsState(studentId, payload);
      }
      return "저장해 둔 상태로 되돌렸습니다.";
    case "must-change-password":
      await db.studentAccount.update({
        where: { studentId },
        data: { mustChangePassword: true },
      });
      return "첫 로그인 상태로 바꿨습니다. 다음 화면에서 비밀번호 바꾸기가 나옵니다.";
    case "clear-lecture-views":
      await db.conceptLectureView.deleteMany({ where: { studentId } });
      return "강의 시청 기록을 지웠습니다.";
  }
}

async function consoleView(
  studentId: string,
  loginId: string,
  real: Date,
  offsetDays: number,
  message: string | null,
): Promise<TestConsoleState> {
  const [saved, student, lectureViews] = await Promise.all([
    readSrsState(studentId),
    db.student.findUnique({
      where: { id: studentId },
      select: { name: true, class: { select: { name: true } } },
    }),
    db.conceptLectureView.count({ where: { studentId } }),
  ]);
  const state = saved.state;
  const profile = state.explorers?.profile;
  const mission = state.expedition?.mission;
  const plan = state.course?.plan;
  return {
    loginId,
    studentName: student?.name ?? "",
    className: student?.class?.name ?? "",
    today: kstDateOf(shiftedNow(real, offsetDays)),
    realToday: kstDateOf(real),
    offsetDays,
    revision: saved.revision,
    explorer: profile
      ? {
          grade: profile.grade,
          stars: profile.stars,
          earned: profile.earned,
          level: profile.level,
          cards: Object.keys(profile.definitions?.cards ?? {}).length,
        }
      : null,
    mission: mission ? { status: mission.status, date: mission.date } : null,
    course: plan
      ? {
          startSectionId: plan.startSectionId,
          dailyQuestionCount: plan.dailyQuestionCount,
          enabled: plan.enabled,
        }
      : null,
    counts: {
      srsMissions: state.missions.length,
      completedDays: state.explorers?.completedDays.length ?? 0,
      expeditionTiles: state.expedition?.awards.length ?? 0,
      lectureViews,
    },
    sections: SECTIONS,
    payload: saved.revision === 0 ? null : state,
    message,
  };
}

export async function handleTestConsole(
  request: Request,
  operation: "read" | "action",
): Promise<Response> {
  const student = await getStudentSession();
  if (!student) return noStore(unauthorizedError());
  if (operation === "action" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  const studentId = student.studentId;
  const loginId = await testConsoleLoginId(studentId);
  if (!loginId) return noStore(notFoundError("테스트 도구판"));
  const real = new Date();
  let offsetDays = clockOffsetFromRequest(request);
  let message: string | null = null;
  let setClock: number | null = null;
  try {
    if (operation === "action") {
      const parsed = testConsoleActionSchema.safeParse(
        await request.json().catch(() => undefined),
      );
      if (!parsed.success) return noStore(validationError(parsed.error));
      const action = parsed.data;
      if (action.type === "clock") offsetDays = setClock = action.offsetDays;
      message = await applyAction(
        studentId,
        action,
        shiftedNow(real, offsetDays),
      );
    }
    const response = noStore(
      jsonOk(testConsoleResponseSchema, {
        data: await consoleView(studentId, loginId, real, offsetDays, message),
      }),
    );
    if (setClock !== null)
      response.headers.append("Set-Cookie", clockCookie(setClock, request));
    return response;
  } catch (error) {
    if (error instanceof CourseConflict || error instanceof SrsConflict)
      return noStore(jsonError("CONFLICT", error.message, 409));
    if (error instanceof CourseInvalidInput || error instanceof ConsoleInvalid)
      return noStore(jsonError("VALIDATION_ERROR", error.message, 400));
    return srsFailureResponse(error);
  }
}
