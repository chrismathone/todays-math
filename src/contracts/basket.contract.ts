/**
 * **담기 바구니** — 문제은행에서 고른 문항을 계정에 담아 두고, 담은 것만으로
 * 시험지를 만든다.
 *
 * ## 왜 생겼나 (2026-09-04, 원장님 확정)
 *
 * 우리 제품의 축은 `진도 입력 → 자동 출제`다. 그런데 문제은행 10만 행에서 좋은
 * 문항을 찾아도 **그것을 시험지로 옮길 길이 없었다** — 상용 문제은행
 * (매쓰홀릭·매스플랫)의 축인 `검색 → 담기 → 시험지`가 통째로 비어 있었고,
 * 그래서 은행이 사실상 「구경만 하는 목록」이었다.
 *
 * 자동 출제는 **그대로 둔다.** 이것은 그 옆에 나는 «손으로 짜는 길» 하나다.
 *
 * ## 원장님이 정하신 것
 *
 * - 담긴 것은 **화면 아래 고정 바**로 보인다(Wire ①). 담기 전에는 바가 없다.
 * - 바는 **수 + 난이도 분포**를 말한다(Hi-fi ㉡) — 짜면서 균형이 보여야 한다.
 * - 「시험지 만들기」는 **담은 것만으로 새 시험지**를 만든다(자동 출제에 끼워
 *   넣는 것이 아니다).
 * - 바구니는 **계정에 저장**한다 — 집에서 고르고 학원에서 이어서 할 수 있어야 한다.
 *   그래서 브라우저가 아니라 서버에 둔다.
 *
 * ## 🔴 차례를 서버가 들고 있다
 *
 * 담은 차례가 곧 **시험지의 문항 번호**다. 그것을 브라우저에 두면 다른 기기에서
 * 순서가 달라지고, 「계정에 저장」이라는 약속이 절반만 참이 된다.
 */
import { z } from "zod";

import {
  dataResponseSchema,
  difficultySchema,
  isoDateSchema,
  uuidSchema,
} from "./common.contract";
import { problemSchema } from "./problem.contract";
import {
  questionSelectionSchema,
  questionIdSchema,
} from "./questionFormats.contract";

/** 바구니 한 칸 — 담은 차례와 그 문항. */
export const basketItemSchema = z.strictObject({
  /**
   * 담은 차례(1부터). 시험지를 만들 때 이 순서가 문항 번호가 된다.
   *
   * ⚠️ **행을 빼도 다시 매기지 않는다** — 그러면 남은 행의 번호가 통째로 흔들려
   *    「내가 셋째로 담은 것」이 다른 문항을 가리킨다. 빈 자리는 그대로 두고,
   *    시험지로 옮길 때 **차례대로 다시 세어** 1..N 을 붙인다.
   */
  orderIndex: z.number().int().min(1),
  problem: problemSchema,
  questionId: questionIdSchema.optional(),
  /** An old basket may contain both formats. GET never removes either. */
  conflictProblemIds: z.array(uuidSchema).optional(),
});
export type BasketItem = z.infer<typeof basketItemSchema>;

/**
 * 바구니 전체.
 *
 * `spread`(난이도 분포)는 **서버가 센다** — 바가 그것을 말하기 때문이다(Hi-fi ㉡).
 * 화면이 따로 세면 「담긴 것의 일부만 받아 온 쪽」에서 조용히 다른 수가 나온다.
 */
export const basketResponseSchema = dataResponseSchema(
  z.strictObject({
    items: z.array(basketItemSchema),
    /**
     * 난이도별 개수 — **사다리 전 칸이 온다**(0 인 칸도 온다). 그래야 받는 쪽이
     * 「그 칸이 없다」와 「그 칸이 0이다」를 가른다.
     *
     * 🔴 **`unknown` 칸은 뗐다 (원장님 지시 2026-09-05).** 「난이도가 안 적힌 문항」을
     *    따로 세는 칸을 두었었는데, `Problem.difficulty` 가 `init` 부터 NOT NULL 이고
     *    위 `problemSchema` 도 요구해서 **구조적으로 늘 0** 이었다. 늘 0 인 칸은
     *    「깨끗」과 「셀 것이 없음」을 안 가른다. 지금은 적힌 수의 **합이 곧 `total`** 이다.
     */
    spread: z.record(difficultySchema, z.number().int().min(0)),
    /** 담긴 문항 수 = `items.length`. 화면이 다시 세지 않게 서버가 준다. */
    total: z.number().int().min(0),
    countUnit: z.literal("question").optional(),
    version: z.literal(2).optional(),
    /** Unresolved question groups are excluded from spread until a format is chosen. */
    conflictCount: z.number().int().min(0).optional(),
  }),
);
export type BasketResponse = z.infer<typeof basketResponseSchema>;

/** 담기 — 이미 담긴 문항이면 **아무 일도 안 하고 성공**이다(멱등). */
export const basketAddRequestSchema = z
  .strictObject({
    problemId: uuidSchema,
    identity: z.literal("question").optional(),
    selection: questionSelectionSchema.optional(),
  })
  .refine(
    (v) =>
      (v.identity !== "question" || v.selection !== undefined) &&
      (!v.selection || v.selection.problemId === v.problemId),
    { error: "출제할 문항 형식을 다시 선택해 주세요." },
  );
export type BasketAddRequest = z.infer<typeof basketAddRequestSchema>;

export const basketChangeRequestSchema = z.strictObject({
  fromProblemId: uuidSchema,
  selection: questionSelectionSchema,
  identity: z.literal("question").optional(),
});

/**
 * 담은 것으로 시험지 만들기.
 *
 * ⚠️ **범위(`rangeStartUnitId`·`rangeEndUnitId`)를 받지 않는다.** 시험지 스키마가
 *    그것을 요구하지만, 손으로 고른 시험지의 범위는 **담긴 문항이 정한다** —
 *    서버가 담긴 문항의 단원 가운데 가장 앞과 가장 뒤를 쓴다. 화면이 보내면
 *    담긴 것과 어긋난 범위가 지면에 찍힐 수 있다.
 */
export const basketTestRequestSchema = z.strictObject({
  classId: uuidSchema,
  /** 미지정 시 반 전체 대상 — 자동 출제와 같은 규약이다. */
  studentId: uuidSchema.optional(),
  testDate: isoDateSchema,
  identity: z.literal("question").optional(),
  selections: z.array(questionSelectionSchema).max(100).optional(),
  /** Omission preserves the previous manual-issuance default. */
  recent: z.boolean().optional(),
});
export type BasketTestRequest = z.infer<typeof basketTestRequestSchema>;

/** 시험지를 만든 뒤 — 만들어진 시험지의 id 와 실린 문항 수. */
export const basketTestResponseSchema = dataResponseSchema(
  z.strictObject({
    testId: uuidSchema,
    problemCount: z.number().int().min(1),
  }),
);
export type BasketTestResponse = z.infer<typeof basketTestResponseSchema>;
