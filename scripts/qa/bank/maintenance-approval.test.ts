import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  QUESTION_FORMAT_PLAN,
  QUESTION_FORMAT_PLAN_SHA,
  committedBytes,
  digest,
  valueDigest,
  verifyApproval,
  type ApprovalFiles,
  type MaintenanceApproval,
} from "../../import/protected-question-maintenance";

describe("committed exact approval boundary", () => {
  it("reads a committed artifact larger than the figure index and still rejects a local byte change", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "question-large-approval-"));
    const git = (...args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          "commit.gpgsign=false",
          "-c",
          "user.name=QA",
          "-c",
          "user.email=qa@example.invalid",
          ...args,
        ],
        { cwd: dir, stdio: ["ignore", "pipe", "pipe"] },
      );
    try {
      git("init");
      const bytes = Buffer.alloc(3 * 1024 * 1024, 120);
      writeFileSync(path.join(dir, "figure-index.json"), bytes);
      git("add", ".");
      git("commit", "-m", "large source");
      expect(committedBytes(dir, "figure-index.json")).toEqual(bytes);
      bytes[bytes.length - 1] = 121;
      writeFileSync(path.join(dir, "figure-index.json"), bytes);
      expect(() => committedBytes(dir, "figure-index.json")).toThrow(
        /not committed/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("requires exact committed plan, source, manifest, before ledger and prewrite SHA with Claude approval", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "question-approval-"));
    const git = (...args: string[]) =>
      execFileSync(
        "git",
        [
          "-c",
          "commit.gpgsign=false",
          "-c",
          "user.name=QA",
          "-c",
          "user.email=qa@example.invalid",
          ...args,
        ],
        { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
    try {
      git("init");
      mkdirSync(path.dirname(path.join(dir, QUESTION_FORMAT_PLAN)), {
        recursive: true,
      });
      writeFileSync(
        path.join(dir, QUESTION_FORMAT_PLAN),
        readFileSync(QUESTION_FORMAT_PLAN),
      );
      writeFileSync(path.join(dir, "source.ts"), "export const source = 1;\n");
      git("add", ".");
      git("commit", "-m", "source");
      const sourceCommit = git("rev-parse", "HEAD"),
        sourceDigests = {
          "source.ts": digest(readFileSync(path.join(dir, "source.ts"))),
        };
      const files: ApprovalFiles = {
        repoDir: dir,
        manifest: "manifest.json",
        before: "before.json",
        prewrite: "uuids.json",
        approval: "approval.json",
        journal: "journal.jsonl",
      };
      const manifest = '{"exact":1}\n',
        before = '{"original":1}\n',
        uuids = '{"uuid":1}\n';
      const approval: MaintenanceApproval = {
        reviewer: "Claude",
        verdict: "approved",
        kind: "bounded-family-reinforcement",
        planSha256: QUESTION_FORMAT_PLAN_SHA,
        sourceCommit,
        sourceDigestsSha256: valueDigest(sourceDigests),
        manifestSha256: digest(manifest),
        beforeLedgerSha256: digest(before),
        prewriteSha256: digest(uuids),
      };
      for (const [file, bytes] of [
        [files.manifest, manifest],
        [files.before, before],
        [files.prewrite!, uuids],
        [files.approval, JSON.stringify(approval)],
      ])
        writeFileSync(path.join(dir, file!), bytes!);
      git("add", ".");
      git("commit", "-m", "approval");
      const evidence = { sourceCommit, sourceDigests };
      expect(() =>
        verifyApproval(files, "bounded-family-reinforcement", evidence),
      ).not.toThrow();
      expect(() =>
        verifyApproval(files, "17-row-content-repair", evidence),
      ).toThrow(/mismatch/);
      writeFileSync(path.join(dir, files.before), before + " ");
      expect(() =>
        verifyApproval(files, "bounded-family-reinforcement", evidence),
      ).toThrow(/not committed/);
      writeFileSync(path.join(dir, files.before), before);
      writeFileSync(path.join(dir, "source.ts"), "export const source = 2;\n");
      git("add", "source.ts");
      git("commit", "-m", "changed source");
      expect(() =>
        verifyApproval(files, "bounded-family-reinforcement", evidence),
      ).toThrow(/Source digest/);
      writeFileSync(path.join(dir, "source.ts"), "export const source = 1;\n");
      git("add", "source.ts");
      git("commit", "-m", "restore source");
      writeFileSync(
        path.join(dir, files.approval),
        JSON.stringify({ ...approval, reviewer: "Codex" }),
      );
      git("add", files.approval);
      git("commit", "-m", "wrong reviewer");
      expect(() =>
        verifyApproval(files, "bounded-family-reinforcement", evidence),
      ).toThrow(/mismatch/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
