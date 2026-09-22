import { readPrivateAsset } from "@/lib/privateAssets";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function handleGet(
  request: Request,
  context: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await context.params;
  return readPrivateAsset(request, assetId, id);
}

export const GET = withErrorLog(
  "/api/admin/users/[id]/assets/[assetId]",
  handleGet,
);
