/** One opt-in subscription call, never imported by the unit tests. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import sharp from "sharp";
import { runCodexJson } from "./transport";

async function main() {
  if (process.argv.length !== 4 || process.argv[2] !== "--live")
    throw new Error("usage: tsx smoke.ts --live <artifact-directory>");
  const outDir = resolve(process.argv[3]!);
  await mkdir(outDir, { recursive: true });
  const image = join(outDir, "red-square.png");
  await writeFile(
    image,
    await sharp({
      create: { width: 16, height: 16, channels: 3, background: "#ff0000" },
    })
      .png()
      .toBuffer(),
  );
  const result = await runCodexJson<{ sum: number; color: string }>({
    phase: "smoke",
    outDir,
    images: [image],
    timeoutMs: 180_000,
    prompt:
      "Use no tools, files, searches, skills, or commands. Return the sum of 2+3 and the color of the attached square, using the supplied JSON schema. This is a tiny transport test; do no other work.",
    schema: {
      type: "object",
      properties: {
        sum: { type: "integer", enum: [5] },
        color: { type: "string", enum: ["red"] },
      },
      required: ["sum", "color"],
      additionalProperties: false,
    },
  });
  console.log(
    JSON.stringify({ value: result.value, receipt: result.receipt }, null, 2),
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "smoke-failed");
  process.exitCode = 1;
});
