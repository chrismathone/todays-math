import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { readPrivateAsset, writePrivateAsset } from "@/lib/privateAssets";
type Context = { params: Promise<{ assetId: string }> };
export const GET = withErrorLog(
  "/api/library/assets/[assetId]",
  async (request: Request, context: Context) =>
    readPrivateAsset(request, (await context.params).assetId),
);
export const PUT = withErrorLog(
  "/api/library/assets/[assetId]",
  async (request: Request, context: Context) =>
    writePrivateAsset(request, (await context.params).assetId),
);
