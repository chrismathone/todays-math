/**
 * 🔴 RED → 🟢 — D-140 강사 «반 관리»(`/classes/manage`) 화면 (원장님 2026-09-26).
 *
 * 강사가 들어오면 **내 반 · 학생 명단**이 뜨고, 원장님 화면에 이미 있는 확정 칸
 * — 학생 등록(05 §8.10) · 학생 계정 발급 칸(`StudentAccountPanel`, 05 §8.9) — 이 **그대로** 보인다.
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

  it("🔴 강사: 학생 이름이 발급 칸을 여는 단추다 — 누르면 원장님과 같은 «계정 만들기» 칸이 선다", async () => {
    const actor = userEvent.setup();
    await renderAs(TEACHER);
    const name = screen.getByRole("button", { name: FIRST!.name });
    expect(name).toHaveAttribute(
      "aria-controls",
      `student-account-${FIRST!.id}-panel`,
    );
    await actor.click(name);
    const region = await screen.findByRole("region", {
      name: /오늘의 개념 로그인/,
    });
    expect(
      await within(region).findByRole("button", { name: "계정 만들기" }),
    ).toBeInTheDocument();
  });
});

describe("짝 — 다른 계정의 화면은 예전 그대로", () => {
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
