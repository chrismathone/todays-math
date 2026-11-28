import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ArithmeticPackUnavailable,
  hasPackFamily,
  type PackFamilies,
  type PackName,
} from "./packAssets";

const files: Record<PackName, string> = {
  angles: "angles.assets.json",
  dimensions: "dimensions-assets-v1.json",
  segments: "segments-assets-v1.json",
  remaining: "remaining-assets-v1.json",
  engine: "engine-figures-v1.json",
  inline: "engine-inline-v1.json",
};

type RawPack = {
  svgPack?: string;
  families?: Record<string, string | PackFamilies["inline"] | { data: string }>;
};
const packs = new Map<PackName, RawPack>();

/** Traced deployment files. Reading the outer JSON does not inflate its families. */
export function readNodeArithmeticPack<P extends PackName>(
  pack: P,
  family: string,
): PackFamilies[P] {
  try {
    if (!hasPackFamily(pack, family)) throw new Error("Unknown pack family");
    let contents = packs.get(pack);
    if (!contents) {
      const path = join(
        process.cwd(),
        "src/lib/arithmetic-v2/presentation",
        files[pack],
      );
      contents = JSON.parse(readFileSync(path, "utf8")) as RawPack;
      packs.set(pack, contents);
    }
    const entry =
      pack === "angles" ? contents.svgPack : contents.families?.[family];
    const value =
      typeof entry === "object" && "data" in entry ? entry.data : entry;
    if (!value) throw new Error("Missing pack family");
    return value as PackFamilies[P];
  } catch (cause) {
    throw new ArithmeticPackUnavailable(pack, family, cause);
  }
}
