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
  return { getArithmeticV2Definition: fixture.getFixtureDefinition };
});
import { POST as legacyPost } from "@/app/api/arithmetic/regenerate/route";
import { POST as gradePost } from "@/app/api/arithmetic/v2/regenerate/route";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";
import { fixtureRequest } from "../helpers/arithmeticV2Fixture";

const account: AccountAccess = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "Teacher",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["bank"],
};
const versions = [
  {
    name: "legacy",
    post: legacyPost,
    path: "/api/arithmetic/regenerate",
    build: () =>
      buildArithmeticSheet({
        engineVersion: "arithmetic-engine-v1",
        catalogVersion: "arithmetic-catalog-v1",
        seed: "saved",
        rounds: [
          {
            skills: [
              {
                skillId: "times-table",
                count: 3,
                constraints: { dans: [2], multiplier: { min: 1, max: 9 } },
              },
            ],
          },
        ],
      }),
  },
  {
    name: "grade",
    post: gradePost,
    path: "/api/arithmetic/v2/regenerate",
    build: () => buildArithmeticV2Sheet(fixtureRequest()),
  },
];
const unsafeHeaders: Record<string, string>[] = [
  {},
  { origin: "https://elsewhere.test" },
  { origin: "http://localhost", "sec-fetch-site": "cross-site" },
];
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

describe.each(versions)("$name selective route", ({ post, path, build }) => {
  const body = () => ({
    sheet: build(),
    target: { round: 1, orders: [2] },
    seed: "replacement",
  });
  const request = (
    input: unknown = body(),
    headers: Record<string, string> = { origin: "http://localhost" },
  ) =>
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers,
      body: typeof input === "string" ? input : JSON.stringify(input),
    });
  it("regenerates through approved bank access while writer gate is closed, with no storage I/O", async () => {
    const input = body();
    const response = await post(request(input));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const { data } = await response.json();
    expect(data.changedOrders).toEqual([2]);
    expect(data.unchangedOrders).toEqual([]);
    expect(data.sheet.rounds[0].items[0]).toEqual(
      input.sheet.rounds[0].items[0],
    );
    expect(data.sheet.rounds[0].items[2]).toEqual(
      input.sheet.rounds[0].items[2],
    );
    expect(data.sheet.seed).toBe(input.sheet.seed);
  });
  it.each([
    [null, 401],
    [{ user: { ...account, approvalStatus: "pending" } }, 403],
    [{ user: { ...account, menus: ["library"] } }, 403],
    [{ user: { ...account, menus: [], isAdmin: true } }, 403],
  ])(
    "enforces existing account/menu authorization",
    async (session, status) => {
      mocks.auth.mockResolvedValue(session);
      expect((await post(request())).status).toBe(status);
    },
  );
  it.each(unsafeHeaders)(
    "enforces same-origin mutation protection",
    async (headers) => {
      expect((await post(request(body(), headers))).status).toBe(403);
    },
  );
  it.each([
    "{",
    '{"seed":"a","seed":"b"}',
    JSON.stringify({ padding: "x".repeat(256 * 1024) }),
  ])("rejects malformed, duplicate-key or oversized input", async (input) => {
    expect((await post(request(input))).status).toBe(400);
  });
  it("rejects wrong rounds, saved orders and corrupted snapshots", async () => {
    for (const target of [
      { round: 2, orders: [1] },
      { round: 1, orders: [99] },
      { round: 1, orders: [1, 1] },
      { round: 1, orders: [] },
    ])
      expect((await post(request({ ...body(), target }))).status).toBe(400);
    const input = body();
    input.sheet.seed = "";
    expect((await post(request(input))).status).toBe(400);
  });
  it("proxy policy opens only POST for bank users", () => {
    expect(accountRouteAllowed(account, "POST", path)).toBe(true);
    expect(accountRouteAllowed(account, "GET", path)).toBe(false);
    expect(accountRouteAllowed(account, "PATCH", path)).toBe(false);
    expect(
      accountRouteAllowed({ ...account, menus: ["library"] }, "POST", path),
    ).toBe(false);
  });
});
