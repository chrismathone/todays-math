// @vitest-environment node
/** Real migration constraints in an in-memory PostgreSQL engine. No DSN or network.
 * PGlite has one connection: API interleavings are covered separately; multi-session
 * blocking/deadlocks and the deployed database's migration state are not measured here. */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let db: PGlite;
const studentA = randomUUID();
const studentB = randomUUID();
const migration = (name: string) =>
  readFileSync(`prisma/migrations/${name}/migration.sql`, "utf8");

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE "user" (id uuid PRIMARY KEY);
    CREATE TABLE class (id uuid PRIMARY KEY);
    CREATE TABLE student (id uuid PRIMARY KEY);
  `);
  await db.exec(migration("20260821150000_eywa_link_keys"));
  await db.exec(migration("20260915180000_student_account"));
  await db.exec(migration("20261004063000_student_bulk_account_defaults"));
});
beforeEach(async () => {
  await db.exec("TRUNCATE student CASCADE");
  await db.query("INSERT INTO student (id) VALUES ($1), ($2)", [
    studentA,
    studentB,
  ]);
});
afterAll(async () => {
  await db.close();
});

function insert(studentId: string, loginId: string, skipDuplicates = false) {
  return db.query(
    `INSERT INTO student_account (id, student_id, login_id, password_hash, updated_at)
     VALUES ($1, $2, $3, 'synthetic-hash', CURRENT_TIMESTAMP)
     ${skipDuplicates ? "ON CONFLICT DO NOTHING" : ""} RETURNING id`,
    [randomUUID(), studentId, loginId],
  );
}

describe("student identity and account migration constraints", () => {
  it("rejects a second local student with the same source UUID", async () => {
    const sourceId = randomUUID();
    await db.query("UPDATE student SET eywa_student_id = $1 WHERE id = $2", [
      sourceId,
      studentA,
    ]);
    await expect(
      db.query("UPDATE student SET eywa_student_id = $1 WHERE id = $2", [
        sourceId,
        studentB,
      ]),
    ).rejects.toMatchObject({
      code: "23505",
      constraint: "student_eywa_student_id_key",
    });
  });

  it("rejects duplicate accounts for one student even with different login IDs", async () => {
    await insert(studentA, "original-id");
    await expect(insert(studentA, "different-id")).rejects.toMatchObject({
      code: "23505",
      constraint: "student_account_student_id_key",
    });
    expect(
      (await db.query("SELECT id FROM student_account")).rows,
    ).toHaveLength(1);
  });

  it("rejects a shared login ID for distinct student identities without merging them", async () => {
    await insert(studentA, "shared-id");
    await expect(insert(studentB, "shared-id")).rejects.toMatchObject({
      code: "23505",
      constraint: "student_account_login_id_key",
    });
    await insert(studentB, "other-id");
    expect(
      (await db.query("SELECT student_id FROM student_account")).rows,
    ).toHaveLength(2);
  });

  it("ON CONFLICT DO NOTHING preserves every field of an existing disabled account", async () => {
    await insert(studentA, "original-id");
    await db.exec(`UPDATE student_account SET disabled_at = CURRENT_TIMESTAMP,
      must_change_password = false, failed_count = 5,
      password_changed_at = CURRENT_TIMESTAMP, last_login_at = CURRENT_TIMESTAMP,
      locked_until = CURRENT_TIMESTAMP + INTERVAL '10 minutes'`);
    const before = (await db.query("SELECT * FROM student_account")).rows;
    expect((await insert(studentA, "different-id", true)).rows).toEqual([]);
    expect((await insert(studentB, "original-id", true)).rows).toEqual([]);
    expect((await db.query("SELECT * FROM student_account")).rows).toEqual(
      before,
    );
    expect(
      (
        await db.query("SELECT * FROM student_account WHERE student_id = $1", [
          studentB,
        ])
      ).rows,
    ).toEqual([]);
    // A skipped collision does not abort the batch's transaction.
    await db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO student_account (id, student_id, login_id, password_hash, updated_at)
        VALUES ($1, $2, 'original-id', 'synthetic-hash', CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING`,
        [randomUUID(), studentB],
      );
      await tx.query("UPDATE student SET phone_last4 = '0000' WHERE id = $1", [
        studentB,
      ]);
    });
    expect(
      (
        await db.query("SELECT phone_last4 FROM student WHERE id = $1", [
          studentB,
        ])
      ).rows,
    ).toEqual([{ phone_last4: "0000" }]);
  });

  it("rolls back issuance when a later operation in its transaction fails", async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO student_account (id, student_id, login_id, password_hash, updated_at)
        VALUES ($1, $2, 'student-id', 'synthetic-hash', CURRENT_TIMESTAMP)`,
          [randomUUID(), studentA],
        );
        throw new Error("synthetic audit failure");
      }),
    ).rejects.toThrow("synthetic audit failure");
    expect((await db.query("SELECT id FROM student_account")).rows).toEqual([]);
  });
});
