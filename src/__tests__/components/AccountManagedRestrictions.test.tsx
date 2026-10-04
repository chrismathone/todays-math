import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountReview from "@/components/admin/AccountReview";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { approvedAccount } from "./adminFixtures";

afterEach(() => vi.unstubAllGlobals());
const branchId = "33333333-3333-4333-8333-333333333333";
const account = {
  ...approvedAccount,
  branchId,
  branchName: "테스트 지점",
  branchRole: "teacher" as const,
  branchMenus: ALL_WORKSPACE_MENUS,
  configuredMenus: ALL_WORKSPACE_MENUS,
  unavailableMenus: [],
  menus: ALL_WORKSPACE_MENUS,
  branchAssignmentLocked: true,
};
describe("managed account editor", () => {
  it("locks source-managed assignment while keeping profile and menu edits available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ data: [] })),
    );
    render(
      <AccountReview
        account={account}
        onUpdate={vi.fn()}
        onLockChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("지점")).toBeDisabled();
    expect(screen.getByLabelText("계정 유형")).toBeEnabled();
    expect(screen.getByLabelText("이름")).toBeEnabled();
    expect(screen.getByLabelText("오늘의 작업")).toBeEnabled();
    expect(
      screen.getByText(/에이와 연동 계정의 소속 지점은/),
    ).toBeInTheDocument();
  });
  it("saves a managed account type without attempting a source branch edit", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async (_url, init) =>
        init?.method === "PATCH"
          ? Response.json({
              data: { ...account, branchRole: "manager", isAdmin: true },
            })
          : Response.json({ data: [] }),
      );
    vi.stubGlobal("fetch", fetch);
    render(
      <AccountReview
        account={account}
        onUpdate={vi.fn()}
        onLockChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("계정 유형"), {
      target: { value: "manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "계정 변경을 저장했습니다.",
      ),
    );
    const request = fetch.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    )!;
    expect(JSON.parse(request[1].body)).toEqual({
      expectedUpdatedAt: account.updatedAt,
      expectedBranchId: branchId,
      branchRole: "manager",
    });
  });
  it("displays an action restriction and allows correcting the draft without a login loop", async () => {
    const message =
      "마지막 활성 원장은 소속·계정 유형을 변경하거나 정지·삭제할 수 없습니다.";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async (_url, init) =>
          init?.method === "PATCH"
            ? Response.json(
                { error: { code: "ACTION_NOT_ALLOWED", message } },
                { status: 403 },
              )
            : Response.json({ data: [] }),
        ),
    );
    render(
      <AccountReview
        account={account}
        onUpdate={vi.fn()}
        onLockChange={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "수정한 이름" },
    });
    fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(message),
    );
    expect(screen.queryByText("로그인 상태 다시 확인")).not.toBeInTheDocument();
    expect(screen.getByLabelText("오늘의 작업")).toBeEnabled();
  });
});
