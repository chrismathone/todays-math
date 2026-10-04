import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAccountRelations from "@/components/admin/AdminAccountRelations";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import { adminIdentity, pendingAccount } from "./adminFixtures";
import type { AdminRelationsResponse } from "@/contracts/adminRelations.contract";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
const id = (n: number) =>
  `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const fetchMock = vi.fn<typeof fetch>();
function TestRelations({
  userId,
  branchId,
}: {
  userId: string;
  branchId: string;
}) {
  return (
    <>
      <AdminAccountRelations
        userId={userId}
        branchId={branchId}
        kind="classes"
      />
      <AdminAccountRelations
        userId={userId}
        branchId={branchId}
        kind="students"
      />
    </>
  );
}
function payload(
  kind: "classes" | "students",
  page = 1,
  total = 21,
): AdminRelationsResponse {
  const meta = { page, pageSize: 20, total };
  return kind === "classes"
    ? {
        kind,
        meta,
        data: total
          ? [
              {
                id: id(1),
                name: `방정식반 ${page}`,
                grade: "중1",
                active: true,
                owner: false,
                memberships: ["homeroom", "delegate"],
                sync: "active",
              },
            ]
          : [],
      }
    : {
        kind,
        meta,
        data: total
          ? [
              {
                id: id(2),
                name: `김학생 ${page}`,
                grade: "중2",
                sync: "unverified",
                login: "enabled",
                classes: [
                  { id: id(1), name: "방정식반", membership: "enrolled" },
                  { id: id(3), name: "도형반", membership: "on-hold" },
                ],
              },
            ]
          : [],
      };
}
function mockRelations(respond: (url: URL) => Response | Promise<Response>) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/relations")) return respond(url);
    if (url.pathname.endsWith("/documents"))
      return Response.json({
        data: [],
        meta: { page: 1, pageSize: 20, total: 0 },
      });
    if (url.pathname === "/api/admin/branches")
      return Response.json({ data: [] });
    return Response.json({ data: pendingAccount });
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("read-only connected account roster", () => {
  it("loads both panels independently and shows distinct pending states", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<TestRelations userId={id(10)} branchId={id(11)} />);
    expect(
      screen.getByText("연결된 반을 불러오는 중입니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("연결된 학생을 불러오는 중입니다."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      fetchMock.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: /발급|저장|변경/ }),
    ).not.toBeInTheDocument();
  });
  it("opens from account detail, renders names/grades/memberships and independently paginates students", async () => {
    mockRelations((url) =>
      Response.json(
        payload(
          url.searchParams.get("kind") as "classes" | "students",
          Number(url.searchParams.get("page")),
        ),
      ),
    );
    render(
      <AdminUserDetail
        userId={pendingAccount.id}
        branchId="unassigned"
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/relations")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "반" }));
    await screen.findByText("방정식반 1");
    expect(screen.getByText("방정식반 1")).toBeInTheDocument();
    expect(screen.getByText("담임 · 열람 위임")).toBeInTheDocument();
    expect(screen.queryByText("김학생 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "학생" }));
    await screen.findByText("김학생 1");
    expect(screen.getByText("중2")).toBeInTheDocument();
    expect(screen.getByText("도형반")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("휴원"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("사용 설정"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getByText("관리 동기화 · 확인 필요"),
    ).toBeInTheDocument();
    const students = screen.getByRole("region", { name: "연결된 학생" });
    expect(
      screen.queryByRole("region", { name: "연결된 반" }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(students).getByRole("button", { name: "다음" }));
    await screen.findByText("김학생 2");
    expect(
      within(students).getByRole("button", { name: "다음" }),
    ).toBeDisabled();
    const queries = fetchMock.mock.calls
      .map(([u]) => new URL(String(u), "http://localhost"))
      .filter((u) => u.pathname.endsWith("/relations"));
    expect(
      queries.map((u) => [
        u.searchParams.get("kind"),
        u.searchParams.get("page"),
        u.searchParams.get("branchId"),
      ]),
    ).toEqual([
      ["classes", "1", "unassigned"],
      ["students", "1", "unassigned"],
      ["students", "2", "unassigned"],
    ]);
  });
  it("keeps genuine empty states and counts separate from errors", async () => {
    mockRelations((url) =>
      Response.json(
        payload(url.searchParams.get("kind") as "classes" | "students", 1, 0),
      ),
    );
    render(<TestRelations userId={id(10)} branchId={id(11)} />);
    await screen.findByText("연결된 반이 없습니다.");
    await screen.findByText("연결된 학생이 없습니다.");
    expect(screen.getByText("총 0명")).toBeInTheDocument();
    expect(screen.getByText("총 0개")).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /이전|다음/ }))
      expect(button).toBeDisabled();
  });
  it("retries a failed student request without reloading classes or claiming an empty roster", async () => {
    let calls = 0;
    mockRelations((url) =>
      url.searchParams.get("kind") === "classes"
        ? Response.json(payload("classes"))
        : ++calls === 1
          ? Response.json(
              { error: { message: "연결을 확인해 주세요." } },
              { status: 503 },
            )
          : Response.json(payload("students")),
    );
    render(<TestRelations userId={id(10)} branchId={id(11)} />);
    await screen.findByRole("alert");
    expect(
      screen.queryByText("연결된 학생이 없습니다."),
    ).not.toBeInTheDocument();
    const students = screen.getByRole("region", { name: "연결된 학생" });
    fireEvent.click(
      within(students).getByRole("button", { name: "다시 시도" }),
    );
    await screen.findByText("김학생 1");
    expect(
      fetchMock.mock.calls.filter(([u]) => String(u).includes("kind=classes")),
    ).toHaveLength(1);
  });
  it("drops a late response after account/branch change and starts each new roster at page one", async () => {
    let resolveOld!: (response: Response) => void;
    mockRelations((url) =>
      url.pathname.includes(id(10)) &&
      url.searchParams.get("kind") === "students"
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Response.json(
            payload(url.searchParams.get("kind") as "classes" | "students"),
          ),
    );
    const { rerender } = render(
      <TestRelations userId={id(10)} branchId={id(11)} />,
    );
    await screen.findByText("방정식반 1");
    rerender(<TestRelations userId={id(12)} branchId={id(13)} />);
    await screen.findByText("김학생 1");
    const old = payload("students");
    old.data[0].name = "이전 계정 학생";
    await act(async () => resolveOld(Response.json(old)));
    expect(screen.queryByText("이전 계정 학생")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls
        .filter(([u]) => String(u).includes(id(12)))
        .every(([u]) => String(u).includes("page=1")),
    ).toBe(true);
  });
  it("uses the server's clamped page and rejects malformed successful responses", async () => {
    let calls = 0;
    mockRelations((url) =>
      url.searchParams.get("kind") === "classes"
        ? Response.json(payload("classes", 1, 0))
        : ++calls === 1
          ? Response.json(payload("students"))
          : Response.json(payload("students", 1, 1)),
    );
    render(<TestRelations userId={id(10)} branchId={id(11)} />);
    await screen.findByText("김학생 1");
    const students = screen.getByRole("region", { name: "연결된 학생" });
    fireEvent.click(within(students).getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(within(students).getByText("1 / 1")).toBeInTheDocument(),
    );
    expect(
      within(students).getByRole("button", { name: "다음" }),
    ).toBeDisabled();
    mockRelations(() =>
      Response.json({ data: [], meta: { page: 1, pageSize: 0, total: -1 } }),
    );
    fireEvent.click(within(students).getByRole("button", { name: "새로고침" }));
    await within(students).findByRole("alert");
    expect(
      within(students).queryByText("연결된 학생이 없습니다."),
    ).not.toBeInTheDocument();
  });
  it("submits filters and sorting to the server and resets pagination when conditions change", async () => {
    mockRelations((url) =>
      Response.json({
        ...payload("students", Number(url.searchParams.get("page"))),
        filters: {
          classes: [{ id: id(1), name: "방정식반" }],
          grades: ["중2"],
        },
      }),
    );
    render(
      <AdminAccountRelations
        userId={id(10)}
        branchId={id(11)}
        kind="students"
      />,
    );
    await screen.findByText("김학생 1");
    const panel = screen.getByRole("region", { name: "연결된 학생" });
    fireEvent.click(within(panel).getByRole("button", { name: "다음" }));
    await screen.findByText("김학생 2");
    fireEvent.change(screen.getByLabelText("로그인 상태"), {
      target: { value: "unissued" },
    });
    await screen.findByText("김학생 1");
    let url = new URL(
      String(fetchMock.mock.calls.at(-1)![0]),
      "http://localhost",
    );
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("login")).toBe("unissued");
    expect(url.searchParams.get("sort")).toBe("class");
    fireEvent.change(screen.getByLabelText("반", { exact: true }), {
      target: { value: id(1) },
    });
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)![0])).toContain(
        `classId=${id(1)}`,
      ),
    );
    fireEvent.change(screen.getByLabelText("학생·반 검색"), {
      target: { value: "김학생" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() => {
      url = new URL(
        String(fetchMock.mock.calls.at(-1)![0]),
        "http://localhost",
      );
      expect(url.searchParams.get("q")).toBe("김학생");
    });
    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    await waitFor(() => {
      url = new URL(
        String(fetchMock.mock.calls.at(-1)![0]),
        "http://localhost",
      );
      expect(url.searchParams.get("login")).toBe("all");
      expect(url.searchParams.has("classId")).toBe(false);
      expect(url.searchParams.has("q")).toBe(false);
    });
  });
});
