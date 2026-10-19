import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountReview from "@/components/admin/AccountReview";
import AdminBranches from "@/components/admin/AdminBranches";
import AdminAccounts from "@/components/admin/AdminAccounts";
import AdminUserDetail from "@/components/admin/AdminUserDetail";
import AdminBranchDetail from "@/components/admin/AdminBranchDetail";
import BranchMenuEditor from "@/components/admin/BranchMenuEditor";
import type { ManagedAccount } from "@/contracts/accountAccess.contract";
import type { BranchSummary } from "@/contracts/branchAdmin.contract";
import {
  accountsResponse,
  adminIdentity,
  pendingAccount,
} from "./adminFixtures";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();
const branchId = "55555555-5555-4555-8555-555555555555";
const nextBranchId = "66666666-6666-4666-8666-666666666666";
const branch: BranchSummary = {
  id: branchId,
  name: "강남학원",
  createdAt: pendingAccount.createdAt,
  menuRevision: 3,
  menus: ["home", "studio"],
  pendingCount: 1,
  _count: { users: 2 },
  users: [
    {
      id: pendingAccount.id,
      name: "원장",
      email: pendingAccount.email,
      suspendedAt: null,
    },
  ],
};
const destination: BranchSummary = {
  ...branch,
  id: nextBranchId,
  name: "서초학원",
  menus: ["bank"],
};
const owner: ManagedAccount = {
  ...pendingAccount,
  branchId,
  branchName: branch.name,
  branchRole: "owner",
  isAdmin: true,
  configuredMenus: ["home", "bank"],
  branchMenus: branch.menus,
  branchMenuRevision: 3,
  menus: ["home"],
};
const json = (body: unknown, status = 200) => Response.json(body, { status });
const branchList = (data = [branch, destination]) => ({
  data,
  meta: { unassigned: { count: 4, pendingCount: 2 } },
});
const patches = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH");
const payload = () => JSON.parse(String(patches().at(-1)?.[1]?.body));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(json(branchList()));
});
afterEach(() => vi.unstubAllGlobals());

function ReviewHarness({ initial = owner }: { initial?: ManagedAccount }) {
  const [account, setAccount] = useState(initial);
  return (
    <AccountReview
      account={account}
      onUpdate={setAccount}
      onLockChange={() => {}}
    />
  );
}
function EditorHarness({ initial = branch }: { initial?: BranchSummary }) {
  const [current, setCurrent] = useState(initial);
  return (
    <BranchMenuEditor
      branch={current}
      onUpdate={setCurrent}
      onLockChange={() => {}}
    />
  );
}

describe("branch-capped personal account menus", () => {
  it("an administrator turns listening on for an account like any other menu", async () => {
    const account: ManagedAccount = {
      ...pendingAccount,
      configuredMenus: ["home", "english-school"],
      branchMenus: null,
      unavailableMenus: [],
      menus: ["home", "english-school"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...account,
              configuredMenus: [...account.menus, "english-listening"],
              menus: [...account.menus, "english-listening"],
            },
          })
        : json(branchList()),
    );
    render(<ReviewHarness initial={account} />);
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    const listening = screen.getByRole("checkbox", { name: "영어듣기" });
    expect(listening).toBeEnabled();
    expect(listening).not.toBeChecked();
    fireEvent.click(listening);
    expect(listening).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload().menus).toEqual([
      "home",
      "english-school",
      "english-listening",
    ]);
    expect(screen.getByRole("checkbox", { name: "영어듣기" })).toBeChecked();
  });
  it("the service switch keeps the listening selection without enabling or mutating it", async () => {
    const account: ManagedAccount = {
      ...pendingAccount,
      configuredMenus: ["home", "english-school", "english-listening"],
      branchMenus: null,
      unavailableMenus: ["english-listening"],
      menus: ["home", "english-school"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...account, name: "새 이름" } })
        : json(branchList()),
    );
    render(<ReviewHarness initial={account} />);
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    const listening = screen.getByRole("checkbox", { name: /^영어듣기/ });
    expect(listening).not.toBeChecked();
    expect(listening).toBeDisabled();
    expect(listening.closest("label")).toHaveTextContent(
      "서비스에서 사용 중지됨 · 개인 선택 보존",
    );
    fireEvent.click(listening);
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "이름" }), {
      target: { value: "새 이름" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload()).not.toHaveProperty("menus");
  });
  it("a destination with listening enabled still follows the service switch", async () => {
    const account: ManagedAccount = {
      ...owner,
      configuredMenus: ["home", "bank", "english-school", "english-listening"],
      unavailableMenus: ["english-listening"],
    };
    const target = {
      ...destination,
      menus: ["bank", "english-listening"] as BranchSummary["menus"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...account,
              branchId: nextBranchId,
              branchMenus: target.menus,
              menus: ["bank"],
            },
          })
        : json(branchList([branch, target])),
    );
    render(<ReviewHarness initial={account} />);
    await screen.findByRole("option", { name: destination.name });
    fireEvent.change(screen.getByRole("combobox", { name: "지점" }), {
      target: { value: nextBranchId },
    });
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    const listening = screen.getByRole("checkbox", { name: /^영어듣기/ });
    expect(listening).not.toBeChecked();
    expect(listening).toBeDisabled();
    expect(listening.closest("label")).toHaveTextContent(
      "서비스에서 사용 중지됨 · 개인 선택 보존",
    );
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload()).toMatchObject({
      branchId: nextBranchId,
      expectedBranchId: branchId,
    });
    expect(payload()).not.toHaveProperty("menus");
  });
  it("missing availability metadata conservatively disables unknown listening access", () => {
    render(
      <ReviewHarness
        initial={{
          ...pendingAccount,
          configuredMenus: ["english-school", "english-listening"],
          branchMenus: null,
          menus: ["english-school"],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    const listening = screen.getByRole("checkbox", { name: /^영어듣기/ });
    expect(listening).not.toBeChecked();
    expect(listening).toBeDisabled();
    expect(listening.closest("label")).toHaveTextContent(
      "사용 가능 여부 확인 필요 · 개인 선택 보존",
    );
  });
  it("owners follow the branch checklist, retain blocked personal choices, and can edit allowed items", () => {
    render(<ReviewHarness />);
    expect(screen.getByRole("checkbox", { name: "오늘의 작업" })).toBeChecked();
    const blocked = screen.getByRole("checkbox", { name: /^시험지 만들기/ });
    expect(blocked).not.toBeChecked();
    expect(blocked).toBeDisabled();
    expect(blocked.closest("label")).toHaveTextContent(
      "지점에서 사용하지 않음 · 개인 선택 보존",
    );
    expect(screen.getByRole("checkbox", { name: "문제 추출" })).toBeEnabled();
    expect(
      screen.getByRole("checkbox", { name: "문제 추출" }),
    ).not.toBeChecked();
  });
  it("re-enabling a branch menu restores the personal choice without a user write", () => {
    const props = { onUpdate: vi.fn(), onLockChange: vi.fn() };
    const view = render(<AccountReview account={owner} {...props} />);
    expect(
      screen.getByRole("checkbox", { name: /^시험지 만들기/ }),
    ).not.toBeChecked();
    view.rerender(
      <AccountReview
        account={{
          ...owner,
          branchMenus: ["home", "bank", "studio"],
          menus: ["home", "bank"],
        }}
        {...props}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).toBeEnabled();
    expect(patches()).toHaveLength(0);
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
  });
  it("name-only saves omit menus and unchanged isAdmin, and include the current scope", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...owner, name: "수정 원장" } })
        : json(branchList()),
    );
    render(<ReviewHarness />);
    fireEvent.change(screen.getByRole("textbox", { name: "이름" }), {
      target: { value: "수정 원장" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload()).toEqual({
      name: "수정 원장",
      expectedUpdatedAt: owner.updatedAt,
      expectedBranchId: branchId,
    });
  });
  it("personal edits preserve legacy export and branch-disabled choices in the submitted draft", async () => {
    const account: ManagedAccount = {
      ...owner,
      configuredMenus: ["home", "bank", "export"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...account,
              configuredMenus: ["home", "bank", "export", "studio"],
              menus: ["home", "studio"],
            },
          })
        : json(branchList()),
    );
    render(<ReviewHarness initial={account} />);
    expect(
      screen.queryByLabelText("시험지 · 내보내기"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    expect(patches()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload().menus).toEqual(["home", "bank", "export", "studio"]);
    expect(payload()).not.toHaveProperty("isAdmin");
  });
  it("destination preview uses its menus and preserves the current personal draft", async () => {
    render(<ReviewHarness />);
    await screen.findByRole("option", { name: destination.name });
    fireEvent.change(screen.getByRole("combobox", { name: "지점" }), {
      target: { value: nextBranchId },
    });
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /^오늘의 작업/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /^오늘의 작업/ }),
    ).toBeDisabled();
    expect(patches()).toHaveLength(0);
  });
  it("unknown destination policy fails closed and prevents a move until known", async () => {
    fetchMock.mockResolvedValue(
      json(
        branchList([
          { ...destination, menus: undefined } as unknown as BranchSummary,
        ]),
      ),
    );
    render(<ReviewHarness />);
    await screen.findByRole("option", { name: destination.name });
    fireEvent.change(screen.getByRole("combobox", { name: "지점" }), {
      target: { value: nextBranchId },
    });
    screen.getAllByRole("checkbox").forEach((box) => {
      expect(box).not.toBeChecked();
      expect(box).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
  });
  it("highest administrators remain protected while their checks obey the cap and zero-menu notice", () => {
    render(
      <ReviewHarness
        initial={{ ...owner, isSuperAdmin: true, branchMenus: [], menus: [] }}
      />,
    );
    screen.getAllByRole("checkbox").forEach((box) => {
      expect(box).not.toBeChecked();
      expect(box).toBeDisabled();
    });
    expect(
      screen.getByText(/사용할 수 있는 메뉴가 없습니다/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "변경 저장" }),
    ).not.toBeInTheDocument();
  });
  it("rejects an unrepresentable personal English selection with actionable feedback", () => {
    render(
      <ReviewHarness
        initial={{
          ...pendingAccount,
          configuredMenus: [],
          branchMenus: null,
          menus: [],
        }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "자료은행" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "중 하나 이상도 선택해 주세요",
    );
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    expect(patches()).toHaveLength(0);
  });
  it("password reissue sends both guards and refreshes the revision for the next edit", async () => {
    const refreshed = { ...owner, updatedAt: "2026-10-03T12:00:00.000Z" };
    fetchMock.mockImplementation(async (url, init) =>
      String(url).endsWith("/password")
        ? json({ data: { initialPassword: "temporary-password" } })
        : init?.method === "PATCH"
          ? json({ data: { ...refreshed, name: "수정 원장" } })
          : String(url).endsWith(owner.id)
            ? json({ data: refreshed })
            : json(branchList()),
    );
    render(<ReviewHarness />);
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재발급" }));
    await screen.findByText("temporary-password");
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      expectedUpdatedAt: owner.updatedAt,
      expectedBranchId: branchId,
    });
    fireEvent.change(screen.getByRole("textbox", { name: "이름" }), {
      target: { value: "수정 원장" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("계정 변경을 저장했습니다.");
    expect(payload().expectedUpdatedAt).toBe(refreshed.updatedAt);
  });
});

describe("branch management scope and explicit saves", () => {
  it.each([true, false])(
    "branch selectors hide export and save its existing value unchanged (legacy grant: %s)",
    async (hasExport) => {
      const initial: BranchSummary = {
        ...branch,
        menus: hasExport ? ["home", "export"] : ["home"],
      };
      fetchMock.mockImplementation(async (_url, init) =>
        json({
          data: {
            ...initial,
            menuRevision: initial.menuRevision + 1,
            menus: JSON.parse(String(init?.body)).menus,
          },
        }),
      );
      render(<EditorHarness initial={initial} />);
      const summary = screen.getByLabelText("지점 메뉴 변경 요약");
      expect(summary).toHaveTextContent("사용 메뉴 1개");
      expect(
        screen.queryByLabelText("시험지 · 내보내기"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("추가 기능 권한")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: "시험지 만들기" }));
      expect(summary).toHaveTextContent("사용 메뉴 2개");
      fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
      expect(
        screen.queryByLabelText("시험지 · 내보내기"),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: "문제 보관함" }));
      expect(summary).toHaveTextContent("사용 메뉴 3개");
      fireEvent.click(screen.getByRole("button", { name: "변경 취소" }));
      expect(summary).toHaveTextContent("사용 메뉴 1개");
      expect(patches()).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "사용 메뉴 저장" }),
      ).toBeDisabled();
      fireEvent.click(screen.getByRole("tab", { name: "오늘 수학" }));
      fireEvent.click(screen.getByRole("checkbox", { name: "시험지 만들기" }));
      fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
      await screen.findByText(/지점 사용 메뉴를 저장했습니다/);
      expect(payload()).toEqual({
        menus: [...initial.menus, "bank"],
        expectedMenuRevision: initial.menuRevision,
      });
      expect(summary).toHaveTextContent("사용 메뉴 2개");
      expect(
        screen.getByRole("button", { name: "사용 메뉴 저장" }),
      ).toBeDisabled();
    },
  );
  it("a branch with only legacy export displays zero selectable menus", () => {
    render(<EditorHarness initial={{ ...branch, menus: ["export"] }} />);
    expect(screen.getByLabelText("지점 메뉴 변경 요약")).toHaveTextContent(
      "사용 메뉴 0개",
    );
    expect(
      screen.getByText(/사용할 수 있는 메뉴가 없습니다/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("시험지 · 내보내기"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "사용 메뉴 저장" }),
    ).toBeDisabled();
  });
  it("preserves branch creation and the one-time initial password flow", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "POST"
        ? json({
            data: {
              branch: { id: branchId, name: "새 학원" },
              owner: {
                id: owner.id,
                name: "새 원장",
                email: "new@example.com",
              },
              initialPassword: "created-password",
            },
          })
        : json(branchList()),
    );
    render(<AdminBranches identity={adminIdentity} />);
    await screen.findAllByRole("link", { name: "지점 관리 →" });
    fireEvent.change(screen.getByRole("textbox", { name: "지점명" }), {
      target: { value: "새 학원" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "원장 이름" }), {
      target: { value: "새 원장" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "원장 이메일" }), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "지점 만들기" }));
    await screen.findByText("created-password");
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      branchName: "새 학원",
      ownerName: "새 원장",
      ownerEmail: "new@example.com",
    });
  });
  it("preserves name-only branch updates without changing menu policy", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...branch, name: "새 지점명" } })
        : json(branchList([branch])),
    );
    render(<AdminBranches identity={adminIdentity} />);
    fireEvent.click(await screen.findByRole("button", { name: "지점명 변경" }));
    const inputs = screen.getAllByRole("textbox", { name: "지점명" });
    fireEvent.change(inputs[1], { target: { value: "새 지점명" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("지점명을 변경했습니다.");
    expect(payload()).toEqual({ name: "새 지점명" });
  });
  it("keeps the menu draft on a failed save and permits an explicit retry", async () => {
    let writes = 0;
    fetchMock.mockImplementation(async () =>
      ++writes === 1
        ? json({ message: "저장 실패" }, 500)
        : json({ data: { ...branch, menuRevision: 4, menus: ["home"] } }),
    );
    render(<EditorHarness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    await screen.findByText("저장 실패");
    expect(
      screen.getByRole("checkbox", { name: "문제 추출" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "사용 메뉴 저장" }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    await screen.findByText(/지점 사용 메뉴를 저장했습니다/);
    expect(patches()).toHaveLength(2);
  });
  it("branch cards use management links, current counts, and a counted unassigned entry", async () => {
    fetchMock.mockResolvedValue(
      json(
        branchList([
          { ...branch, menus: [...branch.menus, "export"] },
          { ...destination, menus: ["export"] },
        ]),
      ),
    );
    render(<AdminBranches identity={adminIdentity} />);
    const links = await screen.findAllByRole("link", { name: "지점 관리 →" });
    expect(links[0]).toHaveAttribute("href", `/admin/branches/${branchId}`);
    expect(links[0].parentElement).toHaveTextContent(
      "계정 2명 · 승인 대기 1명 · 사용 메뉴 2개",
    );
    expect(links[1].parentElement).toHaveTextContent("사용 메뉴 0개");
    const unassigned = screen.getByRole("link", { name: "미소속 계정 관리 →" });
    expect(unassigned).toHaveAttribute("href", "/admin/branches/unassigned");
    expect(unassigned.parentElement).toHaveTextContent(
      "계정 4명 · 승인 대기 2명",
    );
    expect(
      screen.queryByRole("link", { name: "계정 관리" }),
    ).not.toBeInTheDocument();
  });
  it("account URLs, search, status, pagination and displayed counts keep the current branch", async () => {
    fetchMock.mockResolvedValue(
      json(
        accountsResponse([owner], {
          total: 51,
          counts: { all: 51, pending: 7, approved: 44, rejected: 0 },
          lifecycleCounts: { suspended: 2, deleted: 3 },
        }),
      ),
    );
    render(
      <AdminAccounts
        identity={adminIdentity}
        branchId={branchId}
        branchName={branch.name}
      />,
    );
    const accountHref = new URL(
      (await screen.findByRole("link", { name: owner.name })).getAttribute(
        "href",
      )!,
      "http://localhost",
    );
    expect(accountHref.pathname).toBe(
      `/admin/branches/${branchId}/users/${owner.id}`,
    );
    // Since 2026-10-04 the link also says where to come back to: this branch's list, this row selected.
    expect(accountHref.searchParams.get("returnTo")).toBe(
      `/admin/branches/${branchId}?selection=${owner.id}`,
    );
    expect(
      screen.getByRole("button", { name: "승인 대기 7개" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /전체 계정.*활성 목록/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain("page=2"),
    );
    fireEvent.click(screen.getByRole("button", { name: "정지 2개" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain(
        "lifecycle=suspended",
      ),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "이름 또는 이메일 검색" }),
      { target: { value: "원장" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(
        new URL(
          String(fetchMock.mock.lastCall?.[0]),
          "http://localhost",
        ).searchParams.get("q"),
      ).toBe("원장"),
    );
    fetchMock.mock.calls.forEach(([url]) =>
      expect(
        new URL(String(url), "http://localhost").searchParams.get("branchId"),
      ).toBe(branchId),
    );
  });
  it("moving an account refreshes the old list and navigates to the new canonical scope", async () => {
    fetchMock.mockImplementation(async (url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...owner,
              branchId: nextBranchId,
              branchMenus: destination.menus,
              branchName: destination.name,
              menus: ["bank"],
            },
          })
        : String(url).startsWith("/api/admin/users?")
          ? json(accountsResponse([owner]))
          : json(branchList()),
    );
    render(
      <AdminAccounts
        identity={adminIdentity}
        branchId={branchId}
        branchName={branch.name}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: `${owner.name} 계정 검토` }),
    );
    await screen.findByRole("option", { name: destination.name });
    fireEvent.change(screen.getByRole("combobox", { name: "지점" }), {
      target: { value: nextBranchId },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        `/admin/branches/${nextBranchId}/users/${owner.id}`,
      ),
    );
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(payload()).toMatchObject({
      branchId: nextBranchId,
      expectedBranchId: branchId,
    });
    expect(payload()).not.toHaveProperty("menus");
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) =>
          String(url).startsWith("/api/admin/users?"),
        ).length,
      ).toBeGreaterThan(1),
    );
  });
  it("branch menu changes have explicit impact and save; a 409 reload uses the new revision", async () => {
    let writes = 0;
    const latest = {
      ...branch,
      menuRevision: 4,
      menus: ["home", "bank"] as BranchSummary["menus"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? ++writes === 1
          ? json({ message: "changed" }, 409)
          : json({
              data: {
                ...latest,
                menuRevision: 5,
                menus: ["home", "bank", "studio"],
              },
            })
        : json({ data: latest }),
    );
    render(<EditorHarness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    expect(patches()).toHaveLength(0);
    expect(screen.getByLabelText("지점 메뉴 변경 요약")).toHaveTextContent(
      "원장·관리자·강사",
    );
    expect(screen.getByLabelText("지점 메뉴 변경 요약")).toHaveTextContent(
      "끄기: 문제 추출",
    );
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    await screen.findByText(/다른 관리자가 지점 메뉴를 변경했습니다/);
    expect(payload()).toEqual({ menus: ["home"], expectedMenuRevision: 3 });
    expect(
      screen.getByRole("button", { name: "사용 메뉴 저장" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "최신 설정 불러오기" }));
    await screen.findByText(/최신 지점 설정을 불러왔습니다/);
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    await screen.findByText(/지점 사용 메뉴를 저장했습니다/);
    expect(payload().expectedMenuRevision).toBe(4);
  });
  it("branch English checklist allows exact bank-only policy", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      json({
        data: { ...branch, menus: JSON.parse(String(init?.body)).menus },
      }),
    );
    const onUpdate = vi.fn();
    render(
      <BranchMenuEditor
        branch={{ ...branch, menus: [] }}
        onUpdate={onUpdate}
        onLockChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "오늘 영어" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "자료은행" }));
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴 저장" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(payload().menus).toEqual(["english-bank"]);
  });
  it("menu drafts block tab navigation and branch links until cancelled", async () => {
    fetchMock.mockImplementation(async (url) =>
      String(url).startsWith("/api/admin/users?")
        ? json(accountsResponse([owner]))
        : String(url) === "/api/admin/branches"
          ? json(branchList())
          : json({ data: { ...branch, menus: [...branch.menus, "export"] } }),
    );
    render(
      <AdminBranchDetail
        identity={adminIdentity}
        branchId={branchId}
        branchName={branch.name}
      />,
    );
    await screen.findByRole("link", { name: owner.name });
    await screen.findByText(/계정 2명 · 승인 대기 1명 · 사용 메뉴 2개/);
    fireEvent.click(screen.getByRole("button", { name: "사용 메뉴" }));
    expect(screen.getByLabelText("지점 메뉴 변경 요약")).toHaveTextContent(
      "사용 메뉴 2개",
    );
    fireEvent.click(await screen.findByRole("checkbox", { name: "문제 추출" }));
    // The areas are «교직원 계정 · 학생 계정 · 반 관리 · 사용 메뉴» since 2026-10-05 (was «계정 · 사용 메뉴»).
    const otherAreas = ["교직원 계정", "학생 계정", "반 관리"];
    for (const name of otherAreas)
      expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(
      fireEvent.click(
        screen.getByRole("link", { name: /지점 목록으로 돌아가기/ }),
      ),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "변경 취소" }));
    for (const name of otherAreas)
      expect(screen.getByRole("button", { name })).toBeEnabled();
  });
  it("an account response moved out of scope is hidden behind an explicit current-scope link", async () => {
    fetchMock.mockResolvedValue(
      json({ data: { ...owner, branchId: nextBranchId } }),
    );
    render(
      <AdminUserDetail
        userId={owner.id}
        branchId={branchId}
        identity={adminIdentity}
      />,
    );
    await screen.findByText("계정의 소속 지점이 변경되었습니다.");
    expect(
      screen.queryByRole("heading", { name: owner.name }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "현재 지점에서 다시 열기" }),
    ).toHaveAttribute(
      "href",
      `/admin/branches/${nextBranchId}/users/${owner.id}`,
    );
  });
});
