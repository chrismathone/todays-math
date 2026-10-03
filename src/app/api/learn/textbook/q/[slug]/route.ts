import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleStudentQr } from "@/lib/textbook/studentRoutes";
type Context = { params: Promise<{ slug: string }> };
export const GET = withErrorLog(
  "/api/learn/textbook/q/[slug]",
  async (request: Request, { params }: Context) =>
    handleStudentQr(request, (await params).slug),
);
