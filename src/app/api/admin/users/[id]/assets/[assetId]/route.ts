import { readPrivateAsset } from "@/lib/privateAssets";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await context.params;
  return readPrivateAsset(request, assetId, id);
}
