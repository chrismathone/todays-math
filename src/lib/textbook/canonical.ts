/** P1 c14n v1. No Node imports: server and browser hash precisely these bytes. */
import type {
  ProblemPayload,
  ProblemSnapshot,
  TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
export const CANONICALIZATION_VERSION = "injaewon.textbook.c14n.v1" as const;
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function assertJsonString(value: string): void {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 0) throw new TypeError("JSON forbids U+0000");
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new TypeError("JSON contains an isolated surrogate");
    } else if (c >= 0xdc00 && c <= 0xdfff)
      throw new TypeError("JSON contains an isolated surrogate");
  }
}

export function assertJsonNumber(value: number): void {
  if (
    !Number.isFinite(value) ||
    Object.is(value, -0) ||
    (Number.isInteger(value) && !Number.isSafeInteger(value))
  ) {
    throw new TypeError(
      "JSON number must be finite, nonnegative-zero and within the safe integer range",
    );
  }
}

export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  const visit = (v: unknown, depth: number): string => {
    if (depth > 128) throw new RangeError("JSON nesting exceeds 128");
    if (v === null) return "null";
    if (typeof v === "string") {
      assertJsonString(v);
      return JSON.stringify(v);
    }
    if (typeof v === "number") {
      assertJsonNumber(v);
      return JSON.stringify(v);
    }
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v !== "object")
      throw new TypeError("Only JSON values can be canonicalized");
    if (ancestors.has(v)) throw new TypeError("Cyclic JSON value");
    ancestors.add(v);
    try {
      if (Object.getOwnPropertySymbols(v).length)
        throw new TypeError("JSON cannot have symbol keys");
      if (Array.isArray(v)) {
        if (Object.keys(v).length !== v.length)
          throw new TypeError("Sparse or decorated JSON array");
        const parts: string[] = [];
        for (let i = 0; i < v.length; i++) {
          const d = Object.getOwnPropertyDescriptor(v, String(i));
          if (!d || !("value" in d))
            throw new TypeError("Sparse or accessor JSON array");
          parts.push(visit(d.value, depth + 1));
        }
        return `[${parts.join(",")}]`;
      }
      const proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null)
        throw new TypeError("JSON object must have a plain prototype");
      // Construct directly: JSON.stringify({sorted keys}) reorders integer-shaped keys.
      return `{${Object.getOwnPropertyNames(v)
        .sort()
        .map((key) => {
          assertJsonString(key);
          const d = Object.getOwnPropertyDescriptor(v, key)!;
          if (!d.enumerable || !("value" in d))
            throw new TypeError(
              "JSON object has hidden or accessor properties",
            );
          return `${JSON.stringify(key)}:${visit(d.value, depth + 1)}`;
        })
        .join(",")}}`;
    } finally {
      ancestors.delete(v);
    }
  };
  return visit(value, 0);
}

export const canonicalBytes = (value: unknown): Uint8Array =>
  new TextEncoder().encode(canonicalJson(value));

export const payloadProjection = (payload: ProblemPayload): ProblemPayload =>
  payload;

/** The absence of a historical extension is meaningful; never inject defaults. */
export function snapshotProjection(snapshot: ProblemSnapshot) {
  return {
    source: snapshot.source,
    ...(snapshot.sourceMetadata === undefined
      ? {}
      : { sourceMetadata: snapshot.sourceMetadata }),
    ...(snapshot.rawSource === undefined
      ? {}
      : { rawSource: snapshot.rawSource }),
    contentHash: snapshot.contentHash,
  };
}

export function conceptProjection(concept: TextbookConcept) {
  if (!concept.frozen)
    throw new TypeError(`Frozen concept required: ${concept.conceptKey}`);
  const frozen = concept.frozen;
  return {
    body: concept.body,
    blankItems: concept.blankItems,
    links: concept.links,
    entries: frozen.entries,
    selection: frozen.selection,
    sections: frozen.sections,
    assetHashes: frozen.assetHashes,
    mappingVersion: frozen.mappingVersion,
    parserVersion: frozen.parserVersion,
    compositionVersion: frozen.compositionVersion,
  };
}

/** Callers recompute snapshot hashes before using this projection to verify an imported manifest. */
export function manifestProjection(exchange: TextbookExchange) {
  return {
    schemaVersion: exchange.schemaVersion,
    ...(exchange.canonicalizationVersion === undefined
      ? {}
      : { canonicalizationVersion: exchange.canonicalizationVersion }),
    config: exchange.config,
    edition: {
      editionId: exchange.edition.editionId,
      label: exchange.edition.label,
    },
    units: exchange.units,
    snapshots: exchange.snapshots.map((s) => ({
      snapshotId: s.snapshotId,
      contentHash: s.contentHash,
      ...(s.snapshotHash === undefined ? {} : { snapshotHash: s.snapshotHash }),
    })),
    items: exchange.items,
    assets: exchange.assets.map((a) => ({
      assetId: a.assetId,
      mimeType: a.mimeType,
      sha256: a.sha256,
      widthPx: a.widthPx,
      heightPx: a.heightPx,
    })),
    qrTargets: exchange.qrTargets,
    pageMap: exchange.pageMap,
    rendererVersion: exchange.rendererVersion,
    templateVersion: exchange.templateVersion,
    ...(exchange.conceptIntegration === undefined
      ? {}
      : { conceptIntegration: exchange.conceptIntegration }),
    ...(exchange.conceptQrTargets === undefined
      ? {}
      : { conceptQrTargets: exchange.conceptQrTargets }),
  };
}
