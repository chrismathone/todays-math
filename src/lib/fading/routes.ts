import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { fadingConceptIdSchema } from "@/contracts/fading.contract";
import {
  fadingActionSchema,
  fadingCatalogResponseSchema,
  fadingConceptResponseSchema,
  fadingGradeSchema,
  fadingStateResponseSchema,
} from "@/contracts/fadingApi.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { kstDateOf } from "@/lib/kstDate";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import { changeFadingState, readSrsState } from "@/lib/math-srs/serverStore";
import {
  applyFadingAction,
  fadingActionConceptId,
  fadingActionNeedsConcept,
} from "./actions";
import { fadingCatalog, fadingConceptMap, fadingFigureOf } from "./catalog";
import { fadingCardsEnabled, fadingEnabled } from "./enabled";
import { FadingConflict, emptyFading } from "./state";
import { fadingTrapsFor } from "./traps";
import {
  fadingCatalogView,
  fadingConceptStatus,
  fadingDefaultGrade,
  fadingGrades,
  fadingStateView,
} from "./view";

/**
 * «오늘의 기억» 학생 라우트 (`docs/planning/srs-overhaul-20261006.md` §14 · 계약 `fadingApi.contract.ts`).
 *
 * 다른 학생 라우트와 같은 문을 지난다 — 학생 세션(첫 비밀번호를 바꾼 학생) · 같은 사이트의 쓰기 · 살아 있는 계정 · 서버가 정하는 «오늘».
 * 🔴 저장은 `changeFadingState` 하나로만 한다 — 새 칸만 쓰고, 옛 탐험 · 하루 여정의 갱신을 지나지 않는다.
 * 문(`MATH_FADING`)이 꺼져 있으면 네 길이 전부 404 다(학생 기록을 읽지도 않는다).
 */

async function enter(request: Request, mutation: boolean) {
  if (!fadingEnabled())
    return { response: noStore(notFoundError("주소")) } as const;
  const gate = await requireStudent({ active: true });
  if (gate.response) return { response: noStore(gate.response) } as const;
  if (mutation && !sameOriginMutation(request))
    return { response: noStore(crossSiteError()) } as const;
  const student = await loadCourseStudent(gate.student.studentId);
  if (!student?.studentAccount || student.studentAccount.disabledAt)
    return { response: noStore(unauthorizedError()) } as const;
  const now = await learnNow(student.id, request);
  return { response: null, student, today: kstDateOf(now) } as const;
}

function failure(error: unknown): Response {
  if (error instanceof FadingConflict)
    return noStore(jsonError("CONFLICT", error.message, 409));
  return srsFailureResponse(error);
}

/** GET · POST /api/learn/fading — 상태를 읽거나, 행동 하나를 적용하고 같은 꼴의 상태를 돌려준다. */
export async function handleFadingRequest(
  request: Request,
  operation: "read" | "action",
): Promise<Response> {
  const gate = await enter(request, operation === "action");
  if (gate.response) return gate.response;
  const { student, today } = gate;
  try {
    const concepts = fadingConceptMap();
    const cards = fadingCardsEnabled();
    let saved: Awaited<ReturnType<typeof readSrsState>>;
    let requestId: string | undefined;
    if (operation === "read") saved = await readSrsState(student.id);
    else {
      const parsed = fadingActionSchema.safeParse(
        await request.json().catch(() => undefined),
      );
      if (!parsed.success) return noStore(validationError(parsed.error));
      const action = parsed.data;
      const conceptId = fadingActionConceptId(action);
      const concept = conceptId === null ? undefined : concepts.get(conceptId);
      // 은행에 없는 개념은 고를 수도 풀 수도 없다. 빼는 것만 된다 — 은행에서 사라진 개념의 기록을 치울 길이다.
      if (fadingActionNeedsConcept(action) && !concept)
        return noStore(notFoundError("개념"));
      // 번호와 씨앗은 여기서 한 번 — 저장이 다시 시도돼도 같은 값이 들어간다.
      const fresh = { sessionId: randomUUID(), seed: randomInt(0x7fff_ffff) };
      if (action.action === "rate") requestId = action.requestId;
      saved = await changeFadingState(student.id, (fading) =>
        applyFadingAction(
          fading,
          action,
          concept,
          today,
          fresh,
          concept ? fadingTrapsFor(concept) : [],
          { cards },
        ),
      );
    }
    return noStore(
      jsonOk(fadingStateResponseSchema, {
        data: fadingStateView({
          fading: saved.state.fading ?? emptyFading(),
          revision: saved.revision,
          today,
          concepts,
          requestId,
          trapsOf: fadingTrapsFor,
          figureOf: fadingFigureOf,
          cards,
        }),
      }),
    );
  } catch (error) {
    return failure(error);
  }
}

/** GET /api/learn/fading/catalog?grade= — 개념 목록(학년 하나). 학년을 안 주면 그 학생에게 맞는 학년이다. */
export async function handleFadingCatalogRequest(
  request: Request,
): Promise<Response> {
  const gate = await enter(request, false);
  if (gate.response) return gate.response;
  const { student, today } = gate;
  try {
    const all = fadingCatalog();
    const grades = fadingGrades(all);
    const asked = new URL(request.url).searchParams.get("grade");
    const saved = await readSrsState(student.id);
    let grade: string;
    if (asked === null) {
      const explorer = saved.state.explorers?.profile;
      grade = fadingDefaultGrade(grades, {
        explorerGrade: explorer?.definitions?.courseGrade ?? explorer?.grade,
        classGrade: student.class.grade,
      });
    } else {
      const parsed = fadingGradeSchema.safeParse(asked);
      if (!parsed.success) return noStore(validationError(parsed.error));
      if (!grades.includes(parsed.data))
        return noStore(
          jsonError("VALIDATION_ERROR", "개념이 없는 학년입니다.", 400),
        );
      grade = parsed.data;
    }
    return noStore(
      jsonOk(fadingCatalogResponseSchema, {
        data: fadingCatalogView({
          grade,
          concepts: all,
          fading: saved.state.fading ?? emptyFading(),
          today,
        }),
      }),
    );
  } catch (error) {
    return failure(error);
  }
}

/** GET /api/learn/fading/concepts/{id} — 개념 하나의 내용과 내 상태(읽기 · 복습일 전의 연습). */
export async function handleFadingConceptRequest(
  request: Request,
  id: string,
): Promise<Response> {
  const gate = await enter(request, false);
  if (gate.response) return gate.response;
  const { student, today } = gate;
  try {
    const parsed = fadingConceptIdSchema.safeParse(id);
    if (!parsed.success) return noStore(validationError(parsed.error));
    const concept = fadingConceptMap().get(parsed.data);
    if (!concept) return noStore(notFoundError("개념"));
    const stored = (await readSrsState(student.id)).state.fading?.concepts[
      concept.id
    ];
    return noStore(
      jsonOk(fadingConceptResponseSchema, {
        data: {
          content: {
            concept,
            traps: fadingTrapsFor(concept),
            figure: fadingFigureOf(concept),
          },
          status: stored ? fadingConceptStatus(concept, stored, today) : null,
          ...(fadingCardsEnabled() ? { mode: "cards" as const } : {}),
        },
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
