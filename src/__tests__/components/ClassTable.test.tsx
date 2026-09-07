/**
 * 반 관리 표 — 「지금 고른 반」이 **눈에 보이는가** (2026-09-07).
 *
 * ## 무엇이 결함이었나
 *
 * `ClassTable` 은 고른 행에 `className={selected ? "bg-white" : undefined}` 를 걸고 있었다.
 * 그런데 앱 배경이 흰색이라(05 §2.1, 원장님 지시 2026-08-18) **아무것도 안 보였다.**
 * 반이 여럿인 원장님은 어느 반의 학생 목록을 보고 있는지 화면에서 알 수 없었다.
 *
 * 🔴 **「선택 클래스가 붙는가」로 물으면 옛 코드도 초록이다** — `"bg-white"` 와 `undefined`
 *    는 분명히 다르니까. 그래서 이 시험은 «다른가»가 아니라 **«흰 바탕에서 보이는가»**를
 *    묻는다. 결함이 스스로 신고하지 않는 부류에서는 무엇을 묻느냐가 전부다.
 *
 * ## 표현의 출처
 *
 * 새로 짓지 않았다. 메인 표 보기(`LedgerTable`)가 이미 쓰는 확정 어법
 * (원장님 2026-08-26, 파랑 글자 + 밑줄)을 `rowSelection.ts` 한 곳에서 두 표가 같이 쓴다.
 * 그래서 여기 잠그는 것은 **두 표가 갈리지 않는다**는 성질이기도 하다.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassTable } from "@/components/class/ClassTable";
import {
  SELECTED_NAME_CLASS,
  UNSELECTED_NAME_CLASS,
  nameSelectionClass,
} from "@/components/ui/rowSelection";
import type { ClassEntity } from "@/contracts/class.contract";

const CLASSES = [
  { id: "c1", name: "중2 목요반", grade: "중2" },
  { id: "c2", name: "초5 화요반", grade: "초5" },
] as unknown as ClassEntity[];

function renderTable(selectedClassId: string, onSelect = vi.fn()) {
  render(
    <ClassTable
      classes={CLASSES}
      selectedClassId={selectedClassId}
      onSelect={onSelect}
    />,
  );
  return {
    onSelect,
    picked: screen.getByRole("button", { name: "중2 목요반" }),
    other: screen.getByRole("button", { name: "초5 화요반" }),
  };
}

describe("고른 반이 화면에 드러난다", () => {
  it("고른 이름 버튼만 선택 표현을 단다", () => {
    const { picked, other } = renderTable("c1");
    for (const cls of SELECTED_NAME_CLASS.split(" ")) {
      expect(picked.className).toContain(cls);
    }
    expect(other.className).not.toContain("text-g-blue");
  });

  it("고른 것을 보조 기술에도 알린다 — aria-current", () => {
    const { picked, other } = renderTable("c1");
    expect(picked).toHaveAttribute("aria-current", "true");
    expect(other).not.toHaveAttribute("aria-current");
  });

  it("고름이 옮겨 가면 표현도 옮겨 간다", () => {
    const { picked, other } = renderTable("c2");
    expect(other.className).toContain("text-g-blue");
    expect(picked.className).not.toContain("text-g-blue");
  });

  it("이름 버튼을 누르면 그 반을 고른다", async () => {
    const { other, onSelect } = renderTable("c1");
    await userEvent.click(other);
    expect(onSelect).toHaveBeenCalledWith("c2");
  });

  it("⚠️ D-30 — 행(`<tr>`)에는 손가락도 hover 도 없다", () => {
    renderTable("c1");
    for (const row of document.querySelectorAll("tbody tr")) {
      expect(row.className).not.toMatch(/cursor-pointer|hover:/);
    }
  });
});

describe("🔴 선택 표현은 흰 바탕에서 보이는 것이어야 한다", () => {
  it("배경색만으로 나타내지 않는다 — `bg-white` 가 실제 결함이었다", () => {
    expect(SELECTED_NAME_CLASS).not.toMatch(/\bbg-(white|canvas)\b/);
  });

  it("전경(글자색·밑줄)을 바꾼다 — 배경이 무엇이든 보인다", () => {
    expect(SELECTED_NAME_CLASS).toMatch(/\btext-[a-z-]+\b/);
    expect(SELECTED_NAME_CLASS).toMatch(/\bunderline\b/);
  });

  it("안 고른 쪽은 상시 표현이 없다 — 둘이 실제로 갈린다", () => {
    expect(nameSelectionClass(true)).not.toBe(nameSelectionClass(false));
    expect(UNSELECTED_NAME_CLASS).not.toMatch(/\btext-g-blue\b/);
    // hover 는 «누를 수 있음»이지 «골랐음»이 아니다. 상시 밑줄이면 둘이 섞인다.
    expect(
      UNSELECTED_NAME_CLASS.split(" ").every((c) => c.startsWith("hover:")),
    ).toBe(true);
  });
});
