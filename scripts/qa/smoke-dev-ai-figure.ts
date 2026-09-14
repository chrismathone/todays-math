/** Opt-in real subscription smoke; no server, env edits, browser or paid API.
 * node --conditions=react-server --import tsx scripts/qa/smoke-dev-ai-figure.ts --run-cli <source.png> <output-directory> [instructions.txt]
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { redrawDevAiFigure } from "../../src/lib/dev-ai/figure-engine";

async function main() {
  const [flag, imagePath, directory, instructionsPath] = process.argv.slice(2);
  if (flag !== "--run-cli" || !imagePath || !directory)
    throw new Error(
      "Usage: --run-cli <source.png> <output-directory> [instructions.txt]; consumes existing Claude subscription quota.",
    );
  const image = await readFile(path.resolve(imagePath));
  const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex");
  const started = Date.now();
  const result = await redrawDevAiFigure({
    provider: "claude",
    action: "figure-redraw",
    grade: "중3",
    imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
    content: instructionsPath
      ? await readFile(path.resolve(instructionsPath), "utf8")
      : "첨부된 도형을 원본의 점 이름, 인쇄된 숫자, 직각 표시, 선분을 유지하여 깨끗하게 재작도해 주세요. 새 치수나 풀이를 만들지 마세요.",
  });
  if (hash(image) !== hash(await readFile(path.resolve(imagePath))))
    throw new Error("Source changed during smoke.");
  const output = path.resolve(directory);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "claude-result.svg"), result.svg!, "utf8");
  await writeFile(
    path.join(output, "claude-result.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        sourceSha256: hash(image),
        sourceUnchanged: true,
        provider: "claude",
        ...result,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    JSON.stringify({
      engine: result.engine,
      version: result.spec?.version,
      elapsedMs: Date.now() - started,
      sourceUnchanged: true,
      review: result.figureReview,
      warnings: result.warnings,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Figure smoke failed.",
  );
  process.exitCode = 1;
});
