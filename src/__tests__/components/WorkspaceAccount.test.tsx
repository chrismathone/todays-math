import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signOutAction } from "@/app/actions/auth";
import WorkspaceAccount from "@/components/unified/WorkspaceAccount";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workspace account access", () => {
  it("shows the actual account identity and a working sign-out action", async () => {
    render(
      <WorkspaceAccount
        user={{ name: "김선생", email: "teacher@example.com" }}
      />,
    );
    expect(screen.getByText("김선생")).toBeInTheDocument();
    expect(
      screen.getByText("teacher@example.com").closest("button, a"),
    ).toBeNull();
    fireEvent.submit(
      screen.getByRole("button", { name: "로그아웃" }).closest("form")!,
    );
    await waitFor(() => expect(signOutAction).toHaveBeenCalledOnce());
  });
});
