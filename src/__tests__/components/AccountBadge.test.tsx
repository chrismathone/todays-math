/**
 * 🔴 RED → 🟢 — 헤더 계정 구역 (D-76, 원장님 확정 2026-08-24: 「나」안 + 즉시 로그아웃).
 *
 * 구현: src/components/chrome/AccountBadge.tsx (+ AppChrome 배선)
 *
 * **왜 이 기능이 생겼나 — 2026-08-24 실제 사고.**
 * 「출제 실패 1건 — 권영준: 본인 소유의 데이터만 접근할 수 있습니다.」 가 떴는데,
 * 원인이 «다른 계정으로 로그인해 있었다» 였다. 그런데 화면에는 **내가 누구인지 보는
 * 방법도, 로그아웃하는 방법도 없었다.** 그래서 원장님이 원인을 짚을 수 없었다.
 *
 * 무엇을 잠그나
 * 1. 계정 이메일이 **항상 보인다** — 접거나 눌러야 보이면 이 사고가 그대로 재발한다.
 * 2. 「로그아웃」은 실제로 누를 수 있는 컨트롤(form submit)이다.
 * 3. 이메일은 **누르는 것이 아니다** — 링크·버튼이 아니어야 한다(D-30 어포던스).
 * 4. 세션 조회가 실패해도 **로그아웃은 남는다** — 잘못된 계정에 갇히면 안 된다.
 *    (이게 없으면 «세션이 이상할 때 빠져나올 길이 없다»는 같은 함정이 한 겹 더 생긴다.)
 */
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { AccountBadge } from "@/components/chrome/AccountBadge";
import { server } from "@/mocks/server";

// 로그아웃 서버 액션은 `vitest.setup.ts` 가 전역으로 모킹한다(이유는 그 파일 주석).

describe("[AccountBadge]", () => {
  it("로그인한 계정 이메일을 항상 보여 준다", async () => {
    render(<AccountBadge />);

    expect(await screen.findByText("teacher@example.com")).toBeInTheDocument();
  });

  it("「로그아웃」은 눌러서 제출되는 컨트롤이다", async () => {
    render(<AccountBadge />);

    const button = await screen.findByRole("button", { name: "로그아웃" });
    expect(button).toHaveAttribute("type", "submit");
    // form 안에 있어야 서버 액션이 걸린다.
    expect(button.closest("form")).not.toBeNull();
  });

  /**
   * D-30 — 계정 이메일은 «정보»이지 «컨트롤»이 아니다. 링크처럼 보이면
   * 원장님이 눌러 보고 아무 일도 안 일어난다(이 저장소가 반 카드에서 겪은 그 결함).
   */
  it("이메일은 누르는 것이 아니다 (D-30)", async () => {
    render(<AccountBadge />);

    const email = await screen.findByText("teacher@example.com");
    expect(email.closest("a")).toBeNull();
    expect(email.closest("button")).toBeNull();
    expect(email.className).not.toMatch(/cursor-pointer/);
  });

  /**
   * ⚠️ 이 갈래가 없으면 «세션 조회가 깨졌을 때 로그아웃도 같이 사라진다».
   * 그러면 잘못된 계정에 **갇힌다** — 오늘 사고가 정확히 그 상태였다.
   */
  it("세션 조회가 실패해도 로그아웃은 남는다", async () => {
    server.use(http.get("/api/auth/session", () => HttpResponse.error()));

    render(<AccountBadge />);

    expect(
      await screen.findByRole("button", { name: "로그아웃" }),
    ).toBeInTheDocument();
  });

  it("세션이 없으면 이메일 자리를 비운다", async () => {
    server.use(http.get("/api/auth/session", () => HttpResponse.json({})));

    render(<AccountBadge />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "로그아웃" }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("account-email")).not.toBeInTheDocument();
  });
});
