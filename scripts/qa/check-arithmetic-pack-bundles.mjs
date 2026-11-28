import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const directory = "src/lib/arithmetic-v2/presentation";
const markers = readdirSync(directory).filter((file) =>
  /(?:assets(?:-v1)?|engine-(?:figures|inline)-v1)\.json$/.test(file),
).map((file) => {
  const pack = JSON.parse(readFileSync(join(directory, file), "utf8"));
  const family = Object.values(pack.families ?? {})[0];
  const encoded = pack.svgPack ?? family?.data ?? family?.chunks?.[0] ?? family;
  return [file, encoded.slice(0, 96)];
});
if (markers.length !== 6) throw new Error("Expected six arithmetic pack markers");

let bundled = false;
for (const root of [".next/server", ".next/static"]) {
  let bytes = 0;
  for (const item of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!item.isFile() || !item.name.endsWith(".js")) continue;
    const path = join(item.parentPath, item.name);
    const data = readFileSync(path);
    bytes += data.length;
    const matches = markers.filter(([, marker]) => data.includes(marker));
    if (matches.length) {
      bundled = true;
      console.log(path, data.length, matches.map(([file]) => file).join(", "));
    }
  }
  if (!bytes) throw new Error(`No JavaScript to inspect at ${root}`);
  console.log(root, bytes);
}
if (bundled) process.exitCode = 1;
