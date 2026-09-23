/**
 * 🔴 RED → 🟢 GREEN — Phase 4, T4.3 S-05 검수 (H5×G2, D-29)
 *
 * 구현: src/app/(main)/tests/[id]/page.tsx + src/components/test/{TestReview,ProblemCard}
 * 데이터: 기존 MSW test 핸들러 (교체/확정)
 *
 * 확정: docs/planning/05-design-system.md §8.6 S-05
 * 교체: 1클릭, 확인 모달 없음. 인쇄 링크만 /tests/[id]/print
 */
import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import TestReviewPage from "@/app/(main)/tests/[id]/page";
import { ReviewProblemCard } from "@/components/test/ReviewProblemCard";
import { TestReview } from "@/components/test/TestReview";
import {
  MOCK_PROBLEMS,
  MOCK_TEST_DRAFT,
  MOCK_TEST_CONFIRMED_PROBLEMS,
  MOCK_TEST_DRAFT_PROBLEMS,
  TEST_CONFIRMED_ID,
  TEST_DRAFT_ID,
  TEST_NOT_FOUND_ID,
} from "@/mocks/data";
import { server } from "@/mocks/server";

async function renderReview(id: string) {
  const user = userEvent.setup();
  const ui = await TestReviewPage({ params: Promise.resolve({ id }) });
  const view = render(ui);
  return { user, ...view };
}

describe("[T4.3 S-05] 검수 — 문제 카드", () => {
  it("문 N·난이도/유형 마이크로 라벨·MathText·우측 교체를 보여 준다", async () => {
    const { container } = await renderReview(TEST_DRAFT_ID);

    const first = await screen.findByRole("article", { name: "문 1" });
    expect(first).toHaveTextContent("기본");
    expect(first).toHaveTextContent("계산");
    expect(first.querySelector(".katex")).not.toBeNull();
    expect(first.querySelector(".katex-error")).toBeNull();

    const replace = within(first).getByRole("button", { name: "교체" });
    expect(replace.className).toMatch(/underline|bg-transparent/);

    expect(screen.getByRole("article", { name: "문 8" })).toBeInTheDocument();
    expect(MOCK_TEST_DRAFT_PROBLEMS).toHaveLength(8);

    expect(container.textContent ?? "").not.toMatch(/[!！]/);
    expect(container.textContent ?? "").not.toMatch(/[😀🎉✨🔥]/);
    expect(first.className).not.toMatch(/#A57F00|gold/i);
    expect(within(first).getByRole("separator")).toBeInTheDocument();
  });

  it("답·해설이 오른쪽에 상시 보인다 — 펼침 없이 (2026-08-21 원장님 확정)", async () => {
    // 문제 본문 폭은 「인쇄와 동일」 원칙으로 고정이라 오른쪽이 비어 있었다.
    // 검수는 어차피 답·해설을 보는 일이므로 옆에 늘 보인다 — 클릭이 필요 없다.
    await renderReview(TEST_DRAFT_ID);
    const first = await screen.findByRole("article", { name: "문 1" });

    const aside = within(first).getByRole("complementary", {
      name: "답과 해설",
    });
    expect(within(aside).getByText("답")).toBeVisible();
    expect(within(aside).getAllByText("0.28").length).toBeGreaterThan(0);
    expect(within(aside).getByText("해설")).toBeVisible();
    expect(within(aside).queryByText("해설 없음")).not.toBeInTheDocument();
    // 상시 표시이므로 답·해설 수식도 즉시 조판되어 있다
    expect(aside.querySelector(".katex")).not.toBeNull();
  });

  it("해설이 여러 줄로 나뉜다 — 한 줄 벽 금지 (splitSolutionSteps 배선)", () => {
    // 데이터는 개행이 없어도 표시에서 줄 경계를 되찾는다. 단위 규칙은
    // solutionSteps.test.ts 가 잠그고, 여기는 **배선**만 잠근다 — 카드가
    // 해설을 통짜 MathText 하나로 그리면 이 검사가 빨개진다.
    const problem = {
      ...MOCK_PROBLEMS.find((item) => item.solution !== null)!,
      solution: "$x=2$이고 $y=3$이다.따라서 합은 $5$",
    };
    render(<ReviewProblemCard orderIndex={1} problem={problem} />);
    const card = screen.getByRole("article", { name: "문 1" });
    const aside = within(card).getByRole("complementary", {
      name: "답과 해설",
    });
    const steps = aside.querySelectorAll("section:nth-of-type(2) div div");
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });

  it("해설이 없으면 해설 없음이다", () => {
    const problem = MOCK_PROBLEMS.find((item) => item.solution === null);
    expect(problem).toBeDefined();

    render(<ReviewProblemCard orderIndex={3} problem={problem!} />);
    const card = screen.getByRole("article", { name: "문 3" });

    expect(within(card).getByText("답")).toBeVisible();
    expect(within(card).getByText("해설 없음")).toBeVisible();
  });

  it("교체는 모달 없이 1클릭으로 본문을 바꾼다", async () => {
    const { user } = await renderReview(TEST_DRAFT_ID);
    const first = await screen.findByRole("article", { name: "문 1" });
    const before = MOCK_TEST_DRAFT_PROBLEMS[0]!.problem.content;

    expect(first).toHaveTextContent("를 유한소수로 나타내어라");

    await user.click(within(first).getByRole("button", { name: "교체" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      const card = screen.getByRole("article", { name: "문 1" });
      expect(card.textContent ?? "").not.toContain("를 유한소수로 나타내어라");
    });

    const replacement = MOCK_PROBLEMS.find(
      (p) =>
        p.unitId === MOCK_TEST_DRAFT_PROBLEMS[0]!.problem.unitId &&
        p.id !== MOCK_TEST_DRAFT_PROBLEMS[0]!.problem.id,
    );
    expect(replacement).toBeDefined();
    expect(replacement!.content).not.toBe(before);
    expect(screen.getByText(/교체 1/)).toBeInTheDocument();
  });

  it("교체 요청 실패를 사용자에게 알리고 기존 문제를 유지한다", async () => {
    server.use(
      http.put(
        "/api/tests/:id/problems/:seq",
        () => new HttpResponse("broken", { status: 500 }),
      ),
    );
    const { user } = await renderReview(TEST_DRAFT_ID);
    const first = await screen.findByRole("article", { name: "문 1" });
    await user.click(within(first).getByRole("button", { name: "교체" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문제를 교체하지 못했습니다",
    );
    expect(first).toHaveTextContent("를 유한소수로 나타내어라");
  });
});

describe("[T4.3 S-05] 검수 — 하단 확정·인쇄", () => {
  it("초안은 인쇄를 비활성화해 실패 경로로 이동시키지 않는다", async () => {
    await renderReview(TEST_DRAFT_ID);
    await screen.findByRole("article", { name: "문 1" });

    expect(screen.getByText(/교체 0/)).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "확정" });
    expect(confirm.className).toContain("bg-[var(--learn-nav)]");

    expect(screen.getByRole("button", { name: "인쇄" })).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "인쇄" }),
    ).not.toBeInTheDocument();
  });

  /**
   * 🔴 **채점 진입점은 여기 한 자리뿐이다** (D-134 트랙 1 · 브리프 §1.3).
   *
   * 초안에 보이면 「아직 나가지도 않은 시험지」를 채점하는 길이 열린다. 감추는 것만으로
   * 끝내지 않고 서버도 같은 규칙을 든다(`lib/testResults/gradeSheet.ts` — 초안이면 422).
   */
  it("초안에는 «채점» 단추가 없다 — 아직 나가지 않은 시험지다", async () => {
    await renderReview(TEST_DRAFT_ID);
    await screen.findByRole("article", { name: "문 1" });

    expect(
      screen.queryByRole("link", { name: "채점" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "채점" }),
    ).not.toBeInTheDocument();
  });

  it("확정된 시험지에는 «채점» 링크가 있다", async () => {
    await renderReview(TEST_CONFIRMED_ID);
    await screen.findByRole("article", { name: "문 1" });

    expect(screen.getByRole("link", { name: "채점" })).toHaveAttribute(
      "href",
      `/tests/${TEST_CONFIRMED_ID}/grade`,
    );
  });

  it("확정을 누르면 그때 «채점» 링크가 열린다", async () => {
    const { user } = await renderReview(TEST_DRAFT_ID);
    await screen.findByRole("article", { name: "문 1" });
    expect(
      screen.queryByRole("link", { name: "채점" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "확정" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "채점" })).toHaveAttribute(
        "href",
        `/tests/${TEST_DRAFT_ID}/grade`,
      );
    });
  });

  it("확정을 누른 뒤에만 인쇄 링크를 연다", async () => {
    const { user } = await renderReview(TEST_DRAFT_ID);
    await screen.findByRole("article", { name: "문 1" });

    await user.click(screen.getByRole("button", { name: "확정" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();
      expect(screen.getByRole("link", { name: "인쇄" })).toHaveAttribute(
        "href",
        `/tests/${TEST_DRAFT_ID}/print`,
      );
    });
    expect(
      screen.queryByRole("button", { name: "인쇄" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("확정 요청 실패를 알리고 인쇄를 계속 막는다", async () => {
    server.use(
      http.post(
        "/api/tests/:id/confirm",
        () => new HttpResponse("broken", { status: 500 }),
      ),
    );
    const { user } = await renderReview(TEST_DRAFT_ID);
    await screen.findByRole("article", { name: "문 1" });

    await user.click(screen.getByRole("button", { name: "확정" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "테스트를 확정하지 못했습니다",
    );
    expect(screen.getByRole("button", { name: "인쇄" })).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "인쇄" }),
    ).not.toBeInTheDocument();
  });

  it("이미 교체된 확정본은 교체 수를 반영한다", async () => {
    await renderReview(TEST_CONFIRMED_ID);
    await screen.findByRole("article", { name: "문 1" });

    const replacedCount = MOCK_TEST_CONFIRMED_PROBLEMS.filter(
      (item) => item.replaced,
    ).length;
    expect(
      screen.getByText(new RegExp(`교체 ${replacedCount}`)),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확정" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "인쇄" })).toHaveAttribute(
      "href",
      `/tests/${TEST_CONFIRMED_ID}/print`,
    );
  });

  it("없는 테스트면 찾을 수 없다는 안내를 보여 준다", async () => {
    await renderReview(TEST_NOT_FOUND_ID);

    expect(
      await screen.findByText("테스트를 찾을 수 없습니다"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "교체" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "오늘의 테스트로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("검수 — 처리 중 안내와 복구", () => {
  it("교체 중에는 모든 교체와 확정을 막고 완료 후 확정을 허용한다", async () => {
    const response = deferredResponse();
    let replaceCalls = 0;
    let confirmCalls = 0;
    server.use(
      http.put("/api/tests/:id/problems/:seq", () => {
        replaceCalls += 1;
        return response.promise;
      }),
      http.post("/api/tests/:id/confirm", () => {
        confirmCalls += 1;
        return HttpResponse.json({
          data: { ...MOCK_TEST_DRAFT, status: "confirmed" },
        });
      }),
    );
    const { user } = await renderReview(TEST_DRAFT_ID);
    const first = await screen.findByRole("article", { name: "문 1" });
    await user.click(within(first).getByRole("button", { name: "교체" }));
    expect(
      screen.getByText("문 1 교체 중입니다. 교체가 끝나면 확정할 수 있습니다"),
    ).toHaveAttribute("role", "status");
    for (const button of screen.getAllByRole("button", { name: "교체" })) {
      expect(button).toBeDisabled();
    }
    const confirm = screen.getByRole("button", { name: "확정" });
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    await user.click(within(first).getByRole("button", { name: "교체" }));
    expect(replaceCalls).toBe(1);
    expect(confirmCalls).toBe(0);
    response.resolve(
      HttpResponse.json({
        data: {
          test: { ...MOCK_TEST_DRAFT, modified: true },
          problem: { ...MOCK_TEST_DRAFT_PROBLEMS[0], replaced: true },
        },
      }),
    );
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(screen.queryByText(/문 1 교체 중/)).not.toBeInTheDocument();
    await user.click(confirm);
    expect(await screen.findByRole("link", { name: "인쇄" })).toHaveAttribute(
      "href",
      `/tests/${TEST_DRAFT_ID}/print`,
    );
    expect(confirmCalls).toBe(1);
  });

  it("확정 중에는 교체도 막고 실패하면 버튼 옆 오류와 함께 재시도할 수 있다", async () => {
    const response = deferredResponse();
    let confirmCalls = 0;
    let replaceCalls = 0;
    server.use(
      http.post("/api/tests/:id/confirm", () => {
        confirmCalls += 1;
        return confirmCalls === 1
          ? response.promise
          : HttpResponse.json({
              data: { ...MOCK_TEST_DRAFT, status: "confirmed" },
            });
      }),
      http.put("/api/tests/:id/problems/:seq", () => {
        replaceCalls += 1;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const { user } = await renderReview(TEST_DRAFT_ID);
    const first = await screen.findByRole("article", { name: "문 1" });
    const confirm = screen.getByRole("button", { name: "확정" });
    await user.click(confirm);
    expect(screen.getByText("확정을 처리하는 중입니다")).toHaveAttribute(
      "role",
      "status",
    );
    expect(confirm).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: "교체" })) {
      expect(button).toBeDisabled();
    }
    await user.click(confirm);
    await user.click(within(first).getByRole("button", { name: "교체" }));
    expect(confirmCalls).toBe(1);
    expect(replaceCalls).toBe(0);
    response.resolve(new HttpResponse(null, { status: 500 }));
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("다시 확정해 주세요");
    expect(error.closest("footer")).toContainElement(confirm);
    expect(confirm).toBeEnabled();
    expect(within(first).getByRole("button", { name: "교체" })).toBeEnabled();
    await user.click(confirm);
    await screen.findByRole("link", { name: "인쇄" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("조회 실패 안내에서 다시 불러오면 초안으로 복구한다", async () => {
    const response = deferredResponse();
    let loadCalls = 0;
    server.use(
      http.get("/api/tests/:id", () => {
        loadCalls += 1;
        return loadCalls === 1
          ? new HttpResponse(null, { status: 500 })
          : response.promise;
      }),
    );
    const { user } = await renderReview(TEST_DRAFT_ID);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "테스트를 불러오지 못했습니다",
    );
    expect(
      screen.getByRole("link", { name: "오늘의 테스트로 돌아가기" }),
    ).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다시 불러오기" }),
    ).not.toBeInTheDocument();
    response.resolve(
      HttpResponse.json({
        data: {
          test: MOCK_TEST_DRAFT,
          className: "중등 A반",
          studentName: "김민서",
          problems: MOCK_TEST_DRAFT_PROBLEMS,
        },
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "중등 A반 · 김민서" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("일일테스트 · 2026-08-10 · 8문항 · 초안"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확정" })).toBeEnabled();
    expect(loadCalls).toBe(2);
  });

  it("다른 시험을 불러오는 동안 이전 머리말·문항·인쇄 링크를 숨긴다", async () => {
    const response = deferredResponse();
    const { rerender } = render(<TestReview testId={TEST_CONFIRMED_ID} />);
    await screen.findByRole("link", { name: "인쇄" });
    server.use(http.get(`/api/tests/${TEST_DRAFT_ID}`, () => response.promise));
    rerender(<TestReview testId={TEST_DRAFT_ID} />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "인쇄" }),
    ).not.toBeInTheDocument();
    response.resolve(
      HttpResponse.json({
        data: {
          test: MOCK_TEST_DRAFT,
          className: "다음 반",
          studentName: "이서준",
          problems: MOCK_TEST_DRAFT_PROBLEMS,
        },
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "다음 반 · 이서준" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인쇄" })).toBeDisabled();
  });
});
