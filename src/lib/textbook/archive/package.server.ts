import "server-only";
import { z } from "zod";
import {
  textbookExchangeSchema,
  textbookPackagePathSchema,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import { textbookHashSchema } from "@/contracts/textbookPrimitives.contract";
import { canonicalBytes, type JsonValue } from "../canonical";
import { parseStrictJson } from "../strictJson";
import { sha256 } from "../hash.server";
import { assertAssetMime } from "../assets";
import {
  assertTextbookIntegrity,
  type ReadTextbookAsset,
} from "../integrity.server";
import {
  readZipFiles,
  readBoundedArchiveBytes,
  writeZipFiles,
  type ZipLimits,
} from "./zip";
import { mappingCsv } from "./mappingCsv";
import {
  loadTextbookLocalBundle,
  RESOURCE_ORIGIN,
} from "../render/bundle.server";

export const archiveManifestSchema = z.strictObject({
  version: z.literal("injaewon.textbook.package.v1"),
  editionId: z.string().min(1).max(160),
  manifestHash: textbookHashSchema.nullable(),
  files: z
    .array(
      z.strictObject({
        path: textbookPackagePathSchema,
        byteLength: z
          .number()
          .int()
          .nonnegative()
          .max(32 * 1024 * 1024),
        sha256: textbookHashSchema,
        mimeType: z.enum([
          "application/json",
          "text/csv",
          "text/css",
          "image/png",
          "image/jpeg",
          "image/webp",
          "image/svg+xml",
          "font/woff2",
          "font/woff",
          "font/ttf",
        ]),
      }),
    )
    .max(20_009),
});
export type ArchiveManifest = z.infer<typeof archiveManifestSchema>;
export interface TextbookArchive {
  mode: "archive";
  readOnly: true;
  originalBytes: Uint8Array;
  exchange: TextbookExchange;
  manifest: ArchiveManifest;
  files: ReadonlyMap<string, Uint8Array>;
  validation: JsonValue;
}

export async function readTextbookArchive(
  source: AsyncIterable<Uint8Array> | Uint8Array,
  limits: Partial<ZipLimits> = {},
): Promise<TextbookArchive> {
  const originalBytes = await readBoundedArchiveBytes(
    source,
    limits.maxCompressedBytes,
  );
  const files = readZipFiles(originalBytes, limits);
  const requireFile = (path: string) => {
    const file = files.get(path);
    if (!file) throw new Error(`Missing package file ${path}`);
    return file;
  };
  const manifest = archiveManifestSchema.parse(
    parseStrictJson(requireFile("manifest.json")),
  );
  const listed = new Set<string>();
  for (const file of manifest.files) {
    if (file.path === "manifest.json" || listed.has(file.path))
      throw new Error("Package manifest has duplicate or recursive entry");
    listed.add(file.path);
    const bytes = requireFile(file.path);
    if (bytes.length !== file.byteLength || sha256(bytes) !== file.sha256)
      throw new Error(`Package hash or length mismatch: ${file.path}`);
    if (file.mimeType === "application/json") parseStrictJson(bytes);
    else if (file.mimeType === "text/csv") {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (file.path !== "mapping.csv")
        throw new Error("Unexpected CSV package file");
    } else if (file.mimeType === "text/css") {
      if (!["runtime/fonts.css", "runtime/katex.css"].includes(file.path))
        throw new Error("Unexpected CSS package role");
      const css = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (/@import|expression\s*\(|javascript\s*:|<|\\/i.test(css))
        throw new Error("Unsafe package CSS");
      for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
        const fontPath = match[1].replace(/^["']|["']$/g, "");
        if (
          !/^runtime\/(?:(?:katex|editorial)\/)?fonts\/[A-Za-z0-9_.-]+$/.test(fontPath) ||
          !manifest.files.some(
            (f) => f.path === fontPath && f.mimeType.startsWith("font/"),
          )
        )
          throw new Error("Unbundled CSS font reference");
      }
    } else assertAssetMime(bytes, file.mimeType);
  }
  if (files.size !== listed.size + 1) throw new Error("Unlisted package files");
  for (const [path, mime] of [
    ["textbook.json", "application/json"],
    ["validation.json", "application/json"],
    ["mapping.csv", "text/csv"],
  ])
    if (!manifest.files.some((f) => f.path === path && f.mimeType === mime))
      throw new Error(`Missing or wrong package role: ${path}`);
  const exchange = textbookExchangeSchema.parse(
    parseStrictJson(requireFile("textbook.json")),
  );
  if (
    exchange.edition.editionId !== manifest.editionId ||
    exchange.edition.manifestHash !== manifest.manifestHash
  )
    throw new Error("Package edition identity mismatch");
  for (const a of exchange.assets) {
    const file = manifest.files.find((f) => f.path === a.packagePath);
    if (!file || file.mimeType !== a.mimeType || file.sha256 !== a.sha256)
      throw new Error(`Asset manifest mismatch: ${a.assetId}`);
  }
  await assertTextbookIntegrity(exchange, {
    mode: "archive",
    readAsset: async (id) => {
      const asset = exchange.assets.find((a) => a.assetId === id);
      if (!asset) throw new Error("Missing asset");
      return requireFile(asset.packagePath);
    },
  });
  if (
    new TextDecoder("utf-8", { fatal: true }).decode(
      requireFile("mapping.csv"),
    ) !== mappingCsv(exchange)
  )
    throw new Error("Mapping CSV differs from frozen page references");
  // Return exact original IDs, manifest and ZIP bytes. This module has no database write adapter.
  return {
    mode: "archive",
    readOnly: true,
    originalBytes,
    exchange,
    manifest,
    files,
    validation: parseStrictJson(requireFile("validation.json")),
  };
}

export async function textbookPackageFiles(
  exchange: TextbookExchange,
  readAsset: ReadTextbookAsset,
  validation: JsonValue,
): Promise<Map<string, Uint8Array>> {
  await assertTextbookIntegrity(exchange, { mode: "archive", readAsset });
  const files = new Map<string, Uint8Array>();
  const records: ArchiveManifest["files"] = [];
  const add = (
    path: string,
    bytes: Uint8Array,
    mimeType: ArchiveManifest["files"][number]["mimeType"],
  ) => {
    if (files.has(path) || path === "manifest.json")
      throw new Error(`Reserved or duplicate package path: ${path}`);
    files.set(path, bytes);
    records.push({
      path,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      mimeType,
    });
  };
  add("textbook.json", canonicalBytes(exchange), "application/json");
  add(
    "mapping.csv",
    new TextEncoder().encode(mappingCsv(exchange)),
    "text/csv",
  );
  add("validation.json", canonicalBytes(validation), "application/json");
  for (const asset of exchange.assets)
    add(asset.packagePath, await readAsset(asset.assetId), asset.mimeType);
  const bundle = await loadTextbookLocalBundle();
  for (const [url, resource] of bundle.resources)
    add(
      `runtime${url.slice(RESOURCE_ORIGIN.length)}`,
      resource.bytes,
      resource.mimeType as ArchiveManifest["files"][number]["mimeType"],
    );
  add(
    "runtime/fonts.css",
    new TextEncoder().encode(
      bundle.fontCss.replaceAll(`${RESOURCE_ORIGIN}/`, "runtime/"),
    ),
    "text/css",
  );
  add(
    "runtime/katex.css",
    new TextEncoder().encode(
      bundle.katexCss.replaceAll(`${RESOURCE_ORIGIN}/`, "runtime/"),
    ),
    "text/css",
  );
  const manifest = archiveManifestSchema.parse({
    version: "injaewon.textbook.package.v1",
    editionId: exchange.edition.editionId,
    manifestHash: exchange.edition.manifestHash,
    files: records,
  });
  files.set("manifest.json", canonicalBytes(manifest));
  return files;
}

export async function createTextbookArchive(
  exchange: TextbookExchange,
  readAsset: ReadTextbookAsset,
  validation: JsonValue,
  onChunk?: (chunk: Uint8Array) => void,
): Promise<Uint8Array | null> {
  const files = await textbookPackageFiles(exchange, readAsset, validation);
  if (onChunk) {
    writeZipFiles(files, onChunk);
    return null;
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  writeZipFiles(files, (chunk) => {
    chunks.push(chunk);
    length += chunk.length;
  });
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.length;
  }
  return bytes;
}

/** HTML imports extract only a bounded inert JSON payload. The HTML is never mounted or evaluated. */
export function exchangeFromInertHtml(html: string): TextbookExchange {
  if (html.length > 48 * 1024 * 1024)
    throw new Error("HTML input limit exceeded");
  const matches = [
    ...html.matchAll(
      /<script\s+type="application\/json"\s+id="textbook-exchange">([\s\S]*?)<\/script>/g,
    ),
  ];
  if (matches.length !== 1)
    throw new Error("Expected one inert textbook exchange payload");
  return textbookExchangeSchema.parse(parseStrictJson(matches[0][1]));
}
