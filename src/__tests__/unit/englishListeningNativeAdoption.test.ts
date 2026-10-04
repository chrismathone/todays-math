// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  nativeArtifacts,
  nativeSha,
  nativeSourceId,
} from "../fixtures/english-listening/nativeStage";
import {
  loadNativeQuestionStage,
  nativeListeningDatabaseUrl,
  parseNativeListeningArgs,
  planNativeQuestionAdoption,
  validateNativeQuestionStage,
} from "../../../scripts/qa/english-listening/adopt-native-listening-questions.mts";

const roots: string[] = [];
async function fixture(preserve = false) {
  const root = await mkdtemp(resolve(tmpdir(), "listening-native-"));
  roots.push(root);
  return { root, ...(await nativeArtifacts(root, preserve)) };
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (dirname(resolve(root)) !== resolve(tmpdir()))
      throw Error("Unexpected cleanup path");
    await rm(root, { recursive: true, force: true });
  }
});
describe("native PDF question adoption trust boundaries", () => {
  it("preserves metadata, identities, answer, audio and unrelated document fields while removing full text crops", async () => {
    const f = await fixture(true),
      loaded = await loadNativeQuestionStage(f.root, nativeSourceId);
    const current = structuredClone(f.document);
    current.title = "User title retained";
    current.groups[0].questions[0].metadata!.keywords = ["teacher-index"];
    const plan = planNativeQuestionAdoption(loaded, current);
    expect(plan.alreadyNative).toBe(false);
    expect(plan.input.title).toBe(current.title);
    expect(plan.input.groups[0].audio).toEqual(current.groups[0].audio);
    for (const [i, question] of plan.input.groups[0].questions.entries()) {
      const old = current.groups[0].questions[i];
      expect(question.id).toBe(old.id);
      expect(question.answerChoiceId).toBe(old.answerChoiceId);
      expect(question.choices.map((c) => c.id)).toEqual(
        old.choices.map((c) => c.id),
      );
      expect(question.metadata).toEqual(old.metadata);
      expect(question.evidence).toEqual(old.evidence);
      expect(question.explanation).toBe(old.explanation);
    }
    expect(plan.input.groups[0].questions[0].image).toBeUndefined();
    expect(plan.input.groups[0].questions[1].image?.role).toBe("question");
    const adopted = {
      ...current,
      groups: plan.input.groups.map((g) => ({
        ...g,
        reviews: { content: null, audio: null, alignment: null },
      })),
    };
    expect(planNativeQuestionAdoption(loaded, adopted).alreadyNative).toBe(
      true,
    );
  });
  it("refuses user edits, question reordering and answer/choice identity substitutions", async () => {
    const f = await fixture(),
      loaded = await loadNativeQuestionStage(f.root, nativeSourceId);
    for (const field of ["prompt", "explanation"] as const) {
      const edited = structuredClone(f.document);
      edited.groups[0].questions[0][field] = "User edited";
      expect(() => planNativeQuestionAdoption(loaded, edited)).toThrow(
        "preserve user edits",
      );
    }
    const reorder = structuredClone(f.document);
    reorder.groups[0].questions.reverse();
    expect(() => planNativeQuestionAdoption(loaded, reorder)).toThrow(
      "identities changed",
    );
    // Moving a question to another audio group retains flat order, but changes its association.
    const grouped = structuredClone(loaded);
    const second = {
      ...grouped.original.editableInput.groups[0],
      id: randomUUID(),
      questions: grouped.original.editableInput.groups[0].questions.splice(1),
    };
    grouped.original.editableInput.groups.push(second);
    const moved = structuredClone(f.document);
    moved.groups.push({ ...moved.groups[0], id: second.id, questions: [] });
    expect(() => planNativeQuestionAdoption(grouped, moved)).toThrow(
      "question group changed",
    );
    const answer = structuredClone(f.stage);
    answer.questions[0].answerChoiceId = answer.questions[0].choices[1].id;
    if (
      answer.questions[0].answerChoiceId === f.stage.questions[0].answerChoiceId
    )
      answer.questions[0].answerChoiceId = answer.questions[0].choices[0].id;
    expect(() => validateNativeQuestionStage(answer, f.original)).toThrow(
      "identity changed",
    );
    const choices = structuredClone(f.stage);
    choices.questions[0].choices.reverse();
    expect(() => validateNativeQuestionStage(choices, f.original)).toThrow(
      "identity changed",
    );
  });
  it("verifies exact original prepared bytes and PDF hashes without needing original audio reads", async () => {
    const f = await fixture();
    await rm(f.audioPath);
    await expect(
      loadNativeQuestionStage(f.root, nativeSourceId),
    ).resolves.toHaveProperty(
      "stageSha256",
      nativeSha(await readFile(f.stagePath)),
    );
    await writeFile(f.pdfPath, "%PDF-1.7 changed");
    await expect(
      loadNativeQuestionStage(f.root, nativeSourceId),
    ).rejects.toThrow("PDF proof mismatch");
  });
  it("accepts the mock exam's paper PDF while rejecting the same substitution for national listening", async () => {
    const f = await fixture();
    const mockId = "ebsi-high-1-2026-09-mock";
    const original = structuredClone(f.original);
    original.sourceRecordId = mockId;
    const source = {
      ...original.createInput.source,
      kind: "mock_exam",
      month: 9,
      round: null,
    };
    Object.assign(original.createInput.source, source);
    original.sourceFiles[0].kind = "paper";
    for (const group of original.editableInput.groups)
      for (const q of group.questions) q.metadata.sourceRecordId = mockId;
    const originalPath = resolve(
      f.root,
      "prepared-registration",
      mockId + ".json",
    );
    const stagePath = resolve(
      f.root,
      "prepared-native-registration",
      mockId + ".json",
    );
    async function write() {
      const raw = JSON.stringify(original);
      await writeFile(originalPath, raw);
      await writeFile(
        stagePath,
        JSON.stringify({
          ...f.stage,
          sourceRecordId: mockId,
          originalPreparedPath: originalPath,
          originalPreparedSha256: nativeSha(raw),
        }),
      );
    }
    await write();
    await expect(
      loadNativeQuestionStage(f.root, mockId),
    ).resolves.toHaveProperty("stage.sourceRecordId", mockId);
    original.createInput.source.kind = "national_listening";
    await write();
    await expect(loadNativeQuestionStage(f.root, mockId)).rejects.toThrow(
      "Original question PDF identity mismatch",
    );
  });
  it("rejects tampered original snapshots, image proofs, counts and out-of-archive references", async () => {
    const f = await fixture(true);
    await writeFile(
      f.originalPath,
      (await readFile(f.originalPath, "utf8")) + " ",
    );
    await expect(
      loadNativeQuestionStage(f.root, nativeSourceId),
    ).rejects.toThrow("artifact hash mismatch");
    const image = structuredClone(f.stage);
    image.questions[1].conversion.visualSha256 = "0".repeat(64);
    expect(() => validateNativeQuestionStage(image, f.original)).toThrow(
      "image evidence mismatch",
    );
    const counts = structuredClone(f.stage);
    counts.conversion.nativeCount++;
    expect(() => validateNativeQuestionStage(counts, f.original)).toThrow(
      "counts mismatch",
    );
    const bounds = structuredClone(f.stage);
    bounds.questions[1].conversion.visualBounds![0] = 0;
    expect(() => validateNativeQuestionStage(bounds, f.original)).toThrow(
      "Invalid visual source bounds",
    );
    const externalRoot = await mkdtemp(
      resolve(tmpdir(), "listening-native-outside-"),
    );
    roots.push(externalRoot);
    const outside = {
      ...f.stage,
      originalPreparedPath: resolve(externalRoot, "outside.json"),
    };
    await writeFile(outside.originalPreparedPath, "{}");
    await writeFile(f.stagePath, JSON.stringify(outside));
    await expect(
      loadNativeQuestionStage(f.root, nativeSourceId),
    ).rejects.toThrow("outside the listening archive");
  });
  it("rejects source substitution, incomplete stages and unverified non-native changes", async () => {
    const f = await fixture(true);
    const altered = structuredClone(f.stage);
    altered.questions[1].prompt = "Unverified replacement";
    expect(() => validateNativeQuestionStage(altered, f.original)).toThrow(
      "Unconverted prompt",
    );
    const missing = structuredClone(f.stage);
    missing.questions.pop();
    expect(() => validateNativeQuestionStage(missing, f.original)).toThrow(
      "every original question",
    );
    const mismatch = { ...f.stage, sourceRecordId: "ebs-middle-2-2026-1" };
    await writeFile(f.stagePath, JSON.stringify(mismatch));
    await expect(
      loadNativeQuestionStage(f.root, nativeSourceId),
    ).rejects.toThrow("Selected source identity mismatch");
  });
  it("defaults to read-only and pins the CLI to the intended Supabase database", () => {
    expect(parseNativeListeningArgs([nativeSourceId]).apply).toBe(false);
    expect(parseNativeListeningArgs([nativeSourceId, "--apply"]).apply).toBe(
      true,
    );
    expect(() =>
      parseNativeListeningArgs([nativeSourceId, "--owner-id", "anyone"]),
    ).toThrow("Unknown");
    expect(
      nativeListeningDatabaseUrl(
        "postgresql://postgres.jyaguxwuaxgdnovtulna:local@aws-0.example.pooler.supabase.com:5432/postgres",
      ),
    ).toContain("connection_limit=2");
    for (const value of [
      "postgresql://postgres.other:local@aws-0.example.pooler.supabase.com/postgres",
      "postgresql://postgres.jyaguxwuaxgdnovtulna:local@evil.test/postgres",
      "postgresql://postgres:local@localhost/postgres",
    ])
      expect(() => nativeListeningDatabaseUrl(value)).toThrow(
        "Expected listening database",
      );
  });
  it("runs the actual Node CLI help without environment credentials or database access", async () => {
    const result = await promisify(execFile)(
      process.execPath,
      [
        "--conditions=react-server",
        "--import=tsx",
        resolve(
          "scripts/qa/english-listening/adopt-native-listening-questions.mts",
        ),
        "--help",
      ],
      {
        windowsHide: true,
        env: { ...process.env, DATABASE_URL: "", DIRECT_URL: "" },
        timeout: 30000,
      },
    );
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Default: database read-only preflight");
  });
});
