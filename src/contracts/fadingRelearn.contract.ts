import { z } from "zod";
import {
  FADING_PLACEMENTS_MAX,
  FADING_TARGETS_MAX,
  FADING_TYPED_MAX,
  fadingConceptIdSchema,
  fadingJudgedSchema,
  fadingPlacementSchema,
  storedFadingRelearnItemSchema,
} from "@/contracts/fading.contract";
import { fadingConceptSchema } from "@/contracts/fadingApi.contract";

/**
 * «오늘의 기억» — 단기 재학습 대기열의 계약 (`docs/planning/srs-explorer-integration-20261007.md` «일정의 두 층»).
 *
 *   GET  /api/learn/fading/relearn   대기열 — 서버의 지금 · 지금 확인할 것 · 기다리는 것 · 그 명제의 내용
 *   POST /api/learn/fading/relearn   행동 하나(`record` 증거 알리기 · `grade` 확인의 답 내기 · `judge` 대조) → 대기열과 그 결과
 *
 * 화면은 `FadingRelearnSource`(`src/lib/fading/relearnSource.ts`)로 받는다 — `FadingSource` 와 따로 선 길이다.
 * 장기 일정(FSRS)과 **따로** 돈다: 이 길은 학생 기록의 `fading.relearn` 칸만 쓰고, 개념의 안정도 · 난이도 · 복습일 · 횟수 · 연속 · 날마다의 집계 ·
 * 열린 풀이 · 탐험의 기록을 하나도 바꾸지 않는다. 같은 날 다시 맞힌 것을 장기 성공으로 세지 않고, 장기의 틀림을 덮지도 않는다.
 *
 * 🔴 **간격은 둘뿐이다** — 틀림 · 넘김 · 도움 · 답을 본 직후는 1분 뒤, 도움 없이 맞히면 5분 뒤, 그때도 맞히면 대기열에서 나간다. 다시 틀리면 1분 뒤다.
 *    원장님이 주신 처음 값이다. 재서 고른 값도, 학생마다 맞춘 값도 아니다 — 속도 배수 · 학습 곡선의 최적화는 없다.
 * 🔴 **단위는 명제 하나**다(묶음은 명제 3 ~ 5개). 확인은 그 명제의 표적을 전부 지우고 자판으로 쓴다.
 * 🔴 **시각은 서버의 시계**(1970년부터의 밀리초 · UTC)다. 화면은 기기의 시계가 아니라 응답의 `now` 에서 센다.
 * 🔴 **증거는 서버가 다시 확인한다.** 화면이 «틀렸다»고 말하는 것을 받지 않는다 — 그 학생의 열린 풀이를 같은 규칙으로 다시 돌리거나(`step`),
 *    저장된 평가 영수증과 진단을 읽는다(`rated`). 다른 학생의 대기열에 닿는 길이 없다(대기열은 로그인한 학생의 기록 안에 있다).
 * 🔴 못 알아본 글(뜻이 같은 다른 말일 수 있다)은 틀림이 아니다 — 받아 **적어 둔 뒤에** 기준안과 나란히 놓고 학생이 «같은 뜻 / 다름»을 고른다.
 */

/** 단기 재학습의 간격(밀리초) — 계약의 값이다. 규칙은 `src/lib/fading/relearn.ts` 가 이 값으로 돈다. */
export const FADING_RELEARN_RETRY_MS = 60_000;
export const FADING_RELEARN_CONFIRM_MS = 300_000;

const epochMs = z.number().int().min(0);
const count = z.number().int().min(0);
const targetId = z.string().min(3).max(80);
const propositionId = z.string().min(1).max(80);

export const fadingRelearnStageSchema =
  storedFadingRelearnItemSchema.shape.stage;
export const fadingRelearnOriginSchema =
  storedFadingRelearnItemSchema.shape.origin;
export type FadingRelearnStage = z.infer<typeof fadingRelearnStageSchema>;
export type FadingRelearnOrigin = z.infer<typeof fadingRelearnOriginSchema>;

/* ───────── 증거 — 풀이 화면이 이미 보낸 행동에서 나온다 ───────── */

/**
 * 풀이에서 생긴 증거 하나. 화면은 풀이의 행동(또는 그 꼴의 값)을 `fadingRelearnObservationOf` 에 넣어 얻는다(`withFadingRelearn` 이 마친 행동을 대신 알린다).
 * - `step` 한 단계(2 ~ 4)에서 넣은 차례 — 마친 단계의 것이든, **풀고 있는 단계의 지금까지의 것**이든(틀린 것까지 넣은 차례 그대로).
 *   서버가 그 학생의 열린 풀이(풀이 토큰 · 씨앗 · 방식)로 다시 돌려, 틀리게 넣었거나 넘긴 빈칸의 명제를 대기열에 넣는다.
 *   🔴 1분은 이 증거를 받은 때부터다 — 화면은 **틀린 그 자리에서** 보낸다(묶음을 다 풀고 평가한 뒤가 아니다). 본 행동(`step`)을 먼저 보낼 필요가 없다.
 *   `gaveUp` 은 그 단계 전체의 «아직 모르겠어요»(못 채운 빈칸 전부), `gaveUpCards` 는 자판으로 푸는 단계에서 넘긴 카드(명제)다.
 *   못 알아본 글은 여기서 틀림이 아니다 — 평가 때 «다름»으로 고르면 그때 틀림이 된다.
 * - `rated` 평가로 닫았다 — 그 평가의 요청 번호. 서버가 그 개념의 마지막 영수증과 진단(`marks.missed` — 4단계의 틀림 · 넘김 · «다름»)을 읽는다.
 *   처음 배운 개념이면 틀리지 않은 명제도 «답을 본 직후»라 한 번 확인한다(`exposed` — 틀림이 아니다).
 * 세는 단위는 **풀이 × 단계 × 명제**다 — 같은 증거 · 더 앞 단계의 증거가 다시 와도 다시 세지 않고, 잡힌 확인 시각을 미루지도, 줄의 단계를 되돌리지도 않는다.
 */
export const fadingRelearnObservationSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("step"),
    conceptId: fadingConceptIdSchema,
    /** 풀이의 번호 — 상태의 `session.id`(내용의 토큰). */
    sessionId: z.uuid(),
    step: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    placements: z.array(fadingPlacementSchema).max(FADING_PLACEMENTS_MAX),
    gaveUp: z.boolean().optional(),
    gaveUpCards: z.array(propositionId).max(FADING_TARGETS_MAX).optional(),
  }),
  z.strictObject({
    kind: z.literal("rated"),
    conceptId: fadingConceptIdSchema,
    requestId: z.uuid(),
  }),
]);
export type FadingRelearnObservation = z.infer<
  typeof fadingRelearnObservationSchema
>;

/** 증거 하나가 대기열에 한 일 — 새로 든 줄 · 고쳐진 줄 · 자리가 없어 못 든 줄 · 이미 센 증거였는가. */
export const fadingRelearnAppliedSchema = z.strictObject({
  entered: count,
  updated: count,
  skipped: count,
  duplicate: z.boolean(),
});
export type FadingRelearnApplied = z.infer<typeof fadingRelearnAppliedSchema>;

/* ───────── 확인 — 명제 하나를 자판으로 ───────── */

const typedAnswerSchema = z.strictObject({
  targetId,
  text: z.string().min(1).max(FADING_TYPED_MAX),
});

/**
 * 확인 하나의 답 — 그 명제의 표적마다 쓴 글. 🔴 맞다 · 틀리다와 기준안을 보이기 **전에** 보낸다.
 * `gaveUp` 은 «아직 모르겠어요» — 안 쓴 표적이 넘김(틀림)이 된다. 없으면 표적을 전부 써야 한다.
 * `assisted` 는 도움을 받아 채웠다(답을 보고 썼다) — 맞아도 «도움 없이 맞힘»이 아니다(1분 뒤 다시).
 * `token` 은 대기열이 준 그 확인의 토큰이다 — 내용이 바뀌었거나 일정이 옮겨진 뒤의 요청을 받지 않는다.
 * `attemptId` 는 화면이 짓는다(`newFadingId`) — 같은 번호로 다시 보내면 한 번만 적용되고 처음의 결과가 돌아간다.
 */
export const fadingRelearnAttemptSchema = z
  .strictObject({
    conceptId: fadingConceptIdSchema,
    propositionId,
    token: z.uuid(),
    attemptId: z.uuid(),
    answers: z.array(typedAnswerSchema).max(FADING_TARGETS_MAX),
    gaveUp: z.boolean().optional(),
    assisted: z.boolean().optional(),
  })
  .refine(
    (attempt) =>
      new Set(attempt.answers.map((answer) => answer.targetId)).size ===
      attempt.answers.length,
    "같은 빈칸의 답이 두 번 있습니다.",
  );
export type FadingRelearnAttempt = z.infer<typeof fadingRelearnAttemptSchema>;

/** 대조 — 못 알아본 글마다 «같은 뜻 / 다름». 전부 골라야 판정이 난다. «다름»이 하나라도 있으면 틀림이다. */
export const fadingRelearnJudgementSchema = z.strictObject({
  conceptId: fadingConceptIdSchema,
  propositionId,
  attemptId: z.uuid(),
  judged: fadingJudgedSchema,
});
export type FadingRelearnJudgement = z.infer<
  typeof fadingRelearnJudgementSchema
>;

export const fadingRelearnVerdictSchema = z.enum([
  "passed",
  "failed",
  "assisted",
  "judging",
]);
export type FadingRelearnVerdict = z.infer<typeof fadingRelearnVerdictSchema>;

/** 표적 하나의 결과 — `unknown` 은 대조를 기다리는 글, `same` · `different` 는 학생이 고른 것, `skipped` 는 넘긴 것. */
export const fadingRelearnTargetOutcomeSchema = z.enum([
  "correct",
  "wrong",
  "skipped",
  "unknown",
  "same",
  "different",
]);
export type FadingRelearnTargetOutcome = z.infer<
  typeof fadingRelearnTargetOutcomeSchema
>;

export const fadingRelearnResultSchema = z.strictObject({
  attemptId: z.uuid(),
  conceptId: fadingConceptIdSchema,
  propositionId,
  /** `judging` 은 아직 판정 전이다 — 대조(`judge`)를 기다린다. 일정은 그대로다. */
  verdict: fadingRelearnVerdictSchema,
  /** 표적 차례. 내용이 그 뒤에 바뀌어 되짚을 수 없으면 비어 있다. */
  targets: z.array(
    z.strictObject({ targetId, outcome: fadingRelearnTargetOutcomeSchema }),
  ),
  /** 이 확인 뒤의 자리 — 대기열에서 나갔으면 `null`. */
  next: z
    .strictObject({ stage: fadingRelearnStageSchema, dueAt: epochMs })
    .nullable(),
  /** 같은 번호의 되풀이였다 — 다시 적용하지 않고 처음의 결과를 돌려준 것이다. */
  replayed: z.boolean(),
});
export type FadingRelearnResult = z.infer<typeof fadingRelearnResultSchema>;

/* ───────── 대기열 ───────── */

export const fadingRelearnItemSchema = z.strictObject({
  /** «개념/명제» — 그 줄의 바뀌지 않는 열쇠. */
  key: z.string().min(3),
  conceptId: fadingConceptIdSchema,
  propositionId,
  /** 이 확인의 토큰 — 지금 내용 · 지금 일정에서 지은 것(`grade` 에 실어 보낸다). */
  token: z.uuid(),
  /** `judging` 대조를 기다린다 · `ready` 지금 확인할 수 있다 · `waiting` 아직 때가 아니다. */
  state: z.enum(["judging", "ready", "waiting"]),
  stage: fadingRelearnStageSchema,
  origin: fadingRelearnOriginSchema,
  dueAt: epochMs,
  /** 확인할 수 있을 때까지 남은 밀리초(서버의 지금에서) — 준비됐으면 0. */
  waitMs: count,
  since: epochMs,
  fails: count,
  checks: count,
  /** 대기열에 든 뒤에 그 명제의 문장이 고쳐졌다 — 확인은 지금 문장으로 한다. */
  changed: z.boolean(),
  /**
   * 대조를 기다리는 답(`judging` 일 때만) — 쓴 글과, 그 글이 맞은 것인지 못 알아본 것인지. 못 알아본 것(`unknown`)만 고른다.
   * `wrong` 은 답을 낸 뒤에 견주는 규칙이 바뀌어 틀림으로 읽히게 된 글이다(드물다) — 고를 것이 없고, 대조를 보내면 틀림으로 판정된다.
   */
  pending: z
    .strictObject({
      attemptId: z.uuid(),
      answers: z.array(
        z.strictObject({
          targetId,
          text: z.string(),
          outcome: z.enum(["correct", "unknown", "wrong"]),
        }),
      ),
    })
    .optional(),
});
export type FadingRelearnItem = z.infer<typeof fadingRelearnItemSchema>;

/** 대기열의 줄이 가리키는 개념의 내용(답 포함 — 풀이 화면이 받는 것과 같은 꼴) · 그 함정의 글. 그림은 싣지 않는다. */
export const fadingRelearnContentSchema = z.strictObject({
  concept: fadingConceptSchema,
  traps: z.array(z.strictObject({ text: z.string() })),
});

export const fadingRelearnQueueSchema = z.strictObject({
  /** 쓰는 길이 열려 있는가(서버 문 `MATH_FADING_RELEARN`). 닫혀 있으면 대기열은 늘 비어 있고 행동은 404 다. */
  enabled: z.boolean(),
  /** 서버의 지금 — 화면은 여기서 센다. */
  now: epochMs,
  intervals: z.strictObject({
    retryMs: z.literal(FADING_RELEARN_RETRY_MS),
    confirmMs: z.literal(FADING_RELEARN_CONFIRM_MS),
  }),
  /** 대조를 기다리는 것 → 지금 확인할 것(먼저 때가 된 것부터) → 기다리는 것(곧 될 것부터). */
  items: z.array(fadingRelearnItemSchema),
  /** 개념의 열쇠 → 내용. 위의 줄이 가리키는 개념만 있다. */
  contents: z.record(fadingConceptIdSchema, fadingRelearnContentSchema),
  counts: z.strictObject({ judging: count, ready: count, waiting: count }),
  /** 기다리는 줄 가운데 가장 이른 확인 시각 — 그때 다시 읽는다. 없으면 `null`. */
  nextDueAt: epochMs.nullable(),
  /** 오늘(한국 날짜)의 집계 — 판정이 난 확인 · 나간 줄 · 새로 든 줄. 기본 분량과 따로 센다. */
  today: z.strictObject({
    on: z.iso.date(),
    checks: count,
    cleared: count,
    entered: count,
  }),
});
export type FadingRelearnQueue = z.infer<typeof fadingRelearnQueueSchema>;

/* ───────── 요청 · 응답 ───────── */

export const fadingRelearnActionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("record"),
    observation: fadingRelearnObservationSchema,
  }),
  z.strictObject({
    action: z.literal("grade"),
    attempt: fadingRelearnAttemptSchema,
  }),
  z.strictObject({
    action: z.literal("judge"),
    judgement: fadingRelearnJudgementSchema,
  }),
]);
export type FadingRelearnAction = z.infer<typeof fadingRelearnActionSchema>;

export const fadingRelearnQueueResponseSchema = z.strictObject({
  data: fadingRelearnQueueSchema,
});
export const fadingRelearnActionResponseSchema = z.strictObject({
  data: z.strictObject({
    queue: fadingRelearnQueueSchema,
    /** `record` 였으면 그 증거가 한 일, 아니면 `null`. */
    applied: fadingRelearnAppliedSchema.nullable(),
    /** `grade` · `judge` 였으면 그 결과, 아니면 `null`. */
    result: fadingRelearnResultSchema.nullable(),
  }),
});

/** 화면이 «이 요청은 이 학생의 것»이라고 싣는 머리(선택) — 값은 학생 id. 로그인한 학생과 다르면 기록을 읽기 전에 409 다. */
export const FADING_RELEARN_STUDENT_HEADER = "x-student-id";
