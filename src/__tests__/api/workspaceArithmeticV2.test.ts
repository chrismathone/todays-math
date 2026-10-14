// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  database: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get: (_target, key) => {
        mocks.database(key);
        throw new Error("Unexpected database access");
      },
    },
  ),
}));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: mocks.log }));
vi.mock("@/lib/arithmetic-v2/registry", async () => {
  const fixture = await import("@/__tests__/helpers/arithmeticV2Fixture");
  return {
    getArithmeticV2Definition: fixture.getFixtureDefinition,
    arithmeticV2Definitions: () => fixture.fixtureDefinitions,
  };
});
import { GET } from "@/app/api/arithmetic/v2/catalog/route";
import { POST } from "@/app/api/arithmetic/v2/generate/route";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2";
import { fixtureRequest } from "../helpers/arithmeticV2Fixture";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";

const account = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Teacher",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["bank"],
};
const catalog = () => new Request("http://localhost/api/arithmetic/v2/catalog");
const unsafeOriginHeaders: Record<string, string>[] = [
  {},
  { origin: "https://elsewhere.test" },
  { origin: "http://localhost", "sec-fetch-site": "cross-site" },
];
const post = (
  body: unknown = fixtureRequest(),
  headers: Record<string, string> = { origin: "http://localhost" },
) =>
  new Request("http://localhost/api/arithmetic/v2/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubEnv("ARITHMETIC_SHEET_WRITE", undefined);
  mocks.auth.mockResolvedValue({ user: account });
  mocks.log.mockResolvedValue(null);
});
afterEach(async () => {
  await settleErrorLogWrites();
  expect(mocks.database).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});

describe("v2 catalog and generation routes", () => {
  it("returns the frozen catalog, limits, no-store and existing writer flag", async () => {
    const response = await GET(catalog());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).data).toMatchObject({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      limits: { itemsPerRound: 100, itemsTotal: 100, rounds: 20 },
      writerEnabled: false,
      types: [
        expect.objectContaining({ id: "test-add", domainSize: 7 }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ],
    });
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", "on");
    expect((await (await GET(catalog())).json()).data.writerEnabled).toBe(true);
  });
  it("previews deterministic snapshots while writes are disabled without storage access", async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      data: buildArithmeticV2Sheet(fixtureRequest()),
    });
  });
  it.each([
    [null, 401],
    [{ user: { ...account, approvalStatus: "pending" } }, 403],
    [{ user: { ...account, menus: ["library"] } }, 403],
    [{ user: { ...account, menus: [], isAdmin: true } }, 403],
  ])("requires approved bank access", async (session, status) => {
    mocks.auth.mockResolvedValue(session);
    expect((await GET(catalog())).status).toBe(status);
    expect((await POST(post())).status).toBe(status);
  });
  it.each(unsafeOriginHeaders)(
    "rejects unsafe origin headers",
    async (headers) => {
      expect((await POST(post(fixtureRequest(), headers))).status).toBe(403);
    },
  );
  it("returns exact capacity and total limit detail without partial output", async () => {
    const response = await POST(post(fixtureRequest(8)));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "capacity",
        violations: [
          {
            round: 1,
            allocation: 1,
            typeId: "test-add",
            requested: 8,
            available: 7,
            reason: "domain",
          },
        ],
      },
    });
    const request = fixtureRequest(51, "test-large");
    request.rounds.push(request.rounds[0]);
    const limit = await POST(post(request));
    expect(limit.status).toBe(400);
    expect(await limit.json()).toMatchObject({
      error: { code: "limit", limit: { scope: "total", count: 102, max: 100 } },
    });
  });
  it.each([
    "{",
    '{"seed":"a","seed":"b"}',
    JSON.stringify({ padding: "x".repeat(64 * 1024) }),
  ])("rejects malformed or oversized bodies", async (body) => {
    expect(
      (
        await POST(
          new Request("http://localhost/api/arithmetic/v2/generate", {
            method: "POST",
            headers: { origin: "http://localhost" },
            body,
          }),
        )
      ).status,
    ).toBe(400);
  });
  it.each([
    null,
    {},
    { allocations: null },
    { allocations: [{ count: "bad" }] },
    { allocations: [null] },
  ])(
    "rejects mixed oversized and malformed rounds with 400",
    async (malformed) => {
      const base = fixtureRequest(100, "test-large");
      const response = await POST(
        post({
          ...base,
          rounds: [
            {
              allocations: [
                ...base.rounds[0].allocations,
                ...base.rounds[0].allocations,
              ],
            },
            malformed,
          ],
        }),
      );
      expect(response.status).toBe(400);
      expect(await response.json()).not.toHaveProperty("data");
      expect(mocks.log).not.toHaveBeenCalled();
    },
  );
  it("adds only precise v2 proxy routes with the bank menu and expected method", () => {
    const viewer = {
      ...account,
      role: "director" as const,
      approvalStatus: "approved" as const,
      menus: ["bank" as const],
    };
    expect(
      accountRouteAllowed(viewer, "GET", "/api/arithmetic/v2/catalog"),
    ).toBe(true);
    expect(
      accountRouteAllowed(viewer, "POST", "/api/arithmetic/v2/generate"),
    ).toBe(true);
    expect(
      accountRouteAllowed(viewer, "GET", "/api/arithmetic/v2/generate"),
    ).toBe(false);
    expect(
      accountRouteAllowed(
        { ...viewer, menus: [] },
        "GET",
        "/api/arithmetic/v2/catalog",
      ),
    ).toBe(false);
  });
});
