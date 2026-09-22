import { loadSharedFigureManifest } from "@/lib/sharedFigureManifest";
import {
  createSharedFigureAssetHandler,
  type SharedFigureRouteContext,
} from "@/lib/sharedFigureAssets";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";

const deliverAsset = createSharedFigureAssetHandler({
  manifest: process.env.SHARED_FIGURE_CDN_BASE_URL
    ? loadSharedFigureManifest()
    : null,
  baseUrl: process.env.SHARED_FIGURE_CDN_BASE_URL,
});

async function handleGet(request: Request, context: SharedFigureRouteContext) {
  return deliverAsset(request, context);
}

async function handleHead(request: Request, context: SharedFigureRouteContext) {
  return deliverAsset(request, context);
}

export const GET = withErrorLog(
  "/api/shared-figures/[kind]/[...path]",
  handleGet,
);
export const HEAD = withErrorLog(
  "/api/shared-figures/[kind]/[...path]",
  handleHead,
);
