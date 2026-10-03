import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleStudentAsset } from "@/lib/textbook/studentRoutes";
type Context = { params: Promise<{ slug: string; assetId: string }> };
export const GET = withErrorLog(
  "/api/learn/textbook/q/[slug]/assets/[assetId]",
  async (request: Request, { params }: Context) => {
    const { slug, assetId } = await params;
    return handleStudentAsset(request, slug, assetId);
  },
);
export const HEAD = withErrorLog(
  "/api/learn/textbook/q/[slug]/assets/[assetId]",
  async (request: Request, context: Context) => {
    const { slug, assetId } = await context.params;
    return handleStudentAsset(request, slug, assetId);
  },
);
