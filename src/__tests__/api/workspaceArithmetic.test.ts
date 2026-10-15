// @vitest-environment node
// Only authentication and storage boundaries are mocked; the real engine handles requests.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  database: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  // Any accidental storage access in catalog/generation fails this suite.
  db: new Proxy(
    {},
    {
      get: (_target, key) => {
        mocks.database(key);
        throw new Error(`Unexpected DB access: ${String(key)}`);
      },
    },
  ),
}));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: mocks.log }));

import { GET } from "@/app/api/arithmetic/catalog/route";
import { POST } from "@/app/api/arithmetic/generate/route";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_SKILL_IDS,
  buildArithmeticSheet,
  defaultArithmeticConstraints,
  reopenArithmeticSheet,
  type ArithmeticGenerateRequest,
} from "@/lib/arithmetic";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";

const account: AccountAccess = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "선생님",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: ["bank"],
};
const input = (): ArithmeticGenerateRequest => ({
  engineVersion: ARITHMETIC_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_CATALOG_VERSION,
  seed: "server-preview",
  rounds: [
    {
      skills: [
        {
          skillId: "times-table",
          count: 3,
          constraints: defaultArithmeticConstraints("times-table"),
        },
      ],
    },
  ],
});
const request = (
  body: unknown = input(),
  headers: Record<string, string> = {},
) =>
  new Request("http://localhost/api/arithmetic/generate", {
    method: "POST",
    headers: { origin: "http://localhost", ...headers },
    body: JSON.stringify(body),
  });
const catalog = () => new Request("http://localhost/api/arithmetic/catalog");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubEnv("ARITHMETIC_SHEET_WRITE", undefined);
  mocks.auth.mockResolvedValue({ user: { ...account } });
  mocks.log.mockResolvedValue(null);
});
afterEach(async () => {
  await settleErrorLogWrites();
  expect(mocks.database).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});

describe("arithmetic catalog and preview API", () => {
  it("serves catalog versions, limits and disabled writer status without touching storage", async () => {
    const response = await GET(catalog());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    expect(body.data).toMatchObject({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      limits: { itemsPerRound: 200, itemsTotal: 2000, rounds: 10 },
      writerEnabled: false,
    });
    expect(
      body.data.skills.map((skill: { skillId: string }) => skill.skillId),
    ).toEqual([...ARITHMETIC_SKILL_IDS]);
    vi.stubEnv("ARITHMETIC_SHEET_WRITE", "on");
    expect((await (await GET(catalog())).json()).data.writerEnabled).toBe(true);
    expect(mocks.log).not.toHaveBeenCalled();
  });

  it("previews the exact core snapshot deterministically with the writer gate off", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: buildArithmeticSheet(input()) });
    expect(await (await POST(request())).json()).toEqual(body);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.data).not.toHaveProperty("usageCount");
    expect(body.data).not.toHaveProperty("ranking");
    expect(mocks.log).not.toHaveBeenCalled();
  });

  it.each([
    [100, 2],
    [200, 10],
  ])(
    "generates and reopens %i x %i with no database access",
    async (count, rounds) => {
      const body = input();
      body.rounds = Array.from({ length: rounds }, () => ({
        skills: [
          {
            skillId: "two-digit-vertical-add",
            count,
            constraints: defaultArithmeticConstraints("two-digit-vertical-add"),
          },
        ],
      }));
      const response = await POST(request(body));
      expect(response.status).toBe(200);
      const { data: sheet } = await response.json();
      expect(sheet.rounds).toHaveLength(rounds);
      expect(
        sheet.rounds.flatMap((round: { items: unknown[] }) => round.items),
      ).toHaveLength(count * rounds);
      expect(reopenArithmeticSheet(sheet)).toEqual(sheet);
      expect(mocks.log).not.toHaveBeenCalled();
    },
  );

  it.each([
    [null, 401],
    [{ user: { ...account, approvalStatus: "pending" } }, 403],
    [{ user: { ...account, menus: ["library", "export", "studio"] } }, 403],
    [
      { user: { ...account, menus: [], isAdmin: true, isSuperAdmin: true } },
      403,
    ],
  ])(
    "requires an approved session with bank rights (%j)",
    async (session, status) => {
      mocks.auth.mockResolvedValue(session);
      expect((await GET(catalog())).status).toBe(status);
      expect((await POST(request())).status).toBe(status);
    },
  );

  it("rejects missing/cross origins and cross-site requests", async () => {
    expect(
      (await POST(request(input(), { origin: "https://evil.test" }))).status,
    ).toBe(403);
    expect(
      (await POST(request(input(), { "sec-fetch-site": "cross-site" }))).status,
    ).toBe(403);
    expect(
      (
        await POST(
          new Request("http://localhost/api/arithmetic/generate", {
            method: "POST",
            body: JSON.stringify(input()),
          }),
        )
      ).status,
    ).toBe(403);
  });

  it("reports domain capacity with no partial sheet", async () => {
    const body = input();
    body.rounds[0].skills[0].count = 10; // Only nine items in the selected times table.
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result).not.toHaveProperty("data");
    expect(result.error).toMatchObject({
      code: "capacity",
      violations: [
        {
          skillId: "times-table",
          round: 1,
          allocation: 1,
          requested: 10,
          available: 9,
          reason: "domain",
        },
      ],
    });
  });

  it("rejects aggregate item limits with the engine limit detail", async () => {
    const body = input();
    body.rounds = Array.from({ length: 11 }, () => ({
      skills: [
        {
          skillId: "times-table",
          count: 11,
          constraints: defaultArithmeticConstraints("times-table"),
        },
      ],
    }));
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({
      code: "limit",
      limit: { scope: "rounds", count: 11, max: 10 },
    });
  });

  it.each([
    { ...input(), catalogVersion: "unknown" },
    { ...input(), rounds: [] },
    { ...input(), seed: "한글" },
    { ...input(), rank: 1 },
  ])("rejects invalid core input %j", async (body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).not.toHaveProperty("data");
  });

  it.each([
    "{",
    "null",
    '{"seed":"a","seed":"b"}',
    '{"bad":-0}',
    '{"bad":"\\u0000"}',
    JSON.stringify({ padding: "x".repeat(512 * 1024) }),
  ])("rejects malformed, duplicate-key or oversized JSON", async (body) => {
    const response = await POST(
      new Request("http://localhost/api/arithmetic/generate", {
        method: "POST",
        headers: { origin: "http://localhost" },
        body,
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).not.toHaveProperty("data");
  });
});
