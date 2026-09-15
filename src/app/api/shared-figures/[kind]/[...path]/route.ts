import { loadSharedFigureManifest } from "@/lib/sharedFigureManifest";
import {
  createSharedFigureAssetHandler,
  type SharedFigureRouteContext,
} from "@/lib/sharedFigureAssets";

export const runtime = "nodejs";

const deliverAsset = createSharedFigureAssetHandler({
  manifest: process.env.SHARED_FIGURE_CDN_BASE_URL
    ? loadSharedFigureManifest()
    : null,
  baseUrl: process.env.SHARED_FIGURE_CDN_BASE_URL,
});

export async function GET(request: Request, context: SharedFigureRouteContext) {
  return deliverAsset(request, context);
}

export async function HEAD(
  request: Request,
  context: SharedFigureRouteContext,
) {
  return deliverAsset(request, context);
}
