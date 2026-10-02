import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAccounts from "@/components/admin/AdminAccounts";
import AccountReview from "@/components/admin/AccountReview";
import { signOutAction } from "@/app/actions/auth";
import {
  accountsResponse,
  adminIdentity,
  adminAccount,
  pendingAccount,
} from "./adminFixtures";
import {
  accountUpdateSchema,
  type ManagedAccount,
} from "@/contracts/accountAccess.contract";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(json(accountsResponse()));
});
afterEach(() => vi.unstubAllGlobals());

describe("account menu product tabs", () => {
  const mathLabels = [
    "오늘의 작업",
    "시험지 만들기",
    "문제 추출",
    "내 시험지",
    "수업 · 학생 관리",
    "오늘의 개념",
    "개념 백지",
    "오늘의 기억 · SRS",
  ];
  function review(account: ManagedAccount = pendingAccount) {
    const onLockChange = vi.fn();
    const onUpdate = vi.fn();
    render(
      <AccountReview
        account={account}
        onLockChange={onLockChange}
        onUpdate={onUpdate}
      />,
    );
    return { onLockChange, onUpdate };
  }
  const tab = (name: string) => screen.getByRole("tab", { name });
  const panel = () => within(screen.getByRole("tabpanel"));
  const labels = () =>
    panel()
      .getAllByRole("checkbox")
      .map((input) => input.closest("label")?.textContent);

  it.each([
    [null, "내 시험지"],
    ["branch-id", "우리학원 시험지"],
  ])(
    "uses the target branch %s for library labels in sidebar order",
    (branchId, libraryLabel) => {
      review({ ...pendingAccount, branchId });
      expect(tab("오늘의 수학")).toHaveAttribute("aria-selected", "true");
      expect(labels()).toEqual([
        ...mathLabels.map((label) =>
          label === "내 시험지" ? libraryLabel : label,
        ),
        "시험지 · 내보내기",
      ]);
      expect(
        panel().getByRole("heading", { name: "추가 기능 권한" }),
      ).toBeInTheDocument();
      expect(panel().getByRole("group")).toHaveAccessibleName(
        "오늘의 수학 2 / 8",
      );
    },
  );

  it("expands the legacy grant into three independently editable English menus", () => {
    const { onLockChange } = review({ ...pendingAccount, menus: ["english"] });
    fireEvent.click(tab("오늘의 영어"));
    expect(labels()).toEqual([
      "학교별 내신 대비",
      "문제 만들기",
      "문제 보관함",
    ]);
    panel()
      .getAllByRole("checkbox")
      .forEach((input) => expect(input).toBeChecked());
    expect(panel().getByRole("group")).toHaveAccessibleName(
      "오늘의 영어 3 / 3",
    );
    expect(onLockChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    expect(
      screen.getByRole("checkbox", { name: "문제 만들기" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "학교별 내신 대비" }),
    ).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "문제 보관함" })).toBeChecked();
  });

  it("preserves both product drafts and hidden export when approving", async () => {
    const account: ManagedAccount = {
      ...pendingAccount,
      menus: ["home", "bank", "export"],
    };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...account, ...JSON.parse(String(init.body)) } })
        : json({ data: [] }),
    );
    const { onLockChange } = review(account);
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    fireEvent.click(tab("오늘의 영어"));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    fireEvent.click(tab("오늘의 수학"));
    expect(screen.getByRole("checkbox", { name: "문제 추출" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "시험지 · 내보내기" }),
    ).toBeChecked();
    expect(onLockChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(tab("오늘의 영어"));
    expect(screen.getByRole("checkbox", { name: "문제 만들기" })).toBeChecked();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", { name: "계정 승인 · 메뉴 저장" }),
    );
    await screen.findByText("계정을 승인하고 선택한 메뉴를 저장했습니다.");
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(
      accountUpdateSchema.parse(JSON.parse(String(patch[1]?.body))),
    ).toEqual({
      expectedUpdatedAt: account.updatedAt,
      approvalStatus: "approved",
      menus: ["home", "bank", "export", "studio", "english-maker"],
    });
  });

  it("moves export to its sidebar position when every entry menu is off", () => {
    review({ ...pendingAccount, menus: ["export"] });
    expect(labels()).toEqual([
      ...mathLabels.slice(0, 3),
      "시험지 · 내보내기",
      ...mathLabels.slice(3),
    ]);
    expect(
      panel().queryByRole("heading", { name: "추가 기능 권한" }),
    ).not.toBeInTheDocument();
    for (const name of ["시험지 만들기", "문제 추출", "내 시험지"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
      expect(labels()).toEqual([...mathLabels, "시험지 · 내보내기"]);
      expect(
        screen.getByRole("checkbox", { name: "시험지 · 내보내기" }),
      ).toBeChecked();
      fireEvent.click(screen.getByRole("checkbox", { name }));
    }
    expect(
      panel().queryByRole("heading", { name: "추가 기능 권한" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
  });

  it("updates the library label immediately with a branch draft and saves it with English permissions", async () => {
    const branchId = "22222222-2222-4222-8222-222222222222";
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: { ...pendingAccount, ...JSON.parse(String(init.body)) },
          })
        : json({ data: [{ id: branchId, name: "새 지점" }] }),
    );
    review();
    await screen.findByRole("option", { name: "새 지점" });
    fireEvent.change(screen.getByRole("combobox", { name: "지점" }), {
      target: { value: branchId },
    });
    expect(
      screen.getByRole("checkbox", { name: "우리학원 시험지" }),
    ).toBeInTheDocument();
    fireEvent.click(tab("오늘의 영어"));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 보관함" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("사용 가능한 메뉴를 저장했습니다.");
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(String(patch[1]?.body))).toMatchObject({
      expectedUpdatedAt: pendingAccount.updatedAt,
      branchId,
      branchRole: "teacher",
      menus: ["home", "bank", "english-library"],
    });
  });

  it("saves a revoked legacy sub-menu without regranting it through english", async () => {
    const account: ManagedAccount = { ...pendingAccount, menus: ["english"] };
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...account, ...JSON.parse(String(init.body)) } })
        : json({ data: [] }),
    );
    review(account);
    fireEvent.click(tab("오늘의 영어"));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("사용 가능한 메뉴를 저장했습니다.");
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(String(patch[1]?.body)).menus).toEqual([
      "english-school",
      "english-library",
    ]);
  });

  it("supports arrow and boundary keys without dirtying the account", () => {
    const { onLockChange } = review();
    fireEvent.keyDown(tab("오늘의 수학"), { key: "ArrowRight" });
    expect(tab("오늘의 영어")).toHaveFocus();
    expect(tab("오늘의 영어")).toHaveAttribute("aria-selected", "true");
    expect(tab("오늘의 수학")).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(tab("오늘의 영어"), { key: "ArrowRight" });
    expect(tab("오늘의 수학")).toHaveFocus();
    fireEvent.keyDown(tab("오늘의 수학"), { key: "End" });
    expect(tab("오늘의 영어")).toHaveFocus();
    fireEvent.keyDown(tab("오늘의 영어"), { key: "Home" });
    expect(tab("오늘의 수학")).toHaveFocus();
    fireEvent.keyDown(tab("오늘의 수학"), { key: "ArrowLeft" });
    expect(tab("오늘의 영어")).toHaveFocus();
    expect(onLockChange).not.toHaveBeenCalled();
  });

  it("cancels menu edits in both tabs", () => {
    review();
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    fireEvent.click(tab("오늘의 영어"));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 취소" }));
    expect(
      screen.getByRole("checkbox", { name: "문제 만들기" }),
    ).not.toBeChecked();
    fireEvent.click(tab("오늘의 수학"));
    expect(
      screen.getByRole("checkbox", { name: "문제 추출" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).toBeChecked();
  });

  it("keeps other account edits locked when a menu toggle is undone", () => {
    const { onLockChange } = review();
    fireEvent.change(screen.getByRole("textbox", { name: "이름" }), {
      target: { value: "새 이름" },
    });
    fireEvent.click(tab("오늘의 영어"));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 만들기" }));
    expect(onLockChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeEnabled();
  });

  it.each([
    ["super admin", adminAccount],
    [
      "branch manager",
      { ...pendingAccount, isAdmin: true, branchId: "branch-id" },
    ],
    [
      "deleted account",
      { ...pendingAccount, deletedAt: pendingAccount.updatedAt },
    ],
  ])(
    "allows inspecting both products for %s while keeping permissions disabled",
    (_name, account) => {
      review(account);
      panel()
        .getAllByRole("checkbox")
        .forEach((input) => expect(input).toBeDisabled());
      fireEvent.click(tab("오늘의 영어"));
      expect(
        screen.getByRole("checkbox", { name: "문제 만들기" }),
      ).toBeDisabled();
      expect(tab("오늘의 영어")).toHaveAttribute("aria-selected", "true");
    },
  );

  it("blocks both tabs after a conflict and reloads the latest English grant", async () => {
    fetchMock.mockImplementation(async (url, init) =>
      init?.method === "PATCH"
        ? json({ error: { message: "changed" } }, 409)
        : String(url).endsWith(pendingAccount.id)
          ? json({
              data: {
                ...pendingAccount,
                menus: ["english"],
                updatedAt: "2026-09-14T11:00:00.000Z",
              },
            })
          : json({ data: [] }),
    );
    review();
    fireEvent.click(screen.getByRole("checkbox", { name: "문제 추출" }));
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText(/다른 관리자가 이 계정을 변경했습니다/);
    fireEvent.click(tab("오늘의 영어"));
    expect(
      screen.getByRole("checkbox", { name: "문제 만들기" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "최신 정보 불러오기" }));
    await screen.findByText(/최신 정보를 불러왔습니다/);
    expect(screen.getByRole("checkbox", { name: "문제 만들기" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "문제 만들기" })).toBeChecked();
    fireEvent.click(tab("오늘의 수학"));
    expect(
      screen.getByRole("checkbox", { name: "문제 추출" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "시험지 만들기" }),
    ).not.toBeChecked();
  });
});

describe("admin account management", () => {
  it("closes review with Escape and returns focus without discarding edited permissions", async () => {
    render(<AdminAccounts identity={adminIdentity} />);
    const trigger = await screen.findByRole("button", {
      name: "김하늘 계정 검토",
    });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("heading", { name: "김하늘" }), {
      key: "Escape",
    });
    expect(screen.getByText("검토할 계정을 선택하세요")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByLabelText("문제 추출"));
    expect(screen.getByRole("button", { name: "검토 닫기" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("heading", { name: "김하늘" }), {
      key: "Escape",
    });
    expect(screen.getByLabelText("문제 추출")).toBeChecked();
    expect(
      screen.getByText("변경을 저장하거나 취소한 뒤 닫을 수 있습니다."),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
  });
  it("shows authenticated identity, account links and invokes logout", async () => {
    render(<AdminAccounts identity={adminIdentity} />);
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "김하늘" })).toHaveAttribute(
      "href",
      `/admin/users/${pendingAccount.id}`,
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "로그아웃" }).closest("form")!,
    );
    await waitFor(() => expect(signOutAction).toHaveBeenCalledOnce());
  });

  it("searches, filters and resets pagination using the contract query", async () => {
    fetchMock.mockImplementation(async () =>
      json(accountsResponse(undefined, { total: 51 })),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(await screen.findByRole("button", { name: "다음 페이지" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain("page=2"),
    );
    fireEvent.change(screen.getByLabelText("이름 또는 이메일 검색"), {
      target: { value: "  haneul  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain(
        "q=haneul&status=all&page=1",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /승인 대기 1/ }));
    await waitFor(() =>
      expect(String(fetchMock.mock.lastCall?.[0])).toContain(
        "status=pending&page=1",
      ),
    );
  });

  it("does not write on a checkbox change and explicitly saves with expectedUpdatedAt", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...pendingAccount,
              menus: ["home", "bank", "studio"],
              updatedAt: "2026-09-14T10:00:00.000Z",
            },
          })
        : json(accountsResponse()),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "김하늘 계정 검토" }),
    );
    fireEvent.click(screen.getByLabelText("문제 추출"));
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "박지우 계정 검토" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("사용 가능한 메뉴를 저장했습니다.");
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(String(patch[1]?.body))).toEqual({
      expectedUpdatedAt: pendingAccount.updatedAt,
      menus: ["home", "bank", "studio"],
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "박지우 계정 검토" }),
      ).toBeEnabled(),
    );
  });

  it("approves with chosen menus and requires an explicit rejection confirmation", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({
            data: {
              ...pendingAccount,
              ...JSON.parse(String(init.body)),
              updatedAt: "2026-09-14T10:00:00.000Z",
            },
          })
        : json(accountsResponse()),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "김하늘 계정 검토" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "승인 거절" }));
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
    ).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "계정 승인 · 메뉴 저장" }),
    );
    await screen.findByText("계정을 승인하고 선택한 메뉴를 저장했습니다.");
    expect(
      JSON.parse(
        String(
          fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")?.[1]
            ?.body,
        ),
      ),
    ).toMatchObject({ approvalStatus: "approved", menus: ["home", "bank"] });
  });

  it("sends rejection without silently saving a menu draft", async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === "PATCH"
        ? json({ data: { ...pendingAccount, approvalStatus: "rejected" } })
        : json(accountsResponse()),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "김하늘 계정 검토" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "승인 거절" }));
    fireEvent.click(screen.getByRole("button", { name: "거절 확정" }));
    await screen.findByText("가입 승인을 거절했습니다.");
    expect(
      JSON.parse(
        String(
          fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")?.[1]
            ?.body,
        ),
      ),
    ).toEqual({
      approvalStatus: "rejected",
      expectedUpdatedAt: pendingAccount.updatedAt,
    });
  });

  it("keeps administrators read-only", async () => {
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "관리 선생님 계정 검토" }),
    );
    screen
      .getAllByRole("checkbox")
      .forEach((input) => expect(input).toBeDisabled());
    expect(
      screen.queryByRole("button", { name: "메뉴 변경 저장" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/관리자 계정은 보호됩니다/)).toBeInTheDocument();
  });

  it("blocks stale saves, reloads latest account data, and uses the new version", async () => {
    let writes = 0;
    const latest = {
      ...pendingAccount,
      menus: ["home"],
      updatedAt: "2026-09-14T11:00:00.000Z",
    };
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "PATCH")
        return ++writes === 1
          ? json({ error: { message: "changed" } }, 409)
          : json({ data: { ...latest, menus: ["home", "studio"] } });
      return String(url).endsWith(pendingAccount.id)
        ? json({ data: latest })
        : json(accountsResponse());
    });
    render(<AdminAccounts identity={adminIdentity} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "김하늘 계정 검토" }),
    );
    fireEvent.click(screen.getByLabelText("문제 추출"));
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText(/다른 관리자가 이 계정을 변경했습니다/);
    expect(
      screen.getByRole("button", { name: "계정 승인 · 메뉴 저장" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "최신 정보 불러오기" }));
    await screen.findByText(/최신 정보를 불러왔습니다/);
    expect(screen.getByLabelText("시험지 만들기")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("문제 추출"));
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await screen.findByText("사용 가능한 메뉴를 저장했습니다.");
    const patches = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "PATCH",
    );
    expect(JSON.parse(String(patches[1][1]?.body))).toMatchObject({
      expectedUpdatedAt: latest.updatedAt,
      menus: ["home", "studio"],
    });
  });

  it("shows loading, recoverable errors, empty results and permission failures", async () => {
    let resolve!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "계정 목록을 불러오는 중",
    );
    await act(async () => resolve(json({ message: "연결 오류" }, 500)));
    expect(screen.getByRole("alert")).toHaveTextContent("연결 오류");
    fetchMock.mockResolvedValueOnce(json(accountsResponse([])));
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByText("표시할 계정이 없습니다.");
    fetchMock.mockResolvedValueOnce(json({}, 403));
    fireEvent.click(screen.getByRole("button", { name: "목록 새로고침" }));
    expect(
      await screen.findByRole("link", { name: "로그인 상태 다시 확인" }),
    ).toHaveAttribute("href", "/admin");
  });

  it("ignores a late result from an earlier search", async () => {
    let resolveOld!: (value: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((done) => {
          resolveOld = done;
        }),
    );
    render(<AdminAccounts identity={adminIdentity} />);
    fetchMock.mockResolvedValueOnce(json(accountsResponse([])));
    fireEvent.change(screen.getByLabelText("이름 또는 이메일 검색"), {
      target: { value: "missing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "검색" }));
    await screen.findByText("검색 결과가 없습니다.");
    await act(async () => resolveOld(json(accountsResponse())));
    expect(
      screen.queryByRole("button", { name: "김하늘 계정 검토" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("status")).getByText("검색 결과가 없습니다."),
    ).toBeInTheDocument();
  });
});
