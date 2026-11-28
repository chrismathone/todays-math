import index from "./packIndex.json";
import type { ArithmeticV2Prompt } from "../types";

export type InlineReference = readonly [
  chunk: number,
  start: number,
  end: number,
];
export type InlinePack = {
  index: Record<string, InlineReference | InlineReference[]>;
  chunks: string[];
  templates: string[][];
};

export type PackFamilies = {
  angles: string;
  dimensions: string;
  segments: string;
  remaining: string;
  engine: string;
  inline: InlinePack;
};
export type PackName = keyof PackFamilies;
export type PackRequest = { pack: PackName; family: string };
export type PackReader = <P extends PackName>(
  pack: P,
  family: string,
) => PackFamilies[P];

const registered = {
  angles: new Set(index.angles),
  dimensions: new Set(index.dimensions),
  segments: new Set(index.segments),
  remaining: new Set(Object.keys(index.remaining)),
  engine: new Set(index.engine),
  inline: new Set(index.inline),
};

export function hasPackFamily(pack: PackName, family: string) {
  return registered[pack].has(family);
}

export function isPackName(value: string): value is PackName {
  return Object.hasOwn(registered, value);
}

const angleId =
  /^age-e4-(?:angle-(?:sum|difference|(?:right|straight|turn)-remainder)|quadrilateral-missing-angle|isosceles-(?:base|apex)-angle)-v1-\d+(?:-\d+)*$/;
export const isAnglePackId = (id: string) => angleId.test(id);
export const dimensionPackMatch = (id: string) =>
  /^age-(e[356]-[a-z-]+)-v1-(\d+(?:-\d+)*)$/.exec(id);
export const segmentPackMatch = (id: string) =>
  /^gt1-(m[23]-[a-z-]+)-(\d+(?:-\d+)*)$/.exec(id);
export const enginePackMatch = (id: string) =>
  /^(?:gt1|gm)-(m[23]-[a-z-]+)-\d+(?:-\d+)*$/.exec(id);
const remainingPrefixes = Object.entries(index.remaining).sort(
  ([, a], [, b]) => b.length - a.length,
);
export const remainingPackFamily = (id: string) =>
  remainingPrefixes.find(
    ([, prefix]) =>
      id.startsWith(prefix) && /^\d+(?:-\d+)*$/.test(id.slice(prefix.length)),
  )?.[0];

/** A prompt can take an authored display path or its existing layout fallback. */
export function arithmeticPromptPacks(
  prompt: ArithmeticV2Prompt,
  typeId?: string,
): PackRequest[] {
  if (prompt.layout !== "math") return [];
  const id = prompt.figureId ?? "";
  const candidates = {
    angles: isAnglePackId(id) ? "all" : undefined,
    dimensions: dimensionPackMatch(id)?.[1],
    segments: segmentPackMatch(id)?.[1],
    remaining: remainingPackFamily(id),
    engine: enginePackMatch(id)?.[1],
    inline: typeId,
  };
  return (Object.keys(candidates) as PackName[]).flatMap((pack) => {
    const family = candidates[pack];
    return family && hasPackFamily(pack, family) ? [{ pack, family }] : [];
  });
}

export class ArithmeticPackUnavailable extends Error {
  constructor(pack: PackName, family: string, cause?: unknown) {
    super(`연산 그림 자료를 불러오지 못했습니다 (${pack}/${family}).`, {
      cause,
    });
  }
}

const prepared = new Map<string, PackFamilies[PackName]>();
export const packKey = ({ pack, family }: PackRequest) => `${pack}/${family}`;
let nodeReader: PackReader | undefined;

/** Only Node entry points and test/QA harnesses install a synchronous reader. */
export function installArithmeticPackReader(reader: PackReader | undefined) {
  nodeReader = reader;
}

export function withArithmeticPackReader<T>(
  reader: PackReader,
  project: () => T,
): T {
  const previous = nodeReader;
  nodeReader = reader;
  try {
    return project();
  } finally {
    nodeReader = previous;
  }
}

export function arithmeticPackReady(request: PackRequest) {
  return Boolean(nodeReader) || prepared.has(packKey(request));
}

export function readArithmeticPack<P extends PackName>(
  pack: P,
  family: string,
): PackFamilies[P] {
  const value = nodeReader
    ? nodeReader(pack, family)
    : prepared.get(packKey({ pack, family }));
  if (value === undefined) throw new ArithmeticPackUnavailable(pack, family);
  return value as PackFamilies[P];
}

export function decodeArithmeticPack<T>(
  pack: PackName,
  family: string,
  decode: () => T,
): T {
  try {
    return decode();
  } catch (cause) {
    if (cause instanceof ArithmeticPackUnavailable) throw cause;
    throw new ArithmeticPackUnavailable(pack, family, cause);
  }
}

export function acceptArithmeticPack(
  { pack, family }: PackRequest,
  value: unknown,
) {
  if (pack === "inline") {
    const row = value as Partial<InlinePack> | null;
    if (
      !row?.index ||
      !Array.isArray(row.templates) ||
      !Array.isArray(row.chunks)
    )
      throw new ArithmeticPackUnavailable(pack, family);
  } else if (typeof value !== "string" || !value) {
    throw new ArithmeticPackUnavailable(pack, family);
  }
  prepared.set(packKey({ pack, family }), value as PackFamilies[PackName]);
}
