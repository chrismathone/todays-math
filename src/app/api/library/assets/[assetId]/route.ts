import { readPrivateAsset, writePrivateAsset } from "@/lib/privateAssets";
type Context = { params: Promise<{ assetId: string }> };
export const GET = async (request: Request, context: Context) =>
  readPrivateAsset(request, (await context.params).assetId);
export const PUT = async (request: Request, context: Context) =>
  writePrivateAsset(request, (await context.params).assetId);
