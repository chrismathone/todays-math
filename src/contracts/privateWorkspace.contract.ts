import { z } from "zod";

export const documentIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);
export const documentKindSchema = z.enum(["draft", "extraction"]);
export const saveDocumentSchema = z.strictObject({
  kind: documentKindSchema,
  title: z.string().trim().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
  expectedRevision: z.number().int().min(0).nullable(),
});
export type PrivateDocumentSummary = {
  id: string;
  kind: "draft" | "extraction";
  title: string;
  problemCount: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type PrivateDocument = PrivateDocumentSummary & {
  payload: Record<string, unknown>;
};
