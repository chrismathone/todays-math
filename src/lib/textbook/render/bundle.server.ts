import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AssetRef } from "@/contracts/textbookExchange.contract";
import { assertAssetMime } from "../assets";
import { sha256 } from "../hash.server";
import type { ReadTextbookAsset } from "../integrity.server";
import { TEXTBOOK_EDITORIAL_IMAGES } from "./editorialAssets";
export { TEXTBOOK_EDITORIAL_IMAGES } from "./editorialAssets";

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
    const fontFaces: string[] = [];
    for (const weight of [400, 700]) {
      const name = `NotoSansKR-${weight}.ttf`;
      const bytes = new Uint8Array(
        await readFile(
          path.join(process.cwd(), "public/textbook/editorial/fonts", name),
        ),
      );
      assertAssetMime(bytes, "font/ttf");
      const url = `${RESOURCE_ORIGIN}/editorial/fonts/${name}`;
      resources.set(url, { bytes, mimeType: "font/ttf" });
      fontFaces.push(
        `@font-face{font-family:TextbookPretendard;src:url(${url}) format('truetype');font-weight:${weight};font-style:normal;font-display:block}`,
      );
    }
    const fontCss = fontFaces.join("\n");
    for (const name of TEXTBOOK_EDITORIAL_IMAGES) {
      const bytes = new Uint8Array(
        await readFile(
          path.join(process.cwd(), "public/textbook/editorial", name),
        ),
      );
      assertAssetMime(bytes, "image/png");
      resources.set(editorialResourceUrl(name), {
        bytes,
        mimeType: "image/png",
      });
    }
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
    const fonts = await Promise.all(
      names.map(async (name) => {
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
        return [
          `${RESOURCE_ORIGIN}/katex/${name}`,
          { bytes, mimeType },
        ] as const;
      }),
    );
    for (const [url, resource] of fonts) resources.set(url, resource);
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
export function editorialResourceUrl(name: string): string {
  if (!(TEXTBOOK_EDITORIAL_IMAGES as readonly string[]).includes(name))
    throw new Error("Unknown bundled textbook illustration");
  return `${RESOURCE_ORIGIN}/editorial/${name}`;
}
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

/** Reuse large frozen images in a script-free single HTML file, preserving img geometry. */
export function shareInlineTextbookImages(body: string): {
  body: string;
  css: string;
} {
  const source =
    /\bsrc="(data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+)"/g;
  const counts = new Map<string, number>();
  for (const match of body.matchAll(source)) {
    if (match[1].length >= 16_384)
      counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const shared = new Map(
    [...counts]
      .filter(([, count]) => count > 1)
      .map(([url]) => [url, sha256(new TextEncoder().encode(url))]),
  );
  // CSS image content retains the frozen image's intrinsic dimensions. The transparent
  // src keeps a valid img fallback without JavaScript, blob URLs or network requests.
  const placeholder =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return {
    body: body.replace(source, (attribute, url: string) => {
      const id = shared.get(url);
      return id
        ? `src="${placeholder}" data-textbook-inline-image="${id}"`
        : attribute;
    }),
    css: [...shared]
      .map(
        ([url, id]) =>
          `.tb-paper img[data-textbook-inline-image="${id}"]{content:url("${url}")}`,
      )
      .join("\n"),
  };
}
