/**
 * `/learn/password` 페이지 — 윗줄 이름은 **세션의 학생 이름**이다 (D-128 ⑵ · 원장님 답 18 ①).
 *
 * 첫 로그인 화면은 목록 API 를 부르지 않아 반을 모른다 — 세션(`session.student`)에 실린 이름만 싣는다.
 * 세션을 읽는 곳은 이 페이지(서버) 하나이고, 폼(`StudentPasswordForm`)은 받은 이름을 그리기만 한다.
 * 학생 토큰은 요청마다 DB 에서 계정을 다시 읽으므로(student-auth) 이름은 지금 이름이다.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
// 페이지는 학생 API 와 같은 자리(`studentRequest.getStudentSession`)로 세션을 읽는다 — 그 모듈이 server-only 다
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

import StudentPasswordPage from "@/app/learn/password/page";

const EXPIRES = "2026-10-15T00:00:00.000Z";
const STUDENT = {
  accountId: "11111111-1111-4111-8111-111111111111",
  studentId: "22222222-2222-4222-8222-222222222222",
  name: "이서준",
  mustChangePassword: true,
};

beforeEach(() => {
  auth.mockReset();
});

describe("첫 로그인 페이지 — 윗줄 이름은 세션에서 (D-128 ⑵)", () => {
  it("🔴 학생 세션의 이름을 윗줄에 싣는다", async () => {
    auth.mockResolvedValue({ student: STUDENT, expires: EXPIRES });
    render(await StudentPasswordPage({ searchParams: Promise.resolve({}) }));
    // 윗줄 단추는 2026-10-07 학생 공용 틀(`ff8e812d0`)에서 «나가기» → «로그아웃» 이 됐다 — `LearnScreens.test.tsx` 와 같은 글자.
    expect(screen.getByRole("banner").textContent).toBe(
      "오늘 수학이서준·로그아웃",
    );
  });

  it("학생 칸이 없는 세션은 이름 없이 «로그아웃»만 — 관문이 먼저 막는 자리지만 이름을 지어내지 않는다", async () => {
    auth.mockResolvedValue({ expires: EXPIRES });
    render(await StudentPasswordPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("banner").textContent).toBe("오늘 수학로그아웃");
  });

  it("세션이 없어도 «로그아웃»만", async () => {
    auth.mockResolvedValue(null);
    render(await StudentPasswordPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("banner").textContent).toBe("오늘 수학로그아웃");
  });
});
