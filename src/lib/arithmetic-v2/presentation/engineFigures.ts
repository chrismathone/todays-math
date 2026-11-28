import { inflateSync, strFromU8 } from "fflate";
import {
  decodeArithmeticPack,
  enginePackMatch,
  hasPackFamily,
  readArithmeticPack,
  type InlineReference,
} from "./packAssets";
import type { ArithmeticV2Prompt } from "../types";

type Row = readonly [canonical: string, display: string, lines: string[]];
type Family = Record<string, Row>;
const cache = new Map<string, Family>();
type InlineRow = readonly [
  canonical: string,
  template: number,
  numbers: string[],
  lines: string[],
];
const inlineCache = new Map<string, string>();
const inlineRows = new Map<string, InlineRow>();

function bytesOf(encoded: string): Uint8Array {
  const binary = atob(encoded),
    bytes = new Uint8Array(binary.length);
  // Avoid String's per-character iterator allocation on mixed-sheet reads.
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Immutable display assets, compiled OFFLINE by the authoritative Python
 * FigureScene engine. No record writer, renderer, network or browser dependency.
 * The existing saved v1/v2 packs continue to validate their exact frozen bytes. */
function row(id: string): Row | undefined {
  const match = enginePackMatch(id);
  if (!match || !hasPackFamily("engine", match[1])) return undefined;
  const family = match[1];
  let decoded = cache.get(family);
  if (!decoded) {
    decoded = decodeArithmeticPack("engine", family, () => {
      const bytes = bytesOf(readArithmeticPack("engine", family));
      return JSON.parse(strFromU8(inflateSync(bytes))) as Family;
    });
  }
  cache.delete(family);
  cache.set(family, decoded);
  // Version 1 has exactly 64 finite registered families (~12.1MB decoded JSON).
  // Keep the bounded set lazy, avoiding whole-family churn on mixed worksheets.
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  return decoded[id];
}

export function hasArithmeticEngineFigure(id: string): boolean {
  return row(id) !== undefined;
}

/** A new/changed variant of an engine-owned family must never silently return
 * to the old clamped/custom drawing. The consumer can retain complete prose. */
export function arithmeticEngineOwnsType(typeId: string): boolean {
  return hasPackFamily("engine", typeId) || hasPackFamily("inline", typeId);
}

/** Full original-string gating, after the consumer's snapshot validation. */
export function arithmeticEngineFigureSvg(
  id: string,
  canonical: string | undefined,
): string | undefined {
  const entry = row(id);
  return entry && entry[0] === canonical ? entry[1] : undefined;
}

/** A rejected dimension remains an explicit named given/target with its unit.
 * It never silently disappears and never turns into an unrelated edge label. */
export function arithmeticEngineFigureLines(id: string): string[] {
  return [...(row(id)?.[2] ?? [])];
}

/** JSON object key order is not task identity (stored JSON may reorder keys).
 * Preserve every present field, including unknown fields so they cannot match a
 * trusted asset, in the catalog's canonical order before exact comparison. */
function promptIdentity(prompt: ArithmeticV2Prompt): string {
  const fields = [
    "layout",
    "text",
    "latex",
    "instruction",
    "answerUnit",
    "figureId",
  ];
  if (Object.keys(prompt).some((key) => !fields.includes(key)))
    return JSON.stringify(["unrecognized-prompt"]);
  const rank = (key: string) => {
    const found = fields.indexOf(key);
    return found < 0 ? fields.length : found;
  };
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(prompt).sort(
        ([a], [b]) => rank(a) - rank(b) || a.localeCompare(b),
      ),
    ),
  );
}

function inlineRow(
  typeId: string,
  prompt: ArithmeticV2Prompt,
): InlineRow | undefined {
  if (!hasPackFamily("inline", typeId)) return undefined;
  const canonical = promptIdentity(prompt);
  const rowKey = `${typeId}:${canonical}`;
  const previous = inlineRows.get(rowKey);
  if (previous) return previous;
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash = Math.imul(hash ^ canonical.charCodeAt(i), 0x01000193) >>> 0;
  }
  const pack = readArithmeticPack("inline", typeId),
    index = pack.index[hash.toString(16)];
  if (index === undefined) return undefined;
  // Sixty-four rows per chunk, eight cached chunks: neither opening one preview
  // nor a large mixed sheet inflates a 14,850-SVG family into client memory.
  // The hash locates a chunk only; exact complete-prompt equality authorizes it.
  const references =
    typeof index[0] === "number"
      ? [index as InlineReference]
      : (index as InlineReference[]);
  for (const [chunk, start, end] of references) {
    const key = `${typeId}:${chunk}`;
    let decoded = inlineCache.get(key);
    if (!decoded) {
      decoded = decodeArithmeticPack("inline", typeId, () =>
        strFromU8(inflateSync(bytesOf(pack.chunks[chunk]))),
      );
    }
    inlineCache.delete(key);
    inlineCache.set(key, decoded);
    if (inlineCache.size > 8)
      inlineCache.delete(inlineCache.keys().next().value!);
    // Parse only the requested row; parsing 64 numeric arrays for each random
    // worksheet item creates avoidable transient client allocation pressure.
    const found = decodeArithmeticPack(
      "inline",
      typeId,
      () => JSON.parse(decoded.slice(start, end)) as InlineRow,
    );
    if (found[0] === canonical) {
      if (inlineRows.size >= 256)
        inlineRows.delete(inlineRows.keys().next().value!);
      inlineRows.set(rowKey, found);
      return found;
    }
  }
  return undefined;
}

export function arithmeticEngineInlineSvg(
  typeId: string,
  prompt: ArithmeticV2Prompt,
): string | undefined {
  const row = inlineRow(typeId, prompt);
  if (!row) return undefined;
  // Lossless engine-byte decompression only. These literals and numeric strings
  // come from complete sanitized engine output; no geometry/placement is run.
  const literals = readArithmeticPack("inline", typeId).templates[row[1]],
    numbers = row[2];
  return literals.map((literal, i) => literal + (numbers[i] ?? "")).join("");
}

export function arithmeticEngineInlineLines(
  typeId: string,
  prompt: ArithmeticV2Prompt,
): string[] {
  return [...(inlineRow(typeId, prompt)?.[3] ?? [])];
}
