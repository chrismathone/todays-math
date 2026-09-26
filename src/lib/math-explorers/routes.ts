import "server-only";
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
  createExplorerState,
  ExplorerActionConflict,
  ExplorerActionInvalid,
  explorerReceipt,
  explorerView,
} from "./engine";
import { expeditionJourney } from "./expeditionJourney";

const responseSchema = dataResponseSchema(explorerStateSchema);

function ownedExplorer(
  state: StoredSrsState,
  studentId: string,
): StoredExplorer {
  const explorer = state.explorers ?? createExplorerState(studentId);
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
  date: string,
) {
  const previous = await readSrsState(studentId);
  const receipt = explorerReceipt(
    ownedExplorer(previous.state, studentId),
    input.action,
    input.requestId,
  );
  if (receipt) return { ...previous, feedback: receipt };
  let feedback: ExplorerFeedback | null = null;
  try {
    const saved = await changeSrsState(
      studentId,
      (state) => {
        const result = applyExplorerAction(
          ownedExplorer(state, studentId),
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
    const duplicate = explorerReceipt(
      ownedExplorer(latest.state, studentId),
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
      const changed = await changeExplorer(studentId, parsed.data, date);
      saved = changed;
      feedback = changed.feedback;
    }
    return noStore(
      jsonOk(responseSchema, {
        data: {
          ...explorerView(ownedExplorer(saved.state, studentId), date),
          today: date,
          journey: expeditionJourney(saved.state, now),
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
