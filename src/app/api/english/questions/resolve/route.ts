import { ZodError } from "zod";
import {
  englishQuestionBankResolveRequestSchema,
  englishQuestionBankResolveResponseSchema,
} from "@/contracts/englishQuestionBank.contract";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  questionBankErrorResponse,
  readQuestionBankBody,
  resolveEnglishBankQuestions,
} from "@/lib/english/questionBank";
import { requireEnglishSession } from "@/lib/english/routeSupport";

export async function POST(request: Request) {
  // This POST does not mutate storage, but still requires the existing same-origin gate.
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;
  try {
    const input = englishQuestionBankResolveRequestSchema.safeParse(
      await readQuestionBankBody(request),
    );
    if (!input.success) return validationError(input.error);
    const response = jsonOk(englishQuestionBankResolveResponseSchema, {
      data: await resolveEnglishBankQuestions(db, gate.session, input.data),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}
