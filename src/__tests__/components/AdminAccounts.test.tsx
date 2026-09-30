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
import { signOutAction } from "@/app/actions/auth";
import {
  accountsResponse,
  adminIdentity,
  pendingAccount,
} from "./adminFixtures";

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
