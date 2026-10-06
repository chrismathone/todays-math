import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import { adminIdentity, pendingAccount } from "./adminFixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const fetchMock = vi.fn<typeof fetch>();
const draft = {
  id: "draft-1",
  kind: "draft" as const,
  title: "중1 방정식 연습",
  revision: 2,
  createdAt: pendingAccount.createdAt,
  updatedAt: pendingAccount.updatedAt,
  payload: {
    problems: [
      {
        content: "다음 식을 계산하시오. $2+3$",
        answer: "5",
        solution: "두 수를 더합니다.",
        grade: "중1",
      },
    ],
  },
};
function auditResponse(category: string, page = 1, total = 31) {
  return Response.json({
    data:
      total === 0
        ? []
        : [
            {
              id: `${category}-${page}`,
              action:
                category === "admin-access"
                  ? "admin.account_view"
                  : "account.settings_changed",
              outcome: "success",
              actorName: "관리자",
              createdAt: draft.updatedAt,
              details: { title: `${category} ${page}쪽` },
            },
          ],
    meta: { page, pageSize: 30, total },
  });
}
function mockAuditRequests(
  respond: (url: URL) => Response | Promise<Response>,
) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname.endsWith("/audit")) return respond(url);
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
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("administrator user detail", () => {
  it("restores a detail tab and returns to the same branch list context", async () => {
    const list = "/admin/branches/unassigned?q=teacher%40example.test&status=approved&page=3&tab=accounts&selection=user-2#admin-main";
    window.history.replaceState(null, "", `/admin/branches/unassigned/users/${pendingAccount.id}?returnTo=${encodeURIComponent(list)}&detailTab=audit#admin-main`);
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<AdminUserDetail branchId="unassigned" userId={pendingAccount.id} identity={adminIdentity} initialAccount={pendingAccount} />);
    const back = screen.getByRole("link", { name: "미소속 계정 목록" });
    const url = new URL(back.getAttribute("href")!, "http://localhost");
    expect(url.pathname).toBe("/admin/branches/unassigned");
    expect(url.searchParams.get("q")).toBe("teacher@example.test");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.hash).toBe("#admin-main");
    expect(screen.getByRole("button", { name: "활동 기록" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "반" }));
    expect(new URLSearchParams(window.location.search).get("detailTab")).toBe("classes");
    expect(window.location.hash).toBe("#admin-main");
  });
  it.each(["/admin/branches/other?page=2", "/classes/manage", "//evil.test/", "/admin/branches/unassigned?returnTo=%2Fbranch"])("uses the fixed branch fallback for invalid detail return %s", value => {
    window.history.replaceState(null, "", `/?returnTo=${encodeURIComponent(value)}`);
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(<AdminUserDetail branchId="unassigned" userId={pendingAccount.id} identity={adminIdentity} initialAccount={pendingAccount} />);
    expect(screen.getByRole("link", { name: "미소속 계정 목록" })).toHaveAttribute("href", "/admin/branches/unassigned?tab=accounts");
  });
  it("shows the account immediately while detail requests are pending", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    expect(
      screen.getByRole("heading", { name: pendingAccount.name, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("계정 정보를 불러오는 중입니다."),
    ).not.toBeInTheDocument();
  });

  it("focuses a selected document preview and closes it back to the document", async () => {
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes("/api/admin/branches"))
        return Response.json({ data: [] });
      if (String(url).includes("/documents/"))
        return Response.json({ data: draft });
      if (String(url).includes("/documents?"))
        return Response.json({
          data: [draft],
          meta: { page: 1, pageSize: 20, total: 1 },
        });
      return Response.json({ data: pendingAccount });
    });
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
      />,
    );
    const trigger = await screen.findByRole("button", {
      name: /중1 방정식 연습/,
    });
    fireEvent.click(trigger);
    await screen.findByRole("heading", { name: "문항 1 중1" });
    const preview = screen.getByRole("region", { name: "자료 미리보기" });
    expect(preview).toHaveFocus();
    fireEvent.keyDown(preview, { key: "Escape" });
    expect(screen.getByText("살펴볼 자료를 선택하세요")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("reads private worksheets, renders math and switches to paginated audit records", async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("/api/admin/branches"))
        return Response.json({ data: [] });
      if (path.includes("/documents/")) return Response.json({ data: draft });
      if (path.includes("/documents?"))
        return Response.json({
          data: [draft],
          meta: { page: 1, pageSize: 20, total: 21 },
        });
      if (path.includes("/audit?"))
        return Response.json({
          data: [
            {
              id: "audit-1",
              action: "material.saved",
              outcome: "success",
              actorName: "김하늘",
              createdAt: draft.updatedAt,
              details: { title: draft.title, revision: 2 },
            },
          ],
          meta: { page: 1, pageSize: 30, total: 31 },
        });
      return Response.json({ data: pendingAccount });
    });
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /중1 방정식 연습/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "문항 1 중1" }),
    ).toBeInTheDocument();
    expect(screen.getByText("두 수를 더합니다.")).toBeInTheDocument();
    expect(document.querySelector(".katex")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain(
        "documents?page=2",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    await screen.findByText("자료 저장");
    expect(screen.getByText("완료")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain("audit?page=2"),
    );
    expect(
      fetchMock.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
  });

  it("previews extraction crops through protected admin assets and exposes image failures", () => {
    render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{
          ...draft,
          kind: "extraction",
          payload: {
            data: {
              crops: [
                {
                  content: "추출한 문제",
                  image: "/api/library/assets/asset-1",
                  answer: "정답",
                  page: 3,
                },
              ],
            },
          },
        }}
      />,
    );
    const image = screen.getByRole("img", { name: "문항 1 원본" });
    expect(image).toHaveAttribute(
      "src",
      `/api/admin/users/${pendingAccount.id}/assets/asset-1`,
    );
    fireEvent.error(image);
    expect(
      screen.getByText(/이미지를 불러오지 못했습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("추출한 문제")).toBeInTheDocument();
    expect(screen.queryByText(/payload|crops/)).not.toBeInTheDocument();
  });

  // 26 §9 ⑾ — 개념 백지는 고르기만 담는다. «시험지 · 0문항»으로 읽히지 않게 소단원과 형식을 보인다.
  it("previews a saved concept blank as its sections and forms, not as an empty worksheet", () => {
    render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{
          ...draft,
          kind: "conceptBlank",
          title: "합동 백지",
          payload: {
            selection: {
              sections: [
                "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
                "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
              ],
              forms: [
                {
                  form: "term",
                  counts: { 하: 10, 중: 10, 상: 10 },
                  extras: { 하: 10, 중: 0, 상: 0 },
                },
              ],
            },
          },
        }}
      />,
    );
    expect(screen.getByText(/개념 백지 · 읽기 전용/)).toBeInTheDocument();
    expect(screen.getByText("2-3-1 도형의 합동 알아보기")).toBeInTheDocument();
    expect(screen.getByText(/개념 질문/)).toBeInTheDocument();
    expect(
      screen.queryByText("이 자료에 저장된 문항이 없습니다."),
    ).not.toBeInTheDocument();
  });

  it("does not inject SVG markup and defers long document rendering", () => {
    const problems = Array.from({ length: 21 }, () => ({
      content: "문제",
      figureSvg:
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    }));
    const { container } = render(
      <AdminDocumentPreview
        userId={pendingAccount.id}
        document={{ ...draft, payload: { problems } }}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "문항 21" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "다음 문항 보기 (20 / 21)" }),
    );
    expect(
      screen.getByRole("heading", { name: "문항 21" }),
    ).toBeInTheDocument();
  });

  it("shows readable changes and keeps complete raw details in a closed, keyboard-accessible disclosure", async () => {
    const account = {
      ...pendingAccount,
      branchId: "current-branch",
      branchName: "현재 소속 강남학원",
    };
    const details = {
      previousStatus: "pending",
      status: "approved",
      previousBranchManager: false,
      branchManager: true,
      previousMenus: ["library"],
      menus: ["library", "conceptBlank"],
      previousBranchId: null,
      branchId: "branch-1",
      path: `/api/admin/users/${account.id}/audit`,
      suspended: false,
      deleted: false,
      future: { nested: [null, false, '<img src=x onerror="alert(1)">'] },
    };
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);
      if (path.includes("/api/admin/branches"))
        return Response.json({ data: [] });
      if (path.includes("/documents?"))
        return Response.json({
          data: [],
          meta: { page: 1, pageSize: 20, total: 0 },
        });
      if (path.includes("/audit?"))
        return Response.json({
          data: [
            {
              id: "change-1",
              action: "account.settings_changed",
              outcome: "success",
              actorName: "관리자",
              createdAt: account.updatedAt,
              details,
            },
          ],
          meta: { page: 1, pageSize: 30, total: 1 },
        });
      return Response.json({ data: account });
    });
    const { container } = render(
      <AdminUserDetail
        branchId={account.branchId ?? "unassigned"}
        userId={account.id}
        identity={adminIdentity}
        initialAccount={account}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    await screen.findByText("계정 설정 변경");
    const audit = screen.getByRole("region", { name: "계정 활동 기록" });
    const visibleDetails = audit.querySelector("dl")!;
    expect(visibleDetails).toHaveTextContent("이전 승인 대기현재 승인됨");
    expect(visibleDetails).toHaveTextContent("이전 없음현재 있음");
    expect(visibleDetails).toHaveTextContent("우리학원 시험지, 개념 백지");
    expect(visibleDetails).toHaveTextContent("이전 내 시험지");
    expect(visibleDetails).toHaveTextContent("지점 소속 (이름 미기록)");
    expect(visibleDetails).not.toHaveTextContent("현재 소속 강남학원");
    expect(visibleDetails).toHaveTextContent("정지 안 됨");
    expect(visibleDetails).not.toHaveTextContent(
      /branch-1|conceptBlank|approved|false|\/api\//,
    );
    const disclosure = within(audit).getByText("기술 상세").closest("details")!;
    expect(disclosure).not.toHaveAttribute("open");
    expect(JSON.parse(disclosure.querySelector("pre")!.textContent!)).toEqual({
      action: "account.settings_changed",
      outcome: "success",
      details,
    });
    const summary = disclosure.querySelector("summary")!;
    summary.focus();
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute("open");
    expect(container.querySelector("img[src=x]")).toBeNull();
    expect(
      screen.getByRole("complementary", { name: "계정 관리 설정" }),
    ).toHaveAttribute("tabindex", "0");
    expect(
      fetchMock.mock.calls.every(
        ([, init]) => !init?.method || init.method === "GET",
      ),
    ).toBe(true);
  });

  it("defaults to activity and fetches each tab with its own server count and page one", async () => {
    mockAuditRequests((url) =>
      auditResponse(
        url.searchParams.get("category")!,
        Number(url.searchParams.get("page")),
        url.searchParams.get("category") === "admin-access" ? 61 : 31,
      ),
    );
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    const activity = screen.getByRole("tab", { name: "활동" });
    const access = screen.getByRole("tab", { name: "관리자 접근" });
    expect(activity).toHaveAttribute("aria-selected", "true");
    expect(access).toHaveAttribute("tabindex", "-1");
    await screen.findByText("계정 설정 변경");
    expect(screen.getByText("총 31개")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("activity 2쪽");
    fireEvent.click(access);
    expect(screen.queryByText("activity 2쪽")).not.toBeInTheDocument();
    await screen.findByText("관리자 계정 열람");
    expect(screen.getByText("admin-access 1쪽")).toBeInTheDocument();
    expect(screen.getByText("총 61개")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(access).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tabpanel", { name: "관리자 접근" }),
    ).toHaveAttribute("id", access.getAttribute("aria-controls"));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByText("admin-access 2쪽");
    fireEvent.click(activity);
    await screen.findByText("activity 1쪽");
    const queries = fetchMock.mock.calls
      .map(([url]) => new URL(String(url), "http://localhost"))
      .filter((url) => url.pathname.endsWith("/audit"));
    expect(
      queries.map((url) => [
        url.searchParams.get("category"),
        url.searchParams.get("page"),
      ]),
    ).toEqual([
      ["activity", "1"],
      ["activity", "2"],
      ["admin-access", "1"],
      ["admin-access", "2"],
      ["activity", "1"],
    ]);
  });

  it("supports roving keyboard tabs and distinct empty states", async () => {
    mockAuditRequests((url) =>
      auditResponse(url.searchParams.get("category")!, 1, 0),
    );
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    await screen.findByText("아직 활동 기록이 없습니다.");
    const activity = screen.getByRole("tab", { name: "활동" });
    const access = screen.getByRole("tab", { name: "관리자 접근" });
    activity.focus();
    fireEvent.keyDown(activity, { key: "ArrowRight" });
    expect(access).toHaveFocus();
    expect(access).toHaveAttribute("tabindex", "0");
    expect(activity).toHaveAttribute("tabindex", "-1");
    await screen.findByText("아직 관리자 접근 기록이 없습니다.");
    fireEvent.keyDown(access, { key: "Home" });
    expect(activity).toHaveFocus();
    await screen.findByText("아직 활동 기록이 없습니다.");
    fireEvent.keyDown(activity, { key: "End" });
    expect(access).toHaveFocus();
    await screen.findByText("아직 관리자 접근 기록이 없습니다.");
    fireEvent.keyDown(access, { key: "ArrowRight" });
    expect(activity).toHaveFocus();
    fireEvent.keyDown(activity, { key: "ArrowLeft" });
    expect(access).toHaveFocus();
    await screen.findByText("아직 관리자 접근 기록이 없습니다.");
    expect(screen.getByText("총 0개")).toBeInTheDocument();
  });

  it("ignores a stale tab response and retries the selected category", async () => {
    let resolveActivity!: (response: Response) => void;
    let accessCalls = 0;
    mockAuditRequests((url) => {
      if (url.searchParams.get("category") === "activity")
        return new Promise((resolve) => {
          resolveActivity = resolve;
        });
      return ++accessCalls === 1
        ? Response.json(
            { error: { message: "다시 연결해 주세요." } },
            { status: 503 },
          )
        : auditResponse("admin-access");
    });
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
        initialAccount={pendingAccount}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "활동 기록" }));
    fireEvent.click(screen.getByRole("tab", { name: "관리자 접근" }));
    await screen.findByRole("alert");
    resolveActivity(auditResponse("activity"));
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByText("관리자 계정 열람");
    expect(screen.queryByText("계정 설정 변경")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "관리자 접근" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("reports account read failures and retries", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { error: { message: "사용자를 찾지 못했습니다." } },
        { status: 404 },
      ),
    );
    render(
      <AdminUserDetail
        branchId="unassigned"
        userId={pendingAccount.id}
        identity={adminIdentity}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "사용자를 찾지 못했습니다.",
    );
    expect(
      screen.getByRole("link", { name: "미소속 계정 목록" }),
    ).toHaveAttribute("href", "/admin/branches/unassigned?tab=accounts");
  });
});
