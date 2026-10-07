import { ZodError } from "zod";
import { englishQuestionBankResponseSchema } from "@/contracts/englishQuestionBank.contract";
import { validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { bankJsonResponse } from "@/lib/english/bankJsonResponse";
import {
  listEnglishBankQuestions,
  questionBankErrorResponse,
  readQuestionBankQuery,
} from "@/lib/english/questionBank";
import { requireEnglishSession } from "@/lib/english/routeSupport";

export async function GET(request: Request) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;
  try {
    const query = readQuestionBankQuery(request);
    return bankJsonResponse(englishQuestionBankResponseSchema, {
      data: await listEnglishBankQuestions(db, gate.session, query),
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}
