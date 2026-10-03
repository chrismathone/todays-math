// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  officialListeningReferences,
  searchListeningReferences,
} from "@/lib/english/listening/runtime/bank";
import { sameBankSaveReference } from "@/lib/english/bank/service";
describe("listening official references and bank save identity", () => {
  it("returns official page links only, discarding file URLs and unsafe parameters", () => {
    const record = {
      id: "sample",
      school: "middle",
      grade: 1,
      year: 2026,
      round: 1,
      provider: "EBS",
      sourceUrl:
        "https://mid.ebs.co.kr/english/engGrade?clsfnSystId=22000010&download=https://evil.invalid",
      assets: { audio: "private.mp3" },
    };
    const projected = officialListeningReferences([record]);
    expect(projected).toHaveLength(1);
    expect(JSON.stringify(projected)).not.toMatch(
      /assets|private\.mp3|download|evil/,
    );
    expect(
      officialListeningReferences([
        { ...record, sourceUrl: "https://mid.ebs.co.kr/file.mp3" },
        {
          ...record,
          sourceUrl: "https://mid.ebs.co.kr.evil.invalid/english/engGrade",
        },
      ]),
    ).toEqual([]);
  });
  it("paginates year/round/grade filtered catalog without duplicates", () => {
    const page = searchListeningReferences({
      year: "2026",
      round: "1",
      level: "중1",
      limit: 1,
    });
    expect(page.data.length).toBeGreaterThan(0);
    expect(
      page.data.every(
        (r) =>
          r.year === 2026 &&
          r.round === 1 &&
          r.grade === 1 &&
          r.school === "middle",
      ),
    ).toBe(true);
    const all = searchListeningReferences({ limit: 100 });
    const next = searchListeningReferences({
      limit: 100,
      cursor: all.meta.nextCursor,
    });
    expect(new Set([...all.data, ...next.data].map((r) => r.id)).size).toBe(
      all.data.length + next.data.length,
    );
    expect(JSON.stringify([...all.data, ...next.data])).not.toMatch(
      /\.mp3|\.pdf|\.zip/,
    );
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
