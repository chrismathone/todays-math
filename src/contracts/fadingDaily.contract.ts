import { z } from "zod";
import { sectionKeySchema } from "@/contracts/conceptBlank.contract";
import { fadingConceptIdSchema } from "@/contracts/fading.contract";
import {
  expeditionRouteSchema,
  mathExpeditionKindSchema,
} from "@/contracts/mathExpedition.contract";

/**
 * «오늘 할 일» — 하루 분량을 정하는 엔진이 내는 계획의 계약.
 *
 *   GET /api/learn/fading/daily?quota=   오늘 할 활동(차례대로)과 센 값. 읽기뿐이다 — 아무것도 저장하지 않는다.
 *                                        `quota` 는 오늘 분량(1 ~ 60 · 안 주면 대신 값). 저장하지 않는 값이라 부를 때마다 준다.
 *
 * 화면은 `FadingSource` 의 선택 길 `dailyPlan()` 으로 받는다(`src/lib/fading/source.ts`). 이 꼴은 새 길의 것이라 지금의 엄격한 꼴
 * (`fadingApi.contract.ts` · 학생 기록)은 하나도 바뀌지 않는다.
 *
 * 🔴 분량(`quota.total`)은 **넘지 않는 합계**다. 정해 둔 비율이 없다 — 풀던 것 → 복습일이 된 개념(망각 위험이 큰 것부터) →
 * 확인이 필요한 선수 개념 → 남은 칸에 새 진도, 이 차례로 넣는다. 복습이 분량을 다 쓰면 새 진도는 0 이다.
 * 🔴 칸(`slots`)의 단위는 «물음 하나»다 — 문제 하나 · 카드 활동 하나 · 개념 묶음의 **명제 하나**. 묶음 하나(명제 3 ~ 5)를 문제 하나로 세지 않고,
 * 같은 명제를 네 단계로 되풀이하는 것을 곱해 세지도 않는다. 단위마다의 실제 수는 `units` 에 따로 있다 — 떠올릴 묶음 수(`recall`) ·
 * 그 명제 수(`prompt`) · 문제 수(`question`) · 카드 활동 수(`task`). 서로 바꿔 부르지 않는다.
 * 🔴 이 계획은 **기본 분량**만 말한다. 같은 날 분 단위로 다시 묻는 것(틀린 뒤 1분 · 5분)은 따로 선 길의 몫이고 여기에 더해 세지 않는다.
 * 🔴 계획은 **읽은 기록에서만** 나온다 — 한 것(`done`)은 저장된 기록이 말하는 만큼이고, 활동을 시작하고 끝내는 것은 지금 있는 길
 * (`FadingSource.act` · 탐험의 시작과 풀이)이 한다. 떠올리기가 탐험의 칸을 채우지 않고, 탐험이 개념의 복습일을 옮기지 않는다.
 * 🔴 재료가 모자라면 모자란 만큼을 `shortfall` 로 낸다 — 다른 것으로 채워 넣지 않는다.
 */

/** 분량을 넣는 규칙의 판 — 차례나 칸의 단위를 바꾸면 올린다. */
export const FADING_DAILY_VERSION = 1 as const;

/** 부르는 쪽이 줄 수 있는 분량의 범위(칸). */
export const FADING_DAILY_QUOTA_MAX = 60;
/** 오늘 분량 — 1 ~ 60 의 정수. 주소의 `?quota=` 와 `dailyPlan({ quota })` 가 같은 꼴을 지난다. */
export const fadingDailyQuotaSchema = z
  .number()
  .int()
  .min(1)
  .max(FADING_DAILY_QUOTA_MAX);
/** `dailyPlan` 에 줄 수 있는 것 — 분량 하나. 안 주면 대신 값이다(`quota.source` 가 `default`). */
export type FadingDailyOptions = { quota?: number };

const count = z.number().int().min(0);
const dateSchema = z.iso.date();

/** 활동의 갈래 — 복습 · 선수 개념 확인 · 새 진도. */
export const fadingDailyBucketSchema = z.enum([
  "review",
  "prerequisite",
  "progress",
]);
export type FadingDailyBucket = z.infer<typeof fadingDailyBucketSchema>;

/** 세는 단위 — 서로 바꿔 부르지 않는다. */
export const fadingDailyUnitSchema = z.enum(["recall", "question", "task"]);
export type FadingDailyUnit = z.infer<typeof fadingDailyUnitSchema>;

export const fadingDailyReasonCodeSchema = z.enum([
  "resume-recall",
  "resume-practice",
  "review-risk",
  "review-practice",
  "prerequisite-unassessed",
  "prerequisite-weak",
  "prerequisite-stale",
  "progress-picked",
  "progress-section",
  "progress-practice",
  "done-today",
  "blocked",
  "over-budget",
]);
export type FadingDailyReasonCode = z.infer<typeof fadingDailyReasonCodeSchema>;
const reasonSchema = z.strictObject({
  code: fadingDailyReasonCodeSchema,
  /** 학생에게 보이는 한 줄. */
  text: z.string().min(1),
});

const activityBase = {
  /** 그날 안에서 바뀌지 않는 열쇠 — `recall:<개념>` · `practice:<날짜>`. */
  key: z.string().min(1),
  bucket: fadingDailyBucketSchema,
  /** 오늘 분량에서 차지하는 칸 수. */
  slots: z.number().int().min(1),
  /** 그 가운데 한 것 — 저장된 기록이 말하는 만큼만. */
  done: count,
  /** `active` 는 풀던 것(먼저 한다) · `blocked` 는 오늘 낼 수 없는 것(시작할 수 없거나 남은 칸에 안 들어간다 — 칸에 세지 않는다). */
  state: z.enum(["active", "todo", "done", "blocked"]),
  reason: reasonSchema,
};

/**
 * 개념 떠올리기 하나 — 은행 개념 묶음 하나의 풀이(평가로 닫히면 그 개념의 복습일이 한 번 정해진다).
 * `start` 가 시작하는 길이다: `continue` 는 열린 풀이(`state().session`), `open` 은 `act({action:"open"})`,
 * `pick-open` 은 아직 고르지 않은 개념 — `open` 하나로 고르기까지 된다(따로 `pick` 을 보내도 같다). 끝난 것은 `none`.
 */
export const fadingDailyRecallSchema = z.strictObject({
  ...activityBase,
  kind: z.literal("recall"),
  unit: z.literal("recall"),
  /** 그 묶음의 명제 수 — 이 활동이 차지하는 칸 수와 같다(`slots`). 묶음은 쪼개지 않는다(복습일이 묶음 하나에 하나다). */
  prompts: z.number().int().min(1),
  conceptId: fadingConceptIdSchema,
  section: sectionKeySchema,
  /** 그 개념의 명제들의 용어 — 목록에서 개념을 알아보는 이름. */
  terms: z.array(z.string()).min(1),
  /** 서 있는 단계 — 아직 고르지 않은 개념이면 `null`(1단계부터다). */
  step: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
    .nullable(),
  /** 평가한 적이 있다. 다 외웠다는 뜻이 아니다. */
  rated: z.boolean(),
  /** 망각 위험(0 ~ 1) — 일정 계산기의 **추정**. 평가 전이면 `null`. */
  risk: z.number().min(0).max(1).nullable(),
  /** 다음 복습까지 남은 날 — 0 은 오늘, 음수는 밀린 날 수. 평가 전이면 `null`. */
  daysUntil: z.number().int().nullable(),
  start: z.enum(["continue", "open", "pick-open", "none"]),
});
export type FadingDailyRecall = z.infer<typeof fadingDailyRecallSchema>;

/**
 * 탐험의 하루 분량 한 덩이 — 문제은행 날(문제) · 개념 날(카드 활동). 나눌 수 없고, 분량(`count`)은 탐험이 정한 그대로다.
 * 남은 칸에 통째로 들어갈 때만 낸다 — 안 들어가면 `blocked`(까닭 `over-budget`)로 싣고 칸에 세지 않는다.
 * 끝났는지는 탐험의 기록만 말한다(`answered` · `retryRemaining`). `start` 는 지금 있는 탐험의 시작 · 이어 하기다.
 * 🔴 어떤 문제가 나오는지는 탐험이 정한다(`selection`) — 이 계획은 문제를 하나씩 고르지 않는다. 덩이 안의 복습 · 새 소단원의 섞임은 탐험의 규칙이다.
 */
export const fadingDailyPracticeSchema = z.strictObject({
  ...activityBase,
  kind: z.literal("practice"),
  unit: z.enum(["question", "task"]),
  /** 탐험이 정한 분량 — 문제 수 또는 카드 활동 수. */
  count: z.number().int().min(1),
  answered: count,
  /** 다시 풀 것이 남은 수 — 0 이 될 때까지 그날의 칸이 생기지 않는다. */
  retryRemaining: count,
  source: z.strictObject({
    kind: mathExpeditionKindSchema,
    route: expeditionRouteSchema,
    unitId: z.string().min(1),
    title: z.string(),
    subtitle: z.string(),
    /** 문제를 고르는 쪽 — 늘 탐험이다. */
    selection: z.literal("expedition"),
  }),
  start: z.enum(["start", "continue", "none"]),
});
export type FadingDailyPractice = z.infer<typeof fadingDailyPracticeSchema>;

export const fadingDailyActivitySchema = z.discriminatedUnion("kind", [
  fadingDailyRecallSchema,
  fadingDailyPracticeSchema,
]);
export type FadingDailyActivity = z.infer<typeof fadingDailyActivitySchema>;

/* ───────── 선수 개념의 안내 ───────── */

/**
 * 근거의 상태 — 원천마다 따로 싣고 섞지 않는다.
 * `unassessed` 확인한 기록이 없다 · `weak` 그 개념 **자신의** 마지막 기록이 틀림 · 도움을 받은 것 · `stale` 기록이 오래됐다(복습일이 지났다) ·
 * `recent` 최근 기록이 있다(숙달이라는 뜻이 아니다) · `unknown` 이 원천으로는 알 수 없다(이어진 것이 없다 · 판정 보류).
 */
export const fadingEvidenceStatusSchema = z.enum([
  "unassessed",
  "weak",
  "stale",
  "recent",
  "unknown",
]);
export type FadingEvidenceStatus = z.infer<typeof fadingEvidenceStatusSchema>;

export const fadingPrerequisiteLinkSchema = z.strictObject({
  /**
   * 이어진 길 — `card-link` 는 개념 카드에 손으로 적어 둔 선수 카드, `graph-edge` 는 교육과정 연결도의 단원 간선(확인된 시범 범위).
   * 제목이 비슷해서 이은 것은 없다.
   */
  via: z.enum(["card-link", "graph-edge"]),
  /** 적혀 있는 까닭(연결도의 간선) — 카드 연결에는 까닭 글이 없어 `null`. */
  reason: z.string().nullable(),
  prerequisite: z.strictObject({
    title: z.string(),
    /** 이름 공간마다 따로 — 서로 바꾸지 않는다. */
    cardId: z.string().nullable(),
    graphUnitId: z.string().nullable(),
    courseSectionIds: z.array(z.string()),
    sectionKeys: z.array(sectionKeySchema),
  }),
  /** 그 선수가 «오늘의 기억» 개념까지 같은 교육과정 열쇠로 이어지는가. `unmapped` 면 개념을 지어내지 않는다. */
  mapping: z.enum(["exact", "unmapped"]),
  evidence: z.strictObject({
    /** «오늘의 기억» 기록 — 그 소단원의 개념 가운데 평가한 수와 상태별 수. */
    fading: z.strictObject({
      status: fadingEvidenceStatusSchema,
      total: count,
      rated: count,
      weak: count,
      stale: count,
    }),
    /** 개념 카드(옛 탐험)의 기록. */
    card: z.strictObject({ status: fadingEvidenceStatusSchema }),
    /** 문제은행 코스의 기록 — 확인된 시범 소단원만 판정한다. 그 밖은 `unknown`. */
    course: z.strictObject({ status: fadingEvidenceStatusSchema }),
  }),
  /** 읽어 보거나 확인할 «오늘의 기억» 개념(은행 차례) — 이어진 것이 없으면 비어 있다. */
  conceptIds: z.array(fadingConceptIdSchema),
});
export type FadingPrerequisiteLink = z.infer<
  typeof fadingPrerequisiteLinkSchema
>;

export const fadingPrerequisiteAdvisorySchema = z.strictObject({
  target: z.strictObject({
    title: z.string(),
    explorerUnitId: z.string().nullable(),
    courseSectionId: z.string().nullable(),
    sectionKey: sectionKeySchema.nullable(),
    graphUnitId: z.string().nullable(),
    cardIds: z.array(z.string()),
  }),
  /**
   * 이 목표에 적혀 있는 선수 연결이 있는가 — `mapped` 는 연결이 있고 전부 개념까지 이어진다, `partial` 은 일부만,
   * `unknown` 은 적혀 있는 연결이 없다(선수가 없다는 뜻이 아니다).
   */
  coverage: z.strictObject({
    status: z.enum(["mapped", "partial", "unknown"]),
    cardLinks: count,
    graphEdges: count,
  }),
  links: z.array(fadingPrerequisiteLinkSchema),
});
export type FadingPrerequisiteAdvisory = z.infer<
  typeof fadingPrerequisiteAdvisorySchema
>;

/* ───────── 계획 ───────── */

const tally = z.strictObject({ planned: count, done: count });

export const fadingDailyPlanSchema = z.strictObject({
  version: z.literal(FADING_DAILY_VERSION),
  /** 서버가 정한 «오늘»(한국 날짜). */
  today: dateSchema,
  /** `all` 은 학생이 «오늘 전부»를 고른 날 — 복습은 분량과 상관없이 전부 낸다. */
  mode: z.enum(["split", "all"]),
  quota: z.strictObject({
    /** 오늘 분량(칸). */
    total: z.number().int().min(1),
    /** `explicit` 는 부른 쪽이 준 값, `default` 는 값을 안 줬을 때의 대신 값(정해진 하루 분량이 아니다). */
    source: z.enum(["explicit", "default"]),
    /** 분량을 넘긴 칸 — 빚진 것(풀던 풀이 · 풀던 탐험 · 학생이 고른 «오늘 전부»의 복습)만 분량을 넘어 낸다. */
    over: count,
  }),
  /** 갈래마다 오늘 잡힌 칸(한 것 포함) — 정해 둔 비율이 아니라 넣은 결과다(`buckets` 의 `planned` 와 같다). */
  shares: z.strictObject({
    review: count,
    prerequisite: count,
    progress: count,
  }),
  /** 오늘의 칸 — 한 것과 남은 것. `total = done + remaining`. */
  counts: z.strictObject({ total: count, done: count, remaining: count }),
  buckets: z.strictObject({
    review: tally,
    prerequisite: tally,
    progress: tally,
  }),
  /** 단위마다의 실제 수 — 떠올릴 묶음 수 · 그 명제 수 · 문제 수 · 카드 활동 수. */
  units: z.strictObject({
    recall: tally,
    prompt: tally,
    question: tally,
    task: tally,
  }),
  /** 할 차례대로 — 풀던 것 → 복습 → 선수 개념 → 새 진도, 오늘 못 내는 것 · 끝난 것은 뒤. */
  activities: z.array(fadingDailyActivitySchema),
  /** 지금 할 활동의 열쇠 — 없으면 `null`. */
  next: z.string().nullable(),
  /**
   * `empty` 낼 것이 없다 · `todo` 아직 시작 전 · `in-progress` 하는 중 · `done` 오늘 분량을 다 했다 ·
   * `short` 낼 수 있는 것은 다 했지만 재료가 모자라 분량에 못 미쳤다.
   */
  status: z.enum(["empty", "todo", "in-progress", "done", "short"]),
  /** 분량에서 못 채운 칸과 까닭 — 채워 넣지 않는다. */
  shortfall: z.array(
    z.strictObject({
      bucket: fadingDailyBucketSchema,
      slots: z.number().int().min(1),
      reason: z.string().min(1),
    }),
  ),
  /** 복습일이 됐지만 오늘 분량 밖으로 미룬 묶음의 수와 그 명제 수 — 복습일은 그대로다(계획은 아무것도 쓰지 않는다). */
  held: z.strictObject({ recalls: count, prompts: count }),
  /** 오늘 배울 것의 선수 개념 안내 — 목표를 알 수 없으면 `null`. */
  prerequisite: fadingPrerequisiteAdvisorySchema.nullable(),
  /** 탐험과 이어져 있는가 — `false` 면 «오늘의 기억»만으로 지은 계획이다. */
  integration: z.strictObject({ expedition: z.boolean() }),
});
export type FadingDailyPlan = z.infer<typeof fadingDailyPlanSchema>;
export const fadingDailyPlanResponseSchema = z.strictObject({
  data: fadingDailyPlanSchema,
});
