import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminHeader from "@/components/admin/AdminHeader";
const identity = { name: "관리자", email: "manager@example.test" };
describe("Eywa administrator shell", () => {
  it("shows highest administrator branch and SRS links with active Eywa navigation", () => {
    render(<AdminHeader identity={identity} active="eywa" isSuperAdmin />);
    expect(screen.getByRole("link", { name: "에이와 연결" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /지점 관리/ })).toHaveAttribute("href", "/admin/branches");
    expect(screen.getByRole("link", { name: /SRS 현황/ })).toHaveAttribute("href", "/admin/math-srs");
  });
  it("returns a branch manager to its own branch without platform links", () => {
    render(<AdminHeader identity={identity} active="eywa" isSuperAdmin={false} />);
    expect(screen.getByRole("link", { name: "에이와 연결" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /내 지점 관리/ })).toHaveAttribute("href", "/branch");
    expect(screen.queryByRole("link", { name: /SRS 현황/ })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/admin/branches"]')).toBeNull();
  });
});
