/** Memory/contract verification only. No .env, DB connections or paid APIs, and no real-DB claim. */
import { afterAll, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      throw new Error(
        "Verified pure imports must not construct a Prisma client or read its env paths",
      );
    }
  },
}));
import { nativeDescriptiveDefinitions } from "@/lib/engine/nativeDescriptive20261018";
import { nativeExternalId } from "@/contracts/nativeDescriptive.contract";
import {
  APPROVED_REINFORCEMENT_PLAN_SHA256,
  assertReferenceCoverage,
  buildVerifiedCandidates,
  createPrismaVerifiedBatchStore,
  executeVerifiedBatch,
  manifestEntries,
  payloadSha256,
  preparePrewriteLedger,
  REQUIRED_PROBLEM_REFERENCES,
  serializeManifest,
  serializePrewriteLedger,
  sha256,
  writePreparedBatch,
  type BatchFiles,
  type BatchTransaction,
  type StoredCandidate,
  type VerifiedBatchStore,
  type VerifiedCandidate,
  type ReferenceColumn,
  type PrewriteLedger,
} from "../../../scripts/import/verified-engine-batch";

const defs = nativeDescriptiveDefinitions();
const units = defs.map((d) => ({
  id: d.unitId,
  grade: d.grade,
  chapter: d.chapter,
  section: d.unitSection,
}));
const plan = {
  label: "native-wave1",
  seedBase: 20261018,
  targets: [
    {
      engine: "native-descriptive" as const,
      definitionIds: defs.map((d) => d.definitionId),
      variants: 2,
    },
  ],
};
const candidates = await buildVerifiedCandidates(plan, units);
const dirs: string[] = [];
afterAll(() =>
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

function memoryStore(initial: StoredCandidate[] = []) {
  let rows = structuredClone(initial);
  const refs = new Map<string, Record<string, number>>();
  let failInsertAt = Infinity,
    transactionCalls = 0,
    writes = 0;
  const store: VerifiedBatchStore = {
    async transaction(work) {
      transactionCalls++;
      const local = structuredClone(rows);
      let inserted = 0;
      const tx: BatchTransaction = {
        async readScope(entries, ids) {
          return structuredClone(
            local.filter(
              (r) =>
                ids.includes(r.id) ||
                entries.some(
                  (e) =>
                    e.externalId === r.externalId ||
                    (e.unitId === r.unitId && e.familyKey === r.familyKey),
                ),
            ),
          );
        },
        async insert(row, id) {
          if (++inserted === failInsertAt)
            throw new Error("Injected create failure");
          if (local.some((r) => r.id === id || r.externalId === row.externalId))
            throw new Error("Unique conflict");
          local.push({
            ...row,
            id,
            source: "manual",
            pool: "shared",
            originProblemId: null,
            reviewStatus: "approved",
            directUseAllowed: true,
          });
          writes++;
        },
        async referenceCounts(id) {
          return structuredClone(refs.get(id) ?? {});
        },
        async deleteOwned(row) {
          const i = local.findIndex((r) => r.id === row.id);
          if (i < 0) throw new Error("CAS");
          local.splice(i, 1);
          writes++;
        },
        async lockOwned(row) {
          const r = local.find((r) => r.id === row.id);
          if (!r) throw new Error("CAS");
          r.directUseAllowed = false;
          writes++;
        },
      };
      const result = await work(tx);
      rows = local;
      return result;
    },
  };
  return {
    store,
    refs,
    get rows() {
      return structuredClone(rows);
    },
    set rows(value: StoredCandidate[]) {
      rows = structuredClone(value);
    },
    get transactionCalls() {
      return transactionCalls;
    },
    get writes() {
      return writes;
    },
    set failInsertAt(n: number) {
      failInsertAt = n;
    },
  };
}
const stored = (
  row: VerifiedCandidate,
  id: string = randomUUID(),
): StoredCandidate => ({
  ...row,
  id,
  source: "manual",
  pool: "shared",
  originProblemId: null,
  reviewStatus: "approved",
  directUseAllowed: true,
});
function git(dir: string, args: string[]) {
  return execFileSync("git", args, { cwd: dir, stdio: "pipe" })
    .toString()
    .trim();
}
function fixture(rows = candidates, baseline: StoredCandidate[] = []) {
  const dir = mkdtempSync(path.join(tmpdir(), "verified-engine-pure-"));
  dirs.push(dir);
  git(dir, ["init", "-q"]);
  const files: BatchFiles = {
    repoDir: dir,
    manifestPath: "manifest.json",
    prewritePath: "prewrite.json",
    approvalPath: "approval.json",
    planPath: "plan.md",
    resultJournalPath: "result.jsonl",
  };
  writeFileSync(
    path.join(dir, "plan.md"),
    readFileSync("docs/planning/tracks/math-bank-reinforcement-20261018.md"),
  );
  const commit = () => {
    git(dir, ["add", "."]);
    git(dir, [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "user.name=Pure Test",
      "-c",
      "user.email=pure@example.invalid",
      "commit",
      "-qm",
      "fixture",
    ]);
  };
  commit();
  const sourceCommit = git(dir, ["rev-parse", "HEAD"]);
  const ledger = preparePrewriteLedger(rows, baseline, {
    planSha256: APPROVED_REINFORCEMENT_PLAN_SHA256,
    sourceCommit,
  });
  writePreparedBatch(
    path.join(dir, "manifest.json"),
    path.join(dir, "prewrite.json"),
    rows,
    ledger,
  );
  writeFileSync(
    path.join(dir, "approval.json"),
    JSON.stringify({
      reviewer: "Claude",
      verdict: "approved",
      kind: "final-engine-batch",
      batchSha256: ledger.batchSha256,
      prewriteSha256: sha256(serializePrewriteLedger(ledger)),
      planSha256: ledger.planSha256,
      sourceCommit,
    }),
  );
  commit();
  const options = {
    files,
    regenerate: async () => structuredClone(rows),
    apply: true,
    allowSharedImport: "1",
  };
  return {
    files,
    ledger,
    options,
    commit,
    write: (file: string, value: unknown) =>
      writeFileSync(
        path.join(dir, file),
        typeof value === "string" ? value : JSON.stringify(value),
      ),
    read: (file: string) => readFileSync(path.join(dir, file), "utf8"),
  };
}

describe("R2-1/2/5 frozen identity and actual-byte digest", () => {
  it("sorts by externalId and hashes exactly the UTF-8 payload tuple and full list bytes", () => {
    const changed = {
      ...candidates[0]!,
      figureSvg: "<svg><text>실제 SVG</text></svg>",
    };
    expect(payloadSha256(changed)).toBe(
      sha256(
        JSON.stringify([
          changed.content,
          changed.answer,
          changed.solution,
          changed.figureSvg,
        ]),
      ),
    );
    expect(
      payloadSha256({ ...changed, figureSvg: changed.figureSvg + " " }),
    ).not.toBe(payloadSha256(changed));
    expect(serializeManifest([...candidates].reverse())).toBe(
      serializeManifest(candidates),
    );
    const parsed = JSON.parse(serializeManifest(candidates));
    expect(parsed).toHaveLength(12);
    expect(
      parsed.every(
        (r: Record<string, string>) =>
          r.payloadSha256.length === 64 &&
          r.familyKey.startsWith("native-desc:"),
      ),
    ).toBe(true);
    expect(
      readFileSync(
        "docs/planning/tracks/reports/math-bank-reinforcement-20261018/native-manifest-preview-r3.json",
        "utf8",
      ),
    ).toBe(serializeManifest(candidates));
  });
  it("does not overwrite prewrite artifacts from an earlier run", () => {
    const f = fixture();
    expect(() =>
      writePreparedBatch(
        path.join(f.files.repoDir, "manifest.json"),
        path.join(f.files.repoDir, "prewrite.json"),
        candidates,
        f.ledger,
      ),
    ).toThrow(/EEXIST/);
  });
  it("rejects missing selectors, unknown native keys, wrong units, duplicate IDs, empty and over-cap rows", async () => {
    await expect(
      buildVerifiedCandidates(
        {
          label: "bad",
          targets: [{ engine: "elem", grade: "초4", chapter: "2-2 삼각형" }],
        },
        units,
      ),
    ).rejects.toThrow(/explicit/);
    await expect(
      buildVerifiedCandidates(
        {
          label: "bad",
          targets: [
            { engine: "middle", grade: "중3", unitSection: "인수분해" },
          ],
        },
        units,
      ),
    ).rejects.toThrow(/explicit/);
    await expect(buildVerifiedCandidates(plan, [])).rejects.toThrow(/unit/);
    await expect(
      buildVerifiedCandidates(plan, [...units, units[0]!]),
    ).rejects.toThrow(/unit/);
    await expect(
      buildVerifiedCandidates(
        plan,
        units.map((u, i) => (i === 0 ? { ...u, id: randomUUID() } : u)),
      ),
    ).rejects.toThrow(/unit/);
    expect(() => manifestEntries([])).toThrow();
    expect(() => manifestEntries([candidates[0]!, candidates[0]!])).toThrow(
      /Duplicate/,
    );
    const many = Array.from({ length: 139 }, (_, seed) => ({
      ...candidates[0]!,
      externalId: nativeExternalId({
        definitionId: defs[0]!.definitionId,
        seed,
        variant: 0,
      }),
    }));
    expect(() => manifestEntries(many)).toThrow(/138/);
    expect(() =>
      manifestEntries([{ ...candidates[0]!, familyKey: "elem:forged" }]),
    ).toThrow(/identity/);
  });
  it("explicit apply and gate are required before any store call", async () => {
    const f = fixture();
    const m = memoryStore();
    for (const gate of [
      { apply: false, allowSharedImport: "1" },
      { apply: true, allowSharedImport: undefined },
      { apply: true, allowSharedImport: "on" },
    ])
      await expect(
        executeVerifiedBatch({ ...f.options, ...gate }, m.store),
      ).rejects.toThrow(/required/);
    expect(m.transactionCalls).toBe(0);
  });
  it("rejects candidate addition/removal/metadata/content/answer/solution/actual SVG changes before writes", async () => {
    const f = fixture();
    const m = memoryStore();
    const modifications: VerifiedCandidate[][] = [
      candidates.slice(1),
      [
        ...candidates,
        {
          ...candidates[0]!,
          externalId: nativeExternalId({
            definitionId: defs[0]!.definitionId,
            seed: 200,
            variant: 0,
          }),
        },
      ],
      ...[
        "content",
        "answer",
        "solution",
        "figureSvg",
        "difficulty",
        "questionType",
        "unitId",
        "familyKey",
        "problemType",
      ].map((key) =>
        candidates.map((r, i) =>
          i
            ? r
            : {
                ...r,
                [key]:
                  key === "unitId"
                    ? randomUUID()
                    : key === "difficulty"
                      ? "기본"
                      : key === "questionType"
                        ? "단답형"
                        : String(r[key as keyof VerifiedCandidate] ?? "") +
                          "changed",
              },
        ),
      ),
    ];
    for (const rows of modifications)
      await expect(
        executeVerifiedBatch(
          { ...f.options, regenerate: async () => rows },
          m.store,
        ),
      ).rejects.toThrow();
    expect(m.transactionCalls).toBe(0);
    expect(m.rows).toHaveLength(0);
  });
  it("refuses uncommitted prewrite/approval/manifest and final SHA mismatch", async () => {
    for (const file of ["prewrite.json", "approval.json", "manifest.json"]) {
      const f = fixture();
      const m = memoryStore();
      f.write(file, f.read(file) + " ");
      await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
        /not committed/,
      );
      expect(m.transactionCalls).toBe(0);
    }
    const f = fixture();
    const m = memoryStore();
    const approval = JSON.parse(f.read("approval.json"));
    approval.batchSha256 = "0".repeat(64);
    f.write("approval.json", approval);
    f.commit();
    await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
      /SHA mismatch/,
    );
    expect(m.transactionCalls).toBe(0);
  });
});

describe("R2-3/4 prewrite UUIDs, CAS, full transaction and idempotency", () => {
  it("committed preledger already owns every new UUID, appends result runs, second apply inserts zero", async () => {
    const f = fixture();
    const m = memoryStore();
    const before = f.read("prewrite.json");
    expect(f.ledger.rows.every((r) => r.id && r.ownership === "new")).toBe(
      true,
    );
    const first = await executeVerifiedBatch(f.options, m.store);
    expect(first.inserted).toEqual(f.ledger.rows.map((r) => r.id));
    const second = await executeVerifiedBatch(f.options, m.store);
    expect(second.inserted).toEqual([]);
    expect(second.matched).toHaveLength(12);
    expect(f.read("prewrite.json")).toBe(before);
    const events = f
      .read("result.jsonl")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.map((e) => e.kind)).toEqual([
      "started",
      "committed",
      "started",
      "committed",
    ]);
    expect(m.rows).toHaveLength(12);
  });
  it("failed insert rolls back the entire memory transaction; exact preledger can retry", async () => {
    const f = fixture();
    const m = memoryStore();
    m.failInsertAt = 3;
    await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
      /Injected/,
    );
    expect(m.rows).toEqual([]);
    expect(f.read("result.jsonl")).toContain('"kind":"rolled-back"');
    m.failInsertAt = Infinity;
    const result = await executeVerifiedBatch(f.options, m.store);
    expect(result.inserted).toHaveLength(12);
  });
  it("each same-externalId payload and identity mismatch aborts before the first insert", async () => {
    const f = fixture();
    for (const key of [
      "content",
      "answer",
      "solution",
      "figureSvg",
      "unitId",
      "familyKey",
      "questionType",
      "difficulty",
      "problemType",
      "source",
      "pool",
      "originProblemId",
    ]) {
      const row = stored(
        candidates[0]!,
        f.ledger.rows.find((r) => r.externalId === candidates[0]!.externalId)!
          .id,
      );
      (row as unknown as Record<string, unknown>)[key] =
        key === "unitId" || key === "originProblemId"
          ? randomUUID()
          : String(row[key as keyof StoredCandidate] ?? "") + "changed";
      const m = memoryStore([row]);
      await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
        /conflict/,
      );
      expect(m.writes).toBe(0);
    }
  });
  it("rejects a preexisting family outside the frozen list and UUID/external-key collisions", async () => {
    const f = fixture();
    const extra = {
      ...stored(candidates[0]!),
      externalId: nativeExternalId({
        definitionId: defs[0]!.definitionId,
        seed: 999,
        variant: 0,
      }),
    };
    const m = memoryStore([extra]);
    await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
      /Preexisting family/,
    );
    expect(m.writes).toBe(0);
    const sameKeyDifferentId = memoryStore([stored(candidates[0]!)]);
    await expect(
      executeVerifiedBatch(f.options, sameKeyDifferentId.store),
    ).rejects.toThrow(/UUID CAS/);
    expect(sameKeyDifferentId.writes).toBe(0);
    const collidingId = memoryStore([
      {
        ...stored(candidates[0]!, f.ledger.rows[0]!.id),
        externalId: "other:row",
        familyKey: "other",
      },
    ]);
    await expect(
      executeVerifiedBatch(f.options, collidingId.store),
    ).rejects.toThrow(/UUID CAS/);
    expect(collidingId.writes).toBe(0);
  });
  it("an existing exact match gets no new ownership and is not inserted or reverted", async () => {
    const existing = stored(candidates[0]!);
    const f = fixture(candidates, [existing]);
    const m = memoryStore([existing]);
    const result = await executeVerifiedBatch(f.options, m.store);
    expect(result.inserted).toHaveLength(11);
    expect(result.matched).toEqual([existing.id]);
    await executeVerifiedBatch(f.options, m.store, "revert");
    expect(m.rows).toEqual([existing]);
  });
  it("rejects a changed/duplicate UUID ledger even if maliciously committed", async () => {
    const f = fixture();
    const m = memoryStore();
    const l = JSON.parse(f.read("prewrite.json")) as PrewriteLedger;
    l.rows[1]!.id = l.rows[0]!.id;
    f.write("prewrite.json", l);
    f.commit();
    await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
      /SHA mismatch/,
    );
    expect(m.transactionCalls).toBe(0);
    const approval = JSON.parse(f.read("approval.json"));
    approval.prewriteSha256 = sha256(f.read("prewrite.json"));
    f.write("approval.json", approval);
    f.commit();
    await expect(executeVerifiedBatch(f.options, m.store)).rejects.toThrow(
      /UUID/,
    );
    expect(m.transactionCalls).toBe(0);
  });
});

describe("R2-6 ownership digest and complete reference protection", () => {
  it("deletes only unreferenced owned new rows; locks referenced rows and holds edited rows", async () => {
    const unrelated = stored({
      ...candidates[0]!,
      externalId: "other:untouched",
      familyKey: "unrelated",
    });
    const f = fixture();
    const m = memoryStore([unrelated]);
    await executeVerifiedBatch(f.options, m.store);
    const owned = m.rows.filter((r) => r.id !== unrelated.id);
    // Every current scalar reference class, including origin, no-FK exam and snapshot, is a distinct protected row.
    REQUIRED_PROBLEM_REFERENCES.slice(0, 8).forEach((ref, i) =>
      m.refs.set(owned[i]!.id, { [ref]: 1 }),
    );
    const edited = owned[8]!;
    m.rows = m.rows.map((r) =>
      r.id === edited.id
        ? { ...r, solution: r.solution + " edited by another session" }
        : r,
    );
    const result = await executeVerifiedBatch(f.options, m.store, "revert");
    expect(result.locked).toHaveLength(8);
    expect(result.held).toEqual([edited.id]);
    expect(result.deleted).toHaveLength(3);
    expect(m.rows.find((r) => r.id === unrelated.id)).toEqual(unrelated);
    expect(m.rows.find((r) => r.id === edited.id)!.solution).toContain(
      "edited by another session",
    );
    for (const locked of result.locked)
      expect(m.rows.find((r) => r.id === locked.id)!.directUseAllowed).toBe(
        false,
      );
    expect(m.refs.size).toBe(8); // Reference/student records are never mutated by any operation.
    const again = await executeVerifiedBatch(f.options, m.store, "revert");
    expect(again.deleted).toHaveLength(0);
    expect(again.absent).toHaveLength(3);
  });
  it("static and SQL-only references cannot disappear from discovery", () => {
    const refs: ReferenceColumn[] = REQUIRED_PROBLEM_REFERENCES.map((key) => {
      const [table, column] = key.split(".");
      return {
        schema: "public",
        table: table!,
        column: column!,
        kind:
          column === "source_ref"
            ? "source-ref"
            : column === "source_key"
              ? "source-key"
              : "scalar",
      };
    });
    expect(() => assertReferenceCoverage(refs)).not.toThrow();
    for (const ref of refs)
      expect(() =>
        assertReferenceCoverage(refs.filter((r) => r !== ref)),
      ).toThrow(/incomplete/);
    const source = readFileSync(
      "scripts/import/verified-engine-batch.ts",
      "utf8",
    );
    expect(source).toContain("pg_constraint");
    expect(source).toContain("information_schema.columns");
    expect(source).not.toMatch(/DELETE FROM.*problem_family/);
  });
  it("real adapter locks all reference tables before data reads and uses fresh post-lock snapshots", async () => {
    const calls: string[] = [];
    const refs = REQUIRED_PROBLEM_REFERENCES.map((key) => {
      const [table, column] = key.split(".");
      return { schema: "public", table, column, targetColumn: "id" };
    });
    const tx = {
      $executeRawUnsafe: vi.fn(async (sql: string) => {
        calls.push(sql);
        return 0;
      }),
      $queryRawUnsafe: vi.fn(async (sql: string) =>
        sql.includes("pg_constraint")
          ? refs.filter(
              (r) => !["source_ref", "source_key"].includes(r.column!),
            )
          : refs.filter((r) =>
              ["source_ref", "source_key"].includes(r.column!),
            ),
      ),
      problem: {
        findMany: vi.fn(async () => {
          calls.push("read");
          return [];
        }),
      },
    };
    const client = {
      $transaction: vi.fn(
        async (work: (tx: unknown) => Promise<unknown>, opts: unknown) => {
          expect(opts).toEqual({
            isolationLevel: "ReadCommitted",
            maxWait: 30000,
            timeout: 120000,
          });
          return work(tx);
        },
      ),
    };
    const store = createPrismaVerifiedBatchStore(client as never);
    await store.transaction(async (t) => {
      await t.readScope(manifestEntries(candidates), []);
    });
    expect(calls[0]).toBe(
      "LOCK TABLE public.problem IN SHARE ROW EXCLUSIVE MODE",
    );
    expect(calls[calls.length - 1]).toBe("read");
    for (const table of new Set(refs.map((r) => r.table)))
      expect(
        calls.slice(0, -1).some((s) => s.includes(`\"public\".\"${table}\"`)),
      ).toBe(true);
  });
});
