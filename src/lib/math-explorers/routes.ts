import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import {
  explorerRequestSchema,
  explorerStateSchema,
  type ExplorerFeedback,
  type ExplorerRequest,
  type StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import { dataResponseSchema } from "@/contracts/common.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { kstDateOf } from "@/lib/kstDate";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
import { learnNow } from "@/lib/learn/testConsoleServer";
import { loadCourseStudent } from "@/lib/math-srs/courseServer";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";
import {
  SrsConflict,
  SrsUnavailable,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { changeSrsState, readSrsState } from "@/lib/math-srs/serverStore";
import {
  applyExplorerAction,
  ExplorerActionConflict,
  ExplorerActionInvalid,
  explorerReceipt,
  explorerView,
} from "./engine";
import { expeditionJourney } from "./expeditionJourney";
import {
  expeditionDto,
  expeditionMissionOpen,
  expeditionStartDuplicate,
  initialOwnedExplorer,
  planExpedition,
} from "./expedition";
import { isSupplementAction } from "./supplement";
import {
  expeditionInitialCourseRecommendation,
  startExpedition,
} from "./expeditionStart";
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";
import { withDefaultCoursePlan } from "@/lib/math-srs/defaultCoursePlan";
import { requestIdAllocator } from "@/lib/math-prerequisite/requestIds";
import { expeditionInitialPrerequisiteDecision } from "./expeditionStart";

const responseSchema = dataResponseSchema(explorerStateSchema);

function ownedExplorer(
  state: StoredSrsState,
  studentId: string,
  now: Date,
): StoredExplorer {
  const explorer = initialOwnedExplorer(state, studentId, now);
  if (explorer.profile.id !== studentId)
    throw new SrsUnavailable(
      "저장된 개념 탐험 기록을 확인해야 합니다. 선생님께 알려 주세요.",
    );
  return explorer;
}

/** A repeated request returns its receipt, even if the response was lost before a reload. */
async function changeExplorer(
  studentId: string,
  input: ExplorerRequest,
  now: Date,
  classGrade: string | null | undefined,
) {
  const date = kstDateOf(now);
  const expeditionStart = input.action.type === "expedition-start";
  const duplicateStart = (state: StoredSrsState) => {
    if (expeditionStart)
      return expeditionStartDuplicate(state, input.requestId);
    if (state.expedition?.receipts.some((r) => r.requestId === input.requestId))
      throw new SrsConflict("같은 요청 번호로 다른 학습을 요청할 수 없어요.");
    return false;
  };
  const startFeedback = { message: "오늘의 탐험을 이어가요." };
  let recommendation: ReturnType<
    typeof expeditionInitialCourseRecommendation
  > | null = null;
  let candidates: Awaited<ReturnType<typeof loadCourseBankCandidates>> = [];
  // Only a start reads first: its plan loads bank candidates outside the save.
  // Other actions (a chest press) go straight to the revision-checked save — the
  // engine replays its own receipt there, and a stale revision falls back to the
  // committed receipt below, so the extra read of the state row is not needed.
  if (expeditionStart) {
    const previous = await readSrsState(studentId);
    ownedExplorer(previous.state, studentId, now);
    if (duplicateStart(previous.state))
      return { ...previous, feedback: startFeedback };
    const receipt = explorerReceipt(
      ownedExplorer(previous.state, studentId, now),
      input.action,
      input.requestId,
    );
    if (receipt) return { ...previous, feedback: receipt };
    // Bank candidates are chosen here, outside the save — from the same seeded state the save starts from.
    const seeded = withDefaultCoursePlan(previous.state, classGrade, now);
    const plan = planExpedition(seeded, studentId, now);
    recommendation =
      plan.kind === "elementary"
        ? expeditionInitialCourseRecommendation(seeded, plan, now)
        : null;
    const prerequisite = expeditionInitialPrerequisiteDecision(
      seeded,
      plan,
      now,
    );
    if (recommendation && recommendation.mode !== "resume" && !prerequisite)
      candidates = await loadCourseBankCandidates(recommendation.sectionId);
  }
  const seed = randomInt(0, 0x1_0000_0000);
  const idAttempt = requestIdAllocator(randomUUID);
  let feedback: ExplorerFeedback | null = null;
  try {
    const saved = await changeSrsState(
      studentId,
      (stored) => {
        // Re-run on the latest state: a plan a teacher saved meanwhile is kept.
        const state = withDefaultCoursePlan(stored, classGrade, now);
        if (expeditionStart) {
          feedback = startFeedback;
          return startExpedition(
            state,
            studentId,
            now,
            input.requestId,
            seed,
            idAttempt(),
            recommendation
              ? { sectionId: recommendation.sectionId, candidates }
              : null,
          );
        }
        duplicateStart(state);
        // 보충 카드(D-147) — 오늘의 탐험 미션이 열린 동안(은행 날 포함)은 시작 · 이어서 · 뜻 읽기 · 답을 받지 않는다.
        // 이미 푸는 장을 다시 «시작»하면 저장이 안 바뀌어 문지기(updateExpedition)를 지나 조용히 200 이 되던 구멍(E2).
        if (
          isSupplementAction(input.action) &&
          input.action.type !== "supplement-solution" &&
          expeditionMissionOpen(state)
        )
          throw new ExplorerActionConflict(
            "오늘의 탐험을 마친 뒤 해 볼 수 있어요.",
          );
        const result = applyExplorerAction(
          ownedExplorer(state, studentId, now),
          input.action,
          date,
          input.requestId,
        );
        feedback = result.feedback;
        return result.duplicate
          ? stored
          : { ...state, explorers: result.state };
      },
      undefined,
      input.expectedRevision,
      {},
      now,
    );
    return { ...saved, feedback };
  } catch (error) {
    if (!(error instanceof SrsConflict)) throw error;
    // Two tabs can submit the very same click while the first is being saved.
    // Only its exact committed receipt may bypass the stale revision check.
    const latest = await readSrsState(studentId);
    if (duplicateStart(latest.state))
      return { ...latest, feedback: startFeedback };
    const duplicate = explorerReceipt(
      ownedExplorer(latest.state, studentId, now),
      input.action,
      input.requestId,
    );
    if (duplicate) return { ...latest, feedback: duplicate };
    throw error;
  }
}

export async function handleExplorerRequest(
  request: Request,
  operation: "read" | "action",
): Promise<Response> {
  const gate = await requireStudent({ active: true });
  if (gate.response) return noStore(gate.response);
  if (operation === "action" && !sameOriginMutation(request))
    return noStore(crossSiteError());
  try {
    const studentId = gate.student.studentId;
    const student = await loadCourseStudent(studentId);
    if (!student?.studentAccount || student.studentAccount.disabledAt)
      return noStore(unauthorizedError());
    const now = await learnNow(studentId, request);
    const date = kstDateOf(now);
    let saved: Awaited<ReturnType<typeof readSrsState>>;
    let feedback: ExplorerFeedback | null = null;
    if (operation === "read") saved = await readSrsState(studentId);
    else {
      const parsed = explorerRequestSchema.safeParse(
        await request.json().catch(() => undefined),
      );
      if (!parsed.success) return noStore(validationError(parsed.error));
      if (parsed.data.studentId !== studentId)
        return noStore(jsonError("CONFLICT", STUDENT_CHANGED_MESSAGE, 409));
      const changed = await changeExplorer(
        studentId,
        parsed.data,
        now,
        student.class.grade,
      );
      saved = changed;
      feedback = changed.feedback;
    }
    // Shown with the class grade's default plan until a write keeps it.
    const view = withDefaultCoursePlan(saved.state, student.class.grade, now);
    return noStore(
      jsonOk(responseSchema, {
        data: {
          ...explorerView(ownedExplorer(view, studentId, now), date),
          today: date,
          journey: expeditionJourney(view, now, studentId),
          expedition: expeditionDto(view, studentId, now),
          student: {
            id: student.id,
            name: student.name,
            className: student.class.name,
          },
          revision: saved.revision,
          feedback,
        },
      }),
    );
  } catch (error) {
    if (error instanceof ExplorerActionConflict)
      return noStore(jsonError("CONFLICT", error.message, 409));
    if (error instanceof ExplorerActionInvalid)
      return noStore(jsonError("VALIDATION_ERROR", error.message, 400));
    return srsFailureResponse(error);
  }
}
