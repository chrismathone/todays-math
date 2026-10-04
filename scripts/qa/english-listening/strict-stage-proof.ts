/** Read-only staging: actual raw hashes and the existing strict validator. No DB or Storage. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  listeningQuestionAudioAlignmentSchema,
  questionAudioSourceIdSchema,
  verifyQuestionAudioEvidence,
  type QuestionAudioAsr,
} from "../../../src/lib/english/listening/questionAudioProof";

const { values } = parseArgs({ options: { base: { type: "string" }, "source-id": { type: "string" } } });
if (!values.base || !values["source-id"]) throw Error("--base and --source-id are required");
const sourceId = questionAudioSourceIdSchema.parse(values["source-id"]);
if (sourceId === "ebsi-high-1-2022-2") throw Error("Already applied source is frozen");
const directory = resolve(values.base, "strict-stage-20261004");
const resultPath = resolve(directory, sourceId + ".strict-verification.json");
const hash = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const corePath = fileURLToPath(new URL("../../../src/lib/english/listening/questionAudioProof.ts", import.meta.url));
const coreSha = hash(readFileSync(corePath));
const read = (ref: { path: string; sha256: string }) => {
  const bytes = readFileSync(ref.path);
  if (hash(bytes) !== ref.sha256) throw Error("Actual raw artifact hash differs: " + ref.path);
  return JSON.parse(bytes.toString("utf8"));
};
const atomic = (path: string, value: unknown) => {
  writeFileSync(path + ".partial", JSON.stringify(value, null, 2));
  renameSync(path + ".partial", path);
};
if (existsSync(resultPath) && JSON.parse(readFileSync(resultPath, "utf8")).status === "passed") throw Error("This new strict proof is frozen");
const review = JSON.parse(readFileSync(resolve(directory, sourceId + ".boundary-review.json"), "utf8"));
if (review.sourceRecordId !== sourceId) throw Error("Review source differs");
const result: Record<string, unknown> = { sourceRecordId: sourceId, checkedAt: new Date().toISOString(), strictCorePath: corePath, strictCoreSha256: coreSha, humanReviewed: false, writesDatabase: false, actualNativePcmQuietMeasured: false, acousticRefinementRequired: true };
if (review.questions.some((q: { decision: string; reasons: string[] }) => q.decision !== "candidate_checks_passed" || q.reasons.length)) {
  Object.assign(result, { status: "withheld", wholeRoundsPassed: 0, questionsPassed: 0, reason: "The entire original source has not passed candidate checks" });
} else {
  try {
    const alignment = listeningQuestionAudioAlignmentSchema.parse({
      schemaVersion: 1, sourceRecordId: sourceId, humanReviewed: false,
      ...Object.fromEntries(["sourceAudio", "prepared", "asr", "officialScript", "activity"].map((key) => [key, review[key]])),
      questions: review.questions.map((q: { questionId: string; sourceNumber: number; scriptSectionId: string; scriptQuestionNumbers: number[]; copies: { cache: "auto" | "english"; segmentIds: number[]; firstSegmentIds: number[]; lastSegmentIds: number[]; startSample: number; endSample: number; cue: unknown }[] }) => ({
        questionId: q.questionId, sourceNumber: q.sourceNumber, decision: "qualified", reasons: [], scriptSectionId: q.scriptSectionId,
        startSample: Math.min(...q.copies.map((c) => c.startSample)), endSample: Math.max(...q.copies.map((c) => c.endSample)), cue: q.copies[0].cue,
        copies: q.copies.map(({ cache, segmentIds, firstSegmentIds, lastSegmentIds }) => ({ cache, segmentIds, firstSegmentIds, lastSegmentIds })),
        ...(q.scriptQuestionNumbers.length > 1 ? { sharedPassageQuestionNumbers: q.scriptQuestionNumbers } : {}),
      })),
    });
    if (hash(readFileSync(alignment.sourceAudio.path)) !== alignment.sourceAudio.sha256) throw Error("Actual original audio bytes differ");
    const prepared = read(alignment.prepared);
    const originalQuestions = prepared.editableInput.groups.flatMap((g: { questions: { id: string; sourceNumber: number }[] }) => g.questions);
    if (originalQuestions.length !== alignment.questions.length || alignment.questions.some((q) => !originalQuestions.some((p: { id: string; sourceNumber: number }) => p.id === q.questionId && p.sourceNumber === q.sourceNumber))) throw Error("Whole original question identities differ");
    const script = read(alignment.officialScript), activity = read(alignment.activity), rawActivity = read(activity.rawArtifact);
    const transcript = prepared.editableInput.groups.map((g: { transcript: { text: string } }) => g.transcript.text).join("\n");
    const originalTranscriptFile = prepared.sourceFiles.find((f: { kind: string }) => f.kind === "transcript" || f.kind === "script");
    if (script.sourceTranscriptText !== transcript || hash(readFileSync(originalTranscriptFile.path)) !== script.sourceTranscriptFileSha256) throw Error("Actual original transcript differs");
    const asr = { auto: read(alignment.asr.auto), english: read(alignment.asr.english), ...(alignment.asr.korean ? { korean: read(alignment.asr.korean) } : {}) };
    const derivedAsrOrigins: Record<string, QuestionAudioAsr> = {};
    for (const ref of asr.english.derivedFrom ?? []) derivedAsrOrigins[ref.sha256] = read(ref);
    const groups = verifyQuestionAudioEvidence({ alignment, script, asr, activity, rawActivity, derivedAsrOrigins });
    const alignmentPath = resolve(directory, sourceId + ".strict-alignment.json");
    atomic(alignmentPath, alignment);
    Object.assign(result, { status: "passed", wholeRoundsPassed: 1, questionsPassed: alignment.questions.length, audioGroups: groups.length,
      alignmentPath, alignmentSha256: hash(readFileSync(alignmentPath)), ranges: groups.map((g) => ({ questionNumbers: g.questions.map((q) => q.sourceNumber), startSample: g.startSample, endSample: g.endSample, leadingVadPaddingMs: g.leadingSilenceMs, trailingVadPaddingMs: g.trailingSilenceMs })) });
  } catch (error) {
    Object.assign(result, { status: "rejected", wholeRoundsPassed: 0, questionsPassed: 0, reason: error instanceof Error ? error.message : String(error) });
  }
}
if (hash(readFileSync(corePath)) !== coreSha) throw Error("Strict core changed while verifying");
atomic(resultPath, result);
console.log(JSON.stringify(result));
