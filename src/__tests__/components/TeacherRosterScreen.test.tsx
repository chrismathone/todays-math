/**
 * 🔴 RED → 🟢 — D-140 강사 «반 관리»(`/classes/manage`) 화면 (원장님 2026-09-26).
 *
 * 강사는 내 반 · 학생 명단 · 학생 등록을 보고, 로그인 계정 발급은 지점 관리자 이상만 한다.
 * 반 추가는 여전히 없다. 새 디자인·새 문구는 없다(D-07) — 조각을 재사용할 뿐이다.
 *
 * 짝: 원장(반 추가·학생 등록 둘 다) · 역할 없는 지점 계정(이름만)은 **예전 그대로**다.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeachingView from "@/components/unified/TeachingView";
import { MOCK_CLASS_A, MOCK_STUDENTS_BY_CLASS, MOCK_UNITS } from "@/mocks/data";
import { server } from "@/mocks/server";

vi.mock("next-auth/react", () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

const units = MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
  id,
  grade,
  chapter,
  section,
  orderIndex,
}));
const BRANCH = "20000000-0000-4000-8000-000000000002";
const base = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "선생님",
  email: "teacher@example.com",
  isAdmin: false,
  branchId: BRANCH,
};
const TEACHER = { ...base, branchRole: "teacher" as const };
const OWNER = { ...base, isAdmin: true, branchRole: "owner" as const };
const NO_ROLE = { ...base, branchRole: null };
const [FIRST] = MOCK_STUDENTS_BY_CLASS[MOCK_CLASS_A.id]!;

let user: object = TEACHER;

beforeEach(() => {
  window.history.replaceState(null, "", "/classes/manage");
  server.use(
    http.get("/api/studio/teaching", () =>
      HttpResponse.json({ data: { user, units } }),
    ),
    http.get("/api/students/:id/account", () =>
      HttpResponse.json({ data: { withdrawn: false, account: null } }),
    ),
  );
});

async function renderAs(viewer: object) {
  user = viewer;
  render(<TeachingView />);
  await screen.findByRole("heading", { name: "우리 반 관리" });
  // 학생 명단이 다 읽힌 표식 — 첫 반의 첫 학생 이름
  await screen.findByText(FIRST!.name);
}

describe("D-140 — 강사의 반 관리", () => {
  it("🔴 강사: 학생 등록 칸이 보이고 반 추가는 없다", async () => {
    await renderAs(TEACHER);
    expect(
      await screen.findByRole("form", { name: "학생 등록" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "반 추가" }),
    ).not.toBeInTheDocument();
  });

  it("강사: 학생 명단은 보이고 로그인 계정 발급 단추는 없다", async () => {
    await renderAs(TEACHER);
    expect(screen.getByText(FIRST!.name)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: FIRST!.name }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /오늘의 개념 로그인/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "계정 생성" }),
    ).not.toBeInTheDocument();
  });
});

describe("짝 — 다른 계정의 화면은 예전 그대로", () => {
  it("서버가 확인한 지점 관리자는 기존 강사 역할 표시가 남아 있어도 발급 단추를 본다", async () => {
    await renderAs({ ...TEACHER, isAdmin: true });
    expect(
      screen.getByRole("button", { name: FIRST!.name }),
    ).toBeInTheDocument();
  });

  it("원장: 반 추가 · 학생 등록 · 발급 단추 모두", async () => {
    await renderAs(OWNER);
    expect(
      await screen.findByRole("form", { name: "학생 등록" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "반 추가" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: FIRST!.name }),
    ).toBeInTheDocument();
  });

  it("지점 관리자: 계정 생성 버튼을 누르기 전에는 발급 요청을 보내지 않는다", async () => {
    const actor = userEvent.setup();
    const issued = vi.fn();
    server.use(http.post("/api/students/:id/account", issued));
    await renderAs({ ...OWNER, isAdmin: false, branchRole: "manager" });
    await actor.click(screen.getByRole("button", { name: FIRST!.name }));
    const region = await screen.findByRole("region", {
      name: /오늘의 개념 로그인/,
    });
    expect(
      await within(region).findByRole("button", { name: "계정 생성" }),
    ).toBeInTheDocument();
    expect(issued).not.toHaveBeenCalled();
  });

  it("🔴 역할이 빈 지점 계정: 이름만 — 등록·발급·반 추가가 없다(빈 값은 열지 않는다)", async () => {
    await renderAs(NO_ROLE);
    expect(
      screen.queryByRole("form", { name: "학생 등록" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "반 추가" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: FIRST!.name }),
    ).not.toBeInTheDocument();
  });
});
