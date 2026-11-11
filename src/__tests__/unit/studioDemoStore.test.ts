// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import {
  readStudioDemo,
  studioDemoKey,
  writeStudioDemo,
} from "@/lib/studio-demo/store";

const sha = "5".repeat(64);
const entry = {
  action: "solution" as const,
  content: "c".repeat(64),
  ms: 3000,
  body: { result: { solution: "풀이" } },
};
const row = (value: unknown) => ({
  key: studioDemoKey(sha),
  value,
  updatedAt: new Date(0),
  updatedById: null,
});

describe("시연 녹화본 저장소(app_setting)", () => {
  it("열쇠는 app_setting 의 64자 안에 들고 지문마다 다르다", () => {
    expect(studioDemoKey(sha).length).toBeLessThanOrEqual(64);
    expect(studioDemoKey(sha)).not.toBe(studioDemoKey("6".repeat(64)));
  });

  it("없거나 · 표가 아직 없거나 · 모양이 틀린 값은 빈 녹화본이다", async () => {
    const table = { findUnique: vi.fn(), upsert: vi.fn() };
    table.findUnique.mockResolvedValueOnce(null);
    expect(await readStudioDemo(sha, table)).toEqual([]);
    table.findUnique.mockRejectedValueOnce(
      Object.assign(new Error("missing"), { code: "P2021" }),
    );
    expect(await readStudioDemo(sha, table)).toEqual([]);
    table.findUnique.mockResolvedValueOnce(row({ entries: "broken" }));
    expect(await readStudioDemo(sha, table)).toEqual([]);
    table.findUnique.mockResolvedValueOnce(row({ entries: [entry] }));
    expect(await readStudioDemo(sha, table)).toEqual([entry]);
  });

  it("저장은 통째로 덮어쓰고 바꾼 사람을 남긴다", async () => {
    const table = {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue(row({ entries: [entry] })),
    };
    await writeStudioDemo(sha, [entry], "user-1", table);
    expect(table.upsert).toHaveBeenCalledWith({
      where: { key: studioDemoKey(sha) },
      create: {
        key: studioDemoKey(sha),
        value: { entries: [entry] },
        updatedById: "user-1",
      },
      update: { value: { entries: [entry] }, updatedById: "user-1" },
    });
  });
});
