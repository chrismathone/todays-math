/**
 * 🔴 RED → 🟢 GREEN — Phase 1, T1.2 (S-01 로그인/가입 화면).
 *
 * 대응 구현: src/components/auth/LoginForm.tsx, SignupForm.tsx
 * 대응 계약: src/contracts/auth.contract.ts
 * 디자인: docs/planning/05-design-system.md §8.6 S-01
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { normalizeCallbackUrl, requestedCallbackUrl } from "@/lib/callbackUrl";
import { MOCK_EXISTING_SIGNUP_EMAIL } from "@/mocks/data";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";

const signIn = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  signIn,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("[T1.2] LoginForm", () => {
  beforeEach(() => {
    signIn.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("이메일과 비밀번호 필드를 보여 준다", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.queryByLabelText("이름")).not.toBeInTheDocument();
  });

  it('로그인 제출 시 signIn("credentials")를 호출하고 / 로 이동한다', async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
    });

    render(<LoginForm />);
    await user.type(screen.getByLabelText("이메일"), "teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "teacher@example.com",
          password: "password123",
          redirect: false,
        }),
      );
      expect(push).toHaveBeenCalledWith("/");
    });
  });

  it("보호 경로의 쿼리까지 로그인 후 목적지로 복원한다", async () => {
    const user = userEvent.setup();
    const callbackUrl =
      "/tests/new?classId=10000000-0000-4000-8000-000000000001";
    signIn.mockResolvedValue({ ok: true });

    render(<LoginForm callbackUrl={callbackUrl} />);
    await user.type(screen.getByLabelText("이메일"), "teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(callbackUrl);
    });
  });

  // 하이드레이션 전에 제출하면 onSubmit 이 없어 네이티브 GET 제출이 일어나고,
  // 비밀번호가 /login?password=... 로 URL 에 노출된다 (2026-08-17 실측). SSR 마크업은 버튼을 잠가야 한다.
  it("하이드레이션 전(SSR) 마크업에서는 제출 버튼이 비활성이다", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<LoginForm />);

    const button = container.querySelector('button[type="submit"]');
    expect(button).not.toBeNull();
    expect(button).toHaveAttribute("disabled");
  });

  it("가입 전환 링크가 /signup 을 가리킨다", () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  // 구글(OAuth) 로그인은 제거됐다(원장님 지시 2026-08-14) — 로그인 수단은 이메일/비밀번호뿐이다.
  // 버튼이 다시 살아나면 이 테스트가 깨진다.
  it("소셜 로그인 버튼을 노출하지 않는다", () => {
    render(<LoginForm />);

    expect(
      screen.queryByRole("button", { name: /구글/ }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "비밀번호 보기" }),
    ).toBeInTheDocument();
  });

  it("잘못된 이메일은 검증 에러를 보여 주고 제출하지 않는다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("이메일"), "not-an-email");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("이메일 형식이 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("짧은 비밀번호는 검증 에러를 보여 주고 제출하지 않는다", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("이메일"), "teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "short");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("비밀번호는 8자 이상이어야 합니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("자격 증명 실패 시 에러를 보여 주고 이동하지 않는다", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      status: 401,
      url: null,
    });

    render(<LoginForm />);
    await user.type(screen.getByLabelText("이메일"), "teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  // next-auth v5 beta 실측: 자격 증명이 틀려도 HTTP 200 이라 ok:true 로 오고,
  // 실패는 error("CredentialsSignin") 필드로만 구분된다 (node_modules/next-auth/react.js signIn).
  it("실패인데 ok:true 인 v5 beta 응답에서도 에러를 보여 주고 이동하지 않는다", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({
      ok: true,
      error: "CredentialsSignin",
      code: "credentials",
      status: 200,
      url: null,
    });

    render(<LoginForm />);
    await user.type(screen.getByLabelText("이메일"), "teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("callback URL", () => {
  it("Proxy 목적지에 원래 쿼리 문자열을 보존한다", () => {
    expect(requestedCallbackUrl("/tests/new", "?classId=abc")).toBe(
      "/tests/new?classId=abc",
    );
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "javascript:alert(1)",
  ])("외부 또는 실행 가능한 목적지 %s 를 루트로 제한한다", (value) => {
    expect(normalizeCallbackUrl(value)).toBe("/");
  });
});

describe("[T1.2] SignupForm", () => {
  beforeEach(() => {
    signIn.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("이메일/비밀번호/이름 필드와 로그인 전환 링크를 보여 준다", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("가입 성공 후 credentials 로그인하고 / 로 이동한다", async () => {
    const user = userEvent.setup();
    signIn.mockResolvedValue({
      ok: true,
      error: undefined,
      status: 200,
      url: "/",
    });

    render(<SignupForm />);
    await user.type(screen.getByLabelText("이메일"), "new-teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.type(screen.getByLabelText("이름"), "김원장");
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: "new-teacher@example.com",
          password: "password123",
          redirect: false,
        }),
      );
      expect(push).toHaveBeenCalledWith("/");
    });
  });

  it("이미 가입된 이메일은 필드 아래 에러를 보여 주고 로그인하지 않는다", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(
      screen.getByLabelText("이메일"),
      MOCK_EXISTING_SIGNUP_EMAIL,
    );
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.type(screen.getByLabelText("이름"), "김원장");
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));

    expect(
      await screen.findByText("이미 가입된 이메일입니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("빈 이름은 검증 에러를 보여 준다", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText("이메일"), "new-teacher@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));

    expect(await screen.findByText("이름을 입력해주세요.")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("auth recovery and accessibility", () => {
  beforeEach(() => {
    signIn.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  async function fillCredentials() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("이메일"), "auth-qa@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "password123");
    if (screen.queryByLabelText("이름"))
      await user.type(screen.getByLabelText("이름"), "김선생");
    return user;
  }

  it.each(["login", "signup"] as const)(
    "%s SSR uses POST and disables submission until hydration",
    (mode) => {
      const container = document.createElement("div");
      container.innerHTML = renderToString(
        mode === "signup" ? <SignupForm /> : <LoginForm />,
      );
      expect(container.querySelector("form")).toHaveAttribute("method", "post");
      expect(container.querySelector('button[type="submit"]')).toBeDisabled();
      expect(container.querySelector('input[name="password"]')).toHaveAttribute(
        "type",
        "password",
      );
    },
  );

  it("preserves callback query and hash in both account-switch links", () => {
    const callbackUrl = "/tests/new?classId=a#draft";
    const { unmount } = render(<LoginForm callbackUrl={callbackUrl} />);
    const signup = new URL(
      screen.getByRole("link", { name: "회원가입" }).getAttribute("href")!,
      "http://localhost",
    );
    expect(signup.pathname).toBe("/signup");
    expect(signup.searchParams.get("callbackUrl")).toBe(callbackUrl);
    unmount();
    render(<SignupForm callbackUrl={callbackUrl} />);
    const login = new URL(
      screen.getByRole("link", { name: "로그인" }).getAttribute("href")!,
      "http://localhost",
    );
    expect(login.pathname).toBe("/login");
    expect(login.searchParams.get("callbackUrl")).toBe(callbackUrl);
  });

  it("uses a safe root for malicious callback links and signup completion", async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<SignupForm callbackUrl="https://evil.example/password" />);
    const user = await fillCredentials();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login",
    );
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("reveals the password through a keyboard-accessible non-submit button", async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByLabelText("이메일")).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("비밀번호")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "비밀번호 보기" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "비밀번호 숨기기" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(screen.getByLabelText("비밀번호")).toHaveAttribute(
      "type",
      "password",
    );
    expect(signIn).not.toHaveBeenCalled();
  });

  it("focuses invalid fields and exposes field errors to assistive technology", async () => {
    render(<SignupForm />);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "가입하고 시작하기" })
        .closest("form")!,
    );
    await screen.findByRole("alert");
    const email = screen.getByLabelText("이메일");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(
      "이메일 형식이 올바르지 않습니다.",
    );
    expect(email).toHaveFocus();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("keeps a synchronous submission lock through pending sign-in and navigation", async () => {
    let resolveSignIn!: (value: { ok: boolean }) => void;
    signIn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    render(<LoginForm />);
    await fillCredentials();
    const form = screen
      .getByRole("button", { name: "로그인" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "로그인 중…" })).toBeDisabled();
    await act(async () => {
      resolveSignIn({ ok: true });
    });
    expect(
      screen.getByRole("button", { name: "작업실로 이동 중…" }),
    ).toBeDisabled();
    fireEvent.submit(form);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("catches a rejected sign-in, shows a form alert, and allows retry", async () => {
    signIn
      .mockRejectedValueOnce(new Error("network offline"))
      .mockResolvedValueOnce({ ok: true });
    render(<LoginForm />);
    const user = await fillCredentials();
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결이 원활하지 않아요",
    );
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it.each(["credentials", "network"])(
    "retries only login after signup succeeds but %s sign-in fails",
    async (failure) => {
      const signup = vi.fn();
      server.use(
        http.post("/api/auth/signup", () => {
          signup();
          return HttpResponse.json({ data: {} }, { status: 201 });
        }),
      );
      if (failure === "network")
        signIn.mockRejectedValueOnce(new Error("offline"));
      else
        signIn.mockResolvedValueOnce({ ok: true, error: "CredentialsSignin" });
      signIn.mockResolvedValueOnce({ ok: true });
      const callbackUrl = "/tests/new?classId=abc#draft";
      render(<SignupForm callbackUrl={callbackUrl} />);
      const user = await fillCredentials();
      await user.click(
        screen.getByRole("button", { name: "가입하고 시작하기" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "가입은 완료됐지만 로그인하지 못했어요",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "계정이 만들어졌어요",
      );
      expect(screen.getByLabelText("이메일")).toHaveAttribute("readonly");
      expect(screen.getByLabelText("비밀번호")).toHaveAttribute(
        "autocomplete",
        "current-password",
      );
      await user.click(screen.getByRole("button", { name: "다시 로그인" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith(callbackUrl));
      expect(signup).toHaveBeenCalledTimes(1);
      expect(signIn).toHaveBeenCalledTimes(2);
    },
  );

  it("catches signup transport and malformed server failures without leaking technical details", async () => {
    server.use(http.post("/api/auth/signup", () => HttpResponse.error()));
    render(<SignupForm />);
    const user = await fillCredentials();
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "연결이 원활하지 않아요",
    );
    server.use(
      http.post(
        "/api/auth/signup",
        () => new HttpResponse("invalid upstream", { status: 502 }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "요청을 처리할 수 없습니다",
      ),
    );
    expect(screen.getByLabelText("이메일")).not.toHaveAttribute("aria-invalid");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("rejects signup passwords over the existing UTF-8 bcrypt limit", async () => {
    render(<SignupForm />);
    const user = await fillCredentials();
    await user.clear(screen.getByLabelText("비밀번호"));
    await user.type(screen.getByLabelText("비밀번호"), "가".repeat(25));
    await user.click(screen.getByRole("button", { name: "가입하고 시작하기" }));
    expect(
      await screen.findByText(
        "비밀번호는 UTF-8 기준 72바이트를 초과할 수 없습니다.",
      ),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
});
