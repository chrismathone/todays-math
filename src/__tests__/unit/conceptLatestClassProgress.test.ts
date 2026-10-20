// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { latestClassProgressSql } from "@/lib/concept/latestClassProgress";

describe("concept board batch latest progress (actual PostgreSQL)", () => {
  const db = new PGlite();
  const classes = [randomUUID(), randomUUID(), randomUUID()];
  const student = randomUUID();
  const units = Array.from({ length: 6 }, () => randomUUID());
  beforeAll(async () => {
    await db.exec(`CREATE TABLE progress (
      class_id uuid NOT NULL, student_id uuid, unit_id uuid NOT NULL,
      recorded_at date NOT NULL, created_at timestamp NOT NULL, retired_at timestamp
    )`);
    for (const [classId, studentId, unitId, date, createdAt, retiredAt] of [
      [classes[0], null, units[0], "2026-10-18", "2026-10-20T01:00:00", null],
      [classes[0], null, units[1], "2026-10-19", "2026-10-19T01:00:00", null],
      [classes[0], null, units[2], "2026-10-19", "2026-10-19T02:00:00", null],
      [
        classes[0],
        student,
        units[3],
        "2026-10-20",
        "2026-10-20T01:00:00",
        null,
      ],
      [
        classes[0],
        null,
        units[4],
        "2026-10-20",
        "2026-10-20T01:00:00",
        "2026-10-20T02:00:00",
      ],
      [classes[1], null, units[5], "2026-10-17", "2026-10-17T01:00:00", null],
    ])
      await db.query(
        "INSERT INTO progress VALUES ($1::uuid,$2::uuid,$3::uuid,$4::date,$5::timestamp,$6::timestamp)",
        [classId, studentId, unitId, date, createdAt, retiredAt],
      );
  });
  afterAll(() => db.close());

  it("equals per-class queries including same-day order, no progress, retired and individual records", async () => {
    const order = [classes[2], classes[1], classes[0]];
    const before = (
      await Promise.all(
        order.map(
          async (classId) =>
            (
              await db.query(
                `SELECT class_id::text AS "classId", unit_id::text AS "unitId",
        to_char(recorded_at,'YYYY-MM-DD') AS "recordedAt"
       FROM progress WHERE class_id=$1::uuid AND student_id IS NULL AND retired_at IS NULL
       ORDER BY recorded_at DESC, created_at DESC LIMIT 1`,
                [classId],
              )
            ).rows,
        ),
      )
    ).flat();
    const sql = latestClassProgressSql(order);
    const after = (await db.query(sql.text, sql.values)).rows;
    expect(after).toEqual(before);
    expect(after).toEqual([
      { classId: classes[1], unitId: units[5], recordedAt: "2026-10-17" },
      { classId: classes[0], unitId: units[2], recordedAt: "2026-10-19" },
    ]);
  });

  it("returns no other classes and accepts an empty scope", async () => {
    for (const scope of [[], [classes[2]]]) {
      const sql = latestClassProgressSql(scope);
      expect((await db.query(sql.text, sql.values)).rows).toEqual([]);
    }
  });
});
