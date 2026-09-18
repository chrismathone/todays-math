/**
 * 🔴 RED → 🟢 — **운영 작업실의 AI 칸은 연결 상태만** (원장님 2026-09-18).
 *
 * 원장님: *「production 에서는 왼쪽에 이거 필요없을듯. 간단하게 AI 연결 상태만 보여주면 될것같은데」*
 * → 답: **상태 한 줄 + 작업 중일 때만 진행 한 줄(✕ 취소) + 오류일 때만 «다시 확인»** ·
 *   운영에서는 모델을 **자동(원본 기본 모델)으로 고정**.
 *
 * 🔴 **운영 빌드에서만** 최소화한다 — 원장님 같은 날 «작업실 AI칸은 dev 모드일때는 기존처럼, production에서만 최소화».
 *    개발 모드의 기존 칸은 `studioAiTransport.test.tsx` 가 잠근다.
 *
 * 무엇을 잠그나
 * 1. 운영 빌드의 작업실(`/`·`/studio`)에는 연결 방식·모델 고르기·다시 확인 아이콘·설명 줄이 없다 — 상태 한 줄뿐.
 * 2. 상태 문구: ready «AI 연결됨» · 서버가 키만 확인(unverified) «AI 연결 확인 전» · 오류 «AI 연결 오류»
 *    — 오류일 때만 «다시 확인» 단추가 서고, 누르면 상태를 다시 묻는다.
 * 3. 진행 줄은 **작업이 도는 동안만** 선다(✕ 로 취소). 끝나면 사라진다.
 * 4. 🔴 고르기가 없어졌으니 **예전에 저장한 모델을 복원하지 않는다** — 바꿀 길 없이 남으면 안 된다.
 * 5. 개발 모드는 어느 화면이든 기존 칸 그대로(`studioAiTransport.test.tsx`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import DevAiStatusPanel from "@/components/unified/DevAiStatusPanel";
import { DevAiProvider, useDevAi } from "@/components/unified/useDevAi";

type ProviderStatus = "ready" | "unverified" | "error";

const apiStatus = (status: ProviderStatus) => ({
  enabled: status !== "error",
  mode: "model-api",
  defaultProvider: "auto",
  providers: [
    {
      id: "auto",
      label: "원본 기본 모델",
      status,
      image: true,
      detail: "문항 인식 Gemini · 해설 DeepSeek",
    },
    {
      id: "gemini",
      label: "Gemini",
      status,
      image: true,
      detail: "서버 키 설정됨",
    },
  ],
});

function Harness() {
  const ai = useDevAi();
  return (
    <>
      <DevAiStatusPanel collapsed={false} onExpand={() => {}} />
      <button
        onClick={() =>
          void ai.run({ action: "solution", grade: "중1", content: "1+1" })
        }
      >
        해설 실행
      </button>
    </>
  );
}

const mount = () =>
  render(
    <DevAiProvider>
      <Harness />
    </DevAiProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NODE_ENV", "production");
  window.history.replaceState(null, "", "/studio");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

describe("[운영 AI 칸] 연결 상태만", () => {
  it.each(["/studio", "/"])(
    "%s — 연결 방식·모델 고르기·설명 줄 없이 상태 한 줄",
    async (pathname) => {
      window.history.replaceState(null, "", pathname);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(Response.json(apiStatus("unverified"))),
      );
      mount();
      await screen.findByText("AI 연결 확인 전");
      expect(screen.queryByRole("combobox")).toBeNull();
      expect(screen.queryByLabelText("AI 연결 방식")).toBeNull();
      expect(screen.queryByText("서버 모델 API")).toBeNull();
      expect(screen.queryByText("문항 인식 Gemini · 해설 DeepSeek")).toBeNull();
      expect(screen.queryByRole("button", { name: "다시 확인" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "연결 다시 확인" }),
      ).toBeNull();
    },
  );

  it("오류면 «AI 연결 오류» 와 «다시 확인» — 누르면 상태를 다시 묻는다", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json(apiStatus("error")));
    vi.stubGlobal("fetch", fetcher);
    mount();
    await screen.findByText("AI 연결 오류");
    const retry = screen.getByRole("button", { name: "다시 확인" });
    const before = fetcher.mock.calls.length;
    fireEvent.click(retry);
    await waitFor(() =>
      expect(fetcher.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it("상태를 못 읽어도 오류로 보인다(조용히 «확인 중» 에 머물지 않는다)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("down", { status: 503 })),
    );
    mount();
    await screen.findByText("AI 연결 오류");
    expect(screen.getByRole("button", { name: "다시 확인" })).toBeTruthy();
  });

  it("작업이 도는 동안만 진행 줄과 ✕ — 끝나면 «AI 연결됨» 한 줄로 돌아간다", async () => {
    let finish: (value: Response) => void = () => {};
    const fetcher = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : Response.json(apiStatus("unverified")),
      );
    vi.stubGlobal("fetch", fetcher);
    mount();
    await screen.findByText("AI 연결 확인 전");
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(screen.getByText("해설 실행"));
    await screen.findByRole("status");
    expect(screen.getByRole("button", { name: "AI 작업 취소" })).toBeTruthy();

    finish(
      Response.json({
        provider: "auto",
        action: "solution",
        result: { answer: "2", solution: "1+1=2", content: "", warnings: [] },
      }),
    );
    await screen.findByText("AI 연결됨");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    expect(screen.queryByRole("button", { name: "AI 작업 취소" })).toBeNull();
  });

  it("🔴 예전에 저장한 모델을 복원하지 않는다 — 운영은 늘 자동", async () => {
    localStorage.setItem("today-math-dev-ai-provider-model-api", "gemini");
    const fetcher = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) =>
        Response.json(
          init?.method === "POST"
            ? {
                provider: "auto",
                action: "solution",
                result: {
                  answer: "2",
                  solution: "1+1=2",
                  content: "",
                  warnings: [],
                },
              }
            : apiStatus("unverified"),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    mount();
    await screen.findByText("AI 연결 확인 전");
    fireEvent.click(screen.getByText("해설 실행"));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
      ).toBe(true),
    );
    const post = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    expect(JSON.parse(post[1].body)).toMatchObject({ provider: "auto" });
  });
});
