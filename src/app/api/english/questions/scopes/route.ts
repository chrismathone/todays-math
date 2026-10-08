import { ZodError, z } from "zod";
import { englishExamScopeResponseSchema } from "@/contracts/englishExamBuilder.contract";
import { validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { bankJsonResponse } from "@/lib/english/bankJsonResponse";
import {
  listEnglishExamScopes,
  questionBankErrorResponse,
  EnglishQuestionBankError,
} from "@/lib/english/questionBank";
import { requireEnglishSession } from "@/lib/english/routeSupport";
const querySchema = z.strictObject({
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(10_000))
    .default(1),
});
export async function GET(request: Request) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;
  try {
    const params = [...new URL(request.url).searchParams.entries()];
    if (params.length > 1 || request.url.length > 4096)
      throw new EnglishQuestionBankError("query");
    const { page } = querySchema.parse(Object.fromEntries(params));
    return bankJsonResponse(englishExamScopeResponseSchema, {
      data: await listEnglishExamScopes(db, gate.session, page),
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}
