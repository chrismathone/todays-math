import { readFileSync } from "node:fs";
import { judgeBuild, measureBuild } from "./build-budget.mjs";

// next build 뒤에 돈다(build-next-plan.mjs) — 따로는 `npm run check:build-budget`.
const budget = JSON.parse(
  readFileSync(new URL("./build-budget.json", import.meta.url), "utf8"),
);
const measured = measureBuild(process.argv[2] ?? ".next", budget.limits);
const { failures, warnings } = judgeBuild(measured, budget);
console.log(
  `[build-budget] server JS ${measured.serverJsBytes} B · max chunk ${measured.serverMaxChunk.bytes} B · ` +
    `server maps ${measured.serverMaps} · static JS ${measured.staticJsBytes} B · ` +
    `max static chunk ${measured.staticMaxChunk.bytes} B · large server chunks ${measured.largeServerChunks.length}`,
);
for (const line of warnings) console.warn(`[build-budget] 경고: ${line}`);
for (const line of failures) console.error(`[build-budget] 초과: ${line}`);
if (failures.length) process.exitCode = 1;
