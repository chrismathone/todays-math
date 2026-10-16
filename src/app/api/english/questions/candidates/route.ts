import { ZodError } from "zod";
import {
  englishExamCandidatesSchema,
  englishExamCandidatesResponseSchema,
} from "@/contracts/englishExamBuilder.contract";
import { validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { bankJsonResponse } from "@/lib/english/bankJsonResponse";
import {
  listEnglishExamCandidates,
  questionBankErrorResponse,
  readQuestionBankBody,
} from "@/lib/english/questionBank";
import { requireEnglishSession } from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function handlePost(request: Request) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;
  try {
    const input = englishExamCandidatesSchema.parse(
      await readQuestionBankBody(request),
    );
    return bankJsonResponse(englishExamCandidatesResponseSchema, {
      data: await listEnglishExamCandidates(db, gate.session, input),
    });
  } catch (error) {
    if (error instanceof ZodError) return validationError(error);
    return questionBankErrorResponse(error);
  }
}

export const POST = withErrorLog(
  "/api/english/questions/candidates",
  handlePost,
);
