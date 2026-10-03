/**
 * 보충 카드 한 장 세션(D-147 · 05 §8.22) — 3자 합의(2026-09-28, `docs/reference/concept-terms/supplement-cards.md`).
 *
 * 본 카드 엔진(`definition-cards.ts`)과 따로 둔 칸(`profile.supplements`)에서 푼다 — 본 카드 세션 · 기억 일정 ·
 * 상자 · 칸 기록(`completedDays`)을 건드리지 않는다. 한 장 = 뜻 만나기 → 세 활동(문장 조립 · 예 모으기 · 경계 살피기).
 * - 틀린 활동만 뒤에서, 세 바퀴까지(본 카드와 같다). 그래도 남으면 안 모음(`missedAt`) · 다시 해 보기는 처음부터.
 * - 멈춘 진행은 카드마다 `sessions` 에 남고, 한 번에 푸는 것은 한 장(`active`).
 * - 처음 모을 때 별 +1(`p.stars` · `p.earned`). 모은 카드는 다시 풀기가 없어 별이 늘 길이 없다.
 * - 본 카드 세션이 열려 있으면(오늘의 탐험 · 남은 문제 다시 풀기) 시작하지 않는다. 오늘의 탐험 미션이 열린 동안의
 *   막음은 저장 문지기 `updateExpedition` 이 맡는다(보충 칸이 바뀌면 거절).
 */
import type {
  ExplorerAction,
  ExplorerActivity,
  ExplorerFeedback,
  ExplorerSupplementSession,
  ExplorerSupplements,
  StoredExplorer,
  SupplementAction,
} from "@/contracts/mathExplorers.contract";
import { definitionCards, definitionUnits } from "./definition-cards";
import { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";
import {
  supplementCard,
  supplementCards,
  type SupplementCard,
} from "./supplement-content";
import type { ExplorerProfile } from "./types";

type Kind = 0 | 1 | 2;
export const SUPPLEMENT_TITLE = "교재에 한 장 더";

export function isSupplementAction(
  action: ExplorerAction,
): action is SupplementAction {
  return (
    action.type === "supplement-start" ||
    action.type === "supplement-read" ||
    action.type === "supplement-answer" ||
    action.type === "supplement-solution"
  );
}

function record(p: ExplorerProfile): ExplorerSupplements {
  return (p.supplements ??= { runs: 0, cards: {}, sessions: {} });
}

export function supplementQuestionId(s: ExplorerSupplementSession) {
  return `${s.id}:${s.round}:${s.index}`;
}

/** 첫 바퀴의 문장 조립 앞에서 한 번 — 뜻을 읽고 가린 뒤 푼다. */
export function supplementNeedsRead(s: ExplorerSupplementSession) {
  return s.round === 0 && s.queue[s.index] === 0 && !s.seen;
}

function optionCount(card: SupplementCard, kind: Kind) {
  return kind === 0 ? card.words.length : kind === 1 ? card.examples.length : 2;
}

/** 보기 순서 — 세션 · 카드 · 활동 · 바퀴로 정해지는 섞음(본 카드 `definitionOptions` 와 같은 식). */
export function supplementOptions(s: ExplorerSupplementSession, kind: Kind) {
  const card = supplementCard(s.cardId);
  const n = optionCount(card, kind);
  const order = Array.from({ length: n }, (_, i) => i);
  let seed = 0;
  for (const ch of `${s.id}:${s.cardId}:${kind}:${s.round}`)
    seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  for (let i = n - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function conceptOpen(p: ExplorerProfile) {
  const s = p.definitions?.session;
  return !!s && (!s.done || (!s.reviewOnly && s.unresolved.length > 0));
}

function known(cardId: string) {
  if (!supplementCards.some((card) => card.id === cardId))
    throw new ExplorerActionInvalid("보충 카드를 다시 골라 주세요.");
  return supplementCard(cardId);
}

export function applySupplementAction(
  p: ExplorerProfile,
  action: SupplementAction,
  date: string,
  completedDays: StoredExplorer["completedDays"] = [],
): ExplorerFeedback {
  const rec = record(p);
  // 열린 탐험은 하나 — 본 카드 세션(오늘의 탐험 · 남은 문제 다시 풀기)이 열려 있으면 시작 · 뜻 읽기 · 답 모두 막는다
  // (낡은 화면 · 다른 탭에서 멈춰 둔 보충의 답이 들어와 카드를 모으지 않게 — E2). 해설 보기는 쓰기가 없어 그대로.
  if (action.type !== "supplement-solution" && conceptOpen(p))
    throw new ExplorerActionConflict("오늘의 탐험을 마친 뒤 해 볼 수 있어요.");
  if (action.type === "supplement-solution") {
    const card = known(action.cardId);
    const mark = rec.cards[card.id];
    if (!mark?.collectedAt && !mark?.missedAt)
      throw new ExplorerActionInvalid("먼저 이 개념의 활동을 마쳐 주세요.");
    if (rec.sessions[card.id])
      throw new ExplorerActionInvalid(
        "이어서 푸는 활동을 마친 뒤 해설을 볼 수 있어요.",
      );
    return {
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
  }
  if (action.type === "supplement-start") {
    const card = known(action.cardId);
    if (rec.cards[card.id]?.collectedAt)
      throw new ExplorerActionInvalid("이미 도감에 모은 개념이에요.");
    // 단원 끝 줄이 가리키는 장을 시작하면 그날의 줄로 적어 둔다 — 같은 날 모아도 줄이 다음 장으로 넘어가지 않게(E3).
    if (offer(p, rec, completedDays, date)?.cardId === card.id)
      rec.offered = { date, cardId: card.id };
    rec.active = card.id;
    if (rec.sessions[card.id]) return { message: "멈춘 곳에서 이어서 해요." };
    rec.runs++;
    rec.sessions[card.id] = {
      id: `supplement-${p.id}-${rec.runs}`,
      cardId: card.id,
      date,
      queue: [0, 1, 2],
      index: 0,
      round: 0,
      next: [],
      seen: false,
      passed: [],
    };
    return { message: "교재 개념 한 장을 시작해요." };
  }
  const s = rec.active ? rec.sessions[rec.active] : undefined;
  if (!s || action.questionId !== supplementQuestionId(s))
    throw new ExplorerActionConflict(
      "이미 넘어간 활동이에요. 현재 문제를 확인해 주세요.",
    );
  if (action.type === "supplement-read") {
    if (!supplementNeedsRead(s))
      throw new ExplorerActionInvalid("뜻 만나기 단계가 아니에요.");
    s.seen = true;
    return { message: "이제 뜻을 가리고 떠올려 봐요." };
  }
  if (supplementNeedsRead(s))
    throw new ExplorerActionInvalid("먼저 뜻을 읽어 주세요.");
  const card = supplementCard(s.cardId);
  const kind = s.queue[s.index]!;
  const options = supplementOptions(s, kind);
  const values = action.choiceIds.map((choice) => options[choice]);
  // «아직 모르겠어요» = 빈 답 = 그 활동의 오답(본 카드와 같은 뜻 — `definition-cards.ts`). 빈 답만 푼다.
  const gaveUp = values.length === 0;
  if (
    !gaveUp &&
    (values.some((value) => value === undefined) ||
      new Set(values).size !== values.length ||
      (kind === 0 && values.length !== 2) ||
      (kind === 2 && values.length !== 1))
  )
    throw new ExplorerActionInvalid("답을 다시 골라 주세요.");
  const tiles = values as number[];
  const correct = gaveUp
    ? false
    : kind === 0
      ? card.words[tiles[0]!] === card.words[0] &&
        card.words[tiles[1]!] === card.words[1]
      : kind === 1
        ? card.examples.every((e, i) => e.yes === tiles.includes(i))
        : tiles[0] === (card.truth ? 1 : 0);
  if (correct) {
    if (!s.passed.includes(kind)) s.passed.push(kind);
  } else s.next.push(kind);
  s.index++;
  if (s.index < s.queue.length)
    return {
      correct,
      advance: true,
      message: correct ? "맞았어요." : "틀린 활동은 뒤에서 다시 만나요.",
    };
  if (s.next.length && s.round < 3) {
    s.queue = s.next;
    s.next = [];
    s.index = 0;
    s.round++;
    return {
      correct,
      advance: true,
      message: correct ? "맞았어요." : "틀린 활동은 뒤에서 다시 만나요.",
    };
  }
  // 한 장이 끝났다 — 다 맞혔으면 처음 한 번 모으고 별 +1, 남았으면 안 모음(다시 해 보기는 처음부터).
  const collected = s.next.length === 0;
  delete rec.sessions[card.id];
  if (rec.active === card.id) delete rec.active;
  const mark = (rec.cards[card.id] ??= {});
  if (collected) {
    mark.collectedAt = date;
    delete mark.missedAt;
    p.stars++;
    p.earned++;
    return {
      correct,
      advance: true,
      complete: true,
      stars: 1,
      message: "교재 개념을 도감에 모았어요.",
    };
  }
  mark.missedAt = date;
  return {
    correct,
    advance: true,
    complete: false,
    stars: 0,
    message: "아직 모으지 못했어요. 도감에서 다시 해 볼 수 있어요.",
  };
}

function activity(s: ExplorerSupplementSession): ExplorerActivity {
  const card = supplementCard(s.cardId);
  const unit = definitionUnits.find((item) => item.id === card.unit)!;
  const read = supplementNeedsRead(s);
  const kind = s.queue[s.index]!;
  return {
    questionId: supplementQuestionId(s),
    cardId: card.id,
    cardName: card.name,
    unitId: unit.id,
    unitTitle: unit.title,
    kind: read
      ? "read"
      : kind === 0
        ? "assemble"
        : kind === 1
          ? "examples"
          : "truth",
    prompt: read
      ? "개념의 뜻을 읽어 보세요."
      : kind === 0
        ? "말 조각을 순서대로 골라 문장을 완성하세요."
        : kind === 1
          ? card.exampleTitle
          : card.trap,
    choices: read
      ? []
      : supplementOptions(s, kind).map((source, index) => ({
          id: index,
          label:
            kind === 0
              ? card.words[source]!
              : kind === 1
                ? card.examples[source]!.text
                : source === 1
                  ? "맞다"
                  : "아니다",
        })),
    ...(read
      ? { reading: { definition: card.definition, note: card.note } }
      : kind === 0
        ? { pieces: card.pieces }
        : {}),
  };
}

/**
 * 단원 끝 줄 — 오늘의 단원 탐험으로 그 단원 다섯을 다 모은 날, 그 단원 보충 중 **안 모은 첫 장**(E3 — 오늘 칸 전에
 * 도감에서 모은 장은 건너뛴다). 그날 이 줄로 시작한 장(`offered`)이 있으면 모은 뒤에도 그 장을 가리킨다(끝 줄).
 */
function offer(
  p: ExplorerProfile,
  rec: ExplorerSupplements | undefined,
  completedDays: StoredExplorer["completedDays"],
  date: string,
) {
  const day = completedDays.find(
    (item) => item.date === date && (item.route ?? "unit") === "unit",
  );
  if (!day) return null;
  const five = definitionCards.filter((card) => card.unit === day.unitId);
  if (!five.every((card) => (p.definitions?.cards[card.id]?.level ?? 0) > 0))
    return null;
  const offered = rec?.offered;
  if (
    offered?.date === date &&
    supplementCards.some(
      (item) => item.id === offered.cardId && item.unit === day.unitId,
    )
  )
    return { cardId: offered.cardId, unitId: day.unitId };
  const card = supplementCards.find(
    (item) => item.unit === day.unitId && !rec?.cards[item.id]?.collectedAt,
  );
  return card ? { cardId: card.id, unitId: day.unitId } : null;
}

export function supplementView(
  p: ExplorerProfile,
  completedDays: StoredExplorer["completedDays"],
  date: string,
) {
  const rec = p.supplements;
  const active = rec?.active ? rec.sessions[rec.active] : undefined;
  return {
    cards: supplementCards.map((card) => {
      const s = rec?.sessions[card.id];
      return {
        id: card.id,
        unitId: card.unit,
        name: card.name,
        kind: card.kind,
        prerequisiteIds: card.prerequisites,
        collectedAt: rec?.cards[card.id]?.collectedAt ?? null,
        missedAt: rec?.cards[card.id]?.missedAt ?? null,
        started: !!s,
        solved: s?.passed.length ?? 0,
      };
    }),
    session: active
      ? {
          id: active.id,
          cardId: active.cardId,
          title: SUPPLEMENT_TITLE,
          index: active.index,
          total: active.queue.length,
          round: active.round,
          solved: active.passed.length,
        }
      : null,
    activity: active ? activity(active) : null,
    offer: offer(p, rec, completedDays, date),
  };
}
