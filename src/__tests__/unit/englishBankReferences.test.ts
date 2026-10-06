// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  officialListeningReferences,
  searchListeningReferences,
} from "@/lib/english/listening/runtime/bank";
import { sameBankSaveReference } from "@/lib/english/bank/service";
describe("listening official references and bank save identity", () => {
  it("returns no references even when callers supply a historical catalog record", () => {
    expect(officialListeningReferences()).toEqual([]);
    expect(
      officialListeningReferences([
        {
          id: "ebs-middle-1-2026-1",
          provider: "EBS",
          sourceUrl: "https://mid.ebs.co.kr/english/engGrade",
        },
      ]),
    ).toEqual([]);
  });
  it("returns a stable empty reference page for filters and retired cursors", () => {
    for (const query of [
      {},
      { year: "2026", round: "1", level: "중1", limit: 1 },
      { cursor: "ebs-middle-1-2026-1", limit: 100 },
    ]) {
      expect(searchListeningReferences(query)).toEqual({
        data: [],
        meta: { nextCursor: null },
      });
    }
  });
  it("same-key metadata replay remains compatible but bank identity cannot change", () => {
    expect(sameBankSaveReference({ path: "api" }, { path: "chatgpt" })).toBe(
      true,
    );
    const passageRef = {
      passageId: "00000000-0000-4000-8000-000000000001",
      textRevision: 1,
      snapshotHash: "a".repeat(64),
    };
    const meta = {
      path: "api" as const,
      mode: "variation" as const,
      passageRef,
      sourcePassage: "source",
    };
    expect(sameBankSaveReference(meta, meta)).toBe(true);
    expect(
      sameBankSaveReference(meta, {
        ...meta,
        passageRef: { ...passageRef, textRevision: 2 },
      }),
    ).toBe(false);
    expect(
      sameBankSaveReference(meta, { ...meta, sourcePassage: "changed" }),
    ).toBe(false);
    expect(sameBankSaveReference(meta, undefined)).toBe(false);
  });
});
