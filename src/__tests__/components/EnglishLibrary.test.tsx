/**
 * 🔴 RED → 🟢 — «내 문제 세트» 뷰 (D-148 · 25 §1.2 · 셸 브리프 §2.4).
 *
 * 구현: src/components/english/EnglishLibraryView.tsx (뿌리 EnglishStudio 가 마운트)
 *
 * 무엇을 잠그나
 * 1. 이 시험의 세트 전부를 행으로 — **행은 단추다**(D-30: 손가락 커서는 실제 단추에만).
 * 2. 이름 검색 · 상태 거르기 · «새로고침»(다시 읽는다).
 * 3. 행을 누르면 «오늘의 작업» 뷰의 편집 화면으로 간다.
 * 4. 빈 상태 + «문제 만들기»(만들기 뷰로).
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";

import {
  currentView,
  Harness,
  installDialogShim,
  makeLog,
} from "./EnglishStudio.harness";

beforeEach(() => {
  localStorage.clear();
  installDialogShim();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function countSetReads() {
  let count = 0;
  const listener = ({ request }: { request: Request }) => {
    if (
      request.method === "GET" &&
      /\/api\/english\/exams\/[^/]+\/sets$/.test(new URL(request.url).pathname)
    )
      count += 1;
  };
  server.events.on("request:start", listener);
  return {
    value: () => count,
    off: () => server.events.removeListener("request:start", listener),
  };
}

async function openLibrary(log = makeLog()) {
  render(<Harness log={log} initialView="english-library" />);
  await screen.findByRole("heading", { name: "내 문제 세트" });
  await screen.findByRole("list", { name: "문제 세트 목록" });
  return log;
}

describe("[EnglishLibrary] 내 문제 세트", () => {
  it("이 시험의 세트를 행(단추)으로 그린다 — 제목 · 문항 수 · 상태 알약", async () => {
    await openLibrary();
    const list = within(screen.getByRole("list", { name: "문제 세트 목록" }));
    const rows = list.getAllByRole("button");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("협력의 가치 · 외부지문 기본 훈련");
    expect(rows[0]).toHaveTextContent("3문항");
    expect(rows[0]).toHaveTextContent("초안");
    expect(rows[1]).toHaveTextContent("원문 복원 연습");
    expect(rows[1]).toHaveTextContent("검토 완료");
    expect(screen.getByText("침산중학교 · 중3 · 2학기 중간고사")).toBeVisible();
  });

  it("이름 검색과 상태 거르기가 행을 줄인다", async () => {
    await openLibrary();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "세트 이름으로 찾기" }),
      {
        target: { value: "원문" },
      },
    );
    let list = within(screen.getByRole("list", { name: "문제 세트 목록" }));
    expect(list.getAllByRole("button")).toHaveLength(1);
    expect(list.getByRole("button", { name: /원문 복원 연습/ })).toBeVisible();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "세트 이름으로 찾기" }),
      {
        target: { value: "" },
      },
    );
    fireEvent.change(screen.getByRole("combobox", { name: "상태" }), {
      target: { value: "초안" },
    });
    list = within(screen.getByRole("list", { name: "문제 세트 목록" }));
    expect(list.getAllByRole("button")).toHaveLength(1);
    expect(list.getByRole("button", { name: /협력의 가치/ })).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "상태" }), {
      target: { value: "검토 중" },
    });
    expect(screen.getByText("조건에 맞는 문제 세트가 없습니다.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "검색·상태 초기화" }));
    expect(screen.getByRole("combobox", { name: "상태" })).toHaveValue("all");
    expect(
      screen.getByRole("searchbox", { name: "세트 이름으로 찾기" }),
    ).toHaveValue("");
    expect(
      within(screen.getByRole("list", { name: "문제 세트 목록" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(2);
  });

  it("«새로고침»은 세트 목록을 다시 읽는다", async () => {
    const reads = countSetReads();
    await openLibrary();
    await screen.findByRole("list", { name: "문제 세트 목록" });
    const before = reads.value();
    expect(before).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    await waitFor(() => expect(reads.value()).toBe(before + 1));
    await screen.findByRole("list", { name: "문제 세트 목록" });
    reads.off();
  });

  it("행을 누르면 «오늘의 작업» 뷰의 편집 화면으로 간다", async () => {
    await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: /원문 복원 연습/ }));
    expect(currentView()).toBe("english-library");
    expect(
      await screen.findByRole("textbox", { name: "세트 이름" }),
    ).toHaveValue("원문 복원 연습");
    expect(screen.getByText("1번 · 원문 복원")).toBeVisible();
  });

  it("세트가 없는 시험은 빈 상태와 «문제 만들기»", async () => {
    await openLibrary();
    fireEvent.click(screen.getByRole("button", { name: "경명여자중학교" }));
    expect(
      await screen.findByText("아직 만든 문제 세트가 없습니다."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "문제 만들기" }));
    expect(currentView()).toBe("english-maker");
  });
});
