// @vitest-environment node
/**
 * Plan §2 decision 10 (2026-10-20): the student's guide choice is an optional
 * `guide` in the student record. This is the reader: old records still parse,
 * a chosen guide parses and survives every other write, malformed ones fail.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GUIDE_IDS } from "@/contracts/mathSrsGuide.contract";
import {
  emptySrsState,
  parseSrsState,
  SrsUnavailable,
  startSrsMission,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  changeSrsState,
  type SrsStateRow,
  type SrsStateTable,
} from "@/lib/math-srs/serverStore";

const studentId = randomUUID();
const now = new Date("2026-10-20T09:00:00.000Z");
const guide = { id: "marten", chosenAt: now.toISOString() } as const;

function tableFixture(initial: StoredSrsState) {
  let row: SrsStateRow | null = { studentId, revision: 1, payload: initial };
  const table: SrsStateTable = {
    async findUnique() {
      return structuredClone(row);
    },
    async findMany() {
      return row ? [structuredClone(row)] : [];
    },
    async create({ data }) {
      if (row) throw { code: "P2002" };
      row = structuredClone(data);
      return row;
    },
    async updateMany({ where, data }) {
      if (!row || row.revision !== where.revision) return { count: 0 };
      row = {
        ...row,
        payload: structuredClone(data.payload),
        revision: row.revision + 1,
      };
      return { count: 1 };
    },
  };
  return table;
}

describe("student guide choice — reader", () => {
  it("names five guides", () => {
    expect(GUIDE_IDS).toHaveLength(5);
  });

  it("keeps a record without a guide unchanged (not chosen yet)", () => {
    expect(parseSrsState(emptySrsState())).not.toHaveProperty("guide");
  });

  it("reads every chosen guide", () => {
    for (const id of GUIDE_IDS) {
      const state = parseSrsState({
        ...emptySrsState(),
        guide: { id, chosenAt: now.toISOString() },
      });
      expect(state.guide).toEqual({ id, chosenAt: now.toISOString() });
    }
  });

  it("rejects an unknown guide, an extra key or a bad time", () => {
    for (const bad of [
      { id: "robot", chosenAt: now.toISOString() },
      { ...guide, mood: "happy" },
      { id: "marten", chosenAt: "어제" },
      { id: "marten" },
    ])
      expect(() => parseSrsState({ ...emptySrsState(), guide: bad })).toThrow(
        SrsUnavailable,
      );
  });

  it("survives another write to the record", async () => {
    const table = tableFixture({ ...emptySrsState(), guide });
    const result = await changeSrsState(
      studentId,
      (s) => startSrsMission(s, studentId, now, 3, randomUUID),
      table,
    );
    expect(result.state.missions).toHaveLength(1);
    expect(result.state.guide).toEqual(guide);
  });
});
