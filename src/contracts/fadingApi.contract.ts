import { z } from "zod";
import {
  CONCEPT_BLANK_LEVELS,
  sectionKeySchema,
} from "@/contracts/conceptBlank.contract";
import {
  FADING_PLACEMENTS_MAX,
  fadingConceptIdSchema,
  fadingJudgedSchema,
  fadingMarksTextSchema,
  fadingPlacementSchema,
  fadingRatingSchema,
  storedFadingDaySchema,
  storedFadingReceiptSchema,
  storedFadingUnjudgedSchema,
} from "@/contracts/fading.contract";
import { CONCEPT_KINDS } from "@/lib/math-explorers/conceptKinds";

/**
 * «오늘의 기억» — 학생 API 의 계약 (`docs/planning/srs-overhaul-20261006.md` §14).
 *
 *   GET  /api/learn/fading                  홈 · 통계가 읽는 상태
 *   POST /api/learn/fading                  행동 하나(고르기 · 풀이 열기 · 단계 마치기 · 평가 …) → 같은 꼴의 상태
 *   GET  /api/learn/fading/catalog?grade=   개념 목록(학년 하나)
 *   GET  /api/learn/fading/concepts/{id}    개념 하나의 내용(읽기 · 연습)
 *
 * 화면은 개념의 내용(답 포함)을 받아 `src/lib/fading/session.ts` 로 그 자리에서 채점하고, 서버는 같은 규칙으로 다시 돌려 확인한다.
 * 🔴 전체를 한 값으로 뭉친 점수는 없다 — 세는 값(오늘의 복습 · 연속 · 단계별 수)과 개념마다의 다음 복습 · 망각 위험(추정)뿐이다.
 */

const dateSchema = z.iso.date();
const stepSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
const levelSchema = z.enum(CONCEPT_BLANK_LEVELS);
const count = z.number().int().min(0);

/** 은행의 학년 — 소단원 열쇠의 첫 토막. */
export const fadingGradeSchema = z.string().regex(/^(초[1-6]|중[1-3])$/);

/* ───────── 개념의 내용 — `concepts.ts` 의 `FadingConcept` 꼴 그대로 ───────── */

const targetSchema = z.strictObject({
  id: z.string(),
  text: z.string(),
  tier: z.enum(["text", "math"]),
});
const pieceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: z.string() }),
  z.strictObject({ kind: z.literal("target"), target: targetSchema }),
]);
export const fadingConceptSchema = z.strictObject({
  id: fadingConceptIdSchema,
  section: sectionKeySchema,
  level: levelSchema,
  ordinal: z.number().int().min(1),
  siblings: z.number().int().min(1),
  propositions: z
    .array(
      z.strictObject({
        id: z.string(),
        term: z.string(),
        kind: z.enum(CONCEPT_KINDS),
        pieces: z.array(pieceSchema),
      }),
    )
    .min(1),
});

/** 화면에 내려가는 함정 칩 — 글뿐이다(왜 함정인지는 채점 전에 싣지 않는다). 검증된 표가 생기기 전에는 늘 비어 있다. */
const trapSchema = z.strictObject({ text: z.string() });

/**
 * 풀이 화면의 그림 판에 그릴 그림 — 개념 백지 은행의 그림 문항에서 온다(그 개념의 소단원에 그림이 있을 때만).
 * `svg` 는 바깥 `<svg>` 없는 조각이고 `viewBox` 가 따로 온다. `tags` 는 이름표의 자리(viewBox 좌표 · 높이 18)와 답이다.
 * 🔴 이름표의 답은 빈칸의 답과 겹칠 수 있다 — 화면은 1단계 정독과 단계를 마친 뒤의 대조에서만 답을 보이고, 2 ~ 4단계에서는 빈 상자로 그린다.
 */
export const fadingFigureSchema = z.strictObject({
  id: z.string(),
  viewBox: z.string(),
  svg: z.string(),
  tags: z.array(
    z.strictObject({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      answer: z.string(),
    }),
  ),
});

/** 개념의 내용과 그 칩 재료 — 화면이 `chipTray(개념, 단계, { seed, traps })` 로 서버와 같은 칩 묶음을 낸다. */
export const fadingContentSchema = z.strictObject({
  concept: fadingConceptSchema,
  traps: z.array(trapSchema),
  /** 그림 판의 그림 — 그 소단원에 그림이 없으면 `null`(화면은 판을 그리지 않는다). */
  figure: fadingFigureSchema.nullable(),
});

/* ───────── 개념 하나의 상태 ───────── */

export const fadingConceptStatusSchema = z.strictObject({
  id: fadingConceptIdSchema,
  section: sectionKeySchema,
  level: levelSchema,
  ordinal: z.number().int().min(1),
  siblings: z.number().int().min(1),
  /** 그 개념의 명제들의 용어 — 목록에서 개념을 알아보는 이름. */
  terms: z.array(z.string()).min(1),
  /** 표적(빈칸이 될 자리)의 수. */
  targets: z.number().int().min(1),
  /** 서 있는 단계 — 다음 풀이가 시작하는 단계. */
  step: stepSchema,
  /** 평가한 적이 있다 — «배운 개념». 다 외웠다는 뜻이 아니다. */
  rated: z.boolean(),
  reviews: count,
  lapses: count,
  addedOn: dateSchema,
  reviewedOn: dateSchema.nullable(),
  dueOn: dateSchema.nullable(),
  /** 다음 복습까지 남은 날 — 0 은 오늘, 음수는 밀린 날 수. 평가 전이면 `null`. */
  daysUntil: z.number().int().nullable(),
  /** 망각 위험(0 ~ 1) — 일정 계산기의 **추정**이다. 평가 전이면 `null`. */
  risk: z.number().min(0).max(1).nullable(),
  /** 마지막 평가 뒤에 은행의 문장이 바뀌었다. */
  changed: z.boolean(),
});
export type FadingConceptStatus = z.infer<typeof fadingConceptStatusSchema>;

/* ───────── 상태(홈 · 통계 · 풀이) ───────── */

const sessionViewSchema = z.strictObject({
  id: z.uuid(),
  conceptId: fadingConceptIdSchema,
  startStep: stepSchema,
  /** 지금 풀 단계(= 그 개념이 서 있는 단계). */
  step: stepSchema,
  seed: z.number().int(),
  phase: z.enum(["steps", "rating"]),
  missedAtFour: z.array(z.string()),
  /**
   * 지금 고를 수 있는 평가와, 고르면 잡히는 다음 복습까지의 날 수. 평가 차례가 아니면 비어 있다.
   * 대조를 기다리는 글이 있으면 «다 같은 뜻»일 때의 것이다 — 화면은 `fadingRatingsAfterJudging` 으로 고른 것에 맞춰 좁힌다.
   */
  ratings: z.array(
    z.strictObject({
      rating: fadingRatingSchema,
      intervalDays: z.number().int().min(1),
    }),
  ),
  /*
   * 아래는 카드 풀이(4단계 A′ 합의 2026-10-07)에서만 실리는 칸이다 — 값이 없으면 키도 없다(지금 화면이 받는 꼴 그대로).
   * 🔴 응답의 꼴은 모르는 키를 거절한다 — 이 칸을 읽는 판(화면)이 그 칸을 싣는 판보다 먼저 나간다.
   */
  /** 카드 풀이 — 1단계 카드 · 4단계 자판. 없으면 칩 풀이다. 풀이를 연 때 정해져 끝까지 그대로다. */
  mode: z.literal("cards").optional(),
  /** 평가 차례에서 학생의 대조를 기다리는 글(빈칸 차례). 새로고침해도 같은 대조가 다시 선다. */
  unjudged: z.array(storedFadingUnjudgedSchema).optional(),
  /**
   * 카드 풀이에서 4단계를 푼 뒤에 개념의 문장이 고쳐졌다 — 대조를 기다리는 글은 판정하지 않고 평가는 «다시»뿐이다(`ratings`).
   * 평가는 푼 내용의 지문으로 적힌다. 풀이 중의 옛 화면 요청은 이 칸이 아니라 풀이 토큰의 409 가 막는다(`contentKey.ts`).
   */
  stale: z.literal(true).optional(),
  /**
   * 이 풀이의 4단계에서 «아직 모르겠어요»를 고른 적이 있는가(저장 칸 그대로 · 결정 1). 화면은 부분 틀림의 «어려움» 판정에 서버와 같은 재료로 쓴다.
   * 🔴 이 칸을 읽는 판(화면)이 싣는 판보다 먼저 나간다 — 1a 는 읽기만 한다.
   */
  gaveUpAtFour: z.boolean().optional(),
});

/** 통계 탭에 내려가는 날 수(여덟 주). */
export const FADING_VIEW_DAYS = 56;

export const fadingStateSchema = z.strictObject({
  today: dateSchema,
  revision: count,
  /** 하루에 내는 복습의 상한(«나눠서»). */
  cap: z.number().int().min(1),
  summary: z.strictObject({
    mode: z.enum(["split", "all"]),
    streak: z.strictObject({ current: count, best: count }),
    learned: count,
    stepCounts: z.strictObject({ 1: count, 2: count, 3: count, 4: count }),
    queue: z.strictObject({
      due: z.array(fadingConceptIdSchema),
      held: z.array(fadingConceptIdSchema),
      unrated: z.array(fadingConceptIdSchema),
    }),
    /** 오늘의 복습 — 한 것과, 한 것에 오늘 남은 것을 더한 수(처음 배운 것은 넣지 않는다). */
    plan: z.strictObject({ done: count, total: count }),
    todayCount: z.strictObject({ reviews: count, passed: count, fresh: count }),
    /** 마지막으로 평가를 닫은 날 — 한 번도 없으면 `null`. */
    lastOn: dateSchema.nullable(),
    /** 그날부터 쉰 날 수 — 평가한 적이 없으면 `null`(쉰 것이 아니라 시작 전이다). */
    idleDays: count.nullable(),
    /** 오래 쉬었다(홈의 «오래 쉬고 돌아옴») — 문턱은 속의 한 값이다. 화면은 날 수로 다시 가르지 않는다. */
    longBreak: z.boolean(),
    /** 밀린 복습 — 복습일이 **지난** 개념의 수(오늘이 복습일인 것은 아니다 · 하루 상한으로 미룬 것도 지났으면 센다). */
    overdue: count,
    /** 다음 복습 — 오늘보다 **뒤**의 가장 가까운 복습일 · 그날까지의 날 수 · 그날이 복습일인 개념 수. 앞날의 복습이 없으면 `null`. */
    nextReview: z
      .strictObject({
        dueOn: dateSchema,
        daysUntil: z.number().int().min(1),
        count: z.number().int().min(1),
      })
      .nullable(),
    /** 단원별 집계 — 고른 개념이 있는 소단원만, 은행의 차례로. `learned` 는 평가한 적이 있는 수다(다 외웠다는 뜻이 아니다). */
    sections: z.array(
      z.strictObject({
        key: sectionKeySchema,
        picked: count,
        learned: count,
        stepCounts: z.strictObject({ 1: count, 2: count, 3: count, 4: count }),
      }),
    ),
  }),
  /** 오늘 낼 것 · 평가 전인 것 · 열린 풀이의 개념의 상태. 미룬 것(`held`)은 열쇠만 내려간다 — 자세한 것은 개념 목록에서. */
  concepts: z.record(fadingConceptIdSchema, fadingConceptStatusSchema),
  session: sessionViewSchema.nullable(),
  /** 열린 풀이의 개념 내용 — 풀이가 열려 있으면 늘 있다(다시 들어와도 한 번에 이어 간다). */
  opened: fadingContentSchema.nullable(),
  /** 최근 여덟 주의 집계. `passed` 는 정답률이 아니다 — «다시»가 아닌 평가의 수다. */
  days: z.array(storedFadingDaySchema).max(FADING_VIEW_DAYS),
  /** 이번 요청이 평가였을 때 — 적용된(또는 이미 적용돼 있던) 평가. */
  receipt: storedFadingReceiptSchema.nullable(),
  /** 새로 여는 풀이가 카드 풀이다(서버의 하위 문 `MATH_FADING_CARDS`). 없으면 칩 풀이 — 연습도 이 방식으로 돈다. */
  mode: z.literal("cards").optional(),
});
export type FadingState = z.infer<typeof fadingStateSchema>;
export const fadingStateResponseSchema = z.strictObject({
  data: fadingStateSchema,
});

/* ───────── 행동 ───────── */

const sessionRef = {
  conceptId: fadingConceptIdSchema,
  /** 풀이의 번호 — `open` 이 내준 것. 늦게 도착한 옛 풀이의 요청은 받지 않는다. */
  sessionId: z.uuid(),
};

export const fadingActionSchema = z.discriminatedUnion("action", [
  /** 개념 목록에서 고른다. */
  z.strictObject({
    action: z.literal("pick"),
    conceptId: fadingConceptIdSchema,
  }),
  /** 고른 것을 뺀다(평가한 적이 없는 것만). */
  z.strictObject({
    action: z.literal("drop"),
    conceptId: fadingConceptIdSchema,
  }),
  /** 풀이를 연다 — 복습일이 안 된 개념은 열리지 않는다(그런 풀이는 연습이라 기록하지 않는다). */
  z.strictObject({
    action: z.literal("open"),
    conceptId: fadingConceptIdSchema,
  }),
  /** 1단계 정독을 마쳤다. `seen` 은 카드 풀이의 «사전 확인»(명제 차례로 한 글자 · `encodeFadingMarks`) — 진단이다. */
  z.strictObject({
    action: z.literal("read"),
    ...sessionRef,
    seen: fadingMarksTextSchema.optional(),
  }),
  /** 4단계에서 틀리게 넣은 것 하나 — 틀린 그 자리에서 보낸다(칩 풀이는 칩, 카드 풀이는 쓴 글). */
  z.strictObject({
    action: z.literal("miss"),
    ...sessionRef,
    placement: fadingPlacementSchema,
  }),
  /**
   * 단계 하나를 마쳤다 — 넣은 차례 전부(틀린 것도). `gaveUp` 은 «아직 모르겠어요» — 넣은 것을 다 돌린 뒤에 남은 빈칸이 틀림이 된다.
   * 카드 풀이의 4단계는 빈칸마다 채웠거나(맞음 · 대조를 기다림) 그 카드를 넘긴 뒤에만 보낸다 — 그때 `gaveUp` 은 넘긴 카드의 빈칸만 가리킨다.
   * `sure` 는 복습으로 연 카드 풀이의 4단계 확신(명제 차례로 한 글자) — 진단이다. 🔴 대조 화면을 열기 **전에** 보낸다.
   */
  z.strictObject({
    action: z.literal("step"),
    ...sessionRef,
    step: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    placements: z.array(fadingPlacementSchema).max(FADING_PLACEMENTS_MAX),
    gaveUp: z.boolean().optional(),
    sure: fadingMarksTextSchema.optional(),
  }),
  /**
   * 카드 풀이의 4단계에서 카드(명제) 하나를 «아직 모르겠어요»로 넘겼다 — **그 자리에서** 보낸다(D2 · 2026-10-16).
   * `placements` 는 이 단계에서 지금까지 넣은 차례 전부(틀린 것까지)다. 서버가 같은 규칙으로 다시 돌려 그 카드의 아직 못 채운 빈칸을
   * 틀림으로 적는다(새로고침으로 지워지지 않는다). 마지막 카드였으면 화면은 이어서 `step`(`gaveUp`)을 보낸다.
   * 🔴 이 행동을 모르는 서버(2026-10-16 이전)는 400 으로 답한다 — 새 화면이 열려 있는 동안 서버를 그 앞으로 되돌리지 않는다.
   */
  z.strictObject({
    action: z.literal("give-up-card"),
    ...sessionRef,
    propositionId: z.string().min(1).max(80),
    placements: z.array(fadingPlacementSchema).max(FADING_PLACEMENTS_MAX),
  }),
  /**
   * 평가로 닫는다 — 요청 번호는 화면이 짓는다(같은 번호로 다시 보내면 한 번만 적용된다).
   * `judged` 는 대조를 기다리던 글마다 학생이 고른 것 — 틀림이 없으면 전부 골라야 닫힌다. «다름»이 있으면 «다시»뿐이다.
   */
  z.strictObject({
    action: z.literal("rate"),
    ...sessionRef,
    rating: fadingRatingSchema,
    requestId: z.uuid(),
    judged: fadingJudgedSchema.optional(),
  }),
  /** «오늘 전부» 켜고 끄기. */
  z.strictObject({ action: z.literal("all-today"), on: z.boolean() }),
]);
export type FadingAction = z.infer<typeof fadingActionSchema>;

/* ───────── 개념 목록 · 개념 하나 ───────── */

export const fadingCatalogSchema = z.strictObject({
  /** 내려간 학년과, 은행에 있는 학년 전부. */
  grade: fadingGradeSchema,
  grades: z.array(fadingGradeSchema),
  sections: z.array(
    z.strictObject({
      key: sectionKeySchema,
      chapter: z.string(),
      unit: z.string(),
      concepts: z.array(
        z.strictObject({
          id: fadingConceptIdSchema,
          level: levelSchema,
          ordinal: z.number().int().min(1),
          siblings: z.number().int().min(1),
          terms: z.array(z.string()).min(1),
          propositions: z.number().int().min(1),
          targets: z.number().int().min(1),
          /** 고르지 않은 개념이면 `null`. */
          status: z
            .strictObject({
              step: stepSchema,
              rated: z.boolean(),
              dueOn: dateSchema.nullable(),
              daysUntil: z.number().int().nullable(),
              /** 망각 위험(0 ~ 1 · 추정) — 평가 전이면 `null`. */
              risk: z.number().min(0).max(1).nullable(),
            })
            .nullable(),
        }),
      ),
    }),
  ),
});
export type FadingCatalog = z.infer<typeof fadingCatalogSchema>;
export const fadingCatalogResponseSchema = z.strictObject({
  data: fadingCatalogSchema,
});

export const fadingConceptResponseSchema = z.strictObject({
  data: z.strictObject({
    content: fadingContentSchema,
    /** 고르지 않은 개념이면 `null`. */
    status: fadingConceptStatusSchema.nullable(),
    /** 새로 여는 풀이 · 연습이 카드 풀이다(상태의 `mode` 와 같은 값). 없으면 칩 풀이. */
    mode: z.literal("cards").optional(),
  }),
});
