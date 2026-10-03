import "server-only";
import { uuidSchema } from "@/contracts/common.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { TextbookReviewStart } from "@/contracts/textbookStudent.contract";
import { kstDateOf } from "@/lib/kstDate";
import { definitionRepairCards } from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  explorerReceipt,
  recordExplorerReceipt,
} from "@/lib/math-explorers/engine";
import {
  expeditionMissionOpen,
  unfinishedExpeditionSource,
} from "@/lib/math-explorers/expedition";
import {
  SrsConflict,
  SrsUnavailable,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import { changeSrsState, type SrsStateTable } from "@/lib/math-srs/serverStore";
import { resolveConceptTarget } from "./concepts";
import { canonicalHash, conceptContentHash } from "./hash.server";

const href = "/learn?view=collection" as const;
type ReviewContext = {
  studentId: string;
  cardId: string;
  requestId: string;
  now: Date;
};
const unavailable = (
  reasonCode: string,
  replayed = false,
): TextbookReviewStart => ({
  status: "unavailable",
  reasonCode,
  replayed,
  href: null,
});

/** Only the server-approved first explorer link is a target. Other ID namespaces are never converted. */
export function textbookReviewTarget(concept: TextbookConcept): string | null {
  if (
    !concept.frozen ||
    conceptContentHash(concept) !== concept.frozen.contentHash
  )
    return null;
  const link = concept.links.find(
    (entry) =>
      entry.review.status === "confirmed" &&
      entry.target.namespace === "explorer-card",
  );
  if (!link || link.target.namespace !== "explorer-card") return null;
  try {
    return canonicalHash(resolveConceptTarget(link.target)) ===
      link.review.targetHash
      ? link.target.cardId
      : null;
  } catch {
    return null;
  }
}

function currentReview(
  state: StoredSrsState,
  context: Omit<ReviewContext, "requestId">,
): TextbookReviewStart | null {
  const explorer = state.explorers;
  if (!explorer) return unavailable("no-existing-concept-record");
  if (explorer.profile.id !== context.studentId)
    throw new SrsUnavailable("학생의 학습 기록 소유자를 확인해 주세요.");
  if (!explorer.profile.definitions?.cards[context.cardId])
    return unavailable("no-existing-concept-record");
  const session = explorer.profile.definitions?.session;
  const mission = expeditionMissionOpen(state)
    ? state.expedition?.mission
    : null;
  if (mission && mission.kind !== "explorers")
    return {
      status: "deferred",
      reasonCode: "finish-current-mission",
      replayed: false,
      href,
    };
  if (mission && mission.sourceSessionId !== session?.id)
    return unavailable("current-mission-source-mismatch");
  const interrupted = unfinishedExpeditionSource(state, context.now);
  if (interrupted && interrupted.kind !== "explorers")
    return {
      status: "deferred",
      reasonCode: "finish-current-mission",
      replayed: false,
      href,
    };
  if (session && !session.done)
    return {
      status: "resumed",
      reasonCode: "continue-current-concepts",
      replayed: false,
      href,
    };
  if (session?.done && session.unresolved.length && !session.reviewOnly)
    return {
      status: "deferred",
      reasonCode: "finish-current-retry",
      replayed: false,
      href,
    };
  if (expeditionMissionOpen(state))
    return {
      status: "deferred",
      reasonCode: "finish-current-mission",
      replayed: false,
      href,
    };
  const cards = definitionRepairCards(explorer.profile, context.cardId);
  if (
    cards.length !== 5 ||
    cards.some((card) => !explorer.profile.definitions?.cards[card.id])
  )
    return unavailable("review-needs-existing-five-card-records");
  return null;
}

/** GET uses this projection only. It never initializes profiles, sessions or receipts. */
export function textbookReviewAccess(
  state: StoredSrsState,
  studentId: string,
  concept: TextbookConcept,
  now: Date,
) {
  const cardId = textbookReviewTarget(concept);
  if (!cardId)
    return {
      available: false,
      reasonCode: "no-current-reviewed-explorer-link",
    };
  const result = currentReview(state, { studentId, cardId, now });
  return {
    available: result?.status !== "unavailable",
    reasonCode: result?.reasonCode ?? null,
  };
}

export function transitionTextbookReview(
  state: StoredSrsState,
  context: ReviewContext,
): { state: StoredSrsState; response: TextbookReviewStart } {
  uuidSchema.parse(context.requestId);
  const explorer = state.explorers;
  if (!explorer)
    return { state, response: unavailable("no-existing-concept-record") };
  if (explorer.profile.id !== context.studentId)
    throw new SrsUnavailable("학생의 학습 기록 소유자를 확인해 주세요.");
  if (
    state.expedition?.receipts.some(
      (receipt) => receipt.requestId === context.requestId,
    )
  )
    throw new SrsConflict("같은 요청 번호로 다른 학습을 요청할 수 없어요.");
  const action = {
    type: "start" as const,
    route: "repair" as const,
    cardId: context.cardId,
  };
  const replay = explorerReceipt(explorer, action, context.requestId);
  const existing = currentReview(state, context);
  if (replay) {
    const response =
      existing && existing.status !== "unavailable"
        ? { ...existing, replayed: true }
        : unavailable("already-processed", true);
    return { state, response };
  }
  if (existing) {
    if (existing.status === "unavailable") return { state, response: existing };
    // A retry after this activity finishes must not start an unexpected second activity.
    const recorded = recordExplorerReceipt(
      explorer,
      action,
      context.requestId,
      { message: "진행 중인 학습을 먼저 이어가요." },
    );
    return { state: { ...state, explorers: recorded }, response: existing };
  }
  const started = applyExplorerAction(
    explorer,
    action,
    kstDateOf(context.now),
    context.requestId,
  );
  if (
    started.duplicate ||
    !started.state.profile.definitions?.session ||
    started.state.profile.definitions.session.id ===
      explorer.profile.definitions?.session?.id
  )
    throw new SrsConflict("현재 개념 활동을 다시 불러와 주세요.");
  return {
    state: { ...state, explorers: started.state },
    response: { status: "started", reasonCode: null, replayed: false, href },
  };
}

/** Caller checks active student and current assignment before entering the existing CAS store. */
export async function startTextbookReview(
  input: {
    studentId: string;
    concept: TextbookConcept;
    requestId: string;
    now: Date;
  },
  table?: SrsStateTable,
): Promise<TextbookReviewStart> {
  uuidSchema.parse(input.requestId);
  const cardId = textbookReviewTarget(input.concept);
  if (!cardId) return unavailable("no-current-reviewed-explorer-link");
  let response: TextbookReviewStart = unavailable("no-existing-concept-record");
  await changeSrsState(
    input.studentId,
    (state) => {
      const result = transitionTextbookReview(state, { ...input, cardId });
      response = result.response;
      return result.state;
    },
    table,
    undefined,
    {},
    input.now,
  );
  return response;
}
