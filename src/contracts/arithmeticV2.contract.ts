import { z } from "zod";
import { arithmeticPresentationSchema } from "./arithmeticPresentation.contract";
import {
  arithmeticGeometryAssetIds,
  isArithmeticAngleSnapshot,
  isArithmeticGeometrySubsetSnapshot,
  arithmeticGeometrySnapshotContains,
} from "@/lib/arithmetic-v2/geometry";
import { ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH } from "@/lib/arithmetic-v2/geometryPack";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
  ARITHMETIC_MAX_SAVED_ROUNDS,
  ARITHMETIC_SHEET_KIND,
  arithmeticSeedSchema,
} from "@/contracts/arithmetic.contract";
import type {
  ArithmeticV2CatalogEntry,
  ArithmeticV2Prompt,
} from "@/lib/arithmetic-v2/types";

export const ARITHMETIC_V2_ENGINE_VERSION = "arithmetic-engine-v2" as const;
export const ARITHMETIC_V2_CATALOG_VERSION = "arithmetic-catalog-v2" as const;
export const ARITHMETIC_V2_PAYLOAD_VERSION = 2 as const;
export {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ITEMS_TOTAL,
  ARITHMETIC_MAX_ROUNDS,
};

export const arithmeticV2TypeIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const integer = z
  .number()
  .int()
  .refine((value) => !Object.is(value, -0));
const display = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[^<>\x00-\x1f]*$/);
export const arithmeticV2PromptSchema = z.discriminatedUnion("layout", [
  z.strictObject({
    layout: z.literal("vertical"),
    operator: z.enum(["+", "-", "×"]),
    left: integer,
    right: integer,
    instruction: display.optional(),
  }),
  z.strictObject({
    layout: z.literal("math"),
    text: display,
    latex: display,
    instruction: display.optional(),
    answerUnit: z
      .string()
      .max(32)
      .regex(/^[^<>\x00-\x1f]*$/)
      .optional(),
    figureId: z
      .string()
      .max(64)
      .refine((id) => arithmeticGeometryAssetIds.has(id))
      .optional(),
  }),
]);
/** Same visible task across families; no collapsing of commuted operands. */
export function arithmeticV2PromptIdentity(prompt: ArithmeticV2Prompt): string {
  const identity =
    prompt.layout === "vertical"
      ? [
          prompt.layout,
          prompt.operator,
          prompt.left,
          prompt.right,
          prompt.instruction ?? "",
        ]
      : [
          prompt.layout,
          prompt.latex.replace(/\s+/g, ""),
          prompt.instruction ?? "",
        ];
  // Preserve every existing non-geometry identity/seed while distinguishing figures.
  if (prompt.layout === "math" && prompt.figureId)
    identity.push(prompt.figureId);
  return JSON.stringify(identity);
}
export const arithmeticV2AnswerSchema = z
  .strictObject({
    kind: z.enum([
      "integer",
      "rational",
      "decimal",
      "remainder",
      "polynomial",
      "surd",
    ]),
    exact: z
      .array(
        z
          .string()
          .max(80)
          .regex(/^(?:0|-?[1-9][0-9]*)$/),
      )
      .max(64),
    text: display,
    latex: display,
  })
  .superRefine((answer, ctx) => {
    if (
      answer.exact.length === 0 &&
      answer.kind !== "polynomial" &&
      answer.kind !== "surd"
    )
      ctx.addIssue({
        code: "custom",
        path: ["exact"],
        message: "arithmetic:schema",
      });
  });
export const arithmeticV2CandidateSchema = z.strictObject({
  parameters: z.array(integer).min(1).max(64),
  prompt: arithmeticV2PromptSchema,
  answer: arithmeticV2AnswerSchema,
});
export const arithmeticV2AllocationSchema = z.strictObject({
  typeId: arithmeticV2TypeIdSchema,
  count: integer.min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
});
export const arithmeticV2GenerateRequestSchema = z
  .strictObject({
    engineVersion: z.literal(ARITHMETIC_V2_ENGINE_VERSION),
    catalogVersion: z.literal(ARITHMETIC_V2_CATALOG_VERSION),
    seed: arithmeticSeedSchema,
    rounds: z
      .array(
        z.strictObject({
          allocations: z
            .array(arithmeticV2AllocationSchema)
            .min(1)
            .max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
        }),
      )
      .min(1)
      .max(ARITHMETIC_MAX_ROUNDS),
  })
  .superRefine((request, ctx) => {
    let total = 0;
    request.rounds.forEach((round, index) => {
      const count = round.allocations.reduce(
        (sum, item) => sum + item.count,
        0,
      );
      total += count;
      if (count > ARITHMETIC_MAX_ITEMS_PER_ROUND)
        ctx.addIssue({
          code: "custom",
          path: ["rounds", index],
          message: "arithmetic:limit",
        });
    });
    if (total > ARITHMETIC_MAX_ITEMS_TOTAL)
      ctx.addIssue({
        code: "custom",
        path: ["rounds"],
        message: "arithmetic:limit",
      });
  });
export type ArithmeticV2GenerateRequest = z.infer<
  typeof arithmeticV2GenerateRequestSchema
>;

export const arithmeticV2SheetItemSchema = arithmeticV2CandidateSchema.extend({
  order: integer.min(1).max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
  typeId: arithmeticV2TypeIdSchema,
  domainIndex: integer.nonnegative(),
});
export type ArithmeticV2SheetItem = z.infer<typeof arithmeticV2SheetItemSchema>;
export const arithmeticV2SheetPayloadSchema = z
  .strictObject({
    payloadVersion: z.literal(ARITHMETIC_V2_PAYLOAD_VERSION),
    kind: z.literal(ARITHMETIC_SHEET_KIND),
    engineVersion: z.literal(ARITHMETIC_V2_ENGINE_VERSION),
    catalogVersion: z.literal(ARITHMETIC_V2_CATALOG_VERSION),
    seed: arithmeticSeedSchema,
    presentation: arithmeticPresentationSchema.optional(),
    figures: z
      .union([
        z
          .strictObject({
            version: z.literal(1),
            svgPack: z.string().max(80000),
          })
          .refine(isArithmeticAngleSnapshot, "arithmetic:figure-mismatch"),
        z
          .strictObject({
            version: z.literal(2),
            ids: z
              .array(z.string().max(64))
              .min(1)
              .max(ARITHMETIC_MAX_ITEMS_TOTAL),
            svgPack: z.string().max(ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH),
          })
          .refine(
            isArithmeticGeometrySubsetSnapshot,
            "arithmetic:figure-mismatch",
          ),
      ])
      .optional(),
    rounds: z
      .array(
        z.strictObject({
          round: integer.min(1).max(ARITHMETIC_MAX_SAVED_ROUNDS),
          items: z
            .array(arithmeticV2SheetItemSchema)
            .min(1)
            .max(ARITHMETIC_MAX_ITEMS_PER_ROUND),
        }),
      )
      .min(1)
      .max(ARITHMETIC_MAX_SAVED_ROUNDS),
  })
  .superRefine((sheet, ctx) => {
    let total = 0;
    sheet.rounds.forEach((round, roundIndex) => {
      if (round.round !== roundIndex + 1)
        ctx.addIssue({
          code: "custom",
          path: ["rounds", roundIndex],
          message: "arithmetic:order",
        });
      total += round.items.length;
      const keys = new Set<string>();
      const prompts = new Set<string>();
      round.items.forEach((item, itemIndex) => {
        const path = ["rounds", roundIndex, "items", itemIndex];
        if (
          item.prompt.layout === "math" &&
          item.prompt.figureId &&
          (!sheet.figures ||
            !arithmeticGeometrySnapshotContains(
              sheet.figures,
              item.prompt.figureId,
            ))
        )
          ctx.addIssue({
            code: "custom",
            path,
            message: "arithmetic:missing-figures",
          });
        if (item.order !== itemIndex + 1)
          ctx.addIssue({ code: "custom", path, message: "arithmetic:order" });
        const key = `${item.typeId}:${item.domainIndex}`;
        if (keys.has(key))
          ctx.addIssue({
            code: "custom",
            path,
            message: "arithmetic:duplicate",
          });
        keys.add(key);
        const promptKey = arithmeticV2PromptIdentity(item.prompt);
        if (prompts.has(promptKey))
          ctx.addIssue({
            code: "custom",
            path,
            message: "arithmetic:duplicate",
          });
        prompts.add(promptKey);
      });
    });
    if (total > ARITHMETIC_MAX_ITEMS_TOTAL)
      ctx.addIssue({
        code: "custom",
        path: ["rounds"],
        message: "arithmetic:limit",
      });
  });
export type ArithmeticV2SheetPayload = z.infer<
  typeof arithmeticV2SheetPayloadSchema
>;
export type WorkspaceArithmeticV2CatalogResponse = {
  data: {
    engineVersion: typeof ARITHMETIC_V2_ENGINE_VERSION;
    catalogVersion: typeof ARITHMETIC_V2_CATALOG_VERSION;
    types: ArithmeticV2CatalogEntry[];
    limits: { itemsPerRound: number; itemsTotal: number; rounds: number };
    writerEnabled: boolean;
  };
};
export type WorkspaceArithmeticV2GenerateResponse = {
  data: ArithmeticV2SheetPayload;
};
