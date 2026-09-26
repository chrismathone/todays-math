/**
 * eywa 연결 화면 둘 (D-139 ⑹) — 로그인 화면의 안내 줄 · 확인 화면 `/account/eywa-link`.
 *
 * 🔴 문구는 원장님 확정(2026-09-26)이다 — 여기 **글자 그대로** 적는다. 문구 함수를 불러 견주면
 *    함수가 바뀌어도 초록이다(세는 쪽과 고치는 쪽이 같이 눈이 먼다).
 * 틀·글꼴·버튼은 로그인 화면 것을 그대로 쓴다(새 스타일 없음) — 안내 줄은 기존 초록 줄(`styles.success`).
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.AUTH_SECRET = "eywa-link-screen-test-secret-0123456789abcdef";
});

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
const jar = vi.hoisted(() => ({ values: new Map<string, string>() }));
const account = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/accountAccess", () => ({
  getAccountAccess: vi.fn(async () => account.value),
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: nav.redirect,
  useRouter: () => ({ push: nav.push, refresh: nav.refresh }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.values.has(name) ? { name, value: jar.values.get(name)! } : undefined,
  }),
}));

import LoginPage from "@/app/(auth)/login/page";
import EywaLinkPage from "@/app/account/eywa-link/page";
import styles from "@/components/auth/auth.module.css";
import {
  EYWA_LINK_PENDING_COOKIE,
  sealEywaLinkPending,
} from "@/lib/eywaLinkPending";
import { server } from "@/mocks/server";

const WHO = {
  sub: "5b1c7e9a-2d4f-4a6b-9c8d-0e1f2a3b4c5d",
  name: "김선생",
  email: "kim@eywa.example",
};
const seal = (now = new Date(), secret = process.env.AUTH_SECRET) =>
  sealEywaLinkPending(WHO, { secret, now })!;

const LOGIN_NOTICE =
  "처음 한 번만: 오늘의 수학 비밀번호로 로그인하면 eywa 김선생(kim@eywa.example) 계정과 연결됩니다. 본인이 아니면 로그인하지 마세요.";
const CONFIRM_BODY =
  "eywa 계정 «김선생(kim@eywa.example)»을 이 계정(teacher@example.test)에 연결할까요? 연결하면 다음부터 eywa에서 바로 들어옵니다. 본인 eywa 계정이 아니면 «연결 안 함»을 누르세요.";

const director = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "선생님",
  email: "teacher@example.test",
  role: "director",
  isAdmin: false,
  approvalStatus: "approved",
  menus: [],
};

beforeEach(() => {
  jar.values.clear();
  account.value = null;
  nav.push.mockReset();
  nav.refresh.mockReset();
  nav.redirect.mockClear();
});

async function renderLogin(callbackUrl?: string) {
  render(
    await LoginPage({
      searchParams: Promise.resolve(callbackUrl ? { callbackUrl } : {}),
    }),
  );
}

describe("로그인 화면 — 연결 대기 안내 줄", () => {
  it("🔴 연결 대기 쿠키가 유효하면 확정 문구 그대로(이름·이메일 치환) · 기존 초록 줄 자리", async () => {
    jar.values.set(EYWA_LINK_PENDING_COOKIE, seal());
    await renderLogin("/account/eywa-link");
    const notice = screen.getByRole("status");
    expect(notice.textContent).toBe(LOGIN_NOTICE);
    expect(notice).toHaveClass(styles.success);
    // 로그인 뒤 확인 화면으로 간다 — 가입 링크도 같은 목적지를 잇는다
    expect(screen.getByRole("link", { name: /회원가입/ })).toHaveAttribute(
      "href",
      "/signup?callbackUrl=%2Faccount%2Feywa-link",
    );
  });

  it.each([
    ["쿠키 없음", undefined],
    [
      "🔴 다른 열쇠로 봉인",
      () => seal(new Date(), "another-auth-secret-0123456789abcdef"),
    ],
    ["🔴 만료(11분 전)", () => seal(new Date(Date.now() - 11 * 60_000))],
    ["🔴 위조", () => "v1.eyJzdWIiOiJ4In0.AAAA"],
  ])("%s → 안내 없음", async (_label, make) => {
    if (make) jar.values.set(EYWA_LINK_PENDING_COOKIE, make());
    await renderLogin("/account/eywa-link");
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.body.textContent).not.toContain("eywa");
  });
});

describe("확인 화면 /account/eywa-link", () => {
  it("로그인 안 했으면 로그인으로 (돌아올 곳은 이 화면)", async () => {
    jar.values.set(EYWA_LINK_PENDING_COOKIE, seal());
    await expect(EywaLinkPage()).rejects.toThrow(
      "redirect:/login?callbackUrl=%2Faccount%2Feywa-link",
    );
  });

  it.each([
    ["쿠키 없음", undefined],
    ["만료", () => seal(new Date(Date.now() - 11 * 60_000))],
    ["위조", () => "v1.eyJzdWIiOiJ4In0.AAAA"],
  ])("연결 대기 쿠키가 %s → / 로", async (_label, make) => {
    account.value = director;
    if (make) jar.values.set(EYWA_LINK_PENDING_COOKIE, make());
    await expect(EywaLinkPage()).rejects.toThrow("redirect:/");
    expect(nav.redirect).toHaveBeenCalledWith("/");
  });

  it("🔴 제목·본문·버튼 — 확정 문구 그대로, 로그인 화면과 같은 틀·버튼", async () => {
    account.value = director;
    jar.values.set(EYWA_LINK_PENDING_COOKIE, seal());
    render(await EywaLinkPage());
    expect(
      screen.getByRole("heading", { level: 1, name: "eywa 계정 연결" }),
    ).toBeInTheDocument();
    expect(screen.getByText(CONFIRM_BODY)).toBeInTheDocument();
    const link = screen.getByRole("button", { name: "연결" });
    const dismiss = screen.getByRole("button", { name: "연결 안 함" });
    for (const button of [link, dismiss]) {
      expect(button).toHaveClass(styles.submit);
      expect(button).toHaveAttribute("type", "button");
    }
    // 로그인 화면의 틀(편집 패널 + 폼 패널) 안에 선다
    expect(
      screen.getByRole("complementary", { name: "오늘의수학 작업실 소개" }),
    ).toBeInTheDocument();
  });

  it("승인 대기 계정에게도 연다 (연결은 승인과 상관없다)", async () => {
    account.value = { ...director, approvalStatus: "pending" };
    jar.values.set(EYWA_LINK_PENDING_COOKIE, seal());
    render(await EywaLinkPage());
    expect(screen.getByText(CONFIRM_BODY)).toBeInTheDocument();
  });
});

describe("확인 화면 — 누르면", () => {
  async function renderConfirm() {
    account.value = director;
    jar.values.set(EYWA_LINK_PENDING_COOKIE, seal());
    render(await EywaLinkPage());
    return userEvent.setup();
  }

  it.each([
    ["연결", "link"],
    ["연결 안 함", "dismiss"],
  ])("[%s] → action=%s 를 보내고 / 로", async (label, action) => {
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/account/eywa-link", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: {} });
      }),
    );
    const user = await renderConfirm();
    await user.click(screen.getByRole("button", { name: label }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/"));
    expect(bodies).toStrictEqual([{ action }]);
  });

  it("거절되면 서버 문구를 경고 줄에 보이고 머문다", async () => {
    server.use(
      http.post("/api/account/eywa-link", () =>
        HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message:
                "이 eywa 계정은 이미 다른 오늘의 수학 계정과 연결돼 있습니다.",
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = await renderConfirm();
    await user.click(screen.getByRole("button", { name: "연결" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "이 eywa 계정은 이미 다른 오늘의 수학 계정과 연결돼 있습니다.",
    );
    expect(alert).toHaveClass(styles.alert);
    expect(nav.push).not.toHaveBeenCalled();
    expect(
      within(document.body).getByRole("button", { name: "연결" }),
    ).toBeEnabled();
  });
});
