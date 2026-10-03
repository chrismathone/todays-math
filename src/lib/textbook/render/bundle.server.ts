import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AssetRef } from "@/contracts/textbookExchange.contract";
import { assertAssetMime } from "../assets";
import { sha256 } from "../hash.server";
import type { ReadTextbookAsset } from "../integrity.server";

export interface TrustedResource {
  bytes: Uint8Array;
  mimeType: string;
}
export interface LocalTextbookBundle {
  fontCss: string;
  katexCss: string;
  resources: Map<string, TrustedResource>;
}
export const RESOURCE_ORIGIN = "https://textbook.invalid";
let bundlePromise: Promise<LocalTextbookBundle> | undefined;
export function loadTextbookLocalBundle(): Promise<LocalTextbookBundle> {
  return (bundlePromise ??= (async () => {
    const resources = new Map<string, TrustedResource>();
    const font = new Uint8Array(
      await readFile(
        path.join(process.cwd(), "public/fonts/PretendardVariable.woff2"),
      ),
    );
    assertAssetMime(font, "font/woff2");
    resources.set(`${RESOURCE_ORIGIN}/fonts/PretendardVariable.woff2`, {
      bytes: font,
      mimeType: "font/woff2",
    });
    const fontCss = `@font-face{font-family:TextbookPretendard;src:url(${RESOURCE_ORIGIN}/fonts/PretendardVariable.woff2) format('woff2');font-weight:45 920;font-style:normal;font-display:block}`;
    let katexCss = await readFile(
      path.join(process.cwd(), "node_modules/katex/dist/katex.min.css"),
      "utf8",
    );
    const names = [
      ...new Set(
        [
          ...katexCss.matchAll(
            /url\((?:["'])?(fonts\/[A-Za-z0-9_.-]+)(?:["'])?\)/g,
          ),
        ].map((m) => m[1]),
      ),
    ];
    for (const name of names) {
      const mimeType = name.endsWith(".woff2")
        ? "font/woff2"
        : name.endsWith(".woff")
          ? "font/woff"
          : "font/ttf";
      const bytes = new Uint8Array(
        await readFile(
          path.join(process.cwd(), "node_modules/katex/dist", name),
        ),
      );
      assertAssetMime(bytes, mimeType);
      resources.set(`${RESOURCE_ORIGIN}/katex/${name}`, { bytes, mimeType });
    }
    katexCss = katexCss.replace(
      /url\((?:["'])?(fonts\/[A-Za-z0-9_.-]+)(?:["'])?\)/g,
      (_, name: string) => `url(${RESOURCE_ORIGIN}/katex/${name})`,
    );
    return { fontCss, katexCss, resources };
  })().catch((error: unknown) => {
    bundlePromise = undefined;
    throw error;
  }));
}

export async function loadTextbookAssets(
  assets: readonly AssetRef[],
  readAsset: ReadTextbookAsset,
): Promise<Map<string, TrustedResource>> {
  const resources = new Map<string, TrustedResource>();
  let total = 0;
  for (const asset of assets) {
    const bytes = await readAsset(asset.assetId);
    total += bytes.length;
    if (bytes.length > 32 * 1024 * 1024 || total > 256 * 1024 * 1024)
      throw new Error("Textbook render asset limit exceeded");
    if (sha256(bytes) !== asset.sha256)
      throw new Error(`Asset hash mismatch: ${asset.assetId}`);
    assertAssetMime(bytes, asset.mimeType);
    resources.set(
      `${RESOURCE_ORIGIN}/assets/${encodeURIComponent(asset.assetId)}`,
      { bytes, mimeType: asset.mimeType },
    );
  }
  return resources;
}
export const dataUrl = (resource: TrustedResource): string =>
  `data:${resource.mimeType};base64,${Buffer.from(resource.bytes).toString("base64")}`;
export function inlineBundleCss(
  css: string,
  resources: ReadonlyMap<string, TrustedResource>,
): string {
  return css.replace(
    /url\((?:["'])?(https:\/\/textbook\.invalid\/[^)'"\s]+)(?:["'])?\)/g,
    (_, url: string) => {
      const resource = resources.get(url);
      if (!resource) throw new Error(`Missing local font ${url}`);
      return `url(${dataUrl(resource)})`;
    },
  );
}
