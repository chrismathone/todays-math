import { ZodError } from "zod";
import {
  englishQuestionBankResolveRequestSchema,
  englishQuestionBankResolveResponseSchema,
} from "@/contracts/englishQuestionBank.contract";
import { validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { bankJsonResponse } from "@/lib/english/bankJsonResponse";
import {
  questionBankErrorResponse,
  readQuestionBankBody,
  resolveEnglishBankQuestions,
} from "@/lib/english/questionBank";
import { requireEnglishSession } from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: Request) {
  // This POST does not mutate storage, but still requires the existing same-origin gate.
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;
  try {
    const input = englishQuestionBankResolveRequestSchema.safeParse(
      await readQuestionBankBody(request),
    );
    if (!input.success) return validationError(input.error);
    return bankJsonResponse(englishQuestionBankResolveResponseSchema, {
      data: await resolveEnglishBankQuestions(db, gate.session, input.data),
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}

export const POST = withErrorLog("/api/english/questions/resolve", handlePost);
