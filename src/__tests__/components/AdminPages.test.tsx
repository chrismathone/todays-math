import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import AdminPage from "@/app/admin/page";
import AdminSrsPage from "@/app/admin/math-srs/page";
import AdminUserPage from "@/app/admin/users/[id]/page";
import AdminBranchPage from "@/app/admin/branches/[id]/page";
import AdminBranchUserPage from "@/app/admin/branches/[id]/users/[userId]/page";
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
const findBranch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/accountAccess", () => ({ getAccountAccess: access }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique }, branch: { findUnique: findBranch } },
}));
vi.mock("@/lib/adminAccounts", () => ({
  managedAccountSelect: { id: true },
  managedAccount: (account: unknown) => account,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/components/admin/AdminBranchDetail", () => ({
  default: ({ branchId }: { branchId: string }) => (
    <span>branch:{branchId}</span>
  ),
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
  server.use(
    http.get("/api/branch/accounts", () => HttpResponse.json({ data: [] })),
    http.get("/api/branch/classes", () => HttpResponse.json({ data: [] })),
  );
  access.mockReset();
  findUnique.mockReset();
  findBranch.mockReset();
  findBranch.mockResolvedValue({ name: "강남학원" });
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
  it("redirects an approved highest administrator to branches", async () => {
    access.mockResolvedValue(adminAccount);
    await expect(AdminPage()).rejects.toThrow("redirect:/admin/branches");
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
    expect(
      branchTabs.getAllByRole("link").map((link) => link.getAttribute("href")),
    ).toEqual([
      "/branch?tab=classes",
      "/branch?tab=students",
      "/branch?tab=accounts",
    ]);
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
    expect(
      screen.queryByRole("heading", { name: "학생 반 배정" }),
    ).not.toBeInTheDocument();
  });
  it("opens student assignment in its own branch tab", async () => {
    access.mockResolvedValue({
      ...adminAccount,
      isSuperAdmin: false,
      branchId: "55555555-5555-4555-8555-555555555555",
      branchRole: "manager",
    });
    render(
      await BranchPage({ searchParams: Promise.resolve({ tab: "students" }) }),
    );
    const branchTabs = within(
      screen.getByRole("navigation", { name: "지점관리 세부 메뉴" }),
    );
    expect(
      branchTabs.getByRole("link", { name: "학생 반 배정" }),
    ).toHaveAttribute("href", "/branch?tab=students");
    expect(
      branchTabs.getByRole("link", { name: "학생 반 배정" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("heading", { name: "학생 반 배정" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("branch-screen")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "반 담당 강사 배정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "직원 계정 발급" }),
    ).not.toBeInTheDocument();
  });
  it("gates the detail page and selects the requested user's documents", async () => {
    access.mockResolvedValue(null);
    await expect(
      AdminUserPage({ params: Promise.resolve({ id: pendingAccount.id }) }),
    ).rejects.toThrow(
      `redirect:/login?callbackUrl=%2Fadmin%2Fusers%2F${pendingAccount.id}`,
    );
    access.mockResolvedValue(adminAccount);
    await expect(
      AdminUserPage({
        params: Promise.resolve({ id: pendingAccount.id }),
      }),
    ).rejects.toThrow(
      `redirect:/admin/branches/unassigned/users/${pendingAccount.id}`,
    );
  });
  it("opens only the canonical account scope and rejects mismatched or malformed scope", async () => {
    access.mockResolvedValue(adminAccount);
    render(
      await AdminBranchUserPage({
        params: Promise.resolve({
          id: "unassigned",
          userId: pendingAccount.id,
        }),
      }),
    );
    expect(screen.getByText(`detail:${pendingAccount.id}`)).toBeInTheDocument();
    await expect(
      AdminBranchUserPage({
        params: Promise.resolve({
          id: "55555555-5555-4555-8555-555555555555",
          userId: pendingAccount.id,
        }),
      }),
    ).rejects.toThrow("not-found");
    await expect(
      AdminBranchUserPage({
        params: Promise.resolve({ id: "wrong", userId: pendingAccount.id }),
      }),
    ).rejects.toThrow("not-found");
    await expect(
      AdminBranchUserPage({
        params: Promise.resolve({ id: "unassigned", userId: "wrong" }),
      }),
    ).rejects.toThrow("not-found");
  });
  it("legacy bookmarks follow the current branch and missing users return 404", async () => {
    access.mockResolvedValue(adminAccount);
    const branchId = "55555555-5555-4555-8555-555555555555";
    findUnique.mockResolvedValue({ ...pendingAccount, branchId });
    await expect(
      AdminUserPage({ params: Promise.resolve({ id: pendingAccount.id }) }),
    ).rejects.toThrow(
      `redirect:/admin/branches/${branchId}/users/${pendingAccount.id}`,
    );
    findUnique.mockResolvedValue(null);
    await expect(
      AdminUserPage({ params: Promise.resolve({ id: pendingAccount.id }) }),
    ).rejects.toThrow("not-found");
  });
  it("validates branch existence, supports unassigned, and keeps the highest-admin gate", async () => {
    access.mockResolvedValue(adminAccount);
    render(
      await AdminBranchPage({ params: Promise.resolve({ id: "unassigned" }) }),
    );
    expect(screen.getByText("branch:unassigned")).toBeInTheDocument();
    expect(findBranch).not.toHaveBeenCalled();
    await expect(
      AdminBranchPage({ params: Promise.resolve({ id: "wrong" }) }),
    ).rejects.toThrow("not-found");
    findBranch.mockResolvedValue(null);
    await expect(
      AdminBranchPage({
        params: Promise.resolve({ id: "55555555-5555-4555-8555-555555555555" }),
      }),
    ).rejects.toThrow("not-found");
    access.mockResolvedValue({
      ...approvedAccount,
      isAdmin: true,
      isSuperAdmin: false,
    });
    await expect(
      AdminBranchPage({ params: Promise.resolve({ id: "unassigned" }) }),
    ).rejects.toThrow("redirect:/");
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
