import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const directory = "src/lib/arithmetic-v2/presentation";
const files = readdirSync(directory).filter((file) =>
  /(?:assets(?:-v1)?|engine-(?:figures|inline)-v1)\.json$/.test(file),
);
if (files.length !== 6) throw new Error("Expected six arithmetic packs");
const markers = new Map();
for (const file of files) {
  const pack = JSON.parse(readFileSync(join(directory, file), "utf8"));
  const encoded = pack.svgPack
    ? [pack.svgPack]
    : Object.values(pack.families).flatMap(
        (value) => value.chunks ?? value.data ?? value,
      );
  for (const value of encoded) markers.set(value.slice(0, 96), file);
}

let failed = false;
for (const root of [".next/server", ".next/static"]) {
  let bytes = 0;
  for (const item of readdirSync(root, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!item.isFile() || !item.name.endsWith(".js")) continue;
    const path = join(item.parentPath, item.name);
    const data = readFileSync(path);
    bytes += data.length;
    const matches = new Set();
    for (const [, marker] of data
      .toString("utf8")
      .matchAll(/["'`]([A-Za-z0-9+/]{96})/g)) {
      const file = markers.get(marker);
      if (file) matches.add(file);
    }
    if (matches.size) {
      failed = true;
      console.log(path, data.length, [...matches].join(", "));
    }
  }
  if (!bytes) throw new Error(`No JavaScript to inspect at ${root}`);
  console.log(root, bytes);
}
for (const entry of [
  "api/arithmetic/v2/packs/route",
  "dev/arithmetic/packs/route",
  "dev/arithmetic/grade-print/page",
]) {
  const trace = `.next/server/app/${entry}.js.nft.json`;
  const included = existsSync(trace)
    ? JSON.parse(readFileSync(trace, "utf8")).files
    : [];
  const missing = files.filter(
    (file) => !included.some((path) => path.endsWith(`/${directory}/${file}`)),
  );
  if (missing.length) {
    failed = true;
    console.error(trace, "missing", missing.join(", "));
  }
}
if (failed) process.exitCode = 1;
