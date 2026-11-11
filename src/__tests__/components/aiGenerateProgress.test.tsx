/**
 * 🔴→🟢 「AI 생성」 **진행 표시** — 원장님 지시 2026-08-26 ②
 * 「버튼을 누르면 진행 표시(프로그레스바)가 있으면 좋겠다」.
 *
 * 구현: src/components/test/AiGenerateProgress.tsx
 *       · src/components/test/GenerateSetup.tsx · useGenerateSetup.ts
 *
 * ## 왜 퍼센트가 없나
 *
 * 생성은 DeepSeek 한 번 호출이고 중간 보고가 없다 — 진행률을 **알 방법이 없다.**
 * 실측(2026-08-26 `scripts/qa/probe-ai-generate-live.ts`): 3문항 40.0초.
 * 모르는 값을 그리면 그건 진행 표시가 아니라 거짓말이다. 그래서 **불확정 표시**로 두고,
 * 대신 **실제로 아는 것**(경과 시간)을 적는다.
 *
 * ## 이 파일이 지키는 것
 *
 *   ㉠ 누르면 뜨고, 끝나면 사라진다
 *   ㉡ **퍼센트를 지어내지 않는다** (`aria-valuenow` 가 없다 = 불확정)
 *   ㉢ 진행 중에는 같은 자리의 버튼들이 안 눌린다
 *   ㉣ 「출제」에는 이 표시가 안 뜬다 — **음성 대조**. 이게 없으면 「busy 면 늘 뜬다」로
 *      만들어도 ㉠ 이 초록이라, 표시가 무엇을 가리키는지 시험이 못 본다.
 *   ㉤ 실패하면 **서버가 보낸 사유**를 그대로 보여 준다 (예전에는 통째로 버렸다)
 */
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import NewTestPage from "@/app/(main)/tests/new/page";
import { CLASS_A_ID, CLASS_STARVED_ID, MOCK_PROBLEMS } from "@/mocks/data";
import { server } from "@/mocks/server";

const nav = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => nav }));

beforeEach(() => {
  nav.push.mockReset();
});

async function renderSetup() {
  const user = userEvent.setup();
  const ui = await NewTestPage({ searchParams: Promise.resolve({}) });
  const view = render(ui);
  await screen.findByRole("heading", { name: "출제 설정" });
  await screen.findByRole("button", { name: "출제" });
  return { user, ...view };
}

/** 응답을 **우리가 놓아 줄 때까지** 붙잡는 손잡이 — 「진행 중」 상태를 볼 수 있게 한다. */
function gate() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { held, release: () => release() };
}

/** 부족 안내(422)를 띄운다 — 「AI 생성」 버튼은 그 안에만 있다. */
async function openInsufficientPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("반"), CLASS_STARVED_ID);
  await user.click(screen.getByRole("button", { name: "출제" }));
  return screen.findByRole("button", { name: "AI 생성" });
}

describe("AI 생성 — 진행 표시", () => {
  it("누르면 불확정 진행 표시가 뜨고, 끝나면 사라진다", async () => {
    const held = gate();
    server.use(
      http.post("/api/problems/generate", async () => {
        await held.held;
        return HttpResponse.json(
          {
            data: [
              {
                ...MOCK_PROBLEMS[0],
                reviewStatus: "pending",
                source: "ai_generated",
              },
            ],
          },
          { status: 201 },
        );
      }),
    );

    const { user } = await renderSetup();
    const aiButton = await openInsufficientPanel(user);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    await user.click(aiButton);

    const bar = await screen.findByRole("progressbar");
    expect(screen.getByText("AI 문제 생성 중")).toBeInTheDocument();

    // ㉡ 모르는 값을 그리지 않는다 — 불확정은 `aria-valuenow` 가 **없는** 것으로 말한다.
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuetext");

    // ㉢ 진행 중에는 같은 자리의 버튼이 안 눌린다.
    expect(screen.getByRole("button", { name: "AI 생성" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "출제" })).toBeDisabled();

    held.release();
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText(/문항을 생성했습니다\. 아래에서 검수하세요/),
    ).toBeInTheDocument();
  });

  it("느낌표·이모지를 쓰지 않는다 (D-08)", async () => {
    const held = gate();
    server.use(
      http.post("/api/problems/generate", async () => {
        await held.held;
        return HttpResponse.json({ data: [] }, { status: 201 });
      }),
    );
    const { user } = await renderSetup();
    await user.click(await openInsufficientPanel(user));
    const bar = await screen.findByRole("progressbar");
    const panel = bar.closest("[role='alert']") ?? bar.parentElement!;
    expect(panel.textContent ?? "").not.toMatch(/[!！]/);
    expect(panel.textContent ?? "").not.toMatch(/\p{Extended_Pictographic}/u);
    held.release();
    await waitFor(() =>
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(),
    );
  });

  it("「출제」를 누를 때는 AI 진행 표시가 안 뜬다 — 음성 대조", async () => {
    const held = gate();
    server.use(
      http.post("/api/tests/generate", async () => {
        await held.held;
        return HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "실패" } },
          { status: 500 },
        );
      }),
    );
    const { user } = await renderSetup();
    await user.selectOptions(screen.getByLabelText("반"), CLASS_A_ID);
    await user.click(screen.getByRole("button", { name: "출제" }));

    // 출제도 busy 를 켠다. 「busy 면 뜬다」로 만들면 여기서 빨개진다.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "출제" })).toBeDisabled(),
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    held.release();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "출제" })).toBeEnabled(),
    );
  });

  it("실패하면 **서버가 보낸 사유**를 그대로 보여 준다", async () => {
    // 라우트는 일부러 행동 가능한 사유를 보낸다(설정 없음 · 길이 한도 · 일반 실패).
    // 화면이 그것을 버리고 「AI 문제 생성에 실패했습니다」로 뭉개면, 원장님은
    // 무엇을 고쳐야 하는지 알 길이 없다 — 실패가 침묵하는 그 자리다.
    server.use(
      http.post("/api/problems/generate", () =>
        HttpResponse.json(
          {
            error: {
              code: "AI_GENERATION_FAILED",
              message:
                "AI 설정이 없습니다 — 서버 환경변수 ANTHROPIC_API_KEY 를 확인해주세요.",
            },
          },
          { status: 503 },
        ),
      ),
    );
    const { user } = await renderSetup();
    await user.click(await openInsufficientPanel(user));

    expect(
      await screen.findByText(
        "AI 설정이 없습니다 — 서버 환경변수 ANTHROPIC_API_KEY 를 확인해주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("사유를 못 읽으면 일반 문구로 물러선다", async () => {
    server.use(
      http.post("/api/problems/generate", () =>
        HttpResponse.json({ nonsense: true }, { status: 500 }),
      ),
    );
    const { user } = await renderSetup();
    await user.click(await openInsufficientPanel(user));
    expect(
      await screen.findByText("AI 문제 생성에 실패했습니다"),
    ).toBeInTheDocument();
  });
});
