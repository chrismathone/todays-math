// @vitest-environment node
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import {
  applyListeningStyle,
  listeningStyleDatabaseUrl,
  loadListeningStyleSnapshot,
  parseListeningStyleArgs,
  listeningStyleEvidenceHoldReasons,
} from "../../../scripts/qa/english-listening/apply-listening-style.mts";
vi.mock("server-only", () => ({}));
const owner = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
const source = "ebs-middle-3-2017-2";
const hash = "a".repeat(64);
const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "listening-style-operator-"));
  roots.push(root);
  const document = { ...englishListeningFixture(), ownerId: owner };
  const envelope = {
    ownerId: owner,
    checkedAt: "2026-10-04T15:00:00.000Z",
    snapshots: [
      {
        id: document.id,
        revision: document.revision,
        document,
        publications: 0,
        sourceRecordId: source,
        baselineSha256: hash,
        baselineMatch: true,
      },
    ],
  };
  const file = resolve(root, "snapshot.json");
  await writeFile(file, JSON.stringify(envelope));
  return { root, file, envelope };
}
afterEach(async () => {
  for (const root of roots.splice(0)) {
    if (dirname(root) !== resolve(tmpdir()))
      throw Error("Unexpected fixture cleanup target");
    await rm(root, { recursive: true, force: true });
  }
});
describe("trusted listening style operator", () => {
  it("holds evidence without English speech without treating this language gate as alignment proof", () => {
    expect(
      listeningStyleEvidenceHoldReasons([
        "길거리에 너무 많은 차가 있어요",
        "그래서 이번에는 택시를 타고 갈 거예요",
      ]),
    ).toHaveLength(1);
    expect(
      listeningStyleEvidenceHoldReasons(["いいえ、電車です"]),
    ).toHaveLength(1);
    expect(listeningStyleEvidenceHoldReasons([])).toHaveLength(1);
    expect(
      listeningStyleEvidenceHoldReasons([
        "A tiny robot waters my balcony plants each morning.",
        "그래서 택시를 타요",
      ]),
    ).toEqual([]);
  });
  it("loads and freezes the exact saved owner/source/revision baseline", async () => {
    const f = await fixture();
    const result = await loadListeningStyleSnapshot(
      f.file,
      f.root,
      source,
      hash,
    );
    expect(result.snapshot).toEqual(f.envelope.snapshots[0]);
    expect(result.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(result.snapshot.document.groups[0].questions)).toBe(
      true,
    );
  });
  it("rejects ambiguity, wrong source/owner/hash, publication, mismatch and inconsistent revisions", async () => {
    const f = await fixture();
    const changes = [
      (data: typeof f.envelope) => {
        data.ownerId = data.snapshots[0].document.id;
      },
      (data: typeof f.envelope) => {
        data.snapshots.push(structuredClone(data.snapshots[0]));
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].sourceRecordId = "ebs-middle-2-2017-2";
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].document.ownerId = data.snapshots[0].document.id;
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].baselineSha256 = "b".repeat(64);
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].publications = 1;
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].baselineMatch = false;
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].revision++;
      },
      (data: typeof f.envelope) => {
        data.snapshots[0].id = data.snapshots[0].document.ownerId;
      },
    ];
    for (const change of changes) {
      const data = structuredClone(f.envelope);
      change(data);
      await writeFile(f.file, JSON.stringify(data));
      await expect(
        loadListeningStyleSnapshot(f.file, f.root, source, hash),
      ).rejects.toThrow();
    }
  });
  it("refuses outside and prefix-collision snapshots before reading their contents", async () => {
    const f = await fixture();
    await expect(
      loadListeningStyleSnapshot(
        f.file,
        resolve(f.root, "snapshot"),
        source,
        hash,
      ),
    ).rejects.toThrow();
    const other = await fixture();
    await expect(
      loadListeningStyleSnapshot(other.file, f.root, source, hash),
    ).rejects.toThrow("inside");
  });
  it("does not begin a database transaction for caller-supplied proof objects", async () => {
    const f = await fixture();
    const backup = await loadListeningStyleSnapshot(
      f.file,
      f.root,
      source,
      hash,
    );
    const transaction = vi.fn();
    await expect(
      applyListeningStyle(
        { $transaction: transaction } as Parameters<
          typeof applyListeningStyle
        >[0],
        {} as Parameters<typeof applyListeningStyle>[1],
        backup,
        { actor: { kind: "teacher", userId: owner }, apply: true },
      ),
    ).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });
  it("refuses incorrect database projects and never returns a credential in an error", () => {
    const wrong =
      "postgresql://postgres.yqbycslqbfcsxrlhjjlq:sentinel-private-value@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";
    expect(() => listeningStyleDatabaseUrl(wrong)).toThrow(
      "Expected listening database project",
    );
    try {
      listeningStyleDatabaseUrl(wrong);
    } catch (error) {
      expect(String(error)).not.toContain("sentinel-private-value");
    }
    expect(() =>
      listeningStyleDatabaseUrl(
        "https://db.jyaguxwuaxgdnovtulna.supabase.co/postgres",
      ),
    ).toThrow();
    const valid = new URL(
      listeningStyleDatabaseUrl(
        "postgresql://postgres.jyaguxwuaxgdnovtulna:test@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
      ),
    );
    expect(valid.searchParams.get("connection_limit")).toBe("1");
  });
  it("requires explicit stage, snapshot and apply selection", () => {
    expect(parseListeningStyleArgs(["--help"]).help).toBe(true);
    const args = parseListeningStyleArgs([
      "stage.json",
      "--snapshots",
      "snapshot.json",
    ]);
    expect(args.apply).toBe(false);
    expect(() => parseListeningStyleArgs(["stage.json"])).toThrow();
    expect(() =>
      parseListeningStyleArgs(["stage.json", "--snapshots", "--apply"]),
    ).toThrow();
    expect(() =>
      parseListeningStyleArgs([
        "stage.json",
        "--snapshots",
        "snapshot.json",
        "--force",
      ]),
    ).toThrow();
  });
});
