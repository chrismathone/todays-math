import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { MOCK_CLASS_A } from "@/mocks/data";
import {
  WORKSPACE_OUTPUT_MENUS,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  loadMainDashboard,
  type MainDashboardData,
} from "@/lib/main/loadMainDashboard";

describe("dashboard partial reads and capabilities", () => {
  it.each(WORKSPACE_OUTPUT_MENUS)(
    "loads common test output for %s without an export permission",
    async (source) => {
      const tests = vi.fn(() =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, pageSize: 100, total: 0 },
        }),
      );
      server.use(http.get("/api/tests", tests));
      const result = await loadMainDashboard({ allowedMenus: [source] });
      expect(tests).toHaveBeenCalledOnce();
      expect(result.testsStatus).toBe("ready");
      expect(result.metricsStatus).toBe("unavailable");
    },
  );

  it.each<{ allowedMenus: WorkspaceMenu[] }>([
    { allowedMenus: [] },
    { allowedMenus: ["export"] },
    { allowedMenus: ["teaching"] },
  ])(
    "does not request test output without a source menu ($allowedMenus)",
    async ({ allowedMenus }) => {
      const tests = vi.fn(() => HttpResponse.json({}, { status: 403 }));
      server.use(http.get("/api/tests", tests));
      const result = await loadMainDashboard({ allowedMenus });
      expect(result.testsStatus).toBe("unavailable");
      expect(tests).not.toHaveBeenCalled();
    },
  );

  it("paints classes before slow progress, limits fanout, isolates a failure and makes zero forbidden requests", async () => {
    const classes = Array.from({ length: 8 }, (_, index) => ({
      ...MOCK_CLASS_A,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    }));
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    let progressCalls = 0;
    const forbidden = vi.fn();
    const partials: MainDashboardData[] = [];
    server.use(
      http.get("/api/classes", () =>
        HttpResponse.json({
          data: classes,
          meta: { page: 1, pageSize: 100, total: 8 },
        }),
      ),
      http.get("/api/progress", async ({ request }) => {
        progressCalls += 1;
        await barrier;
        return new URL(request.url).searchParams.get("classId") ===
          classes[0].id
          ? HttpResponse.json({}, { status: 503 })
          : new HttpResponse(null, { status: 204 });
      }),
      http.get(
        "/api/progress/suggest",
        () => new HttpResponse(null, { status: 404 }),
      ),
      http.get("/api/tests", () => {
        forbidden();
        return HttpResponse.json({}, { status: 403 });
      }),
      http.get("/api/metrics", () => {
        forbidden();
        return HttpResponse.json({}, { status: 403 });
      }),
    );
    const pending = loadMainDashboard({
      allowedMenus: ["teaching"],
      onPartial: (data) => partials.push(data),
    });
    try {
      await waitFor(() => expect(progressCalls).toBe(6));
      expect(partials[0].classes).toHaveLength(8);
      expect(Object.values(partials[0].progressStatusByClass ?? {})).toEqual(
        Array(8).fill("loading"),
      );
      expect(partials[0].metrics).toBeNull();
    } finally {
      release();
    }
    const result = await pending;
    expect(progressCalls).toBe(8);
    expect(result.progressStatusByClass?.[classes[0].id]).toBe("error");
    expect(result.progressStatusByClass?.[classes[7].id]).toBe("ready");
    expect(result.testsStatus).toBe("unavailable");
    expect(result.metricsStatus).toBe("unavailable");
    expect(forbidden).not.toHaveBeenCalled();
  });
});
