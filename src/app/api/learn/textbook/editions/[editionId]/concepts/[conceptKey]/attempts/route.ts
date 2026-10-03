import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleStudentConcept } from "@/lib/textbook/studentRoutes";
type Context = { params: Promise<{ editionId: string; conceptKey: string }> };
export const GET = withErrorLog(
  "/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/attempts",
  async (request: Request, { params }: Context) =>
    handleStudentConcept(request, await params, "attempts"),
);
export const POST = withErrorLog(
  "/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/attempts",
  async (request: Request, { params }: Context) =>
    handleStudentConcept(request, await params, "submit"),
);
