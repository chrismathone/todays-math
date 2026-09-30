import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { server } from "@/mocks/server";

const signIn = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function fill(identifier = " Student01 ", password = "1234") {
  fireEvent.change(screen.getByLabelText("이메일 또는 학생 아이디"), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: password },
  });
  return screen.getByRole("button", { name: "로그인" }).closest("form")!;
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockReset();
});

describe("통합 로그인", () => {
  it("하나의 입력칸과 로그인 버튼으로 두 종류의 계정을 안내한다", () => {
    render(<LoginForm />);
    const identifier = screen.getByLabelText("이메일 또는 학생 아이디");
    expect(identifier).toHaveAttribute("type", "text");
    expect(identifier).toHaveAttribute("inputmode", "text");
    expect(identifier).toHaveAttribute("autocomplete", "username");
    expect(identifier).toHaveAccessibleDescription(
      "선생님은 이메일, 학생은 발급받은 아이디를 입력하세요.",
    );
    expect(screen.getAllByRole("button", { name: "로그인" })).toHaveLength(1);
  });

  it.each([
    [true, "1234", "/learn/password"],
    [false, "student-password", "/learn"],
  ] as const)(
    "학생 로그인은 mustChangePassword=%s 일 때 학생 목적지로 이동한다",
    async (mustChangePassword, password, destination) => {
      const received = vi.fn();
      server.use(
        http.post("/api/learn/login", async ({ request }) => {
          received(await request.json());
          return HttpResponse.json({ data: { mustChangePassword } });
        }),
      );
      render(<LoginForm callbackUrl="/tests/new?classId=teacher-only" />);
      fireEvent.submit(fill(" Student01 ", password));
      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith(destination),
      );
      expect(received).toHaveBeenCalledExactlyOnceWith({
        loginId: "student01",
        password,
      });
      expect(router.refresh).toHaveBeenCalledOnce();
      expect(router.push).not.toHaveBeenCalled();
      expect(signIn).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "이동 중…" })).toBeDisabled();
    },
  );

  it("선생님 인증 실패를 학생 인증으로 재시도하지 않는다", async () => {
    const studentLogin = vi.fn();
    server.use(
      http.post("/api/learn/login", () => {
        studentLogin();
        return HttpResponse.json({ data: { mustChangePassword: false } });
      }),
    );
    signIn.mockResolvedValue({ ok: true, error: "CredentialsSignin" });
    render(<LoginForm />);
    fireEvent.submit(fill(" teacher@example.com ", "password123"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
    );
    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "teacher@example.com",
        password: "password123",
      }),
    );
    expect(studentLogin).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["", "이메일 또는 학생 아이디를 입력해 주세요."],
    ["bad id", "아이디"],
  ])(
    "잘못된 아이디 %s 는 입력칸에 오류를 표시하고 인증하지 않는다",
    async (identifier, message) => {
      const studentLogin = vi.fn();
      server.use(
        http.post("/api/learn/login", () => {
          studentLogin();
          return HttpResponse.json({ data: { mustChangePassword: false } });
        }),
      );
      render(<LoginForm />);
      fireEvent.submit(fill(identifier));
      await screen.findByRole("alert");
      const input = screen.getByLabelText("이메일 또는 학생 아이디");
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input.getAttribute("aria-describedby")).toContain("email-error");
      expect(document.getElementById("email-error")).toHaveTextContent(message);
      expect(studentLogin).not.toHaveBeenCalled();
      expect(signIn).not.toHaveBeenCalled();
    },
  );

  it.each([
    [401, "아이디 또는 비밀번호가 맞지 않습니다."],
    [429, "잠시 뒤 다시 시도하세요."],
  ])(
    "학생 인증 오류 %s 를 표시하고 사용자가 재시도할 수 있다",
    async (status, message) => {
      const received = vi.fn();
      server.use(
        http.post("/api/learn/login", () => {
          received();
          if (received.mock.calls.length === 1) {
            return HttpResponse.json(
              { error: { code: "INVALID_CREDENTIALS", message } },
              { status },
            );
          }
          return HttpResponse.json({ data: { mustChangePassword: false } });
        }),
      );
      render(<LoginForm />);
      const form = fill();
      fireEvent.submit(form);
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(signIn).not.toHaveBeenCalled();
      fireEvent.submit(form);
      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith("/learn"),
      );
      expect(received).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["offline", "malformed"])(
    "학생 인증의 %s 응답에서 이동하지 않고 재시도를 허용한다",
    async (failure) => {
      server.use(
        http.post("/api/learn/login", () =>
          failure === "offline"
            ? HttpResponse.error()
            : HttpResponse.json({ data: {} }),
        ),
      );
      render(<LoginForm />);
      fireEvent.submit(fill());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        failure === "offline"
          ? "연결되지 않았습니다. 다시 시도하세요."
          : "처리하지 못했습니다. 다시 시도하세요.",
      );
      expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(signIn).not.toHaveBeenCalled();
    },
  );

  it("학생 인증과 이동이 진행되는 동안 중복 제출을 막는다", async () => {
    let finish!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const received = vi.fn();
    server.use(
      http.post("/api/learn/login", async () => {
        received();
        await responseReady;
        return HttpResponse.json({ data: { mustChangePassword: false } });
      }),
    );
    render(<LoginForm />);
    const form = fill();
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(received).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "로그인 중…" })).toBeDisabled();
    await act(async () => {
      finish();
    });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/learn"));
    fireEvent.submit(form);
    expect(received).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "이동 중…" })).toBeDisabled();
  });

  it("회원가입은 이메일 형식과 기존 선생님 가입 검증을 유지한다", async () => {
    render(<SignupForm />);
    const email = screen.getByLabelText("이메일");
    expect(email).toHaveAttribute("type", "email");
    fireEvent.change(email, { target: { value: "student01" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "선생님" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "가입하고 시작하기" })
        .closest("form")!,
    );
    expect(
      await screen.findByText("이메일 형식이 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});
