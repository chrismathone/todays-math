/**
 * GET · POST /api/exam-publications — 월말평가 M1 «반에 내기»(내가 낸 기록 · 반 여럿에 내기).
 * 대응 계약: src/contracts/examPublication.contract.ts
 */
import { examPublicationInputSchema } from "@/contracts/examPublication.contract";
import { unauthorizedError, validationError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  listExamPublications,
  publishExam,
} from "@/lib/examPublication/server";
import { getSessionUser } from "@/lib/session";

async function handleGet() {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  return listExamPublications(session);
}

async function handlePost(request: Request) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const parsed = examPublicationInputSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) return validationError(parsed.error);
  return publishExam(session, parsed.data);
}

export const GET = withErrorLog("/api/exam-publications", handleGet);
export const POST = withErrorLog("/api/exam-publications", handlePost);
