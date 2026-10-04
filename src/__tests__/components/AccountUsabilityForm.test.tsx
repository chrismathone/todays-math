import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountReview from "@/components/admin/AccountReview";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { approvedAccount } from "./adminFixtures";

afterEach(() => vi.unstubAllGlobals());
const account = {
  ...approvedAccount,
  branchId: "33333333-3333-4333-8333-333333333333",
  branchName: "테스트 지점",
  branchRole: "teacher" as const,
  branchMenus: ALL_WORKSPACE_MENUS,
  configuredMenus: ALL_WORKSPACE_MENUS,
  unavailableMenus: [],
  menus: ALL_WORKSPACE_MENUS,
  branchAssignmentLocked: true,
  authSource: "local" as const,
};
const evidence =
  "독립적인 과거 승인 기록과 기존 인증 수단 소유를 확인했습니다.";

describe("account form usability", () => {
  it("clears the navigation lock when name and email return to the original", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [] })));
    const onLockChange = vi.fn();
    render(
      <AccountReview account={account} onUpdate={vi.fn()} onLockChange={onLockChange} />,
    );
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "다른 이름" },
    });
    expect(onLockChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "other@example.com" },
    });
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: account.email },
    });
    expect(onLockChange).toHaveBeenLastCalledWith(true);
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: account.name },
    });
    expect(onLockChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps an issued password when the follow-up read fails and retries only the read", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/password"))
        return Response.json({ data: { initialPassword: "Temp-Pass-1" } });
      if (String(url).includes("/api/admin/users/") && !init?.method)
        return Response.json({ error: { message: "read failed" } }, { status: 500 });
      return Response.json({ data: [] });
    });
    vi.stubGlobal("fetch", fetch);
    render(
      <AccountReview account={account} onUpdate={vi.fn()} onLockChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("복구 근거 (30자 이상)"), {
      target: { value: evidence },
    });
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재발급" }));
    expect(await screen.findByText("Temp-Pass-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "비밀번호 재발급" })).toBeDisabled();
    fetch.mockImplementation(async (url: string) =>
      String(url).includes("/api/admin/users/")
        ? Response.json({ data: { ...account, name: account.name } })
        : Response.json({ data: [] }),
    );
    fireEvent.click(screen.getByRole("button", { name: "계정 정보 다시 읽기" }));
    await waitFor(() =>
      expect(screen.getByText(/최신 정보를 불러왔습니다/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Temp-Pass-1")).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("does not retry a password POST when the response is lost", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("network down");
      return Response.json({ data: [] });
    });
    vi.stubGlobal("fetch", fetch);
    render(
      <AccountReview account={account} onUpdate={vi.fn()} onLockChange={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("복구 근거 (30자 이상)"), {
      target: { value: evidence },
    });
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재발급" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("알 수 없습니다");
    expect(screen.queryByText("Temp-Pass-1")).not.toBeInTheDocument();
    expect(screen.getByLabelText("복구 근거 (30자 이상)")).toHaveValue(evidence);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
  });

  it("shows source recovery only for an eywa authentication account", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: [] })));
    render(
      <AccountReview
        account={{ ...account, authSource: "eywa" }}
        onUpdate={vi.fn()}
        onLockChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "비밀번호 재발급" })).not.toBeInTheDocument();
    expect(screen.getByText(/원본 시스템에서만/)).toBeInTheDocument();
  });
});
