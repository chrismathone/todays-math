import type {
  StoredFading,
  StoredFadingRelearn,
  StoredFadingRelearnItem,
  StoredFadingRelearnReceipt,
} from "@/contracts/fading.contract";
import {
  FADING_RELEARN_CONFIRM_MS,
  FADING_RELEARN_RETRY_MS,
  type FadingRelearnAction,
  type FadingRelearnApplied,
  type FadingRelearnAttempt,
  type FadingRelearnItem,
  type FadingRelearnJudgement,
  type FadingRelearnObservation,
  type FadingRelearnOrigin,
  type FadingRelearnQueue,
  type FadingRelearnResult,
  type FadingRelearnTargetOutcome,
} from "@/contracts/fadingRelearn.contract";
import { kstDateOf } from "@/lib/kstDate";
import { FADING_CONTENT_CHANGED } from "./actions";
import type { FadingTrap } from "./chips";
import {
  fadingConceptDigest,
  type FadingConcept,
  type FadingProposition,
  type FadingTarget,
} from "./concepts";
import { fadingContentKey, fadingSessionToken } from "./contentKey";
import { fnv1a } from "./random";
import {
  fadingModeOf,
  giveUpCard,
  giveUpStep,
  placeAnswer,
  startFadingSession,
  type FadingSession,
} from "./session";
import { FadingConflict } from "./state";
import { fadingTypedOutcome, type FadingTypedOutcome } from "./typed";

/**
 * 단기 재학습 대기열의 규칙 — 화면도 DB 도 모른다 (`docs/planning/srs-explorer-integration-20261007.md` «일정의 두 층»).
 *
 * | 일어난 일                                   | 대기열의 줄                         |
 * | ------------------------------------------- | ----------------------------------- |
 * | 틀림 · 넘김 · «다름» · 도움                 | `retry` — 1분 뒤부터 확인           |
 * | 처음 배운 풀이의 틀리지 않은 명제(`exposed`) | `confirm` — 5분 뒤 확인 한 번(결정 2) |
 * | 그 확인에서 도움 없이 맞힘                  | `confirm` — 5분 뒤부터 다시 확인    |
 * | 그 확인에서도 도움 없이 맞힘                | 대기열에서 나간다                   |
 * | 어느 확인에서든 다시 틀림                   | `retry` — 1분 뒤 · 틀림의 수는 남는다 |
 *
 * 🔴 결정 2(원장님 승인 2026-10-16): 새로 드는 `exposed` 줄만 `confirm`·5분 뒤로 든다 — 실패 없이 끝나면 확인이 둘에서 하나다.
 *    1분 확인을 빼도 기억 유지가 같다는 것은 **못 확인**했다(운영 절충). `confirm`·확인 0 은 «이미 한 번 통과»가 아니다 — 화면도 그렇게 적지 않는다.
 *
 * 🔴 **1분 · 5분은 원장님이 주신 처음 값**이다. 재서 고른 값이 아니고, 학생마다 다르게 하지도 않는다 — 여기에 속도 배수나 곡선의 최적화를 넣지 않는다.
 * 🔴 **장기 일정과 따로 돈다.** 이 파일의 함수는 받은 학생 칸에서 `relearn` 만 바꾼 새 값을 돌려준다 — 개념의 안정도 · 난이도 · 복습일 · 횟수,
 *    열린 풀이, 날마다의 집계, 연속, 평가 영수증은 **읽기만** 한다. 같은 날 다시 맞힌 것은 장기의 성공이 아니고, 장기의 틀림을 지우지도 않는다.
 * 🔴 **대기열에 넣는 증거는 그 학생의 기록에서 다시 확인한 것뿐**이다 — 열린 풀이를 같은 규칙으로 다시 돌린 결과(단계의 넣기 차례)와
 *    저장된 평가 영수증 · 진단이다. 화면이 «틀렸다»고 말하는 것은 받지 않는다. 같은 증거는 한 번만 센다(`seen` — 풀이 × 단계 × 명제).
 * 🔴 **1분은 틀린 그때부터 잰다** — 화면은 틀린 자리에서 바로 알리고(풀고 있는 단계의 지금까지의 차례), 묶음의 평가를 기다리지 않는다.
 * 🔴 **시각은 부르는 쪽이 주는 밀리초**(UTC)다 — 학생 라우트는 서버의 시계를, 서버 없이 도는 길은 넣어 준 시계를 준다. 이 파일은 시계를 읽지 않는다.
 * 견주는 규칙은 `typed.ts` 하나다 — 못 알아본 글은 틀림이 아니라 대조(같은 뜻 / 다름)로 간다.
 * 바뀐 것이 없으면 받은 값을 그대로 돌려준다(저장 쪽이 «그대로면 쓰지 않는다»). 할 수 없는 일은 `FadingConflict` 로 던진다.
 */

/** 쓰는 쪽의 상한 — 읽는 쪽(`fading.contract.ts` 의 `FADING_RELEARN_STORED_*`)보다 좁다. 시험이 짝을 잠근다. */
export const FADING_RELEARN_ITEMS_MAX = 120;
export const FADING_RELEARN_SEEN_MAX = 160;
export const FADING_RELEARN_RECEIPTS_MAX = 32;

export const FADING_RELEARN_NOT_DUE = "아직 확인할 때가 아닙니다.";
export const FADING_RELEARN_GONE = "대기열에 없는 확인입니다.";
export const FADING_RELEARN_CHANGED =
  "확인할 내용이나 일정이 바뀌어 대기열을 다시 불러왔습니다.";
export const FADING_RELEARN_JUDGING = "기준안과 대조할 답이 남아 있습니다.";
export const FADING_RELEARN_INCOMPLETE = "빈칸을 다 채우지 않았습니다.";
export const FADING_RELEARN_NO_EVIDENCE =
  "이 풀이의 기록을 찾을 수 없어 대기열에 넣지 않았습니다.";

const conflict = (message: string) => new FadingConflict(message);
const DAY_MS = 86_400_000;

const EMPTY: StoredFadingRelearn = Object.freeze({
  version: 1,
  items: [],
  seen: [],
  graded: [],
  day: null,
}) as StoredFadingRelearn;

export function emptyFadingRelearn(): StoredFadingRelearn {
  return { version: 1, items: [], seen: [], graded: [], day: null };
}

/** 그 줄의 열쇠 — «개념/명제». */
export const fadingRelearnKey = (conceptId: string, propositionId: string) =>
  `${conceptId}/${propositionId}`;

/** 명제 하나의 내용 지문(16진 여덟 자) — 그 문장이 고쳐지면 달라진다. 다른 명제가 고쳐져도 그대로다. */
export function fadingPropositionDigest(
  proposition: FadingProposition,
): string {
  const content = [
    proposition.id,
    proposition.pieces.map((piece) =>
      piece.kind === "text" ? piece.text : `{${piece.target.text}}`,
    ),
  ];
  return fnv1a(JSON.stringify(content)).toString(16).padStart(8, "0");
}

/** 명제 하나의 표적 — 읽는 차례. 확인은 이것을 전부 지우고 쓴다. */
export function fadingPropositionTargets(
  proposition: FadingProposition,
): FadingTarget[] {
  return proposition.pieces.flatMap((piece) =>
    piece.kind === "target" ? [piece.target] : [],
  );
}

/**
 * 확인 하나의 토큰 — «그 줄의 지금 일정 + 지금 내용(개념 · 함정)»에서 짓는 UUID. 비밀이 아니다(제 대기열의 표지다).
 * 일정이 옮겨졌거나(새 틀림 · 앞선 확인의 판정) 은행의 문장 · 함정 표가 바뀌면 달라진다 — 옛 화면의 답을 받지 않으려고.
 * 견주기는 개념 전체(다른 명제의 답 · 함정)를 보므로 지문도 개념 전체의 것이다.
 */
export function fadingRelearnToken(
  item: Pick<
    StoredFadingRelearnItem,
    "conceptId" | "propositionId" | "since" | "stage" | "dueAt"
  >,
  concept: FadingConcept,
  traps: readonly FadingTrap[] = [],
): string {
  return fadingSessionToken(
    [
      "relearn",
      item.conceptId,
      item.propositionId,
      item.since,
      item.stage,
      item.dueAt,
    ].join("|"),
    fadingContentKey(concept, traps),
  );
}

/**
 * 그 줄을 확인할 수 있는 시각. 대조를 기다리던 답이 낡았으면(그 뒤에 문장이 고쳐졌다) 그 답은 판정하지 않고 다시 쓰게 하되,
 * 답을 쓴 때부터 1분은 지나야 한다 — 대조 화면에서 기준안을 봤을 수 있다.
 */
function dueAtOf(item: StoredFadingRelearnItem, digestNow: string): number {
  return item.pending && item.pending.digest !== digestNow
    ? Math.max(item.dueAt, item.pending.at + FADING_RELEARN_RETRY_MS)
    : item.dueAt;
}

/* ───────── 그날의 집계 · 걷기 ───────── */

function tallied(
  relearn: StoredFadingRelearn,
  now: number,
  add: { checks?: number; cleared?: number; entered?: number },
): StoredFadingRelearn["day"] {
  const on = kstDateOf(new Date(now));
  const day =
    relearn.day?.on === on
      ? relearn.day
      : { on, checks: 0, cleared: 0, entered: 0 };
  return {
    on,
    checks: day.checks + (add.checks ?? 0),
    cleared: day.cleared + (add.cleared ?? 0),
    entered: day.entered + (add.entered ?? 0),
  };
}

/*
 * 증거의 열쇠 — 한 번 센 증거를 다시 세지 않으려고 적어 둔다(`seen`).
 *   «개념|풀이의 차례|단계|명제»   그 풀이의 그 단계에서 그 명제를 틀렸다(4단계는 평가 때 적히는 진단도 같은 열쇠다)
 *   «개념|풀이의 차례|r»           그 풀이의 평가를 대기열에 알렸다
 * 풀이의 차례는 그 풀이가 만드는 복습 횟수다 — 열려 있는 동안은 «지금 횟수 + 1», 평가한 뒤에는 «지금 횟수».
 */
const traceKey = (
  conceptId: string,
  ordinal: number,
  step: number,
  propositionId: string,
) => `${conceptId}|${ordinal}|${step}|${propositionId}`;
const ratedKey = (conceptId: string, ordinal: number) =>
  `${conceptId}|${ordinal}|r`;

/** 그 풀이에서 그 명제의 틀림을 이미 센 가장 뒤 단계 — 없으면 0. */
function countedStep(
  seen: readonly string[],
  conceptId: string,
  ordinal: number,
  propositionId: string,
): number {
  let top = 0;
  for (const step of [2, 3, 4])
    if (seen.includes(traceKey(conceptId, ordinal, step, propositionId)))
      top = step;
  return top;
}

/** 오늘과 어제(한국 날짜) — 자정을 넘긴 풀이의 평가까지 받는다. */
const recentDays = (now: number) =>
  [now, now - DAY_MS].map((at) => kstDateOf(new Date(at)));

/**
 * 더는 확인할 수 없는 증거의 열쇠와, 빼 버린 개념의 줄을 걷는다.
 * 단계의 증거는 그 풀이가 열려 있는 동안만 다시 올 수 있다. 평가의 증거는 그 평가가 그 개념의 마지막 평가이고 · 영수증이 남아 있고 ·
 * 오늘이나 어제의 것인 동안만 다시 올 수 있다 — 그 뒤에는 열쇠가 없어도 같은 증거가 다시 적용될 길이 없다.
 * 풀이가 닫힌 뒤에도 그 풀이의 단계 열쇠는 평가를 알릴 때까지 둔다(평가의 증거가 «이미 센 명제»를 알아봐야 한다).
 */
function pruned(
  fading: StoredFading,
  relearn: StoredFadingRelearn,
  now: number,
): StoredFadingRelearn {
  const recent = recentDays(now);
  const seen = relearn.seen
    .filter((key) => {
      const [conceptId, ordinalText, code] = key.split("|");
      const stored = fading.concepts[conceptId!];
      if (!stored) return false;
      const ordinal = Number(ordinalText);
      const ratable =
        stored.reviews === ordinal &&
        recent.includes(stored.reviewedOn ?? "") &&
        fading.receipts.some((receipt) => receipt.conceptId === conceptId);
      if (code === "r") return ratable;
      const open =
        fading.session?.conceptId === conceptId &&
        stored.reviews + 1 === ordinal;
      return (
        open ||
        (ratable && !relearn.seen.includes(ratedKey(conceptId!, ordinal)))
      );
    })
    .slice(-FADING_RELEARN_SEEN_MAX);
  const items = relearn.items.filter((item) => fading.concepts[item.conceptId]);
  return seen.length === relearn.seen.length &&
    items.length === relearn.items.length
    ? relearn
    : { ...relearn, seen, items };
}

/* ───────── 증거 → 대기열 ───────── */

const ORIGIN_RANK: Record<FadingRelearnOrigin, number> = {
  exposed: 0,
  assisted: 1,
  lapsed: 2,
  missed: 3,
};

/** 틀린 표적 → 그 표적이 든 명제(명제 차례). */
function propositionsOf(
  concept: FadingConcept,
  targetIds: readonly string[],
): string[] {
  const missed = new Set(targetIds);
  return concept.propositions
    .filter((proposition) =>
      fadingPropositionTargets(proposition).some((t) => missed.has(t.id)),
    )
    .map((proposition) => proposition.id);
}

function withoutPending(item: StoredFadingRelearnItem) {
  const next = { ...item };
  delete next.pending;
  return next;
}

/**
 * 풀이의 한 단계에서 넣은 차례 — 마친 단계의 것이든, **풀고 있는 단계의 지금까지의 것**이든.
 * 그 학생의 **열린 풀이**(풀이 토큰 · 씨앗 · 방식)로 같은 규칙(`session.ts`)을 다시 돌려, 틀리게 넣었거나 넘긴 빈칸의 명제를 낸다.
 * 풀고 있는 단계의 것도 받는 까닭: 1분은 **틀린 그때부터** 잰다 — 묶음을 다 풀고 평가한 뒤부터가 아니다. 본 행동(`step`)이 먼저 올 필요가 없다.
 * 그 풀이가 닿지 않은 단계 · 그 풀이가 시작하기 전의 단계의 차례는 받지 않는다. 4단계는 그 자리에서 적어 둔 틀림(`missedAtFour`)도 같이 본다.
 * 못 알아본 글은 틀림이 아니다(대조 전이다) — 여기서 들지 않는다.
 */
function stepEvidence(
  fading: StoredFading,
  concept: FadingConcept,
  observation: Extract<FadingRelearnObservation, { kind: "step" }>,
  traps: readonly FadingTrap[],
) {
  const session = fading.session;
  const stored = fading.concepts[concept.id];
  if (!session || !stored || session.conceptId !== concept.id)
    throw conflict("이 풀이는 열려 있지 않습니다.");
  if (
    observation.sessionId !==
    fadingSessionToken(session.id, fadingContentKey(concept, traps))
  )
    throw conflict(FADING_CONTENT_CHANGED);
  const step = observation.step;
  if (step < session.startStep || step > stored.step)
    throw conflict("이 풀이에서 푼 단계가 아닙니다.");
  let replay: FadingSession = {
    ...startFadingSession(concept, step, session.seed, fadingModeOf(session)),
    startStep: session.startStep,
  };
  try {
    for (const placement of observation.placements) {
      if (replay.results.length) throw conflict("단계를 마친 뒤의 입력입니다.");
      replay = placeAnswer(replay, concept, placement, traps).session;
    }
    for (const propositionId of observation.gaveUpCards ?? [])
      if (!replay.results.length)
        replay = giveUpCard(replay, concept, propositionId);
    if (!replay.results.length && observation.gaveUp)
      replay = giveUpStep(replay, concept);
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : "잘못된 입력");
  }
  return {
    ordinal: stored.reviews + 1,
    step,
    propositions: propositionsOf(concept, [
      ...(replay.results[0]?.missed ?? replay.missed),
      ...(step === 4 ? session.missedAtFour : []),
    ]),
  };
}

/**
 * 평가로 닫은 증거 — 그 요청 번호가 **그 개념의 마지막 평가 영수증**이어야 한다(저장된 다음 복습일도 그 영수증의 것이어야 한다).
 * - `missed`: 4단계에서 «다시»를 건 빈칸(틀림 · 넘김 · «다름» — 평가 때 적힌 진단 `marks.missed`)의 명제.
 * - `lapsed`: 평가가 «다시»인데 빈칸마다의 진단이 없다(칩 풀이 · 스스로 고른 «다시» · 그 뒤에 문장이 고쳐졌다) — 어느 명제인지 알 수 없다.
 * - `fresh`: 그 개념의 **첫 평가**(처음 배운 풀이)다 — 틀리지 않은 명제도 답을 본 직후의 성공이라 한 번 따로 확인한다.
 * 평가한 날이 오늘이나 어제(자정을 넘긴 풀이)일 때만 받는다 — 며칠 묵은 평가를 «방금 틀린 것»으로 넣지 않는다(그 틀림은 장기 일정이 맡는다).
 */
function ratedEvidence(
  fading: StoredFading,
  concept: FadingConcept,
  observation: Extract<FadingRelearnObservation, { kind: "rated" }>,
  now: number,
) {
  const stored = fading.concepts[concept.id];
  const receipt = fading.receipts.findLast((r) => r.conceptId === concept.id);
  if (
    !stored ||
    !receipt ||
    receipt.requestId !== observation.requestId ||
    stored.reviews < 1 ||
    stored.dueOn !== receipt.dueOn ||
    !recentDays(now).includes(stored.reviewedOn ?? "")
  )
    throw conflict(FADING_RELEARN_NO_EVIDENCE);
  const marks =
    stored.marks?.digest === fadingConceptDigest(concept)
      ? stored.marks
      : undefined;
  const missed = new Set(propositionsOf(concept, marks?.missed ?? []));
  return {
    ordinal: stored.reviews,
    missed,
    lapsed: receipt.rating === "again" && missed.size === 0,
    fresh: stored.reviews === 1,
  };
}

const NOTHING: FadingRelearnApplied = {
  entered: 0,
  updated: 0,
  skipped: 0,
  duplicate: false,
};

type Entry = {
  propositionId: string;
  origin: "missed" | "lapsed" | "exposed";
  /** 이 증거를 센 뒤에 적어 둘 열쇠 — 명제마다의 열쇠가 없는 증거(`lapsed` · `exposed`)는 `null`. */
  key: string | null;
};

/**
 * 증거 하나를 대기열에 넣는다. 🔴 **1분은 그 증거를 받은 때부터다** — 화면은 틀린 그 자리에서 알린다(풀고 있는 단계의 차례 · 4단계의 틀림 하나).
 *
 * 세는 단위는 **풀이 × 단계 × 명제**다.
 * - 같은 풀이의 같은 단계 · **더 앞 단계**의 증거를 이미 센 명제는 건너뛴다 — 되풀이, 단계를 마친 뒤 다시 온 차례, 늦게 온 옛 증거가
 *   이미 잡힌 확인 시각을 미루지도, 5분 뒤를 기다리는 줄을 되돌리지도 않는다.
 * - **더 뒤 단계**에서 또 틀린 것은 새 틀림이다 — 1분 뒤로 되돌리고(5분 뒤를 기다리던 줄도) 틀림의 수 +1, 기다리던 대조는 걷는다.
 * - 평가의 증거: 4단계의 진단은 4단계의 열쇠로 센다(그 자리에서 이미 알린 틀림은 다시 세지 않는다 — «다름»으로 고른 것만 새 증거다).
 *   이 풀이에서 이미 증거를 센 명제는 `lapsed` · `exposed` 로 다시 넣지 않는다.
 * - `exposed`(처음 배운 풀이의 틀리지 않은 명제)는 **새 줄로만** 든다 — 이미 대기열에 있는 줄은 건드리지 않는다.
 *   새 줄은 `confirm`·5분 뒤 확인 한 번이다(결정 2 — 틀리면 그 확인의 규칙대로 `retry`·1분). 다른 까닭의 줄은 `retry`·1분이다.
 * 자리가 없으면(상한) 틀림이 먼저다 — 틀린 적 없는 `exposed` 줄 가운데 가장 먼저 든 것을 내보내고 들고, 그런 줄이 없으면 들지 못한다(`skipped`).
 * 증거가 있었는데 전부 이미 센 것이면 아무것도 하지 않는다(`duplicate`).
 */
export function observeFadingRelearn(
  fading: StoredFading,
  concept: FadingConcept,
  observation: FadingRelearnObservation,
  now: number,
  traps: readonly FadingTrap[] = [],
): { fading: StoredFading; applied: FadingRelearnApplied } {
  const relearn = fading.relearn ?? EMPTY;
  const seen = relearn.seen;
  let entries: Entry[];
  let carried: boolean;
  let closing: string | null = null;
  if (observation.kind === "step") {
    const evidence = stepEvidence(fading, concept, observation, traps);
    carried = evidence.propositions.length > 0;
    entries = evidence.propositions
      .filter(
        (propositionId) =>
          countedStep(seen, concept.id, evidence.ordinal, propositionId) <
          evidence.step,
      )
      .map((propositionId) => ({
        propositionId,
        origin: "missed",
        key: traceKey(
          concept.id,
          evidence.ordinal,
          evidence.step,
          propositionId,
        ),
      }));
  } else {
    const evidence = ratedEvidence(fading, concept, observation, now);
    closing = ratedKey(concept.id, evidence.ordinal);
    if (seen.includes(closing))
      return { fading, applied: { ...NOTHING, duplicate: true } };
    const counted = new Map(
      concept.propositions.map((p) => [
        p.id,
        countedStep(seen, concept.id, evidence.ordinal, p.id),
      ]),
    );
    // 빈칸마다의 진단이 없는 «다시»라도, 이 풀이의 4단계 틀림을 그 자리에서 세어 두었으면 어느 명제인지 아는 것이다.
    const known = [...counted.values()].includes(4);
    carried = evidence.missed.size > 0 || evidence.lapsed || evidence.fresh;
    entries = concept.propositions.flatMap((p): Entry[] => {
      if (evidence.missed.has(p.id))
        return counted.get(p.id) === 4
          ? []
          : [
              {
                propositionId: p.id,
                origin: "missed",
                key: traceKey(concept.id, evidence.ordinal, 4, p.id),
              },
            ];
      if (counted.get(p.id)) return [];
      if (evidence.lapsed && !known)
        return [{ propositionId: p.id, origin: "lapsed", key: null }];
      return evidence.fresh
        ? [{ propositionId: p.id, origin: "exposed", key: null }]
        : [];
    });
  }
  if (!entries.length)
    return { fading, applied: { ...NOTHING, duplicate: carried } };

  const retryAt = now + FADING_RELEARN_RETRY_MS;
  let items = [...relearn.items];
  const keys: string[] = [];
  const applied = { ...NOTHING };
  for (const entry of entries) {
    const proposition = concept.propositions.find(
      (p) => p.id === entry.propositionId,
    )!;
    const digest = fadingPropositionDigest(proposition);
    const at = items.findIndex(
      (item) =>
        item.conceptId === concept.id &&
        item.propositionId === entry.propositionId,
    );
    const failed = entry.origin !== "exposed";
    if (at >= 0) {
      if (!failed) continue;
      const item = withoutPending(items[at]!);
      items[at] = {
        ...item,
        digest,
        stage: "retry",
        dueAt: retryAt,
        origin:
          ORIGIN_RANK[entry.origin] > ORIGIN_RANK[item.origin]
            ? entry.origin
            : item.origin,
        fails: item.fails + 1,
      };
      applied.updated += 1;
    } else {
      if (items.length >= FADING_RELEARN_ITEMS_MAX) {
        const evict = failed
          ? items.findIndex(
              (item) =>
                item.origin === "exposed" && item.fails === 0 && !item.pending,
            )
          : -1;
        if (evict < 0) {
          applied.skipped += 1;
          continue;
        }
        items = items.filter((_, i) => i !== evict);
      }
      items.push({
        conceptId: concept.id,
        propositionId: entry.propositionId,
        digest,
        ...(failed
          ? { stage: "retry" as const, dueAt: retryAt }
          : {
              stage: "confirm" as const,
              dueAt: now + FADING_RELEARN_CONFIRM_MS,
            }),
        origin: entry.origin,
        since: now,
        fails: failed ? 1 : 0,
        checks: 0,
      });
      applied.entered += 1;
    }
    if (entry.key) keys.push(entry.key);
  }
  if (!applied.entered && !applied.updated) return { fading, applied };
  const next = pruned(
    fading,
    {
      ...relearn,
      items,
      seen: [...seen, ...keys, ...(closing ? [closing] : [])],
      day: tallied(relearn, now, { entered: applied.entered }),
    },
    now,
  );
  return { fading: { ...fading, relearn: next }, applied };
}

/* ───────── 확인 ───────── */

const MARK: Record<string, FadingRelearnTargetOutcome> = {
  c: "correct",
  w: "wrong",
  s: "skipped",
  u: "same",
  d: "different",
};
const MARK_OF = Object.fromEntries(
  Object.entries(MARK).map(([mark, outcome]) => [outcome, mark]),
) as Record<FadingRelearnTargetOutcome, string>;

function replayedResult(
  receipt: StoredFadingRelearnReceipt,
  concept: FadingConcept,
): FadingRelearnResult {
  const proposition = concept.propositions.find(
    (p) => p.id === receipt.propositionId,
  );
  const targets = proposition ? fadingPropositionTargets(proposition) : [];
  return {
    attemptId: receipt.attemptId,
    conceptId: receipt.conceptId,
    propositionId: receipt.propositionId,
    verdict: receipt.verdict,
    // 그 뒤에 문장이 고쳐져 표적의 수가 달라졌으면 되짚지 않는다.
    targets:
      targets.length === receipt.marks.length
        ? targets.map((target, i) => ({
            targetId: target.id,
            outcome: MARK[receipt.marks[i]!]!,
          }))
        : [],
    next: receipt.next,
    replayed: true,
  };
}

/** 쓴 글 하나의 결과 — 견주는 규칙은 `typed.ts` 다. 견줄 수 없는 글(빈 글 · 너무 긴 글)은 받지 않는다. */
function typedOutcome(
  concept: FadingConcept,
  targetId: string,
  text: string,
  traps: readonly FadingTrap[],
): FadingTypedOutcome {
  try {
    return fadingTypedOutcome(concept, targetId, text, traps);
  } catch (error) {
    throw conflict(error instanceof Error ? error.message : "잘못된 입력");
  }
}

function located(
  fading: StoredFading,
  concept: FadingConcept,
  propositionId: string,
) {
  const relearn = fading.relearn ?? EMPTY;
  const at = relearn.items.findIndex(
    (item) =>
      item.conceptId === concept.id && item.propositionId === propositionId,
  );
  const proposition = concept.propositions.find((p) => p.id === propositionId);
  if (at < 0 || !proposition || !fading.concepts[concept.id])
    throw conflict(FADING_RELEARN_GONE);
  return { relearn, at, item: relearn.items[at]!, proposition };
}

/**
 * 판정이 난 확인 하나를 대기열에 적는다 — 줄을 옮기고(또는 내보내고), 영수증과 그날의 집계를 적는다.
 * 틀림 · 도움은 1분 뒤로, 도움 없이 맞히면 `retry` 는 5분 뒤의 `confirm` 으로, `confirm` 은 대기열에서 나간다.
 */
function settled(
  fading: StoredFading,
  relearn: StoredFadingRelearn,
  at: number,
  verdict: StoredFadingRelearnReceipt["verdict"],
  outcomes: readonly FadingRelearnTargetOutcome[],
  attemptId: string,
  digest: string,
  now: number,
): { fading: StoredFading; receipt: StoredFadingRelearnReceipt } {
  const item = withoutPending(relearn.items[at]!);
  const moved: StoredFadingRelearnItem | null =
    verdict === "passed"
      ? item.stage === "retry"
        ? {
            ...item,
            digest,
            stage: "confirm",
            dueAt: now + FADING_RELEARN_CONFIRM_MS,
            checks: item.checks + 1,
          }
        : null
      : {
          ...item,
          digest,
          stage: "retry",
          dueAt: now + FADING_RELEARN_RETRY_MS,
          fails: item.fails + (verdict === "failed" ? 1 : 0),
          checks: item.checks + 1,
        };
  const receipt: StoredFadingRelearnReceipt = {
    attemptId,
    conceptId: item.conceptId,
    propositionId: item.propositionId,
    verdict,
    next: moved ? { stage: moved.stage, dueAt: moved.dueAt } : null,
    marks: outcomes.map((outcome) => MARK_OF[outcome]).join(""),
    at: now,
  };
  const next = pruned(
    fading,
    {
      ...relearn,
      items: relearn.items.flatMap((each, i) =>
        i === at ? (moved ? [moved] : []) : [each],
      ),
      graded: [...relearn.graded, receipt].slice(-FADING_RELEARN_RECEIPTS_MAX),
      day: tallied(relearn, now, { checks: 1, cleared: moved ? 0 : 1 }),
    },
    now,
  );
  return { fading: { ...fading, relearn: next }, receipt };
}

const resultOf = (
  receipt: StoredFadingRelearnReceipt,
  targets: readonly FadingTarget[],
  outcomes: readonly FadingRelearnTargetOutcome[],
): FadingRelearnResult => ({
  attemptId: receipt.attemptId,
  conceptId: receipt.conceptId,
  propositionId: receipt.propositionId,
  verdict: receipt.verdict,
  targets: targets.map((target, i) => ({
    targetId: target.id,
    outcome: outcomes[i]!,
  })),
  next: receipt.next,
  replayed: false,
});

/**
 * 확인 하나의 답을 받는다 — 그 명제의 표적을 전부 지우고 쓴 글이다.
 * - 같은 번호(`attemptId`)의 되풀이는 다시 적용하지 않고 처음의 결과를 돌려준다(틀림이 맞음으로 바뀌지 않는다).
 * - 확인 시각 전이면 받지 않는다. 다른 내용 · 옮겨진 일정의 토큰도 받지 않는다. 대조가 남아 있는 줄은 다시 쓸 수 없다.
 * - 틀린 글 · 넘긴 빈칸이 하나라도 있으면 틀림이다. 도움을 받았으면(`assisted`) 맞아도 1분 뒤 다시다.
 * - 못 알아본 글만 남으면 **판정하지 않고 적어 둔다**(`judging`) — 일정은 그대로이고, 학생의 대조(`judgeFadingRelearn`)를 기다린다.
 */
export function gradeFadingRelearn(
  fading: StoredFading,
  concept: FadingConcept,
  attempt: FadingRelearnAttempt,
  now: number,
  traps: readonly FadingTrap[] = [],
): { fading: StoredFading; result: FadingRelearnResult } {
  const done = fading.relearn?.graded.find(
    (receipt) => receipt.attemptId === attempt.attemptId,
  );
  if (done) return { fading, result: replayedResult(done, concept) };
  const { relearn, at, item, proposition } = located(
    fading,
    concept,
    attempt.propositionId,
  );
  const digest = fadingPropositionDigest(proposition);
  const targets = fadingPropositionTargets(proposition);
  const live = item.pending?.digest === digest ? item.pending : undefined;
  if (live?.attemptId === attempt.attemptId)
    return {
      fading,
      result: judgingResult(item, live, concept, targets, traps, true),
    };
  if (live) throw conflict(FADING_RELEARN_JUDGING);
  if (attempt.token !== fadingRelearnToken(item, concept, traps))
    throw conflict(FADING_RELEARN_CHANGED);
  if (now < dueAtOf(item, digest)) throw conflict(FADING_RELEARN_NOT_DUE);

  const written = new Map(attempt.answers.map((a) => [a.targetId, a.text]));
  if ([...written.keys()].some((id) => !targets.some((t) => t.id === id)))
    throw conflict("이 명제에 없는 빈칸입니다.");
  const outcomes = targets.map((target): FadingRelearnTargetOutcome => {
    const text = written.get(target.id);
    if (text !== undefined)
      return typedOutcome(concept, target.id, text, traps);
    if (!attempt.gaveUp) throw conflict(FADING_RELEARN_INCOMPLETE);
    return "skipped";
  });
  const failed = outcomes.some((o) => o === "wrong" || o === "skipped");
  if (!failed && !attempt.assisted && outcomes.includes("unknown")) {
    // 기준안을 보이기 전에 적는다 — 새로고침해도 같은 대조가 다시 선다.
    const pending = {
      attemptId: attempt.attemptId,
      at: now,
      digest,
      answers: targets.map((target) => ({
        targetId: target.id,
        text: written.get(target.id)!,
      })),
    };
    const waiting = { ...item, pending };
    return {
      fading: {
        ...fading,
        relearn: {
          ...relearn,
          items: relearn.items.map((each, i) => (i === at ? waiting : each)),
        },
      },
      result: judgingResult(waiting, pending, concept, targets, traps, false),
    };
  }
  const saved = settled(
    fading,
    relearn,
    at,
    failed ? "failed" : attempt.assisted ? "assisted" : "passed",
    outcomes,
    attempt.attemptId,
    digest,
    now,
  );
  return {
    fading: saved.fading,
    result: resultOf(saved.receipt, targets, outcomes),
  };
}

function judgingResult(
  item: StoredFadingRelearnItem,
  pending: NonNullable<StoredFadingRelearnItem["pending"]>,
  concept: FadingConcept,
  targets: readonly FadingTarget[],
  traps: readonly FadingTrap[],
  replayed: boolean,
): FadingRelearnResult {
  const written = new Map(pending.answers.map((a) => [a.targetId, a.text]));
  return {
    attemptId: pending.attemptId,
    conceptId: item.conceptId,
    propositionId: item.propositionId,
    verdict: "judging",
    targets: targets.map((target) => ({
      targetId: target.id,
      outcome: written.has(target.id)
        ? typedOutcome(concept, target.id, written.get(target.id)!, traps)
        : "skipped",
    })),
    next: { stage: item.stage, dueAt: item.dueAt },
    replayed,
  };
}

/**
 * 대조 — 적어 둔 답 가운데 못 알아본 글마다 학생이 고른 «같은 뜻 / 다름»으로 판정을 낸다.
 * 못 알아본 글을 전부 골라야 한다. «다름»이 하나라도 있으면 틀림(1분 뒤), 전부 «같은 뜻»이면 도움 없이 맞힌 것이다.
 * 답을 쓴 뒤에 그 문장이 고쳐졌으면 판정하지 않는다 — 고친 답과 견주면 다른 답에 이름을 붙이게 된다(다시 쓴다).
 * 같은 번호의 되풀이는 처음의 결과를 돌려준다.
 */
export function judgeFadingRelearn(
  fading: StoredFading,
  concept: FadingConcept,
  judgement: FadingRelearnJudgement,
  now: number,
  traps: readonly FadingTrap[] = [],
): { fading: StoredFading; result: FadingRelearnResult } {
  const done = fading.relearn?.graded.find(
    (receipt) => receipt.attemptId === judgement.attemptId,
  );
  if (done) return { fading, result: replayedResult(done, concept) };
  const { relearn, at, item, proposition } = located(
    fading,
    concept,
    judgement.propositionId,
  );
  const pending = item.pending;
  if (!pending || pending.attemptId !== judgement.attemptId)
    throw conflict("대조를 기다리는 확인이 아닙니다.");
  const digest = fadingPropositionDigest(proposition);
  if (pending.digest !== digest) throw conflict(FADING_RELEARN_CHANGED);
  const targets = fadingPropositionTargets(proposition);
  const written = new Map(pending.answers.map((a) => [a.targetId, a.text]));
  const typed = targets.map((target) =>
    written.has(target.id)
      ? typedOutcome(concept, target.id, written.get(target.id)!, traps)
      : ("wrong" as const),
  );
  const waiting = new Set(
    targets.filter((_, i) => typed[i] === "unknown").map((t) => t.id),
  );
  const chosen = Object.keys(judgement.judged);
  if (chosen.some((id) => !waiting.has(id)))
    throw conflict("대조를 기다리는 빈칸이 아닙니다.");
  if (chosen.length !== waiting.size)
    throw conflict("기준안과 대조할 답을 다 골라 주세요.");
  const outcomes = targets.map((target, i): FadingRelearnTargetOutcome =>
    typed[i] === "unknown" ? judgement.judged[target.id]! : typed[i]!,
  );
  const failed = outcomes.some((o) => o === "wrong" || o === "different");
  const saved = settled(
    fading,
    relearn,
    at,
    failed ? "failed" : "passed",
    outcomes,
    judgement.attemptId,
    digest,
    now,
  );
  return {
    fading: saved.fading,
    result: resultOf(saved.receipt, targets, outcomes),
  };
}

/* ───────── 행동 하나 · 화면에 내려가는 꼴 ───────── */

/** 그 행동이 가리키는 개념의 열쇠. */
export function fadingRelearnActionConceptId(action: FadingRelearnAction) {
  return action.action === "record"
    ? action.observation.conceptId
    : action.action === "grade"
      ? action.attempt.conceptId
      : action.judgement.conceptId;
}

/**
 * 행동 하나를 학생 칸에 적용한다 — 학생 라우트(`relearnRoutes.ts`)와 서버 없이 도는 길(`relearnLocal.ts`)이 **이 함수 하나**를 쓴다.
 * 돌려주는 `fading` 은 `relearn` 칸만 바뀐 값이다(바뀐 것이 없으면 받은 값 그대로).
 */
export function applyFadingRelearnAction(
  fading: StoredFading,
  action: FadingRelearnAction,
  concept: FadingConcept,
  now: number,
  traps: readonly FadingTrap[] = [],
): {
  fading: StoredFading;
  applied: FadingRelearnApplied | null;
  result: FadingRelearnResult | null;
} {
  switch (action.action) {
    case "record": {
      const next = observeFadingRelearn(
        fading,
        concept,
        action.observation,
        now,
        traps,
      );
      return { ...next, result: null };
    }
    case "grade": {
      const next = gradeFadingRelearn(
        fading,
        concept,
        action.attempt,
        now,
        traps,
      );
      return { ...next, applied: null };
    }
    case "judge": {
      const next = judgeFadingRelearn(
        fading,
        concept,
        action.judgement,
        now,
        traps,
      );
      return { ...next, applied: null };
    }
  }
}

const zeroDay = (now: number) => ({
  on: kstDateOf(new Date(now)),
  checks: 0,
  cleared: 0,
  entered: 0,
});

const STATE_RANK = { judging: 0, ready: 1, waiting: 2 } as const;

/**
 * 화면에 내려가는 대기열 — 저장 칸과 은행의 개념에서. `now` 는 부르는 쪽의 시계(밀리초)다.
 * 은행에서 사라진 개념 · 명제의 줄, 빼 버린 개념의 줄은 내려가지 않는다(확인할 내용이 없다).
 * `enabled` 가 `false` 면(쓰는 길이 닫혀 있다) 저장 칸을 보지 않고 빈 대기열을 낸다.
 */
export function fadingRelearnQueueView(input: {
  fading: StoredFading;
  concepts: ReadonlyMap<string, FadingConcept>;
  now: number;
  trapsOf?: (concept: FadingConcept) => readonly FadingTrap[];
  enabled?: boolean;
}): FadingRelearnQueue {
  const { fading, concepts, now } = input;
  const enabled = input.enabled !== false;
  const relearn = enabled ? (fading.relearn ?? EMPTY) : EMPTY;
  const items: FadingRelearnItem[] = [];
  const contents: FadingRelearnQueue["contents"] = {};
  for (const item of relearn.items) {
    const concept = concepts.get(item.conceptId);
    const proposition = concept?.propositions.find(
      (p) => p.id === item.propositionId,
    );
    if (!concept || !proposition || !fading.concepts[item.conceptId]) continue;
    const traps = input.trapsOf?.(concept) ?? [];
    const digest = fadingPropositionDigest(proposition);
    const pending = item.pending?.digest === digest ? item.pending : undefined;
    const dueAt = dueAtOf(item, digest);
    items.push({
      key: fadingRelearnKey(item.conceptId, item.propositionId),
      conceptId: item.conceptId,
      propositionId: item.propositionId,
      token: fadingRelearnToken(item, concept, traps),
      state: pending ? "judging" : now >= dueAt ? "ready" : "waiting",
      stage: item.stage,
      origin: item.origin,
      dueAt,
      waitMs: pending ? 0 : Math.max(0, dueAt - now),
      since: item.since,
      fails: item.fails,
      checks: item.checks,
      changed: item.digest !== digest,
      ...(pending
        ? {
            pending: {
              attemptId: pending.attemptId,
              answers: pending.answers.map((answer) => ({
                ...answer,
                outcome: typedOutcome(
                  concept,
                  answer.targetId,
                  answer.text,
                  traps,
                ),
              })),
            },
          }
        : {}),
    });
    contents[concept.id] ??= {
      concept,
      traps: traps.map((trap) => ({ text: trap.text })),
    };
  }
  items.sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      a.dueAt - b.dueAt ||
      a.since - b.since ||
      (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  const waiting = items.filter((item) => item.state === "waiting");
  const today = zeroDay(now);
  return {
    enabled,
    now,
    intervals: {
      retryMs: FADING_RELEARN_RETRY_MS,
      confirmMs: FADING_RELEARN_CONFIRM_MS,
    },
    items,
    contents,
    counts: {
      judging: items.filter((item) => item.state === "judging").length,
      ready: items.filter((item) => item.state === "ready").length,
      waiting: waiting.length,
    },
    nextDueAt: waiting.length ? waiting[0]!.dueAt : null,
    today: relearn.day?.on === today.on ? { ...relearn.day } : today,
  };
}
