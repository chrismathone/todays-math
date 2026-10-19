// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { db } = vi.hoisted(() => ({
  db: {
    test: { findMany: vi.fn() },
    testProblem: { findMany: vi.fn() },
    problem: { findMany: vi.fn() },
    workspaceDocument: { findMany: vi.fn() },
    accountAuditLog: { findMany: vi.fn() },
    errorLog: { create: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ db }));

import { auth } from "@/lib/auth";
import { usageLabelsResponseSchema } from "@/contracts/usageLabels.contract";
import { getSessionUser } from "@/lib/session";
import { POST as devLabels } from "@/app/api/dev/unified/problems/labels/route";
import { POST as labels } from "@/app/api/studio/problems/labels/route";

const ORIGIN = "https://math.example";
const problemId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

function post(body: unknown, origin = ORIGIN) {
  return new Request(`${ORIGIN}/api/studio/problems/labels`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "owner-17",
    name: "Teacher",
    email: "teacher@example.test",
    isAdmin: false,
    branchId: null,
  } as never);
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "owner-17", role: "director" },
  });
  db.test.findMany.mockReset().mockResolvedValue([]);
  db.testProblem.findMany.mockReset().mockResolvedValue([]);
  db.problem.findMany.mockReset().mockResolvedValue([]);
  db.workspaceDocument.findMany.mockReset().mockResolvedValue([]);
  db.accountAuditLog.findMany.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("순위 라우트 관문", () => {
  it("accepts explicit v2 IDs and keeps owner-only counts and family grouping", async () => {
    const response = await labels(
      post({ arithmeticV2TypeIds: ["m1-integer-add", "unknown-type"] }),
    );
    expect(response.status).toBe(200);
    const body = usageLabelsResponseSchema.parse(await response.json());
    expect(body.arithmeticV2Types).toEqual([
      expect.objectContaining({
        typeId: "m1-integer-add",
        state: "zero",
        count: 0,
      }),
      expect.objectContaining({
        typeId: "unknown-type",
        state: "unknown",
        count: null,
      }),
    ]);
    expect(body.metrics.arithmeticV2?.group).toBe("rankGroup");
    expect(db.workspaceDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "owner-17",
          kind: "arithmeticSheet",
        }),
      }),
    );
    expect(db.test.findMany).not.toHaveBeenCalled();
  });
  it("로그인·검수 계정·다른 사이트를 막고, 틀린 본문은 조회하지 않는다", async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await labels(post({ problemIds: [problemId] }))).status).toBe(401);
    vi.mocked(auth as () => Promise<unknown>).mockResolvedValueOnce({
      user: { id: "owner-17", role: "reviewer" },
    });
    expect((await labels(post({ problemIds: [problemId] }))).status).toBe(403);
    expect(
      (
        await labels(
          post({ problemIds: [problemId] }, "https://elsewhere.example"),
        )
      ).status,
    ).toBe(403);
    expect(db.test.findMany).not.toHaveBeenCalled();

    const invalid = await labels(
      post({ problemIds: [problemId], solution: "없음" }),
    );
    expect(invalid.status).toBe(400);
    expect(db.problem.findMany).not.toHaveBeenCalled();

    const duplicate = await labels(
      post({ problemIds: [problemId, problemId] }),
    );
    expect(duplicate.status).toBe(400);

    const allowed = await labels(post({ problemIds: [problemId] }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("Cache-Control")).toContain("no-store");
    const body = usageLabelsResponseSchema.parse(await allowed.json());
    expect(body.scope.viewerId).toBe("owner-17");
    expect(body.problems[0]?.state).toBe("unknown");
    expect(body.period.id).toBe("30d");
  });

  it("dev 짝은 운영 빌드에서 열리지 않는다", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const hidden = await devLabels(post({}));
    expect(hidden.status).toBe(404);
    expect(db.workspaceDocument.findMany).not.toHaveBeenCalled();
  });
});
