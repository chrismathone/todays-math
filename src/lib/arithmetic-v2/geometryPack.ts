import { deflateSync, strToU8 } from "fflate";
import { ArithmeticEngineError } from "@/lib/arithmetic/errors";

/** A self-contained snapshot of only the figures actually used in a worksheet. */
export type ArithmeticGeometrySubsetSnapshot = {
  version: 2;
  ids: string[];
  svgPack: string;
};

export const ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH = 1_000_000;
const MAX_FIGURES = 2000;
// Large sheets retain fewer packs. Submitted SVG is still never inflated.
const MAX_CACHED_PACKS = 2;

function base64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192)
    parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(parts.join(""));
}

/** Only versioned, trusted catalog SVG can enter a pack. Validation compares the
 * canonical compressed bytes before accepting submitted data; untrusted input
 * is never inflated. The bounded cache also avoids repeated SVG rendering and
 * compression when the same saved sheet is read by schema, review and output.
 */
export function createArithmeticGeometryPackStore(
  lookup: (id: string) => string | undefined,
) {
  const cache = new Map<
    string,
    {
      snapshot: ArithmeticGeometrySubsetSnapshot;
      figures: Readonly<Record<string, string>>;
    }
  >();

  function canonicalIds(ids: readonly string[]): string[] {
    const sorted = [...new Set(ids)].sort();
    if (
      sorted.length === 0 ||
      sorted.length > MAX_FIGURES ||
      sorted.some((id) => !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id))
    )
      throw new Error("저장할 도형 목록을 확인할 수 없습니다");
    return sorted;
  }

  function entry(ids: readonly string[]) {
    const ordered = canonicalIds(ids);
    const key = JSON.stringify(ordered);
    const previous = cache.get(key);
    if (previous) return previous;
    const figures: Record<string, string> = Object.create(null);
    for (const id of ordered) {
      const svg = lookup(id);
      if (svg === undefined) throw new Error("등록되지 않은 연산 도형입니다");
      figures[id] = svg;
    }
    const svgPack = base64(
      deflateSync(strToU8(JSON.stringify(figures)), { level: 6 }),
    );
    if (svgPack.length > ARITHMETIC_GEOMETRY_PACK_MAX_LENGTH)
      throw new ArithmeticEngineError("payload-size");
    const value = {
      snapshot: { version: 2 as const, ids: ordered, svgPack },
      figures: Object.freeze(figures),
    };
    if (cache.size >= MAX_CACHED_PACKS)
      cache.delete(cache.keys().next().value!);
    cache.set(key, value);
    return value;
  }

  function valid(snapshot: ArithmeticGeometrySubsetSnapshot): boolean {
    try {
      const expected = entry(snapshot.ids).snapshot;
      return (
        snapshot.version === 2 &&
        JSON.stringify(snapshot.ids) === JSON.stringify(expected.ids) &&
        snapshot.svgPack === expected.svgPack
      );
    } catch {
      return false;
    }
  }

  return {
    create(ids: readonly string[]): ArithmeticGeometrySubsetSnapshot {
      const { snapshot } = entry(ids);
      return { ...snapshot, ids: [...snapshot.ids] };
    },
    valid,
    read(id: string, snapshot: ArithmeticGeometrySubsetSnapshot): string {
      if (!valid(snapshot) || !snapshot.ids.includes(id))
        throw new Error("저장된 연산 도형을 확인할 수 없습니다");
      // The validated pack is byte-identical to this canonical figure record.
      return entry(snapshot.ids).figures[id];
    },
  };
}
