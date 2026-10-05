// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { studentGateFor } from "@/lib/studentRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), sourceTranscripts: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/english/listening/media/driveConfig", () => ({
  readListeningDriveConfig: () => null,
}));
vi.mock("@/lib/english/listening/media/storageApi", () => ({
  readListeningStorageConfig: () => null,
  createListeningStorageApi: vi.fn(),
}));
vi.mock("@/lib/english/listening/runtime/service", () => ({
  createListeningRuntime: () => ({
    sourceTranscripts: mocks.sourceTranscripts,
  }),
}));
vi.mock("@/lib/english/listening/media/prismaStore", () => ({
  PrismaListeningMediaStore: class {},
}));
vi.mock("@/lib/english/listening/media/service", () => ({
  createListeningMediaService: () => ({}),
}));
import { handleListeningHttp } from "@/lib/english/listening/runtime/http";
import { ListeningRuntimeError } from "@/lib/english/listening/runtime/database";

const id = "00000000-0000-4000-8000-000000000001";
const path = ["sets", id, "source-transcripts"];
const url = `http://localhost:3000/api/english/listening/${path.join("/")}`;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id } });
  mocks.sourceTranscripts.mockResolvedValue({ setId: id, items: [] });
});
describe("source transcripts HTTP privacy", () => {
  it("returns authenticated teacher data with the existing private no-store envelope", async () => {
    const result = await handleListeningHttp(new Request(url), path, "teacher");
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ data: { setId: id, items: [] } });
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.sourceTranscripts).toHaveBeenCalledWith(
      { kind: "teacher", userId: id },
      id,
    );
  });
  it("rejects unauthenticated and student sessions on the teacher endpoint", async () => {
    for (const session of [
      null,
      { student: { accountId: id, studentId: id, mustChangePassword: false } },
    ]) {
      mocks.auth.mockResolvedValue(session);
      expect(
        (await handleListeningHttp(new Request(url), path, "teacher")).status,
      ).toBe(401);
    }
    expect(mocks.sourceTranscripts).not.toHaveBeenCalled();
  });
  it("does not add a student route or any write methods", async () => {
    mocks.auth.mockResolvedValue({
      student: { accountId: id, studentId: id, mustChangePassword: false },
    });
    expect(
      (await handleListeningHttp(new Request(url), path, "student")).status,
    ).toBeGreaterThanOrEqual(400);
    mocks.auth.mockResolvedValue({ user: { id } });
    for (const method of ["POST", "PATCH", "DELETE", "HEAD"]) {
      expect(
        (
          await handleListeningHttp(
            new Request(url, {
              method,
              headers: { origin: "http://localhost:3000" },
            }),
            path,
            "teacher",
          )
        ).status,
      ).toBe(404);
    }
    expect(mocks.sourceTranscripts).not.toHaveBeenCalled();
  });
  it("keeps owner/branch denial opaque and server failure private", async () => {
    mocks.sourceTranscripts.mockRejectedValue(
      new ListeningRuntimeError(
        404,
        "NOT_FOUND",
        "듣기 자료를 찾을 수 없습니다.",
      ),
    );
    expect(
      (await handleListeningHttp(new Request(url), path, "teacher")).status,
    ).toBe(404);
    mocks.sourceTranscripts.mockRejectedValue(
      Object.assign(new Error("private database path/provider secret"), {
        code: "P1001",
      }),
    );
    const response = await handleListeningHttp(
      new Request(url),
      path,
      "teacher",
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(
      /private database|provider secret/,
    );
  });
  it("opens the exact teacher GET route only to approved bank accounts at the proxy", () => {
    const account: AccountAccess = {
      id,
      name: "교사",
      email: "teacher@example.test",
      role: "director",
      approvalStatus: "approved",
      isAdmin: false,
      menus: ["english-bank"],
    };
    const route = new URL(url).pathname;
    expect(accountRouteAllowed(account, "GET", route)).toBe(true);
    for (const changed of [
      { menus: [] },
      { menus: ["english-listening"] as AccountAccess["menus"] },
      { approvalStatus: "pending" as const },
    ])
      expect(
        accountRouteAllowed({ ...account, ...changed }, "GET", route),
      ).toBe(false);
    for (const method of ["POST", "PATCH", "DELETE", "HEAD"])
      expect(accountRouteAllowed(account, method, route)).toBe(false);
    expect(accountRouteAllowed(account, "GET", route + "/raw")).toBe(false);
    expect(studentGateFor(false, "GET", route).kind).toBe("forbidden");
  });
});
