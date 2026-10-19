import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UnifiedWorkspace from "@/components/unified/UnifiedWorkspace";
import { privateServer } from "../fixtures/privateCloud";

const modules = vi.hoisted(() => ({ bank: vi.fn(), studio: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType }>) => {
    const Component = lazy(loader);
    return function DeferredView(props: object) {
      return (
        <Suspense fallback={null}>
          <Component {...props} />
        </Suspense>
      );
    };
  },
}));
vi.mock("@/app/actions/auth", () => ({ signOutAction: vi.fn() }));
vi.mock("@/components/unified/useDevAi", () => ({
  DevAiProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/unified/DevAiStatusPanel", () => ({
  default: () => null,
}));
vi.mock("@/components/fading/teacher/SrsWorkspaceView", () => ({
  SrsWorkspaceView: () => null,
}));
vi.mock("@/components/exam-builder/MathExamBuilder", () => {
  modules.bank();
  return { default: () => <h2>복원된 시험지 만들기</h2> };
});
vi.mock("@/components/unified/StudioView", () => {
  modules.studio();
  return { default: () => <h2>복원된 문제 추출</h2> };
});

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("workspace code and draft loading", () => {
  it.each([
    { view: "bank" as const, heading: "복원된 시험지 만들기" },
    { view: "studio" as const, heading: "복원된 문제 추출" },
  ])(
    "loads $view code while waiting for the draft, without mounting or saving early",
    async ({ view, heading }) => {
      window.history.replaceState(null, "", `/#${view}`);
      const cloud = privateServer();
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const requests = vi.fn<typeof fetch>(async (url, init) => {
        if (!String(url).startsWith("/api/library/"))
          return new Response(null, { status: 503 });
        await pending;
        return cloud.transport(url, init);
      });
      vi.stubGlobal("fetch", requests);
      render(
        <UnifiedWorkspace
          initialData={{
            problems: [],
            total: 0,
            page: 1,
            pageSize: 12,
            grades: [],
            chapters: [],
          }}
          deferBankMetadata
          allowedMenus={["home", "bank", "studio", "export"]}
          storageScope="owner-a"
        />,
      );

      await waitFor(() => expect(modules[view]).toHaveBeenCalled());
      expect(
        screen.getByText("시험지 작업을 불러오는 중입니다…"),
      ).toBeVisible();
      expect(screen.queryByRole("heading", { name: heading })).toBeNull();
      expect(
        requests.mock.calls.filter(
          ([, init]) => init?.method && init.method !== "GET",
        ),
      ).toHaveLength(0);

      expect(
        requests.mock.calls.filter(([url]) =>
          String(url).includes("/problems"),
        ),
      ).toHaveLength(0);

      await act(async () => release());
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeVisible();
    },
  );
});
