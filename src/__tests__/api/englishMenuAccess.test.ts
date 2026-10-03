// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
import { requireEnglishSession } from "@/lib/english/routeSupport";
import { POST as createExam } from "@/app/api/english/exams/route";
import { POST as createSet } from "@/app/api/english/exams/[id]/sets/route";
import { PUT as updateSet } from "@/app/api/english/sets/[id]/route";

const session = {
  id: "user",
  name: "teacher",
  email: "teacher@example.test",
  isAdmin: false,
};
const request = (method: string, path: string) =>
  new NextRequest(`http://localhost${path}`, {
    method,
    headers: { origin: "http://localhost" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("English handler authorization without proxy", () => {
  it.each([
    ["english-maker", "POST", "/api/english/generate"],
    ["english-school", "POST", "/api/english/exams"],
    ["english-library", "PUT", "/api/english/sets/set"],
  ] as const)("accepts the dedicated %s gate", async (menu, method, path) => {
    mocks.session.mockResolvedValue({ ...session, menus: [menu] });
    expect(
      (await requireEnglishSession(request(method, path), { mutation: true }))
        .response,
    ).toBeNull();
  });
  it.each(
    [undefined, [], ["home"], ["english-school"]].map((menus) => ({
      menus: menus as WorkspaceMenu[] | undefined,
    })),
  )(
    "denies generation with missing or insufficient menus $menus",
    async ({ menus }) => {
      mocks.session.mockResolvedValue({ ...session, menus });
      expect(
        (
          await requireEnglishSession(
            request("POST", "/api/english/generate"),
            { mutation: true },
          )
        ).response?.status,
      ).toBe(403);
    },
  );
  it("blocks direct calls to each dedicated write handler", async () => {
    const context = {
      params: Promise.resolve({ id: "20000000-0000-4000-8000-000000000001" }),
    };
    mocks.session.mockResolvedValue({ ...session, menus: ["english-library"] });
    expect(
      (await createExam(request("POST", "/api/english/exams"))).status,
    ).toBe(403);
    expect(
      (
        await createSet(
          request("POST", "/api/english/exams/exam/sets"),
          context,
        )
      ).status,
    ).toBe(403);
    mocks.session.mockResolvedValue({ ...session, menus: ["english-maker"] });
    expect(
      (await updateSet(request("PUT", "/api/english/sets/set"), context))
        .status,
    ).toBe(403);
  });
  it.each([false, true])(
    "denies direct English writes for a capped owner/superadmin=%s",
    async (isSuperAdmin) => {
      mocks.session.mockResolvedValue({
        ...session,
        isAdmin: true,
        isSuperAdmin,
        branchRole: "owner",
        branchId: "branch-a",
        menus: [],
      });
      const context = {
        params: Promise.resolve({ id: "20000000-0000-4000-8000-000000000001" }),
      };
      expect(
        (await createExam(request("POST", "/api/english/exams"))).status,
      ).toBe(403);
      expect(
        (
          await createSet(
            request("POST", "/api/english/exams/exam/sets"),
            context,
          )
        ).status,
      ).toBe(403);
      expect(
        (await updateSet(request("PUT", "/api/english/sets/set"), context))
          .status,
      ).toBe(403);
    },
  );
  it("keeps missing-session and cross-origin writes blocked", async () => {
    mocks.session.mockResolvedValue(null);
    expect(
      (await requireEnglishSession(request("GET", "/api/english/exams")))
        .response?.status,
    ).toBe(401);
    mocks.session.mockResolvedValue({ ...session, menus: ["english-maker"] });
    expect(
      (
        await requireEnglishSession(
          new Request("http://localhost/api/english/generate", {
            method: "POST",
          }),
          { mutation: true },
        )
      ).response?.status,
    ).toBe(403);
  });
});
