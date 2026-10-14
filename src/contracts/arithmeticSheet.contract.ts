import { z } from "zod";

import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  ARITHMETIC_SHEET_KIND,
  ARITHMETIC_SHEET_PAYLOAD_VERSION,
  ARITHMETIC_SKILL_NOTATION,
  arithmeticAnswerSchema,
  arithmeticIdentityKey,
  arithmeticPromptSchema,
  arithmeticSeedSchema,
  arithmeticSpecSchema,
} from "@/contracts/arithmetic.contract";

/**
 * `WorkspaceDocument` kind `arithmeticSheet` 의 본문.
 *
 * 이 계약만으로 저장되지는 않는다. 컬럼 CHECK 는 아직 `draft`·`extraction`·
 * `conceptBlank` 만 허용한다. 루트 저장 담당이 DB 제약을 넓히기 전에는
 * 이 페이로드를 문서 행에 넣지 않는다.
 *
 * 다시 열 때는 여기 적힌 명세·발문·정답 스냅샷을 검사한다. 시드로 다시
 * 만들지 않는다. 발문과 정답 외에 `solution` 칸은 없다.
 */

export const arithmeticSheetItemSchema = z.strictObject({
  order: z.number().int().min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
  spec: arithmeticSpecSchema,
  prompt: arithmeticPromptSchema,
  answer: arithmeticAnswerSchema,
});
export type ArithmeticSheetItem = z.infer<typeof arithmeticSheetItemSchema>;

export const arithmeticSheetPayloadSchema = z
  .strictObject({
    payloadVersion: z.literal(ARITHMETIC_SHEET_PAYLOAD_VERSION),
    kind: z.literal(ARITHMETIC_SHEET_KIND),
    engineVersion: z.literal(ARITHMETIC_ENGINE_VERSION),
    catalogVersion: z.literal(ARITHMETIC_CATALOG_VERSION),
    seed: arithmeticSeedSchema,
    rounds: z
      .array(
        z.strictObject({
          round: z.number().int().min(1).max(ARITHMETIC_MAX_ROUNDS),
          items: z
            .array(arithmeticSheetItemSchema)
            .min(1)
            .max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
        }),
      )
      .min(1)
      .max(ARITHMETIC_MAX_ROUNDS),
  })
  .superRefine((sheet, ctx) => {
    let total = 0;
    sheet.rounds.forEach((round, roundIndex) => {
      if (round.round !== roundIndex + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds", roundIndex, "round"],
          message: "arithmetic:order",
        });
      }
      total += round.items.length;
      const keys = new Set<string>();
      round.items.forEach((item, itemIndex) => {
        const path = ["rounds", roundIndex, "items", itemIndex];
        if (
          item.order !== itemIndex + 1 ||
          item.spec.order !== item.order ||
          item.spec.round !== round.round ||
          item.spec.seed !== sheet.seed ||
          item.spec.engineVersion !== sheet.engineVersion ||
          item.spec.catalogVersion !== sheet.catalogVersion
        ) {
          ctx.addIssue({
            code: "custom",
            path,
            message: "arithmetic:order",
          });
        }
        const key = arithmeticIdentityKey(item.spec.skillId, item.spec.operands);
        if (keys.has(key)) {
          ctx.addIssue({
            code: "custom",
            path,
            message: "arithmetic:duplicate",
          });
        }
        keys.add(key);
        if (item.prompt.notation !== ARITHMETIC_SKILL_NOTATION[item.spec.skillId]) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "prompt"],
            message: "arithmetic:prompt-mismatch",
          });
        }
        if (
          item.prompt.operator !== item.spec.operator ||
          item.prompt.operands[0] !== item.spec.operands[0] ||
          item.prompt.operands[1] !== item.spec.operands[1]
        ) {
          ctx.addIssue({
            code: "custom",
            path: [...path, "prompt"],
            message: "arithmetic:prompt-mismatch",
          });
        }
      });
    });
    if (total > ARITHMETIC_MAX_ITEMS_TOTAL) {
      ctx.addIssue({
        code: "custom",
        path: ["rounds"],
        message: "arithmetic:limit",
      });
    }
  });

export type ArithmeticSheetPayload = z.infer<typeof arithmeticSheetPayloadSchema>;
