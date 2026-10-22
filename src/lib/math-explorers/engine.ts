import {
  explorerActionSchema,
  explorerViewSchema,
  storedExplorerSchema,
  type ExplorerAction,
  type ExplorerActivity,
  type ExplorerFeedback,
  type ExplorerSolution,
  type ExplorerView,
  type StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import {
  applySupplementAction,
  isSupplementAction,
  supplementView,
} from "./supplement";
import { isoDateSchema, uuidSchema } from "@/contracts/common.contract";
import {
  applyDefinitionAction,
  definitionCard,
  definitionCards,
  definitionChests,
  definitionCourseGrade,
  definitionDue,
  definitionEffectiveDue,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
  definitionSessionCards,
  definitionSessionCard,
  type DefinitionSession,
  definitionSessionTitle,
  definitionUnits,
  definitionWeak,
} from "./definition-cards";
import type { DefinitionAction } from "./types";
import { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";
import { baseUpgradeCost } from "./starEconomy";
import {
  applyWorkshopAction,
  isWorkshopAction,
  workshopMemoryDue,
  workshopView,
} from "./workshop";

export { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";

/** 기지 비용은 `starEconomy.ts` 한 곳(D-144) — 3 · 6 · 12 뒤로 한 단계마다 12, 끝 없음. */
export { baseUpgradeCost as explorerUpgradeCost } from "./starEconomy";

export function createExplorerState(
  studentId: string,
  grade = 3,
): StoredExplorer {
  return storedExplorerSchema.parse({
    version: 1,
    profile: { id: studentId, grade, stars: 0, earned: 0, level: 0 },
    receipts: [],
    completedDays: [],
  });
}

function actionKey(action: ExplorerAction) {
  const parsed = explorerActionSchema.safeParse(action);
  if (!parsed.success)
    throw new ExplorerActionInvalid("학습 요청을 다시 확인해 주세요.");
  return JSON.stringify(parsed.data);
}

/**
 * Replays an exact earlier request, so an uncertain network retry is safe.
 * The route calls it before the save only for expedition-start; other actions
 * meet it inside `applyExplorerAction` and again after a failed revision check.
 */
export function explorerReceipt(
  stored: StoredExplorer,
  action: ExplorerAction,
  requestId: string,
): ExplorerFeedback | null {
  const existing = stored.receipts.find(
    (receipt) => receipt.requestId === requestId,
  );
  if (!existing) return null;
  if (existing.actionKey !== actionKey(action)) {
    throw new ExplorerActionConflict(
      "같은 요청 번호로 다른 답을 보낼 수 없어요.",
    );
  }
  return structuredClone(existing.feedback);
}

/** Record a decision without running an activity transition (which may initialize learning state). */
export function recordExplorerReceipt(
  stored: StoredExplorer,
  action: ExplorerAction,
  requestId: string,
  feedback: ExplorerFeedback,
): StoredExplorer {
  uuidSchema.parse(requestId);
  if (explorerReceipt(stored, action, requestId)) return stored;
  return storedExplorerSchema.parse({
    ...stored,
    receipts: [
      ...stored.receipts,
      { requestId, actionKey: actionKey(action), feedback },
    ].slice(-256),
  });
}

/** Immutable, account-scoped transition. The caller supplies the server's Seoul date. */
export function applyExplorerAction(
  stored: StoredExplorer,
  action: ExplorerAction,
  serverDate: string,
  requestId: string,
  /** `followUps`: the screen shows «한 번 더 → 풀이» (header `x-explorer-follow-up`). */
  { followUps = false }: { followUps?: boolean } = {},
): { state: StoredExplorer; feedback: ExplorerFeedback; duplicate: boolean } {
  const date = isoDateSchema.parse(serverDate);
  if (action.type === "expedition-start")
    throw new ExplorerActionInvalid(
      "오늘의 학습은 통합 학습 화면에서 시작해 주세요.",
    );
  uuidSchema.parse(requestId);
  const key = actionKey(action);
  const duplicate = explorerReceipt(stored, action, requestId);
  if (duplicate) return { state: stored, feedback: duplicate, duplicate: true };
  const state = structuredClone(stored);
  const profile = state.profile;
  const before = profile.definitions?.session;
  const activeWorkshop = profile.workshop?.session;
  let feedback: ExplorerFeedback;

  if (isSupplementAction(action)) {
    // 보충 카드(D-147) — 본 카드 세션과 따로 둔 칸. 본 카드 기록 · 칸 · 상자를 건드리지 않는다.
    feedback = applySupplementAction(
      profile,
      action,
      date,
      state.completedDays,
    );
  } else if (isWorkshopAction(action)) {
    if (action.type === "lab-solution") {
      if (before && !before.done)
        throw new ExplorerActionInvalid(
          "개념 퀘스트와 오답 다시 풀기를 마친 뒤 해설을 볼 수 있어요.",
        );
    } else if (
      !before ||
      before.done ||
      !activeWorkshop ||
      activeWorkshop.attachedTo.sessionId !== before.id ||
      activeWorkshop.attachedTo.questionId !== definitionQuestionId(before)
    ) {
      throw new ExplorerActionConflict(
        "현재 개념의 조각 활동에서 다시 시도해 주세요.",
      );
    }
    feedback = applyWorkshopAction(profile, action, date);
  } else if (action.type === "upgrade") {
    const cost = baseUpgradeCost(profile.level);
    if (profile.stars < cost)
      throw new ExplorerActionInvalid(
        `별 ${cost - profile.stars}개를 더 모아 주세요.`,
      );
    profile.stars -= cost;
    profile.level += 1;
    feedback = {
      message: `별 ${cost}개로 기지가 ${profile.level}단계로 자랐어요.`,
    };
  } else if (action.type === "solution") {
    if (before && !before.done) {
      throw new ExplorerActionInvalid(
        "오답 다시 풀기까지 마친 뒤 해설을 볼 수 있어요.",
      );
    }
    if (!profile.definitions?.cards[action.cardId]) {
      throw new ExplorerActionInvalid("먼저 이 개념의 활동을 마쳐 주세요.");
    }
    feedback = {
      message: "요청한 개념 해설이에요.",
      solution: cardSolution(
        action.cardId,
        before?.cardIds?.includes(action.cardId) ? before : undefined,
      ),
    };
  } else {
    const onQuestion =
      action.type === "answer" ||
      action.type === "read" ||
      action.type === "understood";
    if (
      onQuestion &&
      activeWorkshop?.stage !== "complete" &&
      activeWorkshop?.attachedTo.sessionId === before?.id
    ) {
      throw new ExplorerActionConflict(
        "현재 개념의 조각 활동을 먼저 마쳐 주세요.",
      );
    }
    if (
      onQuestion &&
      (!before ||
        before.done ||
        action.questionId !== definitionQuestionId(before))
    ) {
      throw new ExplorerActionConflict(
        "이미 넘어간 활동이에요. 현재 문제를 확인해 주세요.",
      );
    }
    let engineAction: DefinitionAction;
    if (action.type === "answer") {
      const task = before!.queue[before!.index]!;
      const options = definitionOptions(before!, task);
      if (action.choiceIds.some((choice) => choice >= options.length)) {
        throw new ExplorerActionInvalid("답을 다시 골라 주세요.");
      }
      engineAction = {
        definitionAction: "answer",
        questionId: action.questionId,
        // IDs are positions in the shuffled public choices, never source answer indices.
        tiles: action.choiceIds.map((choice) => options[choice]!),
        choiceIds: action.choiceIds,
        followUps,
      };
    } else if (action.type === "start") {
      const day = action.dayId
        ? state.completedDays.find(
            (completed) => completed.date === action.dayId,
          )
        : undefined;
      if (action.dayId && !day)
        throw new ExplorerActionInvalid("완료한 학습일을 다시 골라 주세요.");
      engineAction = {
        definitionAction: "start",
        definitionRoute: day ? "unit" : action.route,
        unitId: day?.unitId ?? action.unitId,
        cardId: action.cardId,
      };
    } else {
      const { type, ...parameters } = action;
      engineAction = { definitionAction: type, ...parameters };
    }
    // Historical-board practice must not alter earned cards, scheduling or rewards.
    const reviewSnapshot =
      before?.reviewOnly && onQuestion
        ? {
            stars: profile.stars,
            earned: profile.earned,
            cards: structuredClone(profile.definitions!.cards),
            history: structuredClone(profile.definitions!.history),
          }
        : null;
    try {
      const { solutionCardId, ...rest } = applyDefinitionAction(
        profile,
        engineAction,
        date,
      );
      // An opened solution (plan §3.2 ②) uses the same shape as «해설 보기».
      feedback = solutionCardId
        ? {
            ...rest,
            solution: cardSolution(
              solutionCardId,
              profile.definitions?.session,
            ),
          }
        : rest;
    } catch (error) {
      throw new ExplorerActionInvalid(
        error instanceof Error
          ? error.message
          : "학습 요청을 다시 확인해 주세요.",
      );
    }
    const session = profile.definitions?.session;
    if (
      action.type === "start" &&
      action.dayId &&
      session?.id !== before?.id &&
      session
    ) {
      session.reviewOnly = true;
      const day = state.completedDays.find(
        (completed) => completed.date === action.dayId,
      )!;
      const cards =
        day.cardIds?.map(definitionCard) ?? definitionSessionCards(session);
      session.cardIds = cards.map((card) => card.id);
      session.queue = cards.flatMap((card) =>
        ([0, 1, 2] as const).map((kind) => ({ cardId: card.id, kind })),
      );
      session.route = day.route ?? "unit";
      session.targetCardId = day.targetCardId;
      session.eligible = [];
      if (day.reviewVariant)
        session.reviewVariant = structuredClone(day.reviewVariant);
      else delete session.reviewVariant;
    }
    if (reviewSnapshot && session) {
      profile.stars = reviewSnapshot.stars;
      profile.earned = reviewSnapshot.earned;
      profile.definitions!.cards = reviewSnapshot.cards;
      profile.definitions!.history = reviewSnapshot.history;
      session.stars = 0;
      feedback.stars = 0;
    }
    if (
      (action.type === "answer" || action.type === "understood") &&
      session?.done &&
      !session.reviewOnly &&
      session.unresolved.length === 0 &&
      !state.completedDays.some((day) => day.date === date)
    ) {
      state.completedDays.push({
        date,
        unitId: session.unit,
        sessionId: session.id,
        cardIds: definitionSessionCards(session).map((card) => card.id),
        route: session.route,
        targetCardId: session.targetCardId,
        ...(session.reviewVariant
          ? { reviewVariant: structuredClone(session.reviewVariant) }
          : {}),
      });
    }
    // The imported engine's completion message suggested automatically showing answers.
    if (session?.done && session.unresolved.length) {
      feedback.message =
        "다시 확인할 개념을 모았어요. 원할 때 해설을 열어 볼 수 있어요.";
    }
    // The manipulation is an interlude inside this concept's first activity.
    // It never increments the 15-activity index or creates a separate daily tile.
    if (
      session &&
      !session.done &&
      !session.reviewOnly &&
      session.round === 0 &&
      !session.continuation &&
      session.queue[session.index]?.cardId === "g5-common-denominator" &&
      session.queue[session.index]?.kind === 0 &&
      !definitionNeedsRead(profile, session) &&
      // Not while the student retries or reads a solution.
      !session.followUp &&
      profile.workshop?.session?.attachedTo.sessionId !== session.id
    ) {
      const labRoute = !profile.workshop?.blueprintAt
        ? "explore"
        : workshopMemoryDue(profile.workshop, date)
          ? "memory"
          : "check";
      applyWorkshopAction(
        profile,
        {
          type: "lab-start",
          route: labRoute,
          attachedTo: {
            sessionId: session.id,
            questionId: definitionQuestionId(session),
            cardId: "g5-common-denominator",
          },
        },
        date,
      );
    }
  }
  state.receipts.push({ requestId, actionKey: key, feedback });
  state.receipts = state.receipts.slice(-256);
  return {
    state: storedExplorerSchema.parse(state),
    feedback,
    duplicate: false,
  };
}

/** A card's solution — «해설 보기» and an opened follow-up solution share it. */
function cardSolution(
  cardId: string,
  session?: DefinitionSession,
): ExplorerSolution {
  const card = definitionSessionCard(session, cardId);
  return {
    cardId: card.id,
    name: card.name,
    // 카드는 내보내는 층에서 이미 보정 표를 입었다(D-143 ④ · ⑦ — definition-cards.ts).
    definition: card.definition,
    explanation: card.explanation,
    note: card.note,
    examples: card.examples.map((example) => ({
      label: example.text,
      correct: example.yes,
    })),
    statement: card.trap,
    truth: card.truth,
  };
}

/** Explicit allowlist: full curriculum definitions/answer keys never enter normal JSON. */
export function explorerView(
  stored: StoredExplorer,
  serverDate: string,
  /** `followUp`: the screen asked for the follow-up fields (header `x-explorer-follow-up`). */
  { followUp = false }: { followUp?: boolean } = {},
): ExplorerView {
  isoDateSchema.parse(serverDate);
  const profile = stored.profile;
  const record = profile.definitions;
  const session = record?.session;
  let currentActivity: ExplorerActivity | null = null;
  if (session && !session.done) {
    const task = session.queue[session.index]!;
    const card = definitionSessionCard(session, task.cardId);
    const unit = definitionUnits.find(
      (candidate) => candidate.id === card.unit,
    )!;
    const read = definitionNeedsRead(profile, session);
    currentActivity = {
      questionId: definitionQuestionId(session),
      cardId: card.id,
      cardName: card.name,
      unitId: unit.id,
      unitTitle: unit.title,
      kind: read
        ? "read"
        : task.kind === 0
          ? "assemble"
          : task.kind === 1
            ? "examples"
            : "truth",
      prompt: read
        ? "개념의 뜻을 읽어 보세요."
        : task.kind === 0
          ? "말 조각을 순서대로 골라 문장을 완성하세요."
          : task.kind === 1
            ? card.exampleTitle
            : card.trap,
      choices: read
        ? []
        : definitionOptions(session, task).map((sourceIndex, index) => ({
            id: index,
            label:
              task.kind === 0
                ? card.words[sourceIndex]!
                : task.kind === 1
                  ? card.examples[sourceIndex]!.text
                  : sourceIndex === 1
                    ? "맞다"
                    : "아니다",
          })),
      // 뜻 · 조립 조각 · 보기는 내보내는 층에서 보정 표를 입은 카드 그대로(D-143 ④ · ⑦) — 채점도 같은 카드로.
      ...(read
        ? { reading: { definition: card.definition, note: card.note } }
        : task.kind === 0
          ? { pieces: card.pieces }
          : {}),
    };
    // Tabs opened before the reader shipped parse strictly: only on request.
    const open = session.followUp;
    if (followUp && open?.questionId === currentActivity.questionId)
      currentActivity = {
        ...currentActivity,
        followUp: { state: open.state, firstChoiceIds: open.firstChoiceIds },
        ...(open.state === "solution"
          ? { solution: cardSolution(card.id, session) }
          : {}),
      };
  }
  return explorerViewSchema.parse({
    profile: {
      id: profile.id,
      grade: profile.grade,
      courseGrade: definitionCourseGrade(profile),
      stars: profile.stars,
      earned: profile.earned,
      level: profile.level,
      goalUnitId: record?.goalUnitId ?? null,
    },
    units: definitionUnits.map((unit) => ({
      ...unit,
      cards: definitionCards
        .filter((card) => card.unit === unit.id)
        .map((card) => ({
          id: card.id,
          unitId: card.unit,
          name: card.name,
          prerequisiteIds: card.prerequisites ?? [],
          // 만기는 기억 복습이 읽는 값(뜻을 고친 카드는 앞당긴 판 날 — D-143 ⑦)이라 도감 격자의 «다시 기억할 때»와
          // 카드 대화상자의 «다음 복습»이 같은 날을 말한다(모든 화면 일치). 저장된 기록은 그대로다.
          progress: record?.cards[card.id]
            ? {
                ...record.cards[card.id],
                due: definitionEffectiveDue(card.id, record.cards[card.id]),
              }
            : null,
        })),
    })),
    currentActivity,
    session: session
      ? {
          id: session.id,
          route: session.route ?? "unit",
          title: definitionSessionTitle(session) ?? "개념 퀘스트",
          unitId: session.unit,
          cardIds: definitionSessionCards(session).map((card) => card.id),
          index: session.index,
          total: session.queue.length,
          round: session.round,
          continuation: session.continuation ?? 0,
          done: session.done,
          reviewOnly: session.reviewOnly ?? false,
          first: session.first,
          stars: session.stars,
          unresolved: session.unresolved.map((task) => ({
            ...task,
            name: definitionCard(task.cardId).name,
          })),
        }
      : null,
    dueCardIds: definitionDue(profile, serverDate).map((card) => card.id),
    weakCardIds: definitionWeak(profile).map((card) => card.id),
    chests: definitionChests(profile),
    // Stored identity is server-only: older tabs parse the public shape strictly.
    completedDays: stored.completedDays.map((day) => {
      const publicDay = { ...day };
      delete publicDay.reviewVariant;
      return publicDay;
    }),
    history: record?.history ?? [],
    workshop: workshopView(profile.workshop, serverDate),
    supplements: supplementView(profile, stored.completedDays, serverDate),
  });
}
