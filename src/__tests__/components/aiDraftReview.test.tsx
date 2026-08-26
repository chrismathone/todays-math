/**
 * 🔴→🟢 **검수를 출제 화면 안으로** — 원장님 지적 2026-08-26
 * 「AI로 문제 생성을 하면 바로 배정되는 게 아니라 승인을 한 다음에 다시 배정시켜야
 *  하는데, 프로세스에 좀 문제가 있어 보이네.」
 *
 * 구현: src/components/test/AiDraftReview.tsx · GenerateSetup.tsx · useGenerateSetup.ts
 *
 * ## 무엇을 바꿨고 무엇을 안 바꿨나
 *
 * **D-22(검수 후 출제)는 그대로다.** 자동 승격은 없다 — 승격은 여전히 사람이
 * `PATCH /api/problems/{id}/review-status` 를 눌러야 일어난다. 바뀐 것은 **그 버튼이
 * 어디 있느냐**뿐이다. 예전에는 화면을 떠나 문제은행으로 가서 대기 필터를 걸고
 * 방금 만든 것을 찾아 승인하고, 출제 화면으로 돌아와 **설정을 처음부터 다시** 해야 했다.
 *
 * ## 부족분은 **서버가 센다**
 *
 * 「가용 N / 필요 M」의 `N` 은 행 수가 아니라 **갈래 수**(`countFamilies`)이고, D-20
 * (최근 14일 제외)까지 반영된 값이다 — 화면이 다시 셀 수 있는 종류의 수가 아니다.
 * 그래서 승인한 뒤 **같은 출제 요청을 다시 보낸다.** 아직 모자라면 422 가 새 숫자를
 * 주고, 채워졌으면 그대로 출제된다. 규칙이 두 벌이 될 자리가 없다.
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NewTestPage from "@/app/(main)/tests/new/page";
import {
  CLASS_A_ID,
  CLASS_STARVED_ID,
  MOCK_EMPTY_PROBLEM_UNIT,
  MOCK_PROBLEMS,
  MOCK_TEST_DRAFT,
} from "@/mocks/data";
import { server } from "@/mocks/server";

const nav = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => nav }));

/** 방금 만든 것처럼 보이는 pending AI 문항 — 은행 목록이 쓰는 픽스처를 그대로 쓴다. */
function aiDraft(index: number) {
  const base = MOCK_PROBLEMS[index % MOCK_PROBLEMS.length]!;
  return {
    ...base,
    id: `a0000000-0000-4000-8000-00000000000${index}`,
    problemCode: `J10101-Z0${index}-001`,
    source: "ai_generated" as const,
    reviewStatus: "pending" as const,
    originProblemId: null,
    familyKey: `solo:a0000000-0000-4000-8000-00000000000${index}`,
  };
}

/**
 * 서버를 흉내 낸다 — **승인한 수만큼 가용이 오르는** 곳.
 * 승인 상태는 이 안에만 있고, 화면은 그것을 다시 세지 않는다.
 */
function wireServer({ required = 10, drafts = 3 } = {}) {
  const state = {
    approved: 0,
    generateCalls: 0,
    aiCalls: 0,
    patched: [] as string[],
  };

  server.use(
    http.post("/api/tests/generate", () => {
      state.generateCalls += 1;
      if (state.approved >= required) {
        return HttpResponse.json(
          {
            data: {
              test: { ...MOCK_TEST_DRAFT, id: MOCK_TEST_DRAFT.id },
              problems: [],
              shortfall: [],
            },
          },
          { status: 201 },
        );
      }
      return HttpResponse.json(
        {
          error: {
            code: "INSUFFICIENT_PROBLEMS",
            message: "이 단원에 등록된 문제가 부족합니다.",
            details: {
              unitId: MOCK_EMPTY_PROBLEM_UNIT.id,
              available: state.approved,
              required,
            },
          },
        },
        { status: 422 },
      );
    }),
    http.post("/api/problems/generate", () => {
      // 회차마다 **새 행**이 나온다 — 실제 생성은 늘 새 id 를 만든다. 픽스처가 같은
      // id 를 두 번 주면 React 키가 겹치고, 그 경고가 진짜 결함을 덮는다.
      const offset = state.aiCalls * drafts;
      state.aiCalls += 1;
      return HttpResponse.json(
        { data: Array.from({ length: drafts }, (_, i) => aiDraft(offset + i)) },
        { status: 201 },
      );
    }),
    http.patch(
      "/api/problems/:id/review-status",
      async ({ params, request }) => {
        const body = (await request.json()) as { reviewStatus: string };
        state.patched.push(`${String(params.id)}:${body.reviewStatus}`);
        // **여기서만** 승인이 일어난다. 화면이 스스로 올리지 않는다.
        if (body.reviewStatus === "approved") state.approved += 1;
        return HttpResponse.json({
          data: { ...aiDraft(0), reviewStatus: body.reviewStatus },
        });
      },
    ),
  );
  return state;
}

beforeEach(() => {
  nav.push.mockReset();
});

async function openPanelAndGenerate() {
  const user = userEvent.setup();
  const ui = await NewTestPage({ searchParams: Promise.resolve({}) });
  render(ui);
  await screen.findByRole("heading", { name: "출제 설정" });
  await screen.findByRole("button", { name: "출제" });
  await user.selectOptions(screen.getByLabelText("반"), CLASS_STARVED_ID);
  await user.click(screen.getByRole("button", { name: "출제" }));
  await user.click(await screen.findByRole("button", { name: "AI 생성" }));
  return user;
}

describe("생성한 문항을 **그 자리에서** 검수한다", () => {
  it("생성 직후 문항이 이 화면에 뜨고, 자동 승격은 일어나지 않는다", async () => {
    const state = wireServer({ drafts: 3 });
    const user = await openPanelAndGenerate();

    const list = await screen.findByRole("region", {
      name: "생성한 문항 검수",
    });
    // 「같은 문제는 같은 뷰」 — 문제은행과 **같은 카드**(`ProblemCard`)로 그린다.
    // 문항 코드와 「정답 및 해설 확인」은 그 카드만 그리는 것들이다.
    expect(within(list).getAllByText(/^J10101-Z0\d-001$/)).toHaveLength(3);
    expect(
      within(list).getAllByRole("button", { name: "정답 및 해설 확인" }),
    ).toHaveLength(3);
    expect(within(list).getAllByRole("button", { name: "승인" })).toHaveLength(
      3,
    );

    // D-22 — 생성만으로는 아무것도 승격되지 않는다.
    expect(state.patched).toEqual([]);
    void user;
  });

  it("승인하면 서버에 **부족분을 다시 묻고** 새 숫자가 화면에 온다", async () => {
    const state = wireServer({ required: 10, drafts: 3 });
    const user = await openPanelAndGenerate();
    await screen.findByRole("region", { name: "생성한 문항 검수" });

    expect(screen.getByText("가용 0 / 필요 10")).toBeInTheDocument();
    const callsBefore = state.generateCalls;

    await user.click(screen.getAllByRole("button", { name: "승인" })[0]!);

    await waitFor(() =>
      expect(screen.getByText("가용 1 / 필요 10")).toBeInTheDocument(),
    );
    expect(state.patched).toEqual([
      "a0000000-0000-4000-8000-000000000000:approved",
    ]);
    // 화면이 제 손으로 센 것이 아니라 **서버에 다시 물었다.**
    expect(state.generateCalls).toBe(callsBefore + 1);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("반려는 부족분을 **안 줄이고**, 그 카드는 목록에서 빠진다", async () => {
    const state = wireServer({ required: 10, drafts: 3 });
    const user = await openPanelAndGenerate();
    const list = await screen.findByRole("region", {
      name: "생성한 문항 검수",
    });
    const callsBefore = state.generateCalls;

    await user.click(within(list).getAllByRole("button", { name: "반려" })[0]!);

    await waitFor(() =>
      expect(
        within(list).getAllByRole("button", { name: "승인" }),
      ).toHaveLength(2),
    );
    expect(screen.getByText("가용 0 / 필요 10")).toBeInTheDocument();
    // 반려는 출제 풀을 바꾸지 않는다 — 다시 물을 이유가 없다.
    expect(state.generateCalls).toBe(callsBefore);
    expect(state.patched).toEqual([
      "a0000000-0000-4000-8000-000000000000:rejected",
    ]);
  });

  it("전부 반려하면 원래 자리로 돌아가고 다시 생성할 수 있다", async () => {
    wireServer({ required: 10, drafts: 2 });
    const user = await openPanelAndGenerate();
    const list = await screen.findByRole("region", {
      name: "생성한 문항 검수",
    });

    await user.click(within(list).getAllByRole("button", { name: "반려" })[0]!);
    await waitFor(() =>
      expect(
        within(list).getAllByRole("button", { name: "반려" }),
      ).toHaveLength(1),
    );
    await user.click(within(list).getAllByRole("button", { name: "반려" })[0]!);

    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "생성한 문항 검수" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "AI 생성" })).toBeEnabled();
  });

  it("「AI 생성」을 두 번 누르면 카드가 **이어 붙는다**", async () => {
    // 갈아 끼우면 앞 회차에서 검수하던 카드가 사라진다 — 그 자리가 침묵한다.
    wireServer({ required: 10, drafts: 2 });
    const user = await openPanelAndGenerate();
    const list = await screen.findByRole("region", {
      name: "생성한 문항 검수",
    });
    expect(within(list).getAllByRole("button", { name: "승인" })).toHaveLength(
      2,
    );

    await user.click(screen.getByRole("button", { name: "AI 생성" }));
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("region", { name: "생성한 문항 검수" }),
        ).getAllByRole("button", { name: "승인" }),
      ).toHaveLength(4),
    );
  });

  it("반을 바꾸면 검수 목록을 비운다 — 앞 반의 문항이 이 반 부족분으로 읽히면 안 된다", async () => {
    wireServer({ required: 10, drafts: 2 });
    const user = await openPanelAndGenerate();
    await screen.findByRole("region", { name: "생성한 문항 검수" });

    await user.selectOptions(screen.getByLabelText("반"), CLASS_A_ID);

    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "생성한 문항 검수" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("부족분이 채워지면 **화면을 안 떠난 채** 그대로 출제로 이어진다", async () => {
    wireServer({ required: 2, drafts: 2 });
    const user = await openPanelAndGenerate();
    const list = await screen.findByRole("region", {
      name: "생성한 문항 검수",
    });

    await user.click(within(list).getAllByRole("button", { name: "승인" })[0]!);
    await waitFor(() =>
      expect(screen.getByText("가용 1 / 필요 2")).toBeInTheDocument(),
    );
    await user.click(
      within(
        screen.getByRole("region", { name: "생성한 문항 검수" }),
      ).getAllByRole("button", { name: "승인" })[0]!,
    );

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(`/tests/${MOCK_TEST_DRAFT.id}`),
    );
  });
});
