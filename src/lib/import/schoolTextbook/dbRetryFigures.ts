/** Node/CLI figure evidence for DB retries; no database writes or model calls. */
import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { validDevAiSvg } from "../../dev-ai/svg";
import { figureFabricationReason } from "../../figure/figureMatchesContent";
import { classifyFigure, PRESENTS_GRAPH } from "../../figure/missingFigureRule";
import { renderFigureSpec } from "../../figure/renderFigureSpec";
import {
  createSharedFigureAssetHandler,
  validateSharedFigureBaseUrl,
} from "../../sharedFigureAssets";
import { loadSharedFigureManifest } from "../../sharedFigureManifest";
import type { DbRetryFigures, DbRetryImage } from "./dbRetry.types";
import { reviewDigest } from "./qualification";

const MAX_BYTES = 16 * 1024 * 1024;
const MAX_SVG_BYTES = 1024 * 1024;
const MAX_PIXELS = 16 * 1024 * 1024;
const MAX_SIDE = 8192;
const MAX_IMAGES = 24;

/** Both the read-only DB snapshot and the generated DTO use this boundary. */
export interface DbRetryFigureSource {
  content?: string;
  source?: string;
  figure_svg?: string | null;
  figureSvg?: string | null;
  figure_urls?: readonly string[];
  figureUrls?: readonly string[];
  choice_figure_index?: unknown;
  choiceFigureIndex?: unknown;
}
export interface DbRetryFigureOptions {
  /** Trusted filesystem root, chiefly for offline tests. Only figure subtrees are read. */
  publicDir?: string;
  /** Trusted deployment configuration; requests cannot supply a new CDN host. */
  cdnBaseUrl?: string;
  manifest?: unknown;
  fetch?: typeof globalThis.fetch;
  requireFigures?: boolean;
}

export class DbRetryFigureError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DbRetryFigureError";
  }
}
function reject(code: string, message: string): never {
  throw new DbRetryFigureError(code, message);
}
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
type HashedImage = DbRetryImage & { sourceSha256: string };

function evidence(images: HashedImage[]): DbRetryFigures {
  return {
    images,
    digest: reviewDigest(
      images.map(({ sha256, choiceIndex, origin, sourceSha256 }) => ({
        sha256,
        choiceIndex,
        origin,
        sourceSha256: sourceSha256 ?? null,
      })),
    ),
  };
}
function image(
  bytes: Buffer,
  mime: string,
  choiceIndex: number,
  origin: DbRetryImage["origin"],
  sourceBytes = bytes,
): HashedImage {
  if (!bytes.length || bytes.length > MAX_BYTES)
    reject("image-size", "그림 바이트 크기가 허용 범위를 벗어났습니다.");
  return {
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
    sha256: hash(bytes),
    sourceSha256: hash(sourceBytes),
    choiceIndex,
    origin,
  };
}
function dimensions(width: number | undefined, height: number | undefined) {
  if (
    !width ||
    !height ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_SIDE ||
    height > MAX_SIDE ||
    width * height > MAX_PIXELS
  )
    reject("dimensions", "그림 치수가 없거나 허용 범위를 벗어났습니다.");
}

function safeSvg(svg: string, database: boolean) {
  if (typeof svg !== "string" || Buffer.byteLength(svg) > MAX_SVG_BYTES)
    reject("svg-size", "SVG 크기가 허용 범위를 벗어났습니다.");
  // Existing vector exports carry this inert editor namespace and escaped
  // data-text glyph metadata. Validate a copy using the existing static grammar;
  // rasterize and fingerprint the ORIGINAL bytes, without silently sanitizing.
  const check = database
    ? svg
        .replace(
          /\sxmlns:inkscape=(?:"http:\/\/www\.inkscape\.org\/namespaces\/inkscape"|'http:\/\/www\.inkscape\.org\/namespaces\/inkscape')/g,
          "",
        )
        .replace(/\sdata-text=("[^"<]*"|'[^'<]*')/g, " data-label=$1")
    : svg;
  // This grammar rejects external resources, embedded rasters, scripts, CSS,
  // entities/DTDs, animation, malformed XML and multiple/nested SVG roots.
  if (!validDevAiSvg(check))
    reject("unsafe-svg", "SVG 정적 안전 검사를 통과하지 못했습니다.");
  const root = /^\s*<svg\b[^>]*>/.exec(svg)?.[0];
  if (!root) reject("unsafe-svg", "SVG 루트를 읽지 못했습니다.");
  const attr = (name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`)
      .exec(root)
      ?.slice(1)
      .find((value) => value !== undefined);
  const length = (value: string) => {
    const parsed = /^(\d+(?:\.\d+)?)(px|mm|cm|in|pt|pc)?$/.exec(value);
    if (!parsed) return NaN;
    const factors: Record<string, number> = {
      px: 1,
      mm: 96 / 25.4,
      cm: 96 / 2.54,
      in: 96,
      pt: 96 / 72,
      pc: 16,
    };
    return Number(parsed[1]) * (factors[parsed[2] ?? "px"] ?? NaN);
  };
  const w = attr("width"),
    h = attr("height"),
    box = attr("viewBox");
  if (w !== undefined || h !== undefined)
    dimensions(
      w === undefined ? undefined : length(w),
      h === undefined ? undefined : length(h),
    );
  if (box !== undefined) {
    const values = box
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (values.length !== 4 || !values.every(Number.isFinite))
      reject("dimensions", "SVG viewBox 치수가 올바르지 않습니다.");
    dimensions(values[2], values[3]);
  } else if (w === undefined || h === undefined) {
    reject("dimensions", "SVG 치수가 없습니다.");
  }
}

async function svgImage(
  svg: string,
  choiceIndex: number,
  origin: "database-svg" | "generated-svg",
): Promise<HashedImage> {
  safeSvg(svg, origin === "database-svg");
  const bytes = Buffer.from(svg, "utf8");
  try {
    // Local libvips, with no browser/network. 144 DPI retains small math labels.
    const pipeline = sharp(bytes, {
      density: 144,
      limitInputPixels: MAX_PIXELS,
      failOn: "warning",
    });
    const metadata = await pipeline.metadata();
    dimensions(metadata.width, metadata.height);
    const png = await pipeline
      .flatten({ background: "white" })
      .png()
      .timeout({ seconds: 15 })
      .toBuffer();
    return image(png, "image/png", choiceIndex, origin, bytes);
  } catch (error) {
    if (error instanceof DbRetryFigureError) throw error;
    reject("svg-render", "SVG를 검산용 PNG로 그리지 못했습니다.");
  }
}

function safeSegments(value: string): boolean {
  return value
    .split("/")
    .every(
      (part) =>
        part.length > 0 &&
        part.length <= 255 &&
        part !== "." &&
        part !== ".." &&
        part.trim() === part &&
        !/[\\%?#:\u0000-\u001f\u007f\ud800-\udfff]/u.test(part),
    );
}
function localKey(value: string): string | null {
  return /^\/(?:figures|figures-svg)\//.test(value) &&
    safeSegments(value.slice(1))
    ? value
    : null;
}
const inside = (root: string, file: string) => {
  const relative = path.relative(root, file);
  return (
    relative.length > 0 &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
};

async function publicBytes(
  publicDir: string,
  key: string,
): Promise<Buffer | null> {
  const root = path.resolve(publicDir);
  const candidate = path.resolve(root, ...key.slice(1).split("/"));
  if (!inside(root, candidate))
    reject("unsafe-path", "그림 경로가 public 밖을 가리킵니다.");
  let file: string;
  try {
    const canonicalRoot = await realpath(root);
    file = await realpath(candidate);
    if (!inside(canonicalRoot, file))
      reject("unsafe-path", "그림 링크가 public 밖을 가리킵니다.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (error instanceof DbRetryFigureError) throw error;
    reject("local-read", "로컬 그림 경로를 읽지 못했습니다.");
  }
  const handle = await open(file, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_BYTES)
      reject("image-size", "로컬 그림 파일 크기가 허용 범위를 벗어났습니다.");
    const buffer = Buffer.alloc(stat.size + 1);
    let size = 0;
    while (size < buffer.length) {
      const read = await handle.read(buffer, size, buffer.length - size, null);
      if (!read.bytesRead) break;
      size += read.bytesRead;
    }
    if (size !== stat.size)
      reject("local-read", "읽는 동안 그림 파일 크기가 바뀌었습니다.");
    return buffer.subarray(0, size);
  } finally {
    await handle.close();
  }
}

const formats: Record<string, string> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  webp: "webp",
  gif: "gif",
  avif: "heif",
};
async function loadedImage(
  bytes: Buffer,
  key: string,
  choice: number,
): Promise<HashedImage> {
  const extension = path.extname(key).slice(1).toLowerCase();
  if (extension === "svg") {
    let svg: string;
    try {
      // Preserve a UTF-8 BOM too: sourceSha256 is a hash of read bytes.
      svg = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        bytes,
      );
    } catch {
      reject("unsafe-svg", "SVG UTF-8 바이트가 올바르지 않습니다.");
    }
    return svgImage(svg, choice, "database-svg");
  }
  if (!Object.hasOwn(formats, extension))
    reject("image-format", "지원하지 않는 그림 형식입니다.");
  try {
    const pipeline = sharp(bytes, {
      limitInputPixels: MAX_PIXELS,
      failOn: "warning",
    });
    const metadata = await pipeline.metadata();
    if (metadata.format !== formats[extension] || (metadata.pages ?? 1) !== 1)
      reject(
        "image-format",
        "그림 바이트 형식이 주소와 다르거나 여러 프레임입니다.",
      );
    dimensions(metadata.width, metadata.height);
    // Decode all pixels to catch truncation, rather than accepting headers alone.
    const png = await pipeline.png().timeout({ seconds: 15 }).toBuffer();
    if (["png", "jpg", "jpeg", "webp"].includes(extension))
      return image(
        bytes,
        `image/${formats[extension]}`,
        choice,
        "database-raster",
      );
    return image(png, "image/png", choice, "database-raster", bytes);
  } catch (error) {
    if (error instanceof DbRetryFigureError) throw error;
    reject("image-decode", "그림 픽셀과 치수를 읽지 못했습니다.");
  }
}

/** Reads every requested image, or rejects the whole packet; never drops a failed image. */
export async function loadDbRetryFigures(
  source: DbRetryFigureSource,
  options: DbRetryFigureOptions = {},
): Promise<DbRetryFigures> {
  const svg = source.figure_svg ?? source.figureSvg ?? null;
  const urls = source.figure_urls ?? source.figureUrls ?? [];
  const choices = source.choice_figure_index ?? source.choiceFigureIndex ?? [];
  if (
    (svg !== null && typeof svg !== "string") ||
    !Array.isArray(urls) ||
    !urls.every((url) => typeof url === "string")
  )
    reject("figure-fields", "그림 필드 형식이 올바르지 않습니다.");
  if (urls.length + (svg ? 1 : 0) > MAX_IMAGES)
    reject("image-count", "문항의 그림 수가 허용 범위를 벗어났습니다.");
  if (
    !Array.isArray(choices) ||
    choices.length !== urls.length ||
    !choices.every(
      (choice) => Number.isInteger(choice) && choice >= 0 && choice <= 10,
    ) ||
    new Set(choices.filter((choice) => choice !== 0)).size !==
      choices.filter((choice) => choice !== 0).length
  )
    reject(
      "choice-index",
      "그림 보기 번호가 없거나 순서와 개수가 올바르지 않습니다.",
    );
  const generated = source.source === "transformed";
  if (generated && urls.length)
    reject(
      "inherited-image",
      "새 변형은 기존 그림 주소를 재사용할 수 없습니다. 새 SVG를 그려야 합니다.",
    );
  const images: HashedImage[] = [];
  if (svg)
    images.push(
      await svgImage(svg, 0, generated ? "generated-svg" : "database-svg"),
    );
  // Named points can be fully defined in text. The blind solver must check
  // completeness; a geometry-label census alone cannot prove missing bytes.
  if (
    !images.length &&
    !urls.length &&
    (options.requireFigures ||
      /\[그림\]/.test(source.content ?? "") ||
      classifyFigure(source.content ?? "") === "유실" ||
      PRESENTS_GRAPH.test(source.content ?? ""))
  )
    reject("missing-evidence", "본문에 필요한 그림 근거가 없습니다.");

  let manifest: unknown;
  let shared: ReturnType<typeof createSharedFigureAssetHandler> | undefined;
  const base = validateSharedFigureBaseUrl(
    options.cdnBaseUrl ?? process.env.SHARED_FIGURE_CDN_BASE_URL,
  );
  const remote = () => {
    manifest ??= options.manifest ?? loadSharedFigureManifest();
    shared ??= createSharedFigureAssetHandler({
      manifest,
      baseUrl: base?.href,
      fetch: options.fetch,
    });
    return shared;
  };
  for (const [index, url] of urls.entries()) {
    let key = localKey(url);
    const isRemote = key === null;
    if (isRemote) {
      // Accept only the exact configured content-addressed manifest object URL.
      if (!base || !url.startsWith(base.href))
        reject("unsafe-path", "허용되지 않는 그림 호스트나 경로입니다.");
      const objectPath = url.slice(base.href.length);
      if (
        !safeSegments(objectPath) ||
        !/^v1\/[a-f0-9]{64}\/(?:figures|figures-svg)\//.test(objectPath)
      )
        reject("unsafe-path", "허용되지 않는 CDN 그림 경로입니다.");
      key = localKey(`/${objectPath.split("/").slice(2).join("/")}`);
      remote();
      const entry = (
        manifest as { entries?: Record<string, { objectPath?: string }> }
      ).entries?.[key ?? ""];
      if (!key || entry?.objectPath !== objectPath)
        reject("unsafe-path", "CDN 그림이 기존 manifest에 없습니다.");
    }
    if (!key) reject("unsafe-path", "허용되지 않는 그림 경로입니다.");
    let bytes = isRemote
      ? null
      : await publicBytes(
          options.publicDir ?? path.join(process.cwd(), "public"),
          key,
        );
    if (!bytes && base) {
      remote();
      const entry = (
        manifest as { entries?: Record<string, { size?: number }> }
      ).entries?.[key];
      if (entry?.size !== undefined && entry.size > MAX_BYTES)
        reject("image-size", "CDN 그림 파일 크기가 허용 범위를 벗어났습니다.");
      const [kind, ...parts] = key.slice(1).split("/");
      const response = await remote()(
        new Request(`https://figures.invalid${key}`),
        {
          params: Promise.resolve({ kind, path: parts }),
        },
      );
      if (response.ok) bytes = Buffer.from(await response.arrayBuffer());
      else
        reject("cdn-read", "manifest의 CDN 그림 바이트를 검증하지 못했습니다.");
    }
    if (!bytes) reject("missing-image", "그림 파일을 읽지 못했습니다.");
    if (!bytes.length || bytes.length > MAX_BYTES)
      reject("image-size", "그림 크기가 허용 범위를 벗어났습니다.");
    images.push(await loadedImage(bytes, key, choices[index]));
  }
  return evidence(images);
}

/** Generated SVG contains only new vector geometry; embedded/external rasters are rejected. */
export async function figuresFromDbRetrySvg(
  svg: string,
): Promise<DbRetryFigures> {
  return evidence([await svgImage(svg, 0, "generated-svg")]);
}

export async function renderDbRetryFigure(
  spec: unknown,
  content: string,
): Promise<{ svg: string; figures: DbRetryFigures }> {
  if (!spec || typeof spec !== "object" || Array.isArray(spec))
    reject("figure-spec", "새 도형 스펙이 없습니다.");
  const fabricated = figureFabricationReason(
    spec as Record<string, unknown>,
    content,
  );
  if (fabricated) reject("fabricated-spec", fabricated);
  // Never retry by deleting a dimension or repairing geometry behind the caller.
  const rendered = await renderFigureSpec(spec, { strict: true });
  if (!rendered.ok) reject("figure-render", rendered.error);
  // Successful SVG serialization is not successful mathematical typesetting.
  // Inspect visible text only; MathJax paths may retain source TeX in metadata.
  const visibleLabels = [
    ...rendered.svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text\s*>/gi),
  ];
  if (
    visibleLabels.some(([, label]) =>
      /\\[a-zA-Z]+/.test(
        label
          .replace(/<[^>]*>/g, "")
          .replace(/&#(?:0*92|x0*5c);|&bsol;/gi, "\\"),
      ),
    )
  )
    reject(
      "untypeset-math",
      "새 그림에 조판되지 않은 LaTeX 수식이 남아 있습니다.",
    );
  if (rendered.droppedDimensions?.length)
    reject(
      "dropped-dimensions",
      "그림 치수를 생략한 결과는 사용할 수 없습니다.",
    );
  return {
    svg: rendered.svg,
    figures: await figuresFromDbRetrySvg(rendered.svg),
  };
}
