import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WorkspaceAccount from "@/components/unified/WorkspaceAccount";

describe("workspace account access", () => {
  it("keeps the account identity and management link at the right of the header", () => {
    render(
      <WorkspaceAccount
        user={{
          name: "김선생",
          email: "teacher@example.com",
          isAdmin: true,
        }}
      />,
    );
    expect(screen.getByText("김선생")).toBeInTheDocument();
    expect(
      screen.getByText("teacher@example.com").closest("button, a"),
    ).toBeNull();
    expect(screen.getByRole("link", { name: "지점관리" })).toHaveAttribute(
      "href",
      "/branch",
    );
    expect(screen.queryByRole("link", { name: "내정보" })).toBeNull();
    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });
});
