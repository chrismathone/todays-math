import { ZodError } from "zod";
import { englishQuestionBankResponseSchema } from "@/contracts/englishQuestionBank.contract";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
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
    const response = jsonOk(englishQuestionBankResponseSchema, {
      data: await listEnglishBankQuestions(db, gate.session, query),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}
