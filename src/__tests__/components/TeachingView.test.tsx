import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "next-auth/react";
import TeachingView from "@/components/unified/TeachingView";
import { server } from "@/mocks/server";
import { MOCK_CLASS_A, MOCK_UNITS } from "@/mocks/data";

vi.mock("next-auth/react", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

let authenticated = false;
let bootstrapStatus = 200;
let bootstrapReads = 0;
let classReads = 0;
let signups = 0;
let signupStatus = 201;
const units = MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
  id,
  grade,
  chapter,
  section,
  orderIndex,
}));
const account = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "수업 선생님",
  email: "teacher@example.com",
  branchId: "20000000-0000-4000-8000-000000000002",
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.clearAllMocks();
  authenticated = false;
  bootstrapStatus = 200;
  bootstrapReads = 0;
  classReads = 0;
  signups = 0;
  signupStatus = 201;
  window.history.replaceState(null, "", "/dev/unified?view=teaching&design=2");
  server.use(
    http.get("/api/dev/unified/teaching", () => {
      bootstrapReads += 1;
      if (bootstrapStatus !== 200)
        return new HttpResponse(null, { status: bootstrapStatus });
      if (!authenticated) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json({ data: { user: account, units } });
    }),
    http.get("/api/classes", () => {
      classReads += 1;
      return HttpResponse.json({
        data: [MOCK_CLASS_A],
        meta: { page: 1, pageSize: 100, total: 1 },
      });
    }),
    http.post("/api/auth/signup", () => {
      signups += 1;
      return signupStatus === 201
        ? HttpResponse.json({ data: account }, { status: 201 })
        : HttpResponse.json(
            {
              error: { code: "CONFLICT", message: "이미 가입된 이메일입니다." },
            },
            { status: signupStatus },
          );
    }),
  );
  vi.mocked(signIn).mockImplementation(async () => {
    authenticated = true;
    return {
      ok: true,
      error: undefined,
      status: 200,
      url: null,
      code: undefined,
    };
  });
  vi.mocked(signOut).mockImplementation(async () => {
    authenticated = false;
    return { url: "/login" };
  });
});

async function loginForm() {
  const user = userEvent.setup();
  render(<TeachingView />);
  await screen.findByRole("form", { name: "수업 관리 로그인" });
  return user;
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("이메일"), account.email);
  await user.type(screen.getByLabelText("비밀번호"), "password123");
}

describe("embedded teaching authentication", () => {
  it("keeps a direct lessons entry on the lightweight teaching response", async () => {
    authenticated = true;
    window.history.replaceState(null, "", "/dev/unified?teachingTab=lessons");
    server.use(
      http.get("/api/dev/unified/teaching", ({ request }) => {
        expect(new URL(request.url).searchParams.has("classes")).toBe(false);
        return HttpResponse.json({ data: { user: account, units } });
      }),
    );
    render(<TeachingView />);
    await screen.findByRole("heading", { name: "오늘의 수업" });
    expect(screen.getByRole("tab", { name: "수업 진행" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() => expect(classReads).toBeGreaterThan(0));
  });

  it("uses the authorized teaching first page without a serial class-list request", async () => {
    authenticated = true;
    server.use(
      http.get("/api/dev/unified/teaching", ({ request }) => {
        expect(new URL(request.url).searchParams.get("classes")).toBe("1");
        return HttpResponse.json({
          data: {
            user: account,
            units,
            classes: {
              status: "ready",
              page: {
                data: [MOCK_CLASS_A],
                meta: { page: 1, pageSize: 100, total: 1 },
              },
            },
          },
        });
      }),
    );
    render(<TeachingView />);
    await screen.findByRole("button", { name: MOCK_CLASS_A.name });
    await screen.findByText("이서준");
    expect(classReads).toBe(0);
    expect(screen.getByRole("heading", { name: "진도" })).toBeInTheDocument();
  });

  it.each([
    { status: "error" },
    { status: "ready", page: { data: "malformed" } },
  ])(
    "keeps an initial class-list problem local and retries through the existing class API: %j",
    async (classes) => {
      authenticated = true;
      server.use(
        http.get("/api/dev/unified/teaching", () =>
          HttpResponse.json({ data: { user: account, units, classes } }),
        ),
      );
      const user = userEvent.setup();
      render(<TeachingView />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "반 목록을 불러오지 못했습니다.",
      );
      expect(screen.getByText(account.name)).toBeInTheDocument();
      expect(classReads).toBe(0);
      await user.click(
        screen.getByRole("button", { name: "반 목록 다시 불러오기" }),
      );
      await screen.findByText("이서준");
      expect(classReads).toBe(1);
    },
  );

  it("keeps the existing class view on same-account focus and reads fresh classes after a different account replaces it", async () => {
    authenticated = true;
    const secondAccount = {
      ...account,
      id: "10000000-0000-4000-8000-000000000002",
      name: "다른 선생님",
    };
    let identity = account;
    server.use(
      http.get("/api/dev/unified/teaching", ({ request }) => {
        const initial =
          new URL(request.url).searchParams.get("classes") === "1";
        return HttpResponse.json({
          data: {
            user: identity,
            units,
            ...(initial
              ? {
                  classes: {
                    status: "ready",
                    page: {
                      data: [MOCK_CLASS_A],
                      meta: { page: 1, pageSize: 100, total: 1 },
                    },
                  },
                }
              : {}),
          },
        });
      }),
    );
    render(<TeachingView />);
    await screen.findByText("이서준");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(classReads).toBe(0);
    expect(screen.getByText("이서준")).toBeInTheDocument();
    identity = secondAccount;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await screen.findByText(secondAccount.name);
    await waitFor(() => expect(classReads).toBe(1));
    expect(screen.queryByText(account.name)).not.toBeInTheDocument();
  });

  it("aborts a superseded teaching request and ignores an old response even if its transport ignores abort", async () => {
    authenticated = true;
    const originalFetch = globalThis.fetch;
    let resolve!: (response: Response) => void;
    let signal: AbortSignal | null | undefined;
    const old = new Promise<Response>((done) => {
      resolve = done;
    });
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce((_url, init) => {
        signal = init?.signal;
        return old;
      })
      .mockImplementation(originalFetch);
    try {
      render(<TeachingView />);
      await waitFor(() => expect(signal).toBeDefined());
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      await screen.findByText(account.name);
      expect(signal?.aborted).toBe(true);
      await act(async () => {
        resolve(
          Response.json({
            data: { user: { ...account, name: "오래된 계정" }, units },
          }),
        );
      });
      expect(screen.queryByText("오래된 계정")).not.toBeInTheDocument();
      expect(screen.getByText(account.name)).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });

  it.each(["/classes/manage", "/branch"])(
    "uses the authorized studio teaching API on %s in development",
    async (path) => {
      authenticated = true;
      window.history.replaceState(null, "", path);
      server.use(
        http.get("/api/studio/teaching", () => {
          bootstrapReads += 1;
          return HttpResponse.json({ data: { user: account, units } });
        }),
      );
      render(<TeachingView embedded />);
      await screen.findByRole("heading", { name: "우리 반 관리" });
      expect(bootstrapReads).toBe(1);
      await waitFor(() => expect(classReads).toBe(1));
    },
  );

  it("does not load classes anonymously and offers no external login or signup links", async () => {
    await loginForm();
    expect(bootstrapReads).toBe(1);
    expect(classReads).toBe(0);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(document.querySelector(".app-chrome")).toBeNull();
    expect(screen.getByLabelText("비밀번호").closest("form")).toHaveAttribute(
      "method",
      "post",
    );
  });

  it("validates credentials before calling signIn", async () => {
    const user = await loginForm();
    await user.click(
      screen.getByRole("button", { name: "로그인하고 계속하기" }),
    );
    expect(
      await screen.findByText("비밀번호는 8자 이상이어야 합니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
    expect(classReads).toBe(0);
  });

  it("retains the selected teaching tab and workspace URL after login", async () => {
    const user = await loginForm();
    await user.click(screen.getByRole("tab", { name: "수업 진행" }));
    await enterCredentials(user);
    await user.click(
      screen.getByRole("button", { name: "로그인하고 계속하기" }),
    );
    await screen.findByText(account.name);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: account.email,
      password: "password123",
      redirect: false,
    });
    expect(screen.getByRole("tab", { name: "수업 진행" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.location.pathname + window.location.search).toBe(
      "/dev/unified?view=teaching&design=2&teachingTab=lessons",
    );
    expect(document.querySelector(".app-chrome")).toBeNull();
    await waitFor(() => expect(classReads).toBeGreaterThan(0));
  });

  it("shows credential errors even when Auth.js returns ok:true", async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: "CredentialsSignin",
      status: 200,
      url: null,
      code: "credentials",
    });
    const user = await loginForm();
    await enterCredentials(user);
    await user.click(
      screen.getByRole("button", { name: "로그인하고 계속하기" }),
    );
    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(classReads).toBe(0);
  });

  it("signs up inline and opens class management without roster creation rights", async () => {
    const user = await loginForm();
    await user.click(screen.getByRole("button", { name: "회원가입" }));
    await user.type(screen.getByLabelText("이름"), account.name);
    await enterCredentials(user);
    await user.click(
      screen.getByRole("button", { name: "가입하고 수업 시작하기" }),
    );
    expect(
      await screen.findByRole("region", { name: "학생" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "반 추가" }),
    ).not.toBeInTheDocument();
    expect(signups).toBe(1);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe("/dev/unified");
  });

  it("maps signup conflicts inline without signing in", async () => {
    signupStatus = 409;
    const user = await loginForm();
    await user.click(screen.getByRole("button", { name: "회원가입" }));
    await user.type(screen.getByLabelText("이름"), account.name);
    await enterCredentials(user);
    await user.click(
      screen.getByRole("button", { name: "가입하고 수업 시작하기" }),
    );
    expect(
      await screen.findByText("이미 가입된 이메일입니다."),
    ).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("retries login after successful signup instead of submitting signup twice", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("offline"));
    const user = await loginForm();
    await user.click(screen.getByRole("button", { name: "회원가입" }));
    await user.type(screen.getByLabelText("이름"), account.name);
    await enterCredentials(user);
    await user.click(
      screen.getByRole("button", { name: "가입하고 수업 시작하기" }),
    );
    await screen.findByText("연결을 확인한 뒤 다시 시도해 주세요.");
    await user.click(
      screen.getByRole("button", { name: "로그인하고 계속하기" }),
    );
    await screen.findByText(account.name);
    expect(signups).toBe(1);
  });

  it("recovers from bootstrap errors and returns to inline auth after session expiration", async () => {
    bootstrapStatus = 503;
    const user = userEvent.setup();
    render(<TeachingView />);
    await screen.findByRole("alert");
    authenticated = true;
    bootstrapStatus = 200;
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByText(account.name);
    authenticated = false;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await screen.findByRole("form", { name: "수업 관리 로그인" });
    expect(
      screen.queryByRole("form", { name: "반 추가" }),
    ).not.toBeInTheDocument();
  });

  it("logs out without leaving the workspace and supports keyboard tabs", async () => {
    authenticated = true;
    const user = userEvent.setup();
    render(<TeachingView />);
    await screen.findByText(account.name);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    await screen.findByRole("form", { name: "수업 관리 로그인" });
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    fireEvent.keyDown(screen.getByRole("tab", { name: "반 · 학생 관리" }), {
      key: "ArrowRight",
    });
    expect(screen.getByRole("tab", { name: "수업 진행" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(window.location.pathname).toBe("/dev/unified");
  });
});
