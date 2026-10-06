import { z } from "zod";
import { FSRS_RATINGS } from "@/lib/fading/fsrs";

/**
 * «오늘의 기억» — 저장 칸의 계약 (`docs/planning/srs-overhaul-20261006.md` §13).
 *
 * 학생마다 한 줄인 학생 기록의 payload 에 **선택 칸 `fading` 하나**로 들어간다(새 표 없음).
 * 🔴 그 payload 는 모르는 키가 하나라도 있으면 그 학생 기록 전체를 못 읽는다 — 이 칸을 **읽을 줄 아는** 코드가 먼저 나가고,
 * 쓰는 코드는 그다음 배포에 나간다. 되돌릴 수 있는 하한은 «이 칸을 읽고 보존하는 배포판»이다. 이 칸의 꼴을 바꿀 때도 같다.
 * 답 하나하나는 적지 않는다 — 개념마다의 기억 상태와 날마다의 집계만 남긴다(복습별 재현 · 계산기 값의 재학습은 못 한다).
 */

const dateSchema = z.iso.date();
const stepSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

/** 개념의 열쇠 — 묶음 표(`src/lib/fading/groups/`)가 정한다. 한 번 정한 열쇠는 묶음의 문장이 바뀌어도 그대로다. */
export const fadingConceptIdSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "개념의 열쇠는 소문자 · 숫자 · 붙임표");

/** 빈칸(표적)의 열쇠 — «명제 id#몇째». */
const targetIdSchema = z.string().min(3).max(80);

/** 한 학생이 가질 수 있는 개념 수의 상한 — 은행의 개념(2,040)보다 넉넉하게. */
export const FADING_CONCEPTS_MAX = 3000;
/** 날마다의 집계를 남기는 날 수(`numbers.ts` 의 `FADING_DAYS_KEPT` 와 같다 — 시험이 짝을 잠근다). */
export const FADING_STORED_DAYS_MAX = 400;
/** 남겨 두는 평가 영수증 수 — 늦게 다시 온 요청을 다시 적용하지 않으려고. */
export const FADING_RECEIPTS_MAX = 32;
/** 한 개념의 표적 수의 상한(명제 다섯 × 핵심어 넷). */
export const FADING_TARGETS_MAX = 20;

export const storedFadingConceptSchema = z
  .strictObject({
    /** 서 있는 단계 — 다음 풀이가 시작하는 단계. */
    step: stepSchema,
    /** 일정 계산기의 기억 값. 평가한 적이 없으면 다섯(이 둘 · 두 날짜 · 지문)이 다 `null`. */
    stability: z.number().min(0.01).max(36500).nullable(),
    difficulty: z.number().min(1).max(10).nullable(),
    reviewedOn: dateSchema.nullable(),
    dueOn: dateSchema.nullable(),
    /** 마지막으로 평가했을 때의 내용 지문 — 은행의 문장이 그 뒤에 바뀌었는지 알아본다. */
    digest: z
      .string()
      .regex(/^[0-9a-f]{8}$/)
      .nullable(),
    reviews: z.number().int().min(0),
    lapses: z.number().int().min(0),
    /** 개념 목록에서 고른 날. */
    addedOn: dateSchema,
  })
  .superRefine((concept, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const memory = [
      concept.stability,
      concept.difficulty,
      concept.reviewedOn,
      concept.dueOn,
      concept.digest,
    ];
    const rated = memory.every((value) => value !== null);
    if (!rated && memory.some((value) => value !== null))
      invalid("기억 값 · 복습 날짜 · 지문은 함께 있거나 함께 없어야 합니다.");
    if (rated !== concept.reviews > 0)
      invalid("복습 횟수가 기억 값과 맞지 않습니다.");
    if (concept.lapses > concept.reviews)
      invalid("«다시» 횟수가 복습 횟수보다 큽니다.");
    if (rated && concept.step === 1)
      invalid("평가한 개념은 1단계에 설 수 없습니다.");
    if (rated && concept.dueOn! <= concept.reviewedOn!)
      invalid("다음 복습일이 마지막 복습일보다 뒤여야 합니다.");
    if (rated && concept.reviewedOn! < concept.addedOn)
      invalid("복습일이 고른 날보다 앞섭니다.");
  });
export type StoredFadingConcept = z.infer<typeof storedFadingConceptSchema>;

/** 열린 풀이 — 학생마다 하나. 마친 단계는 개념의 «서 있는 단계»에 이미 반영돼 있다. */
export const storedFadingSessionSchema = z
  .strictObject({
    /** 풀이의 번호 — 요청마다 실어 보낸다. 늦게 도착한 옛 풀이의 요청이 지금 풀이에 적용되지 않게. */
    id: z.uuid(),
    conceptId: fadingConceptIdSchema,
    /** 이 풀이를 시작할 때 서 있던 단계 — «다시»면 여기서 한 단계 앞에 선다. */
    startStep: stepSchema,
    /** 칩 차례의 씨앗 — 다시 열어도 칩이 같은 자리에 놓인다. */
    seed: z.number().int().min(0).max(2_147_483_647),
    /** `steps` 는 단계를 푸는 중, `rating` 은 4단계를 마치고 평가만 남은 때. */
    phase: z.enum(["steps", "rating"]),
    /** 4단계에서 틀리게 넣은 빈칸 — **틀린 그때 적는다**(새로고침으로 지워지지 않게). 하나라도 있으면 평가는 «다시»뿐이다. */
    missedAtFour: z.array(targetIdSchema).max(FADING_TARGETS_MAX),
    /**
     * 4단계를 푼 내용의 개념 지문 — 평가 차례로 넘어갈 때 적고, 평가는 이 지문으로 기록한다(그사이 은행의 문장이 고쳐져도
     * «고친 문장의 평가»로 적지 않는다). 선택 칸이다 — 이 칸이 없던 때의 풀이는 지문 없이 그대로 읽는다.
     * 🔴 이 칸을 **읽는** 배포판이 쓰는 배포판보다 먼저 나간다(파일 머리의 규칙).
     */
    digest: z
      .string()
      .regex(/^[0-9a-f]{8}$/)
      .optional(),
  })
  .refine(
    (session) =>
      new Set(session.missedAtFour).size === session.missedAtFour.length,
    "틀린 빈칸이 겹쳐 적혔습니다.",
  )
  .refine(
    (session) => session.digest === undefined || session.phase === "rating",
    "4단계를 푼 내용의 지문은 평가 차례에서만 적힙니다.",
  );
export type StoredFadingSession = z.infer<typeof storedFadingSessionSchema>;

export const storedFadingDaySchema = z
  .strictObject({
    date: dateSchema,
    /** 그날 평가로 닫은 풀이. */
    reviews: z.number().int().min(1),
    /** 그중 «다시»가 아닌 것 — 정답률이 아니라 스스로 매긴 평가의 수다. */
    passed: z.number().int().min(0),
    /** 그중 그 개념의 첫 평가. */
    fresh: z.number().int().min(0),
  })
  .refine(
    (day) => day.passed <= day.reviews && day.fresh <= day.reviews,
    "그날의 집계가 복습 수를 넘습니다.",
  );
export type StoredFadingDay = z.infer<typeof storedFadingDaySchema>;

/** 자가 평가 넷 — 일정 계산기의 이름 그대로. */
export const fadingRatingSchema = z.enum(FSRS_RATINGS);

/** 적용한 평가 요청 하나 — 같은 요청이 다시 오면 다시 적용하지 않고 이 값으로 답한다. */
export const storedFadingReceiptSchema = z.strictObject({
  requestId: z.uuid(),
  conceptId: fadingConceptIdSchema,
  rating: fadingRatingSchema,
  dueOn: dateSchema,
});
export type StoredFadingReceipt = z.infer<typeof storedFadingReceiptSchema>;

export const storedFadingSchema = z
  .strictObject({
    version: z.literal(1),
    concepts: z.record(fadingConceptIdSchema, storedFadingConceptSchema),
    session: storedFadingSessionSchema.nullable(),
    days: z.array(storedFadingDaySchema).max(FADING_STORED_DAYS_MAX),
    /** «N일 연속»의 요약 — 날마다의 집계(400일)보다 긴 연속도 세도록 따로 둔다. */
    streak: z.strictObject({
      current: z.number().int().min(0),
      best: z.number().int().min(0),
      lastOn: dateSchema.nullable(),
    }),
    /** «오늘 전부»를 고른 날 — 그날에만 하루 상한을 보지 않는다. 분량을 고른 것이지 다 했다는 뜻이 아니다. */
    allOn: dateSchema.nullable(),
    receipts: z.array(storedFadingReceiptSchema).max(FADING_RECEIPTS_MAX),
  })
  .superRefine((value, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (Object.keys(value.concepts).length > FADING_CONCEPTS_MAX)
      invalid("개념 수가 상한을 넘습니다.");
    if (
      value.days.some((day, i) => i > 0 && value.days[i - 1]!.date >= day.date)
    )
      invalid("날마다의 집계는 날짜 차례이고 겹치지 않아야 합니다.");
    const { current, best, lastOn } = value.streak;
    if (best < current || (lastOn === null) !== (best === 0))
      invalid("연속 일수의 요약이 맞지 않습니다.");
    if (
      (lastOn !== null && current === 0) ||
      lastOn !== (value.days.at(-1)?.date ?? null)
    )
      invalid("연속 일수의 마지막 날이 집계의 마지막 날과 다릅니다.");
    const requests = value.receipts.map((r) => r.requestId);
    if (new Set(requests).size !== requests.length)
      invalid("같은 평가 요청이 두 번 적혔습니다.");
    const session = value.session;
    if (!session) return;
    const concept = value.concepts[session.conceptId];
    if (!concept) return invalid("열린 풀이의 개념이 없습니다.");
    if (session.startStep > concept.step)
      invalid("풀이를 시작한 단계가 서 있는 단계보다 뒤입니다.");
    if (
      (session.phase === "rating" || session.missedAtFour.length > 0) &&
      concept.step !== 4
    )
      invalid("4단계에 닿은 풀이의 개념은 4단계에 서 있어야 합니다.");
  });
export type StoredFading = z.infer<typeof storedFadingSchema>;

/** 빈칸에 칩을 넣은 것 하나 — 화면이 단계를 마칠 때 **넣은 차례대로 전부**(틀린 것도) 보내고, 서버가 같은 규칙으로 다시 돌려 확인한다. */
export const fadingPlacementSchema = z.strictObject({
  targetId: targetIdSchema,
  chipId: z.string().regex(/^c\d{1,3}$/),
});
export type FadingPlacement = z.infer<typeof fadingPlacementSchema>;
/** 한 단계에 보낼 수 있는 «넣기»의 상한 — 표적은 많아야 스물이고, 틀리게 넣은 것까지 넉넉히. */
export const FADING_PLACEMENTS_MAX = 400;
