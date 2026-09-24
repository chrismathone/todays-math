import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/admin/page";
import AdminSrsPage from "@/app/admin/math-srs/page";
import AdminUserPage from "@/app/admin/users/[id]/page";
import BranchPage from "@/app/branch/page";
import ApprovalPendingPage from "@/app/approval-pending/page";
import {
  adminAccount,
  approvedAccount,
  pendingAccount,
  rejectedAccount,
} from "./adminFixtures";

const access = vi.hoisted(() => vi.fn());
const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/accountAccess", () => ({ getAccountAccess: access }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique } } }));
vi.mock("@/lib/adminAccounts", () => ({
  managedAccountSelect: { id: true },
  managedAccount: (account: unknown) => account,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/components/admin/AdminAccounts", () => ({
  default: () => <span>admin-screen</span>,
}));
vi.mock("@/components/admin/AdminHeader", () => ({
  default: () => <span>admin-header</span>,
}));
vi.mock("@/components/math-srs/CourseDashboard", () => ({
  default: ({ admin }: { admin?: boolean }) => (
    <span>{admin ? "all-student-srs" : "owned-student-srs"}</span>
  ),
}));
vi.mock("@/components/admin/AdminUserDetail", () => ({
  default: ({ userId }: { userId: string }) => (
    <span>{`detail:${userId}`}</span>
  ),
}));
vi.mock("@/components/unified/TeachingView", () => ({
  default: () => <span>branch-screen</span>,
}));
vi.mock("@/components/approval-pending/ApprovalPending", () => ({
  default: () => <span>pending-screen</span>,
}));

beforeEach(() => {
  access.mockReset();
  findUnique.mockReset();
  findUnique.mockResolvedValue(pendingAccount);
});

describe("account page server gates", () => {
  it("protects the SRS administrator page itself, independently of the proxy", async () => {
    access.mockResolvedValue(null);
    await expect(AdminSrsPage()).rejects.toThrow(
      "redirect:/login?callbackUrl=%2Fadmin%2Fmath-srs",
    );
    access.mockResolvedValue(pendingAccount);
    await expect(AdminSrsPage()).rejects.toThrow("redirect:/approval-pending");
    access.mockResolvedValue(approvedAccount);
    await expect(AdminSrsPage()).rejects.toThrow("redirect:/");
    access.mockResolvedValue(adminAccount);
    render(await AdminSrsPage());
    expect(screen.getByText("all-student-srs")).toBeInTheDocument();
  });
  it("redirects anonymous admin visitors to the admin callback login", async () => {
    access.mockResolvedValue(null);
    await expect(AdminPage()).rejects.toThrow(
      "redirect:/login?callbackUrl=%2Fadmin",
    );
  });
  it.each([pendingAccount, rejectedAccount])(
    "keeps unapproved account $approvalStatus out of admin",
    async (account) => {
      access.mockResolvedValue(account);
      await expect(AdminPage()).rejects.toThrow("redirect:/approval-pending");
    },
  );
  it("keeps an approved non-admin out of admin", async () => {
    access.mockResolvedValue(approvedAccount);
    await expect(AdminPage()).rejects.toThrow("redirect:/");
  });
  it("renders administration for an approved administrator", async () => {
    access.mockResolvedValue(adminAccount);
    render(await AdminPage());
    expect(screen.getByText("admin-screen")).toBeInTheDocument();
  });
  it("gives branch managers their own page but not the higher management page", async () => {
    access.mockResolvedValue({
      ...adminAccount,
      isSuperAdmin: false,
      branchId: "55555555-5555-4555-8555-555555555555",
      branchRole: "manager",
    });
    await expect(AdminPage()).rejects.toThrow("redirect:/");
    render(await BranchPage());
    expect(
      screen.getByRole("heading", { name: "지점관리" }),
    ).toBeInTheDocument();
    const branchTabs = within(
      screen.getByRole("navigation", { name: "지점관리 세부 메뉴" }),
    );
    expect(branchTabs.getByRole("link", { name: "반 관리" })).toHaveAttribute(
      "href",
      "/branch?tab=classes",
    );
    expect(branchTabs.getByRole("link", { name: "계정 관리" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
  it("opens class management within the branch tabs", async () => {
    access.mockResolvedValue({
      ...adminAccount,
      isSuperAdmin: false,
      branchId: "55555555-5555-4555-8555-555555555555",
      branchRole: "manager",
    });
    render(
      await BranchPage({ searchParams: Promise.resolve({ tab: "classes" }) }),
    );
    expect(screen.getByText("branch-screen")).toBeInTheDocument();
    const branchTabs = within(
      screen.getByRole("navigation", { name: "지점관리 세부 메뉴" }),
    );
    expect(branchTabs.getByRole("link", { name: "반 관리" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
  it("gates the detail page and selects the requested user's documents", async () => {
    access.mockResolvedValue(null);
    await expect(
      AdminUserPage({ params: Promise.resolve({ id: pendingAccount.id }) }),
    ).rejects.toThrow(
      `redirect:/login?callbackUrl=%2Fadmin%2Fusers%2F${pendingAccount.id}`,
    );
    access.mockResolvedValue(adminAccount);
    render(
      await AdminUserPage({
        params: Promise.resolve({ id: pendingAccount.id }),
      }),
    );
    expect(screen.getByText(`detail:${pendingAccount.id}`)).toBeInTheDocument();
  });
  it("redirects waiting-page guests and approved accounts", async () => {
    access.mockResolvedValue(null);
    await expect(ApprovalPendingPage()).rejects.toThrow(
      "redirect:/login?callbackUrl=%2Fapproval-pending",
    );
    access.mockResolvedValue(approvedAccount);
    await expect(ApprovalPendingPage()).rejects.toThrow("redirect:/");
  });
  it.each([pendingAccount, rejectedAccount])(
    "renders current $approvalStatus status on waiting page",
    async (account) => {
      access.mockResolvedValue(account);
      render(await ApprovalPendingPage());
      expect(screen.getByText("pending-screen")).toBeInTheDocument();
    },
  );
});
