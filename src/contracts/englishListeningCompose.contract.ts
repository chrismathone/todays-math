import { z } from "zod";
import type { ListeningSetDetail } from "./englishListeningHttp.contract";

/** Selections name an exact saved source, never a caller-supplied audio or answer. */
export const listeningComposeSelectionSchema = z
  .strictObject({
    setId: z.uuid(),
    expectedRevision: z.number().int().positive().max(2147483646),
    documentHash: z.string().regex(/^[a-f0-9]{64}$/),
    groupId: z.uuid(),
    questionIds: z.array(z.uuid()).min(1).max(30),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.questionIds).size !== value.questionIds.length)
      ctx.addIssue({
        code: "custom",
        message: "같은 문항은 한 번만 담을 수 있습니다.",
      });
  });

export const listeningComposeInputSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    level: z.string().trim().min(1).max(80).nullable().optional(),
    selections: z.array(listeningComposeSelectionSchema).min(1).max(30),
  })
  .superRefine((value, ctx) => {
    const keys = value.selections.map(
      (item) => `${item.setId}:${item.groupId}`,
    );
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: "custom",
        message: "같은 음원의 문항은 한 묶음으로 담아 주세요.",
      });
  });

export type ListeningComposeSelection = z.infer<
  typeof listeningComposeSelectionSchema
>;
export type ListeningComposeInput = z.infer<typeof listeningComposeInputSchema>;
export interface ListeningComposeSource {
  detail: ListeningSetDetail;
  documentHash: string;
}
