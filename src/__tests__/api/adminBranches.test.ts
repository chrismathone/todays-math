// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { Prisma } from "@prisma/client";

const state = vi.hoisted(() => ({
  superadmin: true,
  branchCreate: vi.fn(),
  userCreate: vi.fn(),
  branchFindMany: vi.fn(),
  branchFindUnique: vi.fn(),
  branchUpdate: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(
    async (_request: Request, _admin: boolean, superAdmin: boolean) =>
      superAdmin && !state.superadmin
        ? {
            account: null,
            response: Response.json(
              { error: { code: "FORBIDDEN" } },
              { status: 403 },
            ),
          }
        : {
            account: { id: "10000000-0000-4000-8000-000000000001" },
            response: null,
          },
  ),
}));
vi.mock("@/lib/db", () => ({
  db: {
    branch: {
      findMany: state.branchFindMany,
      findUnique: state.branchFindUnique,
      update: state.branchUpdate,
    },
    $transaction: state.transaction,
  },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: state.audit }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));

import { GET, POST } from "@/app/api/admin/branches/route";
import { PATCH } from "@/app/api/admin/branches/[id]/route";

const request = () =>
  new Request("http://localhost/api/admin/branches", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: JSON.stringify({
      branchName: "  새 지점  ",
      ownerName: "  홍원장  ",
      ownerEmail: "NEW@EXAMPLE.COM",
    }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  state.superadmin = true;
  state.branchCreate.mockResolvedValue({
    id: "20000000-0000-4000-8000-000000000002",
    name: "새 지점",
  });
  state.userCreate.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "30000000-0000-4000-8000-000000000003",
      name: data.name,
      email: data.email,
    }),
  );
  state.transaction.mockImplementation(
    async (run: (tx: unknown) => Promise<unknown>) =>
      run({
        branch: { create: state.branchCreate },
        user: { create: state.userCreate },
      }),
  );
  state.audit.mockResolvedValue(undefined);
  state.branchFindMany.mockResolvedValue([]);
  state.branchFindUnique.mockResolvedValue({
    id: "20000000-0000-4000-8000-000000000002",
    name: "기존 지점",
  });
  state.branchUpdate.mockResolvedValue({
    id: "20000000-0000-4000-8000-000000000002",
    name: "새 지점명",
  });
});

describe("최고관리자 지점 개설", () => {
  it("지점과 첫 원장을 한 트랜잭션에서 만들고 비밀번호는 해시만 저장한다", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(data.branch.name).toBe("새 지점");
    expect(data.owner.email).toBe("new@example.com");
    expect(data.initialPassword).toMatch(/^[-_A-Za-z0-9]{24}$/);
    expect(state.transaction).toHaveBeenCalledOnce();
    const saved = state.userCreate.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      branchId: data.branch.id,
      branchRole: "owner",
      approvalStatus: "approved",
      isAdmin: true,
      isSuperAdmin: false,
    });
    expect(await compare(data.initialPassword, saved.passwordHash)).toBe(true);
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.branch_created" }),
    );
  });

  it("최고관리자가 아니면 지점 목록과 개설을 막는다", async () => {
    state.superadmin = false;
    expect((await POST(request())).status).toBe(403);
    expect(
      (await GET(new Request("http://localhost/api/admin/branches"))).status,
    ).toBe(403);
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("원장 이메일 중복은 409로 알린다", async () => {
    state.userCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    expect((await POST(request())).status).toBe(409);
  });

  it("지점명을 변경하고 변경 전후 값을 감사 기록에 남긴다", async () => {
    const id = "20000000-0000-4000-8000-000000000002";
    const response = await PATCH(
      new Request(`http://localhost/api/admin/branches/${id}`, {
        method: "PATCH",
        headers: { origin: "http://localhost" },
        body: JSON.stringify({ name: "  새 지점명  " }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    expect(state.branchUpdate).toHaveBeenCalledWith({
      where: { id },
      data: { name: "새 지점명" },
      select: { id: true, name: true },
    });
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "admin.branch_renamed",
        details: { branchId: id, previousName: "기존 지점", name: "새 지점명" },
      }),
    );
  });

  it("지점명 변경은 최고관리자만 가능하고 빈 이름은 거절한다", async () => {
    const id = "20000000-0000-4000-8000-000000000002";
    const patch = (name: string) =>
      PATCH(
        new Request(`http://localhost/api/admin/branches/${id}`, {
          method: "PATCH",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ name }),
        }),
        { params: Promise.resolve({ id }) },
      );
    expect((await patch(" ")).status).toBe(400);
    state.superadmin = false;
    expect((await patch("새 이름")).status).toBe(403);
    expect(state.branchUpdate).not.toHaveBeenCalled();
  });
});
