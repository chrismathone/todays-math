/** Source-bound decimal Korean instruction matching remains in the production core. */
import { createHash } from "node:crypto";
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { questionAudioSourceIdSchema, type QuestionAudioScript } from "../../../src/lib/english/listening/questionAudioProof";

const { values } = parseArgs({ options: { base: { type: "string" }, "source-id": { type: "string" } } });
if (!values.base || !values["source-id"]) throw Error("--base and --source-id are required");
const id = questionAudioSourceIdSchema.parse(values["source-id"]);
if (id === "ebsi-high-1-2022-2") throw Error("The already applied source is frozen");
const directory = resolve(values.base, "strict-stage-20261004");
const corePath = fileURLToPath(new URL("../../../src/lib/english/listening/questionAudioProof.ts", import.meta.url));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const coreSha = hash(readFileSync(corePath));
const require = createRequire(import.meta.url);
const core = require(corePath) as {
  questionAudioCueNumbers(text: string): number[];
  questionAudioKoreanInstructionCueNumbers?: (text: string, script: QuestionAudioScript, section: QuestionAudioScript["sections"][number]) => number[];
};
if (!core.questionAudioKoreanInstructionCueNumbers) throw Error("Production core has no source-bound Korean instruction matcher; keep unresolved");
const koreanPath = resolve(directory, "asr", id, "asr-medium-korean-announcements.json");
const scriptPath = resolve(directory, id + ".strict-script.json");
const korean = JSON.parse(readFileSync(koreanPath, "utf8")) as { segments: { id: number; text: string; uncertain: boolean }[] };
const script = JSON.parse(readFileSync(scriptPath, "utf8")) as QuestionAudioScript;
const entries = korean.segments.flatMap((segment) => {
  if (segment.uncertain || core.questionAudioCueNumbers(segment.text).length) return [];
  return script.sections.flatMap((section) => {
    const numbers = core.questionAudioKoreanInstructionCueNumbers!(segment.text, script, section);
    return numbers.length ? [{ segmentId: segment.id, sourceNumbers: numbers, scriptSectionId: section.id }] : [];
  });
});
if (hash(readFileSync(corePath)) !== coreSha) throw Error("Core changed while mapping");
const result = { sourceRecordId: id, core: { path: corePath, sha256: coreSha }, korean: { path: koreanPath, sha256: hash(readFileSync(koreanPath)) }, script: { path: scriptPath, sha256: hash(readFileSync(scriptPath)) }, entries, humanReviewed: false };
const destination = resolve(directory, id + ".korean-cue-map.json");
writeFileSync(destination + ".partial", JSON.stringify(result, null, 2));
renameSync(destination + ".partial", destination);
console.log(JSON.stringify({ id, entries, coreSha256: coreSha }));
