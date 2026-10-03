import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleStudentConcept } from "@/lib/textbook/studentRoutes";
type Context = { params: Promise<{ editionId: string; conceptKey: string }> };
export const POST = withErrorLog(
  "/api/learn/textbook/editions/[editionId]/concepts/[conceptKey]/review",
  async (request: Request, { params }: Context) =>
    handleStudentConcept(request, await params, "review"),
);
