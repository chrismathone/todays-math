// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  session: null as unknown,
  branch: {} as Record<string, unknown>,
  audits: [] as Record<string, unknown>[],
  notify: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/eywa/branchMenusChanged", () => ({
  notifyEywaBranchMenus: state.notify,
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
const findUnique = async () => state.branch;
const updateMany = async ({
  where,
  data,
}: {
  where: { menuRevision: number };
  data: Record<string, unknown>;
}) => {
  if (where.menuRevision !== state.branch.menuRevision) return { count: 0 };
  state.branch = {
    ...state.branch,
    ownerDisabledMenus: data.ownerDisabledMenus,
    menuRevision: Number(state.branch.menuRevision) + 1,
  };
  return { count: 1 };
};
vi.mock("@/lib/db", () => ({
  db: {
    branch: { findUnique: (...a: unknown[]) => findUnique(...(a as [])) },
    $transaction: async (run: (tx: unknown) => unknown) =>
      run({
        branch: { findUnique, updateMany },
        accountAuditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) =>
            state.audits.push(data),
        },
      }),
  },
}));
import { GET, PATCH } from "@/app/api/branch/menus/route";

const branchId = "20000000-0000-4000-8000-000000000002";
const owner = "10000000-0000-4000-8000-000000000001";
const req = (body?: unknown) =>
  new Request("http://localhost/api/branch/menus", {
    method: body === undefined ? "GET" : "PATCH",
    headers: { origin: "http://localhost" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const session = (branchRole: string) => ({
  user: {
    id: owner,
    name: "원장",
    isAdmin: true,
    approvalStatus: "approved",
    branchId,
    branchRole,
    menus: [],
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  process.env.AUTH_URL = "http://localhost";
  state.session = session("owner");
  state.branch = {
    id: branchId,
    disabledMenus: ["textbook"],
    ownerDisabledMenus: [],
    menuRevision: 3,
  };
  state.audits = [];
});

describe("지점 원장 사용 메뉴 API", () => {
  it("원장만 — 지점 관리자 · 강사는 403", async () => {
    for (const role of ["manager", "teacher"]) {
      state.session = session(role);
      expect((await GET(req())).status).toBe(403);
      expect(
        (await PATCH(req({ menus: [], expectedMenuRevision: 3 }))).status,
      ).toBe(403);
    }
  });

  it("읽기: 열림 · 사용 · 판 번호", async () => {
    const body = await (await GET(req())).json();
    expect(body.data.revision).toBe(3);
    expect(
      body.data.items.find((i: { menu: string }) => i.menu === "textbook"),
    ).toMatchObject({ open: false, on: false });
  });

  it("저장: 끈 메뉴 · 감사 기록(오늘 수학 · 켠 것/끈 것) · 에이와 알림", async () => {
    const menus = ["home", "bank", "library"];
    const res = await PATCH(req({ menus, expectedMenuRevision: 3 }));
    expect(res.status).toBe(200);
    expect(state.branch.menuRevision).toBe(4);
    expect(state.branch.ownerDisabledMenus).toContain("studio");
    expect(state.branch.ownerDisabledMenus).not.toContain("textbook");
    expect(state.audits[0]).toMatchObject({
      action: "branch.owner_menus_changed",
      actorId: owner,
      details: expect.objectContaining({
        source: "today",
        actorName: "원장",
        menus,
        turnedOff: expect.arrayContaining(["문제 추출"]),
      }),
    });
    expect(state.notify).toHaveBeenCalledWith(
      branchId,
      expect.objectContaining({ kind: "owner", menus, menuRevision: 4 }),
    );
  });

  it("열리지 않은 메뉴는 400 · 판이 다르면 409 · 그대로면 기록 없음", async () => {
    expect(
      (await PATCH(req({ menus: ["textbook"], expectedMenuRevision: 3 })))
        .status,
    ).toBe(400);
    expect(
      (await PATCH(req({ menus: [], expectedMenuRevision: 2 }))).status,
    ).toBe(409);
    const all = [
      "home",
      "bank",
      "arithmetic",
      "studio",
      "export",
      "library",
      "teaching",
      "concept",
      "conceptBlank",
      "srs",
      "english-school",
      "english-maker",
      "english-library",
      "english-listening",
      "english-bank",
    ];
    expect(
      (await PATCH(req({ menus: all, expectedMenuRevision: 3 }))).status,
    ).toBe(200);
    expect(state.audits).toHaveLength(0);
    expect(state.notify).not.toHaveBeenCalled();
  });
});
