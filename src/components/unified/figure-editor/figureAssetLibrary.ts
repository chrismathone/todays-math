/** Static, content-addressed stock images; no Vite-only glob or eager SVG bundle. */
import { FIGURE_ASSETS, type FigureAsset } from "@/lib/figure/assetCatalog";
import registry from "@/lib/figure/asset-editor-geometry.json";
import anchors from "../../../../scripts/figure/assets/anchors.json";

export interface FigureLibraryAsset extends FigureAsset {
  thumb: string;
  center?: number[];
  sourceSHA256: string;
}

const identities: Readonly<Record<string, { sourceSHA256: string }>> = registry.assets;
const centers: Readonly<Record<string, { center?: number[] }>> = anchors;
export const FIGURE_LIBRARY: readonly FigureLibraryAsset[] = FIGURE_ASSETS.map((asset) => {
  const sourceSHA256 = identities[asset.slug].sourceSHA256;
  return { ...asset, sourceSHA256,
    thumb: `/figure-assets/${sourceSHA256.slice(0, 16)}-${asset.slug}.svg`,
    center: centers[asset.slug]?.center };
});

const bodies = new Map<string, Promise<string>>();
/** Load only a known local stock and verify its exact LF-normalized source bytes. */
export function loadFigureAsset(asset: Pick<FigureAsset, "slug">): Promise<string> {
  const stock = FIGURE_LIBRARY.find((row) => row.slug === asset.slug);
  if (!stock) return Promise.reject(new Error("알 수 없는 그림입니다."));
  const cached = bodies.get(stock.slug);
  if (cached) return cached;
  const pending = (async () => {
    const response = await fetch(stock.thumb, { cache: "force-cache", credentials: "same-origin" });
    if (!response.ok || response.redirected) throw new Error("그림 파일을 읽지 못했습니다.");
    const body = await response.text();
    if (body.length > 100_000) throw new Error("그림 파일의 크기를 확인해 주세요.");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body.replace(/\r\n/g, "\n")));
    const actual = Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("");
    if (actual !== stock.sourceSHA256) throw new Error("그림 파일의 버전을 확인해 주세요.");
    return body;
  })();
  bodies.set(stock.slug, pending);
  // A failed load must be retryable; it never certifies or substitutes another image.
  void pending.catch(() => { if (bodies.get(stock.slug) === pending) bodies.delete(stock.slug); });
  return pending;
}
