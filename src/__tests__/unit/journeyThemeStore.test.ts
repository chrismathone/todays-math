/**
 * 진도판 테마 저장소 — 학원 전체 한 벌(원장님 2026-09-30). 기본은 지금 판 · 표가 아직 없거나(DB 먼저 배포 전) 값이 망가져도
 * 학생 화면은 기본 판으로 뜬다 — 테마 읽기가 학생 첫 화면을 막으면 안 된다.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  JOURNEY_THEME_KEY,
  readJourneyTheme,
  writeJourneyTheme,
  type AppSettingTable,
} from "@/lib/journeyThemeStore";

type Row = {
  key: string;
  value: unknown;
  updatedAt: Date;
  updatedById: string | null;
};

function table(
  rows = new Map<string, Row>(),
  fail?: unknown,
): AppSettingTable & { rows: Map<string, Row> } {
  return {
    rows,
    async findUnique({ where }) {
      if (fail) throw fail;
      return rows.get(where.key) ?? null;
    },
    async upsert({ where, create, update }) {
      if (fail) throw fail;
      const now = new Date("2026-09-30T02:00:00.000Z");
      const prev = rows.get(where.key);
      const row = prev
        ? { ...prev, ...update, updatedAt: now }
        : {
            ...create,
            updatedAt: now,
            updatedById: create.updatedById ?? null,
          };
      rows.set(where.key, row as Row);
      return row as Row;
    },
  };
}

describe("journey theme store", () => {
  it("defaults to the classic board when nobody has chosen", async () => {
    expect(await readJourneyTheme(table())).toEqual({
      theme: "classic",
      updatedAt: null,
    });
  });

  it("reads back what an admin chose", async () => {
    const t = table();
    await writeJourneyTheme(
      "shapes",
      "5f1f5a7e-0000-4000-8000-000000000001",
      t,
    );
    expect(t.rows.get(JOURNEY_THEME_KEY)?.value).toEqual({ theme: "shapes" });
    expect(await readJourneyTheme(t)).toEqual({
      theme: "shapes",
      updatedAt: "2026-09-30T02:00:00.000Z",
    });
  });

  it("falls back to classic when the table is not there yet (DB first, code later)", async () => {
    const missing = Object.assign(new Error("relation missing"), {
      code: "P2021",
    });
    expect(await readJourneyTheme(table(undefined, missing))).toEqual({
      theme: "classic",
      updatedAt: null,
    });
  });

  it("falls back to classic when the stored value is not a known theme", async () => {
    const rows = new Map<string, Row>([
      [
        JOURNEY_THEME_KEY,
        {
          key: JOURNEY_THEME_KEY,
          value: { theme: "castle" },
          updatedAt: new Date(),
          updatedById: null,
        },
      ],
    ]);
    expect((await readJourneyTheme(table(rows))).theme).toBe("classic");
  });

  it("falls back to classic when the stored value is not even an object", async () => {
    for (const value of ["sky", null, 7, ["sky"], { theme: null }]) {
      const rows = new Map<string, Row>([
        [
          JOURNEY_THEME_KEY,
          {
            key: JOURNEY_THEME_KEY,
            value,
            updatedAt: new Date(),
            updatedById: null,
          },
        ],
      ]);
      expect((await readJourneyTheme(table(rows))).theme).toBe("classic");
    }
  });

  it("overwrites the earlier choice and records the later admin", async () => {
    const t = table();
    await writeJourneyTheme("sky", "5f1f5a7e-0000-4000-8000-000000000001", t);
    await writeJourneyTheme(
      "forest",
      "5f1f5a7e-0000-4000-8000-000000000002",
      t,
    );
    expect(t.rows.size).toBe(1);
    expect(t.rows.get(JOURNEY_THEME_KEY)).toMatchObject({
      value: { theme: "forest" },
      updatedById: "5f1f5a7e-0000-4000-8000-000000000002",
    });
    expect((await readJourneyTheme(t)).theme).toBe("forest");
  });

  it("does not swallow other database failures on read", async () => {
    const down = Object.assign(new Error("connection refused"), {
      code: "P1001",
    });
    await expect(readJourneyTheme(table(undefined, down))).rejects.toThrow(
      "connection refused",
    );
  });
});
