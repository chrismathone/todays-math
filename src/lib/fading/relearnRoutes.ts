import "server-only";
import {
  fadingRelearnActionResponseSchema,
  fadingRelearnActionSchema,
  fadingRelearnQueueResponseSchema,
} from "@/contracts/fadingRelearn.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import { changeFadingState, readSrsState } from "@/lib/math-srs/serverStore";
import { fadingConceptMap } from "./catalog";
import { fadingEnabled } from "./enabled";
import {
  applyFadingRelearnAction,
  fadingRelearnActionConceptId,
  fadingRelearnQueueView,
} from "./relearn";
import { fadingRelearnEnabled } from "./relearnEnabled";
import { fadingStudentHeaderResponse } from "./routes";
import { FadingConflict, emptyFading } from "./state";
import { fadingTrapsFor } from "./traps";

/**
 * 단기 재학습 대기열의 학생 라우트 (`GET · POST /api/learn/fading/relearn` · 계약 `fadingRelearn.contract.ts`).
 *
 * 다른 학생 라우트와 같은 문을 지난다 — 학생 세션(첫 비밀번호를 바꾼 학생) · 같은 사이트의 쓰기 · 살아 있는 계정.
 * 화면이 «이 학생의 것»이라고 실어 보낸 요청(`x-student-id`)은 지금 로그인한 학생과 같을 때만 받는다 — 같은 기기에서 학생이 바뀐 뒤
 * 앞 학생의 화면이 보낸 답이 새 학생의 대기열에 적히지 않게, 기록을 읽기도 전에 409 로 돌려보낸다.
 * 🔴 **시각은 서버가 정한다**(`learnNow` — 테스트 도구판의 시간 이동이 그대로 먹는다). 요청이 실어 보내는 시각은 없다.
 * 🔴 대기열은 **로그인한 학생의 기록 안**에 있다 — 요청에 학생을 가리키는 값이 없고, 다른 학생의 대기열에 닿는 길이 없다.
 * 🔴 저장은 `changeFadingState` 하나로만 한다 — `fading` 칸만 revision 을 견주어 쓰고, 옛 탐험 · 하루 여정의 갱신을 지나지 않는다.
 *    규칙(`relearn.ts`)은 그 칸에서도 `relearn` 만 바꾼다. 장기 일정의 값은 읽기만 한다.
 * 쓰는 길의 문(`MATH_FADING_RELEARN`)이 닫혀 있으면 읽기는 «꺼짐 · 빈 대기열»이고(학생 기록을 읽지 않는다) 행동은 404 다.
 */

async function enter(request: Request, mutation: boolean) {
  if (!fadingEnabled())
    return { response: noStore(notFoundError("주소")) } as const;
  const gate = await requireStudent({ active: true });
  if (gate.response) return { response: noStore(gate.response) } as const;
  if (mutation && !sameOriginMutation(request))
    return { response: noStore(crossSiteError()) } as const;
  // 학생이 바뀐 요청은 본 라우트와 같은 문(`STUDENT_CHANGED` · D1 ② 스위치까지)으로 돌려보낸다 — 머리의 이름도 같다.
  const changed = fadingStudentHeaderResponse(request, gate.student.studentId);
  if (changed) return { response: changed } as const;
  const student = await loadCourseStudent(gate.student.studentId);
  if (!student?.studentAccount || student.studentAccount.disabledAt)
    return { response: noStore(unauthorizedError()) } as const;
  const now = await learnNow(student.id, request);
  return { response: null, student, now: now.getTime() } as const;
}

function failure(error: unknown): Response {
  if (error instanceof FadingConflict)
    return noStore(jsonError("CONFLICT", error.message, 409));
  return srsFailureResponse(error);
}

/** GET · POST /api/learn/fading/relearn — 대기열을 읽거나, 행동 하나를 적용하고 대기열과 그 결과를 돌려준다. */
export async function handleFadingRelearnRequest(
  request: Request,
  operation: "read" | "action",
): Promise<Response> {
  const gate = await enter(request, operation === "action");
  if (gate.response) return gate.response;
  const { student, now } = gate;
  const open = fadingRelearnEnabled();
  try {
    if (operation === "read") {
      // 닫혀 있으면 학생 기록을 읽지 않는다 — 빈 대기열과 «꺼짐»만 답한다.
      const fading = open
        ? ((await readSrsState(student.id)).state.fading ?? emptyFading())
        : emptyFading();
      return noStore(
        jsonOk(fadingRelearnQueueResponseSchema, {
          data: fadingRelearnQueueView({
            fading,
            concepts: open ? fadingConceptMap() : new Map(),
            now,
            trapsOf: fadingTrapsFor,
            enabled: open,
          }),
        }),
      );
    }
    if (!open) return noStore(notFoundError("주소"));
    const parsed = fadingRelearnActionSchema.safeParse(
      await request.json().catch(() => undefined),
    );
    if (!parsed.success) return noStore(validationError(parsed.error));
    const action = parsed.data;
    const concepts = fadingConceptMap();
    const concept = concepts.get(fadingRelearnActionConceptId(action));
    if (!concept) return noStore(notFoundError("개념"));
    const traps = fadingTrapsFor(concept);
    // 저장이 다시 시도되면 새 기록 위에 다시 적용된다 — 마지막으로 적용한 것이 저장된 것이다.
    const held: { done?: ReturnType<typeof applyFadingRelearnAction> } = {};
    const saved = await changeFadingState(student.id, (fading) => {
      held.done = applyFadingRelearnAction(fading, action, concept, now, traps);
      return held.done.fading;
    });
    return noStore(
      jsonOk(fadingRelearnActionResponseSchema, {
        data: {
          queue: fadingRelearnQueueView({
            fading: saved.state.fading ?? emptyFading(),
            concepts,
            now,
            trapsOf: fadingTrapsFor,
          }),
          applied: held.done!.applied,
          result: held.done!.result,
        },
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
