import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApprovalPending from "@/components/approval-pending/ApprovalPending";
import { signOutAction } from "@/app/actions/auth";
import {
  pendingAccount,
  rejectedAccount,
  approvedAccount,
} from "./adminFixtures";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("approval waiting screen", () => {
  it("shows the applicant and checks fresh access before going to workroom", async () => {
    fetchMock.mockResolvedValue(Response.json({ data: approvedAccount }));
    render(<ApprovalPending account={pendingAccount} />);
    expect(screen.getByText("haneul@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "선생님의 작업실을",
    );
    fireEvent.click(screen.getByRole("button", { name: "승인 상태 새로고침" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/account/access", {
      cache: "no-store",
    });
    expect(router.refresh).toHaveBeenCalledOnce();
  });
  it("updates rejection status, reports a failed refresh, and submits real logout action", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: rejectedAccount }));
    render(<ApprovalPending account={pendingAccount} />);
    fireEvent.click(screen.getByRole("button", { name: "승인 상태 새로고침" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "가입 승인이거절되었습니다.",
      ),
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    fetchMock.mockRejectedValueOnce(new Error("연결을 확인해 주세요."));
    fireEvent.click(screen.getByRole("button", { name: "승인 상태 새로고침" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결을 확인해 주세요.",
    );
    fireEvent.submit(
      screen.getByRole("button", { name: "로그아웃" }).closest("form")!,
    );
    await waitFor(() => expect(signOutAction).toHaveBeenCalledOnce());
  });
  it("returns expired sessions to login with a waiting-page callback", async () => {
    fetchMock.mockResolvedValue(Response.json({}, { status: 401 }));
    render(<ApprovalPending account={pendingAccount} />);
    fireEvent.click(screen.getByRole("button", { name: "승인 상태 새로고침" }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/login?callbackUrl=%2Fapproval-pending",
      ),
    );
  });
});
