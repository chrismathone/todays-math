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
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { requireStudent } from "@/lib/learn/studentRequest";
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
import { expeditionDto, expeditionStartDuplicate, initialOwnedExplorer, planExpedition } from "./expedition";
import { expeditionInitialCourseRecommendation, startExpedition } from "./expeditionStart";
import { loadCourseBankCandidates } from "@/lib/math-srs/courseBank";

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
) {
  const date = kstDateOf(now);
  const previous = await readSrsState(studentId);
  ownedExplorer(previous.state, studentId, now);
  const expeditionStart = input.action.type === "expedition-start";
  const duplicateStart = (state: StoredSrsState) => {
    if (expeditionStart) return expeditionStartDuplicate(state, input.requestId);
    if (state.expedition?.receipts.some((r) => r.requestId === input.requestId)) throw new SrsConflict("같은 요청 번호로 다른 학습을 요청할 수 없어요.");
    return false;
  };
  const startFeedback = { message: "오늘의 탐험을 이어가요." };
  if (duplicateStart(previous.state)) return { ...previous, feedback: startFeedback };
  const receipt = explorerReceipt(
    ownedExplorer(previous.state, studentId, now),
    input.action,
    input.requestId,
  );
  if (receipt) return { ...previous, feedback: receipt };
  const plan = expeditionStart ? planExpedition(previous.state, studentId, now) : null;
  const recommendation = plan?.kind === "elementary" ? expeditionInitialCourseRecommendation(previous.state, plan, now) : null;
  const candidates = recommendation && recommendation.mode !== "resume"
    ? await loadCourseBankCandidates(recommendation.sectionId) : [];
  const seed = randomInt(0, 0x1_0000_0000);
  let feedback: ExplorerFeedback | null = null;
  try {
    const saved = await changeSrsState(
      studentId,
      (state) => {
        if (expeditionStart) {
          feedback = startFeedback;
          return startExpedition(state, studentId, now, input.requestId, seed, randomUUID,
            recommendation ? { sectionId: recommendation.sectionId, candidates } : null);
        }
        const result = applyExplorerAction(
          ownedExplorer(state, studentId, now),
          input.action,
          date,
          input.requestId,
        );
        feedback = result.feedback;
        return result.duplicate ? state : { ...state, explorers: result.state };
      },
      undefined,
      input.expectedRevision,
    );
    return { ...saved, feedback };
  } catch (error) {
    if (!(error instanceof SrsConflict)) throw error;
    // Two tabs can submit the very same click while the first is being saved.
    // Only its exact committed receipt may bypass the stale revision check.
    const latest = await readSrsState(studentId);
    if (duplicateStart(latest.state)) return { ...latest, feedback: startFeedback };
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
    const now = new Date();
    const date = kstDateOf(now);
    let saved: Awaited<ReturnType<typeof readSrsState>>;
    let feedback: ExplorerFeedback | null = null;
    if (operation === "read") saved = await readSrsState(studentId);
    else {
      const parsed = explorerRequestSchema.safeParse(
        await request.json().catch(() => undefined),
      );
      if (!parsed.success) return noStore(validationError(parsed.error));
      const changed = await changeExplorer(studentId, parsed.data, now);
      saved = changed;
      feedback = changed.feedback;
    }
    return noStore(
      jsonOk(responseSchema, {
        data: {
          ...explorerView(ownedExplorer(saved.state, studentId, now), date),
          today: date,
          journey: expeditionJourney(saved.state, now),
          expedition: expeditionDto(saved.state, studentId, now),
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
