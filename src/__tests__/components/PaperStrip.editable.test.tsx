import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";

const pages: PaperStripPage[] = [1, 2].map((n) => ({
  key: `p${n}`,
  node: <span>원본 그림 {n}</span>,
  caption: <span>새 {n}쪽</span>,
  enlargeLabel: `원본 ${n}쪽 크게 보기`,
}));

describe("PaperStrip 편집 격자", () => {
  it("카드 선택은 독립된 native 단추로 제어되며 확대 창을 열지 않는다", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PaperStrip
        pages={pages}
        hint={null}
        editable={{ selectedKey: "p1", onSelect, aside: <p>선택 상세</p> }}
      />,
    );
    const grid = screen.getByRole("region", { name: "지면 미리보기" });
    const second = grid.querySelectorAll("figure")[1];
    fireEvent.click(second);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(
      within(grid).getByRole("button", { name: "원본 2쪽 크게 보기" }),
    );
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("p2");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      within(grid).getByRole("button", { name: "원본 1쪽 크게 보기" }),
    ).toHaveAttribute("aria-pressed", "true");
    rerender(
      <PaperStrip
        pages={[pages[1], pages[0]]}
        hint={null}
        editable={{ selectedKey: "p2", onSelect, aside: <p>다른 상세</p> }}
      />,
    );
    expect(
      within(grid).getByRole("button", { name: "원본 2쪽 크게 보기" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("complementary", { name: "선택한 쪽" }),
    ).toHaveTextContent("다른 상세");
  });

  it("도구·상태·앞 안내를 슬롯으로 받고 쪽의 끌기 이벤트를 보존한다", () => {
    const onDrop = vi.fn();
    render(
      <PaperStrip
        pages={pages}
        hint="순서를 정합니다."
        busy
        editable={{
          selectedKey: "p1",
          onSelect: vi.fn(),
          aside: <p>상세</p>,
          before: <p>미리 뺀 쪽 안내</p>,
          toolbar: (page) => <button type="button">{page.key} 손잡이</button>,
          overlay: () => <span>뺌</span>,
          itemProps: () => ({
            "data-excluded": true,
            "data-drop": "before",
            onDrop,
          }),
        }}
      />,
    );
    const grid = screen.getByRole("region", { name: "지면 미리보기" });
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("미리 뺀 쪽 안내")).toBeVisible();
    expect(screen.getByText("순서를 정합니다.")).toBeVisible();
    expect(
      within(grid).getByRole("button", { name: "p1 손잡이" }),
    ).toBeVisible();
    const first = grid.querySelector("figure")!;
    expect(first).toHaveAttribute("data-excluded", "true");
    expect(within(first).getByText("뺌")).toBeVisible();
    fireEvent.drop(first);
    expect(onDrop).toHaveBeenCalledOnce();
    expect(
      within(grid).getByRole("button", { name: "원본 1쪽 크게 보기" }),
    ).toBeDisabled();
  });
});
