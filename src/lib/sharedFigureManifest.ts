import { readFileSync } from "node:fs";
import path from "node:path";

/** Fixed traced data file: do not turn the 18,827-entry index into JS/TS source. */
export function loadSharedFigureManifest(): unknown {
  return JSON.parse(
    readFileSync(
      path.join(process.cwd(), "src/config/shared-figures.manifest.json"),
      "utf8",
    ),
  );
}
