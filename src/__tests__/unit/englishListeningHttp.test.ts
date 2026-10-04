// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  begin: vi.fn(),
  serve: vi.fn(),
  teacherList: vi.fn(),
  studentCommand: vi.fn(),
  setDetail: vi.fn(),
  composeSet: vi.fn(),
  composeSource: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/english/listening/runtime/service", () => ({
  createListeningRuntime: () => ({
    teacherList: mocks.teacherList,
    studentCommand: mocks.studentCommand,
    setDetail: mocks.setDetail,
    composeSet: mocks.composeSet,
    composeSource: mocks.composeSource,
  }),
}));
vi.mock("@/lib/english/listening/media/prismaStore", () => ({
  PrismaListeningMediaStore: class {},
}));
vi.mock("@/lib/english/listening/media/service", () => ({
  createListeningMediaService: () => ({
    beginUpload: mocks.begin,
    serve: mocks.serve,
  }),
}));
import {
  handleListeningHttp,
  listeningJson,
} from "@/lib/english/listening/runtime/http";
import { ListeningMediaError } from "@/lib/english/listening/media/errors";
import { ListeningRuntimeError } from "@/lib/english/listening/runtime/database";
const id = "00000000-0000-4000-8000-000000000001";
function request(
  path: string,
  method = "GET",
  body?: unknown,
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000/api/english/listening/" + path, {
    method,
    headers: { origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
describe("listening HTTP authenticated boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    mocks.auth.mockResolvedValue({ user: { id } });
  });
  it("rejects cross-origin writes before authentication or parsing", async () => {
    const response = await handleListeningHttp(
      request("sets", "POST", {}, "https://elsewhere.test"),
      ["sets"],
      "teacher",
    );
    expect(response.status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("rejects missing and wrong-kind Auth.js sessions", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(
      (await handleListeningHttp(request("sets"), ["sets"], "teacher")).status,
    ).toBe(401);
    mocks.auth.mockResolvedValue({
      student: { studentId: id, accountId: id, mustChangePassword: false },
    });
    expect(
      (await handleListeningHttp(request("sets"), ["sets"], "teacher")).status,
    ).toBe(401);
    mocks.auth.mockResolvedValue({ user: { id } });
    expect((await handleListeningHttp(request(""), [], "student")).status).toBe(
      401,
    );
  });
  it("catches asynchronous media authorization rejection as opaque JSON404", async () => {
    mocks.begin.mockRejectedValue(new ListeningMediaError("not_found"));
    const response = await handleListeningHttp(
      request(`sets/${id}/media`, "POST", {
        totalBytes: 10,
        mimeType: "audio/wav",
        expectedSha256: "a".repeat(64),
      }),
      ["sets", id, "media"],
      "teacher",
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
    mocks.serve.mockRejectedValue(new ListeningMediaError("not_found"));
    expect(
      (
        await handleListeningHttp(
          request(`sets/${id}/media/${id}`),
          ["sets", id, "media", id],
          "teacher",
        )
      ).status,
    ).toBe(404);
  });
  it("uses project envelopes, no-store and409 for revision conflict", async () => {
    mocks.teacherList.mockResolvedValue([]);
    const response = await handleListeningHttp(
      request("sets"),
      ["sets"],
      "teacher",
    );
    expect(await response.json()).toEqual({ data: [] });
    expect(response.headers.get("cache-control")).toContain("no-store");
    mocks.setDetail.mockRejectedValue(
      new ListeningRuntimeError(409, "CONFLICT", "stale"),
    );
    expect(
      (
        await handleListeningHttp(
          request(`sets/${id}`),
          ["sets", id],
          "teacher",
        )
      ).status,
    ).toBe(409);
  });
  it("returns503 on database failure without an ephemeral fallback", async () => {
    mocks.teacherList.mockRejectedValue(
      Object.assign(new Error("private connection string"), { code: "P1001" }),
    );
    const response = await handleListeningHttp(
      request("sets"),
      ["sets"],
      "teacher",
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private connection");
  });
  it("bounds streamed JSON input rather than trusting content-length", async () => {
    const body = "x".repeat(4 * 1024 * 1024 + 1);
    const req = new Request("http://localhost/api", { method: "POST", body });
    await expect(listeningJson(req)).rejects.toThrow("너무");
  });
  it("routes exact source snapshots and authenticated assembly with private envelopes", async () => {
    mocks.composeSource.mockResolvedValue({
      detail: { id },
      documentHash: "a".repeat(64),
    });
    const source = await handleListeningHttp(
      request(`sets/${id}/compose-source`),
      ["sets", id, "compose-source"],
      "teacher",
    );
    expect(source.status).toBe(200);
    expect(await source.json()).toEqual({
      data: { detail: { id }, documentHash: "a".repeat(64) },
    });
    expect(source.headers.get("cache-control")).toContain("no-store");
    const input = { title: "시험지", selections: [] };
    mocks.composeSet.mockResolvedValue({ id });
    const composed = await handleListeningHttp(
      request("compose", "POST", input),
      ["compose"],
      "teacher",
    );
    expect(composed.status).toBe(201);
    expect(mocks.composeSet).toHaveBeenCalledWith(
      { kind: "teacher", userId: id },
      input,
    );
    expect(await composed.json()).toEqual({ data: { id } });
  });
  it("rejects cross-origin assembly before accessing sources and returns opaque source denials", async () => {
    const external = await handleListeningHttp(
      request("compose", "POST", {}, "https://elsewhere.test"),
      ["compose"],
      "teacher",
    );
    expect(external.status).toBe(403);
    expect(mocks.composeSet).not.toHaveBeenCalled();
    mocks.composeSource.mockRejectedValue(
      new ListeningRuntimeError(
        404,
        "NOT_FOUND",
        "듣기 자료를 찾을 수 없습니다.",
      ),
    );
    const denied = await handleListeningHttp(
      request(`sets/${id}/compose-source`),
      ["sets", id, "compose-source"],
      "teacher",
    );
    expect(denied.status).toBe(404);
    expect(await denied.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
