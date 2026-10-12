// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import type { Prisma, PrismaClient, Problem } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { DbRetryOrigin } from "@/lib/import/schoolTextbook/dbRetry.types";
import { generateDbRetryPair } from "@/lib/import/schoolTextbook/dbRetryGeneration";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
import {
  atomicDbRetryJson,
  DbRetryCheckpointStore,
  existingDbRetryPair,
  freshDbRetryCheckpoint,
  readDbRetrySnapshot,
  runDbRetryBounded,
  selectDbRetryOrigins,
  type DbRetryCheckpoint,
} from "../../../scripts/import/textbook/db-retry-20261011/checkpoint";
import {
  dbRetryRowsWithIntent,
  insertDbRetryPendingPair,
  readLiveDbRetryOrigin,
} from "../../../scripts/import/textbook/db-retry-20261011/insert";
import {
  parseDbRetryCliOptions,
  runDbRetryCli,
  safeDbRetryReason,
} from "../../../scripts/import/textbook/db-retry-20261011/runner";

const unitId = "0ff8fe3f-4b29-408b-bf17-e1d5f92c2a39";
const sourceId = "2ff8fe3f-4b29-408b-bf17-e1d5f92c2a39";
const blankFigures = { images: [], digest: reviewDigest([]) };
const draftTransport = () => {
  let slot = 0;
  return vi.fn().mockImplementation(async () => {
    slot++;
    return {
      content: JSON.stringify([
        {
          content: `$${slot + 3}+3$을 계산하시오.`,
          answer: `$${slot + 6}$`,
          solution: `$${slot + 3}+3=${slot + 6}$이다.`,
          originalAnswerRecomputed: "$5$",
        },
      ]),
      model: "deepseek-v4-pro",
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    };
  });
};
const originFixture: DbRetryOrigin = {
  grade: "공통수학1",
  chapter: "다항식",
  section: "다항식의 계산",
  problem: {
    id: sourceId,
    unit_id: unitId,
    source: "school_textbook",
    content: "$2+3$을 계산하시오.",
    answer: "$5$",
    solution: "$2+3=5$이다.",
    difficulty: "기본",
    problem_type: "계산",
    question_type: "단답형",
    direct_use_allowed: true,
    review_status: "approved",
    origin_problem_id: null,
    source_material_id: "1ff8fe3f-4b29-408b-bf17-e1d5f92c2a39",
    pool: "shared",
    family_key: "textbook:add",
    external_id: "source-1",
    source_file: "books/source.hwpx",
    figure_svg: null,
    figure_urls: [],
    figure_dims: [],
    figure_source_mm: [],
    choice_figure_index: [],
  },
};
const snapshotBytes = (origin = originFixture) =>
  Buffer.from(
    JSON.stringify({
      rows: [
        {
          problem: origin.problem,
          unit: {
            grade: origin.grade,
            chapter: origin.chapter,
            section: origin.section,
          },
        },
      ],
      children: [],
    }),
  );
const temporaryDirs: string[] = [];
const makeDirectory = () => {
  const path = mkdtempSync(join(tmpdir(), "db-retry-tests-"));
  temporaryDirs.push(path);
  return path;
};
afterAll(() => {
  // Explicit bounded files only; never recursively remove a worktree or junction.
  for (const path of temporaryDirs) {
    const children = readdirSync(path, { withFileTypes: true });
    for (const item of children) {
      const childPath = join(path, item.name);
      if (item.isDirectory()) {
        for (const file of readdirSync(childPath))
          unlinkSync(join(childPath, file));
        rmdirSync(childPath);
      } else unlinkSync(childPath);
    }
    rmdirSync(path);
  }
});

describe("bounded offline CLI and durable resume", () => {
  it("defaults to plan and bounds explicit paid/write modes and concurrency", () => {
    expect(parseDbRetryCliOptions(["--snapshot", "one.json"])).toMatchObject({
      mode: "plan",
      concurrency: 2,
      limit: 20,
    });
    expect(
      parseDbRetryCliOptions([
        "--snapshot",
        "one.json",
        "--generate",
        "--limit",
        "3",
        "--concurrency",
        "8",
      ]),
    ).toMatchObject({ mode: "generate", concurrency: 8 });
    for (const flags of [
      ["--generate"],
      ["--apply"],
      ["--generate", "--apply", "--limit", "3"],
      ["--limit", "1001"],
      ["--concurrency", "9"],
      ["--limit", "0"],
      ["--limit", "1.5"],
      ["--limit", "2", "--limit", "3"],
      ["--unexpected"],
    ])
      expect(() =>
        parseDbRetryCliOptions(["--snapshot", "one.json", ...flags]),
      ).toThrow();
  });
  it("real default CLI path never instantiates Prisma, calls a provider or creates checkpoints", async () => {
    const directory = makeDirectory();
    const file = join(directory, "snapshot.json");
    writeFileSync(file, snapshotBytes());
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await runDbRetryCli(
      parseDbRetryCliOptions([
        "--snapshot",
        file,
        "--out",
        join(directory, "never-created"),
      ]),
    );
    expect(result.failed).toBe(0);
    expect(JSON.parse(log.mock.calls[0]![0])).toMatchObject({
      mode: "dry-run",
      modelCalls: 0,
      dbWrites: 0,
    });
    expect(readdirSync(directory)).toEqual(["snapshot.json"]);
    log.mockRestore();
  });
  it("rejects apply without the existing shared-write gate before opening a checkpoint", async () => {
    const directory = makeDirectory();
    const file = join(directory, "snapshot.json");
    writeFileSync(file, snapshotBytes());
    vi.stubEnv("ALLOW_SHARED_IMPORT", "");
    await expect(
      runDbRetryCli(
        parseDbRetryCliOptions([
          "--snapshot",
          file,
          "--apply",
          "--limit",
          "1",
          "--out",
          directory,
        ]),
      ),
    ).rejects.toThrow("allow-shared-import-required");
    vi.unstubAllEnvs();
    expect(readdirSync(directory)).toEqual(["snapshot.json"]);
  });
  it("preserves completed slots, refuses partial slots, and keeps recovery children outside the slot count", () => {
    const child = (slot: number) => ({
      ...originFixture.problem,
      id: randomUUID(),
      source: "transformed",
      origin_problem_id: sourceId,
      external_id: `tb-retry-v1:${sourceId}:${slot}`,
      content: "edited by person",
      review_status: "approved",
    });
    expect(existingDbRetryPair(originFixture, [child(1), child(2)])).toBe(
      "complete",
    );
    expect(existingDbRetryPair(originFixture, [child(1)])).toBe("conflict");
    expect(
      existingDbRetryPair(originFixture, [
        { ...child(1), family_key: "wrong" },
        child(2),
      ]),
    ).toBe("conflict");
    expect(
      existingDbRetryPair(originFixture, [
        { ...child(1), external_id: "textbook-recovered-v1:one" },
      ]),
    ).toBe("empty");
  });
  it("binds resume to immutable snapshot bytes and rejects candidate/source tampering", async () => {
    const snapshot = readDbRetrySnapshot(snapshotBytes());
    const directory = makeDirectory();
    let store = new DbRetryCheckpointStore(directory, snapshot.digest, false);
    const pair = await generateDbRetryPair(originFixture, blankFigures, {
      complete: draftTransport(),
    });
    const entry: DbRetryCheckpoint = {
      ...freshDbRetryCheckpoint(originFixture),
      state: "generated",
      pair,
      calls: pair.calls,
    };
    store.write(entry);
    expect(
      () => new DbRetryCheckpointStore(directory, snapshot.digest, true),
    ).toThrow();
    store.close();
    expect(
      () => new DbRetryCheckpointStore(directory, "changed-snapshot", true),
    ).toThrow("checkpoint-snapshot-changed");
    store = new DbRetryCheckpointStore(directory, snapshot.digest, true);
    expect(store.read(originFixture)?.pair).toEqual(pair);
    expect(() => store.read({ ...originFixture, grade: "중1" })).toThrow(
      "checkpoint-source-changed",
    );
    entry.pair!.candidates[0].answer = "$99$";
    store.write(entry);
    expect(() => store.read(originFixture)).toThrow(
      "checkpoint-candidates-changed",
    );
    store.close();
  });
  it("resumes interrupted generation, skips generated checkpoints, and retries failures only explicitly", () => {
    const snapshot = readDbRetrySnapshot(snapshotBytes());
    const store = new DbRetryCheckpointStore(
      makeDirectory(),
      snapshot.digest,
      false,
    );
    const entry = freshDbRetryCheckpoint(originFixture);
    const select = (retryFailed = false) =>
      selectDbRetryOrigins(snapshot, store, {
        mode: "generate",
        limit: 1,
        retryFailed,
      });
    entry.state = "generating";
    store.write(entry);
    expect(select()).toHaveLength(1);
    entry.state = "failed";
    store.write(entry);
    expect(select()).toHaveLength(0);
    expect(select(true)).toHaveLength(1);
    entry.state = "existing-pair";
    store.write(entry);
    expect(select(true)).toHaveLength(0);
    store.close();
  });
  it("uses an exclusive run lock and atomically replaces an output file", () => {
    const directory = makeDirectory();
    const file = join(directory, "one.json");
    atomicDbRetryJson(file, { value: 1 });
    atomicDbRetryJson(file, { value: 2 });
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ value: 2 });
    expect(readdirSync(directory)).toEqual(["one.json"]);
    expect(safeDbRetryReason(new Error("postgres://password@private/db"))).toBe(
      "operation-failed",
    );
  });
  it("holds the configured maximum concurrency and drains started work before propagating failure", async () => {
    let active = 0,
      maximum = 0,
      done = 0;
    await runDbRetryBounded([1, 2, 3, 4, 5], 2, async () => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      done++;
    });
    expect(maximum).toBe(2);
    expect(done).toBe(5);
    expect(active).toBe(0);
    await expect(runDbRetryBounded([1], 9, async () => {})).rejects.toThrow(
      "concurrency-out-of-bounds",
    );
    done = 0;
    await expect(
      runDbRetryBounded([1, 2, 3], 2, async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        done++;
        if (id === 1) throw new Error("checkpoint-io-failed");
      }),
    ).rejects.toThrow("checkpoint-io-failed");
    expect(done).toBe(2);
  });
});

describe("pending-only insertion against local PostgreSQL (PGlite)", () => {
  let db: PGlite;
  let origin: DbRetryOrigin;
  const camel = (key: string) =>
    key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const snake = (key: string) =>
    key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  function adapter(
    options: { failSecondInsert?: boolean; corruptReadback?: boolean } = {},
  ) {
    const makeTx = (connection: Pick<PGlite, "query">) => {
      let inserted = false;
      return {
        $queryRaw: async (sql: Prisma.Sql) =>
          (await connection.query(sql.text, sql.values)).rows,
        problem: {
          findMany: async (query: {
            where: { externalId: { in: string[] } };
          }) => {
            const result = await connection.query<Record<string, unknown>>(
              "SELECT * FROM problem WHERE external_id=ANY($1::text[])",
              [query.where.externalId.in],
            );
            const rows = result.rows.map(
              (row) =>
                Object.fromEntries(
                  Object.entries(row).map(([key, value]) => [
                    camel(key),
                    value,
                  ]),
                ) as unknown as Problem,
            );
            if (inserted && options.corruptReadback && rows[0])
              rows[0].answer = "corrupt";
            return rows;
          },
          createManyAndReturn: async ({
            data,
          }: {
            data: Prisma.ProblemCreateManyInput[];
          }) => {
            const rows = [];
            for (let at = 0; at < data.length; at++) {
              const columns = Object.entries(data[at]!);
              if (at === 1 && options.failSecondInsert)
                throw new Error("local-second-insert-fault");
              const result = await connection.query<{
                id: string;
                externalId: string;
              }>(
                `INSERT INTO problem (${columns.map(([k]) => snake(k)).join(",")}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id,external_id AS "externalId"`,
                columns.map(([, value]) => value),
              );
              rows.push(...result.rows);
            }
            inserted = true;
            return rows;
          },
        },
      };
    };
    return {
      ...makeTx(db),
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        db.transaction((tx) => callback(makeTx(tx))),
    } as unknown as Pick<PrismaClient, "$transaction" | "$queryRaw">;
  }
  const stage = async () => {
    const pair = await generateDbRetryPair(origin, blankFigures, {
      complete: draftTransport(),
    });
    const entry: DbRetryCheckpoint = {
      ...freshDbRetryCheckpoint(origin),
      state: "inserting",
      pair,
      insertionIds: [randomUUID(), randomUUID()],
    };
    entry.rowPayloadDigest = reviewDigest(dbRetryRowsWithIntent(origin, entry));
    return entry;
  };
  const childCount = async () =>
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM problem WHERE origin_problem_id=$1::uuid",
        [sourceId],
      )
    ).rows[0]!.n;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE TABLE unit(id uuid PRIMARY KEY,grade text,chapter text,section text);
      CREATE TABLE problem(id uuid PRIMARY KEY,user_id uuid,unit_id uuid REFERENCES unit(id),source text,origin_problem_id uuid,
      family_key text,source_material_id uuid,external_id text UNIQUE,source_file text,difficulty text,problem_type text,question_type text,
      content text,answer text,solution text,solution_source text,figure_svg text,figure_source text,figure_urls text[] DEFAULT '{}',
      figure_dims int[] DEFAULT '{}',figure_source_mm float[] DEFAULT '{}',choice_figure_index int[] DEFAULT '{}',review_status text,direct_use_allowed boolean,pool text);`);
  });
  beforeEach(async () => {
    await db.exec("TRUNCATE problem,unit");
    await db.query("INSERT INTO unit VALUES($1::uuid,$2,$3,$4)", [
      unitId,
      originFixture.grade,
      originFixture.chapter,
      originFixture.section,
    ]);
    const fields = Object.entries(originFixture.problem);
    await db.query(
      `INSERT INTO problem(${fields.map(([key]) => key).join(",")}) VALUES(${fields.map((_, i) => `$${i + 1}`).join(",")})`,
      fields.map(([, value]) => value),
    );
    origin = await readLiveDbRetryOrigin(adapter(), sourceId);
  });
  afterAll(async () => {
    await db.close();
  });
  it("executes the real advisory/source locks, creates exactly two pending rows, and preserves the DB original", async () => {
    const before = structuredClone(origin);
    const entry = await stage();
    const result = await insertDbRetryPendingPair(
      adapter(),
      origin,
      entry,
      blankFigures,
    );
    expect(result).toMatchObject({
      state: "inserted",
      receipt: {
        ownedIds: entry.insertionIds,
        sourceDigest: entry.sourceDigest,
      },
    });
    expect(await childCount()).toBe(2);
    expect(await readLiveDbRetryOrigin(adapter(), sourceId)).toEqual(before);
    const rows = (
      await db.query<{
        review_status: string;
        direct_use_allowed: boolean;
        source_file: string;
      }>(
        "SELECT review_status,direct_use_allowed,source_file FROM problem WHERE origin_problem_id=$1",
        [sourceId],
      )
    ).rows;
    expect(
      rows.every(
        (p) =>
          p.review_status === "pending" &&
          !p.direct_use_allowed &&
          p.source_file === origin.problem.source_file,
      ),
    ).toBe(true);
  });
  it("rolls back the first row when the second row fails", async () => {
    await expect(
      insertDbRetryPendingPair(
        adapter({ failSecondInsert: true }),
        origin,
        await stage(),
        blankFigures,
      ),
    ).rejects.toThrow("local-second-insert-fault");
    expect(await childCount()).toBe(0);
  });
  it("rolls back both rows when the readback differs", async () => {
    await expect(
      insertDbRetryPendingPair(
        adapter({ corruptReadback: true }),
        origin,
        await stage(),
        blankFigures,
      ),
    ).rejects.toThrow("insertion-readback-mismatch");
    expect(await childCount()).toBe(0);
  });
  it("resumes a committed pair with lost receipt by its durable owned UUIDs", async () => {
    const entry = await stage();
    const first = await insertDbRetryPendingPair(
      adapter(),
      origin,
      entry,
      blankFigures,
    );
    const recovered = await insertDbRetryPendingPair(
      adapter(),
      origin,
      entry,
      blankFigures,
    );
    expect(first.state).toBe("inserted");
    expect(recovered.state).toBe("inserted");
    if (recovered.state === "inserted")
      expect(recovered.receipt.ownedIds).toEqual(entry.insertionIds);
    expect(await childCount()).toBe(2);
  });
  it("skips a preexisting approved and edited pair without claiming its UUIDs", async () => {
    await insertDbRetryPendingPair(
      adapter(),
      origin,
      await stage(),
      blankFigures,
    );
    await db.query(
      "UPDATE problem SET review_status='approved',direct_use_allowed=true,content='human edit' WHERE origin_problem_id=$1",
      [sourceId],
    );
    expect(
      await insertDbRetryPendingPair(
        adapter(),
        origin,
        await stage(),
        blankFigures,
      ),
    ).toEqual({ state: "existing-pair" });
    const rows = (
      await db.query<{ content: string; review_status: string }>(
        "SELECT content,review_status FROM problem WHERE origin_problem_id=$1",
        [sourceId],
      )
    ).rows;
    expect(rows).toEqual([
      { content: "human edit", review_status: "approved" },
      { content: "human edit", review_status: "approved" },
    ]);
  });
  it("refuses to fill a partial existing pair", async () => {
    const entry = await stage();
    await insertDbRetryPendingPair(adapter(), origin, entry, blankFigures);
    await db.query("DELETE FROM problem WHERE id=$1", [entry.insertionIds![1]]);
    await expect(
      insertDbRetryPendingPair(adapter(), origin, await stage(), blankFigures),
    ).rejects.toThrow("existing-partial-or-conflicting-pair");
    expect(await childCount()).toBe(1);
  });
  it("rejects source text, unit context and source figure byte changes before insertion", async () => {
    const entry = await stage();
    await db.query("UPDATE problem SET answer='$99$' WHERE id=$1", [sourceId]);
    await expect(
      insertDbRetryPendingPair(adapter(), origin, entry, blankFigures),
    ).rejects.toThrow("source-digest-changed");
    expect(await childCount()).toBe(0);
    await db.query("UPDATE problem SET answer='$5$' WHERE id=$1", [sourceId]);
    await db.query("UPDATE unit SET grade='중1' WHERE id=$1", [unitId]);
    await expect(
      insertDbRetryPendingPair(adapter(), origin, entry, blankFigures),
    ).rejects.toThrow("source-digest-changed");
    await expect(
      insertDbRetryPendingPair(adapter(), origin, entry, {
        images: [],
        digest: "different-read-bytes",
      }),
    ).rejects.toThrow("source-figure-bytes-changed");
    expect(await childCount()).toBe(0);
  });
});
