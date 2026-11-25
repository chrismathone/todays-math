import { StrictMode } from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/components/concept-blank/paper/PrintNow", () => ({
  default: () => <span data-testid="print-now" />,
}));
import IssuePrint from "@/components/concept-blank/IssuePrint";
const selection = {
  sections: ["초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기"],
  forms: [
    {
      form: "term" as const,
      counts: { 하: 1, 중: 0, 상: 0 },
      extras: { 하: 0, 중: 0, 상: 0 },
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(
    null,
    "",
    "/concept-blank/print?s=example&print=1",
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("print issuance and unchanged-paper fallback", () => {
  it("waits for issuance before auto-print and never sends a duplicate from StrictMode", async () => {
    let resolve!: (r: Response) => void;
    const fetcher = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <StrictMode>
        <IssuePrint selection={selection} view="both" autoPrint>
          <div>기존 지면</div>
        </IssuePrint>
      </StrictMode>,
    );
    expect(screen.queryByTestId("print-now")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.getByText("기존 지면")).toBeTruthy();
    const id = "00000000-0000-4000-8000-000000000001";
    resolve(Response.json({ data: { id } }));
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        `/concept-blank/print?p=${id}&view=both&print=1`,
      ),
    );
    expect(screen.queryByTestId("print-now")).toBeNull();
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      requestId: expect.any(String),
      selection,
    });
  });
  it.each(["server", "network"])(
    "keeps the original paper printable after %s failure and shows the reason",
    async (kind) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          kind === "network"
            ? Promise.reject(new Error("offline"))
            : Promise.resolve(
                Response.json(
                  {
                    error: {
                      message:
                        "사진 채점 저장소가 준비되지 않았습니다. DB 적용 후 다시 이용해 주세요.",
                    },
                  },
                  { status: 503 },
                ),
              ),
        ),
      );
      render(
        <IssuePrint selection={selection} view="student" autoPrint>
          <div>기존 지면</div>
        </IssuePrint>,
      );
      await waitFor(() => expect(screen.getByTestId("print-now")).toBeTruthy());
      expect(screen.getByRole("alert").textContent).toMatch(/QR 없이 인쇄됨 ·/);
      if (kind === "server")
        expect(screen.getByRole("alert").textContent).toContain(
          "사진 채점 저장소가 준비되지 않았습니다.",
        );
      expect(screen.getByText("기존 지면")).toBeTruthy();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );
  it("does not auto-print a preview, even when issuance fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(
      <IssuePrint selection={selection} view="student" autoPrint={false}>
        <div>기존 지면</div>
      </IssuePrint>,
    );
    await screen.findByRole("alert");
    expect(screen.queryByTestId("print-now")).toBeNull();
  });
});

it("shows a useful platform failure instead of a JSON parser exception", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response("<html>timeout</html>", { status: 504 })),
  );
  render(
    <IssuePrint selection={selection} view="student" autoPrint={false}>
      <div>기존 지면</div>
    </IssuePrint>,
  );
  expect((await screen.findByRole("alert")).textContent).toMatch(
    /QR 없이 인쇄됨 · .*504/,
  );
});
