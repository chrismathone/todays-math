import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";

const signIn = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

it("recovers from a validation chunk import failure without an unhandled rejection", async () => {
  vi.doMock("@/contracts/auth.contract", () => {
    throw new Error("Failed to fetch dynamically imported module");
  });
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText("이메일 또는 학생 아이디"), {
    target: { value: "teacher@example.com" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "password123" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "로그인" }).closest("form")!,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "연결이 원활하지 않아요",
  );
  expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
  expect(signIn).not.toHaveBeenCalled();
});
