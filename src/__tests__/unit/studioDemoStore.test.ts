// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import { createHash } from "node:crypto";
import {
  readStudioDemo,
  readStudioDemoPdf,
  studioDemoKey,
  studioDemoPdfKey,
  writeStudioDemo,
  writeStudioDemoPdf,
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

  it("시연 시험지 PDF — 지문이 맞을 때만 내준다(원장님 «어디서든 아이디로 접속해 시연»)", async () => {
    const bytes = Buffer.from("%PDF-1.7 시연");
    const hash = createHash("sha256").update(bytes).digest("hex");
    expect(studioDemoPdfKey(hash).length).toBeLessThanOrEqual(64);
    expect(studioDemoPdfKey(hash)).not.toBe(studioDemoKey(hash));
    const table = { findUnique: vi.fn(), upsert: vi.fn() };
    await writeStudioDemoPdf(hash, "시험지.pdf", bytes, "user-1", table);
    const saved = table.upsert.mock.calls[0][0];
    expect(saved.where).toEqual({ key: studioDemoPdfKey(hash) });
    expect(saved.create.value).toEqual({
      name: "시험지.pdf",
      base64: bytes.toString("base64"),
    });
    table.findUnique.mockResolvedValueOnce({ value: saved.create.value });
    const read = await readStudioDemoPdf(hash, table);
    expect(read?.name).toBe("시험지.pdf");
    expect(Buffer.from(read!.bytes).equals(bytes)).toBe(true);
    // 다른 바이트가 들어 있거나 · 없거나 · 표가 없으면 null
    table.findUnique.mockResolvedValueOnce({
      value: { name: "x.pdf", base64: Buffer.from("other").toString("base64") },
    });
    expect(await readStudioDemoPdf(hash, table)).toBeNull();
    table.findUnique.mockResolvedValueOnce(null);
    expect(await readStudioDemoPdf(hash, table)).toBeNull();
    table.findUnique.mockRejectedValueOnce(
      Object.assign(new Error("missing"), { code: "P2021" }),
    );
    expect(await readStudioDemoPdf(hash, table)).toBeNull();
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
