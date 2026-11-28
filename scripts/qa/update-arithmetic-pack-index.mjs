import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "src/lib/arithmetic-v2/presentation";
const read = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));
const names = (file) => Object.keys(read(file).families).sort();
const index = {
  angles: ["all"],
  dimensions: names("dimensions-assets-v1.json"),
  segments: names("segments-assets-v1.json"),
  remaining: Object.fromEntries(
    Object.entries(read("remaining-assets-v1.json").families).map(
      ([family, { prefix }]) => [family, prefix],
    ),
  ),
  engine: names("engine-figures-v1.json"),
  inline: names("engine-inline-v1.json"),
};
const path = join(root, "packIndex.json");
const expected = JSON.stringify(index, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const actual = JSON.parse(readFileSync(path, "utf8"));
  if (JSON.stringify(actual) !== JSON.stringify(index))
    throw new Error(
      "Arithmetic pack index is stale. Run this script without --check.",
    );
} else {
  writeFileSync(path, expected);
}
