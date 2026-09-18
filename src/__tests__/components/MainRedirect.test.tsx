/**
 * 반이 하나도 없는 계정의 메인 — **온보딩으로 보낸다** (S-02, 2026-09-07).
 *
 * 새 계정으로 걸어 보니 가입 직후에는 온보딩으로 가는데, **로그인** 경로는 곧장 `/` 라
 * 빈 표 위에 떨어졌다. 안내도 없었다. 「처음 접속하는 아무것도 없는 선생님도 반과 학생을
 * 추가해서 문제까지 출력할 수 있도록」(원장님) — 첫 걸음이 여기다.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `/` 페이지는 2026-09-14(ce1a16d4) 로그인 작업실(서버 컴포넌트 · server-only)로 바뀌었다 — 반 목록 화면은
// `MainScreen` 으로 남아 «수업 · 학생 관리»(TeachingView)가 쓴다. 페이지를 불러오면 파일째 죽어서 화면을 직접 그린다.
import { MainScreen as MainPage } from "@/components/main/MainScreen";
import { classListResponseSchema } from "@/contracts/class.contract";
import { paginationParamsSchema } from "@/contracts/common.contract";
import { jsonOk, paginate } from "@/mocks/handlers/_helpers";
import { server } from "@/mocks/server";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

describe("메인 — 반이 없으면 온보딩으로", () => {
  beforeEach(() => replace.mockReset());

  it("🔴 반 0개면 /onboarding 으로 replace 한다", async () => {
    server.use(
      http.get("/api/classes", () =>
        jsonOk(
          classListResponseSchema,
          paginate([], paginationParamsSchema.parse({})),
        ),
      ),
    );
    render(<MainPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("반이 있으면 보내지 않는다 — 반증 쪽", async () => {
    render(<MainPage />);
    await screen.findByText("인쇄 일수"); // 대시보드가 다 읽힌 표식(Main.test 와 같은 것)
    expect(replace).not.toHaveBeenCalled();
  });
});
