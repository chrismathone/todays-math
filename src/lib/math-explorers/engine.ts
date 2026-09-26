import {
  explorerActionSchema,
  explorerViewSchema,
  storedExplorerSchema,
  type ExplorerAction,
  type ExplorerActivity,
  type ExplorerFeedback,
  type ExplorerView,
  type StoredExplorer,
} from "@/contracts/mathExplorers.contract";
import { isoDateSchema, uuidSchema } from "@/contracts/common.contract";
import {
  applyDefinitionAction,
  definitionCard,
  definitionCards,
  definitionChests,
  definitionCourseGrade,
  definitionDue,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
  definitionSessionCards,
  definitionSessionTitle,
  definitionUnits,
  definitionWeak,
} from "./definition-cards";
import type { DefinitionAction } from "./types";
import { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";
import {
  applyWorkshopAction,
  isWorkshopAction,
  workshopMemoryDue,
  workshopView,
} from "./workshop";

export { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";

export const explorerUpgradeCosts = [3, 6, 12] as const;

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

/** Call before the route's revision check, so an uncertain network retry is safe. */
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

/** Immutable, account-scoped transition. The caller supplies the server's Seoul date. */
export function applyExplorerAction(
  stored: StoredExplorer,
  action: ExplorerAction,
  serverDate: string,
  requestId: string,
): { state: StoredExplorer; feedback: ExplorerFeedback; duplicate: boolean } {
  const date = isoDateSchema.parse(serverDate);
  if (action.type === "expedition-start")
    throw new ExplorerActionInvalid("오늘의 학습은 통합 학습 화면에서 시작해 주세요.");
  uuidSchema.parse(requestId);
  const key = actionKey(action);
  const duplicate = explorerReceipt(stored, action, requestId);
  if (duplicate) return { state: stored, feedback: duplicate, duplicate: true };
  const state = structuredClone(stored);
  const profile = state.profile;
  const before = profile.definitions?.session;
  const activeWorkshop = profile.workshop?.session;
  let feedback: ExplorerFeedback;

  if (isWorkshopAction(action)) {
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
    const cost = explorerUpgradeCosts[profile.level];
    if (cost === undefined)
      throw new ExplorerActionInvalid("기지를 모두 완성했어요.");
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
    const card = definitionCard(action.cardId);
    feedback = {
      message: "요청한 개념 해설이에요.",
      solution: {
        cardId: card.id,
        name: card.name,
        definition: card.definition,
        explanation: card.explanation,
        note: card.note,
        examples: card.examples.map((example) => ({
          label: example.text,
          correct: example.yes,
        })),
        statement: card.trap,
        truth: card.truth,
      },
    };
  } else {
    if (
      (action.type === "answer" || action.type === "read") &&
      activeWorkshop?.stage !== "complete" &&
      activeWorkshop?.attachedTo.sessionId === before?.id
    ) {
      throw new ExplorerActionConflict(
        "현재 개념의 조각 활동을 먼저 마쳐 주세요.",
      );
    }
    if (
      (action.type === "answer" || action.type === "read") &&
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
      before?.reviewOnly && (action.type === "answer" || action.type === "read")
        ? {
            stars: profile.stars,
            earned: profile.earned,
            cards: structuredClone(profile.definitions!.cards),
            history: structuredClone(profile.definitions!.history),
          }
        : null;
    try {
      feedback = applyDefinitionAction(profile, engineAction, date);
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
      action.type === "answer" &&
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

/** Explicit allowlist: full curriculum definitions/answer keys never enter normal JSON. */
export function explorerView(
  stored: StoredExplorer,
  serverDate: string,
): ExplorerView {
  isoDateSchema.parse(serverDate);
  const profile = stored.profile;
  const record = profile.definitions;
  const session = record?.session;
  let currentActivity: ExplorerActivity | null = null;
  if (session && !session.done) {
    const task = session.queue[session.index]!;
    const card = definitionCard(task.cardId);
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
          ? "말 조각을 순서대로 골라 정의를 완성하세요."
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
      ...(read
        ? { reading: { definition: card.definition, note: card.note } }
        : task.kind === 0
          ? { pieces: card.pieces }
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
          progress: record?.cards[card.id] ?? null,
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
    completedDays: stored.completedDays,
    history: record?.history ?? [],
    workshop: workshopView(profile.workshop, serverDate),
  });
}
