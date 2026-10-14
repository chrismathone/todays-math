/**
 * 🔴 RED → 🟢 GREEN — Phase 2, T2.3 S-07 반/학생 관리
 *
 * 구현: src/app/(main)/classes/page.tsx, src/components/class/*
 * 데이터: MSW class/progress 핸들러 (실제 DB 불필요)
 * 확정: docs/planning/05-design-system.md §8.6
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppChrome } from "@/components/chrome/AppChrome";
import { ClassManage } from "@/components/class/ClassManage";
import {
  CLASS_A_ID,
  MOCK_CLASSES,
  MOCK_CURRENT_PROGRESS_UNIT,
  MOCK_STUDENTS,
  MOCK_UNITS,
} from "@/mocks/data";
import { server } from "@/mocks/server";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

const { connection } = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("next/server", () => ({ connection }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => ({
    id: "test-user",
    isAdmin: false,
    menus: ["teaching"],
  })),
}));

beforeEach(() => window.history.replaceState(null, "", "/"));

function renderManage() {
  const user = userEvent.setup();
  const view = render(
    <AppChrome>
      <ClassManage units={MOCK_UNITS} canManageRoster />
    </AppChrome>,
  );
  return { user, ...view };
}

async function readyManage() {
  const ctx = renderManage();
  await screen.findByRole("button", { name: "중2 심화반" });
  await screen.findByText("이서준");
  return ctx;
}

describe("[T2.3 S-07] 반/학생 관리 — 크롬·표·학생", () => {
  it("AppChrome으로 감싸고 반 표와 학생 이름을 보여 준다", async () => {
    await readyManage();

    expect(screen.getByRole("link", { name: "오늘 수학" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: "수업·학생 관리" }),
    ).toHaveAttribute("href", "/classes");

    expect(
      screen.getByRole("columnheader", { name: "반" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "학년" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "중2 심화반" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "중2 기초반" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반 추가" }).className).toMatch(
      /whitespace-nowrap/,
    );
    expect(screen.getByRole("button", { name: "등록" }).className).toMatch(
      /whitespace-nowrap/,
    );

    const students = screen.getByRole("list", { name: "학생" });
    expect(within(students).getByText("이서준")).toBeInTheDocument();
    expect(within(students).getByText("김하윤")).toBeInTheDocument();
    expect(within(students).getByText("박지호")).toBeInTheDocument();
  });

  it("학생 목록은 이름만 보여 준다", async () => {
    await readyManage();

    const students = screen.getByRole("list", { name: "학생" });
    expect(within(students).queryByText(/@/)).not.toBeInTheDocument();
    expect(within(students).queryByText(/2026-/)).not.toBeInTheDocument();
    expect(within(students).queryByText(/true|false/i)).not.toBeInTheDocument();
  });

  it("반 선택은 이름 버튼만이고 행 전체 hover가 없다", async () => {
    await readyManage();

    const name = screen.getByRole("button", { name: "중2 기초반" });
    expect(name.closest("tr")?.className ?? "").not.toMatch(/hover:bg-white/);
    expect(name.closest("tr")?.className ?? "").not.toMatch(/cursor-pointer/);
  });

  it("다른 반을 고르면 그 반 학생만 보여 준다", async () => {
    const { user } = await readyManage();

    await user.click(screen.getByRole("button", { name: "중2 기초반" }));

    const students = await screen.findByRole("list", { name: "학생" });
    await waitFor(() => {
      expect(within(students).getByText("최수아")).toBeInTheDocument();
    });
    expect(within(students).getByText("정도윤")).toBeInTheDocument();
    expect(within(students).queryByText("이서준")).not.toBeInTheDocument();
  });

  it("반을 바꾸는 동안 이전 반 학생을 남겨 두지 않는다", async () => {
    server.use(
      http.get("/api/students", async ({ request }) => {
        const classId = new URL(request.url).searchParams.get("classId");
        if (classId !== CLASS_A_ID) await delay(100);
        const students = MOCK_STUDENTS.filter(
          (student) => student.classId === classId,
        );
        return HttpResponse.json({
          data: students,
          meta: { page: 1, pageSize: 100, total: students.length },
        });
      }),
    );
    const { user } = await readyManage();
    expect(screen.getByText("이서준")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "중2 기초반" }));

    expect(screen.queryByText("이서준")).not.toBeInTheDocument();
    expect(await screen.findByText("최수아")).toBeInTheDocument();
  });

  it("페이지는 AppChrome으로 감싼다", async () => {
    const findMany = vi.spyOn(prismaTestDouble.unit, "findMany");
    try {
      const { default: ClassesPage } =
        await import("@/app/(main)/classes/page");
      const ui = await ClassesPage();
      render(ui);

      expect(connection).toHaveBeenCalledOnce();
      expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
        findMany.mock.invocationCallOrder[0]!,
      );
      expect(
        screen.getByRole("link", { name: "수업·학생 관리" }),
      ).toHaveAttribute("href", "/classes");
      expect(screen.getByRole("link", { name: "오늘의 작업" })).toHaveAttribute(
        "href",
        "/",
      );
    } finally {
      findMany.mockRestore();
    }
  });

  it("단원 조회 실패를 빈 목록으로 위장하지 않는다", async () => {
    const findMany = vi
      .spyOn(prismaTestDouble.unit, "findMany")
      .mockRejectedValueOnce(new Error("database unavailable"));
    try {
      const { default: ClassesPage } =
        await import("@/app/(main)/classes/page");

      await expect(ClassesPage()).rejects.toThrow("database unavailable");
    } finally {
      findMany.mockRestore();
    }
  });
});

describe("[T2.3 S-07] 진도 — 다음 소단원 1클릭 · 트리 보조", () => {
  it("선택된 반의 현재 소단원을 트리에 하이라이트한다", async () => {
    await readyManage();

    const current = await screen.findByRole("button", {
      name: MOCK_CURRENT_PROGRESS_UNIT.section,
    });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveClass("bg-g-blue");
  });

  it("주 버튼 다음 소단원은 POST /api/progress/advance 를 보낸다", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/progress/advance", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          {
            data: {
              id: "80000000-0000-4000-8000-000000000099",
              classId: CLASS_A_ID,
              studentId: null,
              unitId: MOCK_UNITS[4]!.id,
              recordedAt: "2026-08-14",
              createdAt: "2026-08-14T09:00:00.000Z",
            },
          },
          { status: 201 },
        );
      }),
    );

    const { user } = await readyManage();
    const advance = screen.getByRole("button", { name: "다음 소단원" });
    expect(advance).toHaveClass("bg-g-blue");
    expect(advance.className).toMatch(/cursor-pointer/);
    expect(advance.className).toMatch(/disabled:cursor-not-allowed/);

    await user.click(advance);

    await waitFor(() => {
      expect(bodies).toEqual([{ classId: CLASS_A_ID }]);
    });
    expect(screen.getByRole("button", { name: "지수법칙" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("트리에서 소단원을 직접 고르면 POST /api/progress 로 기록한다", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post("/api/progress", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          {
            data: {
              id: "80000000-0000-4000-8000-000000000098",
              classId: CLASS_A_ID,
              studentId: null,
              unitId: MOCK_UNITS[1]!.id,
              recordedAt: "2026-08-14",
              createdAt: "2026-08-14T09:00:00.000Z",
            },
          },
          { status: 201 },
        );
      }),
    );

    const { user } = await readyManage();
    await user.click(screen.getByRole("button", { name: "순환소수" }));

    await waitFor(() => {
      expect(bodies).toEqual([
        { classId: CLASS_A_ID, unitId: MOCK_UNITS[1]!.id },
      ]);
    });
  });

  it("반을 바꾸면 그 반 현재 진도로 하이라이트가 바뀐다", async () => {
    const { user } = await readyManage();

    await user.click(screen.getByRole("button", { name: "중2 기초반" }));

    const current = await screen.findByRole("button", { name: "순환소수" });
    await waitFor(() => {
      expect(current).toHaveAttribute("aria-current", "true");
    });
    expect(current).toHaveClass("bg-g-blue");
  });
});

describe("[D-132] 반 관리 — 담당(관리자 응답에만 실린다)", () => {
  const OTHERS = MOCK_CLASSES.map((c) => ({
    ...c,
    owner: { name: "강선생", mine: false },
  }));

  function useOwnerHandlers() {
    server.use(
      http.get("/api/classes", () =>
        HttpResponse.json({
          data: OTHERS,
          meta: { page: 1, pageSize: 100, total: OTHERS.length },
        }),
      ),
      http.post("/api/classes", async ({ request }) => {
        const body = (await request.json()) as { name: string; grade: string };
        return HttpResponse.json(
          {
            data: {
              ...MOCK_CLASSES[0]!,
              id: "20000000-0000-4000-8000-00000000d132",
              name: body.name,
              grade: body.grade,
              owner: { name: "관리자", mine: true },
            },
          },
          { status: 201 },
        );
      }),
    );
  }

  it("«진도» 칸 머리 «반 · 학년» 뒤에 담당 딱지", async () => {
    useOwnerHandlers();
    await readyManage();
    const heading = screen.getByRole("heading", { name: "진도" });
    const line = heading.nextElementSibling as HTMLElement;
    expect(line).toHaveTextContent(/^중2 심화반 · 중2/);
    expect(line.querySelector("[data-owner-tag]")).toHaveTextContent("강선생");
  });

  it("🔴 원장님이 새로 만든 반(내 반)은 목록 맨 위에 선다 — 새로 고치기 전에도", async () => {
    useOwnerHandlers();
    const { user } = await readyManage();
    const form = within(screen.getByRole("form", { name: "반 추가" }));
    await user.type(
      form.getByRole("textbox", { name: "반 이름" }),
      "목요 심화반",
    );
    await user.type(form.getByRole("textbox", { name: "학년" }), "중2");
    await user.click(form.getByRole("button", { name: "반 추가" }));
    await screen.findByRole("button", { name: /목요 심화반/ });
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("목요 심화반");
    expect(rows[0]!.querySelector("[data-owner-tag]")).toHaveTextContent(
      "내 반",
    );
  });

  it("담당이 없으면(관리자 아님) «진도» 칸 머리에 딱지가 없다", async () => {
    await readyManage();
    const line = screen.getByRole("heading", { name: "진도" })
      .nextElementSibling as HTMLElement;
    expect(line.querySelector("[data-owner-tag]")).toBeNull();
  });
});
