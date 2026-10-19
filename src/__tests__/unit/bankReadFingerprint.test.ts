// @vitest-environment node
import { Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, expect, it, vi } from "vitest";
import {
  openTextbookDb,
  seedWorld,
  insertProblem,
  type Db,
  type World,
} from "../helpers/textbookPglite";
import {
  ACTUAL_FORMAT_VERSION,
  actualFormatDigest,
} from "@/lib/problem/actualFormat";
import { cachedBankRead, invalidateBankReadCache } from "@/lib/bankReadCache";
import {
  withBankReadFingerprint,
  bankFormatsCurrent,
  currentBankReadFingerprint,
} from "@/lib/bankReadFingerprint";

let pg: Db, world: World, id: string;
let validations = 0;
const client = {
  $queryRaw: async (query: Prisma.Sql) => {
    validations++;
    return (await pg.query(query.text, query.values)).rows;
  },
} as unknown as Pick<Prisma.TransactionClient, "$queryRaw">;
const secondInstance = { $queryRaw: client.$queryRaw };
async function read<T>(run: () => Promise<T>, instance = client) {
  await pg.exec("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    return await withBankReadFingerprint(instance, run);
  } finally {
    await pg.exec("ROLLBACK");
  }
}
beforeAll(async () => {
  pg = await openTextbookDb();
  await pg.exec(
    readFileSync(
      "supabase/migrations/20261018063016_question_group_identity.sql",
      "utf8",
    ),
  );
  world = await seedWorld(pg);
  id = (await insertProblem(pg, world.unitId)).id;
  await pg.query(
    `UPDATE problem SET actual_format='short_answer',actual_format_version=$2,actual_format_digest=$3 WHERE id=$1`,
    [id, ACTUAL_FORMAT_VERSION, "0".repeat(64)],
  );
  const newest = (await insertProblem(pg, world.unitId)).id;
  await pg.query(
    `UPDATE problem SET updated_at=now()+interval '1 year',actual_format='unknown',actual_format_version=$2,actual_format_digest=$3 WHERE id=$1`,
    [newest, ACTUAL_FORMAT_VERSION, "0".repeat(64)],
  );
  await pg.query(
    `UPDATE problem SET actual_format='unknown',actual_format_version=$1,actual_format_digest=$2 WHERE actual_format IS NULL`,
    [ACTUAL_FORMAT_VERSION, "0".repeat(64)],
  );
  const bookId = randomUUID();
  await pg.query(
    `INSERT INTO source_book (id,external_key,kind,publisher,title,grade,curriculum,updated_at) VALUES ($1,'fingerprint-book','school_textbook','fixture','fixture','중1','2022',now())`,
    [bookId],
  );
  await pg.query(
    `INSERT INTO source_material (id,external_key,book_id,kind,kind_raw,title,updated_at) VALUES ($1,'fingerprint-material',$2,'exercise','fixture','fixture',now())`,
    [randomUUID(), bookId],
  );
}, 120000);
beforeEach(() => {
  invalidateBankReadCache();
  validations = 0;
});
afterAll(async () => {
  await pg?.close();
  vi.unstubAllEnvs();
});

it("validates every request/instance, shares public results only after matching, and coalesces nested snapshot checks", async () => {
  const compute = vi.fn(async () => 42);
  expect(await read(() => cachedBankRead("public", compute))).toBe(42);
  expect(
    await read(() =>
      withBankReadFingerprint(client, () => cachedBankRead("public", compute)),
    ),
  ).toBe(42);
  expect(
    await read(() => cachedBankRead("public", compute), secondInstance),
  ).toBe(42);
  expect(validations).toBe(3);
  expect(compute).toHaveBeenCalledOnce();
  expect(currentBankReadFingerprint()).toBeUndefined();
});

it("detects SQL updates on a non-maximum timestamp row without local invalidation", async () => {
  const compute = vi.fn(
    async () =>
      (
        await pg.query<{ review_status: string }>(
          "SELECT review_status FROM problem WHERE id=$1",
          [id],
        )
      ).rows[0].review_status,
  );
  const before = await read(() => cachedBankRead("public", compute));
  const stamp = (
    await pg.query("SELECT updated_at FROM problem WHERE id=$1", [id])
  ).rows;
  await pg.query(
    "UPDATE problem SET review_status=CASE WHEN review_status='approved' THEN 'pending'::review_status ELSE 'approved'::review_status END WHERE id=$1",
    [id],
  );
  expect(
    (await pg.query("SELECT updated_at FROM problem WHERE id=$1", [id])).rows,
  ).toEqual(stamp);
  expect(
    await read(() => cachedBankRead("public", compute), secondInstance),
  ).not.toBe(before);
  expect(compute).toHaveBeenCalledTimes(2);
});

it("covers unit order and book/material edits even though Unit has no updated_at", async () => {
  const compute = vi.fn(async () => "result");
  await read(() => cachedBankRead("public", compute));
  await pg.query("UPDATE unit SET order_index=order_index+1 WHERE id=$1", [
    world.unitId,
  ]);
  await read(() => cachedBankRead("public", compute));
  await pg.exec("UPDATE source_book SET title=title || ' edited'");
  await read(() => cachedBankRead("public", compute));
  await pg.exec("UPDATE source_material SET kind=kind || ' edited'");
  await read(() => cachedBankRead("public", compute));
  expect(compute).toHaveBeenCalledTimes(4);
});

it("does not hide legacy NULL/version facts behind cached results or skip their lazy-fill reader", async () => {
  await pg.query(
    "UPDATE problem SET content=content || ' changed' WHERE id=$1",
    [id],
  );
  const compute = vi.fn(async () => 7);
  await read(async () => {
    expect(bankFormatsCurrent(client)).toBe(false);
    return cachedBankRead("public", compute);
  });
  await read(() => cachedBankRead("public", compute));
  expect(compute).toHaveBeenCalledTimes(2);
  const input = (
    await pg.query<{
      content: string;
      answer: string;
      questionType: string | null;
      problemType: string | null;
      familyKey: string | null;
      questionGroupKey: string | null;
    }>(
      `SELECT content,answer,question_type AS "questionType",problem_type AS "problemType",family_key AS "familyKey",question_group_key AS "questionGroupKey" FROM problem WHERE id=$1`,
      [id],
    )
  ).rows[0];
  await pg.query(
    `UPDATE problem SET actual_format='short_answer',actual_format_version=$2,actual_format_digest=$3 WHERE id=$1`,
    [id, ACTUAL_FORMAT_VERSION, actualFormatDigest(input)],
  );
  await read(async () => {
    expect(bankFormatsCurrent(client)).toBe(true);
    return cachedBankRead("public", compute);
  });
  await read(() => cachedBankRead("public", compute));
  expect(compute).toHaveBeenCalledTimes(3);
});

it("invalidates insertion/deletion, epoch rotation and rejected computations", async () => {
  const compute = vi.fn(async () => 42);
  await read(() => cachedBankRead("public", compute));
  const next = (await insertProblem(pg, world.unitId)).id;
  await pg.query(
    `UPDATE problem SET actual_format='unknown',actual_format_version=$2,actual_format_digest=$3 WHERE id=$1`,
    [next, ACTUAL_FORMAT_VERSION, "0".repeat(64)],
  );
  await read(() => cachedBankRead("public", compute));
  await pg.query("DELETE FROM problem WHERE id=$1", [next]);
  await read(() => cachedBankRead("public", compute));
  // Returning to an earlier identical visible row-version set may reuse its result.
  expect(compute).toHaveBeenCalledTimes(2);
  vi.stubEnv("BANK_COUNTS_EPOCH", "rotated");
  await read(() => cachedBankRead("public", compute));
  expect(compute).toHaveBeenCalledTimes(3);
  const failure = vi
    .fn()
    .mockRejectedValueOnce(new Error("retry"))
    .mockResolvedValue(1);
  await expect(read(() => cachedBankRead("failure", failure))).rejects.toThrow(
    "retry",
  );
  expect(await read(() => cachedBankRead("failure", failure))).toBe(1);
});
