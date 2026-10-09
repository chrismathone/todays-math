import { z } from "zod";
import { problemSourceSchema, uuidSchema } from "./common.contract";
import { problemCodeSchema } from "./problemCode.contract";

/** Read-only provenance. These describe the source, never the generated question's exam membership. */
export const problemSourceReferenceSchema = z.strictObject({
  problemId: uuidSchema,
  problemCode: problemCodeSchema,
  source: problemSourceSchema,
  questionNumber: z.number().int().nullable(),
  school: z.string().nullable(),
  subject: z.string().nullable(),
  exam: z
    .strictObject({
      school: z.string(),
      year: z.number().int(),
      semester: z.number().int(),
      round: z.string(),
      subject: z.string(),
      number: z.number().int().nullable(),
    })
    .nullable(),
  material: z
    .strictObject({
      publisher: z.string(),
      author: z.string().nullable(),
      title: z.string(),
      curriculum: z.string(),
      kind: z.string(),
      materialTitle: z.string(),
      unitRaw: z.string().nullable(),
    })
    .nullable(),
});

export type ProblemSourceReference = z.infer<
  typeof problemSourceReferenceSchema
>;
